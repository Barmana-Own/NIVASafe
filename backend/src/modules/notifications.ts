import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { authenticate } from "../auth-guard.js";
import { envelope, parse, prisma, requireOrg } from "../core.js";
import { refreshOperationalNotifications } from "../notification-feed.js";

function notificationScope(request: FastifyRequest) {
  return { userId: request.actor!.userId, ...(request.actor!.globalRole === "SUPER_ADMIN" ? {} : { organizationId: requireOrg(request) }) };
}

export async function registerNotificationRoutes(app: FastifyInstance) {
  app.get("/api/v1/notifications/summary", { preHandler: authenticate }, async (request) => {
    const where = notificationScope(request);
    const { limit } = parse(z.object({ limit: z.coerce.number().int().min(1).max(100).default(8) }), request.query);
    if (request.actor!.organizationId) await refreshOperationalNotifications(request.actor!.organizationId, where.userId);
    const [items, unreadCount, total] = await prisma.$transaction([
      prisma.notification.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: limit, select: { id: true, title: true, message: true, link: true, readAt: true, createdAt: true } }),
      prisma.notification.count({ where: { ...where, readAt: null } }),
      prisma.notification.count({ where }),
    ]);
    return envelope({ items, unreadCount, total });
  });
  app.get("/api/v1/notifications", { preHandler: authenticate }, async (request) => { return envelope(await prisma.notification.findMany({ where: notificationScope(request), orderBy: { createdAt: "desc" }, take: 100 })); });
  app.patch("/api/v1/notifications/:id/read", { preHandler: authenticate }, async (request) => { const { id } = parse(z.object({ id: z.string().uuid() }), request.params); const result = await prisma.notification.updateMany({ where: { id, ...notificationScope(request) }, data: { readAt: new Date() } }); if (!result.count) throw Object.assign(new Error("Notification not found"), { statusCode: 404 }); return envelope({ success: true }); });
  app.post("/api/v1/notifications/read-all", { preHandler: authenticate }, async (request) => { await prisma.notification.updateMany({ where: { ...notificationScope(request), readAt: null }, data: { readAt: new Date() } }); return envelope({ success: true }); });
  app.get("/api/v1/notifications/preferences", { preHandler: authenticate }, async (request) => { const organizationId = requireOrg(request); return envelope(await prisma.notificationPreference.upsert({ where: { organizationId_userId: { organizationId, userId: request.actor!.userId } }, create: { organizationId, userId: request.actor!.userId }, update: {} })); });
  app.patch("/api/v1/notifications/preferences", { preHandler: authenticate }, async (request) => { const organizationId = requireOrg(request); const body = parse(z.object({ emailEnabled: z.boolean().optional(), pushEnabled: z.boolean().optional(), riskAlerts: z.boolean().optional(), dueReminders: z.boolean().optional() }), request.body); return envelope(await prisma.notificationPreference.upsert({ where: { organizationId_userId: { organizationId, userId: request.actor!.userId } }, create: { organizationId, userId: request.actor!.userId, ...body }, update: body })); });
}
