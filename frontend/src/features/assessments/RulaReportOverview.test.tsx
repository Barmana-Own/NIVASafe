import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider, translate } from "../../i18n";
import { RulaReportOverview } from "./RulaReportOverview";

afterEach(() => vi.unstubAllGlobals());
describe("RULA workflow overview rendering", () => {
  it.each(["fa", "en"] as const)("shows AI priorities before posture review in %s", (locale) => {
    vi.stubGlobal("localStorage", { getItem: () => locale });
    const markup = renderToStaticMarkup(<LocaleProvider><RulaReportOverview
      riskResults={[]} score={0} actionLevelLabel="Pending" actionLevelClassName="review-required"
      status="DRAFT" reviewComplete={false} reviewedPostureCount={0} totalPostureCount={7}
      sideLabel="RIGHT" mainFactor={null}
      actions={[{ priority: "LOW", status: "UNSELECTED" }, { priority: "LOW", status: "UNSELECTED" }, { priority: "LOW", status: "UNSELECTED" }]}
    /></LocaleProvider>);
    const number = (value: number) => value.toLocaleString(locale === "fa" ? "fa-IR" : "en-US");
    expect(markup).toContain('stroke="#43a27d" stroke-dasharray="100 0"');
    expect(markup).toContain(`<span>${number(3)}</span><small>${translate("assessment.rulaTotalResults", locale)}</small>`);
    expect(markup).toContain(`${translate("assessment.rulaAcceptable", locale)}: ${number(3)}`);
    expect(markup).not.toContain(translate("assessment.rulaPriorityDistributionEmpty", locale));
    expect(markup).toContain('data-status="remaining"');
    expect(markup).toContain('stroke="#bdcdd6" stroke-dasharray="100 0"');
    expect(markup).toContain(`${translate("report.remaining", locale)}: ${number(3)}`);
    // Clinical score stays unknown; priorities do not fabricate a RULA score.
    expect(markup).toContain('<strong>—</strong>');
  });

  it.each(["fa", "en"] as const)("renders actual completion and all three legend counts in %s", (locale) => {
    vi.stubGlobal("localStorage", { getItem: () => locale });
    const markup = renderToStaticMarkup(<LocaleProvider><RulaReportOverview
      riskResults={[{ actionLevel: 2 }]} score={3} actionLevelLabel="Review" actionLevelClassName="investigation"
      status="DRAFT" reviewComplete reviewedPostureCount={7} totalPostureCount={7} sideLabel="RIGHT" mainFactor={null}
      actions={[
        { priority: "LOW", status: "UNSELECTED" },
        { priority: "HIGH", status: "IN_PROGRESS", progress: 50 },
        { priority: "LOW", status: "COMPLETED", progress: 100 },
        { priority: "MEDIUM", status: "UNSELECTED" },
      ]}
    /></LocaleProvider>);
    expect(markup).toContain('aria-valuenow="25"');
    expect(markup).toContain('data-status="completed"');
    expect(markup).toContain('stroke="#138a61" stroke-dasharray="25 75" stroke-dashoffset="0"');
    expect(markup).toContain('stroke="#e19a31" stroke-dasharray="25 75" stroke-dashoffset="-25"');
    expect(markup).toContain('stroke="#bdcdd6" stroke-dasharray="50 50" stroke-dashoffset="-50"');
    expect(markup).toContain("fmea-risk-distribution-visual fmea-workflow-visual");
    const number = (value: number) => value.toLocaleString(locale === "fa" ? "fa-IR" : "en-US");
    for (const [key, count] of [["completed", 1], ["inProgress", 1], ["remaining", 2]] as const) {
      expect(markup).toContain(`${translate(`report.${key}`, locale)}: ${number(count)}`);
    }
  });
});
