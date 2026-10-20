import { describe, expect, it } from "vitest";
import { translate } from "./i18n";

describe("compact RULA image workspace", () => {
  it("uses concise controls and distinguishes an unsent image from a failed inference", () => {
    expect(translate("assessment.rulaImageEdit", "fa")).toBe("ویرایش");
    expect(translate("assessment.rulaImageStatusFailed", "fa")).toBe("تحلیل تکمیل نشد");
    expect(translate("assessment.rulaImagePlatformNotApproved", "fa")).toBe("تحلیل خودکار تصاویر فعال نشده است.");
    expect(translate("assessment.rulaImageUploadAndAnalyze", "fa")).toBe("بارگذاری عکس");
    expect(translate("assessment.rulaImageSendForAnalysis", "fa")).toBe("تحلیل تصویر");
    expect(translate("assessment.rulaImageConsentRequired", "fa")).toBe("برای تحلیل خودکار، پردازش تصویر را یک‌بار در تنظیمات حساب فعال کنید.");
  });
});

describe("registered assessment chart labels", () => {
  it("uses concise workflow labels and identifies the FMEA distribution", () => {
    expect(translate("report.registeredActive", "fa")).toBe("درجریان");
    expect(translate("report.remainingRecommendations", "fa")).toBe("باقی مانده");
    expect(translate("report.riskDistribution", "fa")).toBe("توزیع سطح ریسک FMEA");
    expect(translate("report.registeredActive", "en")).toBe("In progress");
    expect(translate("report.remainingRecommendations", "en")).toBe("Remaining");
    expect(translate("report.riskDistribution", "en")).toBe("FMEA risk-level distribution");
  });
});

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

describe("FMEA report list counts", () => {
  it("renders the exact remaining count in localized digits", () => {
    expect(translate("report.showMoreFailureModes", "fa", { count: (6).toLocaleString("fa-IR") })).toBe("نمایش موارد بیشتر (۶)");
    expect(translate("report.showMoreActions", "fa", { count: (3).toLocaleString("fa-IR") })).toBe("نمایش اقدامات بیشتر (۳)");
    expect(translate("report.showMoreFailureModes", "en", { count: (6).toLocaleString("en-US") })).toBe("Show more failure modes (6)");
    expect(translate("report.showMoreActions", "en", { count: (3).toLocaleString("en-US") })).toBe("Show more actions (3)");
  });
});

describe("pending navigation copy", () => {
  it("uses short localized coming-soon labels without exposing implementation jargon", () => {
    expect(translate("comingSoon.title", "fa")).toBe("به‌زودی");
    expect(translate("comingSoon.title", "en")).toBe("Coming soon");
    for (const locale of ["fa", "en"] as const) {
      const pendingCopy = [
        translate("comingSoon.checklistsDescription", locale),
        translate("comingSoon.incidentsDescription", locale),
      ].join(" ");
      expect(pendingCopy).not.toMatch(/api|contract|قرارداد|پیاده‌سازی/iu);
      expect(pendingCopy).toMatch(/yet|not available|هنوز|در دسترس/iu);
    }
  });

  it("keeps assessment suggestions clearly advisory without naming a model", () => {
    expect(translate("report.proposedActionsDescription", "fa")).toContain("HSE");
    expect(translate("report.proposedActionsDescription", "en")).toContain("HSE review");
    expect(translate("report.proposedActionsDescription", "fa")).not.toContain("GPT-5");
    expect(translate("report.proposedActionsDescription", "en")).not.toContain("GPT-5");
  });
});
