import type { FastifyInstance } from "fastify";
import { ActionStatus } from "@prisma/client";
import { z } from "zod";
import { authenticate } from "../auth-guard.js";
import { audit, envelope, pageParams, parse, prisma, requireOrg, requirePermission } from "../core.js";

const nullableUuid = z.preprocess((value) => value === "" ? null : value, z.string().uuid().nullable().optional());
const nullableText = z.preprocess((value) => value === "" ? null : value, z.string().nullable().optional());
const bodySchema = z.object({
  projectId: z.string().uuid(), fmeaId: nullableUuid, rulaId: nullableUuid,
  title: z.string().trim().min(2), description: z.string().trim().min(2), priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  status: z.nativeEnum(ActionStatus).optional(), progress: z.coerce.number().int().min(0).max(100).optional(), assigneeName: nullableText,
  dueDate: z.preprocess((value) => value === "" ? null : value, z.coerce.date().nullable().optional()), beforeRisk: z.coerce.number().int().min(0).nullable().optional(), afterRisk: z.coerce.number().int().min(0).nullable().optional(),
});

async function validateLinks(organizationId: string, projectId: string, fmeaId?: string | null, rulaId?: string | null) {
  const project = await prisma.project.findFirst({ where: { id: projectId, organizationId, deletedAt: null } });
  if (!project) throw Object.assign(new Error("Project not found"), { statusCode: 404, code: "NOT_FOUND" });
  if (fmeaId) {
    const fmea = await prisma.fmeaAssessment.findFirst({ where: { id: fmeaId, organizationId, projectId, deletedAt: null } });
    if (!fmea) throw Object.assign(new Error("The selected FMEA does not belong to this project"), { statusCode: 400, code: "FMEA_PROJECT_MISMATCH" });
  }
  if (rulaId) {
    const rula = await prisma.rulaAssessment.findFirst({ where: { id: rulaId, organizationId, projectId, status: { not: "ARCHIVED" } } });
    if (!rula) throw Object.assign(new Error("The selected RULA does not belong to this project"), { statusCode: 400, code: "RULA_PROJECT_MISMATCH" });
  }
}

export async function registerActionRoutes(app: FastifyInstance) {
  app.get("/api/v1/actions", { preHandler: authenticate }, async (request) => {
    const organizationId = requireOrg(request); requirePermission(request, "projects.read"); const q = pageParams(request.query);
    const extra = parse(z.object({ status: z.nativeEnum(ActionStatus).optional(), projectId: z.string().uuid().optional() }), request.query);
    const where = { organizationId, ...(extra.status ? { status: extra.status } : {}), ...(extra.projectId ? { projectId: extra.projectId } : {}), ...(q.search ? { OR: [{ title: { contains: q.search } }, { description: { contains: q.search } }] } : {}) };
    const [data, total] = await Promise.all([prisma.correctiveAction.findMany({ where, skip: (q.page - 1) * q.limit, take: q.limit, orderBy: { updatedAt: "desc" } }), prisma.correctiveAction.count({ where })]);
    return envelope(data, { page: q.page, limit: q.limit, total });
  });
  app.post("/api/v1/actions", { preHandler: authenticate }, async (request, reply) => {
    const organizationId = requireOrg(request); requirePermission(request, "assessments.update"); const body = parse(bodySchema, request.body);
    await validateLinks(organizationId, body.projectId, body.fmeaId, body.rulaId);
    const action = await prisma.correctiveAction.create({ data: { organizationId, ...body } }); await audit(request, "ACTION_CREATE", "CorrectiveAction", action.id); return reply.code(201).send(envelope(action));
  });
  app.get("/api/v1/actions/:id", { preHandler: authenticate }, async (request) => { const organizationId = requireOrg(request); requirePermission(request, "projects.read"); const { id } = parse(z.object({ id: z.string().uuid() }), request.params); const item = await prisma.correctiveAction.findFirst({ where: { id, organizationId }, include: { project: true, fmea: true, rula: true } }); if (!item) throw Object.assign(new Error("Action not found"), { statusCode: 404, code: "NOT_FOUND" }); return envelope(item); });
  app.patch("/api/v1/actions/:id", { preHandler: authenticate }, async (request) => {
    const organizationId = requireOrg(request); requirePermission(request, "assessments.update"); const { id } = parse(z.object({ id: z.string().uuid() }), request.params); const body = parse(bodySchema.partial(), request.body);
    const existing = await prisma.correctiveAction.findFirst({ where: { id, organizationId } }); if (!existing) throw Object.assign(new Error("Action not found"), { statusCode: 404, code: "NOT_FOUND" });
    const projectId = body.projectId ?? existing.projectId; await validateLinks(organizationId, projectId, body.fmeaId === undefined ? existing.fmeaId : body.fmeaId, body.rulaId === undefined ? existing.rulaId : body.rulaId);
    const progress = body.status === ActionStatus.COMPLETED ? 100 : body.progress; const item = await prisma.correctiveAction.update({ where: { id }, data: { ...body, ...(progress === undefined ? {} : { progress }) } }); await audit(request, "ACTION_UPDATE", "CorrectiveAction", id, body); return envelope(item);
  });
  app.delete("/api/v1/actions/:id", { preHandler: authenticate }, async (request) => { const organizationId = requireOrg(request); requirePermission(request, "assessments.delete"); const { id } = parse(z.object({ id: z.string().uuid() }), request.params); const result = await prisma.correctiveAction.deleteMany({ where: { id, organizationId } }); if (!result.count) throw Object.assign(new Error("Action not found"), { statusCode: 404, code: "NOT_FOUND" }); await audit(request, "ACTION_DELETE", "CorrectiveAction", id); return envelope({ success: true }); });
  app.get("/api/v1/actions/:id/history", { preHandler: authenticate }, async (request) => { const organizationId = requireOrg(request); requirePermission(request, "projects.read"); const { id } = parse(z.object({ id: z.string().uuid() }), request.params); const exists = await prisma.correctiveAction.count({ where: { id, organizationId } }); if (!exists) throw Object.assign(new Error("Action not found"), { statusCode: 404, code: "NOT_FOUND" }); return envelope(await prisma.auditLog.findMany({ where: { organizationId, entityType: "CorrectiveAction", entityId: id }, orderBy: { createdAt: "desc" } })); });
}
