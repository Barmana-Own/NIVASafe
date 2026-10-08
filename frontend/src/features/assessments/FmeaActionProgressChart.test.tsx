import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider, translate } from "../../i18n";
import { FmeaActionProgressChart, fmeaActionProgressSegments } from "./FmeaActionProgressChart";

afterEach(() => vi.unstubAllGlobals());
describe("FMEA three-state corrective progress chart", () => {
  it("uses the full inventory for all three slices, not just completed progress", () => {
    const { total, entries } = fmeaActionProgressSegments({ completedCount: 1, inProgressCount: 6, remainingCount: 5 });
    expect(total).toBe(12);
    expect(entries.map(entry => entry.count)).toEqual([1, 6, 5]);
    [100 / 12, 50, 500 / 12].forEach((expected, index) => expect(entries[index]?.percentage).toBeCloseTo(expected));
    expect(entries[1]?.startPercentage).toBeCloseTo(100 / 12);
    expect(entries[2]?.startPercentage).toBeCloseTo(50 + 100 / 12);
    expect(entries.reduce((sum, entry) => sum + entry.percentage, 0)).toBeCloseTo(100);
  });
  it.each(["fa", "en"] as const)("renders three colored segments and localized counts in %s", locale => {
    vi.stubGlobal("localStorage", { getItem: () => locale });
    const markup = renderToStaticMarkup(<LocaleProvider><FmeaActionProgressChart completedCount={1} inProgressCount={6} remainingCount={5}/></LocaleProvider>);
    for (const [status, color, count] of [["completed", "#138a61", 1], ["inProgress", "#e19a31", 6], ["remaining", "#bdcdd6", 5]] as const) {
      expect(markup).toContain(`data-status="${status}"`);
      expect(markup).toContain(`stroke="${color}"`);
      expect(markup).toContain(`${translate(`report.${status}`, locale)}: ${count.toLocaleString(locale === "fa" ? "fa-IR" : "en-US")}`);
    }
    expect(markup).toContain("fmea-risk-distribution-visual");
    expect(markup.match(/class="fmea-risk-legend-item"/g)).toHaveLength(3);
    expect(markup.match(/tabindex="0" role="button"/g)).toHaveLength(3);
  });
  it("shows an empty track without invalid geometry or fake slices", () => {
    vi.stubGlobal("localStorage", { getItem: () => "en" });
    const markup = renderToStaticMarkup(<LocaleProvider><FmeaActionProgressChart completedCount={0} inProgressCount={0} remainingCount={0}/></LocaleProvider>);
    expect(markup).not.toContain("stroke-dasharray");
    expect(markup).not.toMatch(/NaN|Infinity/);
    expect(markup).toContain("<span>0%</span>");
    expect(fmeaActionProgressSegments({ completedCount: -1, inProgressCount: NaN, remainingCount: Infinity }).total).toBe(0);
  });
  it("allows one state to fill the whole ring", () => {
    expect(fmeaActionProgressSegments({ completedCount: 0, inProgressCount: 4, remainingCount: 0 }).entries.map(entry => entry.percentage)).toEqual([0, 100, 0]);
  });
});
