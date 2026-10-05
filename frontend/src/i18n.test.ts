import { describe, expect, it } from "vitest";
import { translate } from "./i18n";

describe("RULA report heading", () => {
  it("uses the concise localized assessment-results title", () => {
    expect(translate("assessment.rulaReportTitle", "fa")).toBe("نتیجه ارزیابی RULA");
    expect(translate("assessment.rulaReportTitle", "en")).toBe("RULA assessment results");
  });
});

describe("assistant offline response", () => {
  it("shows the stable localized notice instead of implying a live model connection", () => {
    expect(translate("assistant.offlineFallback", "fa")).toBe("سلام من دستیار هوشمند NIVASafe جهت مدیریت ایمنی و بهداشت حرفه‌ای هستم.\nدرحال حاضر امکان برقراری ارتباط با سرور را ندارم؛ اما به محض برقراری ارتباط پاسخگوی شما خواهم بود.");
    expect(translate("assistant.offlineFallback", "en")).toBe("Hello, I am the NIVASafe intelligent assistant for occupational health and safety management.\nThe server is currently unavailable; I will be ready to respond as soon as the connection is restored.");
  });
});
