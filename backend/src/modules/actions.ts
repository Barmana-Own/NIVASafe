import type { FastifyInstance } from "fastify";
import { ActionStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { authenticate } from "../auth-guard.js";
import { audit, envelope, pageParams, parse, prisma, requireOrg, requirePermission } from "../core.js";
import { progressForActionStatus } from "../action-progress.js";
import { completeFmeaRowCorrection } from "../fmea-row-completion.js";
import { registerFmeaSuggestion } from "../fmea-suggestion-registration.js";
import { rulaImpactSchema } from "../rula-report.js";
import { rulaBodySideSchema } from "../rula-process.js";
import { fmeaAssessmentActionScope, rulaAssessmentActionScope } from "../action-report-scope.js";
import { withoutActionCreateRequestHash } from "../action-response.js";
import { createHash } from "node:crypto";

const nullableUuid = z.preprocess((value) => value === "" ? null : value, z.string().uuid().nullable().optional());
const nullableText = z.preprocess((value) => value === "" ? null : value, z.string().nullable().optional());
export const actionBodySideSchema = rulaBodySideSchema;
export type ActionBodySide = z.infer<typeof actionBodySideSchema>;
export const correctiveActionBodySchema = z.object({
  projectId: z.string().uuid(), fmeaId: nullableUuid, fmeaItemId: nullableUuid, rulaId: nullableUuid, bodySide: actionBodySideSchema.nullable().optional(),
  title: z.string().trim().min(2), description: z.string().trim().min(2), priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  status: z.nativeEnum(ActionStatus).optional(), progress: z.coerce.number().int().min(0).max(100).optional(), assigneeName: nullableText,
  dueDate: z.preprocess((value) => value === "" ? null : value, z.coerce.date().nullable().optional()), beforeRisk: z.coerce.number().int().min(0).nullable().optional(), afterRisk: z.coerce.number().int().min(0).nullable().optional(),
  rulaImpact: rulaImpactSchema.nullable().optional(),
});

export const actionListQuerySchema = z.object({
  status: z.nativeEnum(ActionStatus).optional(),
  projectId: z.string().uuid().optional(),
  fmeaId: z.string().uuid().optional(),
  rulaId: z.string().uuid().optional(),
  type: z.enum(["FMEA", "RULA", "UNCLASSIFIED"]).optional(),
}).superRefine((query, context) => {
  if (query.rulaId && query.fmeaId) context.addIssue({ code: "custom", path: ["type"], message: "Choose one assessment type" });
  if (query.type === "FMEA" && query.rulaId) context.addIssue({ code: "custom", path: ["rulaId"], message: "RULA filters cannot be used with FMEA" });
  if (query.type === "RULA" && query.fmeaId) context.addIssue({ code: "custom", path: ["fmeaId"], message: "FMEA filters cannot be used with RULA" });
  if (query.type === "UNCLASSIFIED" && (query.rulaId || query.fmeaId)) context.addIssue({ code: "custom", path: ["type"], message: "Unclassified actions do not have an assessment filter" });
});
const actionCreateIdempotencyKeySchema = z.string().trim().min(1).max(191);

type ActionListFilters = z.infer<typeof actionListQuerySchema>;

export function assertCorrectiveActionLinks(links: { fmeaId?: string | null; fmeaItemId?: string | null; rulaId?: string | null; bodySide?: ActionBodySide | null; rulaImpact?: z.infer<typeof rulaImpactSchema> | null }) {
  const hasFmea = Boolean(links.fmeaId || links.fmeaItemId);
  const hasRula = Boolean(links.rulaId);
  if (hasFmea && hasRula) throw Object.assign(new Error("A corrective action cannot link both FMEA and RULA"), { statusCode: 400, code: "ACTION_TYPE_MIXED" });
  if (links.fmeaItemId && !links.fmeaId) throw Object.assign(new Error("An FMEA risk row requires its assessment context"), { statusCode: 400, code: "FMEA_ASSESSMENT_REQUIRED" });
  if (links.bodySide && !hasRula) throw Object.assign(new Error("Body side is only valid for a RULA action"), { statusCode: 400, code: "ACTION_BODY_SIDE_REQUIRES_RULA" });
  if (links.rulaImpact && !hasRula) throw Object.assign(new Error("RULA impact requires a RULA assessment"), { statusCode: 400, code: "RULA_IMPACT_ASSESSMENT_REQUIRED" });
  if (hasRula && !links.bodySide) throw Object.assign(new Error("Corrective actions linked to RULA must specify the targeted body side"), { statusCode: 400, code: "RULA_ACTION_BODY_SIDE_REQUIRED" });
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function actionCreateFingerprint(action: Record<string, unknown>, progress: number | undefined) {
  const dueDate = action.dueDate ? new Date(action.dueDate as string | Date).toISOString() : null;
  return createHash("sha256").update(stableJson({
    projectId: action.projectId,
    fmeaId: action.fmeaId ?? null,
    fmeaItemId: action.fmeaItemId ?? null,
    rulaId: action.rulaId ?? null,
    bodySide: action.bodySide ?? null,
    title: action.title,
    description: action.description,
    priority: action.priority ?? "MEDIUM",
    status: action.status ?? ActionStatus.OPEN,
    progress: progress ?? 0,
    assigneeName: action.assigneeName ?? null,
    dueDate,
    beforeRisk: action.beforeRisk ?? null,
    afterRisk: action.afterRisk ?? null,
    rulaImpact: action.rulaImpact ?? null,
  })).digest("hex");
}

function actionIdForCreateIdempotency(organizationId: string, userId: string, key: string) {
  const digest = createHash("sha256").update(JSON.stringify([organizationId, userId, key])).digest("hex");
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-8${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
}

function idempotencyKeyConflict() {
  return Object.assign(new Error("The idempotency key was already used for a different action"), { statusCode: 409, code: "IDEMPOTENCY_KEY_REUSED" });
}

function isUniqueConstraintError(error: unknown) {
  return (error as { code?: unknown } | null)?.code === "P2002";
}

export function buildActionWhere(organizationId: string, filters: ActionListFilters, page: { search?: string }) : Prisma.CorrectiveActionWhereInput {
  const clauses: Prisma.CorrectiveActionWhereInput[] = [{ organizationId }];
  if (filters.status) clauses.push({ status: filters.status });
  if (filters.projectId) clauses.push({ projectId: filters.projectId });
  if (filters.fmeaId) clauses.push(fmeaAssessmentActionScope(filters.fmeaId));
  if (filters.rulaId) clauses.push(rulaAssessmentActionScope(filters.rulaId));
  if (page.search) clauses.push({ OR: [{ title: { contains: page.search } }, { description: { contains: page.search } }] });
  if (filters.type === "FMEA") clauses.push({ rulaId: null, OR: [{ fmeaId: { not: null } }, { fmeaItemId: { not: null } }] });
  else if (filters.type === "RULA") clauses.push({ rulaId: { not: null }, fmeaId: null, fmeaItemId: null });
  else if (filters.type === "UNCLASSIFIED") clauses.push({ OR: [
    { fmeaId: null, fmeaItemId: null, rulaId: null },
    { AND: [{ rulaId: { not: null } }, { OR: [{ fmeaId: { not: null } }, { fmeaItemId: { not: null } }] }] },
  ] });
  return { AND: clauses };
}

export function assertRulaActionBodySide(actionBodySide: ActionBodySide | null | undefined, assessmentBodySide: ActionBodySide) {
  if (!actionBodySide) throw Object.assign(new Error("Corrective actions linked to RULA must specify the targeted body side"), { statusCode: 400, code: "RULA_ACTION_BODY_SIDE_REQUIRED" });
  if (assessmentBodySide !== "BOTH" && actionBodySide !== assessmentBodySide) throw Object.assign(new Error("The corrective-action side must match the RULA assessment side"), { statusCode: 400, code: "RULA_ACTION_BODY_SIDE_MISMATCH" });
}

function assertRulaImpactLink(impact: z.infer<typeof rulaImpactSchema> | null | undefined, rulaId: string | null | undefined) {
  if (impact && !rulaId) throw Object.assign(new Error("RULA impact must be linked to a RULA assessment"), { statusCode: 400, code: "RULA_IMPACT_ASSESSMENT_REQUIRED" });
}

function jsonRulaImpact(impact: z.infer<typeof rulaImpactSchema> | null | undefined): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  return impact === undefined ? undefined : impact === null ? Prisma.JsonNull : JSON.parse(JSON.stringify(impact)) as Prisma.InputJsonValue;
}

async function validateLinks(organizationId: string, projectId: string, fmeaId?: string | null, rulaId?: string | null, fmeaItemId?: string | null, bodySide?: ActionBodySide | null) {
  const project = await prisma.project.findFirst({ where: { id: projectId, organizationId, deletedAt: null } });
  if (!project) throw Object.assign(new Error("Project not found"), { statusCode: 404, code: "NOT_FOUND" });
  if (fmeaId) {
    const fmea = await prisma.fmeaAssessment.findFirst({ where: { id: fmeaId, organizationId, projectId, deletedAt: null } });
    if (!fmea) throw Object.assign(new Error("The selected FMEA does not belong to this project"), { statusCode: 400, code: "FMEA_PROJECT_MISMATCH" });
  }
  if (fmeaItemId) {
    const fmeaItem = await prisma.fmeaItem.findFirst({ where: { id: fmeaItemId, assessment: { organizationId, projectId, deletedAt: null } }, select: { assessmentId: true } });
    if (!fmeaItem) throw Object.assign(new Error("The selected FMEA risk row does not belong to this project"), { statusCode: 400, code: "FMEA_ITEM_PROJECT_MISMATCH" });
    if (fmeaId && fmeaItem.assessmentId !== fmeaId) throw Object.assign(new Error("The selected FMEA risk row does not belong to this assessment"), { statusCode: 400, code: "FMEA_ITEM_ASSESSMENT_MISMATCH" });
  }
  if (rulaId) {
    const rula = await prisma.rulaAssessment.findFirst({ where: { id: rulaId, organizationId, projectId, status: { not: "ARCHIVED" } } });
    if (!rula) throw Object.assign(new Error("The selected RULA does not belong to this project"), { statusCode: 400, code: "RULA_PROJECT_MISMATCH" });
    const assessmentBodySide = actionBodySideSchema.safeParse(rula.bodySide);
    if (!assessmentBodySide.success) throw Object.assign(new Error("The selected RULA has an invalid body-side scope"), { statusCode: 500, code: "RULA_BODY_SIDE_INVALID" });
    assertRulaActionBodySide(bodySide, assessmentBodySide.data);
  }
}

export async function registerActionRoutes(app: FastifyInstance) {
  app.post("/api/v1/fmea/:id/items/:itemId/register-action", { preHandler: authenticate }, async (request, reply) => {
    const organizationId = requireOrg(request); requirePermission(request, "assessments.update");
    const { id, itemId } = parse(z.object({ id: z.string().uuid(), itemId: z.string().uuid() }), request.params);
    const body = parse(correctiveActionBodySchema.pick({ title: true, description: true, priority: true, status: true, assigneeName: true, dueDate: true }).extend({ title: z.string().trim().min(2).max(191), description: z.string().trim().min(2).max(20000) }).strict(), request.body);
    const action = await registerFmeaSuggestion(prisma, organizationId, id, itemId, body);
    await audit(request, "FMEA_SUGGESTION_REGISTER", "CorrectiveAction", action.id, { assessmentId: id, sourceItemId: itemId });
    return reply.code(201).send(envelope(action));
  });
  app.post("/api/v1/fmea/:id/items/:itemId/complete", { preHandler: authenticate }, async request => {
    const organizationId = requireOrg(request); requirePermission(request, "assessments.update");
    const { id, itemId } = parse(z.object({ id: z.string().uuid(), itemId: z.string().uuid() }), request.params);
    parse(z.object({}).strict(), request.body ?? {});
    const result = await completeFmeaRowCorrection(prisma, organizationId, id, itemId);
    await audit(request, "FMEA_ROW_CORRECTION_COMPLETED", "FmeaItem", itemId, { assessmentId: id });
    return envelope(result);
  });
  app.get("/api/v1/actions", { preHandler: authenticate }, async (request) => {
    const organizationId = requireOrg(request); requirePermission(request, "projects.read"); const q = pageParams(request.query);
    const extra = parse(actionListQuerySchema, request.query);
    const where = buildActionWhere(organizationId, extra, q);
    const [data, total] = await Promise.all([prisma.correctiveAction.findMany({ where, skip: (q.page - 1) * q.limit, take: q.limit, orderBy: { updatedAt: "desc" } }), prisma.correctiveAction.count({ where })]);
    return envelope(data.map(withoutActionCreateRequestHash), { page: q.page, limit: q.limit, total });
  });
  app.post("/api/v1/actions", { preHandler: authenticate }, async (request, reply) => {
    const organizationId = requireOrg(request); requirePermission(request, "assessments.update"); const body = parse(correctiveActionBodySchema, request.body);
    assertCorrectiveActionLinks(body);
    await validateLinks(organizationId, body.projectId, body.fmeaId, body.rulaId, body.fmeaItemId, body.bodySide);
    const idempotencyKey = request.headers["idempotency-key"] === undefined ? null : parse(actionCreateIdempotencyKeySchema, request.headers["idempotency-key"]);
    const { rulaImpact, progress: submittedProgress, ...fields } = body;
    const progress = body.status === undefined ? submittedProgress : progressForActionStatus(body.status);
    const data = { organizationId, ...fields, ...(progress === undefined ? {} : { progress }), ...(rulaImpact === undefined ? {} : { rulaImpact: jsonRulaImpact(rulaImpact) }) };
    if (!idempotencyKey) {
      const action = await prisma.correctiveAction.create({ data }); await audit(request, "ACTION_CREATE", "CorrectiveAction", action.id); return reply.code(201).send(envelope(withoutActionCreateRequestHash(action)));
    }
    const id = actionIdForCreateIdempotency(organizationId, request.actor!.userId, idempotencyKey);
    const fingerprint = actionCreateFingerprint(body, progress);
    const existing = await prisma.correctiveAction.findUnique({ where: { id } });
    if (existing) {
      if (existing.createRequestHash !== fingerprint) throw idempotencyKeyConflict();
      return reply.code(200).send(envelope(withoutActionCreateRequestHash(existing)));
    }
    try {
      const action = await prisma.correctiveAction.create({ data: { ...data, id, createRequestHash: fingerprint } });
      await audit(request, "ACTION_CREATE", "CorrectiveAction", action.id);
      return reply.code(201).send(envelope(withoutActionCreateRequestHash(action)));
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      const duplicate = await prisma.correctiveAction.findUnique({ where: { id } });
      if (!duplicate || duplicate.createRequestHash !== fingerprint) throw idempotencyKeyConflict();
      return reply.code(200).send(envelope(withoutActionCreateRequestHash(duplicate)));
    }
  });
  app.get("/api/v1/actions/:id", { preHandler: authenticate }, async (request) => { const organizationId = requireOrg(request); requirePermission(request, "projects.read"); const { id } = parse(z.object({ id: z.string().uuid() }), request.params); const item = await prisma.correctiveAction.findFirst({ where: { id, organizationId }, include: { project: true, fmea: true, rula: true } }); if (!item) throw Object.assign(new Error("Action not found"), { statusCode: 404, code: "NOT_FOUND" }); return envelope(withoutActionCreateRequestHash(item)); });
  app.patch("/api/v1/actions/:id", { preHandler: authenticate }, async (request) => {
    const organizationId = requireOrg(request); requirePermission(request, "assessments.update"); const { id } = parse(z.object({ id: z.string().uuid() }), request.params); const body = parse(correctiveActionBodySchema.partial(), request.body);
    const existing = await prisma.correctiveAction.findFirst({ where: { id, organizationId } }); if (!existing) throw Object.assign(new Error("Action not found"), { statusCode: 404, code: "NOT_FOUND" });
    const projectId = body.projectId ?? existing.projectId; const effectiveRulaId = body.rulaId === undefined ? existing.rulaId : body.rulaId; const effectiveBodySide = body.bodySide === undefined ? existing.bodySide as ActionBodySide | null : body.bodySide; const effectiveFmeaId = body.fmeaId === undefined ? existing.fmeaId : body.fmeaId; const effectiveFmeaItemId = body.fmeaItemId === undefined ? existing.fmeaItemId : body.fmeaItemId; const effectiveImpact = body.rulaImpact === undefined ? existing.rulaImpact as z.infer<typeof rulaImpactSchema> | null : body.rulaImpact; assertCorrectiveActionLinks({ fmeaId: effectiveFmeaId, fmeaItemId: effectiveFmeaItemId, rulaId: effectiveRulaId, bodySide: effectiveBodySide, rulaImpact: effectiveImpact }); await validateLinks(organizationId, projectId, effectiveFmeaId, effectiveRulaId, effectiveFmeaItemId, effectiveBodySide);
    const { rulaImpact, progress: submittedProgress, ...fields } = body; const progress = body.status === undefined ? submittedProgress : progressForActionStatus(body.status); const item = await prisma.correctiveAction.update({ where: { id }, data: { ...fields, ...(rulaImpact === undefined ? {} : { rulaImpact: jsonRulaImpact(rulaImpact) }), ...(progress === undefined ? {} : { progress }) } }); await audit(request, "ACTION_UPDATE", "CorrectiveAction", id, body); return envelope(withoutActionCreateRequestHash(item));
  });
  app.delete("/api/v1/actions/:id", { preHandler: authenticate }, async (request) => { const organizationId = requireOrg(request); requirePermission(request, "assessments.delete"); const { id } = parse(z.object({ id: z.string().uuid() }), request.params); const result = await prisma.correctiveAction.deleteMany({ where: { id, organizationId } }); if (!result.count) throw Object.assign(new Error("Action not found"), { statusCode: 404, code: "NOT_FOUND" }); await audit(request, "ACTION_DELETE", "CorrectiveAction", id); return envelope({ success: true }); });
  app.get("/api/v1/actions/:id/history", { preHandler: authenticate }, async (request) => { const organizationId = requireOrg(request); requirePermission(request, "projects.read"); const { id } = parse(z.object({ id: z.string().uuid() }), request.params); const exists = await prisma.correctiveAction.count({ where: { id, organizationId } }); if (!exists) throw Object.assign(new Error("Action not found"), { statusCode: 404, code: "NOT_FOUND" }); return envelope(await prisma.auditLog.findMany({ where: { organizationId, entityType: "CorrectiveAction", entityId: id }, orderBy: { createdAt: "desc" } })); });
}
