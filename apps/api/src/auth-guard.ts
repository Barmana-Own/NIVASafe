import type { FastifyRequest } from "fastify";
import { prisma } from "./core.js";

export async function authenticate(request: FastifyRequest) {
  try {
    const payload = await request.jwtVerify<{ sub: string }>();
    const requestedOrg = request.headers["x-organization-id"]?.toString();
    if (!requestedOrg) {
      const user = await prisma.user.findFirst({ where: { id: payload.sub, active: true }, select: { id: true } });
      if (!user) throw new Error("User is inactive");
      request.actor = { userId: payload.sub };
      return;
    }
    const membership = await prisma.organizationMember.findFirst({
      where: { organizationId: requestedOrg, userId: payload.sub, active: true, user: { active: true } },
    });
    if (!membership) throw new Error("Tenant access denied");
    request.actor = { userId: payload.sub, organizationId: requestedOrg, role: membership.role };
  } catch {
    throw Object.assign(new Error("Authentication or organization scope is invalid"), {
      statusCode: 401,
      code: "UNAUTHORIZED",
    });
  }
}
