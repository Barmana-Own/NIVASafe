import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const jwt = (exp: number) => `e30.${btoa(JSON.stringify({ exp }))}.test-signature`;
const original = () => ({ accessToken: jwt(Math.floor(Date.now() / 1000) - 1), refreshToken: "synthetic-refresh-old", user: { id: "synthetic-user", email: "synthetic@example.com", displayName: "Synthetic" }, organizations: [{ id: "synthetic-org", nameFa: "آزمایشی", nameEn: "Synthetic", role: "HSE_SPECIALIST" }] });
const renewed = () => ({ accessToken: jwt(Math.floor(Date.now() / 1000) + 900), refreshToken: "synthetic-refresh-new" });
function storage() { const values = new Map<string, string>(); return { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); }, removeItem: (k: string) => { values.delete(k); } }; }
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

describe("session renewal at the shared API boundary", () => {
  beforeEach(() => { vi.resetModules();vi.stubGlobal("localStorage", storage());vi.stubGlobal("sessionStorage", storage());vi.stubGlobal("window", { location: { pathname: "/", assign: vi.fn() }, dispatchEvent: vi.fn() });vi.stubGlobal("navigator", {}); });
  afterEach(() => { vi.unstubAllGlobals();vi.resetModules(); });

  it("refreshes once before parallel dashboard, notification and quota calls, without initial 401s", async () => {
    const client = await import("./client");client.saveSession(original());const next = renewed();
    const fetcher = vi.fn(async (url: string, init: RequestInit) => {
      if (url.endsWith("/auth/refresh")) return json({ data: next });
      expect((init.headers as Record<string, string>).authorization).toBe(`Bearer ${next.accessToken}`);
      return json({ data: {} });
    });vi.stubGlobal("fetch", fetcher);
    await Promise.all([client.api("/dashboard"), client.api("/notifications/summary"), client.api("/me/ai-quota")]);
    expect(fetcher.mock.calls.filter(([url]) => url.endsWith("/auth/refresh"))).toHaveLength(1);
    expect(fetcher.mock.calls[0][0]).toContain("/auth/refresh");
  });
  it("uses a newer session for a late 401 instead of rotating the already-revoked refresh token again", async () => {
    const client = await import("./client");client.saveSession({ ...original(), accessToken: jwt(Math.floor(Date.now() / 1000) + 900) });
    let resolveLate!: (value: Response) => void;let dashboardCalls = 0;let refreshCalls = 0;
    const late = new Promise<Response>(r => { resolveLate = r; });
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.endsWith("/auth/refresh")) { refreshCalls++;return json({ data: renewed() }); }
      if (url.endsWith("/dashboard") && dashboardCalls++ === 0) return json({ error: { code: "UNAUTHORIZED" } }, 401);
      if (url.endsWith("/notifications/summary") && dashboardCalls < 2) return late;
      return json({ data: {} });
    }));
    const dashboard = client.api("/dashboard"), notifications = client.api("/notifications/summary");await dashboard;resolveLate(json({ error: { code: "UNAUTHORIZED" } }, 401));await notifications;
    expect(refreshCalls).toBe(1);
  });
  it("does not renew an old session before submitting a login request", async () => {
    const client = await import("./client");client.saveSession(original());const fetcher = vi.fn(async () => json({ error: { code: "INVALID_CREDENTIALS" } }, 401));vi.stubGlobal("fetch", fetcher);
    await expect(client.api("/auth/login", { method: "POST", body: "{}" })).rejects.toMatchObject({ status: 401, code: "INVALID_CREDENTIALS" });expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("renews before protected logout so the server can revoke the actual refresh session", async () => {
    const client = await import("./client");client.saveSession(original());const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {calls.push(url);return url.endsWith("/auth/refresh")?json({data:renewed()}):json({data:{}});}));
    await client.api("/auth/logout",{method:"POST"});expect(calls.map(x=>x.slice(x.lastIndexOf('/')))).toEqual(['/refresh','/logout']);
  });
  it("retains the session on a transient refresh/network outage and sends no protected request", async () => {
    const client = await import("./client");client.saveSession(original());const fetcher = vi.fn(async () => { throw new TypeError("synthetic offline"); });vi.stubGlobal("fetch", fetcher);
    await expect(client.api("/dashboard")).rejects.toMatchObject({ code: "NETWORK_ERROR" });expect(client.getSession().session).not.toBeNull();expect(fetcher).toHaveBeenCalledTimes(1);expect(window.location.assign).not.toHaveBeenCalled();
  });
  it("does not restore a session that was logged out while renewal was in flight", async () => {
    const client = await import("./client");client.saveSession(original());let resolveRefresh!: (value: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(r => { resolveRefresh = r; })));
    const request = client.api("/dashboard");await vi.waitFor(() => expect(resolveRefresh).toBeTypeOf("function"));client.clearSession();resolveRefresh(json({ data: renewed() }));
    await expect(request).rejects.toMatchObject({ code: "REQUEST_CONTEXT_CHANGED" });expect(client.getSession().session).toBeNull();
  });
  it("does not dispatch an old-organization write after the user changes workspace during renewal", async () => {
    const client = await import("./client");const source = original();source.organizations.push({ ...source.organizations[0], id: "other-synthetic-org" });client.saveSession(source);let resolveRefresh!: (value: Response) => void;
    const fetcher = vi.fn(() => new Promise<Response>(r => { resolveRefresh = r; }));vi.stubGlobal("fetch", fetcher);
    const request = client.api("/fmea/synthetic/report/save", { method: "POST", body: "{}" });await vi.waitFor(() => expect(resolveRefresh).toBeTypeOf("function"));client.selectOrganization("other-synthetic-org");resolveRefresh(json({ data: renewed() }));
    await expect(request).rejects.toMatchObject({ code: "REQUEST_CONTEXT_CHANGED" });expect(fetcher).toHaveBeenCalledTimes(1);expect(client.getSession().orgId).toBe("other-synthetic-org");
  });
  it("rechecks the shared session inside the cross-tab lock before rotating credentials", async () => {
    const client = await import("./client");const source = original();client.saveSession(source);const next = renewed();
    const lock = vi.fn(async (_name: string, action: () => Promise<unknown>) => { client.saveSession({ ...source, ...next });return action(); });vi.stubGlobal("navigator", { locks: { request: lock } });const fetcher = vi.fn(async () => json({ data: {} }));vi.stubGlobal("fetch", fetcher);
    await client.api("/dashboard");expect(lock).toHaveBeenCalledOnce();expect(fetcher).toHaveBeenCalledTimes(1);expect(fetcher.mock.calls[0]).toBeDefined();
  });
  it("renews before authenticated downloads as well", async () => {
    const client = await import("./client");client.saveSession(original());const next = renewed();const fetcher = vi.fn(async (url: string, init: RequestInit) => { if(url.endsWith("/auth/refresh"))return json({ data: next });expect((init.headers as Record<string,string>).authorization).toBe(`Bearer ${next.accessToken}`);return new Response("%PDF-synthetic"); });vi.stubGlobal("fetch", fetcher);
    expect(await (await client.download("/reports/fmea/synthetic.pdf")).text()).toBe("%PDF-synthetic");expect(fetcher.mock.calls[0][0]).toContain("/auth/refresh");
  });
  it("clears only the rejected active session when its refresh token is revoked", async () => {
    const client = await import("./client");client.saveSession(original());const fetcher = vi.fn(async () => json({ error: { code: "REFRESH_REVOKED" } }, 401));vi.stubGlobal("fetch", fetcher);
    await expect(client.api("/dashboard")).rejects.toMatchObject({ code: "SESSION_EXPIRED", status: 401 });expect(client.getSession().session).toBeNull();expect(window.location.assign).toHaveBeenCalledWith("/login");expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("preserves credentials on a temporary refresh service failure", async () => {
    const client = await import("./client");client.saveSession(original());vi.stubGlobal("fetch", vi.fn(async () => json({ error: { code: "TEMPORARILY_UNAVAILABLE" } }, 503)));
    await expect(client.api("/dashboard")).rejects.toMatchObject({ status: 503, retryable: true });expect(client.getSession().session).not.toBeNull();expect(window.location.assign).not.toHaveBeenCalled();
  });
  it("never overwrites or signs out a different account that replaced the renewing one", async () => {
    const client = await import("./client");client.saveSession(original());let resolveRefresh!: (value: Response) => void;vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(r => { resolveRefresh = r; })));
    const request = client.api("/dashboard");await vi.waitFor(() => expect(resolveRefresh).toBeTypeOf("function"));client.saveSession({ ...original(), ...renewed(), user: { ...original().user, id: "different-synthetic-user" } });resolveRefresh(json({ error: { code: "REFRESH_REVOKED" } }, 401));
    await expect(request).rejects.toMatchObject({ status: 401 });expect(client.getSession().session?.user.id).toBe("different-synthetic-user");expect(window.location.assign).not.toHaveBeenCalled();
  });
});
