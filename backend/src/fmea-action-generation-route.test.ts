import Fastify from "fastify";
import { beforeEach, expect, it, vi } from "vitest";
import { z } from "zod";

const mocks = vi.hoisted(() => ({ assessment: vi.fn(), audit: vi.fn(), analyze: vi.fn(), usage: vi.fn() }));
vi.mock("./core.js", () => ({
  prisma: { fmeaAssessment: { findFirst: mocks.assessment }, correctiveAction: { findMany: async () => [] }, organizationMember: { findMany: async () => [] }, fmeaSuggestionDismissal: { findMany: async () => [] }, auditLog: { findFirst: async () => null } },
  audit: mocks.audit, requireOrg: () => "synthetic-org", requirePermission: vi.fn(), envelope: (data: unknown) => ({ data }),
  parse: (schema: z.ZodType, data: unknown) => schema.parse(data),
}));
vi.mock("./auth-guard.js", () => ({ authenticate: async (request: { actor: unknown }) => { request.actor = { organizationId: "synthetic-org", userId: "synthetic-user" }; } }));
vi.mock("./ai-provider.js", () => ({ getAvailableAssessmentAIProvider: () => ({ name: "arvancloud", analyze: mocks.analyze }) }));
vi.mock("./ai-usage.js", () => ({ recordAIUsage: mocks.usage }));
import { registerReportRoutes } from "./modules/reports.js";

const id = "00000000-0000-4000-8000-000000000001", item = "00000000-0000-4000-8000-000000000002";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.assessment.mockResolvedValue({ id, title: "Synthetic", code: "TEST", status: "DRAFT", version: 1, createdAt: new Date(), updatedAt: new Date(), approvedAt: null, project: { id, name: "Synthetic", code: "TEST" }, organization: { nameFa: "مصنوعی", nameEn: "Synthetic" }, jobCatalog: null, items: [{ id: item, rowNumber: 1, processStep: "Inspection", failureMode: "Missing guard", effect: "Injury", cause: "No guard", preventiveControls: null, detectionControls: null, severity: 7, occurrence: 3, detection: 4, recommendation: "Inspect guard" }] });
});
async function submit() {
  const app = Fastify();await app.register(registerReportRoutes);
  try { return await app.inject({ method: "POST", url: `/api/v1/fmea/${id}/report/action-suggestions`, payload: { locale: "en", excludeTitles: [] } }); }
  finally { await app.close(); }
}
it("uses the bounded five-action structured profile and genuine parsed AI output", async () => {
  mocks.analyze.mockResolvedValue({ provider: "arvancloud", model: "gpt-5-mini-2025-08-07", answer: JSON.stringify({ actions: [{ rowNumber: 1, title: "Fit guard", description: "Fit and verify the guard before operation.", priority: "HIGH" }] }) });
  const response = await submit();expect(response.statusCode).toBe(200);expect(response.json().data).toMatchObject({ aiStatus: "connected", reasonCode: null });
  expect(mocks.analyze).toHaveBeenCalledWith(expect.objectContaining({ textPurpose: "fmea-action-suggestions", structuredOutput: true, userId: "synthetic-user", organizationId: "synthetic-org" }));
  expect(mocks.analyze.mock.calls[0]![0].message).toContain("Return at most 5 concise corrective actions");
  expect(response.json().data.suggestions[0]).toMatchObject({ source: "AI", fmeaItemId: item });expect(mocks.usage).toHaveBeenCalledOnce();
});
it("preserves existing suggestions and audits only a safe timeout code", async () => {
  mocks.analyze.mockRejectedValue(Object.assign(new Error("Sensitive provider body must not escape"), { code: "PROVIDER_TIMEOUT" }));
  const response = await submit();expect(response.statusCode).toBe(200);expect(response.json().data).toMatchObject({ aiStatus: "fallback", model: null, reasonCode: "AI_TIMEOUT" });
  expect(response.body).not.toContain("Sensitive");expect(response.json().data.suggestions[0].source).toBe("FALLBACK");
  expect(mocks.audit.mock.calls[0]![4]).toMatchObject({ aiStatus: "fallback", reasonCode: "AI_TIMEOUT" });expect(mocks.usage).not.toHaveBeenCalled();
});
it("never labels a provider HTTP success with invalid or unmapped JSON as connected AI", async () => {
  mocks.analyze.mockResolvedValue({ provider: "arvancloud", model: "gpt-5-mini-2025-08-07", answer: '{"actions":[{"rowNumber":999,"title":"Unmapped"}]}' });
  const response = await submit();expect(response.json().data).toMatchObject({ aiStatus: "fallback", model: null, reasonCode: "AI_INVALID_RESPONSE" });expect(mocks.usage).toHaveBeenCalledOnce();
});
