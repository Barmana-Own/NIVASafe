import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../auth-guard.js";
import { audit, envelope, pageParams, parse, prisma, requireOrg, requirePermission } from "../core.js";
import { DEFAULT_PROJECT_CODE, ensureDefaultProject } from "../onboarding.js";

const nullableText = z.preprocess((value) => value === "" ? null : value, z.string().nullable().optional());
const nullableUuid = z.preprocess((value) => value === "" ? null : value, z.string().uuid().nullable().optional());
export const projectBody = z.object({ name: z.string().trim().min(2), code: z.preprocess((value) => typeof value === "string" && value.trim() === "" ? undefined : value, z.string().trim().min(2).max(40).optional()), description: nullableText, status: z.enum(["DRAFT", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]).optional(), startDate: z.preprocess((value) => value === "" ? null : value, z.coerce.date().nullable().optional()), endDate: z.preprocess((value) => value === "" ? null : value, z.coerce.date().nullable().optional()) });
const initialProcessName = z.preprocess((value) => typeof value === "string" && value.trim() === "" ? undefined : value, z.string().trim().min(2).max(180).optional());
const initialActivityTitle = z.preprocess((value) => typeof value === "string" && value.trim() === "" ? undefined : value, z.string().trim().min(2).max(180).optional());
const initialActivityLocation = z.preprocess((value) => typeof value === "string" && value.trim() === "" ? undefined : value, z.string().trim().max(180).optional());
export const projectCreateBody = projectBody.extend({ initialProcessName, initialActivityTitle, initialActivityLocation }).superRefine((body, context) => {
  if (body.initialActivityTitle && !body.initialProcessName) {
    context.addIssue({ code: "custom", path: ["initialProcessName"], message: "An initial process is required when an initial activity title is provided" });
  }
});
const processBody = z.object({ projectId: z.string().uuid(), name: z.string().trim().min(2), description: nullableText, parentId: nullableUuid });
const activityBody = z.object({ projectId: z.string().uuid(), processId: nullableUuid, title: z.string().trim().min(2), jobTitle: nullableText, location: nullableText, description: nullableText, hazards: nullableText });

