import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../auth-guard.js";
import { audit, envelope, parse, prisma, requireOrg, requirePermission } from "../core.js";

const organizationSchema = z.object({
  nameFa: z.string().min(2), nameEn: z.string().min(2), nationalId: z.string().max(50).nullable().optional(),
  industry: z.string().max(120).nullable().optional(), timezone: z.string().max(80).optional(), defaultLocale: z.enum(["fa", "en"]).optional(),
  riskMedium: z.number().int().min(1).max(1000).optional(), riskHigh: z.number().int().min(1).max(1000).optional(), riskCritical: z.number().int().min(1).max(1000).optional(),
});

export async function registerOrganizationRoutes(app: FastifyInstance) {
  app.get("/api/v1/organizations", { preHandler: authenticate }, async (request) => envelope(await prisma.organization.findMany({ where: { members: { some: { userId: request.actor!.userId, active: true } } }, orderBy: { createdAt: "desc" } })));

  app.post("/api/v1/organizations", { preHandler: authenticate }, async (request, reply) => {
    const body = parse(organizationSchema, request.body);
    const org = await prisma.organization.create({ data: { ...body, members: { create: { userId: request.actor!.userId, role: "ORG_ADMIN" } } } });
    request.actor!.organizationId = org.id;
    request.actor!.role = "ORG_ADMIN";
    await audit(request, "ORGANIZATION_CREATE", "Organization", org.id);
    return reply.code(201).send(envelope(org));
  });

  app.get("/api/v1/organizations/current", { preHandler: authenticate }, async (request) => envelope(await prisma.organization.findUniqueOrThrow({ where: { id: requireOrg(request) } })));

  app.patch("/api/v1/organizations/current", { preHandler: authenticate }, async (request) => {
    const id = requireOrg(request); requirePermission(request, "organizations.manage");
    const body = parse(organizationSchema.partial(), request.body);
    const current = await prisma.organization.findUniqueOrThrow({ where: { id } });
    const medium = body.riskMedium ?? current.riskMedium;
    const high = body.riskHigh ?? current.riskHigh;
    const critical = body.riskCritical ?? current.riskCritical;
    if (!(medium < high && high < critical)) throw Object.assign(new Error("Risk thresholds must satisfy medium < high < critical"), { statusCode: 400, code: "RISK_THRESHOLD_ORDER" });
    const org = await prisma.organization.update({ where: { id }, data: body });
    await audit(request, "ORGANIZATION_UPDATE", "Organization", id, body);
    return envelope(org);
  });
}
