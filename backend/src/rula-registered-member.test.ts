import Fastify from "fastify";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import { readFileSync } from "node:fs";
import { normalizeRulaImage } from "./rula-image-normalization.js";
import { beforeEach, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  user: { findFirst: vi.fn() },
  organizationMember: { findFirst: vi.fn() },
  organization: { findUnique: vi.fn() },
  audit: vi.fn(),
  project: { findFirst: vi.fn() },
  rulaAssessment: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  rulaVersion: { create: vi.fn(), upsert: vi.fn() },
  attachment: { findMany: vi.fn() },
  auditLog: { create: vi.fn(), findFirst: vi.fn() },
  aIAnalysisRequest: { create: vi.fn(), findFirst: vi.fn() },
  $transaction: vi.fn(),
  $queryRaw: vi.fn(),
}));
const ai = vi.hoisted(() => ({ analyze: vi.fn(), recordUsage: vi.fn(), available: vi.fn(), supportsImages: vi.fn(), beforeTransfer: vi.fn() }));

vi.mock("./core.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./core.js")>();
  return { ...actual, prisma: db, audit: db.audit };
});
vi.mock("./ai-provider.js", () => ({
  getAvailableAssessmentAIProvider: () => ({ name: "test-vision", analyze: ai.analyze }),
  getRulaPostureImageAIProvider: () => ({ name: "test-vision", available: ai.available, supportsImages: ai.supportsImages, analyze: async (input: { beforeImageTransfer: () => Promise<void> }) => { await ai.beforeTransfer(); await input.beforeImageTransfer(); return ai.analyze(input); } }),
}));
vi.mock("./ai-usage.js", async (importOriginal) => ({ ...(await importOriginal<typeof import("./ai-usage.js")>()), recordAIUsage: ai.recordUsage }));

import { ACCOUNT_IMAGE_CONSENT_VERSION, IMAGE_PROCESSING_PURPOSE } from "./image-processing-consent.js";
import { registerAssessmentRoutes } from "./modules/assessments.js";

const parts = ["upperArm", "lowerArm", "wrist", "wristTwist", "neck", "trunk", "legs"];
const answer = JSON.stringify({
  sides: { RIGHT: {
    ...Object.fromEntries(parts.map((part) => [part, { angle: part === "legs" ? null : 20, score: part === "wristTwist" || part === "legs" ? 1 : 2, detected: true, confidence: 0.9 }])),
    overlay: { points: {} },
  } },
  notes: "Synthetic fixture",
});
let storedImageResults: Map<string, { id: string; organizationId: string; userId: string; type: string; status: string; output: unknown }>;

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("RULA_IMAGE_PRIVACY_APPROVED_PROVIDER", "test-vision");
  vi.stubEnv("RULA_IMAGE_VISION_SUPPORTED_PROVIDER", "test-vision");
  db.user.findFirst.mockResolvedValue({ id: "user-a", globalRole: "USER", active: true, aiEnabled: true, aiTokenLimit: 10000, aiTokensUsed: 0 });
  db.organizationMember.findFirst.mockResolvedValue({ role: "ASSESSOR", user: { globalRole: "USER" } });
  db.organization.findUnique.mockResolvedValue({ active: true, subscriptionStatus: "ACTIVE", subscriptionExpiresAt: null });
  db.project.findFirst.mockResolvedValue({ id: "project-a" });
  db.attachment.findMany.mockResolvedValue([]);
  db.$queryRaw.mockImplementation(async (query: { sql: string; values: unknown[] }) => {
    if (!query.sql.includes("FOR UPDATE")) return [];
    const current = await db.rulaAssessment.findFirst({ where: { id: query.values[0], organizationId: query.values[1] } });
    return current ? [{ id: current.id }] : [];
  });
  db.rulaAssessment.create.mockResolvedValue({ id: "assessment-a", status: "APPROVED" });
  db.rulaVersion.create.mockResolvedValue({ id: "version-a" });
  db.$transaction.mockImplementation(async (run: (tx: typeof db) => Promise<unknown>) => run(db));
  db.auditLog.create.mockResolvedValue({ id: "audit-a" });
  storedImageResults = new Map();
  db.aIAnalysisRequest.create.mockImplementation(async ({ data }) => {
    const id = `00000000-0000-4000-8000-${String(storedImageResults.size + 1).padStart(12, "0")}`;
    storedImageResults.set(id, { id, ...data });
    return { id };
  });
  db.aIAnalysisRequest.findFirst.mockImplementation(async ({ where }) => {
    const row = storedImageResults.get(where.id);
    return row && row.organizationId === where.organizationId && row.userId === where.userId && row.type === where.type && row.status === where.status ? { id: row.id, output: row.output } : null;
  });
  db.auditLog.findFirst.mockResolvedValue({ id: "account-consent-a", action: "IMAGE_PROCESSING_CONSENT_ACCEPTED", createdAt: new Date("2026-10-19T00:00:00Z"), metadata: { policyVersion: ACCOUNT_IMAGE_CONSENT_VERSION, provider: "arvancloud", purpose: IMAGE_PROCESSING_PURPOSE } });
  ai.available.mockReturnValue(true);
  ai.supportsImages.mockReturnValue(true);
  ai.analyze.mockResolvedValue({ provider: "test-vision", model: "fixture-v1", answer, citations: [], confidence: 0.9, usage: { inputTokens: 20, outputTokens: 30, totalTokens: 50 } });
  ai.recordUsage.mockResolvedValue(undefined);
});

