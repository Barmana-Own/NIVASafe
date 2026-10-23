import Fastify, { type FastifyInstance } from "fastify";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AIProviderInput } from "./ai-provider.js";
import type { RulaLocalPoseResult, RulaNormalizedPoseImage, RulaPoseLandmark } from "./rula-pose-provider.js";

const db = vi.hoisted(() => ({
  user: { findFirst: vi.fn() },
  organizationMember: { findFirst: vi.fn() },
  organization: { findUnique: vi.fn() },
  auditLog: { findFirst: vi.fn() },
  aIAnalysisRequest: { create: vi.fn() },
  audit: vi.fn(),
}));
const external = vi.hoisted(() => ({ detect: vi.fn(), analyze: vi.fn(), transport: vi.fn(), usage: vi.fn() }));

// Keep real route authentication, consent, permission, geometry, parsing and
// persistence adapters; replace only their database and inference boundaries.
vi.mock("./core.js", async importOriginal => ({
  ...(await importOriginal<typeof import("./core.js")>()), prisma: db, audit: db.audit,
}));
vi.mock("./rula-pose-provider.js", async importOriginal => ({
  ...(await importOriginal<typeof import("./rula-pose-provider.js")>()),
  detectRulaLocalPose: external.detect,
  isRulaLocalPoseEnabled: () => process.env.RULA_LOCAL_POSE_ENABLED === "true",
}));
vi.mock("./ai-provider.js", () => ({
  getRulaPostureImageAIProvider: () => ({ name: "test-vision", available: () => true, supportsImages: () => true, analyze: external.analyze }),
}));
vi.mock("./ai-usage.js", async importOriginal => ({
  ...(await importOriginal<typeof import("./ai-usage.js")>()), recordAIUsage: external.usage,
}));

import { ACCOUNT_IMAGE_CONSENT_VERSION, IMAGE_PROCESSING_PURPOSE } from "./image-processing-consent.js";
import { registerAssessmentRoutes } from "./modules/assessments.js";
import { RULA_POSE_SOURCE } from "./rula-pose-provider.js";

const user = { id: "pose-user", globalRole: "USER", active: true, aiEnabled: true, aiTokenLimit: 100_000, aiTokensUsed: 0 };
const receipt = { id: "current-consent", action: "IMAGE_PROCESSING_CONSENT_ACCEPTED", createdAt: new Date("2026-10-22T00:00:00Z"), metadata: { policyVersion: ACCOUNT_IMAGE_CONSENT_VERSION, provider: "arvancloud", purpose: IMAGE_PROCESSING_PURPOSE } };
const point = (name: RulaPoseLandmark["name"], x: number, y: number): RulaPoseLandmark => ({ name, x, y, visibility: .95, presence: .9 });
function pose(image: RulaNormalizedPoseImage): RulaLocalPoseResult {
  return { source: RULA_POSE_SOURCE, modelSha256: "a".repeat(64), width: image.width, height: image.height, poses: [{ landmarks: [
    point("nose", .6, .1), point("right_ear", .55, .1),
    point("right_shoulder", .4, .2), point("right_elbow", .4, .4), point("right_wrist", .6, .4), point("right_index", .65, .4),
    point("right_hip", .4, .6), point("right_knee", .4, .75), point("right_ankle", .4, .9),
  ] }] };
}
const answer = JSON.stringify({ sides: { RIGHT: {
  upperArm: { angle: 0, score: 1, detected: true, confidence: .9 },
  lowerArm: { angle: 90, score: 1, detected: true, confidence: .9 },
  wrist: { angle: 0, score: 1, detected: true, confidence: .9 },
  wristTwist: { angle: null, score: 1, detected: false, confidence: .9 },
  neck: { angle: null, score: 1, detected: false, confidence: .9 },
  trunk: { angle: 0, score: 1, detected: true, confidence: .9 },
  legs: { angle: null, score: 1, detected: true, confidence: .9 },
  // Deliberately wrong VLM coordinates must never replace local detections.
  overlay: { points: { shoulder: { x: .99, y: .99, confidence: 1 }, neck: { x: .9, y: .9, confidence: 1 } } },
  geometry: { view: "SAGITTAL", upright: true },
} }, notes: "Synthetic route fixture" });

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("RULA_LOCAL_POSE_ENABLED", "true");
  vi.stubEnv("RULA_LANDMARK_EXPERIMENT_V2", "0");
  vi.stubEnv("RULA_IMAGE_PROCESSING_ENABLED_PROVIDER", "test-vision");
  vi.stubEnv("RULA_IMAGE_VISION_SUPPORTED_PROVIDER", "test-vision");
  db.user.findFirst.mockResolvedValue({ ...user });
  db.organizationMember.findFirst.mockResolvedValue({ role: "ASSESSOR", user: { globalRole: "USER" } });
  db.organization.findUnique.mockResolvedValue({ active: true, subscriptionStatus: "ACTIVE", subscriptionExpiresAt: null });
  db.auditLog.findFirst.mockResolvedValue(receipt);
  db.aIAnalysisRequest.create.mockResolvedValue({ id: "00000000-0000-4000-8000-000000000001" });
  db.audit.mockResolvedValue(undefined);
  external.detect.mockImplementation(async (image: RulaNormalizedPoseImage) => pose(image));
  external.analyze.mockImplementation(async (input: AIProviderInput) => {
    await input.beforeImageTransfer!();
    return external.transport(input);
  });
  external.transport.mockResolvedValue({ provider: "test-vision", model: "fixture-model", answer, citations: [], confidence: .9, usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 } });
  external.usage.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllEnvs());

