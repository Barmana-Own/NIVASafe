import type { FastifyInstance } from "fastify";
import { ActionStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { authenticate } from "../auth-guard.js";
import { audit, envelope, pageParams, parse, prisma, requireOrg, requirePermission } from "../core.js";
import { progressForActionStatus } from "../action-progress.js";
import { rulaImpactSchema } from "../rula-report.js";
import { rulaBodySideSchema } from "../rula-process.js";

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
  app.get("/api/v1/actions", { preHandler: authenticate }, async (request) => {
    const organizationId = requireOrg(request); requirePermission(request, "projects.read"); const q = pageParams(request.query);
    const extra = parse(z.object({ status: z.nativeEnum(ActionStatus).optional(), projectId: z.string().uuid().optional(), fmeaId: z.string().uuid().optional() }), request.query);
    const where = { organizationId, ...(extra.status ? { status: extra.status } : {}), ...(extra.projectId ? { projectId: extra.projectId } : {}), ...(extra.fmeaId ? { fmeaId: extra.fmeaId } : {}), ...(q.search ? { OR: [{ title: { contains: q.search } }, { description: { contains: q.search } }] } : {}) };
    const [data, total] = await Promise.all([prisma.correctiveAction.findMany({ where, skip: (q.page - 1) * q.limit, take: q.limit, orderBy: { updatedAt: "desc" } }), prisma.correctiveAction.count({ where })]);
    return envelope(data, { page: q.page, limit: q.limit, total });
  });
  app.post("/api/v1/actions", { preHandler: authenticate }, async (request, reply) => {
    const organizationId = requireOrg(request); requirePermission(request, "assessments.update"); const body = parse(correctiveActionBodySchema, request.body);
    assertRulaImpactLink(body.rulaImpact, body.rulaId);
    await validateLinks(organizationId, body.projectId, body.fmeaId, body.rulaId, body.fmeaItemId, body.bodySide);
    const { rulaImpact, progress: submittedProgress, ...fields } = body;
    const progress = body.status === undefined ? submittedProgress : progressForActionStatus(body.status);
    const action = await prisma.correctiveAction.create({ data: { organizationId, ...fields, ...(progress === undefined ? {} : { progress }), ...(rulaImpact === undefined ? {} : { rulaImpact: jsonRulaImpact(rulaImpact) }) } }); await audit(request, "ACTION_CREATE", "CorrectiveAction", action.id); return reply.code(201).send(envelope(action));
  });
  app.get("/api/v1/actions/:id", { preHandler: authenticate }, async (request) => { const organizationId = requireOrg(request); requirePermission(request, "projects.read"); const { id } = parse(z.object({ id: z.string().uuid() }), request.params); const item = await prisma.correctiveAction.findFirst({ where: { id, organizationId }, include: { project: true, fmea: true, rula: true } }); if (!item) throw Object.assign(new Error("Action not found"), { statusCode: 404, code: "NOT_FOUND" }); return envelope(item); });
  app.patch("/api/v1/actions/:id", { preHandler: authenticate }, async (request) => {
    const organizationId = requireOrg(request); requirePermission(request, "assessments.update"); const { id } = parse(z.object({ id: z.string().uuid() }), request.params); const body = parse(correctiveActionBodySchema.partial(), request.body);
    const existing = await prisma.correctiveAction.findFirst({ where: { id, organizationId } }); if (!existing) throw Object.assign(new Error("Action not found"), { statusCode: 404, code: "NOT_FOUND" });
    const projectId = body.projectId ?? existing.projectId; const effectiveRulaId = body.rulaId === undefined ? existing.rulaId : body.rulaId; const effectiveBodySide = body.bodySide === undefined ? existing.bodySide as ActionBodySide | null : body.bodySide; assertRulaImpactLink(body.rulaImpact, effectiveRulaId); await validateLinks(organizationId, projectId, body.fmeaId === undefined ? existing.fmeaId : body.fmeaId, effectiveRulaId, body.fmeaItemId === undefined ? existing.fmeaItemId : body.fmeaItemId, effectiveBodySide);
    const { rulaImpact, progress: submittedProgress, ...fields } = body; const progress = body.status === undefined ? submittedProgress : progressForActionStatus(body.status); const item = await prisma.correctiveAction.update({ where: { id }, data: { ...fields, ...(rulaImpact === undefined ? {} : { rulaImpact: jsonRulaImpact(rulaImpact) }), ...(progress === undefined ? {} : { progress }) } }); await audit(request, "ACTION_UPDATE", "CorrectiveAction", id, body); return envelope(item);
  });
  app.delete("/api/v1/actions/:id", { preHandler: authenticate }, async (request) => { const organizationId = requireOrg(request); requirePermission(request, "assessments.delete"); const { id } = parse(z.object({ id: z.string().uuid() }), request.params); const result = await prisma.correctiveAction.deleteMany({ where: { id, organizationId } }); if (!result.count) throw Object.assign(new Error("Action not found"), { statusCode: 404, code: "NOT_FOUND" }); await audit(request, "ACTION_DELETE", "CorrectiveAction", id); return envelope({ success: true }); });
  app.get("/api/v1/actions/:id/history", { preHandler: authenticate }, async (request) => { const organizationId = requireOrg(request); requirePermission(request, "projects.read"); const { id } = parse(z.object({ id: z.string().uuid() }), request.params); const exists = await prisma.correctiveAction.count({ where: { id, organizationId } }); if (!exists) throw Object.assign(new Error("Action not found"), { statusCode: 404, code: "NOT_FOUND" }); return envelope(await prisma.auditLog.findMany({ where: { organizationId, entityType: "CorrectiveAction", entityId: id }, orderBy: { createdAt: "desc" } })); });
}