function multipartImage(overrides: Record<string, string> = {}) {
  const boundary = "task-07-vision-boundary";
  const file = readFileSync(new URL("../../frontend/test-fixtures/rula-ai-synthetic.png", import.meta.url));
  const fields = Object.entries({ imageSubject: "SELF", bodySide: "RIGHT", jobTitle: "Operator", taskDescription: "Assembly task", locale: "en", ...overrides }).map(([name, value]) => {
    return Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`);
  });
  const payload = Buffer.concat([
    ...fields,
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="fixture.png"\r\nContent-Type: image/png\r\n\r\n`),
    file,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return { file, payload, contentType: `multipart/form-data; boundary=${boundary}` };
}

async function withApp(run: (app: FastifyInstanceForTest) => Promise<void>) {
  const app = Fastify();
  await app.register(jwt, { secret: "task-07-test-secret" });
  await app.register(multipart);
  app.setErrorHandler((error, request, reply) => {
    const failure = error as Error & { statusCode?: number; code?: string; retryable?: boolean };
    return reply.status(failure.statusCode ?? 500).send({ error: { code: failure.code ?? "INTERNAL_ERROR", message: failure.message, requestId: request.id, ...(typeof failure.retryable === "boolean" ? { retryable: failure.retryable } : {}) } });
  });
  await app.register(registerAssessmentRoutes);
  try { await run(app as FastifyInstanceForTest); } finally { await app.close(); }
}

type FastifyInstanceForTest = Awaited<ReturnType<typeof Fastify>>;

it("saves an unreviewed image result as an in-progress assessment while refusing final approval", async () => withApp(async app => {
  const rows = Object.fromEntries(parts.map(part => [part, { angle: part === "legs" ? null : 20, score: 1, detected: true, source: "AI", confirmedByUser: false, requiresReview: true, confidence: 0.8 }]));
  const analysis = { ...rows, imageAssessments: [{ imageKey: "synthetic-image", fileName: "synthetic.png", analysis: rows, force: 0, muscleUse: false }] };
  const current = { id: "00000000-0000-4000-8000-000000000022", organizationId: "org-a", projectId: "00000000-0000-4000-8000-000000000021", activityId: null, bodySide: "RIGHT", inputs: { upperArm: 1, lowerArm: 1, wrist: 1, wristTwist: 1, neck: 1, trunk: 1, legs: 1, force: 0, muscleUse: false }, postureAnalysis: rows, version: 1, status: "IN_PROGRESS" };
  db.rulaAssessment.findFirst.mockResolvedValue(current);
  db.rulaAssessment.update.mockResolvedValue({ ...current, version: 2, postureAnalysis: analysis });
  const headers = { authorization: `Bearer ${app.jwt.sign({ sub: "user-a" })}`, "x-organization-id": "org-a" };
  const draft = await app.inject({ method: "PATCH", url: `/api/v1/rula/${current.id}`, headers, payload: { postureAnalysis: analysis, status: "IN_PROGRESS" } });
  expect(draft.statusCode).toBe(200);
  expect(db.rulaAssessment.update).toHaveBeenCalledOnce();
  expect(draft.json().data.postureAnalysis.upperArm.confirmedByUser).toBe(false);
  const lockIndex = db.$queryRaw.mock.calls.findIndex(([query]) => query.sql.includes("FOR UPDATE"));
  expect(lockIndex).toBeGreaterThanOrEqual(0);
  expect(db.$queryRaw.mock.invocationCallOrder[lockIndex]).toBeLessThan(db.rulaAssessment.update.mock.invocationCallOrder[0]!);
  const final = await app.inject({ method: "PATCH", url: `/api/v1/rula/${current.id}`, headers, payload: { postureAnalysis: analysis, status: "APPROVED" } });
  expect(final.statusCode).toBe(400);
  expect(final.json().error.code).toBe("RULA_POSTURE_REVIEW_REQUIRED");
  expect(db.rulaAssessment.update).toHaveBeenCalledOnce();
}));


it("rejects image transfer without a current durable account-level acceptance", async () => withApp(async app => {
  db.auditLog.findFirst.mockResolvedValue(null);
  const image = multipartImage();
  const response = await app.inject({ method: "POST", url: "/api/v1/rula/posture-image-analysis", headers: { authorization: `Bearer ${app.jwt.sign({ sub: "user-a" })}`, "x-organization-id": "org-a", "content-type": image.contentType }, payload: image.payload });
  expect(response.statusCode).toBe(403);
  expect(response.json().error.code).toBe("IMAGE_PROCESSING_ACCOUNT_CONSENT_REQUIRED");
  expect(ai.analyze).not.toHaveBeenCalled();
}));

it("stops dispatch when consent is withdrawn after preparation and before the adapter sends", async () => withApp(async app => {
  ai.beforeTransfer.mockImplementation(() => { db.auditLog.findFirst.mockResolvedValue(null); });
  const image = multipartImage();
  const response = await app.inject({ method: "POST", url: "/api/v1/rula/posture-image-analysis", headers: { authorization: `Bearer ${app.jwt.sign({ sub: "user-a" })}`, "x-organization-id": "org-a", "content-type": image.contentType }, payload: image.payload });
  expect(response.statusCode).toBe(403);
  expect(response.json().error.code).toBe("IMAGE_PROCESSING_ACCOUNT_CONSENT_REQUIRED");
  expect(ai.analyze).not.toHaveBeenCalled();
  expect(ai.recordUsage).not.toHaveBeenCalled();
}));

it.each(["withdrawal", "receipt-change"])("stops dispatch after %s during the durable attempt audit", async kind => withApp(async app => {
  db.audit.mockImplementation(async (_request, action) => {
    if (action === "RULA_IMAGE_TRANSFER_AUTHORIZED") db.auditLog.findFirst.mockResolvedValue(kind === "withdrawal" ? null : { id: "new-account-consent", action: "IMAGE_PROCESSING_CONSENT_ACCEPTED", createdAt: new Date(), metadata: { policyVersion: ACCOUNT_IMAGE_CONSENT_VERSION, provider: "arvancloud", purpose: IMAGE_PROCESSING_PURPOSE } });
  });
  const image = multipartImage();
  const response = await app.inject({ method: "POST", url: "/api/v1/rula/posture-image-analysis", headers: { authorization: `Bearer ${app.jwt.sign({ sub: "user-a" })}`, "x-organization-id": "org-a", "content-type": image.contentType }, payload: image.payload });
  expect(response.statusCode).toBe(403);
  expect(response.json().error.code).toBe(kind === "withdrawal" ? "IMAGE_PROCESSING_ACCOUNT_CONSENT_REQUIRED" : "IMAGE_TRANSFER_AUTHORIZATION_CHANGED");
  expect(ai.analyze).not.toHaveBeenCalled();
}));

it("stops third-party dispatch if its owner revokes the grant during the attempt audit", async () => withApp(async app => {
  const grantId = "11111111-1111-4111-8111-111111111111";
  let revoked = false;
  db.auditLog.findFirst.mockImplementation(async ({ where }) => {
    if (where.entityType === "ImageProcessingConsent") return { id: where.userId === "owner-a" ? "owner-consent" : "account-consent-a", action: "IMAGE_PROCESSING_CONSENT_ACCEPTED", createdAt: new Date(), metadata: { policyVersion: ACCOUNT_IMAGE_CONSENT_VERSION, provider: "arvancloud", purpose: IMAGE_PROCESSING_PURPOSE } };
    if (where.action === "POSTURE_IMAGE_AUTHORIZATION_REVOKED") return revoked ? { id: "revocation" } : null;
    return { entityId: grantId, userId: "owner-a", organizationId: "org-a", createdAt: new Date(), metadata: { recipientUserId: "user-a", provider: "arvancloud", purpose: IMAGE_PROCESSING_PURPOSE, policyVersion: ACCOUNT_IMAGE_CONSENT_VERSION, ownerConsentRecordId: "owner-consent", expiresAt: new Date(Date.now() + 86_400_000).toISOString() } };
  });
  db.audit.mockImplementation(async (_request, action) => { if (action === "RULA_IMAGE_TRANSFER_AUTHORIZED") revoked = true; });
  const image = multipartImage({ imageSubject: "THIRD_PARTY", ownerAuthorizationId: grantId });
  const response = await app.inject({ method: "POST", url: "/api/v1/rula/posture-image-analysis", headers: { authorization: `Bearer ${app.jwt.sign({ sub: "user-a" })}`, "x-organization-id": "org-a", "content-type": image.contentType }, payload: image.payload });
  expect(response.statusCode).toBe(403);
  expect(response.json().error.code).toBe("POSTURE_IMAGE_OWNER_AUTHORIZATION_REQUIRED");
  expect(ai.analyze).not.toHaveBeenCalled();
}));

it("rechecks withdrawal before a malformed-answer retry while preserving billed first-attempt usage", async () => withApp(async app => {
  ai.analyze.mockImplementationOnce(async () => { db.auditLog.findFirst.mockResolvedValue(null); return { provider: "test-vision", model: "fixture-v1", answer: "invalid JSON", citations: [], confidence: 0.9, usage: { inputTokens: 20, outputTokens: 30, totalTokens: 50 } }; });
  const image = multipartImage();
  const response = await app.inject({ method: "POST", url: "/api/v1/rula/posture-image-analysis", headers: { authorization: `Bearer ${app.jwt.sign({ sub: "user-a" })}`, "x-organization-id": "org-a", "content-type": image.contentType }, payload: image.payload });
  expect(response.statusCode).toBe(403);
  expect(response.json().error.code).toBe("IMAGE_PROCESSING_ACCOUNT_CONSENT_REQUIRED");
  expect(ai.analyze).toHaveBeenCalledOnce();
  expect(ai.recordUsage).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ result: expect.objectContaining({ usage: { inputTokens: 20, outputTokens: 30, totalTokens: 50 } }) }));
  expect(db.audit.mock.calls.filter(call => call[1] === "RULA_IMAGE_TRANSFER_AUTHORIZED")).toHaveLength(1);
}));

