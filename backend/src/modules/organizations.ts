import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { SUBSCRIPTION_PLANS, type SubscriptionPlan } from "@nivasafe/domain";
import { authenticate } from "../auth-guard.js";
import { audit, envelope, parse, prisma, requireOrg, requirePermission } from "../core.js";
import { createSubscriptionFields } from "../subscription.js";

const organizationFields = {
  nameFa: z.string().min(2), nameEn: z.string().min(2), nationalId: z.string().max(50).nullable().optional(),
  industry: z.string().max(120).nullable().optional(), employeeCount: z.number().int().min(0).max(10_000_000).nullable().optional(), timezone: z.string().max(80).optional(), defaultLocale: z.enum(["fa", "en"]).optional(),
  riskMedium: z.number().int().min(1).max(1000).optional(), riskHigh: z.number().int().min(1).max(1000).optional(), riskCritical: z.number().int().min(1).max(1000).optional(),
};
const organizationCreateSchema = z.object({ ...organizationFields, subscriptionPlan: z.enum(SUBSCRIPTION_PLANS.map((plan) => plan.id) as [SubscriptionPlan, ...SubscriptionPlan[]]).default("STARTER") });
const organizationUpdateSchema = z.object(organizationFields);
const organizationStatusSchema = z.object({ active: z.boolean(), confirmation: z.enum(["ACTIVATE", "DEACTIVATE"]) });

export async function registerOrganizationRoutes(app: FastifyInstance) {
  app.get("/api/v1/organizations", { preHandler: authenticate, config: { allowUnsubscribed: true } }, async (request) => envelope(await prisma.organization.findMany({ where: request.actor?.role === "SUPER_ADMIN" ? undefined : { members: { some: { userId: request.actor!.userId, active: true } } }, orderBy: { createdAt: "desc" } })));

  app.patch("/api/v1/organizations/:id/status", { preHandler: authenticate, config: { allowUnsubscribed: true } }, async (request) => {
    if (request.actor?.role !== "SUPER_ADMIN") throw Object.assign(new Error("Only a super administrator can change organization status"), { statusCode: 403, code: "FORBIDDEN" });
    const { id } = parse(z.object({ id: z.string().uuid() }), request.params);
    const body = parse(organizationStatusSchema, request.body);
    const expected = body.active ? "ACTIVATE" : "DEACTIVATE";
    if (body.confirmation !== expected) throw Object.assign(new Error("تأیید دو مرحله‌ای وضعیت سازمان نامعتبر است."), { statusCode: 400, code: "STATUS_CONFIRMATION_REQUIRED" });
    const organization = await prisma.organization.update({ where: { id }, data: { active: body.active } });
    await audit(request, body.active ? "ORGANIZATION_ACTIVATE" : "ORGANIZATION_DEACTIVATE", "Organization", id, { active: body.active });
    return envelope(organization);
  });

  app.post("/api/v1/organizations", { preHandler: authenticate }, async (request, reply) => {
    const body = parse(organizationCreateSchema, request.body);
    const { subscriptionPlan, ...organizationData } = body;
    const org = await prisma.organization.create({ data: { ...organizationData, ...createSubscriptionFields(subscriptionPlan, new Date(), process.env.NODE_ENV === "production"), members: { create: { userId: request.actor!.userId, role: "ORG_ADMIN" } }, projects: { create: { name: "پروژه پیش‌فرض", code: "DEFAULT", status: "ACTIVE", description: "پروژه اولیه برای شروع کار با NIVASafe" } } } });
    request.actor!.organizationId = org.id;
    request.actor!.role = "ORG_ADMIN";
    await audit(request, "ORGANIZATION_CREATE", "Organization", org.id);
    return reply.code(201).send(envelope(org));
  });

  app.get("/api/v1/organizations/current", { preHandler: authenticate, config: { allowUnsubscribed: true } }, async (request) => envelope(await prisma.organization.findUniqueOrThrow({ where: { id: requireOrg(request) } })));

  app.patch("/api/v1/organizations/current", { preHandler: authenticate }, async (request) => {
    const id = requireOrg(request); requirePermission(request, "organizations.manage");
    const body = parse(organizationUpdateSchema.partial(), request.body);
    const current = await prisma.organization.findUniqueOrThrow({ where: { id } });
    const medium = body.riskMedium ?? current.riskMedium;
    const high = body.riskHigh ?? current.riskHigh;
    const critical = body.riskCritical ?? current.riskCritical;
    if (!(medium < high && high < critical)) throw Object.assign(new Error("Risk thresholds must satisfy medium < high < critical"), { statusCode: 400, code: "RISK_THRESHOLD_ORDER" });
    const org = await prisma.organization.update({ where: { id }, data: body });
    await audit(request, "ORGANIZATION_UPDATE", "Organization", id, body);
    return envelope(org);
  });

  app.post("/api/v1/organizations/current/deactivate", { preHandler: authenticate }, async (request) => {
    const id = requireOrg(request); requirePermission(request, "organizations.manage");
    await prisma.organization.update({ where: { id }, data: { active: false } });
    await prisma.organizationMember.updateMany({ where: { organizationId: id }, data: { active: false } });
    await audit(request, "ORGANIZATION_DEACTIVATE", "Organization", id);
    return envelope({ success: true });
  });
}
