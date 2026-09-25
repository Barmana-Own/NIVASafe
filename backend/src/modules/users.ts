import type { FastifyInstance } from "fastify";
import { Role } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { DISPLAY_NAME_MAX_LENGTH, EMAIL_MAX_LENGTH, USERNAME_MAX_LENGTH, isForbiddenDisplayName, isValidDisplayName, isValidEmail, isValidPhone, isValidUsername, normalizeDisplayName, normalizeEmail, normalizePhone, normalizeUsername } from "@nivasafe/domain";
import { z } from "zod";
import { authenticate } from "../auth-guard.js";
import { audit, envelope, parse, prisma, requireAnyPermission, requireOrg, requirePermission, requireRole, ROLE_PERMISSIONS, tokenHash } from "../core.js";
import { scheduleEmail } from "../mail.js";

export function canChangeGlobalRole(actorRole: string | undefined, requestedGlobalRole: string | undefined): boolean {
  return requestedGlobalRole === undefined || actorRole === "SUPER_ADMIN";
}

export const ORGANIZATION_MEMBER_ROLES = ["ORG_ADMIN", "HSE_MANAGER", "HSE_SPECIALIST", "HSE_OFFICER", "EXTERNAL_AUDITOR", "PERSONNEL", "VIEWER", "ASSISTANT", "ASSESSOR"] as const;
export const INVITATION_ROLES = ["SUPER_ADMIN", ...ORGANIZATION_MEMBER_ROLES] as const;
const memberRoleSchema = z.enum(INVITATION_ROLES);
const memberRequestRoleSchema = z.enum(ORGANIZATION_MEMBER_ROLES);
const memberRequestInput = z.object({
  username: z.string().trim().min(3).max(USERNAME_MAX_LENGTH),
  email: z.string().trim().min(1).max(EMAIL_MAX_LENGTH),
  displayName: z.string().trim().min(1).max(DISPLAY_NAME_MAX_LENGTH),
  phone: z.string().trim().max(32).nullable().optional(),
  jobTitle: z.string().trim().max(120).nullable().optional(),
  role: memberRequestRoleSchema,
});

function checkedMemberUsername(value: string): string {
  const username = normalizeUsername(value);
  if (!isValidUsername(username)) throw Object.assign(new Error("نام کاربری باید انگلیسی، بدون فاصله و بین ۳ تا ۶۴ نویسه باشد."), { statusCode: 400, code: "INVALID_USERNAME" });
  return username;
}