it.each(["membership", "ai-access"])("rechecks %s changes at actual dispatch", async kind => withApp(async app => {
  ai.beforeTransfer.mockImplementation(() => {
    if (kind === "membership") db.organizationMember.findFirst.mockResolvedValue(null);
    else db.user.findFirst.mockResolvedValue({ id: "user-a", globalRole: "USER", active: true, aiEnabled: false, aiTokenLimit: 10000, aiTokensUsed: 0 });
  });
  const image = multipartImage();
  const response = await app.inject({ method: "POST", url: "/api/v1/rula/posture-image-analysis", headers: { authorization: `Bearer ${app.jwt.sign({ sub: "user-a" })}`, "x-organization-id": "org-a", "content-type": image.contentType }, payload: image.payload });
  expect(response.statusCode).toBe(kind === "membership" ? 401 : 403);
  expect(ai.analyze).not.toHaveBeenCalled();
}));

it("automatically analyzes images under account policy without per-image consent fields", async () => withApp(async app => {
  const image = multipartImage();
  const response = await app.inject({ method: "POST", url: "/api/v1/rula/posture-image-analysis", headers: { authorization: `Bearer ${app.jwt.sign({ sub: "user-a" })}`, "x-organization-id": "org-a", "content-type": image.contentType }, payload: image.payload });
  expect(response.statusCode).toBe(200);
  const index = db.audit.mock.calls.findIndex(call => call[1] === "RULA_IMAGE_TRANSFER_AUTHORIZED");
  expect(index).toBeGreaterThanOrEqual(0);
  expect(db.audit.mock.calls[index]?.[4]).toMatchObject({ accountConsentVersion: ACCOUNT_IMAGE_CONSENT_VERSION, consentRecordId: "account-consent-a", consentSource: "ACCOUNT_POLICY", provider: "test-vision", requestedModel: "GPT-5-Mini", purpose: "rula-posture", bodySide: "RIGHT", locale: "en", imageSha256: expect.stringMatching(/^[a-f0-9]{64}$/) });
  const receiptOrder = db.audit.mock.invocationCallOrder[index];
  const dispatchOrder = ai.analyze.mock.invocationCallOrder[0];
  if (receiptOrder === undefined || dispatchOrder === undefined) throw new Error("Account authorization receipt or provider dispatch missing");
  expect(receiptOrder).toBeLessThan(dispatchOrder);
}));

