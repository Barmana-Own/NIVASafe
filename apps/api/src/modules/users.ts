import type { FastifyInstance } from "fastify";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { authenticate } from "../auth-guard.js";
import { audit, envelope, parse, prisma, requireOrg, requirePermission, ROLE_PERMISSIONS, tokenHash } from "../core.js";
import { scheduleEmail } from "../mail.js";

export async function registerUserRoutes(app: FastifyInstance) {
  app.get("/api/v1/roles", { preHandler: authenticate }, async (request) => {
    requireOrg(request);
    return envelope(Object.entries(ROLE_PERMISSIONS).map(([role, permissions]) => ({ role, permissions })));
  });

  app.get("/api/v1/members", { preHandler: authenticate }, async (request) => {
    const organizationId = requireOrg(request);
    requirePermission(request, "users.read");
    return envelope(await prisma.organizationMember.findMany({ where: { organizationId }, include: { user: { select: { id: true, email: true, displayName: true, active: true, lastLoginAt: true, jobTitle: true } } }, orderBy: { user: { displayName: "asc" } } }));
  });

  app.patch("/api/v1/members/:id", { preHandler: authenticate }, async (request) => {
    const organizationId = requireOrg(request);
    requirePermission(request, "users.manage");
    const { id } = parse(z.object({ id: z.string().uuid() }), request.params);
    const body = parse(z.object({ role: z.enum(["SUPER_ADMIN", "ORG_ADMIN", "HSE_MANAGER", "ASSESSOR", "VIEWER"]).optional(), active: z.boolean().optional() }), request.body);
    const member = await prisma.organizationMember.findFirst({ where: { id, organizationId } });
    if (!member) throw Object.assign(new Error("Member not found"), { statusCode: 404, code: "NOT_FOUND" });
    const removesAdmin = member.role === "ORG_ADMIN" && (body.active === false || (body.role !== undefined && body.role !== "ORG_ADMIN"));
    if (removesAdmin) {
      const activeAdmins = await prisma.organizationMember.count({ where: { organizationId, role: "ORG_ADMIN", active: true } });
      if (activeAdmins <= 1) throw Object.assign(new Error("At least one active organization administrator is required"), { statusCode: 409, code: "LAST_ORG_ADMIN" });
    }
    const updated = await prisma.organizationMember.update({ where: { id }, data: body });
    await audit(request, "MEMBER_UPDATE", "OrganizationMember", id, body);
    return envelope(updated);
  });

  app.post("/api/v1/invitations", { preHandler: authenticate }, async (request, reply) => {
    const organizationId = requireOrg(request);
    requirePermission(request, "users.manage");
    const body = parse(z.object({ email: z.string().email(), role: z.enum(["ORG_ADMIN", "HSE_MANAGER", "ASSESSOR", "VIEWER"]) }), request.body);
    const token = randomBytes(32).toString("hex");
    const normalizedEmail = body.email.toLowerCase();
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
      prisma.invitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } }),
    ]);
    const organization = await prisma.organization.findUniqueOrThrow({ where: { id: invitation.organizationId } });
    return envelope({ organization: { id: organization.id, nameFa: organization.nameFa, nameEn: organization.nameEn, role: invitation.role } });
  });
}
