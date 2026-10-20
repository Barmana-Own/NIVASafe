import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider, translate } from "../../i18n";
import { buildReportActionProgress } from "./reportActionProgress";
import { RulaReportOverview } from "./RulaReportOverview";

afterEach(() => vi.unstubAllGlobals());

describe("RULA workflow overview rendering", () => {
  it.each(["fa", "en"] as const)("shows recommendations as remaining before registration in %s", (locale) => {
    vi.stubGlobal("localStorage", { getItem: () => locale });
    const recommendations = Array.from({ length: 3 }, (_, index) => ({ id: `rec-${index}`, title: `Recommendation ${index}`, bodySide: "RIGHT" as const }));
    const progress = buildReportActionProgress({ actions: [], suggestions: recommendations });
    const markup = renderToStaticMarkup(<LocaleProvider><RulaReportOverview
      riskResults={[]} score={0} actionLevelLabel="Pending" actionLevelClassName="review-required"
      status="DRAFT" reviewComplete={false} reviewedPostureCount={0} totalPostureCount={7}
      sideLabel="RIGHT" mainFactor={null} progress={progress}
      actions={recommendations.map(() => ({ priority: "LOW", status: "UNSELECTED" }))}
    /></LocaleProvider>);
    const number = (value: number) => value.toLocaleString(locale === "fa" ? "fa-IR" : "en-US");
    expect(markup).toContain('stroke="#43a27d" stroke-dasharray="100 0"');
    expect(markup).toContain(`<span>${number(3)}</span><small>${translate("assessment.rulaTotalResults", locale)}</small>`);
    expect(markup).toContain(`${translate("assessment.rulaAcceptable", locale)}: ${number(3)}`);
    expect(markup).not.toContain(translate("assessment.rulaPriorityDistributionEmpty", locale));
    expect(markup).toContain('data-status="remaining"');
    expect(markup).toContain('stroke="#bdcdd6" stroke-dasharray="100 0"');
    expect(markup).toContain(`${translate("report.remainingRecommendations", locale)}: ${number(3)}`);
    expect(markup).toContain('aria-valuenow="0"');
    expect(markup).not.toContain("Recommendation 0");
    expect(markup).toContain('<strong>—</strong>');
    expect(markup).toContain(translate("assessment.rulaAutomaticAnalysisPending", locale));
  });

  it.each(["fa", "en"] as const)("uses persisted status and separate recommendations for its progress chart in %s", (locale) => {
    vi.stubGlobal("localStorage", { getItem: () => locale });
    const savedActions = [
      { id: "open", title: "Open saved", status: "OPEN", bodySide: "RIGHT" as const },
      { id: "done", title: "Completed saved", status: "COMPLETED", bodySide: "RIGHT" as const },
    ];
    const recommendations = [
      { id: "rec-1", title: "Recommendation 1", bodySide: "RIGHT" as const },
      { id: "rec-2", title: "Recommendation 2", bodySide: "RIGHT" as const },
    ];
    const progress = buildReportActionProgress({ actions: savedActions, suggestions: recommendations, bodySide: "RIGHT" });
    const markup = renderToStaticMarkup(<LocaleProvider><RulaReportOverview
      riskResults={[{ actionLevel: 2 }]} score={3} actionLevelLabel="Review" actionLevelClassName="investigation"
      status="DRAFT" reviewComplete reviewedPostureCount={7} totalPostureCount={7} sideLabel="RIGHT" mainFactor={{ label: "Shoulder detail", score: 2, sharePercent: 30 }}
      progress={progress}
      actions={[
        { priority: "LOW", status: "UNSELECTED" },
        { priority: "HIGH", status: "OPEN" },
        { priority: "LOW", status: "COMPLETED" },
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
    for (const [key, count] of [["completed", 1], ["registeredActive", 1], ["remainingRecommendations", 2]] as const) {
      expect(markup).toContain(`${translate(`report.${key}`, locale)}: ${number(count)}`);
    }
    expect(markup).not.toContain(translate("assessment.rulaCurrentScoreDescription", locale));
    expect(markup).not.toContain("Shoulder detail");
    expect(markup).not.toContain(translate("assessment.rulaRiskDistributionDescription", locale));
    expect(markup).not.toContain(translate("assessment.rulaActionProgressDescription", locale));
  });

  it("keeps the clinical risk distribution separate from corrective-action progress", () => {
    vi.stubGlobal("localStorage", { getItem: () => "en" });
    const progress = buildReportActionProgress({ actions: [], suggestions: [{ id: "rec", title: "Suggestion" }] });
    const markup = renderToStaticMarkup(<LocaleProvider><RulaReportOverview riskResults={[{ actionLevel: 4 }, { actionLevel: 2 }]} score={7} actionLevelLabel="Immediate" actionLevelClassName="immediate" status="COMPLETED" reviewComplete reviewedPostureCount={7} totalPostureCount={7} sideLabel="RIGHT" mainFactor={null} progress={progress} actions={[{ priority: "HIGH", status: "UNSELECTED" }]}/></LocaleProvider>);
    expect(markup).toContain('stroke="#cf4a4d" stroke-dasharray="50 50"');
    expect(markup).toContain("Total assessments");
    expect(markup).toContain('<span>2</span>');
  });
});
