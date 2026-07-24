import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../auth-guard.js";
import { envelope, parse, prisma, requireOrg } from "../core.js";

export async function registerNotificationRoutes(app: FastifyInstance) {
  app.get("/api/v1/notifications", { preHandler: authenticate }, async (request) => { const organizationId = requireOrg(request); return envelope(await prisma.notification.findMany({ where: { organizationId, userId: request.actor!.userId }, orderBy: { createdAt: "desc" }, take: 100 })); });
  app.patch("/api/v1/notifications/:id/read", { preHandler: authenticate }, async (request) => { const organizationId = requireOrg(request); const { id } = parse(z.object({ id: z.string().uuid() }), request.params); const result = await prisma.notification.updateMany({ where: { id, organizationId, userId: request.actor!.userId }, data: { readAt: new Date() } }); if (!result.count) throw Object.assign(new Error("Notification not found"), { statusCode: 404 }); return envelope({ success: true }); });
  app.post("/api/v1/notifications/read-all", { preHandler: authenticate }, async (request) => { const organizationId = requireOrg(request); await prisma.notification.updateMany({ where: { organizationId, userId: request.actor!.userId, readAt: null }, data: { readAt: new Date() } }); return envelope({ success: true }); });
  app.get("/api/v1/notifications/preferences", { preHandler: authenticate }, async (request) => { const organizationId = requireOrg(request); return envelope(await prisma.notificationPreference.upsert({ where: { organizationId_userId: { organizationId, userId: request.actor!.userId } }, create: { organizationId, userId: request.actor!.userId }, update: {} })); });
  app.patch("/api/v1/notifications/preferences", { preHandler: authenticate }, async (request) => { const organizationId = requireOrg(request); const body = parse(z.object({ emailEnabled: z.boolean().optional(), pushEnabled: z.boolean().optional(), riskAlerts: z.boolean().optional(), dueReminders: z.boolean().optional() }), request.body); return envelope(await prisma.notificationPreference.upsert({ where: { organizationId_userId: { organizationId, userId: request.actor!.userId } }, create: { organizationId, userId: request.actor!.userId, ...body }, update: body })); });
}
