import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { SUBSCRIPTION_PLANS, type SubscriptionPlan } from "@nivasafe/domain";
import { authenticate } from "../auth-guard.js";
import { audit, envelope, parse, prisma, requireOrg, requirePermission } from "../core.js";
import { activeSubscription } from "../subscription.js";
import { randomUUID } from "node:crypto";

const planSchema = z.object({ subscriptionPlan: z.enum(SUBSCRIPTION_PLANS.map((plan) => plan.id) as [SubscriptionPlan, ...SubscriptionPlan[]]).default("STARTER") });

function ensureSubscriptionAdmin(request: FastifyRequest) {
  const organizationId = requireOrg(request);
  requirePermission(request, "organizations.manage");
  return organizationId;
}

export async function registerSubscriptionRoutes(app: FastifyInstance) {
  app.get("/api/v1/organizations/current/subscription", { preHandler: authenticate, config: { allowUnsubscribed: true } }, async (request) => {
    const organizationId = requireOrg(request);
    const organization = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { id: true, nameFa: true, subscriptionPlan: true, subscriptionStatus: true, subscriptionProvider: true, subscriptionStartedAt: true, subscriptionExpiresAt: true, subscriptionExternalId: true } });
    return envelope(organization);
  });

  app.post("/api/v1/organizations/current/subscription/checkout", { preHandler: authenticate, config: { allowUnsubscribed: true } }, async (request) => {
    const organizationId = ensureSubscriptionAdmin(request);
    const body = parse(planSchema, request.body);
    const mode = process.env.SUBSCRIPTION_PAYMENT_MODE ?? (process.env.NODE_ENV === "production" ? "external" : "local");
    if (mode !== "local") throw Object.assign(new Error("درگاه پرداخت اشتراک پیکربندی نشده است."), { statusCode: 503, code: "PAYMENT_PROVIDER_NOT_CONFIGURED" });
    const subscription = await prisma.organization.update({ where: { id: organizationId }, data: activeSubscription(body.subscriptionPlan, new Date(), "local", `local_${randomUUID()}`), select: { id: true, nameFa: true, subscriptionPlan: true, subscriptionStatus: true, subscriptionProvider: true, subscriptionStartedAt: true, subscriptionExpiresAt: true, subscriptionExternalId: true } });
    await audit(request, "SUBSCRIPTION_ACTIVATED", "Organization", organizationId, { plan: body.subscriptionPlan, provider: "local" });
    return envelope({ ...subscription, payment: { mode: "local", status: "succeeded" } });
  });

  app.post("/api/v1/organizations/current/subscription/cancel", { preHandler: authenticate, config: { allowUnsubscribed: true } }, async (request) => {
    const organizationId = ensureSubscriptionAdmin(request);
    const subscription = await prisma.organization.update({ where: { id: organizationId }, data: { subscriptionStatus: "CANCELED", subscriptionExpiresAt: new Date() }, select: { id: true, nameFa: true, subscriptionPlan: true, subscriptionStatus: true, subscriptionProvider: true, subscriptionStartedAt: true, subscriptionExpiresAt: true, subscriptionExternalId: true } });
    await audit(request, "SUBSCRIPTION_CANCELED", "Organization", organizationId);
    return envelope(subscription);
  });
}
