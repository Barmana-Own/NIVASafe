import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { audit } from "./core.js";

const db = vi.hoisted(() => ({
  project: { findFirst: vi.fn() },
  rulaAssessment: { findFirst: vi.fn() },
  correctiveAction: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
}));
const permission = vi.hoisted(() => vi.fn());
vi.mock("./core.js", () => ({
  prisma: db, audit: vi.fn(), envelope: (data: unknown) => ({ data }), pageParams: vi.fn(),
  requireOrg: () => "organization-a", requirePermission: permission,
  parse: (schema: z.ZodType, value: unknown) => {
    const result = schema.safeParse(value);
    if (!result.success) throw Object.assign(new Error("Invalid input"), { statusCode: 400 });
    return result.data;
  },
}));
vi.mock("./auth-guard.js", () => ({ authenticate: async (request: { headers: Record<string, string>; actor?: unknown }) => {
  if (!request.headers.authorization) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  request.actor = { userId: "user-a", organizationId: "organization-a" };
} }));
import { registerActionRoutes } from "./modules/actions.js";

const id = "00000000-0000-4000-8000-000000000001";
const existing = { id, projectId: id, rulaId: id, fmeaId: null, fmeaItemId: null, bodySide: "RIGHT", status: "IN_PROGRESS", progress: 50 };
beforeEach(() => {
  vi.resetAllMocks();
  db.correctiveAction.findFirst.mockResolvedValue(existing);
  db.correctiveAction.findUnique.mockResolvedValue(null);
  db.project.findFirst.mockResolvedValue({ id });
  db.rulaAssessment.findFirst.mockResolvedValue({ id, bodySide: "RIGHT" });
  db.correctiveAction.update.mockImplementation(async ({ data }) => ({ ...existing, ...data }));
  db.correctiveAction.create.mockImplementation(async ({ data }) => ({ id, ...data }));
});

