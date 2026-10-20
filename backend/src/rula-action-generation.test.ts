import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { calculateRula } from "@nivasafe/domain";
import { fallbackRulaPostureAnalysis, rulaInputsForAnalysis } from "./rula-report.js";
import { rulaActivityInfoSchema } from "./rula-process.js";

const mocks = vi.hoisted(() => ({ analyze: vi.fn(), audit: vi.fn(), usage: vi.fn(), permission: vi.fn(), findFirst: vi.fn(), snapshot: vi.fn() }));
vi.mock("./core.js", () => ({
  prisma: { rulaAssessment: { findFirst: mocks.findFirst }, auditLog: { findFirst: mocks.snapshot } }, audit: mocks.audit,
  requireOrg: (request: { headers: Record<string, string> }) => {
    if (!request.headers["x-organization-id"]) throw Object.assign(new Error("Organization required"), { statusCode: 400 });
    return request.headers["x-organization-id"];
  },
  requirePermission: mocks.permission, envelope: (data: unknown) => ({ data }),
  parse: (schema: z.ZodType, value: unknown) => {
    const parsed = schema.safeParse(value);
    if (!parsed.success) throw Object.assign(new Error("Invalid input"), { statusCode: 400 });
    return parsed.data;
  },
}));
vi.mock("./auth-guard.js", () => ({ authenticate: async (request: { headers: Record<string, string>; actor: unknown }) => {
  if (!request.headers.authorization) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  request.actor = { userId: "user-a", organizationId: request.headers["x-organization-id"] };
} }));
vi.mock("./ai-provider.js", () => ({ getAvailableAssessmentAIProvider: () => ({ name: "test-provider", analyze: mocks.analyze }) }));
vi.mock("./ai-usage.js", async (importOriginal) => ({ ...(await importOriginal<typeof import("./ai-usage.js")>()), recordAIUsage: mocks.usage }));
import { generateRulaActionSuggestions, rulaActionSuggestionBodySchema } from "./rula-action-generation.js";
import { parseRulaActionSuggestions } from "./assessment-action-suggestions.js";
import { registerAssessmentRoutes } from "./modules/assessments.js";
import { registerReportRoutes } from "./modules/reports.js";

const inputs = { upperArm: 2, lowerArm: 1, wrist: 1, wristTwist: 1, neck: 3, trunk: 2, legs: 1, muscleUse: true, force: 1 };
const analysis = fallbackRulaPostureAnalysis(inputs);
const payload = { bodySide: "RIGHT", inputs, postureAnalysis: analysis, locale: "en" };
const headers = { authorization: "test", "x-organization-id": "org-a" };
const id = "00000000-0000-4000-8000-000000000001";
const actions = (count: number) => Array.from({ length: count }, (_, index) => ({ titleFa: `اقدام ${index}`, titleEn: `Action ${index}`, descriptionFa: "تنظیم سطح کار", descriptionEn: "Adjust work surface", priority: "HIGH", scoreReduction: 1, affectedParts: ["neck"], bodySide: "RIGHT" }));
const result = (answer: string) => ({ provider: "test-provider", model: "test-model", answer, citations: [], confidence: 0.8, usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 } });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.snapshot.mockResolvedValue(null);
  mocks.analyze.mockResolvedValue(result(JSON.stringify({ actions: actions(2) })));
  mocks.findFirst.mockResolvedValue({ id, inputs, postureAnalysis: analysis, bodySide: "RIGHT", score: 1, actionLevel: 1, actions: [], activityInfo: null });
});

