import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../auth-guard.js";
import { envelope, parse, requireOrg } from "../core.js";
import { ACCOUNT_IMAGE_CONSENT_VERSION } from "../image-processing-consent.js";
import { grantPostureImageAuthorization, listPostureImageAuthorizations, revokePostureImageAuthorization } from "../posture-image-authorizations.js";

const inputSchema = z.object({ recipientEmail: z.string().trim().toLowerCase().email().max(254), policyVersion: z.literal(ACCOUNT_IMAGE_CONSENT_VERSION), expiresInDays: z.number().int().min(1).max(90).default(30) }).strict();
export async function registerPostureImageAuthorizationRoutes(app: FastifyInstance) {
  app.get("/api/v1/profile/posture-image-authorizations", { preHandler: authenticate, config: { allowUnsubscribed: true } }, async (request, reply) => {
    const query = parse(z.object({ direction: z.enum(["issued", "received"]).default("issued") }).strict(), request.query);
    reply.header("cache-control", "private, no-store");
    return envelope(await listPostureImageAuthorizations(request.actor!.userId, requireOrg(request), query.direction));
  });
  app.post("/api/v1/profile/posture-image-authorizations", { preHandler: authenticate, config: { allowUnsubscribed: true, rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (request, reply) => {
    const body = parse(inputSchema, request.body);
    const grant = await grantPostureImageAuthorization(request, body, requireOrg(request));
    reply.header("cache-control", "private, no-store");
    return reply.code(201).send(envelope(grant));
  });
  app.delete("/api/v1/profile/posture-image-authorizations/:id", { preHandler: authenticate, config: { allowUnsubscribed: true, rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (request, reply) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), request.params);
    const result = await revokePostureImageAuthorization(request, id, requireOrg(request));
    reply.header("cache-control", "private, no-store");
    return envelope(result);
  });
}
