import { describe, expect, it, vi } from "vitest";
import { handleTableRegionKeyDown } from "./UI";

function createKeyEvent(key: string, options: { overflowing?: boolean; targetIsRegion?: boolean; defaultPrevented?: boolean } = {}) {
  const region = {
    clientWidth: 476,
    scrollWidth: options.overflowing === false ? 476 : 1216,
    scrollBy: vi.fn(),
  };
  const target = options.targetIsRegion === false ? {} : region;
  const event = {
    key,
    target,
    currentTarget: region,
    defaultPrevented: Boolean(options.defaultPrevented),
    preventDefault: vi.fn(),
  };
  return { event, region };
}

describe("keyboard scrolling in dense table regions", () => {
  it("moves an overflowing region with the horizontal arrow keys", () => {
    const left = createKeyEvent("ArrowLeft");
    handleTableRegionKeyDown(left.event as never);
    expect(left.event.preventDefault).toHaveBeenCalledOnce();
    expect(left.region.scrollBy).toHaveBeenCalledWith({ left: -381, behavior: "auto" });

    const right = createKeyEvent("ArrowRight");
    handleTableRegionKeyDown(right.event as never);
    expect(right.event.preventDefault).toHaveBeenCalledOnce();
    expect(right.region.scrollBy).toHaveBeenCalledWith({ left: 381, behavior: "auto" });
  });

  it("leaves keys from table controls and non-scrollable regions alone", () => {
    const control = createKeyEvent("ArrowRight", { targetIsRegion: false });
    handleTableRegionKeyDown(control.event as never);
    expect(control.region.scrollBy).not.toHaveBeenCalled();
    expect(control.event.preventDefault).not.toHaveBeenCalled();

    const noOverflow = createKeyEvent("ArrowLeft", { overflowing: false });
    handleTableRegionKeyDown(noOverflow.event as never);
    expect(noOverflow.region.scrollBy).not.toHaveBeenCalled();

    const otherKey = createKeyEvent("Enter");
    handleTableRegionKeyDown(otherKey.event as never);
    expect(otherKey.region.scrollBy).not.toHaveBeenCalled();

    const alreadyHandled = createKeyEvent("ArrowLeft", { defaultPrevented: true });
    handleTableRegionKeyDown(alreadyHandled.event as never);
    expect(alreadyHandled.region.scrollBy).not.toHaveBeenCalled();
  });
});
