import type { FastifyRequest } from "fastify";
import { prisma } from "./core.js";
import { subscriptionIsUsable } from "./subscription.js";

export async function authenticate(request: FastifyRequest) {
  let payload: { sub: string };
  try {
    payload = await request.jwtVerify<{ sub: string }>();
  } catch {
    throw Object.assign(new Error("Authentication or organization scope is invalid"), {
      statusCode: 401,
      code: "UNAUTHORIZED",
    });
  }
  const requestedOrg = request.headers["x-organization-id"]?.toString();
  const user = await prisma.user.findFirst({ where: { id: payload.sub, active: true }, select: { id: true, globalRole: true } });
  if (!user) throw Object.assign(new Error("Authentication or organization scope is invalid"), { statusCode: 401, code: "UNAUTHORIZED" });
  if (!requestedOrg) {
    request.actor = { userId: payload.sub, role: user.globalRole === "SUPER_ADMIN" ? "SUPER_ADMIN" : undefined, globalRole: user.globalRole };
    return;
  }
  if (user.globalRole === "SUPER_ADMIN") {
    const organization = await prisma.organization.findUnique({ where: { id: requestedOrg }, select: { active: true, subscriptionStatus: true, subscriptionExpiresAt: true } });
    if (!organization) throw Object.assign(new Error("Authentication or organization scope is invalid"), { statusCode: 401, code: "UNAUTHORIZED" });
    request.actor = { userId: payload.sub, organizationId: requestedOrg, role: "SUPER_ADMIN", globalRole: user.globalRole };
    return;
  }
  const membership = await prisma.organizationMember.findFirst({
    where: { organizationId: requestedOrg, userId: payload.sub, active: true, user: { active: true } },
    include: { user: { select: { globalRole: true } } },
  });
  if (!membership) throw Object.assign(new Error("Authentication or organization scope is invalid"), { statusCode: 401, code: "UNAUTHORIZED" });
  const organization = await prisma.organization.findUnique({ where: { id: requestedOrg }, select: { active: true, subscriptionStatus: true, subscriptionExpiresAt: true } });
  const routeConfig = request.routeOptions.config as { allowUnsubscribed?: boolean } | undefined;
  const globalRole = membership.user.globalRole;
  const role = globalRole === "SUPER_ADMIN" ? "SUPER_ADMIN" : membership.role;
  if (!organization) throw Object.assign(new Error("Authentication or organization scope is invalid"), { statusCode: 401, code: "UNAUTHORIZED" });
  if (!organization.active && role !== "SUPER_ADMIN") throw Object.assign(new Error("این شرکت موقتاً غیرفعال شده است."), { statusCode: 423, code: "ORGANIZATION_INACTIVE" });
  if (!routeConfig?.allowUnsubscribed && role !== "SUPER_ADMIN" && !subscriptionIsUsable(organization)) throw Object.assign(new Error("برای این شرکت اشتراک فعال لازم است."), { statusCode: 402, code: "SUBSCRIPTION_REQUIRED" });
  request.actor = { userId: payload.sub, organizationId: requestedOrg, role, globalRole };
}
