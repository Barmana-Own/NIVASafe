import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { envelope, parse, prisma } from "../core.js";
import { authenticateAccount } from "../auth-guard.js";
import { ACCOUNT_IMAGE_CONSENT_VERSION, imageConsentAuditData, readAccountImageConsent } from "../image-processing-consent.js";
import { registerPostureImageAuthorizationRoutes } from "./posture-image-authorizations.js";

const inputSchema = z.object({ accepted: z.boolean(), policyVersion: z.literal(ACCOUNT_IMAGE_CONSENT_VERSION) }).strict();

export async function registerImageProcessingConsentRoutes(app: FastifyInstance) {
  app.get("/api/v1/profile/image-processing-consent", { preHandler: authenticateAccount, config: { allowUnsubscribed: true } }, async (request, reply) => {
    reply.header("cache-control", "private, no-store");
    return envelope(await readAccountImageConsent(request.actor!.userId));
  });
  app.put("/api/v1/profile/image-processing-consent", { preHandler: authenticateAccount, config: { allowUnsubscribed: true, rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (request, reply) => {
    const body = parse(inputSchema, request.body), userId = request.actor!.userId;
    const row = await prisma.$transaction(async tx => {
      // Serialize changes for this user without changing the user or tenant data.
      await tx.$queryRaw`SELECT id FROM User WHERE id = ${userId} FOR UPDATE`;
      const previous = await readAccountImageConsent(userId, tx);
      const createdAt = new Date(Math.max(Date.now(), previous.changedAt ? Date.parse(previous.changedAt) + 1 : 0));
      return tx.auditLog.create({ data: imageConsentAuditData({ userId, accepted: body.accepted, source: "ACCOUNT", requestId: request.id, ipAddress: request.ip, userAgent: request.headers["user-agent"], createdAt }) });
    });
    reply.header("cache-control", "private, no-store");
    return envelope({ accepted: body.accepted, policyVersion: ACCOUNT_IMAGE_CONSENT_VERSION, recordId: body.accepted ? row.id : null, acceptedAt: body.accepted ? row.createdAt.toISOString() : null, changedAt: row.createdAt.toISOString() });
  });
  await registerPostureImageAuthorizationRoutes(app);
}
