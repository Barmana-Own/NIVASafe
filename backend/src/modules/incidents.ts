import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { authenticate } from "../auth-guard.js";
import { audit, envelope, parse, prisma, requireOrg } from "../core.js";

const incidentKinds = ["INCIDENT", "NEAR_MISS"] as const;
const incidentStatuses = ["REPORTED", "UNDER_REVIEW", "CLOSED"] as const;
const managerRoles = ["SUPER_ADMIN", "ORG_ADMIN", "HSE_MANAGER"];
const idParams = z.object({ id: z.string().uuid() });
const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(incidentStatuses).optional(),
});
const createReport = z.object({
  kind: z.enum(incidentKinds),
  occurredAt: z.string().datetime({ offset: true }).transform((value) => new Date(value)),
  projectId: z.string().uuid().nullable().optional(),
  location: z.string().trim().min(2).max(191),
  summary: z.string().trim().min(3).max(191),
  description: z.string().trim().min(10).max(10_000),
}).strict();
const statusUpdate = z.object({ status: z.enum(incidentStatuses) }).strict();

function isIncidentManager(request: FastifyRequest) {
  return managerRoles.includes(request.actor?.role ?? "");
}

function requireIncidentManager(request: FastifyRequest) {
  if (!isIncidentManager(request)) throw Object.assign(new Error("Incident review access is required"), { statusCode: 403, code: "FORBIDDEN" });
}

function canTransition(from: string, to: string) {
  const transitions: Record<string, readonly string[]> = {
    REPORTED: ["UNDER_REVIEW", "CLOSED"],
    UNDER_REVIEW: ["REPORTED", "CLOSED"],
    CLOSED: ["UNDER_REVIEW"],
  };
  return from === to || transitions[from]?.includes(to) === true;
}

const incidentIncludes = {
  reporter: { select: { id: true, displayName: true } },
  project: { select: { id: true, name: true } },
};

export async function registerIncidentRoutes(app: FastifyInstance) {
  app.get("/api/v1/incidents", { preHandler: authenticate }, async (request) => {
    const organizationId = requireOrg(request);
    const query = parse(listQuery, request.query);
    const where = {
      organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(!isIncidentManager(request) ? { reporterId: request.actor!.userId } : {}),
    };
    const [data, total] = await Promise.all([
      prisma.incidentReport.findMany({
        where,
        include: incidentIncludes,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      }),
      prisma.incidentReport.count({ where }),
    ]);
    return envelope(data, { page: query.page, limit: query.limit, total });
  });

  app.post("/api/v1/incidents", { preHandler: authenticate }, async (request, reply) => {
    const organizationId = requireOrg(request);
    const body = parse(createReport, request.body);
    if (body.projectId) {
      const project = await prisma.project.findFirst({ where: { id: body.projectId, organizationId, deletedAt: null }, select: { id: true } });
      if (!project) throw Object.assign(new Error("Project not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    const item = await prisma.incidentReport.create({ data: {
      organizationId,
      reporterId: request.actor!.userId,
      ...body,
      status: "REPORTED",
    } });
    await audit(request, "INCIDENT_REPORT_CREATE", "IncidentReport", item.id, { kind: body.kind });
    return reply.code(201).send(envelope(item));
  });

  app.get("/api/v1/incidents/:id", { preHandler: authenticate }, async (request) => {
    const organizationId = requireOrg(request);
    const { id } = parse(idParams, request.params);
    const item = await prisma.incidentReport.findFirst({
      where: { id, organizationId, ...(!isIncidentManager(request) ? { reporterId: request.actor!.userId } : {}) },
      include: incidentIncludes,
    });
    if (!item) throw Object.assign(new Error("Incident report not found"), { statusCode: 404, code: "NOT_FOUND" });
    return envelope(item);
  });

  app.patch("/api/v1/incidents/:id", { preHandler: authenticate }, async (request) => {
    requireIncidentManager(request);
    const organizationId = requireOrg(request);
    const { id } = parse(idParams, request.params);
    const { status } = parse(statusUpdate, request.body);
    const existing = await prisma.incidentReport.findFirst({ where: { id, organizationId }, select: { id: true, status: true } });
    if (!existing) throw Object.assign(new Error("Incident report not found"), { statusCode: 404, code: "NOT_FOUND" });
    if (!canTransition(existing.status, status)) throw Object.assign(new Error("Invalid incident status transition"), { statusCode: 409, code: "INVALID_STATUS_TRANSITION" });
    if (existing.status === status) return envelope(existing);
    const item = await prisma.incidentReport.update({ where: { id }, data: {
      status,
      reviewedById: status === "REPORTED" ? null : request.actor!.userId,
      reviewedAt: status === "REPORTED" ? null : new Date(),
    } });
    await audit(request, "INCIDENT_REPORT_STATUS", "IncidentReport", id, { status });
    return envelope(item);
  });
}
