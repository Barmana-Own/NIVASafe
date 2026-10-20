import { describe, expect, it, vi } from "vitest";
import { warmStaticRoutes } from "./staticRouteWarmup";

describe("PWA code warmup", () => {
  it("loads assets sequentially and retries failures without repeating cached modules", async () => {
    const first = vi.fn().mockResolvedValue(undefined);
    const second = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
    const loaded = new Set<() => Promise<unknown>>();
    expect(await warmStaticRoutes([first, second], () => true, loaded)).toEqual({ loaded: 1, failed: 1 });
    expect(await warmStaticRoutes([first, second], () => true, loaded)).toEqual({ loaded: 2, failed: 0 });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(2);
  });
  it("stops warming on disposal or loss of connection", async () => {
    let active = true;
    const first = vi.fn(async () => { active = false; });
    const second = vi.fn();
    expect(await warmStaticRoutes([first, second], () => active, new Set())).toEqual({ loaded: 1, failed: 0 });
    expect(second).not.toHaveBeenCalled();
  });
});
