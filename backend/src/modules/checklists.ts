import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { authenticate } from "../auth-guard.js";
import { audit, envelope, pageParams, parse, prisma, requireOrg } from "../core.js";

const managerRoles = ["SUPER_ADMIN", "ORG_ADMIN", "HSE_MANAGER"];
const inspectorRoles = [...managerRoles, "HSE_SPECIALIST", "HSE_OFFICER", "EXTERNAL_AUDITOR", "ASSESSOR"];
const idParams = z.object({ id: z.string().uuid() });
const itemDraft = z.object({ label: z.string().trim().min(2).max(191), required: z.boolean().default(true) }).strict();
const createTemplate = z.object({
  title: z.string().trim().min(3).max(191),
  description: z.string().trim().max(4_000).nullable().optional(),
  items: z.array(itemDraft).min(1).max(100),
}).strict();
const newVersion = z.object({
  title: z.string().trim().min(3).max(191).optional(),
  description: z.string().trim().max(4_000).nullable().optional(),
  items: z.array(itemDraft).min(1).max(100).optional(),
}).strict().refine((body) => body.title !== undefined || body.description !== undefined || body.items !== undefined, { message: "At least one template field is required" });
const createInspection = z.object({ templateId: z.string().uuid(), projectId: z.string().uuid().nullable().optional(), assignedToId: z.string().uuid().optional() }).strict();
const itemSnapshot = z.object({ id: z.string().uuid(), label: z.string(), required: z.boolean() });
const templateSnapshot = z.object({ templateId: z.string().uuid(), version: z.number().int().positive(), title: z.string(), items: z.array(itemSnapshot).min(1).max(100) });
const answer = z.object({ itemId: z.string().uuid(), result: z.enum(["PASS", "FAIL", "NOT_APPLICABLE"]), note: z.string().trim().max(4_000).optional() }).strict();
const answerUpdate = z.object({ answers: z.array(answer).max(100) }).strict();
const reviewBody = z.object({ decision: z.enum(["APPROVED", "NEEDS_REVISION"]), note: z.string().trim().max(4_000).optional() }).strict();
const templateQuery = z.object({ status: z.enum(["DRAFT", "PUBLISHED", "SUPERSEDED"]).optional() });
const inspectionQuery = z.object({ status: z.enum(["IN_PROGRESS", "SUBMITTED", "APPROVED", "NEEDS_REVISION"]).optional() });

function isChecklistManager(request: FastifyRequest) {
  return managerRoles.includes(request.actor?.role ?? "");
}

function requireChecklistManager(request: FastifyRequest) {
  if (!isChecklistManager(request)) throw Object.assign(new Error("Checklist template or review access is required"), { statusCode: 403, code: "FORBIDDEN" });
}

function requireInspector(request: FastifyRequest) {
  if (!inspectorRoles.includes(request.actor?.role ?? "")) throw Object.assign(new Error("Checklist inspection access is required"), { statusCode: 403, code: "FORBIDDEN" });
}

function normalizeItems(items: z.infer<typeof itemDraft>[]) {
  return items.map((item) => ({ id: randomUUID(), label: item.label, required: item.required }));
}

function jsonValue(value: unknown) {
  return value as Prisma.InputJsonValue;
}

async function getInspection(request: FastifyRequest, id: string, organizationId: string) {
  const item = await prisma.checklistInspection.findFirst({
    where: {
      id,
      organizationId,
      ...(!isChecklistManager(request) ? { OR: [{ assignedToId: request.actor!.userId }, { startedById: request.actor!.userId }] } : {}),
    },
  });
  if (!item) throw Object.assign(new Error("Checklist inspection not found"), { statusCode: 404, code: "NOT_FOUND" });
  return item;
}

function validateAnswers(snapshotValue: unknown, answers: z.infer<typeof answer>[], requireRequired: boolean) {
  const snapshot = templateSnapshot.safeParse(snapshotValue);
  if (!snapshot.success) throw Object.assign(new Error("Inspection template snapshot is invalid"), { statusCode: 409, code: "INVALID_TEMPLATE_SNAPSHOT" });
  const allowed = new Map(snapshot.data.items.map((item) => [item.id, item]));
  const seen = new Set<string>();
  for (const itemAnswer of answers) {
    const item = allowed.get(itemAnswer.itemId);
    if (!item || seen.has(itemAnswer.itemId)) throw Object.assign(new Error("Checklist answers contain an unknown or repeated item"), { statusCode: 400, code: "INVALID_CHECKLIST_ANSWER" });
    if (itemAnswer.result === "FAIL" && !itemAnswer.note?.trim()) throw Object.assign(new Error("Add a note for each failed checklist item"), { statusCode: 400, code: "CHECKLIST_FINDING_NOTE_REQUIRED" });
    seen.add(itemAnswer.itemId);
  }
  if (requireRequired && snapshot.data.items.some((item) => item.required && !seen.has(item.id))) {
    throw Object.assign(new Error("Complete every required checklist item before submitting"), { statusCode: 400, code: "CHECKLIST_REQUIRED_ITEMS_MISSING" });
  }
}

