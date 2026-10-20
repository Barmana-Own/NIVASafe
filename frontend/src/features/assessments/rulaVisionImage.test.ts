import { describe, expect, it, vi, afterEach } from "vitest";
import { prepareRulaVisionImage, rulaVisionDimensions } from "./rulaVisionImage";

afterEach(() => vi.unstubAllGlobals());
describe("RULA analysis-only image optimization", () => {
  it("preserves aspect ratio without cropping or upscaling", () => {
    expect(rulaVisionDimensions(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(rulaVisionDimensions(3000, 4000)).toEqual({ width: 1200, height: 1600 });
    expect(rulaVisionDimensions(600, 800)).toEqual({ width: 600, height: 800 });
  });
  it("rejects invalid dimensions", () => {
    for (const width of [0, -1, Infinity, NaN]) expect(() => rulaVisionDimensions(width, 800)).toThrow();
  });
  it("preserves original small files and safely handles decode failures", async () => {
    const decode = vi.fn().mockRejectedValue(new Error("unsupported image"));
    vi.stubGlobal("createImageBitmap", decode);
    const small = new File(["test"], "original.png", { type: "image/png" });
    expect(await prepareRulaVisionImage(small)).toBe(small);
    expect(decode).not.toHaveBeenCalled();
    const large = new File([new Uint8Array(600_000)], "original.png", { type: "image/png" });
    expect(await prepareRulaVisionImage(large)).toBe(large);
  });
  it("sends a smaller derivative and releases bitmap resources without changing the original", async () => {
    const close = vi.fn();
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 4000, height: 3000, close }));
    const canvas = { width: 0, height: 0, getContext: () => ({ fillStyle: "", fillRect: vi.fn(), drawImage: vi.fn() }), toBlob: (callback: (blob: Blob) => void) => callback(new Blob(["jpeg"], { type: "image/jpeg" })) };
    vi.stubGlobal("document", { createElement: () => canvas });
    const original = new File([new Uint8Array(600_000)], "original.png", { type: "image/png" });
    const result = await prepareRulaVisionImage(original);
    expect(result.type).toBe("image/jpeg");
    expect(result.size).toBeLessThan(original.size);
    expect(original.name).toBe("original.png");
    expect(canvas).toMatchObject({ width: 1600, height: 1200 });
    expect(close).toHaveBeenCalledOnce();
  });
});