it("persists validated inference with actor, tenant and consent references before replying and retrieves only the own stored result", async () => withApp(async app => {
  const image = multipartImage();
  const headers = { authorization: `Bearer ${app.jwt.sign({ sub: "user-a" })}`, "x-organization-id": "org-a" };
  const response = await app.inject({ method: "POST", url: "/api/v1/rula/posture-image-analysis", headers: { ...headers, "content-type": image.contentType }, payload: image.payload });
  expect(response.statusCode).toBe(200);
  const { analysisRequestId } = response.json().data;
  expect(analysisRequestId).toMatch(/^[a-f0-9-]{36}$/);
  expect(db.aIAnalysisRequest.create).toHaveBeenCalledWith({ data: expect.objectContaining({ organizationId: "org-a", userId: "user-a", type: "RULA_POSTURE_IMAGE", status: "SUCCEEDED", attempts: 1, input: expect.objectContaining({ consentRecordId: "account-consent-a", accountConsentVersion: ACCOUNT_IMAGE_CONSENT_VERSION, imageSubject: "SELF", imageOwnerUserId: "user-a", imageSha256: expect.stringMatching(/^[a-f0-9]{64}$/) }), output: expect.objectContaining({ sides: expect.any(Object), provider: "test-vision" }) }), select: { id: true } });
  const persisted = JSON.stringify(db.aIAnalysisRequest.create.mock.calls[0]?.[0]);
  expect(persisted).not.toContain("data:image");
  expect(persisted).not.toContain('"base64"');
  expect(persisted).not.toContain('"message"');
  expect(persisted).not.toContain("Assembly task");
  const read = await app.inject({ url: `/api/v1/rula/posture-image-analysis/${analysisRequestId}`, headers });
  expect(read.statusCode).toBe(200);
  expect(read.headers["cache-control"]).toBe("private, no-store");
  expect(read.json().data).toEqual(response.json().data);
  expect(db.aIAnalysisRequest.findFirst).toHaveBeenCalledWith({ where: { id: analysisRequestId, organizationId: "org-a", userId: "user-a", type: "RULA_POSTURE_IMAGE", status: "SUCCEEDED" }, select: { id: true, output: true } });
  expect(ai.analyze).toHaveBeenCalledOnce();
}));

it("returns the committed paid result if the supplementary completion audit fails", async () => withApp(async app => {
  db.audit.mockImplementation(async (_request, action) => {
    if (action === "RULA_POSTURE_IMAGE_ANALYSIS") throw new Error("private audit payload and credentials");
  });
  const image = multipartImage();
  const headers = { authorization: `Bearer ${app.jwt.sign({ sub: "user-a" })}`, "x-organization-id": "org-a" };
  const response = await app.inject({ method: "POST", url: "/api/v1/rula/posture-image-analysis", headers: { ...headers, "content-type": image.contentType }, payload: image.payload });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.analysisRequestId).toMatch(/^[0-9a-f-]{36}$/);
  expect(response.body).not.toContain("private");
  expect(db.aIAnalysisRequest.create).toHaveBeenCalledOnce();
  expect(ai.analyze).toHaveBeenCalledOnce();
  expect(ai.recordUsage).toHaveBeenCalledOnce();
  expect(db.audit).toHaveBeenCalledWith(expect.anything(), "RULA_IMAGE_TRANSFER_AUTHORIZED", "RulaPostureImage", undefined, expect.anything());
  const stored = await app.inject({ url: `/api/v1/rula/posture-image-analysis/${response.json().data.analysisRequestId}`, headers });
  expect(stored.statusCode).toBe(200);
  expect(stored.json().data).toEqual(response.json().data);
}));

it("returns a safe nonretryable error if durable inference storage fails after the paid call", async () => withApp(async app => {
  db.aIAnalysisRequest.create.mockRejectedValue(new Error("private database credentials and payload"));
  const image = multipartImage();
  const response = await app.inject({ method: "POST", url: "/api/v1/rula/posture-image-analysis", headers: { authorization: `Bearer ${app.jwt.sign({ sub: "user-a" })}`, "x-organization-id": "org-a", "content-type": image.contentType }, payload: image.payload });
  expect(response.statusCode).toBe(503);
  expect(response.json().error).toMatchObject({ code: "RULA_IMAGE_RESULT_SAVE_FAILED", retryable: false });
  expect(response.body).not.toContain("private");
  expect(ai.analyze).toHaveBeenCalledOnce();
  expect(ai.recordUsage).toHaveBeenCalledOnce();
}));

it("denies unauthenticated, forbidden and cross-actor/tenant direct stored-result access", async () => withApp(async app => {
  const image = multipartImage();
  const headers = { authorization: `Bearer ${app.jwt.sign({ sub: "user-a" })}`, "x-organization-id": "org-a" };
  const created = await app.inject({ method: "POST", url: "/api/v1/rula/posture-image-analysis", headers: { ...headers, "content-type": image.contentType }, payload: image.payload });
  expect(created.statusCode).toBe(200);
  const url = `/api/v1/rula/posture-image-analysis/${created.json().data.analysisRequestId}`;
  expect((await app.inject({ url })).statusCode).toBe(401);
  expect((await app.inject({ url, headers: { ...headers, "x-organization-id": "org-b" } })).statusCode).toBe(404);
  db.user.findFirst.mockResolvedValue({ id: "other-user", globalRole: "USER", active: true });
  expect((await app.inject({ url, headers: { ...headers, authorization: `Bearer ${app.jwt.sign({ sub: "other-user" })}` } })).statusCode).toBe(404);
  db.user.findFirst.mockResolvedValue({ id: "user-a", globalRole: "USER", active: true });
  db.organizationMember.findFirst.mockResolvedValueOnce({ role: "VIEWER", user: { globalRole: "USER" } });
  expect((await app.inject({ url, headers })).statusCode).toBe(403);
  expect(ai.analyze).toHaveBeenCalledOnce();
}));