describe("RULA corrective generation", () => {
  it("sends every independent photo observation to the report AI", async () => {
    const imageAssessments = [{ imageKey: "one", fileName: "one.png", analysis, force: 0, muscleUse: false }, { imageKey: "two", fileName: "two.png", analysis: { ...analysis, trunk: { ...analysis.trunk, score: 4 } }, force: 2, muscleUse: true }];
    await generateRulaActionSuggestions({ organizationId: "org-a", userId: "user-a", bodySide: "RIGHT", inputs, analysis: { ...analysis, imageAssessments }, locale: "en" });
    const message = mocks.analyze.mock.calls[0]?.[0].message;
    expect(message).toContain('"fileName":"one.png"');
    expect(message).toContain('"fileName":"two.png"');
    expect(message).toContain("analyse every supplied posture");
    expect(message).toContain("current RULA score: 7");
    expect(message).not.toContain("evaluationRows");
    expect(message).not.toContain("imageOverlay");
  });
  it("automatically recovers malformed AI actions without accepting placeholder rows", async () => {
    mocks.analyze.mockResolvedValueOnce(result("not JSON")).mockResolvedValueOnce(result(JSON.stringify({ actions: actions(2) })));
    const output = await generateRulaActionSuggestions({ organizationId: "org-a", userId: "user-a", bodySide: "RIGHT", inputs, analysis, locale: "en" });
    expect(output.response.aiStatus).toBe("connected"); expect(output.response.suggestions).toHaveLength(2); expect(mocks.analyze).toHaveBeenCalledTimes(2);
    expect(output.usageResult).toMatchObject({ usage: { inputTokens: 20, outputTokens: 10, totalTokens: 30 } });
  });
  it.each([1, 2, 20, 25])("returns only the model-selected actions up to twenty (%i)", async (count) => {
    mocks.analyze.mockResolvedValue(result(JSON.stringify({ actions: actions(count) })));
    const { response } = await generateRulaActionSuggestions({ organizationId: "org-a", userId: "user-a", bodySide: "RIGHT", inputs, analysis, locale: "en" });
    expect(response).toMatchObject({ aiStatus: "connected", reasonCode: null, maximum: 20, minimum: 0 });
    expect(response.suggestions).toHaveLength(Math.min(count, 20));
    expect(response.suggestions.every((action) => action.source === "AI")).toBe(true);
    expect(mocks.analyze).toHaveBeenCalledWith(expect.objectContaining({ maxOutputTokens: 6000, includeKnowledge: false, locale: "en" }));
  });
  it.each(["not JSON", '{"actions":[]}', '{"actions":[{}]}', '{"actions":"bad"}'])("does not claim connected for unusable output: %s", async (answer) => {
    mocks.analyze.mockResolvedValue(result(answer));
    const output = await generateRulaActionSuggestions({ organizationId: "org-a", userId: "user-a", bodySide: "RIGHT", inputs, analysis, locale: "en" });
    const { response } = output;
    expect(response).toMatchObject({ aiStatus: "unavailable", reasonCode: "AI_INVALID_RESPONSE" });
    expect(response.suggestions.every((action) => action.source === "FALLBACK")).toBe(true);
    expect(output.usageResult).toMatchObject({ usage: { inputTokens: 20, outputTokens: 10, totalTokens: 30 } });
  });
  it("returns a safe reason on provider failure without disclosing the error", async () => {
    mocks.analyze.mockRejectedValue(new Error("SECRET_TOKEN provider stack trace"));
    const output = await generateRulaActionSuggestions({ organizationId: "org-a", userId: "user-a", bodySide: "RIGHT", inputs, analysis, locale: "en" });
    expect(output.response).toMatchObject({ aiStatus: "unavailable", reasonCode: "AI_UNAVAILABLE" });
    expect(JSON.stringify(output)).not.toContain("SECRET_TOKEN");
  });
  it("does not parse local fallback prose as AI output", async () => {
    mocks.analyze.mockResolvedValue({ ...result(JSON.stringify({ actions: actions(2) })), provider: "fallback", usedFallback: true });
    const { response } = await generateRulaActionSuggestions({ organizationId: "org-a", userId: "user-a", bodySide: "RIGHT", inputs, analysis, locale: "en" });
    expect(response).toMatchObject({ aiStatus: "fallback", reasonCode: "AI_UNAVAILABLE" });
    expect(response.suggestions.every((action) => action.source === "FALLBACK")).toBe(true);
  });
  it("does not pad when all model actions are already registered", async () => {
    const { response } = await generateRulaActionSuggestions({ organizationId: "org-a", userId: "user-a", bodySide: "RIGHT", inputs, analysis, locale: "en", existingActionTitles: ["Action 0", "Action 1"] });
    expect(response).toMatchObject({ suggestions: [], aiStatus: "connected", reasonCode: null });
  });
  it("recalculates independent BOTH scores and sends the worse side as the primary score", async () => {
    const left = { ...analysis, upperArm: { ...analysis.upperArm, score: 5 }, trunk: { ...analysis.trunk, score: 5 } };
    const right = fallbackRulaPostureAnalysis({ ...inputs, neck: 1, trunk: 1 });
    await generateRulaActionSuggestions({ organizationId: "org-a", userId: "user-a", bodySide: "BOTH", inputs, analysis: { ...analysis, sideAnalyses: { LEFT: left, RIGHT: right } }, locale: "en" });
    const leftResult = calculateRula(rulaInputsForAnalysis(inputs, left));
    const rightResult = calculateRula(rulaInputsForAnalysis(inputs, right));
    const prompt = mocks.analyze.mock.calls[0]![0].message;
    expect(prompt).toContain(`current RULA score: ${Math.max(leftResult.score, rightResult.score)}`);
    expect(prompt).toContain(JSON.stringify({ LEFT: { score: leftResult.score, actionLevel: leftResult.actionLevel }, RIGHT: { score: rightResult.score, actionLevel: rightResult.actionLevel } }));
  });
  it("deduplicates parser output and preserves independent sides", () => {
    const row = actions(1)[0]!;
    const parsed = parseRulaActionSuggestions(JSON.stringify({ actions: [row, { ...row, titleEn: " action 0 " }, { ...row, bodySide: "LEFT" }, ...actions(25)] }), "BOTH");
    expect(parsed.length).toBeLessThanOrEqual(20);
    expect(parsed.filter((action) => action.titleEn.toLowerCase() === "action 0").map((action) => action.bodySide)).toEqual(["RIGHT", "LEFT"]);
  });
  it("validates existing input/posture/activity schemas and BOTH sides", () => {
    expect(rulaActivityInfoSchema.safeParse({ jobTitle: "", taskDescription: "" }).success).toBe(false);
    expect(rulaActionSuggestionBodySchema.parse({ ...payload, locale: undefined }).locale).toBe("fa");
    for (const invalid of [
      { ...payload, score: 1 }, { ...payload, inputs: { ...inputs, force: 4 } },
      { ...payload, postureAnalysis: {} }, { ...payload, bodySide: "BOTH" },
      { ...payload, locale: "xx" }, { ...payload, activityInfo: { jobTitle: "Operator", taskDescription: "Inspection", durationPerOccurrence: 5 } },
    ]) expect(rulaActionSuggestionBodySchema.safeParse(invalid).success).toBe(false);
    expect(rulaActionSuggestionBodySchema.safeParse({ ...payload, bodySide: "BOTH", postureAnalysis: { ...analysis, sideAnalyses: { LEFT: analysis, RIGHT: analysis } } }).success).toBe(true);
  });
});

