import Fastify from "fastify";
import { beforeEach, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ user: { findUnique: vi.fn() } }));
const refresh = vi.hoisted(() => vi.fn());
vi.mock("./core.js", () => ({ prisma: db, envelope: (data: unknown) => ({ data }) }));
vi.mock("./auth-guard.js", () => ({ authenticate: async (request: any) => { if (!request.headers.authorization) throw Object.assign(Error("Unauthorized"), { statusCode: 401 }); request.actor = { userId: "self", organizationId: "org-a" }; } }));
vi.mock("./notification-feed.js", () => ({ refreshAIQuotaNotifications: refresh }));
import { registerMeRoutes } from "./modules/me.js";

beforeEach(() => { vi.resetAllMocks(); db.user.findUnique.mockResolvedValue({ active: true, aiEnabled: true, aiTokenLimit: 1_000_000, aiTokensUsed: 900_000 }); });

it("returns only the authenticated user's quota and refreshes a scoped warning", async () => {
  const app = Fastify(); await registerMeRoutes(app);
  try {
    expect((await app.inject({ url: "/api/v1/me/ai-quota" })).statusCode).toBe(401);
    const response = await app.inject({ url: "/api/v1/me/ai-quota", headers: { authorization: "test", "x-user-id": "attacker" } });
    expect(response.statusCode).toBe(200);
    expect(response.json().data).toMatchObject({ tokenLimit: 1_000_000, tokensUsed: 900_000, remainingTokens: 100_000, state: "LOW" });
    expect(db.user.findUnique).toHaveBeenCalledWith({ where: { id: "self" }, select: { active: true, aiEnabled: true, aiTokenLimit: true, aiTokensUsed: true } });
    expect(refresh).toHaveBeenCalledWith("org-a", "self");
  } finally { await app.close(); }
});

it("does not turn notification persistence errors into quota-status failures", async () => {
  refresh.mockRejectedValueOnce(Error("notification store unavailable"));
  const app = Fastify({ logger: false }); await registerMeRoutes(app);
  try { expect((await app.inject({ url: "/api/v1/me/ai-quota", headers: { authorization: "test" } })).statusCode).toBe(200); }
  finally { await app.close(); }
});
