import { afterEach, describe, expect, it, vi } from "vitest";
import { getFloatingPosition } from "./Overlay";

afterEach(() => vi.unstubAllGlobals());

function setupViewport(options: { width: number; height: number; offsetLeft?: number; offsetTop?: number }) {
  vi.stubGlobal("window", {
    innerWidth: 390,
    innerHeight: 844,
    visualViewport: {
      width: options.width,
      height: options.height,
      offsetLeft: options.offsetLeft ?? 0,
      offsetTop: options.offsetTop ?? 0,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  });
  vi.stubGlobal("document", { documentElement: { clientWidth: 390, clientHeight: 844 } });
  vi.stubGlobal("getComputedStyle", () => ({ direction: "rtl" }));
}

describe("floating overlays in the visual viewport", () => {
  it("keeps a portal menu within an offset mobile visual viewport", () => {
    setupViewport({ width: 320, height: 250, offsetLeft: 10, offsetTop: 100 });
    const trigger = { getBoundingClientRect: () => ({ left: 0, right: 44, top: 120, bottom: 160, width: 44, height: 40 }) } as HTMLElement;

    expect(getFloatingPosition(trigger, { minWidth: 96, maxHeight: 240, gap: 7, margin: 8 }))
      .toEqual({ top: 167, left: 18, width: 96, maxHeight: 175, direction: "rtl" });
  });

  it("does not force a menu taller than the visible space", () => {
    setupViewport({ width: 320, height: 106 });
    const trigger = { getBoundingClientRect: () => ({ left: 30, right: 74, top: 40, bottom: 70, width: 44, height: 30 }) } as HTMLElement;

    expect(getFloatingPosition(trigger, { minWidth: 96, maxHeight: 240, gap: 7, margin: 8 }))
      .toEqual({ top: 8, left: 30, width: 96, maxHeight: 25, direction: "rtl" });
  });
});