export async function registerUserRoutes(app: FastifyInstance) {
  app.get("/api/v1/roles", { preHandler: authenticate }, async (request) => {
    requireOrg(request);
    return envelope(Object.entries(ROLE_PERMISSIONS).map(([role, permissions]) => ({ role, permissions })));
  });

  app.get("/api/v1/members", { preHandler: authenticate }, async (request) => {
    requirePermission(request, "users.read");
    const organizationId = request.actor?.organizationId;
    if (!organizationId && request.actor?.role === "SUPER_ADMIN") {
      const users = await prisma.user.findMany({ where: {}, select: { id: true, email: true, username: true, displayName: true, active: true, lastLoginAt: true, jobTitle: true, phone: true, globalRole: true }, orderBy: { displayName: "asc" } });
      return envelope(users.map((user) => ({ id: user.id, organizationId: null, role: "GLOBAL", active: user.active, user })));
    }
    if (!organizationId) return envelope([]);
    return envelope(await prisma.organizationMember.findMany({ where: { organizationId }, include: { user: { select: { id: true, email: true, username: true, displayName: true, active: true, lastLoginAt: true, jobTitle: true, phone: true, globalRole: true } } }, orderBy: { user: { displayName: "asc" } } }));
  });

  app.get("/api/v1/member-requests", { preHandler: authenticate }, async (request) => {
    const organizationId = requireOrg(request);
    requireAnyPermission(request, ["users.manage", "users.request"]);
    const query = parse(z.object({ status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional() }), request.query);
    const requests = await prisma.memberAccessRequest.findMany({
      where: { organizationId, ...(query.status ? { status: query.status } : {}) },
      include: {
        requestedBy: { select: { id: true, displayName: true, email: true, username: true } },
        reviewedBy: { select: { id: true, displayName: true, email: true, username: true } },
        provisionedUser: { select: { id: true, username: true, email: true, active: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return envelope(requests);
  });

  app.post("/api/v1/member-requests", { preHandler: authenticate }, async (request, reply) => {
    const organizationId = requireOrg(request);
    requireAnyPermission(request, ["users.manage", "users.request"]);
    const body = parse(memberRequestInput, request.body);
    const username = checkedMemberUsername(body.username);
    const email = normalizeEmail(body.email);
    if (!isValidEmail(email)) throw Object.assign(new Error("ایمیل معتبر وارد کنید."), { statusCode: 400, code: "INVALID_EMAIL" });
    const displayName = normalizeDisplayName(body.displayName);
    if (!isValidDisplayName(displayName) || isForbiddenDisplayName(displayName)) throw Object.assign(new Error("نام نمایشی معتبر وارد کنید."), { statusCode: 400, code: "INVALID_NAME" });
    const phone = body.phone && body.phone.trim() ? normalizePhone(body.phone) : null;
    if (phone && !isValidPhone(phone)) throw Object.assign(new Error("شماره تلفن معتبر وارد کنید."), { statusCode: 400, code: "INVALID_PHONE" });
    const [existingUser, duplicateRequest] = await Promise.all([
      prisma.user.findFirst({ where: { OR: [{ email }, { username }] }, select: { id: true, email: true, username: true } }),
      prisma.memberAccessRequest.findFirst({ where: { organizationId, status: "PENDING", OR: [{ email }, { username }] }, select: { id: true } }),
    ]);
    if (existingUser?.email === email) throw Object.assign(new Error("این ایمیل قبلاً برای یک حساب استفاده شده است."), { statusCode: 409, code: "EMAIL_IN_USE" });
    if (existingUser?.username === username) throw Object.assign(new Error("این نام کاربری قبلاً برای یک حساب استفاده شده است."), { statusCode: 409, code: "USERNAME_IN_USE" });
    if (duplicateRequest) throw Object.assign(new Error("برای این ایمیل یا نام کاربری یک درخواست در انتظار بررسی وجود دارد."), { statusCode: 409, code: "MEMBER_REQUEST_EXISTS" });
    const created = await prisma.memberAccessRequest.create({ data: { organizationId, requestedById: request.actor!.userId, username, email, displayName, phone, jobTitle: body.jobTitle?.trim() || null, role: body.role } });
    await audit(request, "MEMBER_ACCESS_REQUEST_CREATED", "MemberAccessRequest", created.id, { username, email, role: body.role });
    return reply.code(201).send(envelope(created));
  });

  app.patch("/api/v1/members/:id", { preHandler: authenticate }, async (request) => {
    const organizationId = requireOrg(request);
    requirePermission(request, "users.manage");
    const { id } = parse(z.object({ id: z.string().uuid() }), request.params);
    const body = parse(z.object({ role: memberRoleSchema.optional(), active: z.boolean().optional(), displayName: z.string().trim().min(1).max(DISPLAY_NAME_MAX_LENGTH).optional(), email: z.string().trim().min(1).max(EMAIL_MAX_LENGTH).optional(), username: z.string().trim().min(3).max(USERNAME_MAX_LENGTH).nullable().optional(), phone: z.string().trim().max(32).nullable().optional(), jobTitle: z.string().trim().max(120).nullable().optional(), globalRole: z.enum(["USER", "SUPER_ADMIN"]).optional() }), request.body);
    if (body.role === "SUPER_ADMIN" && request.actor!.role !== "SUPER_ADMIN") throw Object.assign(new Error("Only a super administrator can assign the super administrator role"), { statusCode: 403, code: "FORBIDDEN" });
    if (!canChangeGlobalRole(request.actor!.role, body.globalRole)) throw Object.assign(new Error("Only a super administrator can change a global account level"), { statusCode: 403, code: "FORBIDDEN" });
    const member = await prisma.organizationMember.findFirst({ where: { id, organizationId } });
    if (!member) throw Object.assign(new Error("Member not found"), { statusCode: 404, code: "NOT_FOUND" });
    const removesAdmin = member.role === "ORG_ADMIN" && (body.active === false || (body.role !== undefined && body.role !== "ORG_ADMIN"));
    if (removesAdmin) {
      const activeAdmins = await prisma.organizationMember.count({ where: { organizationId, role: "ORG_ADMIN", active: true } });
      if (activeAdmins <= 1) throw Object.assign(new Error("At least one active organization administrator is required"), { statusCode: 409, code: "LAST_ORG_ADMIN" });
    }
    const email = body.email === undefined ? undefined : normalizeEmail(body.email);
    if (email !== undefined && !isValidEmail(email)) throw Object.assign(new Error("ایمیل معتبر وارد کنید."), { statusCode: 400, code: "INVALID_EMAIL" });
    if (email !== undefined) {
      const duplicate = await prisma.user.findFirst({ where: { email, NOT: { id: member.userId } }, select: { id: true } });
      if (duplicate) throw Object.assign(new Error("این ایمیل قبلاً ثبت شده است."), { statusCode: 409, code: "EMAIL_IN_USE" });
    }
    const displayName = body.displayName === undefined ? undefined : normalizeDisplayName(body.displayName);
    if (displayName !== undefined && (!isValidDisplayName(displayName) || isForbiddenDisplayName(displayName))) throw Object.assign(new Error("این نام کاربری قابل استفاده نیست."), { statusCode: 400, code: "RESERVED_DISPLAY_NAME" });
    const phone = body.phone === undefined ? undefined : (body.phone && body.phone.trim() ? normalizePhone(body.phone) : null);
    if (phone && !isValidPhone(phone)) throw Object.assign(new Error("شماره تلفن معتبر وارد کنید."), { statusCode: 400, code: "INVALID_PHONE" });
    const username = body.username === undefined ? undefined : (body.username && body.username.trim() ? normalizeUsername(body.username) : null);
    if (username && !isValidUsername(username)) throw Object.assign(new Error("نام کاربری باید انگلیسی، بدون فاصله و بین ۳ تا ۶۴ نویسه باشد."), { statusCode: 400, code: "INVALID_USERNAME" });
    if (username) {
      const duplicateUsername = await prisma.user.findFirst({ where: { username, NOT: { id: member.userId } }, select: { id: true } });
      if (duplicateUsername) throw Object.assign(new Error("این نام کاربری قبلاً ثبت شده است."), { statusCode: 409, code: "USERNAME_IN_USE" });
    }
    const userData = {
      ...(displayName === undefined ? {} : { displayName }),
      ...(email === undefined ? {} : { email }),
      ...(phone === undefined ? {} : { phone }),
      ...(username === undefined ? {} : { username }),
      ...(body.jobTitle === undefined ? {} : { jobTitle: body.jobTitle || null }),
      ...(body.role === "SUPER_ADMIN" ? { globalRole: "SUPER_ADMIN" as const } : body.globalRole === undefined ? {} : { globalRole: body.globalRole }),
    };
    const updated = await prisma.$transaction(async (tx) => {
      if (Object.keys(userData).length) await tx.user.update({ where: { id: member.userId }, data: userData });
      return tx.organizationMember.update({ where: { id }, data: { ...(body.role === undefined ? {} : { role: body.role }), ...(body.active === undefined ? {} : { active: body.active }) } });
    });
    await audit(request, "MEMBER_UPDATE", "OrganizationMember", id, body);
    return envelope(updated);
  });

  app.delete("/api/v1/members/:id", { preHandler: authenticate }, async (request) => {
    const organizationId = requireOrg(request);
    requirePermission(request, "users.manage");
    const { id } = parse(z.object({ id: z.string().uuid() }), request.params);
    const member = await prisma.organizationMember.findFirst({ where: { id, organizationId } });
    if (!member) throw Object.assign(new Error("Member not found"), { statusCode: 404, code: "NOT_FOUND" });
    if (member.role === "ORG_ADMIN") {
      const activeAdmins = await prisma.organizationMember.count({ where: { organizationId, role: "ORG_ADMIN", active: true } });
      if (activeAdmins <= 1) throw Object.assign(new Error("At least one active organization administrator is required"), { statusCode: 409, code: "LAST_ORG_ADMIN" });
    }
    await prisma.organizationMember.delete({ where: { id } });
    await audit(request, "MEMBER_DELETE", "OrganizationMember", id);
    return envelope({ success: true });
  });

  app.post("/api/v1/invitations", { preHandler: authenticate }, async (request, reply) => {
    const organizationId = requireOrg(request);
    requireRole(request, [Role.SUPER_ADMIN, Role.ORG_ADMIN]);
    requirePermission(request, "users.manage");
    const body = parse(z.object({ email: z.string().trim().min(1).max(EMAIL_MAX_LENGTH), role: memberRoleSchema }), request.body);
    if (body.role === "SUPER_ADMIN" && request.actor!.role !== "SUPER_ADMIN") throw Object.assign(new Error("Only a super administrator can invite another super administrator"), { statusCode: 403, code: "FORBIDDEN" });
    const token = randomBytes(32).toString("hex");
    const normalizedEmail = normalizeEmail(body.email);
    if (!isValidEmail(normalizedEmail)) throw Object.assign(new Error("ایمیل معتبر وارد کنید."), { statusCode: 400, code: "INVALID_EMAIL" });
    const existingMember = await prisma.organizationMember.findFirst({ where: { organizationId, user: { email: normalizedEmail } } });
    if (existingMember?.active) throw Object.assign(new Error("This user is already an active member"), { statusCode: 409, code: "MEMBER_EXISTS" });
    const [invitation, outbox] = await prisma.$transaction([
      prisma.invitation.create({ data: { organizationId, email: normalizedEmail, role: body.role, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + 7 * 86400000) } }),
      prisma.emailOutbox.create({ data: { organizationId, recipient: normalizedEmail, subject: "دعوت به NIVASafe", body: `برای پذیرش دعوت این لینک را باز کنید: ${(process.env.APP_URL ?? "http://localhost:5043").split(",")[0]}/accept-invitation?token=${token}` } }),
    ]);
    await scheduleEmail(outbox.id);
    await audit(request, "USER_INVITE", "Invitation", invitation.id);
    return reply.code(201).send(envelope({ ...invitation, ...(process.env.NODE_ENV !== "production" ? { developmentToken: token } : {}) }));
  });

  app.post("/api/v1/invitations/accept", { preHandler: authenticate }, async (request) => {
    const { token } = parse(z.object({ token: z.string().min(32) }), request.body);
    const invitation = await prisma.invitation.findUnique({ where: { tokenHash: tokenHash(token) } });
    if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) throw Object.assign(new Error("Invitation is invalid or expired"), { statusCode: 400, code: "INVITATION_INVALID" });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: request.actor!.userId } });
    if (user.email !== invitation.email) throw Object.assign(new Error("Invitation email does not match the signed-in user"), { statusCode: 403, code: "INVITATION_EMAIL_MISMATCH" });
    await prisma.$transaction([
      prisma.organizationMember.upsert({ where: { organizationId_userId: { organizationId: invitation.organizationId, userId: user.id } }, update: { role: invitation.role, active: true }, create: { organizationId: invitation.organizationId, userId: user.id, role: invitation.role } }),
      ...(invitation.role === "SUPER_ADMIN" ? [prisma.user.update({ where: { id: user.id }, data: { globalRole: "SUPER_ADMIN" } })] : []),
      prisma.invitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } }),
    ]);
    const organization = await prisma.organization.findUniqueOrThrow({ where: { id: invitation.organizationId } });
    return envelope({ organization: { id: organization.id, nameFa: organization.nameFa, nameEn: organization.nameEn, role: invitation.role, active: organization.active, subscriptionPlan: organization.subscriptionPlan, subscriptionStatus: organization.subscriptionStatus, subscriptionExpiresAt: organization.subscriptionExpiresAt } });
  });
}