describe("RULA action workflow HTTP persistence", () => {
  it("retries one create idempotently and rejects reuse of the same key with changed content", async () => {
    let saved: Record<string, unknown> | null = null;
    db.correctiveAction.findUnique.mockImplementation(async () => saved);
    db.correctiveAction.create.mockImplementation(async ({ data }) => { saved = { id: data.id, organizationId: "organization-a", ...data }; return saved; });
    const app = Fastify(); await app.register(registerActionRoutes);
    try {
      const request = { method: "POST" as const, url: "/api/v1/actions", headers: { authorization: "test", "idempotency-key": "nivasafe-action-form:attempt-1" }, payload: { projectId: id, title: "Inspect equipment", description: "Check the guard" } };
      const first = await app.inject(request);
      const retry = await app.inject(request);
      expect(first.statusCode).toBe(201);
      expect(first.json().data).not.toHaveProperty("createRequestHash");
      expect(retry.statusCode).toBe(200);
      expect(retry.json().data.id).toBe(first.json().data.id);
      expect(db.correctiveAction.create).toHaveBeenCalledOnce();
      expect(audit).toHaveBeenCalledOnce();

      saved = { ...saved!, status: "COMPLETED", progress: 100, title: "Updated after creation" };
      const afterUpdate = await app.inject(request);
      expect(afterUpdate.statusCode).toBe(200);
      expect(afterUpdate.json().data.id).toBe(first.json().data.id);

      const conflicting = await app.inject({ ...request, payload: { ...request.payload, title: "Different action" } });
      expect(conflicting.statusCode).toBe(409);
      expect(conflicting.json().code).toBe("IDEMPOTENCY_KEY_REUSED");
      expect(db.correctiveAction.create).toHaveBeenCalledOnce();
    } finally { await app.close(); }
  });

  it("collapses concurrent retries to one persisted action and one audit event", async () => {
    let saved: Record<string, unknown> | null = null;
    let arrivals = 0;
    let release!: () => void;
    const bothArrived = new Promise<void>((resolve) => { release = resolve; });
    db.correctiveAction.findUnique.mockImplementation(async () => saved);
    db.correctiveAction.create.mockImplementation(async ({ data }) => {
      arrivals += 1;
      if (arrivals === 2) release();
      await bothArrived;
      if (saved) throw Object.assign(new Error("Unique constraint"), { code: "P2002" });
      saved = { id: data.id, organizationId: "organization-a", ...data };
      return saved;
    });
    const app = Fastify(); await app.register(registerActionRoutes);
    try {
      const request = { method: "POST" as const, url: "/api/v1/actions", headers: { authorization: "test", "idempotency-key": "nivasafe-action-form:parallel-1" }, payload: { projectId: id, title: "Inspect equipment", description: "Check the guard" } };
      const responses = await Promise.all([app.inject(request), app.inject(request)]);
      expect(responses.map((response) => response.statusCode).sort()).toEqual([200, 201]);
      expect(new Set(responses.map((response) => response.json().data.id)).size).toBe(1);
      expect(db.correctiveAction.create).toHaveBeenCalledTimes(2);
      expect(audit).toHaveBeenCalledOnce();
    } finally { await app.close(); }
  });

  it("persists selection as in-progress and completion as 100%, ignoring a conflicting supplied progress", async () => {
    const app = Fastify(); await app.register(registerActionRoutes);
    try {
      const selected = await app.inject({ method: "POST", url: "/api/v1/actions", headers: { authorization: "test" }, payload: {
        projectId: id, rulaId: id, bodySide: "RIGHT", title: "Adjust work surface", description: "Adjust height", status: "IN_PROGRESS",
        rulaImpact: { suggestionId: "adjust-work-surface", scoreReduction: 1, affectedParts: ["neck", "trunk"] },
      } });
      expect(selected.statusCode).toBe(201);
      expect(selected.json().data).toMatchObject({ status: "IN_PROGRESS", progress: 50, organizationId: "organization-a" });
      const response = await app.inject({ method: "PATCH", url: `/api/v1/actions/${id}`, headers: { authorization: "test" }, payload: { status: "COMPLETED", progress: 0 } });
      expect(response.statusCode).toBe(200);
      expect(response.json().data).toMatchObject({ status: "COMPLETED", progress: 100 });
      expect(db.correctiveAction.findFirst).toHaveBeenCalledWith({ where: { id, organizationId: "organization-a" } });
      expect(db.rulaAssessment.findFirst.mock.calls[0]![0].where).toMatchObject({ organizationId: "organization-a", projectId: id });
    } finally { await app.close(); }
  });
  it("cannot complete a missing or cross-tenant action", async () => {
    db.correctiveAction.findFirst.mockResolvedValue(null);
    const app = Fastify(); await app.register(registerActionRoutes);
    try {
      const response = await app.inject({ method: "PATCH", url: `/api/v1/actions/${id}`, headers: { authorization: "test", "x-organization-id": "other-org" }, payload: { status: "COMPLETED" } });
      expect(response.statusCode).toBe(404);
      expect(db.correctiveAction.update).not.toHaveBeenCalled();
    } finally { await app.close(); }
  });
  it("rejects unauthenticated, forbidden and invalid completion requests", async () => {
    const app = Fastify(); await app.register(registerActionRoutes);
    try {
      const request = { method: "PATCH" as const, url: `/api/v1/actions/${id}`, payload: { status: "COMPLETED" } };
      expect((await app.inject(request)).statusCode).toBe(401);
      permission.mockImplementation(() => { throw Object.assign(new Error("Forbidden"), { statusCode: 403 }); });
      expect((await app.inject({ ...request, headers: { authorization: "test" } })).statusCode).toBe(403);
      permission.mockImplementation(() => undefined);
      expect((await app.inject({ ...request, headers: { authorization: "test" }, payload: { status: "INVALID" } })).statusCode).toBe(400);
      expect(db.correctiveAction.update).not.toHaveBeenCalled();
    } finally { await app.close(); }
  });
});
