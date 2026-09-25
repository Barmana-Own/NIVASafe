import type { FastifyInstance, FastifyRequest } from "fastify";
import bcrypt from "bcryptjs";
import { GlobalRole, MemberRequestStatus, Prisma, Role } from "@prisma/client";
import { DISPLAY_NAME_MAX_LENGTH, EMAIL_MAX_LENGTH, USERNAME_MAX_LENGTH, isForbiddenDisplayName, isValidDisplayName, isValidEmail, isValidPhone, isValidUsername, normalizeDisplayName, normalizeEmail, normalizePhone, normalizeUsername } from "@nivasafe/domain";
import { z } from "zod";
import { authenticate } from "../auth-guard.js";
import { checkedPassword } from "./auth.js";
import { envelope, parse, prisma } from "../core.js";

const adminUserSelect = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  active: true,
  globalRole: true,
  lastLoginAt: true,
  jobTitle: true,
  phone: true,
  createdAt: true,
  memberships: {
    select: {
      id: true,
      role: true,
      active: true,
      organization: { select: { id: true, nameFa: true, nameEn: true, active: true } },
    },
  },
} satisfies Prisma.UserSelect;

const userListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(120).optional(),
});

const aiUsageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(120).optional(),
});

const userUpdateSchema = z.object({
  active: z.boolean().optional(),
  globalRole: z.enum(["USER", "SUPER_ADMIN"]).optional(),
  displayName: z.string().trim().min(1).max(DISPLAY_NAME_MAX_LENGTH).optional(),
  email: z.string().trim().min(1).max(EMAIL_MAX_LENGTH).optional(),
  username: z.string().trim().min(3).max(USERNAME_MAX_LENGTH).nullable().optional(),
  phone: z.string().trim().max(32).nullable().optional(),
  jobTitle: z.string().trim().max(120).nullable().optional(),
}).refine((value) => Object.values(value).some((item) => item !== undefined), { message: "At least one user field is required" });

const organizationRoleSchema = z.enum(["SUPER_ADMIN", "ORG_ADMIN", "HSE_MANAGER", "HSE_SPECIALIST", "HSE_OFFICER", "EXTERNAL_AUDITOR", "PERSONNEL", "ASSESSOR", "ASSISTANT", "VIEWER"]);
const membershipUpdateSchema = z.object({ role: organizationRoleSchema.optional(), active: z.boolean().optional() }).refine((value) => value.role !== undefined || value.active !== undefined, { message: "At least one membership field is required" });
const adminPasswordSchema = z.object({ password: z.string().min(1).max(128) });
const memberRequestStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);
const memberRequestRejectSchema = z.object({ reason: z.string().trim().max(1000).nullable().optional() });

export function requireSuperAdmin(request: FastifyRequest): void {
  if (request.actor?.globalRole !== GlobalRole.SUPER_ADMIN) {
    throw Object.assign(new Error("Only a global administrator can access this resource"), { statusCode: 403, code: "FORBIDDEN" });
  }
}

export function requireAIUsageAdmin(request: FastifyRequest): void {
  if (request.actor?.role !== GlobalRole.SUPER_ADMIN && request.actor?.role !== "ORG_ADMIN") {
    throw Object.assign(new Error("Only administrators can access AI usage"), { statusCode: 403, code: "FORBIDDEN" });
  }
}

export function isForbiddenSelfChange(actorId: string, targetId: string, targetGlobalRole: string, nextGlobalRole?: string, nextActive?: boolean): boolean {
  return actorId === targetId && targetGlobalRole === GlobalRole.SUPER_ADMIN && (nextGlobalRole === GlobalRole.USER || nextActive === false);
}

export function removesLastSuperAdmin(input: { targetGlobalRole: string; targetActive: boolean; nextGlobalRole: string; nextActive: boolean; activeSuperAdminCount: number }): boolean {
  const activeTarget = input.targetGlobalRole === GlobalRole.SUPER_ADMIN && input.targetActive;
  const removesAccess = input.nextGlobalRole === GlobalRole.USER || input.nextActive === false;
  return activeTarget && removesAccess && input.activeSuperAdminCount <= 1;
}

