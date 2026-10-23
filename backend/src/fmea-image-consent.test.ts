import Fastify from "fastify";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  user: { findFirst: vi.fn() },
  organizationMember: { findFirst: vi.fn() },
  organization: { findUnique: vi.fn() },
  auditLog: { findFirst: vi.fn() },
  audit: vi.fn(),
}));
const ai = vi.hoisted(() => ({ available: vi.fn(), supportsImages: vi.fn(), beforeTransfer: vi.fn(), send: vi.fn(), recordUsage: vi.fn() }));

vi.mock("./core.js", async original => ({ ...await original<typeof import("./core.js")>(), prisma: db, audit: db.audit }));
vi.mock("./ai-provider.js", () => {
  const provider = {
    name: "arvancloud", available: ai.available, supportsImages: ai.supportsImages,
    analyze: async (input: { beforeImageTransfer: () => Promise<void> }) => {
      await ai.beforeTransfer();
      await input.beforeImageTransfer();
      return ai.send(input);
    },
  };
  return { getAssessmentImageAIProvider: () => provider, getAvailableAssessmentAIProvider: () => provider, getRulaPostureImageAIProvider: () => provider };
});
vi.mock("./ai-usage.js", async original => ({ ...await original<typeof import("./ai-usage.js")>(), recordAIUsage: ai.recordUsage }));

import { ACCOUNT_IMAGE_CONSENT_VERSION, IMAGE_PROCESSING_PURPOSE } from "./image-processing-consent.js";
import { registerAssessmentRoutes } from "./modules/assessments.js";

const file = readFileSync(new URL("../../frontend/test-fixtures/rula-ai-synthetic.png", import.meta.url));
const analysis = {
  summary: "Synthetic equipment hazard review",
  riskRows: [{ failureMode: "Unprotected fixture", effect: "Hand injury", cause: "Missing enclosure", severity: 4, occurrence: 3, detection: 2 }],
  annotations: [],
};
function receipt(id = "consent-current", overrides: Record<string, unknown> = {}) {
  return {
    id, action: "IMAGE_PROCESSING_CONSENT_ACCEPTED", createdAt: new Date("2026-10-22T12:00:00Z"),
    metadata: { policyVersion: ACCOUNT_IMAGE_CONSENT_VERSION, provider: "arvancloud", purpose: IMAGE_PROCESSING_PURPOSE }, ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("FMEA_IMAGE_PRIVACY_APPROVED_PROVIDER", "arvancloud");
  vi.stubEnv("FMEA_IMAGE_VISION_SUPPORTED_PROVIDER", "arvancloud");
  db.user.findFirst.mockResolvedValue({ id: "user-a", globalRole: "USER", active: true, aiEnabled: true, aiTokenLimit: 10000, aiTokensUsed: 0 });
  db.organizationMember.findFirst.mockResolvedValue({ role: "ASSESSOR", user: { globalRole: "USER" } });
  db.organization.findUnique.mockResolvedValue({ active: true, subscriptionStatus: "ACTIVE", subscriptionExpiresAt: null });
  db.auditLog.findFirst.mockResolvedValue(receipt());
  db.audit.mockResolvedValue(undefined);
  ai.available.mockReturnValue(true);
  ai.supportsImages.mockReturnValue(true);
  ai.beforeTransfer.mockResolvedValue(undefined);
  ai.send.mockResolvedValue({ provider: "arvancloud", model: "GPT-5-Mini", answer: JSON.stringify(analysis), confidence: 0.8, citations: [], usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 } });
  ai.recordUsage.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllEnvs());

async function withApp(run: (app: ReturnType<typeof Fastify>) => Promise<void>) {
  const app = Fastify();
  await app.register(jwt, { secret: "fmea-consent-synthetic-jwt-key" });
  await app.register(multipart);
  app.setErrorHandler((error, request, reply) => {
    const failure = error as Error & { statusCode?: number; code?: string; retryable?: boolean };
    return reply.code(failure.statusCode ?? 500).send({ error: { code: failure.code ?? "INTERNAL_ERROR", requestId: request.id, ...(failure.retryable === undefined ? {} : { retryable: failure.retryable }) } });
  });
  await registerAssessmentRoutes(app);
  try { await run(app); } finally { await app.close(); }
}