it("does not send an image if the durable consent audit cannot be recorded", async () => withApp(async app => {
  db.audit.mockImplementation(async (_request, action) => { if (action === "RULA_IMAGE_TRANSFER_AUTHORIZED") throw new Error("Synthetic audit failure"); });
  const image = multipartImage();
  const response = await app.inject({ method: "POST", url: "/api/v1/rula/posture-image-analysis", headers: { authorization: `Bearer ${app.jwt.sign({ sub: "user-a" })}`, "x-organization-id": "org-a", "content-type": image.contentType }, payload: image.payload });
  expect(response.statusCode).toBe(500);
  expect(ai.analyze).not.toHaveBeenCalled();
}));

it("exposes the same platform image capability to independent eligible organizations without an organization allowlist", async () => withApp(async app => {
  const token = app.jwt.sign({ sub: "user-a" });
  for (const organizationId of ["org-a", "org-b"]) {
    const response = await app.inject({ method: "GET", url: "/api/v1/rula/image-analysis-policy", headers: { authorization: `Bearer ${token}`, "x-organization-id": organizationId } });
    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual({ available: true, provider: "test-vision", reasonCode: null, consentAccepted: true, consentVersion: ACCOUNT_IMAGE_CONSENT_VERSION });
    expect(response.headers["cache-control"]).toBe("private, no-store");
  }
  expect(ai.analyze).not.toHaveBeenCalled();
}));

it("reports a missing platform privacy approval without uploading an image or granting consent", async () => withApp(async app => {
  vi.stubEnv("RULA_IMAGE_PRIVACY_APPROVED_PROVIDER", "");
  const response = await app.inject({ method: "GET", url: "/api/v1/rula/image-analysis-policy", headers: { authorization: `Bearer ${app.jwt.sign({ sub: "user-a" })}`, "x-organization-id": "org-a" } });
  expect(response.statusCode).toBe(200);
  expect(response.json().data).toEqual({ available: false, provider: "test-vision", reasonCode: "privacy-approval-missing", consentAccepted: true, consentVersion: ACCOUNT_IMAGE_CONSENT_VERSION });
  expect(ai.analyze).not.toHaveBeenCalled();
}));

it("keeps authentication, membership, viewer and quota restrictions on capability discovery", async () => withApp(async app => {
  const url = "/api/v1/rula/image-analysis-policy";
  expect((await app.inject({ method: "GET", url })).statusCode).toBe(401);
  const headers = { authorization: `Bearer ${app.jwt.sign({ sub: "user-a" })}`, "x-organization-id": "org-a" };
  db.organizationMember.findFirst.mockResolvedValueOnce(null);
  expect((await app.inject({ method: "GET", url, headers })).statusCode).toBe(401);
  db.organizationMember.findFirst.mockResolvedValueOnce({ role: "VIEWER", user: { globalRole: "USER" } });
  expect((await app.inject({ method: "GET", url, headers })).statusCode).toBe(403);
  db.user.findFirst.mockResolvedValue({ id: "user-a", globalRole: "USER", active: true, aiEnabled: true, aiTokenLimit: 10, aiTokensUsed: 10 });
  const limited = await app.inject({ method: "GET", url, headers });
  expect(limited.statusCode).toBe(429);
  expect(limited.json().error.code).toBe("AI_ACCESS_LIMIT_REACHED");
  expect(ai.analyze).not.toHaveBeenCalled();
}));

it("rejects a confirmation-only bypass for a conflicting image-plane measurement",async()=>withApp(async app=>{
  const row={angle:0,score:1,detected:true,source:"USER",confirmedByUser:true};
  const analysis={...Object.fromEntries(parts.map(p=>[p,row])),lowerArm:{...row,angle:null,source:"AI",measurement:{version:"image-plane-audit-v1",state:"CONFLICT",basis:"IMAGE_PLANE",aiAngle:180,aiScore:2,geometryAngle:90,qualityCodes:["ANGLE_LANDMARK_CONFLICT"],view:"SAGITTAL",width:1000,height:700,landmarks:[]}}};
  const token=app.jwt.sign({sub:"user-a"});
  const r=await app.inject({method:"POST",url:"/api/v1/rula",headers:{authorization:`Bearer ${token}`,"x-organization-id":"org-a"},payload:{projectId:"11111111-1111-4111-8111-111111111111",title:"Synthetic conflict bypass",bodySide:"RIGHT",status:"APPROVED",postureAnalysis:analysis,inputs:{upperArm:1,lowerArm:1,wrist:1,wristTwist:1,neck:1,trunk:1,legs:1,muscleUse:false,force:0}}});
  expect(r.statusCode).toBe(400);
  expect(r.json().error.code).toBe("RULA_POSTURE_REVIEW_REQUIRED");
  expect(db.rulaAssessment.create).not.toHaveBeenCalled();
}));

it("lets an active registered non-admin member use image RULA through JWT, org, role and vision-provider boundaries", async () => withApp(async (app) => {
  const image = multipartImage();
  const token = app.jwt.sign({ sub: "user-a" });
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/rula/posture-image-analysis",
    headers: { authorization: `Bearer ${token}`, "x-organization-id": "org-a", "content-type": image.contentType },
    payload: image.payload,
  });

  expect(response.statusCode).toBe(200);
  expect(response.json().data.sides.RIGHT.upperArm.score).toBe(1);
  expect(db.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "user-a", active: true } }));
  expect(db.organizationMember.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-a", userId: "user-a", active: true, user: { active: true } } }));
  const normalized=await normalizeRulaImage(image.file,"image/png");
  expect(ai.analyze).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-a", organizationId: "org-a", imagePurpose: "rula-posture", image: { mimeType: "image/png", base64: normalized.buffer.toString("base64") } }));
  expect(response.json().data.sides.RIGHT.upperArm).toMatchObject({angle:null,detected:false,requiresReview:true,measurement:{state:"UNMEASURABLE",qualityCodes:["LANDMARK_CONTRACT_MISSING"]}});
  expect(ai.recordUsage).toHaveBeenCalledOnce();
  expect(db.audit.mock.calls.at(-1)?.[4]).toMatchObject({ imageConsent: true });
}));

