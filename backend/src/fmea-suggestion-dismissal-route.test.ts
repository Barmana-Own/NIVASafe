import Fastify from "fastify";
import { beforeEach, expect, it, vi } from "vitest";
import { z } from "zod";

const mocks = vi.hoisted(() => ({
  audit: vi.fn(),
  fmeaAssessmentFindFirst: vi.fn(),
  fmeaItemFindFirst: vi.fn(),
  dismissalCreateMany: vi.fn(),
  dismissalFindMany: vi.fn(),
  actionFindMany: vi.fn(),
  orgMemberFindMany: vi.fn(),
  auditFindFirst: vi.fn(),
}));

vi.mock("./core.js", () => ({
  prisma: {
    fmeaAssessment: { findFirst: mocks.fmeaAssessmentFindFirst },
    fmeaItem: { findFirst: mocks.fmeaItemFindFirst },
    fmeaSuggestionDismissal: { createMany: mocks.dismissalCreateMany, findMany: mocks.dismissalFindMany },
    correctiveAction: { findMany: mocks.actionFindMany },
    organizationMember: { findMany: mocks.orgMemberFindMany },
    auditLog: { findFirst: mocks.auditFindFirst },
  },
  audit: mocks.audit,
  requireOrg: () => "org-a",
  requirePermission: vi.fn(),
  envelope: (data: unknown) => ({ data }),
  parse: (schema: z.ZodType, data: unknown) => {
    const parsed = schema.safeParse(data);
    if (!parsed.success) throw Object.assign(Error("Invalid input"), { statusCode: 400 });
    return parsed.data;
  },
}));
vi.mock("./auth-guard.js", () => ({ authenticate: async (request: { actor: unknown }) => { request.actor = { organizationId: "org-a", userId: "user-a" }; } }));
vi.mock("./ai-provider.js", () => ({ getAvailableAssessmentAIProvider: () => ({ name: "fallback", analyze: vi.fn() }) }));
vi.mock("./ai-usage.js", () => ({ recordAIUsage: vi.fn() }));
import { registerReportRoutes } from "./modules/reports.js";

const assessmentId = "00000000-0000-4000-8000-000000000001";
const itemId = "00000000-0000-4000-8000-000000000002";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.fmeaAssessmentFindFirst.mockResolvedValue({ id: assessmentId });
  mocks.fmeaItemFindFirst.mockResolvedValue({ id: itemId });
  mocks.dismissalCreateMany.mockResolvedValue({ count: 1 });
  mocks.dismissalFindMany.mockResolvedValue([]);
  mocks.actionFindMany.mockResolvedValue([]);
  mocks.orgMemberFindMany.mockResolvedValue([]);
  mocks.auditFindFirst.mockResolvedValue(null);
});

it("persists a dismissal scoped to the authenticated user and exact assessment", async () => {
  const app = Fastify(); await app.register(registerReportRoutes);
  try {
    const response = await app.inject({ method: "POST", url: `/api/v1/fmea/${assessmentId}/report/suggestions/dismiss`, payload: { fmeaItemId: itemId, title: "Inspect guard" } });
    expect(response.statusCode).toBe(200);
    expect(mocks.fmeaItemFindFirst).toHaveBeenCalledWith({ where: { id: itemId, assessmentId }, select: { id: true } });
    expect(mocks.dismissalCreateMany.mock.calls[0]![0]).toMatchObject({
      skipDuplicates: true,
      data: [{ organizationId: "org-a", userId: "user-a", assessmentId, fmeaItemId: itemId, title: "Inspect guard" }],
    });
    mocks.dismissalCreateMany.mockResolvedValueOnce({ count: 0 });
    const repeated = await app.inject({ method: "POST", url: `/api/v1/fmea/${assessmentId}/report/suggestions/dismiss`, payload: { fmeaItemId: itemId, title: "Inspect guard" } });
    expect(repeated.statusCode).toBe(200);
    expect(mocks.dismissalCreateMany).toHaveBeenCalledTimes(2);
    expect(mocks.audit).toHaveBeenCalledTimes(1);
  } finally { await app.close(); }
});

it("returns the authenticated user's persisted dismissals when the report is reloaded", async () => {
  mocks.fmeaAssessmentFindFirst.mockResolvedValueOnce({
    id: assessmentId, title: "Assembly", code: "FMEA-1", status: "APPROVED", version: 1,
    createdAt: new Date("2026-01-01T00:00:00Z"), updatedAt: new Date("2026-01-02T00:00:00Z"), approvedAt: null,
    project: { id: "00000000-0000-4000-8000-000000000003", name: "Plant", code: "P1" },
    organization: { nameFa: "شرکت", nameEn: "Company" }, jobCatalog: null,
    items: [{ id: itemId, rowNumber: 1, processStep: "Assembly", failureMode: "Missing guard", effect: "Injury", cause: "No guard", preventiveControls: null, detectionControls: null, severity: 7, occurrence: 3, detection: 4, recommendation: "Inspect guard" }],
  });
  mocks.dismissalFindMany.mockResolvedValue([{ fmeaItemId: itemId, title: "Inspect guard" }]);
  const app = Fastify(); await app.register(registerReportRoutes);
  try {
    const response = await app.inject({ method: "GET", url: `/api/v1/fmea/${assessmentId}/report`, headers: { authorization: "test" } });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.dismissedSuggestions).toEqual([{ fmeaItemId: itemId, title: "Inspect guard" }]);
    expect(mocks.dismissalFindMany).toHaveBeenCalledWith({ where: { organizationId: "org-a", userId: "user-a", assessmentId }, select: { fmeaItemId: true, title: true } });
  } finally { await app.close(); }
});

it("rejects an item outside the requested assessment without persisting a dismissal", async () => {
  mocks.fmeaItemFindFirst.mockResolvedValue(null);
  const app = Fastify(); await app.register(registerReportRoutes);
  try {
    const response = await app.inject({ method: "POST", url: `/api/v1/fmea/${assessmentId}/report/suggestions/dismiss`, payload: { fmeaItemId: itemId, title: "Inspect guard" } });
    expect(response.statusCode).toBe(404);
    expect(mocks.dismissalCreateMany).not.toHaveBeenCalled();
  } finally { await app.close(); }
});
