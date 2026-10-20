import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../i18n";
import { RulaPostureImageCard } from "./RulaPostureImageCard";

afterEach(() => vi.unstubAllGlobals());
const noop = () => undefined;
function render(props: Partial<Parameters<typeof RulaPostureImageCard>[0]> = {}, locale = "fa") {
  vi.stubGlobal("localStorage", { getItem: () => locale });
  return renderToStaticMarkup(<LocaleProvider><RulaPostureImageCard index={1} selected status="error" onSelect={noop} onEdit={noop} {...props}/></LocaleProvider>);
}

describe("compact RULA photo presentation", () => {
  it("shows an unsent image without claiming provider failure or printing platform diagnostics", () => {
    const html = render({ blocked: true, errorMessage: "private-policy-details", preview: "blob:synthetic" });
    expect(html).toContain("ارسال نشده");
    expect(html).toContain("تصویر ۱");
    expect(html).not.toContain("private-policy-details");
    expect(html).not.toContain("تحلیل این تصویر ناموفق بود");
    expect(html).not.toContain("/support");
    expect(html).not.toContain("RULA:");
    expect(html).toContain('data-analysis-state="not-sent"');
  });

  it("keeps a genuine failed analysis recoverable and clearly unsuccessful", () => {
    const html = render({ errorMessage: "پاسخ قابل بررسی نبود", onRetry: noop });
    expect(html).toContain("تحلیل تکمیل نشد");
    expect(html).toContain("پاسخ قابل بررسی نبود");
    expect(html).toContain("ویرایش");
    expect(html).toContain("تلاش دوباره");
    expect(html).not.toContain("/support");
  });

  it("disables editing while a real request is pending", () => {
    const html = render({ status: "loading" });
    expect(html).toMatch(/<button[^>]*class="secondary rula-image-edit"[^>]*disabled/);
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain("RULA:");
  });

  it("retains result metadata and review content for successful images", () => {
    const html = render({ status: "ready", model: "gpt-5-mini-2025-08-07", children: <span>Review required</span> }, "en");
    expect(html).toContain("Image 1");
    expect(html).toContain("Analysis ready to review");
    expect(html).toContain("gpt-5-mini-2025-08-07");
    expect(html).toContain("Review required");
  });

  it("does not accept or render arbitrary file names as visible labels", () => {
    const html = render({ preview: "blob:synthetic", onRemove: noop });
    expect(html).toContain('alt=""');
    expect(html).toContain("حذف عکس");
    expect(html).not.toContain(".png");
  });
});
