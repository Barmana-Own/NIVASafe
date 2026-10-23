import { afterEach, describe, expect, it, vi } from "vitest";
import { resizeAssistantComposer } from "./AssistantPage";

function textarea(metrics: Partial<CSSStyleDeclaration> = {}, initialScrollHeight = 24) {
  const computed = { lineHeight: "24px", fontSize: "14px", paddingTop: "0px", paddingBottom: "0px", borderTopWidth: "0px", borderBottomWidth: "0px", boxSizing: "border-box", ...metrics };
  const getStyle = vi.fn(() => computed as CSSStyleDeclaration);
  vi.stubGlobal("getComputedStyle", getStyle);
  let scrollHeight = initialScrollHeight;
  const style = { minHeight: "", maxHeight: "", height: "", overflowY: "" };
  const measurements: Array<{ height: string; overflowY: string }> = [];
  const input = {
    isConnected: true,
    value: "Sample text",
    style,
    get scrollHeight() {
      measurements.push({ height: style.height, overflowY: style.overflowY });
      return scrollHeight;
    },
  } as unknown as HTMLTextAreaElement;
  return { input, style, getStyle, measurements, setScrollHeight: (next: number) => { scrollHeight = next; } };
}

afterEach(() => vi.unstubAllGlobals());

describe("assistant composer visible line sizing", () => {
  it("grows through one, two and three computed text lines", () => {
    const element = textarea();
    for (const height of [24, 48, 72]) {
      element.setScrollHeight(height);
      resizeAssistantComposer(element.input);
      expect(element.style).toEqual({ minHeight: "24px", maxHeight: "72px", height: `${height}px`, overflowY: "hidden" });
    }
  });

  it("caps pasted or wrapped content at three lines and scrolls the remainder", () => {
    const element = textarea({}, 2400);
    resizeAssistantComposer(element.input);
    expect(element.style.height).toBe("72px");
    expect(element.style.maxHeight).toBe("72px");
    expect(element.style.overflowY).toBe("auto");
  });

  it("remeasures without the previous height or scrollbar so deletion can shrink", () => {
    const element = textarea({}, 2400);
    resizeAssistantComposer(element.input);
    element.setScrollHeight(24);
    resizeAssistantComposer(element.input);
    expect(element.measurements).toEqual([{ height: "auto", overflowY: "hidden" }, { height: "auto", overflowY: "hidden" }]);
    expect(element.style.height).toBe("24px");
    expect(element.style.overflowY).toBe("hidden");
  });

  it("includes padding and borders once in a border-box height", () => {
    const element = textarea({ paddingTop: "4px", paddingBottom: "6px", borderTopWidth: "1px", borderBottomWidth: "2px" }, 58);
    resizeAssistantComposer(element.input);
    expect(element.style).toEqual({ minHeight: "37px", maxHeight: "85px", height: "61px", overflowY: "hidden" });
    element.setScrollHeight(130);
    resizeAssistantComposer(element.input);
    expect(element.style.height).toBe("85px");
    expect(element.style.overflowY).toBe("auto");
  });

  it("subtracts scrollHeight padding when sizing the content-box", () => {
    const element = textarea({ boxSizing: "content-box", paddingTop: "4px", paddingBottom: "6px", borderTopWidth: "1px", borderBottomWidth: "2px" }, 58);
    resizeAssistantComposer(element.input);
    expect(element.style).toEqual({ minHeight: "24px", maxHeight: "72px", height: "48px", overflowY: "hidden" });
  });

  it("uses the current metrics again when responsive styles change", () => {
    const element = textarea({ lineHeight: "20px" }, 40);
    resizeAssistantComposer(element.input);
    expect(element.style.height).toBe("40px");
    vi.stubGlobal("getComputedStyle", () => ({ lineHeight: "24px", fontSize: "16px", paddingTop: "0px", paddingBottom: "0px", borderTopWidth: "0px", borderBottomWidth: "0px", boxSizing: "border-box" }));
    element.setScrollHeight(96);
    resizeAssistantComposer(element.input);
    expect(element.style.height).toBe("72px");
    expect(element.style.overflowY).toBe("auto");
  });

  it("falls back to font metrics when a stylesheet leaves line-height normal", () => {
    const element = textarea({ lineHeight: "normal", fontSize: "20px" }, 48);
    resizeAssistantComposer(element.input);
    expect(element.style).toEqual({ minHeight: "24px", maxHeight: "72px", height: "48px", overflowY: "hidden" });
  });

  it("does not read layout or alter a detached composer", () => {
    const element = textarea();
    Object.defineProperty(element.input, "isConnected", { value: false });
    resizeAssistantComposer(element.input);
    expect(element.getStyle).not.toHaveBeenCalled();
    expect(element.measurements).toEqual([]);
    expect(element.style).toEqual({ minHeight: "", maxHeight: "", height: "", overflowY: "" });
  });

  it.each(["border-box", "content-box"])("keeps an empty %s composer to one line even when its placeholder wraps", (boxSizing) => {
    const element = textarea({ boxSizing, paddingTop: "4px", paddingBottom: "6px", borderTopWidth: "1px", borderBottomWidth: "2px" }, 2400);
    element.input.value = "";
    resizeAssistantComposer(element.input);
    expect(element.style.height).toBe(boxSizing === "border-box" ? "37px" : "24px");
    expect(element.style.overflowY).toBe("hidden");
    expect(element.measurements).toEqual([]);
  });
});
