import { calculateRula } from "@nivasafe/domain";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { rulaGaugeAnalysis, type RulaGaugeState } from "../../../test-fixtures/rula-gauge-data";
import { LocaleProvider } from "../../i18n";
import { RulaPostureAnalysisStep, rulaAnalysisForSide, rulaInputsFromAnalysis } from "./AssessmentPages";

type Analysis = Parameters<typeof RulaPostureAnalysisStep>[0]["analysis"];
function render(analysis: Analysis, locale: "en" | "fa" = "en", activeSide: "RIGHT" | "LEFT" = "RIGHT") {
  vi.stubGlobal("localStorage", { getItem: () => locale });
  const right = calculateRula(rulaInputsFromAnalysis(rulaAnalysisForSide(analysis, "RIGHT"), 0, false));
  const left = calculateRula(rulaInputsFromAnalysis(rulaAnalysisForSide(analysis, "LEFT"), 0, false));
  const markup = renderToStaticMarkup(<LocaleProvider><RulaPostureAnalysisStep analysis={analysis} result={right} sideResults={{ RIGHT: right, LEFT: left }} bodySide={analysis.sideAnalyses ? "BOTH" : "RIGHT"} activeSide={activeSide} imagePreview="" postureDescription="" locale={locale} onChange={() => undefined}/></LocaleProvider>);
  const gauge = markup.match(/<div class="rula-score-gauge"[^>]*>.*?<\/div>/u)?.[0];
  expect(gauge).toBeDefined();
  return { markup, gauge: gauge! };
}
afterEach(() => vi.unstubAllGlobals());

describe("RULA analysis semicircle", () => {
  it.each(["en", "fa"] as const)("colors six available proposals without inventing a score (%s)", locale => {
    const analysis = rulaGaugeAnalysis("partial"), before = JSON.stringify(analysis);
    const { markup, gauge } = render(analysis, locale);
    expect(gauge).toContain("--rula-score-angle:154deg");
    expect(gauge).not.toContain("data-action-level");
    expect(gauge).not.toContain("aria-valuenow");
    expect(gauge).toContain("aria-valuetext=");
    expect(gauge).toContain("<strong>—</strong>");
    expect(markup).toContain(locale === "en" ? "suggestions are available for 6 of 7 body parts" : "برای ۶ مورد از ۷ عضو پیشنهاد موجود است");
    expect(markup).not.toContain("RULA Score =");
    expect(JSON.stringify(analysis)).toBe(before);
  });

  it.each([
    ["low", 1, 1, 26], ["medium", 3, 2, 77], ["high", 6, 3, 154], ["critical", 7, 4, 180],
  ] as const)("uses the %s risk color and a visible upper-half arc", (state, score, level, angle) => {
    const analysis = rulaGaugeAnalysis(state), before = JSON.stringify(analysis);
    const { gauge } = render(analysis);
    expect(gauge).toContain(`data-action-level="${level}"`);
    expect(gauge).toContain(`--rula-score-angle:${angle}deg`);
    expect(gauge).toContain(`aria-valuenow="${score}"`);
    expect(gauge).toContain(`<strong>${score}</strong>`);
    expect(JSON.stringify(analysis)).toBe(before);
  });

  it("keeps untouched and fully unknown analyses neutral", () => {
    for (const state of ["pending", "partial"] as const) {
      const analysis = rulaGaugeAnalysis(state);
      if (state === "partial") for (const part of ["upperArm", "lowerArm", "wrist", "neck", "trunk", "legs"] as const) analysis[part] = { ...analysis.wristTwist };
      const { gauge } = render(analysis);
      expect(gauge).toContain("--rula-score-angle:0deg");
      expect(gauge).not.toContain("data-action-level");
      expect(gauge).not.toContain("aria-valuenow");
    }
  });

  it("uses each selected photo and body side independently", () => {
    const states: RulaGaugeState[] = ["partial", "low", "medium", "high"];
    for (const state of states) {
      const right = rulaGaugeAnalysis(state), left = rulaGaugeAnalysis("critical");
      const analysis = { ...right, sideAnalyses: { RIGHT: right, LEFT: left } };
      expect(render(analysis, "en", "LEFT").gauge).toContain('data-action-level="4"');
      expect(render(analysis, "en", "LEFT").gauge).toContain("--rula-score-angle:180deg");
      expect(render(analysis, "en", "RIGHT").gauge).toEqual(render(right).gauge);
    }
  });
});