export async function registerAdminRoutes(app: FastifyInstance) {
  app.get("/api/v1/admin/overview", { preHandler: authenticate, config: { allowUnsubscribed: true } }, async (request) => {
    requireSuperAdmin(request);
    const now = new Date();
    const [totalUsers, activeUsers, superAdmins, totalOrganizations, activeOrganizations, activeMemberships, pendingInvitations, pendingMemberRequests, recentUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { active: true } }),
      prisma.user.count({ where: { globalRole: GlobalRole.SUPER_ADMIN, active: true } }),
      prisma.organization.count(),
      prisma.organization.count({ where: { active: true } }),
      prisma.organizationMember.count({ where: { active: true } }),
      prisma.invitation.count({ where: { acceptedAt: null, expiresAt: { gt: now } } }),
      prisma.memberAccessRequest.count({ where: { status: MemberRequestStatus.PENDING } }),
      prisma.user.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        select: { id: true, displayName: true, email: true, username: true, active: true, globalRole: true, createdAt: true },
      }),
    ]);
    return envelope({
      users: { total: totalUsers, active: activeUsers, inactive: totalUsers - activeUsers, superAdmins },
      organizations: { total: totalOrganizations, active: activeOrganizations, inactive: totalOrganizations - activeOrganizations },
      activeMemberships,
      pendingInvitations,
      pendingMemberRequests,
      recentUsers,
    });
  });

  app.get("/api/v1/admin/member-requests", { preHandler: authenticate, config: { allowUnsubscribed: true } }, async (request) => {
    requireSuperAdmin(request);
    const query = parse(z.object({ status: memberRequestStatusSchema.default("PENDING") }), request.query);
    const requests = await prisma.memberAccessRequest.findMany({
      where: { status: query.status },
      include: {
        organization: { select: { id: true, nameFa: true, nameEn: true, active: true } },
        requestedBy: { select: { id: true, displayName: true, email: true, username: true } },
        reviewedBy: { select: { id: true, displayName: true, email: true, username: true } },
        provisionedUser: { select: { id: true, username: true, email: true, active: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
    return envelope(requests);
  });

  app.post("/api/v1/admin/member-requests/:id/approve", { preHandler: authenticate, config: { allowUnsubscribed: true } }, async (request) => {
    requireSuperAdmin(request);
    const { id } = parse(z.object({ id: z.string().uuid() }), request.params);
    const body = parse(adminPasswordSchema, request.body);
    const requestRow = await prisma.memberAccessRequest.findUnique({ where: { id } });
    if (!requestRow) throw Object.assign(new Error("درخواست عضویت پیدا نشد."), { statusCode: 404, code: "NOT_FOUND" });
    if (requestRow.status !== MemberRequestStatus.PENDING) throw Object.assign(new Error("این درخواست قبلاً بررسی شده است."), { statusCode: 409, code: "MEMBER_REQUEST_ALREADY_REVIEWED" });
    const password = checkedPassword(body.password, { email: requestRow.email, displayName: requestRow.displayName });
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.memberAccessRequest.findUnique({ where: { id } });
      if (!current || current.status !== MemberRequestStatus.PENDING) throw Object.assign(new Error("این درخواست قبلاً بررسی شده است."), { statusCode: 409, code: "MEMBER_REQUEST_ALREADY_REVIEWED" });
      const duplicate = await tx.user.findFirst({ where: { OR: [{ email: current.email }, { username: current.username }] }, select: { id: true, email: true, username: true } });
      if (duplicate?.email === current.email) throw Object.assign(new Error("این ایمیل قبلاً برای یک حساب استفاده شده است."), { statusCode: 409, code: "EMAIL_IN_USE" });
      if (duplicate?.username === current.username) throw Object.assign(new Error("این نام کاربری قبلاً برای یک حساب استفاده شده است."), { statusCode: 409, code: "USERNAME_IN_USE" });
      const user = await tx.user.create({ data: { email: current.email, username: current.username, passwordHash, displayName: current.displayName, phone: current.phone, jobTitle: current.jobTitle, active: true } });
      await tx.organizationMember.create({ data: { organizationId: current.organizationId, userId: user.id, role: current.role, active: true } });
      const updated = await tx.memberAccessRequest.update({ where: { id }, data: { status: MemberRequestStatus.APPROVED, reviewedById: request.actor!.userId, provisionedUserId: user.id, reviewedAt: new Date(), rejectionReason: null }, include: { organization: { select: { id: true, nameFa: true, nameEn: true } } } });
      await tx.auditLog.create({ data: { userId: request.actor!.userId, organizationId: current.organizationId, action: "MEMBER_ACCESS_REQUEST_APPROVED", entityType: "MemberAccessRequest", entityId: id, metadata: { userId: user.id, username: current.username, role: current.role }, requestId: request.id, ipAddress: request.ip?.slice(0, 64), userAgent: request.headers["user-agent"]?.slice(0, 2000) } });
      return { request: updated, user };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return envelope({ request: result.request, user: { id: result.user.id, username: result.user.username, email: result.user.email, displayName: result.user.displayName }, credentialsReady: true });
  });

  app.post("/api/v1/admin/member-requests/:id/reject", { preHandler: authenticate, config: { allowUnsubscribed: true } }, async (request) => {
    requireSuperAdmin(request);
    const { id } = parse(z.object({ id: z.string().uuid() }), request.params);
    const body = parse(memberRequestRejectSchema, request.body);
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.memberAccessRequest.findUnique({ where: { id } });
      if (!current) throw Object.assign(new Error("درخواست عضویت پیدا نشد."), { statusCode: 404, code: "NOT_FOUND" });
      if (current.status !== MemberRequestStatus.PENDING) throw Object.assign(new Error("این درخواست قبلاً بررسی شده است."), { statusCode: 409, code: "MEMBER_REQUEST_ALREADY_REVIEWED" });
      const row = await tx.memberAccessRequest.update({ where: { id }, data: { status: MemberRequestStatus.REJECTED, reviewedById: request.actor!.userId, reviewedAt: new Date(), rejectionReason: body.reason || null } });
      await tx.auditLog.create({ data: { userId: request.actor!.userId, organizationId: current.organizationId, action: "MEMBER_ACCESS_REQUEST_REJECTED", entityType: "MemberAccessRequest", entityId: id, metadata: { reason: body.reason || null, username: current.username }, requestId: request.id, ipAddress: request.ip?.slice(0, 64), userAgent: request.headers["user-agent"]?.slice(0, 2000) } });
      return row;
    });
    return envelope(updated);
  });

  app.get("/api/v1/admin/users", { preHandler: authenticate, config: { allowUnsubscribed: true } }, async (request) => {
    requireSuperAdmin(request);
    const query = parse(userListQuerySchema, request.query);
    const search = query.search?.trim();
    const where: Prisma.UserWhereInput = search ? { OR: [{ email: { contains: search } }, { username: { contains: search } }, { displayName: { contains: search } }, { phone: { contains: search } }] } : {};
    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, select: adminUserSelect, skip: (query.page - 1) * query.limit, take: query.limit, orderBy: { createdAt: "desc" } }),
      prisma.user.count({ where }),
    ]);
    return envelope(users, { page: query.page, limit: query.limit, total });
  });

  app.get("/api/v1/admin/ai-usage", { preHandler: authenticate, config: { allowUnsubscribed: true } }, async (request) => {
    requireAIUsageAdmin(request);
    const query = parse(aiUsageQuerySchema, request.query);
    const search = query.search?.trim();
    const organizationId = request.actor?.role === GlobalRole.SUPER_ADMIN ? undefined : request.actor?.organizationId;
    const organizationScope: Prisma.UserWhereInput = organizationId ? { memberships: { some: { organizationId, active: true } } } : {};
    const searchScope: Prisma.UserWhereInput = search ? { OR: [{ email: { contains: search } }, { username: { contains: search } }, { displayName: { contains: search } }, { phone: { contains: search } }] } : {};
    const where: Prisma.UserWhereInput = { AND: [organizationScope, searchScope] };
    const usageScope: Prisma.AIUsageRecordWhereInput = organizationId ? { organizationId } : {};
    const usageSearchScope: Prisma.AIUsageRecordWhereInput = search ? { user: searchScope } : {};
    const [users, total, overall] = await Promise.all([
      prisma.user.findMany({ where, select: { id: true, email: true, username: true, displayName: true, active: true }, skip: (query.page - 1) * query.limit, take: query.limit, orderBy: { displayName: "asc" } }),
      prisma.user.count({ where }),
      prisma.aIUsageRecord.aggregate({ where: { AND: [usageScope, usageSearchScope] }, _count: { _all: true }, _sum: { inputTokens: true, outputTokens: true, totalTokens: true } }),
    ]);
    const usageRows = users.length ? await prisma.aIUsageRecord.groupBy({
      by: ["userId"],
      where: { AND: [usageScope, { userId: { in: users.map((user) => user.id) } }] },
      _count: { _all: true },
      _sum: { inputTokens: true, outputTokens: true, totalTokens: true },
    }) : [];
    const usageByUser = new Map(usageRows.map((row) => [row.userId, row]));
    return envelope({
      users: users.map((user) => {
        const usage = usageByUser.get(user.id);
        return {
          userId: user.id,
          displayName: user.displayName,
          username: user.username,
          email: user.email,
          active: user.active,
          requestCount: usage?._count._all ?? 0,
          inputTokens: usage?._sum.inputTokens ?? 0,
          outputTokens: usage?._sum.outputTokens ?? 0,
          totalTokens: usage?._sum.totalTokens ?? 0,
        };
      }),
      totals: {
        requestCount: overall._count._all,
        inputTokens: overall._sum.inputTokens ?? 0,
        outputTokens: overall._sum.outputTokens ?? 0,
        totalTokens: overall._sum.totalTokens ?? 0,
      },
    }, { page: query.page, limit: query.limit, total });
  });

  app.patch("/api/v1/admin/memberships/:id", { preHandler: authenticate, config: { allowUnsubscribed: true } }, async (request) => {
    requireSuperAdmin(request);
    const { id } = parse(z.object({ id: z.string().uuid() }), request.params);
    const body = parse(membershipUpdateSchema, request.body);
    const updated = await prisma.$transaction(async (tx) => {
      const membership = await tx.organizationMember.findUnique({ where: { id }, select: { id: true, role: true, active: true, organizationId: true, userId: true } });
      if (!membership) throw Object.assign(new Error("Membership not found"), { statusCode: 404, code: "NOT_FOUND" });
      const nextRole = (body.role ?? membership.role) as Role;
      const nextActive = body.active ?? membership.active;
      const removesAdmin = membership.role === Role.ORG_ADMIN && membership.active && (nextRole !== Role.ORG_ADMIN || !nextActive);
      if (removesAdmin) {
        const activeAdmins = await tx.organizationMember.count({ where: { organizationId: membership.organizationId, role: Role.ORG_ADMIN, active: true } });
        if (activeAdmins <= 1) throw Object.assign(new Error("At least one active organization administrator is required"), { statusCode: 409, code: "LAST_ORG_ADMIN" });
      }
      const result = await tx.organizationMember.update({ where: { id }, data: { ...(body.role === undefined ? {} : { role: nextRole }), ...(body.active === undefined ? {} : { active: nextActive }) } });
      await tx.auditLog.create({ data: { userId: request.actor!.userId, organizationId: membership.organizationId, action: "ADMIN_MEMBERSHIP_UPDATE", entityType: "OrganizationMember", entityId: id, metadata: { changedFields: Object.keys(body), role: nextRole, active: nextActive }, requestId: request.id, ipAddress: request.ip?.slice(0, 64), userAgent: request.headers["user-agent"]?.slice(0, 2000) } });
      return result;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return envelope(updated);
  });

  app.post("/api/v1/admin/users/:id/password", { preHandler: authenticate, config: { allowUnsubscribed: true } }, async (request) => {
    requireSuperAdmin(request);
    const { id } = parse(z.object({ id: z.string().uuid() }), request.params);
    if (id === request.actor!.userId) throw Object.assign(new Error("Use the profile password form to change your own password"), { statusCode: 409, code: "USE_PROFILE_PASSWORD" });
    const body = parse(adminPasswordSchema, request.body);
    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, displayName: true } });
    if (!target) throw Object.assign(new Error("User not found"), { statusCode: 404, code: "NOT_FOUND" });
    const passwordHash = await bcrypt.hash(checkedPassword(body.password, { email: target.email, displayName: target.displayName }), 12);
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { passwordHash } });
      await tx.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.auditLog.create({ data: { userId: request.actor!.userId, organizationId: request.actor!.organizationId, action: "ADMIN_PASSWORD_RESET", entityType: "User", entityId: id, metadata: { sessionsRevoked: true }, requestId: request.id, ipAddress: request.ip?.slice(0, 64), userAgent: request.headers["user-agent"]?.slice(0, 2000) } });
    });
    return envelope({ success: true });
  });

  app.patch("/api/v1/admin/users/:id", { preHandler: authenticate, config: { allowUnsubscribed: true } }, async (request) => {
    requireSuperAdmin(request);
    const { id } = parse(z.object({ id: z.string().uuid() }), request.params);
    const body = parse(userUpdateSchema, request.body);
    const email = body.email === undefined ? undefined : normalizeEmail(body.email);
    if (email !== undefined && !isValidEmail(email)) throw Object.assign(new Error("ایمیل معتبر وارد کنید."), { statusCode: 400, code: "INVALID_EMAIL" });
    const displayName = body.displayName === undefined ? undefined : normalizeDisplayName(body.displayName);
    if (displayName !== undefined && (!isValidDisplayName(displayName) || isForbiddenDisplayName(displayName))) throw Object.assign(new Error("این نام کاربری قابل استفاده نیست."), { statusCode: 400, code: "RESERVED_DISPLAY_NAME" });
    let phone: string | null | undefined;
    if (body.phone !== undefined) {
      phone = body.phone ? normalizePhone(body.phone) : null;
      if (phone && !isValidPhone(phone)) throw Object.assign(new Error("شماره تلفن معتبر وارد کنید."), { statusCode: 400, code: "INVALID_PHONE" });
    }
    let username: string | null | undefined;
    if (body.username !== undefined) {
      username = body.username ? normalizeUsername(body.username) : null;
      if (username && !isValidUsername(username)) throw Object.assign(new Error("نام کاربری باید انگلیسی، بدون فاصله و بین ۳ تا ۶۴ نویسه باشد."), { statusCode: 400, code: "INVALID_USERNAME" });
    }
    const jobTitle = body.jobTitle === undefined ? undefined : body.jobTitle || null;
    const actorId = request.actor!.userId;
    const updated = await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { id }, select: { id: true, email: true, username: true, displayName: true, active: true, globalRole: true } });
      if (!target) throw Object.assign(new Error("User not found"), { statusCode: 404, code: "NOT_FOUND" });
      const nextGlobalRole = (body.globalRole ?? target.globalRole) as GlobalRole;
      const nextActive = body.active ?? target.active;
      if (isForbiddenSelfChange(actorId, target.id, target.globalRole, nextGlobalRole, nextActive)) throw Object.assign(new Error("You cannot deactivate or demote your own administrator account"), { statusCode: 409, code: "SELF_ADMIN_CHANGE" });
      const activeSuperAdminCount = await tx.user.count({ where: { globalRole: GlobalRole.SUPER_ADMIN, active: true } });
      if (removesLastSuperAdmin({ targetGlobalRole: target.globalRole, targetActive: target.active, nextGlobalRole, nextActive, activeSuperAdminCount })) throw Object.assign(new Error("At least one active global administrator is required"), { statusCode: 409, code: "LAST_SUPER_ADMIN" });
      if (email !== undefined) {
        const duplicate = await tx.user.findFirst({ where: { email, NOT: { id } }, select: { id: true } });
        if (duplicate) throw Object.assign(new Error("این ایمیل قبلاً ثبت شده است."), { statusCode: 409, code: "EMAIL_IN_USE" });
      }
      if (username && username !== target.username) {
        const duplicate = await tx.user.findFirst({ where: { username, NOT: { id } }, select: { id: true } });
        if (duplicate) throw Object.assign(new Error("این نام کاربری قبلاً ثبت شده است."), { statusCode: 409, code: "USERNAME_IN_USE" });
      }
      const userData: Prisma.UserUpdateInput = {};
      if (email !== undefined) userData.email = email;
      if (username !== undefined) userData.username = username;
      if (displayName !== undefined) userData.displayName = displayName;
      if (phone !== undefined) userData.phone = phone;
      if (jobTitle !== undefined) userData.jobTitle = jobTitle;
      if (body.active !== undefined) userData.active = nextActive;
      if (body.globalRole !== undefined) userData.globalRole = nextGlobalRole;
      const result = await tx.user.update({ where: { id }, data: userData, select: adminUserSelect });
      const roleChanged = body.globalRole !== undefined && body.globalRole !== target.globalRole;
      const deactivated = body.active === false;
      if (roleChanged || deactivated) await tx.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.auditLog.create({ data: { userId: actorId, organizationId: request.actor?.organizationId, action: "ADMIN_USER_UPDATE", entityType: "User", entityId: id, metadata: { changedFields: Object.keys(body), active: nextActive, globalRole: nextGlobalRole }, requestId: request.id, ipAddress: request.ip?.slice(0, 64), userAgent: request.headers["user-agent"]?.slice(0, 2000) } });
      return result;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return envelope(updated);
  });
}