it("reserves the supported completion ceiling for landmark JSON instead of the exhausted 3000-token single-side budget", async () => withApp(async app => {
  const image = multipartImage();
  const response = await app.inject({ method: "POST", url: "/api/v1/rula/posture-image-analysis", headers: { authorization: `Bearer ${app.jwt.sign({ sub: "user-a" })}`, "x-organization-id": "org-a", "content-type": image.contentType }, payload: image.payload });
  expect(response.statusCode).toBe(200);
  expect(ai.analyze).toHaveBeenCalledWith(expect.objectContaining({ imagePurpose: "rula-posture", maxOutputTokens: 8000 }));
}));

it("automatically analyzes a RULA image without per-image consent when account policy allows it", async () => withApp(async (app) => {
  const image = multipartImage();
  const token = app.jwt.sign({ sub: "user-a" });
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/rula/posture-image-analysis",
    headers: { authorization: `Bearer ${token}`, "x-organization-id": "org-a", "content-type": image.contentType },
    payload: image.payload,
  });

  expect(response.statusCode).toBe(200);
  expect(ai.analyze).toHaveBeenCalledOnce();
  expect(ai.recordUsage).toHaveBeenCalledOnce();
  expect(db.audit).toHaveBeenCalledWith(expect.anything(), "RULA_IMAGE_TRANSFER_AUTHORIZED", "RulaPostureImage", undefined, expect.objectContaining({ consentSource: "ACCOUNT_POLICY" }));
}));

it("keeps read-only members out of the RULA vision provider", async () => withApp(async (app) => {
  db.organizationMember.findFirst.mockResolvedValue({ role: "VIEWER", user: { globalRole: "USER" } });
  const image = multipartImage();
  const token = app.jwt.sign({ sub: "user-a" });
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/rula/posture-image-analysis",
    headers: { authorization: `Bearer ${token}`, "x-organization-id": "org-a", "content-type": image.contentType },
    payload: image.payload,
  });

  expect(response.statusCode).toBe(403);
  expect(response.json().error.code).toBe("FORBIDDEN");
  expect(ai.analyze).not.toHaveBeenCalled();
  expect(ai.recordUsage).not.toHaveBeenCalled();
}));

it("rejects an inactive registered account before membership or provider lookup", async () => withApp(async (app) => {
  db.user.findFirst.mockResolvedValue(null);
  const image = multipartImage();
  const token = app.jwt.sign({ sub: "user-a" });
  const response = await app.inject({ method: "POST", url: "/api/v1/rula/posture-image-analysis", headers: { authorization: `Bearer ${token}`, "x-organization-id": "org-a", "content-type": image.contentType }, payload: image.payload });
  expect(response.statusCode).toBe(401);
  expect(response.json().error.code).toBe("UNAUTHORIZED");
  expect(db.organizationMember.findFirst).not.toHaveBeenCalled();
  expect(ai.analyze).not.toHaveBeenCalled();
}));

it("requires an explicit organization selection and rejects a user from another tenant", async () => withApp(async (app) => {
  const image = multipartImage();
  const token = app.jwt.sign({ sub: "user-a" });
  const missingOrg = await app.inject({ method: "POST", url: "/api/v1/rula/posture-image-analysis", headers: { authorization: `Bearer ${token}`, "content-type": image.contentType }, payload: image.payload });
  expect(missingOrg.statusCode).toBe(400);
  expect(missingOrg.json().error.code).toBe("ORGANIZATION_REQUIRED");
  db.organizationMember.findFirst.mockResolvedValueOnce(null);
  const wrongTenant = await app.inject({ method: "POST", url: "/api/v1/rula/posture-image-analysis", headers: { authorization: `Bearer ${token}`, "x-organization-id": "org-other", "content-type": image.contentType }, payload: image.payload });
  expect(wrongTenant.statusCode).toBe(401);
  expect(wrongTenant.json().error.code).toBe("UNAUTHORIZED");
  expect(ai.analyze).not.toHaveBeenCalled();
}));

it("returns the subscription gate before sending an RULA image to the provider", async () => withApp(async (app) => {
  db.organization.findUnique.mockResolvedValue({ active: true, subscriptionStatus: "EXPIRED", subscriptionExpiresAt: null });
  const image = multipartImage();
  const token = app.jwt.sign({ sub: "user-a" });
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/rula/posture-image-analysis",
    headers: { authorization: `Bearer ${token}`, "x-organization-id": "org-a", "content-type": image.contentType },
    payload: image.payload,
  });

  expect(response.statusCode).toBe(402);
  expect(response.json().error.code).toBe("SUBSCRIPTION_REQUIRED");
  expect(ai.analyze).not.toHaveBeenCalled();
}));

it("reports an unconfigured image-capable provider as a stable non-retryable capability failure", async () => withApp(async (app) => {
  ai.available.mockReturnValue(false);
  const image = multipartImage();
  const token = app.jwt.sign({ sub: "user-a" });
  const response = await app.inject({ method: "POST", url: "/api/v1/rula/posture-image-analysis", headers: { authorization: `Bearer ${token}`, "x-organization-id": "org-a", "content-type": image.contentType }, payload: image.payload });
  expect(response.statusCode).toBe(503);
  expect(response.json().error).toMatchObject({ code: "RULA_IMAGE_AI_UNAVAILABLE", retryable: false });
  expect(response.json().error.requestId).toBeTruthy();
  expect(ai.analyze).not.toHaveBeenCalled();
  expect(ai.recordUsage).not.toHaveBeenCalled();
}));

