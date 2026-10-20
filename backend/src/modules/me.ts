import type { FastifyInstance } from "fastify";
import { authenticate } from "../auth-guard.js";
import { envelope, prisma } from "../core.js";
import { getAIQuotaStatus } from "../ai-quota.js";
import { refreshAIQuotaNotifications } from "../notification-feed.js";

export async function registerMeRoutes(app: FastifyInstance) {
  app.get("/api/v1/me/ai-quota", { preHandler: authenticate }, async (request) => {
    const userId = request.actor!.userId;
    const account = await prisma.user.findUnique({
      where: { id: userId },
      select: { active: true, aiEnabled: true, aiTokenLimit: true, aiTokensUsed: true },
    });
    if (!account) throw Object.assign(new Error("User not found"), { statusCode: 404, code: "NOT_FOUND" });
    const status = getAIQuotaStatus(account);
    if (request.actor?.organizationId) {
      try { await refreshAIQuotaNotifications(request.actor.organizationId, userId); }
      catch (error) { request.log.warn({ err: error }, "Unable to refresh AI quota notification"); }
    }
    return envelope(status);
  });
}
