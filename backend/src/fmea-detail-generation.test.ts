import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const mocks = vi.hoisted(() => ({
  analyze: vi.fn(), audit: vi.fn(),
  db: { fmeaAssessment: { findFirst: vi.fn(), update: vi.fn() }, fmeaItem: { findMany: vi.fn(), createMany: vi.fn() }, auditLog: { findFirst: vi.fn(), create: vi.fn() }, $transaction: vi.fn() },
}));
vi.mock("./core.js", () => ({ prisma: mocks.db, audit: mocks.audit, requireOrg: () => "org-a", requirePermission: vi.fn(), envelope: (data: unknown) => ({ data }), parse: (schema: z.ZodType, data: unknown) => schema.parse(data) }));
vi.mock("./auth-guard.js", () => ({ authenticate: async (request: { actor: unknown }) => { request.actor = { organizationId: "org-a", userId: "user-a" }; } }));
vi.mock("./ai-provider.js", () => ({ getAvailableAssessmentAIProvider: () => ({ name: "test-provider", analyze: mocks.analyze }) }));
vi.mock("./ai-usage.js", () => ({ recordAIUsage: vi.fn() }));
import { registerReportRoutes } from "./modules/reports.js";

const id = "00000000-0000-4000-8000-000000000001";
const rows = (count: number) => Array.from({ length: count }, (_, index) => ({ processStep: "Assembly", failureMode: `Failure ${index}`, effect: "Injury", cause: "Missing guard", preventiveControls: "Guard", detectionControls: "Inspection", recommendation: "Fit guard", severity: 7, occurrence: 3, detection: 4 }));
beforeEach(() => {
  vi.resetAllMocks();
  mocks.db.fmeaAssessment.findFirst.mockResolvedValue({ id, title: "Assembly", project: { name: "Plant" }, jobCatalog: null, items: [] });
  mocks.db.auditLog.findFirst.mockResolvedValue(null);
  mocks.db.fmeaItem.findMany.mockResolvedValue([]);
  mocks.db.fmeaItem.createMany.mockImplementation(async ({ data }: { data: unknown[] }) => ({ count: data.length }));
  mocks.db.$transaction.mockImplementation(async (operation: (tx: unknown) => Promise<unknown>) => operation(mocks.db));
});

describe("FMEA registered-assessment detail generation", () => {
  it.each(["timeout", "invalid-response"])("does not create fabricated risk rows after %s", async (failure) => {
    if (failure === "timeout") mocks.analyze.mockRejectedValue(Object.assign(new Error("private provider error"), { code: "PROVIDER_TIMEOUT" }));
    else mocks.analyze.mockResolvedValue({ provider: "test-provider", answer: "not a risk assessment" });
    const app = Fastify(); await app.register(registerReportRoutes);
    try {
      const response = await app.inject({ method: "POST", url: `/api/v1/fmea/${id}/report/detail-suggestions`, payload: { locale: "en", autoCreate: true } });
      expect(response.statusCode).toBe(503);
      expect(response.json().code).toBe("FMEA_AI_UNAVAILABLE");
      expect(response.json().data).toBeUndefined();
      expect(response.body).not.toContain("private provider error");
      expect(mocks.db.fmeaItem.createMany).not.toHaveBeenCalled();
    } finally { await app.close(); }
  });
  it.each([0, 2, 8, 20, 25])("auto-creates the model-selected %i rows subject to the twenty-row cap", async (count) => {
    mocks.analyze.mockResolvedValue({ provider: "test-provider", answer: JSON.stringify({ rows: rows(count) }) });
    const app = Fastify(); await app.register(registerReportRoutes);
    try {
      const response = await app.inject({ method: "POST", url: `/api/v1/fmea/${id}/report/detail-suggestions`, payload: { locale: "en", autoCreate: true } });
      expect(response.statusCode).toBe(200);
      expect(response.json().data).toMatchObject({ createdCount: Math.min(count, 20), aiStatus: "connected", maximum: 20 });
      if (count) expect(mocks.db.fmeaItem.createMany.mock.calls[0]![0].data).toHaveLength(Math.min(count, 20));
      else expect(mocks.db.fmeaItem.createMany).not.toHaveBeenCalled();
      expect(mocks.analyze.mock.calls[0]![0]).toMatchObject({ organizationId: "org-a", userId: "user-a", maxOutputTokens: 8000 });
      expect(mocks.db.fmeaAssessment.findFirst.mock.calls[0]![0].where).toMatchObject({ organizationId: "org-a", deletedAt: null });
    } finally { await app.close(); }
  });
  it("does not repeat automatic insertion or overwrite existing rows", async () => {
    mocks.analyze.mockResolvedValue({ provider: "test-provider", answer: JSON.stringify({ rows: rows(20) }) });
    mocks.db.auditLog.findFirst.mockResolvedValue({ id: "previous-seed" });
    const app = Fastify(); await app.register(registerReportRoutes);
    try {
      const response = await app.inject({ method: "POST", url: `/api/v1/fmea/${id}/report/detail-suggestions`, payload: { locale: "en", autoCreate: true } });
      expect(response.statusCode).toBe(200); expect(response.json().data.createdCount).toBe(0);
      expect(mocks.db.fmeaItem.createMany).not.toHaveBeenCalled();
    } finally { await app.close(); }
  });
});