it("does not send posture images unless privacy approval matches the configured provider", async () => withApp(async (app) => {
  vi.stubEnv("RULA_IMAGE_PRIVACY_APPROVED_PROVIDER", "another-provider");
  const image = multipartImage();
  const token = app.jwt.sign({ sub: "user-a" });
  const response = await app.inject({ method: "POST", url: "/api/v1/rula/posture-image-analysis", headers: { authorization: `Bearer ${token}`, "x-organization-id": "org-a", "content-type": image.contentType }, payload: image.payload });
  expect(response.statusCode).toBe(503);
  expect(response.json().error).toMatchObject({ code: "RULA_IMAGE_AI_UNAVAILABLE", retryable: false });
  expect(ai.analyze).not.toHaveBeenCalled();
  expect(ai.recordUsage).not.toHaveBeenCalled();
  expect(db.audit.mock.calls.at(-1)?.[4]).toMatchObject({ approvalFailure: "privacy-approval-missing" });
}));

it("does not send posture images until the provider's vision and structured-output capability is verified", async () => withApp(async (app) => {
  vi.stubEnv("RULA_IMAGE_VISION_SUPPORTED_PROVIDER", "another-provider");
  const image = multipartImage();
  const token = app.jwt.sign({ sub: "user-a" });
  const response = await app.inject({ method: "POST", url: "/api/v1/rula/posture-image-analysis", headers: { authorization: `Bearer ${token}`, "x-organization-id": "org-a", "content-type": image.contentType }, payload: image.payload });
  expect(response.statusCode).toBe(503);
  expect(response.json().error).toMatchObject({ code: "RULA_IMAGE_AI_UNAVAILABLE", retryable: false });
  expect(ai.analyze).not.toHaveBeenCalled();
  expect(db.audit.mock.calls.at(-1)?.[4]).toMatchObject({ approvalFailure: "vision-capability-unverified" });
}));

it("returns a redacted provider error without authorizing an automatic image replay", async () => withApp(async (app) => {
  ai.analyze.mockRejectedValue(Object.assign(new Error("private provider token and response"), { code: "PROVIDER_TIMEOUT", retryable: true }));
  const image = multipartImage();
  const token = app.jwt.sign({ sub: "user-a" });
  const response = await app.inject({ method: "POST", url: "/api/v1/rula/posture-image-analysis", headers: { authorization: `Bearer ${token}`, "x-organization-id": "org-a", "content-type": image.contentType }, payload: image.payload });
  expect(response.statusCode).toBe(503);
  expect(response.json().error).toMatchObject({ code: "RULA_IMAGE_AI_UNAVAILABLE", retryable: false });
  expect(response.json().error.message).not.toContain("private");
  expect(response.json().error.requestId).toBeTruthy();
  expect(ai.recordUsage).not.toHaveBeenCalled();
}));

it.each([{ lowerArm:4 }, { wrist:5 }, { wristTwist:3 }, { legs:3 }])("rejects an impossible RULA table index before persistence: %j", async (invalid) => withApp(async (app) => {
  const token=app.jwt.sign({sub:'user-a'});
  const response=await app.inject({method:'POST',url:'/api/v1/rula',headers:{authorization:`Bearer ${token}`,'x-organization-id':'org-a'},payload:{projectId:'11111111-1111-4111-8111-111111111111',title:'Synthetic score validation',bodySide:'RIGHT',inputs:{upperArm:1,lowerArm:1,wrist:1,wristTwist:1,neck:1,trunk:1,legs:1,muscleUse:false,force:0,...invalid}}});
  expect(response.statusCode).toBe(400);
  expect(response.json().error.code).toBe('VALIDATION_ERROR');
  expect(db.rulaAssessment.create).not.toHaveBeenCalled();
  expect(ai.analyze).not.toHaveBeenCalled();
}));

it("keeps malformed vision output non-retryable and out of completed-usage records", async () => withApp(async (app) => {
  ai.analyze.mockResolvedValue({ provider: "test-vision", model: "fixture-v1", answer: "private malformed response", citations: [], confidence: 0.1, usage: { inputTokens: 100, outputTokens: 20, totalTokens: 120 } });
  const image = multipartImage();
  const token = app.jwt.sign({ sub: "user-a" });
  const response = await app.inject({ method: "POST", url: "/api/v1/rula/posture-image-analysis", headers: { authorization: `Bearer ${token}`, "x-organization-id": "org-a", "content-type": image.contentType }, payload: image.payload });
  expect(response.statusCode).toBe(502);
  expect(response.json().error).toMatchObject({ code: "RULA_IMAGE_AI_INVALID_RESPONSE", retryable: false });
  expect(response.json().error.message).not.toContain("private");
  expect(ai.analyze).toHaveBeenCalledTimes(2);
  expect(ai.recordUsage).toHaveBeenCalledOnce();
  expect(ai.recordUsage.mock.calls[0]?.[1]).toMatchObject({ sourceType: "RULA_IMAGE_REVIEW", sourceId: expect.any(String), result: { usage: { inputTokens: 200, outputTokens: 40, totalTokens: 240 } } });
  expect(db.audit.mock.calls.at(-1)?.[4]).toMatchObject({ invalidResponseRetryCount: 1, failureCode: "RULA_IMAGE_AI_INVALID_RESPONSE", responseValidationCode: "response_json_invalid", retryable: false });
  expect(JSON.stringify(db.audit.mock.calls.at(-1)?.[4])).not.toContain("private malformed response");
}));