function headers(app: ReturnType<typeof Fastify>) {
  return { authorization: `Bearer ${app.jwt.sign({ sub: "user-a" })}`, "x-organization-id": "org-a" };
}
function imageRequest(app: ReturnType<typeof Fastify>, image = file, mimeType = "image/png") {
  const boundary = "fmea-image-consent-synthetic";
  const fields = Object.entries({ jobTitle: "Synthetic equipment inspection", department: "Synthetic assembly", activityDescription: "Inspect fixtures and guarding.", locale: "en" })
    .map(([name, value]) => Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));
  return app.inject({
    method: "POST", url: "/api/v1/fmea/process-image-analysis", headers: { ...headers(app), "content-type": `multipart/form-data; boundary=${boundary}` },
    payload: Buffer.concat([...fields, Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="synthetic.png"\r\nContent-Type: ${mimeType}\r\n\r\n`), image, Buffer.from(`\r\n--${boundary}--\r\n`)]),
  });
}

describe("FMEA image consent and transfer boundary", () => {
  it("reports current consent readiness with a private no-store response", async () => withApp(async app => {
    const response = await app.inject({ url: "/api/v1/fmea/image-analysis-policy", headers: headers(app) });
    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(response.json().data).toMatchObject({ available: true, provider: "arvancloud", reasonCode: null, consentAccepted: true, consentVersion: ACCOUNT_IMAGE_CONSENT_VERSION });
    expect(ai.send).not.toHaveBeenCalled();
  }));

  it("returns consent guidance without pretending the provider is unavailable", async () => withApp(async app => {
    db.auditLog.findFirst.mockResolvedValue(null);
    const response = await app.inject({ url: "/api/v1/fmea/image-analysis-policy", headers: headers(app) });
    expect(response.statusCode).toBe(200);
    expect(response.json().data).toMatchObject({ available: false, reasonCode: "account-consent-required", consentAccepted: false });
  }));

  it.each(["missing", "withdrawn", "stale"])("rejects %s consent before any provider dispatch", async state => withApp(async app => {
    db.auditLog.findFirst.mockResolvedValue(state === "missing" ? null : state === "withdrawn" ? receipt("withdrawal", { action: "IMAGE_PROCESSING_CONSENT_WITHDRAWN" }) : receipt("stale", { metadata: { policyVersion: "image-processing-account-2026-10-22-v2", provider: "arvancloud", purpose: "rula-posture" } }));
    const response = await imageRequest(app);
    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe("IMAGE_PROCESSING_ACCOUNT_CONSENT_REQUIRED");
    expect(ai.beforeTransfer).not.toHaveBeenCalled();
    expect(ai.send).not.toHaveBeenCalled();
    expect(ai.recordUsage).not.toHaveBeenCalled();
  }));

  it("sends the real validated image only after a consent-bound audit and preserves parsed results and usage", async () => withApp(async app => {
    const response = await imageRequest(app);
    expect(response.statusCode).toBe(200);
    expect(response.json().data).toMatchObject({ summary: analysis.summary, riskRows: [expect.objectContaining(analysis.riskRows[0]!)], provider: "arvancloud", aiStatus: "connected" });
    expect(ai.send).toHaveBeenCalledOnce();
    expect(ai.send.mock.calls[0]![0]).toMatchObject({ organizationId: "org-a", userId: "user-a", imagePurpose: "fmea-process", image: { mimeType: "image/png", base64: file.toString("base64") }, beforeImageTransfer: expect.any(Function) });
    const transferAudit = db.audit.mock.calls.find(call => call[1] === "FMEA_IMAGE_TRANSFER_AUTHORIZED");
    expect(transferAudit?.[4]).toMatchObject({ purpose: "fmea-process", provider: "arvancloud", requestedModel: "GPT-5-Mini", imageSha256: createHash("sha256").update(file).digest("hex"), accountConsentVersion: ACCOUNT_IMAGE_CONSENT_VERSION, consentRecordId: "consent-current", consentSource: "ACCOUNT_POLICY" });
    expect(JSON.stringify(transferAudit?.[4])).not.toContain(file.toString("base64"));
    expect(JSON.stringify(transferAudit?.[4])).not.toContain("Synthetic equipment inspection");
    expect(db.audit.mock.invocationCallOrder[0]).toBeLessThan(ai.send.mock.invocationCallOrder[0]!);
    expect(ai.recordUsage).toHaveBeenCalledOnce();
  }));

  it("rechecks consent immediately before adapter dispatch", async () => withApp(async app => {
    ai.beforeTransfer.mockImplementation(() => { db.auditLog.findFirst.mockResolvedValue(null); });
    const response = await imageRequest(app);
    expect(response.statusCode).toBe(403);
    expect(response.json().error).toMatchObject({ code: "IMAGE_PROCESSING_ACCOUNT_CONSENT_REQUIRED", retryable: false });
    expect(ai.send).not.toHaveBeenCalled();
    expect(ai.recordUsage).not.toHaveBeenCalled();
  }));

  it("stops a withdrawal during mandatory pre-transfer audit", async () => withApp(async app => {
    db.audit.mockImplementation(async (_request, action) => { if (action === "FMEA_IMAGE_TRANSFER_AUTHORIZED") db.auditLog.findFirst.mockResolvedValue(null); });
    const response = await imageRequest(app);
    expect(response.statusCode).toBe(403);
    expect(response.json().error).toMatchObject({ code: "IMAGE_PROCESSING_ACCOUNT_CONSENT_REQUIRED", retryable: false });
    expect(ai.send).not.toHaveBeenCalled();
  }));

  it("requires the audited receipt to remain current after audit", async () => withApp(async app => {
    db.audit.mockImplementation(async (_request, action) => { if (action === "FMEA_IMAGE_TRANSFER_AUTHORIZED") db.auditLog.findFirst.mockResolvedValue(receipt("replacement-consent")); });
    const response = await imageRequest(app);
    expect(response.statusCode).toBe(403);
    expect(response.json().error).toMatchObject({ code: "IMAGE_TRANSFER_AUTHORIZATION_CHANGED", retryable: false });
    expect(ai.send).not.toHaveBeenCalled();
  }));

  it("fails closed when pre-transfer audit cannot be persisted", async () => withApp(async app => {
    db.audit.mockRejectedValue(new Error("Synthetic audit failure"));
    const response = await imageRequest(app);
    expect(response.statusCode).toBe(500);
    expect(response.json().error).toMatchObject({ code: "IMAGE_TRANSFER_AUDIT_FAILED", retryable: false });
    expect(ai.send).not.toHaveBeenCalled();
  }));

  it.each(["membership", "role", "quota", "organization"].flatMap(boundary => ["preparation", "audit"].map(phase => ({ boundary, phase }))))("rechecks $boundary access after $phase", async ({ boundary, phase }) => withApp(async app => {
    function revokeAccess() {
      if (boundary === "membership") db.organizationMember.findFirst.mockResolvedValue(null);
      if (boundary === "role") db.organizationMember.findFirst.mockResolvedValue({ role: "VIEWER", user: { globalRole: "USER" } });
      if (boundary === "quota") db.user.findFirst.mockResolvedValue({ id: "user-a", globalRole: "USER", active: true, aiEnabled: true, aiTokenLimit: 10000, aiTokensUsed: 10000 });
      if (boundary === "organization") db.organization.findUnique.mockResolvedValue({ active: false, subscriptionStatus: "ACTIVE", subscriptionExpiresAt: null });
    }
    if (phase === "preparation") ai.beforeTransfer.mockImplementation(revokeAccess);
    else db.audit.mockImplementation(async (_request, action) => { if (action === "FMEA_IMAGE_TRANSFER_AUTHORIZED") revokeAccess(); });
    const response = await imageRequest(app);
    expect(response.statusCode).toBe({ membership: 401, role: 403, quota: 429, organization: 423 }[boundary]);
    expect(response.json().error.retryable).toBe(false);
    expect(ai.send).not.toHaveBeenCalled();
  }));

  it("rejects anonymous and forbidden policy access", async () => withApp(async app => {
    expect((await app.inject({ url: "/api/v1/fmea/image-analysis-policy" })).statusCode).toBe(401);
    db.organizationMember.findFirst.mockResolvedValue({ role: "VIEWER", user: { globalRole: "USER" } });
    expect((await app.inject({ url: "/api/v1/fmea/image-analysis-policy", headers: headers(app) })).statusCode).toBe(403);
    expect(ai.send).not.toHaveBeenCalled();
  }));

  it("preserves MIME and file-signature validation before provider dispatch", async () => withApp(async app => {
    expect((await imageRequest(app, Buffer.from("synthetic non-image"))).statusCode).toBe(415);
    expect((await imageRequest(app, file, "text/plain")).statusCode).toBe(415);
    expect(ai.send).not.toHaveBeenCalled();
  }));

  it("keeps provider and parser failures nonretryable without exposing upstream contents", async () => withApp(async app => {
    ai.send.mockRejectedValueOnce(Object.assign(new Error("Synthetic private upstream contents"), { code: "PROVIDER_TIMEOUT" }));
    const unavailable = await imageRequest(app);
    expect(unavailable.statusCode).toBe(503);
    expect(unavailable.json().error).toMatchObject({ code: "FMEA_IMAGE_AI_UNAVAILABLE", retryable: false });
    expect(unavailable.body).not.toContain("private upstream");
    ai.send.mockResolvedValueOnce({ provider: "arvancloud", model: "GPT-5-Mini", answer: "Synthetic invalid JSON" });
    const invalid = await imageRequest(app);
    expect(invalid.statusCode).toBe(503);
    expect(invalid.json().error.retryable).toBe(false);
  }));
});