describe("RULA draft and saved routes", () => {
  function durableSnapshotStore() {
    const records = new Map<string, unknown>();
    mocks.snapshot.mockImplementation(async ({ where }) => {
      const metadata = records.get(where.organizationId + ":" + where.entityId);
      return metadata ? { metadata } : null;
    });
    mocks.audit.mockImplementation(async (request, action, _type, assessmentId, metadata) => {
      if (action === "RULA_REPORT_AI_SNAPSHOT") records.set(request.actor.organizationId + ":" + assessmentId, structuredClone(metadata));
    });
    return records;
  }
  it("keeps first suggestions after revisits and a fresh API instance", async () => {
    const records = durableSnapshotStore();
    const app = await appForRoutes();
    const first = await app.inject({ method: "POST", url: `/api/v1/rula/${id}/report/action-suggestions`, headers, payload: {} });
    expect(first.statusCode).toBe(200);
    await app.close();
    const reopened = await appForRoutes();
    try {
      mocks.findFirst.mockResolvedValue({ id, inputs, postureAnalysis: analysis, bodySide: "RIGHT", score: 7, actionLevel: 4, actions: [], activityInfo: null, project: { name: "Test" }, updatedAt: new Date() });
      const second = await reopened.inject({ method: "POST", url: `/api/v1/rula/${id}/report/action-suggestions`, headers, payload: { locale: "en", excludeTitles: ["Action 0"] } });
      expect(second.json()).toEqual(first.json());
      const report = await reopened.inject({ method: "GET", url: `/api/v1/rula/${id}/report`, headers });
      expect(report.statusCode).toBe(200);
      expect(report.json().data.suggestionSnapshot).toEqual(first.json().data);
      expect(report.json().data.suggestedActions).toEqual(first.json().data.suggestions);
      expect(records.size).toBe(1);
      expect(mocks.analyze).toHaveBeenCalledTimes(1);
      expect(mocks.usage).toHaveBeenCalledTimes(1);
    } finally { await reopened.close(); }
  });
  it("coalesces concurrent first requests", async () => {
    const records = durableSnapshotStore();
    const app = await appForRoutes();
    try {
      const responses = await Promise.all(Array.from({ length: 4 }, () => app.inject({ method: "POST", url: `/api/v1/rula/${id}/report/action-suggestions`, headers, payload: {} })));
      expect(responses.every(response => response.statusCode === 200)).toBe(true);
      expect(responses.every(response => response.body === responses[0]!.body)).toBe(true);
      expect(mocks.analyze).toHaveBeenCalledTimes(1);
      expect(records.size).toBe(1);
    } finally { await app.close(); }
  });
  it.each([false, true])("persists empty or unavailable results without refresh retries: %s", async unavailable => {
    durableSnapshotStore();
    if (unavailable) mocks.analyze.mockRejectedValue(new Error("private provider error"));
    const app = await appForRoutes();
    try {
      const request = { method: "POST" as const, url: `/api/v1/rula/${id}/report/action-suggestions`, headers, payload: { excludeTitles: ["Action 0", "Action 1"] } };
      const first = await app.inject(request);
      const calls = mocks.analyze.mock.calls.length;
      expect((await app.inject(request)).json()).toEqual(first.json());
      expect(mocks.analyze).toHaveBeenCalledTimes(calls);
      if (!unavailable) expect(first.json().data.suggestions).toEqual([]);
      expect(first.body).not.toContain("private provider error");
    } finally { await app.close(); }
  });
  it("checks permissions and ownership before reading a snapshot", async () => {
    durableSnapshotStore();
    const app = await appForRoutes();
    try {
      const request = { method: "POST" as const, url: `/api/v1/rula/${id}/report/action-suggestions`, headers, payload: {} };
      await app.inject(request);
      mocks.findFirst.mockResolvedValue(null);
      expect((await app.inject({ ...request, headers: { ...headers, "x-organization-id": "org-b" } })).statusCode).toBe(404);
      expect(mocks.analyze).toHaveBeenCalledTimes(1);
      mocks.permission.mockImplementation(() => { throw Object.assign(new Error("Forbidden"), { statusCode: 403 }); });
      expect((await app.inject(request)).statusCode).toBe(403);
    } finally { await app.close(); }
  });
  async function appForRoutes() {
    const app = Fastify();
    await app.register(rateLimit, { global: false });
    await app.register(registerAssessmentRoutes);
    await app.register(registerReportRoutes);
    return app;
  }
  it.each([
    { jobTitle: "", taskDescription: "" },
    { jobTitle: "   ", taskDescription: "   ", postureDescription: "Neck flexion" },
    { jobTitle: "م", taskDescription: "ک" },
    { postureDescription: "Standing assembly" },
  ])("reaches AI when advisory task context is incomplete: %j", async activityInfo => {
    const app = await appForRoutes();
    try {
      const response = await app.inject({ method: "POST", url: "/api/v1/rula/action-suggestions", headers, payload: { ...payload, activityInfo } });
      expect(response.statusCode).toBe(200);
      expect(response.json().data).toMatchObject({ aiStatus: "connected", reasonCode: null });
      expect(response.json().data.suggestions).toHaveLength(2);
      expect(mocks.analyze).toHaveBeenCalledTimes(1);
    } finally { await app.close(); }
  });
  it("still rejects oversized or malformed optional context before contacting AI", async () => {
    const app = await appForRoutes();
    try {
      for (const activityInfo of [{ jobTitle: "x".repeat(181) }, { taskDescription: "x".repeat(501) }, { jobTitle: {} }, { durationPerOccurrence: 3 }]) {
        expect((await app.inject({ method: "POST", url: "/api/v1/rula/action-suggestions", headers, payload: { ...payload, activityInfo } })).statusCode).toBe(400);
      }
      expect(mocks.analyze).not.toHaveBeenCalled();
    } finally { await app.close(); }
  });
  it.each(["draft", "saved"])("routes %s generation through actual AI with server-calculated score and usage/audit", async (route) => {
    const app = await appForRoutes();
    const adjustedAnalysis = { ...analysis, neck: { ...analysis.neck, score: 5 } };
    mocks.findFirst.mockResolvedValue({ id, inputs, postureAnalysis: adjustedAnalysis, bodySide: "RIGHT", score: 1, actionLevel: 1, actions: [], activityInfo: null });
    try {
      const response = await app.inject({ method: "POST", url: route === "draft" ? "/api/v1/rula/action-suggestions" : `/api/v1/rula/${id}/report/action-suggestions`, headers, payload: route === "draft" ? { ...payload, postureAnalysis: adjustedAnalysis } : { locale: "en" } });
      expect(response.statusCode).toBe(200);
      expect(response.json().data.suggestions).toHaveLength(2);
      expect(mocks.permission).toHaveBeenCalledWith(expect.anything(), route === "draft" ? "assessments.create" : "reports.generate");
      const calculation = calculateRula(rulaInputsForAnalysis(inputs, adjustedAnalysis));
      expect(mocks.analyze.mock.calls[0]![0].message).toContain(`current RULA score: ${calculation.score}; action level: ${calculation.actionLevel}`);
      expect(mocks.usage).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ useCase: "risk", sourceType: "RULA_ACTION_SUGGESTIONS", organizationId: "org-a", userId: "user-a" }));
      expect(mocks.audit).toHaveBeenCalledWith(expect.anything(), route === "draft" ? "RULA_DRAFT_ACTION_SUGGESTIONS" : "RULA_REPORT_ACTION_SUGGESTIONS", expect.anything(), route === "draft" ? undefined : id, expect.objectContaining({ useCase: "risk", aiStatus: "connected" }));
      if (route === "saved") expect(mocks.findFirst.mock.calls[0]![0].where).toEqual({ id, organizationId: "org-a" });
    } finally { await app.close(); }
  });
  it("rejects unauthenticated, forbidden, missing-org and invalid requests before AI execution", async () => {
    const app = await appForRoutes();
    try {
      const request = { method: "POST" as const, url: "/api/v1/rula/action-suggestions", payload };
      expect((await app.inject(request)).statusCode).toBe(401);
      expect((await app.inject({ ...request, headers: { authorization: "test" } })).statusCode).toBe(400);
      mocks.permission.mockImplementation(() => { throw Object.assign(new Error("Forbidden"), { statusCode: 403 }); });
      expect((await app.inject({ ...request, headers })).statusCode).toBe(403);
      mocks.permission.mockImplementation(() => undefined);
      expect((await app.inject({ ...request, headers, payload: { ...payload, score: 1 } })).statusCode).toBe(400);
      expect(mocks.analyze).not.toHaveBeenCalled();
    } finally { await app.close(); }
  });
  it("records the first invalid attempt before returning a quota error on retry", async () => {
    mocks.analyze.mockResolvedValueOnce(result("malformed output")).mockRejectedValueOnce(Object.assign(new Error("quota reached"), { statusCode: 429, code: "AI_ACCESS_LIMIT_REACHED" }));
    const app = await appForRoutes();
    try {
      const response = await app.inject({ method: "POST", url: "/api/v1/rula/action-suggestions", headers, payload });
      expect(response.statusCode).toBe(429);
      expect(mocks.usage).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ result: expect.objectContaining({ usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 } }) }));
    } finally { await app.close(); }
  });
  it.each(["draft", "saved"])("reports malformed AI output safely through the %s route", async (route) => {
    mocks.analyze.mockResolvedValue(result("malformed output"));
    const app = await appForRoutes();
    try {
      const response = await app.inject({ method: "POST", url: route === "draft" ? "/api/v1/rula/action-suggestions" : `/api/v1/rula/${id}/report/action-suggestions`, headers, payload: route === "draft" ? payload : {} });
      expect(response.statusCode).toBe(200);
      expect(response.json().data).toMatchObject({ aiStatus: "unavailable", reasonCode: "AI_INVALID_RESPONSE" });
      expect(mocks.usage).toHaveBeenCalled();
      expect(mocks.audit.mock.calls[0]![4]).toMatchObject({ aiStatus: "unavailable", reasonCode: "AI_INVALID_RESPONSE" });
    } finally { await app.close(); }
  });
  it("honors saved-route excluded titles without adding fallback actions", async () => {
    const app = await appForRoutes();
    try {
      const response = await app.inject({ method: "POST", url: `/api/v1/rula/${id}/report/action-suggestions`, headers, payload: { excludeTitles: ["Action 0", "Action 1"] } });
      expect(response.statusCode).toBe(200);
      expect(response.json().data).toMatchObject({ suggestions: [], aiStatus: "connected", reasonCode: null });
    } finally { await app.close(); }
  });
  it("limits draft requests to eight per minute", async () => {
    const app = await appForRoutes();
    try {
      for (let index = 0; index < 8; index++) expect((await app.inject({ method: "POST", url: "/api/v1/rula/action-suggestions", headers, payload })).statusCode).toBe(200);
      expect((await app.inject({ method: "POST", url: "/api/v1/rula/action-suggestions", headers, payload })).statusCode).toBe(429);
      expect(mocks.analyze).toHaveBeenCalledTimes(8);
    } finally { await app.close(); }
  });
  it("returns 404 for saved assessments outside the organization", async () => {
    mocks.findFirst.mockResolvedValue(null);
    const app = await appForRoutes();
    try {
      expect((await app.inject({ method: "POST", url: `/api/v1/rula/${id}/report/action-suggestions`, headers, payload: {} })).statusCode).toBe(404);
      expect(mocks.analyze).not.toHaveBeenCalled();
    } finally { await app.close(); }
  });
});
