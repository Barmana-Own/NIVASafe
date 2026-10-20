import { afterEach, describe, expect, it, vi } from "vitest";

describe("API transport errors", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("identifies a network failure so the assistant can show its offline response", async () => {
    const emptyStorage = () => ({ getItem: vi.fn(() => null), removeItem: vi.fn(), setItem: vi.fn() });
    vi.stubGlobal("localStorage", emptyStorage());
    vi.stubGlobal("sessionStorage", emptyStorage());
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network unavailable")));
    const { api } = await import("./client");

    await expect(api("/chat/conversations")).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });

  it("does not misclassify an HTTP failure as an offline transport error", async () => {
    const emptyStorage = () => ({ getItem: vi.fn(() => null), removeItem: vi.fn(), setItem: vi.fn() });
    vi.stubGlobal("localStorage", emptyStorage());
    vi.stubGlobal("sessionStorage", emptyStorage());
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "UPSTREAM_FAILURE", message: "Service error" } }), { status: 503, headers: { "Content-Type": "application/json" } })));
    const { api } = await import("./client");

    await expect(api("/chat/conversations")).rejects.toMatchObject({ code: "UPSTREAM_FAILURE", status: 503 });
  });
});
