import type { FastifyInstance, FastifyRequest } from "fastify";
import { GlobalRole, Prisma } from "@prisma/client";
import { DISPLAY_NAME_MAX_LENGTH, EMAIL_MAX_LENGTH, isForbiddenDisplayName, isValidDisplayName, isValidEmail, isValidPhone, normalizeDisplayName, normalizeEmail, normalizePhone } from "@nivasafe/domain";
import { z } from "zod";
import { authenticate } from "../auth-guard.js";
import { envelope, parse, prisma } from "../core.js";

const adminUserSelect = {
  id: true,
  email: true,
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
  phone: z.string().trim().max(32).nullable().optional(),
  jobTitle: z.string().trim().max(120).nullable().optional(),
}).refine((value) => Object.values(value).some((item) => item !== undefined), { message: "At least one user field is required" });

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
    const [totalUsers, activeUsers, superAdmins, totalOrganizations, activeOrganizations, activeMemberships, pendingInvitations, recentUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { active: true } }),
      prisma.user.count({ where: { globalRole: GlobalRole.SUPER_ADMIN, active: true } }),
      prisma.organization.count(),
      prisma.organization.count({ where: { active: true } }),
      prisma.organizationMember.count({ where: { active: true } }),
      prisma.invitation.count({ where: { acceptedAt: null, expiresAt: { gt: now } } }),
      prisma.user.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        select: { id: true, displayName: true, email: true, active: true, globalRole: true, createdAt: true },
      }),
    ]);
    return envelope({
      users: { total: totalUsers, active: activeUsers, inactive: totalUsers - activeUsers, superAdmins },
      organizations: { total: totalOrganizations, active: activeOrganizations, inactive: totalOrganizations - activeOrganizations },
      activeMemberships,
      pendingInvitations,
      recentUsers,
    });
  });

  app.get("/api/v1/admin/users", { preHandler: authenticate, config: { allowUnsubscribed: true } }, async (request) => {
    requireSuperAdmin(request);
    const query = parse(userListQuerySchema, request.query);
    const search = query.search?.trim();
    const where: Prisma.UserWhereInput = search ? { OR: [{ email: { contains: search } }, { displayName: { contains: search } }, { phone: { contains: search } }] } : {};
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
    const searchScope: Prisma.UserWhereInput = search ? { OR: [{ email: { contains: search } }, { displayName: { contains: search } }, { phone: { contains: search } }] } : {};
    const where: Prisma.UserWhereInput = { AND: [organizationScope, searchScope] };
    const usageScope: Prisma.AIUsageRecordWhereInput = organizationId ? { organizationId } : {};
    const usageSearchScope: Prisma.AIUsageRecordWhereInput = search ? { user: searchScope } : {};
    const [users, total, overall] = await Promise.all([
      prisma.user.findMany({ where, select: { id: true, email: true, displayName: true, active: true }, skip: (query.page - 1) * query.limit, take: query.limit, orderBy: { displayName: "asc" } }),
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
    const jobTitle = body.jobTitle === undefined ? undefined : body.jobTitle || null;
    const actorId = request.actor!.userId;
    const updated = await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { id }, select: { id: true, email: true, displayName: true, active: true, globalRole: true } });
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
      const userData: Prisma.UserUpdateInput = {};
      if (email !== undefined) userData.email = email;
      if (displayName !== undefined) userData.displayName = displayName;
      if (phone !== undefined) userData.phone = phone;
      if (jobTitle !== undefined) userData.jobTitle = jobTitle;
      if (body.active !== undefined) userData.active = nextActive;
      if (body.globalRole !== undefined) userData.globalRole = nextGlobalRole;
      const result = await tx.user.update({ where: { id }, data: userData, select: adminUserSelect });
      const roleChanged = body.globalRole !== undefined && body.globalRole !== target.globalRole;
      const deactivated = body.active === false;
      if (roleChanged || deactivated) await tx.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.auditLog.create({ data: { userId: actorId, action: "ADMIN_USER_UPDATE", entityType: "User", entityId: id, metadata: { changedFields: Object.keys(body), active: nextActive, globalRole: nextGlobalRole }, requestId: request.id } });
      return result;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return envelope(updated);
  });
}