async function withApp(run: (app: FastifyInstance) => Promise<void>) {
  const app = Fastify();
  await app.register(jwt, { secret: "local-pose-route-test-secret" });
  await app.register(multipart);
  app.setErrorHandler((error, _request, reply) => {
    const failure = error as Error & { statusCode?: number; code?: string; retryable?: boolean };
    return reply.status(failure.statusCode ?? 500).send({ error: { code: failure.code ?? "INTERNAL_ERROR", message: failure.message, retryable: failure.retryable } });
  });
  await app.register(registerAssessmentRoutes);
  try { await run(app); } finally { await app.close(); }
}

function request(app: FastifyInstance, authenticated = true, activityInfo?: Record<string, unknown>) {
  const boundary = "local-pose-route-boundary";
  const fields = Object.entries({ imageSubject: "SELF", bodySide: "RIGHT", locale: "en", ...(activityInfo ? { activityInfo: JSON.stringify(activityInfo) } : {}) }).map(([name, value]) =>
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));
  const payload = Buffer.concat([
    ...fields,
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="synthetic.png"\r\nContent-Type: image/png\r\n\r\n`),
    readFileSync(new URL("../../frontend/test-fixtures/rula-ai-synthetic.png", import.meta.url)),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return app.inject({ method: "POST", url: "/api/v1/rula/posture-image-analysis", headers: {
    ...(authenticated ? { authorization: `Bearer ${app.jwt.sign({ sub: user.id })}` } : {}),
    "x-organization-id": "pose-org", "content-type": `multipart/form-data; boundary=${boundary}`,
  }, payload });
}

function expectNoInference() {
  expect(external.detect).not.toHaveBeenCalled();
  expect(external.analyze).not.toHaveBeenCalled();
  expect(external.transport).not.toHaveBeenCalled();
}

describe("RULA local pose route integration", () => {
  it("returns and durably saves only activity-derived adjustments without changing measurement review", async () => withApp(async app => {
    const response = await request(app, true, { jobTitle: "Synthetic operator", taskDescription: "Lift a supplied load", loadWeight: 5, loadUnit: "KG", postureHoldDuration: 2, postureHoldUnit: "MINUTE" });
    expect(response.statusCode, response.body).toBe(200);
    const data = response.json().data;
    expect(data.sides.RIGHT.adjustments).toEqual({ force: 2, muscleUse: true });
    expect(data.sides.RIGHT.neck).toMatchObject({ detected: false, requiresReview: true, measurement: { state: "UNMEASURABLE" } });
    expect(db.aIAnalysisRequest.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ output: expect.objectContaining({ sides: expect.objectContaining({ RIGHT: expect.objectContaining({ adjustments: { force: 2, muscleUse: true } }) }) }) }) }));
    expect(external.transport).toHaveBeenCalledOnce();
  }));
  it("authorizes before CPU inference and persists native coordinates instead of VLM dots", async () => withApp(async app => {
    const response = await request(app);
    expect(response.statusCode, response.body).toBe(200);
    expect(external.detect).toHaveBeenCalledOnce();
    const image = external.detect.mock.calls[0]![0] as RulaNormalizedPoseImage;
    expect(image).toMatchObject({ width: 512, height: 512, normalized: true });
    expect(image.buffer.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(external.analyze).toHaveBeenCalledOnce();
    expect(external.transport).toHaveBeenCalledOnce();
    expect(external.detect.mock.invocationCallOrder[0]).toBeLessThan(external.transport.mock.invocationCallOrder[0]!);
    expect(db.user.findFirst.mock.invocationCallOrder[0]).toBeLessThan(external.detect.mock.invocationCallOrder[0]!);
    const data = response.json().data;
    expect(data.sides.RIGHT.overlay.points.shoulder).toEqual({ x: .4, y: .2, confidence: .9 });
    expect(data.sides.RIGHT.overlay.points.neck).toBeUndefined();
    expect(data.sides.RIGHT.upperArm.measurement.trustedSource).toBe("AI_ANGLE_AUDIT");
    expect(db.aIAnalysisRequest.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      organizationId: "pose-org", userId: user.id,
      output: expect.objectContaining({ sides: expect.objectContaining({ RIGHT: expect.objectContaining({ overlay: data.sides.RIGHT.overlay }) }) }),
    }) }));
    const auditIndex = db.audit.mock.calls.findIndex(call => call[1] === "RULA_IMAGE_TRANSFER_AUTHORIZED");
    expect(auditIndex).toBeGreaterThanOrEqual(0);
    expect(db.audit.mock.invocationCallOrder[auditIndex]).toBeLessThan(external.transport.mock.invocationCallOrder[0]!);
    expect(external.usage).toHaveBeenCalledOnce();
  }));

  it.each(["missing", "obsolete"])("rejects %s consent before local or external inference", async state => withApp(async app => {
    db.auditLog.findFirst.mockResolvedValue(state === "missing" ? null : { ...receipt, metadata: { ...receipt.metadata, policyVersion: "image-processing-account-2026-10-22-v2" } });
    const response = await request(app);
    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe("IMAGE_PROCESSING_ACCOUNT_CONSENT_REQUIRED");
    expectNoInference();
  }));

  it("rejects unauthenticated requests before CPU inference", async () => withApp(async app => {
    const response = await request(app, false);
    expect(response.statusCode).toBe(401);
    expectNoInference();
  }));

  it("rejects a viewer before CPU inference", async () => withApp(async app => {
    db.organizationMember.findFirst.mockResolvedValue({ role: "VIEWER", user: { globalRole: "USER" } });
    const response = await request(app);
    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe("FORBIDDEN");
    expectNoInference();
  }));

  it.each(["disabled", "quota"])("checks %s AI access before CPU inference", async state => withApp(async app => {
    db.user.findFirst.mockResolvedValue({ ...user, ...(state === "disabled" ? { aiEnabled: false } : { aiTokensUsed: user.aiTokenLimit }) });
    const response = await request(app);
    expect(response.statusCode).toBe(state === "disabled" ? 403 : 429);
    expect(response.json().error.code).toBe(state === "disabled" ? "AI_ACCESS_DISABLED" : "AI_ACCESS_LIMIT_REACHED");
    expectNoInference();
  }));

  it.each([0, 2])("abstains on %s detected bodies before calling the external provider", async count => withApp(async app => {
    external.detect.mockImplementation(async (image: RulaNormalizedPoseImage) => ({ ...pose(image), poses: Array.from({ length: count }, () => pose(image).poses[0]!) }));
    const response = await request(app);
    expect(response.statusCode).toBe(422);
    expect(response.json().error).toMatchObject({ code: "RULA_IMAGE_AI_QUALITY_REVIEW", retryable: false });
    expect(external.detect).toHaveBeenCalledOnce();
    expect(external.analyze).not.toHaveBeenCalled();
    expect(external.usage).not.toHaveBeenCalled();
    expect(db.aIAnalysisRequest.create).not.toHaveBeenCalled();
  }));

  it("fails closed when the CPU worker is unavailable without a VLM fallback or persistence", async () => withApp(async app => {
    external.detect.mockRejectedValue(Object.assign(new Error("Local posture localization is unavailable"), { statusCode: 503, code: "RULA_POSE_UNAVAILABLE", retryable: false }));
    const response = await request(app);
    expect(response.statusCode).toBe(503);
    expect(response.json().error).toMatchObject({ code: "RULA_POSE_UNAVAILABLE", retryable: false });
    expect(external.detect).toHaveBeenCalledOnce();
    expect(external.analyze).not.toHaveBeenCalled();
    expect(external.usage).not.toHaveBeenCalled();
    expect(db.aIAnalysisRequest.create).not.toHaveBeenCalled();
  }));

  it("rechecks consent after CPU work and stops external image transfer after withdrawal", async () => withApp(async app => {
    external.detect.mockImplementation(async (image: RulaNormalizedPoseImage) => {
      db.auditLog.findFirst.mockResolvedValue(null);
      return pose(image);
    });
    const response = await request(app);
    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe("IMAGE_PROCESSING_ACCOUNT_CONSENT_REQUIRED");
    expect(external.detect).toHaveBeenCalledOnce();
    expect(external.analyze).not.toHaveBeenCalled();
    expect(external.usage).not.toHaveBeenCalled();
    expect(db.aIAnalysisRequest.create).not.toHaveBeenCalled();
  }));
});
