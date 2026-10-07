import { describe, expect, it } from "vitest";
import { calculateMenuPlacement, menuContentHeight } from "./useMenuPlacement";

describe("dropdown viewport placement", () => {
  it("lets newly loaded content expand a flex popup instead of retaining its loading height", () => {
    expect(menuContentHeight({ scrollHeight: 238, offsetHeight: 240, clientHeight: 238, children: [{ scrollHeight: 70, clientHeight: 70 }, { scrollHeight: 1200, clientHeight: 110 }, { scrollHeight: 58, clientHeight: 58 }] })).toBe(1330);
    expect(menuContentHeight({ scrollHeight: 198, offsetHeight: 200, clientHeight: 198, children: [{ scrollHeight: 198, clientHeight: 198 }] })).toBe(200);
  });
  const bounds = { top: 8, bottom: 792 };
  it("opens above a trigger near the bottom without extending the page", () => {
    expect(calculateMenuPlacement({ top: 710, bottom: 758 }, bounds, 320)).toEqual({ side: "top", maxHeight: 320 });
  });
  it("keeps a short menu below when all options fit", () => {
    expect(calculateMenuPlacement({ top: 600, bottom: 648 }, bounds, 100)).toEqual({ side: "bottom", maxHeight: 100 });
  });
  it("uses the larger side and limits scrolling to the available space", () => {
    expect(calculateMenuPlacement({ top: 180, bottom: 230 }, { top: 8, bottom: 400 }, 320)).toEqual({ side: "top", maxHeight: 166 });
  });
  it("opens below a trigger near the top", () => {
    expect(calculateMenuPlacement({ top: 12, bottom: 60 }, bounds, 320)).toEqual({ side: "bottom", maxHeight: 320 });
  });
  it("respects an inner scroll container or a reduced visual viewport", () => {
    expect(calculateMenuPlacement({ top: 450, bottom: 500 }, { top: 300, bottom: 520 }, 275)).toEqual({ side: "top", maxHeight: 144 });
  });
  it("does not produce negative heights for an offscreen trigger", () => {
    expect(calculateMenuPlacement({ top: -50, bottom: -10 }, { top: 100, bottom: 100 }, 100).maxHeight).toBeGreaterThanOrEqual(0);
  });
  it("repositions when the viewport shrinks or asynchronously loaded options grow", () => {
    const anchor = { top: 350, bottom: 400 };
    expect(calculateMenuPlacement(anchor, bounds, 100).side).toBe("bottom");
    expect(calculateMenuPlacement(anchor, { top: 8, bottom: 500 }, 320).side).toBe("top");
  });
});
