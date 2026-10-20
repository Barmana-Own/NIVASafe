import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider, translate } from "../../i18n";
import { RulaReportContext } from "./AssessmentPages";

afterEach(() => vi.unstubAllGlobals());

describe("RULA activity information report layout", () => {
  it.each(["fa", "en"] as const)("keeps long activity text complete and the report compact in %s", (locale) => {
    vi.stubGlobal("localStorage", { getItem: () => locale });
    const longTask = Array.from({ length: 8 }, () => locale === "fa"
      ? "مواد اولیه از محل نگهداری برداشته شده و با ابزار دستی به دستگاه منتقل می‌شوند"
      : "Materials are collected from storage and manually moved to the processing equipment").join("؛ ");
    const longPosture = Array.from({ length: 5 }, () => locale === "fa"
      ? "کاربر برای انجام کار خم می‌شود و وضعیت بدن را در طول فعالیت حفظ می‌کند"
      : "The worker bends to perform the task and maintains the posture during the activity").join("؛ ");
    const markup = renderToStaticMarkup(<LocaleProvider><RulaReportContext locale={locale} activityInfo={{
      jobTitle: locale === "fa" ? "اپراتور تولید" : "Production operator",
      taskDescription: longTask,
      postureDescription: longPosture,
      durationPerOccurrence: 45,
      durationUnit: "MINUTE",
      repetitionsPerShift: 24,
      postureHoldDuration: 12,
      postureHoldUnit: "SECOND",
      loadWeight: 8,
      loadUnit: "KG",
    }}/></LocaleProvider>);

    expect(markup).toContain('class="rula-report-context-field-wide rula-report-context-job"');
    expect(markup).toContain('class="rula-report-context-field-wide rula-report-context-task"');
    expect(markup).toContain(longTask);
    expect(markup).toContain(longPosture);
    expect(markup).toContain(translate("assessment.rulaProcessDetails", locale));
    expect(markup).not.toContain(translate("assessment.rulaProcessDetailsHint", locale));
    expect(markup.match(/class="rula-report-context-field-wide/g)).toHaveLength(2);
    expect(markup).toContain(locale === "fa" ? "۴۵" : "45");
    expect(markup).toContain(locale === "fa" ? "۲۴" : "24");
    expect(markup).toContain(locale === "fa" ? "۸" : "8");
  });
});