it("does not let the RULA create API mark unconfirmed image observations as approved", async () => withApp(async (app) => {
  const uncertainAnalysis = Object.fromEntries(parts.map((part) => [part, { angle: part === "legs" ? null : 20, score: 1, detected: part !== "wristTwist", source: "AI", confirmedByUser: false, confidence: 0.3, requiresReview: true }]));
  const token = app.jwt.sign({ sub: "user-a" });
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/rula",
    headers: { authorization: `Bearer ${token}`, "x-organization-id": "org-a" },
    payload: { projectId: "00000000-0000-4000-8000-000000000021", title: "Operator RULA", bodySide: "RIGHT", inputs: { upperArm: 1, lowerArm: 1, wrist: 1, wristTwist: 1, neck: 1, trunk: 1, legs: 1, muscleUse: false, force: 0 }, postureAnalysis: uncertainAnalysis, status: "APPROVED" },
  });
  expect(response.statusCode).toBe(400);
  expect(response.json().error.code).toBe("RULA_POSTURE_REVIEW_REQUIRED");
  expect(db.rulaAssessment.create).not.toHaveBeenCalled();

  db.rulaAssessment.findFirst.mockResolvedValue({ id: "00000000-0000-4000-8000-000000000022", projectId: "00000000-0000-4000-8000-000000000021", activityId: null, bodySide: "RIGHT", inputs: { upperArm: 1, lowerArm: 1, wrist: 1, wristTwist: 1, neck: 1, trunk: 1, legs: 1, muscleUse: false, force: 0 }, postureAnalysis: uncertainAnalysis, version: 1, status: "IN_PROGRESS" });
  const update = await app.inject({ method: "PATCH", url: "/api/v1/rula/00000000-0000-4000-8000-000000000022", headers: { authorization: `Bearer ${token}`, "x-organization-id": "org-a" }, payload: { status: "APPROVED" } });
  expect(update.statusCode).toBe(400);
  expect(update.json().error.code).toBe("RULA_POSTURE_REVIEW_REQUIRED");
  expect(db.rulaVersion.upsert).not.toHaveBeenCalled();
}));

it.each([undefined,false])('does not trust a client to remove the human-review requirement (%s)', async requiresReview => withApp(async app => {
  const forged=Object.fromEntries(parts.map(part=>[part,{angle:part==='legs'?null:0,score:1,detected:part!=='wristTwist',source:'AI',confirmedByUser:false,confidence:0.99,...(requiresReview===undefined?{}:{requiresReview})}]));
  const token=app.jwt.sign({sub:'user-a'});
  const response=await app.inject({method:'POST',url:'/api/v1/rula',headers:{authorization:`Bearer ${token}`,'x-organization-id':'org-a'},payload:{projectId:'00000000-0000-4000-8000-000000000021',title:'Synthetic forged review',bodySide:'RIGHT',inputs:{upperArm:1,lowerArm:1,wrist:1,wristTwist:1,neck:1,trunk:1,legs:1,muscleUse:false,force:0},postureAnalysis:forged,status:'APPROVED'}});
  expect(response.statusCode).toBe(400);
  expect(response.json().error.code).toBe('RULA_POSTURE_REVIEW_REQUIRED');
  expect(db.rulaAssessment.create).not.toHaveBeenCalled();
  expect(db.rulaVersion.create).not.toHaveBeenCalled();
}));

it.each(['side','image'])('enforces confirmation inside a submitted %s without trusting its flag', async kind => withApp(async app => {
  const reviewed=Object.fromEntries(parts.map(part=>[part,{angle:part==='legs'?null:0,score:1,detected:part!=='wristTwist',source:'USER',confirmedByUser:true}]));
  const unreviewed=Object.fromEntries(parts.map(part=>[part,{...reviewed[part],source:'AI',confirmedByUser:false,requiresReview:false}]));
  const analysis=kind==='side'?{...reviewed,sideAnalyses:{RIGHT:reviewed,LEFT:unreviewed}}:{...reviewed,imageAssessments:[{imageKey:'synthetic-image',fileName:'synthetic.png',analysis:unreviewed,force:0,muscleUse:false}]};
  const token=app.jwt.sign({sub:'user-a'});
  const response=await app.inject({method:'POST',url:'/api/v1/rula',headers:{authorization:`Bearer ${token}`,'x-organization-id':'org-a'},payload:{projectId:'00000000-0000-4000-8000-000000000021',title:'Synthetic nested review',bodySide:kind==='side'?'BOTH':'RIGHT',inputs:{upperArm:1,lowerArm:1,wrist:1,wristTwist:1,neck:1,trunk:1,legs:1,muscleUse:false,force:0},postureAnalysis:analysis,status:'APPROVED'}});
  expect(response.statusCode).toBe(400);
  expect(response.json().error.code).toBe('RULA_POSTURE_REVIEW_REQUIRED');
  expect(db.rulaAssessment.create).not.toHaveBeenCalled();
}));

it("includes the saved posture-review state when a member reopens a RULA assessment", async () => withApp(async (app) => {
  const reviewedAnalysis = Object.fromEntries(parts.map((part) => [part, {
    angle: part === "legs" ? null : 20,
    score: 2,
    detected: true,
    source: "USER",
    confirmedByUser: true,
    confidence: 0.9,
    requiresReview: true,
  }]));
  db.rulaAssessment.findFirst.mockResolvedValue({
    id: "00000000-0000-4000-8000-000000000022",
    organizationId: "org-a",
    projectId: "project-a",
    activityId: null,
    bodySide: "RIGHT",
    inputs: { upperArm: 2, lowerArm: 2, wrist: 2, wristTwist: 2, neck: 2, trunk: 2, legs: 2, muscleUse: false, force: 0 },
    postureAnalysis: reviewedAnalysis,
    version: 2,
    status: "IN_PROGRESS",
  });
  const token = app.jwt.sign({ sub: "user-a" });
  const response = await app.inject({ method: "GET", url: "/api/v1/rula/00000000-0000-4000-8000-000000000022", headers: { authorization: `Bearer ${token}`, "x-organization-id": "org-a" } });

  expect(response.statusCode).toBe(200);
  expect(response.json().data).toMatchObject({ postureReviewComplete: true, postureAnalysis: reviewedAnalysis });
}));