export async function registerChecklistRoutes(app: FastifyInstance) {
  app.get("/api/v1/checklists/templates", { preHandler: authenticate }, async (request) => {
    const organizationId = requireOrg(request);
    const pagination = pageParams(request.query);
    const query = parse(templateQuery, request.query);
    const where = {
      organizationId,
      ...(isChecklistManager(request) ? (query.status ? { status: query.status } : {}) : { status: "PUBLISHED" }),
      ...(pagination.search ? { title: { contains: pagination.search } } : {}),
    };
    const [data, total] = await Promise.all([
      prisma.checklistTemplate.findMany({ where, skip: (pagination.page - 1) * pagination.limit, take: pagination.limit, orderBy: [{ title: "asc" }, { version: "desc" }] }),
      prisma.checklistTemplate.count({ where }),
    ]);
    return envelope(data, { page: pagination.page, limit: pagination.limit, total });
  });

  app.post("/api/v1/checklists/templates", { preHandler: authenticate }, async (request, reply) => {
    requireChecklistManager(request);
    const organizationId = requireOrg(request);
    const body = parse(createTemplate, request.body);
    const item = await prisma.checklistTemplate.create({ data: {
      organizationId,
      familyId: randomUUID(),
      version: 1,
      title: body.title,
      description: body.description,
      items: jsonValue(normalizeItems(body.items)),
      status: "DRAFT",
      createdById: request.actor!.userId,
    } });
    await audit(request, "CHECKLIST_TEMPLATE_CREATE", "ChecklistTemplate", item.id, { version: item.version, itemCount: body.items.length });
    return reply.code(201).send(envelope(item));
  });

  app.post("/api/v1/checklists/templates/:id/versions", { preHandler: authenticate }, async (request, reply) => {
    requireChecklistManager(request);
    const organizationId = requireOrg(request);
    const { id } = parse(idParams, request.params);
    const body = parse(newVersion, request.body);
    const source = await prisma.checklistTemplate.findFirst({ where: { id, organizationId, status: "PUBLISHED" } });
    if (!source) throw Object.assign(new Error("Published checklist template not found"), { statusCode: 404, code: "NOT_FOUND" });
    const latest = await prisma.checklistTemplate.findFirst({ where: { organizationId, familyId: source.familyId }, orderBy: { version: "desc" }, select: { version: true } });
    const items = body.items ? normalizeItems(body.items) : source.items;
    const item = await prisma.checklistTemplate.create({ data: {
      organizationId,
      familyId: source.familyId,
      version: (latest?.version ?? source.version) + 1,
      title: body.title ?? source.title,
      description: body.description === undefined ? source.description : body.description,
      items: jsonValue(items),
      status: "DRAFT",
      createdById: request.actor!.userId,
    } });
    await audit(request, "CHECKLIST_TEMPLATE_VERSION_CREATE", "ChecklistTemplate", item.id, { version: item.version });
    return reply.code(201).send(envelope(item));
  });

  app.patch("/api/v1/checklists/templates/:id", { preHandler: authenticate }, async (request) => {
    requireChecklistManager(request);
    const organizationId = requireOrg(request);
    const { id } = parse(idParams, request.params);
    const body = parse(newVersion, request.body);
    const existing = await prisma.checklistTemplate.findFirst({ where: { id, organizationId } });
    if (!existing) throw Object.assign(new Error("Checklist template not found"), { statusCode: 404, code: "NOT_FOUND" });
    if (existing.status !== "DRAFT") throw Object.assign(new Error("Only a draft checklist template can be edited"), { statusCode: 409, code: "INVALID_TEMPLATE_STATE" });
    const latest = await prisma.checklistTemplate.findFirst({ where: { organizationId, familyId: existing.familyId }, orderBy: { version: "desc" }, select: { version: true } });
    if (latest && latest.version !== existing.version) throw Object.assign(new Error("Only the latest checklist template version can be edited"), { statusCode: 409, code: "STALE_TEMPLATE_VERSION" });
    const item = await prisma.checklistTemplate.update({ where: { id }, data: {
      ...(body.title === undefined ? {} : { title: body.title }),
      ...(body.description === undefined ? {} : { description: body.description }),
      ...(body.items === undefined ? {} : { items: jsonValue(normalizeItems(body.items)) }),
    } });
    await audit(request, "CHECKLIST_TEMPLATE_UPDATE", "ChecklistTemplate", id, { version: item.version, changedItems: body.items !== undefined });
    return envelope(item);
  });

  app.post("/api/v1/checklists/templates/:id/publish", { preHandler: authenticate }, async (request) => {
    requireChecklistManager(request);
    const organizationId = requireOrg(request);
    const { id } = parse(idParams, request.params);
    parse(z.object({}).strict(), request.body ?? {});
    const existing = await prisma.checklistTemplate.findFirst({ where: { id, organizationId } });
    if (!existing) throw Object.assign(new Error("Checklist template not found"), { statusCode: 404, code: "NOT_FOUND" });
    if (existing.status === "PUBLISHED") return envelope(existing);
    if (existing.status !== "DRAFT") throw Object.assign(new Error("Only a draft checklist template can be published"), { statusCode: 409, code: "INVALID_TEMPLATE_STATE" });
    const latest = await prisma.checklistTemplate.findFirst({ where: { organizationId, familyId: existing.familyId }, orderBy: { version: "desc" }, select: { version: true } });
    if (latest && latest.version !== existing.version) throw Object.assign(new Error("Publish the latest checklist template version"), { statusCode: 409, code: "STALE_TEMPLATE_VERSION" });
    const item = await prisma.$transaction(async (tx) => {
      await tx.checklistTemplate.updateMany({ where: { organizationId, familyId: existing.familyId, status: "PUBLISHED", id: { not: id } }, data: { status: "SUPERSEDED" } });
      return tx.checklistTemplate.update({ where: { id }, data: { status: "PUBLISHED", publishedAt: new Date() } });
    });
    await audit(request, "CHECKLIST_TEMPLATE_PUBLISH", "ChecklistTemplate", id, { version: item.version });
    return envelope(item);
  });

  app.get("/api/v1/checklists/inspections", { preHandler: authenticate }, async (request) => {
    const organizationId = requireOrg(request);
    requireInspector(request);
    const pagination = pageParams(request.query);
    const query = parse(inspectionQuery, request.query);
    const where = {
      organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(!isChecklistManager(request) ? { OR: [{ assignedToId: request.actor!.userId }, { startedById: request.actor!.userId }] } : {}),
    };
    const [data, total] = await Promise.all([
      prisma.checklistInspection.findMany({ where, skip: (pagination.page - 1) * pagination.limit, take: pagination.limit, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }),
      prisma.checklistInspection.count({ where }),
    ]);
    return envelope(data, { page: pagination.page, limit: pagination.limit, total });
  });

  app.post("/api/v1/checklists/inspections", { preHandler: authenticate }, async (request, reply) => {
    requireInspector(request);
    const organizationId = requireOrg(request);
    const body = parse(createInspection, request.body);
    const template = await prisma.checklistTemplate.findFirst({ where: { id: body.templateId, organizationId, status: "PUBLISHED" } });
    if (!template) throw Object.assign(new Error("Published checklist template not found"), { statusCode: 404, code: "NOT_FOUND" });
    if (body.projectId) {
      const project = await prisma.project.findFirst({ where: { id: body.projectId, organizationId, deletedAt: null }, select: { id: true } });
      if (!project) throw Object.assign(new Error("Project not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    const assignedToId = body.assignedToId ?? request.actor!.userId;
    if (assignedToId !== request.actor!.userId) {
      requireChecklistManager(request);
      const member = await prisma.organizationMember.findFirst({ where: { organizationId, userId: assignedToId, active: true }, select: { id: true } });
      if (!member) throw Object.assign(new Error("Active organization member not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    const questions = itemSnapshot.array().safeParse(template.items);
    if (!questions.success) throw Object.assign(new Error("Published checklist template has invalid items"), { statusCode: 409, code: "INVALID_TEMPLATE" });
    const snapshot = { templateId: template.id, version: template.version, title: template.title, items: questions.data };
    const item = await prisma.checklistInspection.create({ data: {
      organizationId,
      templateId: template.id,
      templateVersion: template.version,
      projectId: body.projectId ?? null,
      assignedToId,
      startedById: request.actor!.userId,
      status: "IN_PROGRESS",
      templateSnapshot: jsonValue(snapshot),
      answers: jsonValue([]),
    } });
    await audit(request, "CHECKLIST_INSPECTION_CREATE", "ChecklistInspection", item.id, { templateVersion: template.version });
    return reply.code(201).send(envelope(item));
  });

  app.get("/api/v1/checklists/inspections/:id", { preHandler: authenticate }, async (request) => {
    requireInspector(request);
    const organizationId = requireOrg(request);
    const { id } = parse(idParams, request.params);
    return envelope(await getInspection(request, id, organizationId));
  });

  app.patch("/api/v1/checklists/inspections/:id", { preHandler: authenticate }, async (request) => {
    requireInspector(request);
    const organizationId = requireOrg(request);
    const { id } = parse(idParams, request.params);
    const body = parse(answerUpdate, request.body);
    const existing = await getInspection(request, id, organizationId);
    if (!isChecklistManager(request) && existing.assignedToId !== request.actor!.userId) throw Object.assign(new Error("Checklist inspection not found"), { statusCode: 404, code: "NOT_FOUND" });
    if (!["IN_PROGRESS", "NEEDS_REVISION"].includes(existing.status)) throw Object.assign(new Error("This checklist inspection cannot be edited in its current state"), { statusCode: 409, code: "INVALID_INSPECTION_STATE" });
    validateAnswers(existing.templateSnapshot, body.answers, false);
    const item = await prisma.checklistInspection.update({ where: { id }, data: { answers: jsonValue(body.answers) } });
    await audit(request, "CHECKLIST_INSPECTION_UPDATE", "ChecklistInspection", id, { answerCount: body.answers.length });
    return envelope(item);
  });

  app.post("/api/v1/checklists/inspections/:id/submit", { preHandler: authenticate }, async (request) => {
    requireInspector(request);
    const organizationId = requireOrg(request);
    const { id } = parse(idParams, request.params);
    parse(z.object({}).strict(), request.body ?? {});
    const existing = await getInspection(request, id, organizationId);
    if (!isChecklistManager(request) && existing.assignedToId !== request.actor!.userId) throw Object.assign(new Error("Checklist inspection not found"), { statusCode: 404, code: "NOT_FOUND" });
    if (!["IN_PROGRESS", "NEEDS_REVISION"].includes(existing.status)) throw Object.assign(new Error("This checklist inspection cannot be submitted in its current state"), { statusCode: 409, code: "INVALID_INSPECTION_STATE" });
    const answers = parse(z.array(answer).max(100), existing.answers);
    validateAnswers(existing.templateSnapshot, answers, true);
    const item = await prisma.checklistInspection.update({ where: { id }, data: { status: "SUBMITTED", submittedAt: new Date(), reviewDecision: null, reviewedById: null, reviewedAt: null } });
    await audit(request, "CHECKLIST_INSPECTION_SUBMIT", "ChecklistInspection", id, { answerCount: answers.length, findingCount: answers.filter((entry) => entry.result === "FAIL").length });
    return envelope(item);
  });

  app.post("/api/v1/checklists/inspections/:id/review", { preHandler: authenticate }, async (request) => {
    requireChecklistManager(request);
    const organizationId = requireOrg(request);
    const { id } = parse(idParams, request.params);
    const body = parse(reviewBody, request.body);
    const existing = await prisma.checklistInspection.findFirst({ where: { id, organizationId } });
    if (!existing) throw Object.assign(new Error("Checklist inspection not found"), { statusCode: 404, code: "NOT_FOUND" });
    if (existing.status !== "SUBMITTED") throw Object.assign(new Error("Only a submitted inspection can be reviewed"), { statusCode: 409, code: "INVALID_INSPECTION_STATE" });
    const item = await prisma.checklistInspection.update({ where: { id }, data: {
      status: body.decision === "APPROVED" ? "APPROVED" : "NEEDS_REVISION",
      reviewDecision: body.decision,
      reviewNote: body.note ?? null,
      reviewedById: request.actor!.userId,
      reviewedAt: new Date(),
    } });
    await audit(request, "CHECKLIST_INSPECTION_REVIEW", "ChecklistInspection", id, { decision: body.decision });
    return envelope(item);
  });
}
