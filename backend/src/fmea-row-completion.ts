import { Prisma, type PrismaClient } from "@prisma/client";

/** Lock the tenant-owned risk row to serialize repeated completion commands. */
export async function completeFmeaRowCorrection(db: PrismaClient, organizationId: string, assessmentId: string, itemId: string) {
  return db.$transaction(async tx => {
    const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT i.id FROM FmeaItem i INNER JOIN FmeaAssessment a ON a.id = i.assessmentId
      WHERE i.id = ${itemId} AND a.id = ${assessmentId}
        AND a.organizationId = ${organizationId} AND a.deletedAt IS NULL FOR UPDATE`);
    if (!locked.length) throw Object.assign(new Error("FMEA item not found"), { statusCode: 404, code: "NOT_FOUND" });
    const item = await tx.fmeaItem.findUniqueOrThrow({ where: { id: itemId }, include: { assessment: { select: { projectId: true } } } });
    const where = { organizationId, fmeaItemId: itemId, status: { notIn: ["CANCELLED", "REJECTED"] as Array<"CANCELLED" | "REJECTED"> } };
    const active = await tx.correctiveAction.count({ where });
    if (active) {
      await tx.correctiveAction.updateMany({ where, data: { status: "COMPLETED", progress: 100 } });
    } else {
      await tx.correctiveAction.create({ data: {
        organizationId, projectId: item.assessment.projectId, fmeaId: assessmentId, fmeaItemId: itemId,
        title: (item.recommendation?.trim() || item.failureMode).slice(0, 191),
        description: item.recommendation?.trim() || item.failureMode,
        priority: ["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(item.riskLevel) ? item.riskLevel : "LOW",
        status: "COMPLETED", progress: 100,
      } });
    }
    return { itemId, status: "COMPLETED" as const };
  });
}
