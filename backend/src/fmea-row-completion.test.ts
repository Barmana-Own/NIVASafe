import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
const mocks = vi.hoisted(() => ({
  query: vi.fn(), row: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn(), transaction: vi.fn(), permission: vi.fn(), audit: vi.fn(),
}));
vi.mock("./core.js", () => ({
  prisma: { $transaction: mocks.transaction }, audit: mocks.audit, envelope: (data: unknown) => ({ data }), pageParams: vi.fn(),
  requireOrg: () => "tenant-a", requirePermission: mocks.permission,
  parse: (schema: z.ZodType, input: unknown) => {
    const result = schema.safeParse(input);
    if (!result.success) throw Object.assign(new Error("Invalid input"), { statusCode: 400 });
    return result.data;
  },
}));
vi.mock("./auth-guard.js", () => ({ authenticate: async (request: { headers: Record<string, string> }) => {
  if (!request.headers.authorization) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
} }));
import { registerActionRoutes } from "./modules/actions.js";
const id = "00000000-0000-4000-8000-000000000001";
const itemId = "00000000-0000-4000-8000-000000000002";
const tx = { $queryRaw: mocks.query, fmeaItem: { findUniqueOrThrow: mocks.row }, correctiveAction: { count: mocks.count, create: mocks.create, updateMany: mocks.update } };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.transaction.mockImplementation(callback => callback(tx));
  mocks.query.mockResolvedValue([{ id: itemId }]);
  mocks.row.mockResolvedValue({ assessment: { projectId: id }, recommendation: "Adjust fixture", failureMode: "Incorrect assembly", riskLevel: "HIGH" });
  mocks.count.mockResolvedValue(0);
});
async function request(payload: Record<string, unknown> = {}, authorization = "test", url = `/api/v1/fmea/${id}/items/${itemId}/complete`) {
  const app = Fastify(); await app.register(registerActionRoutes);
  try { return await app.inject({ method: "POST", url, headers: authorization ? { authorization } : {}, payload }); }
  finally { await app.close(); }
}
describe("FMEA row completion HTTP boundary", () => {
  it("protects independent suggestion registration with authentication and permission", async () => {
    const url = `/api/v1/fmea/${id}/items/${itemId}/register-action`;
    expect((await request({}, "", url)).statusCode).toBe(401);
    mocks.permission.mockImplementation(() => { throw Object.assign(new Error("Forbidden"), { statusCode: 403 }); });
    expect((await request({}, "test", url)).statusCode).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("rejects injected registration fields and oversized action titles before persistence", async () => {
    const url = `/api/v1/fmea/${id}/items/${itemId}/register-action`;
    const body = { title: "Adjust fixture", description: "Install locating pins", organizationId: "foreign" };
    expect((await request(body, "test", url)).statusCode).toBe(400);
    expect((await request({ title: "x".repeat(192), description: "Description" }, "test", url)).statusCode).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("creates a completed linked control and serializes retries with a tenant-scoped row lock", async () => {
    mocks.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    expect((await request()).statusCode).toBe(200);
    expect((await request()).statusCode).toBe(200);
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.create.mock.calls[0]?.[0].data).toMatchObject({ organizationId: "tenant-a", fmeaId: id, fmeaItemId: itemId, status: "COMPLETED", progress: 100 });
    expect(mocks.update.mock.calls[0]?.[0].data).toEqual({ status: "COMPLETED", progress: 100 });
    const sql = mocks.query.mock.calls[0]?.[0];
    expect(sql.sql).toContain("FOR UPDATE");
    expect(sql.sql).not.toContain(itemId);
    expect(sql.values).toEqual([itemId, id, "tenant-a"]);
  });
  it("completes all active controls and preserves cancelled/rejected controls", async () => {
    mocks.count.mockResolvedValue(3);
    expect((await request()).statusCode).toBe(200);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update.mock.calls[0]?.[0].where).toMatchObject({ organizationId: "tenant-a", fmeaItemId: itemId, status: { notIn: ["CANCELLED", "REJECTED"] } });
  });
  it("does not mutate a cross-tenant, wrong-assessment, deleted or missing row", async () => {
    mocks.query.mockResolvedValue([]);
    expect((await request()).statusCode).toBe(404);
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled();
  });
  it("requires authentication and update permission before locking data", async () => {
    expect((await request({}, "")).statusCode).toBe(401);
    mocks.permission.mockImplementation(() => { throw Object.assign(new Error("Forbidden"), { statusCode: 403 }); });
    expect((await request()).statusCode).toBe(403);
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it("rejects mass assignment and invalid identifiers", async () => {
    expect((await request({ organizationId: "other", progress: 0 })).statusCode).toBe(400);
    expect((await request({}, "test", "/api/v1/fmea/invalid/items/invalid/complete")).statusCode).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("propagates transaction failures without claiming completion or auditing success", async () => {
    mocks.create.mockRejectedValue(new Error("Database unavailable"));
    expect((await request()).statusCode).toBe(500);
    expect(mocks.audit).not.toHaveBeenCalled();
  });
});