export function generateProjectCode() {
  return `PRJ-${randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}

async function createProject(organizationId: string, body: z.infer<typeof projectCreateBody>) {
  const { initialProcessName, initialActivityTitle, initialActivityLocation, ...projectData } = body;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const project = await tx.project.create({ data: { organizationId, ...projectData, code: projectData.code ?? generateProjectCode() } });
        if (!initialProcessName) return { project };
        const process = await tx.process.create({ data: { organizationId, projectId: project.id, name: initialProcessName, description: null, parentId: null } });
        if (!initialActivityTitle) return { project, processId: process.id };
        const activity = await tx.activity.create({ data: { organizationId, projectId: project.id, processId: process.id, title: initialActivityTitle, location: initialActivityLocation ?? null } });
        return { project, processId: process.id, activityId: activity.id };
      });
    } catch (error) {
      if (projectData.code || (error as { code?: string }).code !== "P2002" || attempt === 2) throw error;
    }
  }
  throw new Error("Unable to generate a unique project code");
}

async function ensureProject(projectId: string, organizationId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, organizationId, deletedAt: null } });
  if (!project) throw Object.assign(new Error("Project not found"), { statusCode: 404, code: "NOT_FOUND" });
  return project;
}

function defaultProjectDeletionError() {
  return Object.assign(new Error("The default test project cannot be deleted"), {
    statusCode: 409,
    code: "DEFAULT_PROJECT_PROTECTED",
  });
}

async function ensureProcess(processId: string, organizationId: string, projectId: string, selfId?: string) {
  if (selfId && processId === selfId) throw Object.assign(new Error("A process cannot be its own parent"), { statusCode: 400, code: "INVALID_PARENT" });
  const process = await prisma.process.findFirst({ where: { id: processId, organizationId, projectId, deletedAt: null } });
  if (!process) throw Object.assign(new Error("The selected process does not belong to this project"), { statusCode: 400, code: "PROCESS_PROJECT_MISMATCH" });
  return process;
}

async function validateProcessHierarchy(processId: string, parentId: string | null | undefined, organizationId: string, projectId: string) {
  if (!parentId) return;
  await ensureProcess(parentId, organizationId, projectId, processId);
  let cursor: string | null = parentId;
  const visited = new Set<string>();
  while (cursor) {
    if (cursor === processId) throw Object.assign(new Error("Circular process hierarchy is not allowed"), { statusCode: 400, code: "PROCESS_CYCLE" });
    if (visited.has(cursor)) break;
    visited.add(cursor);
    const current: { parentId: string | null } | null = await prisma.process.findFirst({ where: { id: cursor, organizationId, projectId, deletedAt: null }, select: { parentId: true } });
    cursor = current?.parentId ?? null;
  }
}

export async function registerProjectRoutes(app: FastifyInstance) {
  app.get("/api/v1/projects", { preHandler: authenticate }, async (request) => {
    const organizationId = requireOrg(request); requirePermission(request, "projects.read"); const q = pageParams(request.query);
    const organization = await prisma.organization.findUnique({ where: { id: organizationId }, select: { defaultLocale: true } });
    if (!organization) throw Object.assign(new Error("Organization not found"), { statusCode: 404, code: "NOT_FOUND" });
    await ensureDefaultProject(prisma, organizationId, organization.defaultLocale === "en" ? "en" : "fa");
    const where = { organizationId, deletedAt: null, ...(q.search ? { OR: [{ name: { contains: q.search } }, { code: { contains: q.search } }] } : {}) };
    const [data, total] = await Promise.all([prisma.project.findMany({ where, skip: (q.page - 1) * q.limit, take: q.limit, orderBy: { updatedAt: "desc" } }), prisma.project.count({ where })]);
    return envelope(data, { ...q, total });
  });
  app.post("/api/v1/projects", { preHandler: authenticate }, async (request, reply) => { const organizationId = requireOrg(request); requirePermission(request, "projects.manage"); const body = parse(projectCreateBody, request.body); const created = await createProject(organizationId, body); await audit(request, "PROJECT_CREATE", "Project", created.project.id); if (created.processId) await audit(request, "PROCESS_CREATE", "Process", created.processId); if (created.activityId) await audit(request, "ACTIVITY_CREATE", "Activity", created.activityId); return reply.code(201).send(envelope(created.project)); });
  app.get("/api/v1/projects/:id", { preHandler: authenticate }, async (request) => { const organizationId = requireOrg(request); requirePermission(request, "projects.read"); const { id } = parse(z.object({ id: z.string().uuid() }), request.params); const project = await prisma.project.findFirst({ where: { id, organizationId, deletedAt: null }, include: { processes: { where: { deletedAt: null } }, activities: { where: { deletedAt: null } } } }); if (!project) throw Object.assign(new Error("Project not found"), { statusCode: 404, code: "NOT_FOUND" }); return envelope(project); });
  app.patch("/api/v1/projects/:id", { preHandler: authenticate }, async (request) => { const organizationId = requireOrg(request); requirePermission(request, "projects.manage"); const { id } = parse(z.object({ id: z.string().uuid() }), request.params); await ensureProject(id, organizationId); const body = parse(projectBody.partial(), request.body); const project = await prisma.project.update({ where: { id }, data: body }); await audit(request, "PROJECT_UPDATE", "Project", id, body); return envelope(project); });
  app.delete("/api/v1/projects/:id", { preHandler: authenticate }, async (request) => { const organizationId = requireOrg(request); requirePermission(request, "projects.manage"); const { id } = parse(z.object({ id: z.string().uuid() }), request.params); const project = await ensureProject(id, organizationId); if (project.code === DEFAULT_PROJECT_CODE) throw defaultProjectDeletionError(); await prisma.project.update({ where: { id }, data: { deletedAt: new Date(), status: "ARCHIVED" } }); await audit(request, "PROJECT_DELETE", "Project", id); return envelope({ success: true }); });

  app.get("/api/v1/processes", { preHandler: authenticate }, async (request) => { const organizationId = requireOrg(request); requirePermission(request, "projects.read"); const q = parse(z.object({ projectId: z.string().uuid().optional() }), request.query); if (q.projectId) await ensureProject(q.projectId, organizationId); return envelope(await prisma.process.findMany({ where: { organizationId, deletedAt: null, ...(q.projectId ? { projectId: q.projectId } : {}) }, orderBy: { updatedAt: "desc" } })); });
  app.post("/api/v1/processes", { preHandler: authenticate }, async (request, reply) => { const organizationId = requireOrg(request); requirePermission(request, "projects.manage"); const body = parse(processBody, request.body); await ensureProject(body.projectId, organizationId); await validateProcessHierarchy("", body.parentId, organizationId, body.projectId); const process = await prisma.process.create({ data: { organizationId, ...body } }); await audit(request, "PROCESS_CREATE", "Process", process.id); return reply.code(201).send(envelope(process)); });
  app.patch("/api/v1/processes/:id", { preHandler: authenticate }, async (request) => { const organizationId = requireOrg(request); requirePermission(request, "projects.manage"); const { id } = parse(z.object({ id: z.string().uuid() }), request.params); const existing = await prisma.process.findFirst({ where: { id, organizationId, deletedAt: null } }); if (!existing) throw Object.assign(new Error("Process not found"), { statusCode: 404, code: "NOT_FOUND" }); const body = parse(processBody.partial(), request.body); const projectId = body.projectId ?? existing.projectId; await ensureProject(projectId, organizationId); await validateProcessHierarchy(id, body.parentId === undefined ? existing.parentId : body.parentId, organizationId, projectId); if (body.projectId && body.projectId !== existing.projectId) { const children = await prisma.process.count({ where: { parentId: id, deletedAt: null } }); const activities = await prisma.activity.count({ where: { processId: id, deletedAt: null } }); if (children || activities) throw Object.assign(new Error("Move child processes and activities before changing the project"), { statusCode: 409, code: "PROCESS_HAS_DEPENDENCIES" }); } const updated = await prisma.process.update({ where: { id }, data: body }); await audit(request, "PROCESS_UPDATE", "Process", id, body); return envelope(updated); });
  app.delete("/api/v1/processes/:id", { preHandler: authenticate }, async (request) => { const organizationId = requireOrg(request); requirePermission(request, "projects.manage"); const { id } = parse(z.object({ id: z.string().uuid() }), request.params); const existing = await prisma.process.findFirst({ where: { id, organizationId, deletedAt: null } }); if (!existing) throw Object.assign(new Error("Process not found"), { statusCode: 404, code: "NOT_FOUND" }); const children = await prisma.process.count({ where: { parentId: id, deletedAt: null } }); const activities = await prisma.activity.count({ where: { processId: id, deletedAt: null } }); if (children || activities) throw Object.assign(new Error("This process has child processes or activities"), { statusCode: 409, code: "PROCESS_HAS_DEPENDENCIES" }); await prisma.process.update({ where: { id }, data: { deletedAt: new Date() } }); await audit(request, "PROCESS_DELETE", "Process", id); return envelope({ success: true }); });

  app.get("/api/v1/activities", { preHandler: authenticate }, async (request) => { const organizationId = requireOrg(request); requirePermission(request, "projects.read"); const q = parse(z.object({ projectId: z.string().uuid().optional(), processId: z.string().uuid().optional() }), request.query); if (q.projectId) await ensureProject(q.projectId, organizationId); return envelope(await prisma.activity.findMany({ where: { organizationId, deletedAt: null, ...(q.projectId ? { projectId: q.projectId } : {}), ...(q.processId ? { processId: q.processId } : {}) }, orderBy: { updatedAt: "desc" } })); });
  app.post("/api/v1/activities", { preHandler: authenticate }, async (request, reply) => { const organizationId = requireOrg(request); requirePermission(request, "projects.manage"); const body = parse(activityBody, request.body); await ensureProject(body.projectId, organizationId); if (body.processId) await ensureProcess(body.processId, organizationId, body.projectId); const activity = await prisma.activity.create({ data: { organizationId, ...body } }); await audit(request, "ACTIVITY_CREATE", "Activity", activity.id); return reply.code(201).send(envelope(activity)); });
  app.patch("/api/v1/activities/:id", { preHandler: authenticate }, async (request) => { const organizationId = requireOrg(request); requirePermission(request, "projects.manage"); const { id } = parse(z.object({ id: z.string().uuid() }), request.params); const existing = await prisma.activity.findFirst({ where: { id, organizationId, deletedAt: null } }); if (!existing) throw Object.assign(new Error("Activity not found"), { statusCode: 404, code: "NOT_FOUND" }); const body = parse(activityBody.partial(), request.body); const projectId = body.projectId ?? existing.projectId; await ensureProject(projectId, organizationId); const processId = body.processId === undefined ? existing.processId : body.processId; if (processId) await ensureProcess(processId, organizationId, projectId); const updated = await prisma.activity.update({ where: { id }, data: body }); await audit(request, "ACTIVITY_UPDATE", "Activity", id, body); return envelope(updated); });
  app.delete("/api/v1/activities/:id", { preHandler: authenticate }, async (request) => { const organizationId = requireOrg(request); requirePermission(request, "projects.manage"); const { id } = parse(z.object({ id: z.string().uuid() }), request.params); const existing = await prisma.activity.findFirst({ where: { id, organizationId, deletedAt: null } }); if (!existing) throw Object.assign(new Error("Activity not found"), { statusCode: 404, code: "NOT_FOUND" }); const assessments = await prisma.fmeaAssessment.count({ where: { activityId: id, deletedAt: null } }) + await prisma.rulaAssessment.count({ where: { activityId: id, status: { not: "ARCHIVED" } } }); if (assessments) throw Object.assign(new Error("This activity is used by an assessment"), { statusCode: 409, code: "ACTIVITY_HAS_ASSESSMENTS" }); await prisma.activity.update({ where: { id }, data: { deletedAt: new Date() } }); await audit(request, "ACTIVITY_DELETE", "Activity", id); return envelope({ success: true }); });
}
