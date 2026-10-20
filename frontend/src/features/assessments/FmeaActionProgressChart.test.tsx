import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider, translate } from "../../i18n";
import { buildReportActionProgress } from "./reportActionProgress";
import { FmeaActionProgressChart, fmeaActionProgressSegments } from "./FmeaActionProgressChart";


afterEach(() => vi.unstubAllGlobals());

describe("shared FMEA/RULA action progress chart", () => {
  const progress = buildReportActionProgress({
    actions: [
      { id: "complete-1", title: "Completed action", status: "COMPLETED" },
      ...Array.from({ length: 6 }, (_, index) => ({ id: `active-${index}`, title: `Active action ${index}`, status: "OPEN" })),
    ],
    suggestions: Array.from({ length: 5 }, (_, index) => ({ id: `suggestion-${index}`, title: `Suggestion ${index}` })),
  });

  it("uses the validated inventory for the three exclusive percentage slices", () => {
    const { total, entries } = fmeaActionProgressSegments(progress);
    expect(total).toBe(12);
    expect(entries.map((entry) => entry.count)).toEqual([1, 6, 5]);
    [100 / 12, 50, 500 / 12].forEach((expected, index) => expect(entries[index]?.percentage).toBeCloseTo(expected));
    expect(entries[1]?.startPercentage).toBeCloseTo(100 / 12);
    expect(entries[2]?.startPercentage).toBeCloseTo(50 + 100 / 12);
  });

  it.each(["fa", "en"] as const)("renders localized, keyboard-operable category controls in %s", (locale) => {
    vi.stubGlobal("localStorage", { getItem: () => locale });
    const markup = renderToStaticMarkup(<LocaleProvider><FmeaActionProgressChart progress={progress}/></LocaleProvider>);
    for (const [status, labelKey, color, count] of [["completed", "report.completed", "#138a61", 1], ["inProgress", "report.registeredActive", "#e19a31", 6], ["remaining", "report.remainingRecommendations", "#bdcdd6", 5]] as const) {
      expect(markup).toContain(`data-status="${status}"`);
      expect(markup).toContain(`stroke="${color}"`);
      expect(markup).toContain(`${translate(labelKey, locale)}: ${count.toLocaleString(locale === "fa" ? "fa-IR" : "en-US")}`);
    }
    expect(markup).toContain("fmea-risk-distribution-visual");
    expect(markup.match(/class="fmea-risk-legend-item"/g)).toHaveLength(3);
    expect(markup.match(/aria-pressed="false"/g)).toHaveLength(3);
    expect(markup).not.toMatch(/درصدها از مجموع|Percentages use a total of/);
  });

  it("keeps a body-side scope accessible without adding a summary paragraph", () => {
    vi.stubGlobal("localStorage", { getItem: () => "en" });
    const markup = renderToStaticMarkup(<LocaleProvider><FmeaActionProgressChart progress={progress} sideLabel="Left side"/></LocaleProvider>);
    expect(markup).toContain('aria-label="Corrective-action progress: Left side"');
    expect(markup).not.toContain("Percentages use a total of");
  });

  it("uses the risk-distribution layout for the chart row while keeping details below it", () => {
    vi.stubGlobal("localStorage", { getItem: () => "en" });
    const markup = renderToStaticMarkup(<LocaleProvider><FmeaActionProgressChart progress={progress}/></LocaleProvider>);
    expect(markup).toContain('class="fmea-risk-distribution-visual report-action-progress-chart-row"');
    expect(markup).toContain('class="status-badge fmea-workflow-badge completed"');
  });

  it("gives simultaneous FMEA and RULA charts independent accessible detail targets", () => {
    vi.stubGlobal("localStorage", { getItem: () => "en" });
    const markup = renderToStaticMarkup(<LocaleProvider><FmeaActionProgressChart progress={progress}/><FmeaActionProgressChart progress={progress}/></LocaleProvider>);
    const targets = [...markup.matchAll(/aria-controls="([^"]+)"/g)].map(match => match[1]);
    expect(targets).toHaveLength(6);
    expect(new Set(targets).size).toBe(2);
  });

  it("starts with no selected bucket and exposes the real saved-item list only after activation", () => {
    vi.stubGlobal("localStorage", { getItem: () => "en" });
    const markup = renderToStaticMarkup(<LocaleProvider><FmeaActionProgressChart progress={progress}/></LocaleProvider>);
    expect(markup).toContain('aria-controls="report-action-progress-items-');
    expect(markup).not.toContain("Completed action");
    expect(markup).not.toContain("Suggestion 0");
  });

  it("renders a deliberate empty state and zero completion without fake slices", () => {
    vi.stubGlobal("localStorage", { getItem: () => "en" });
    const empty = buildReportActionProgress({ actions: [], suggestions: [] });
    const markup = renderToStaticMarkup(<LocaleProvider><FmeaActionProgressChart progress={empty}/></LocaleProvider>);
    expect(markup).not.toContain("stroke-dasharray");
    expect(markup).not.toMatch(/NaN|Infinity/);
    expect(markup).toContain("0%");
    expect(markup).toContain(translate("report.actionProgressEmpty", "en"));
    expect(fmeaActionProgressSegments({ completedCount: -1, inProgressCount: NaN, remainingCount: Infinity }).total).toBe(0);
  });
});
