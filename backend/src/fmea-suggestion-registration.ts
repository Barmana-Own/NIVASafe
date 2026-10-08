import { createHash } from "node:crypto";
import { Prisma, type ActionStatus, type PrismaClient } from "@prisma/client";
import { progressForActionStatus } from "./action-progress.js";

export type FmeaSuggestionCommand = {
  title: string; description: string; priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status?: ActionStatus; assigneeName?: string | null; dueDate?: Date | null;
};

/** Register a control as a separate risk-context row without modifying its source. */
export async function registerFmeaSuggestion(db: PrismaClient, organizationId: string, assessmentId: string, sourceItemId: string, command: FmeaSuggestionCommand) {
  return db.$transaction(async tx => {
    const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id FROM FmeaAssessment WHERE id = ${assessmentId}
      AND organizationId = ${organizationId} AND deletedAt IS NULL FOR UPDATE`);
    if (!locked.length) throw Object.assign(new Error("Assessment not found"), { statusCode: 404 });
    const source = await tx.fmeaItem.findFirst({ where: { id: sourceItemId, assessmentId }, include: { assessment: { select: { projectId: true } } } });
    if (!source) throw Object.assign(new Error("Source risk row not found"), { statusCode: 404 });
    // Stable command identity handles retries, including a lost successful response.
    const digest = createHash("sha256").update(JSON.stringify([assessmentId, sourceItemId, command.title.trim().toLocaleLowerCase()])).digest("hex");
    const actionId = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-8${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
    const existing = await tx.correctiveAction.findFirst({ where: { id: actionId, organizationId, fmeaId: assessmentId } });
    if (existing) return existing;
    const last = await tx.fmeaItem.aggregate({ where: { assessmentId }, _max: { rowNumber: true } });
    const row = await tx.fmeaItem.create({ data: {
      assessmentId, rowNumber: (last._max.rowNumber ?? 0) + 1,
      processStep: source.processStep, failureMode: source.failureMode, effect: source.effect, cause: source.cause,
      preventiveControls: source.preventiveControls, detectionControls: source.detectionControls,
      severity: source.severity, occurrence: source.occurrence, detection: source.detection,
      rpn: source.rpn, riskLevel: source.riskLevel, recommendation: command.title,
      // A newly proposed control has no verified residual score yet.
    } });
    const status = command.status ?? "IN_PROGRESS";
    return tx.correctiveAction.create({ data: {
      id: actionId, organizationId, projectId: source.assessment.projectId,
      fmeaId: assessmentId, fmeaItemId: row.id, ...command, status, progress: progressForActionStatus(status),
    } });
  });
}
