import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../auth-guard.js";
import { envelope, pageParams, parse, prisma, requireOrg, requirePermission } from "../core.js";

export async function registerAuditRoutes(app: FastifyInstance) {
  app.get("/api/v1/audit", { preHandler: authenticate }, async (request) => { const organizationId = requireOrg(request); requirePermission(request, "audit.read"); const q = pageParams(request.query); const filter = parse(z.object({ action: z.string().optional(), entityType: z.string().optional() }), request.query); const where = { organizationId, ...(filter.action ? { action: filter.action } : {}), ...(filter.entityType ? { entityType: filter.entityType } : {}) }; const [data, total] = await Promise.all([prisma.auditLog.findMany({ where, include: { user: { select: { id: true, displayName: true, email: true } } }, skip: (q.page - 1) * q.limit, take: q.limit, orderBy: { createdAt: "desc" } }), prisma.auditLog.count({ where })]); return envelope(data, { page: q.page, limit: q.limit, total }); });
}
