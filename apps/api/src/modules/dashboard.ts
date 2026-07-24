import type { FastifyInstance } from "fastify";
import { authenticate } from "../auth-guard.js";
import { envelope, prisma, requireOrg } from "../core.js";

export async function registerDashboardRoutes(app: FastifyInstance) {
  app.get("/api/v1/dashboard", { preHandler: authenticate }, async (request) => {
    const organizationId = requireOrg(request); const now = new Date();
    const [projects, fmeas, rulas, openActions, overdueActions, criticalItems, recentFmeas, recentRulas] = await Promise.all([
      prisma.project.count({ where: { organizationId, deletedAt: null } }), prisma.fmeaAssessment.count({ where: { organizationId, deletedAt: null } }), prisma.rulaAssessment.count({ where: { organizationId, status: { not: "ARCHIVED" } } }),
      prisma.correctiveAction.count({ where: { organizationId, status: { notIn: ["COMPLETED", "CANCELLED"] } } }), prisma.correctiveAction.count({ where: { organizationId, dueDate: { lt: now }, status: { notIn: ["COMPLETED", "CANCELLED"] } } }), prisma.fmeaItem.count({ where: { assessment: { organizationId, deletedAt: null }, riskLevel: "CRITICAL" } }),
      prisma.fmeaAssessment.findMany({ where: { organizationId, deletedAt: null }, take: 5, orderBy: { updatedAt: "desc" } }), prisma.rulaAssessment.findMany({ where: { organizationId, status: { not: "ARCHIVED" } }, take: 5, orderBy: { updatedAt: "desc" } }),
    ]);
    const riskDistribution = await prisma.fmeaItem.groupBy({ by: ["riskLevel"], where: { assessment: { organizationId, deletedAt: null } }, _count: true });
    const actionDistribution = await prisma.correctiveAction.groupBy({ by: ["status"], where: { organizationId }, _count: true });
    return envelope({ counters: { projects, fmeas, rulas, openActions, overdueActions, criticalItems }, riskDistribution, actionDistribution, recent: { fmeas: recentFmeas, rulas: recentRulas } });
  });
}
