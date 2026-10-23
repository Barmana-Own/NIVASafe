import { calculateRula, RULA_POSTURE_SCORE_LIMITS } from "@nivasafe/domain";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RULA_TABLE_A, RULA_TABLE_B } from "../../../../shared/domain/src/rula-tables";
import { LocaleProvider } from "../../i18n";
import { RulaPostureAnalysisStep, rulaAnalysisForSide, rulaGroupScoreBounds, rulaInputsFromAnalysis, rulaProposalSummary } from "./AssessmentPages";
import { areRulaPostureRowsReviewed } from "./rulaPostureReview";

type Analysis = Parameters<typeof rulaInputsFromAnalysis>[0];
type Part = keyof typeof RULA_POSTURE_SCORE_LIMITS;
const groups: Record<"A" | "B", Part[]> = { A: ["upperArm", "lowerArm", "wrist", "wristTwist"], B: ["neck", "trunk", "legs"] };
const parts = [...groups.A, ...groups.B];
function reviewed(score = 1): Analysis["upperArm"] { return { angle: 0, score, detected: true, source: "USER", confirmedByUser: true, requiresReview: true }; }
function unknown(): Analysis["upperArm"] {
  return { angle: null, score: 1, detected: false, source: "AI", confirmedByUser: false, requiresReview: true, confidence: .99, measurement: { version: "image-plane-audit-v1", state: "UNMEASURABLE", basis: "IMAGE_PLANE", aiAngle: null, aiScore: 1, aiDetected: false, geometryAngle: null, qualityCodes: ["LANDMARK_MISSING"], view: "UNKNOWN", width: 64, height: 96, landmarks: [] } };
}
function observation(known: Partial<Record<Part, number>> = {}, adjustments = { force: 0, muscleUse: false }): Analysis {
  return { ...Object.fromEntries(parts.map(part => [part, known[part] === undefined ? unknown() : reviewed(known[part])])), bodySide: "RIGHT", adjustments } as Analysis;
}
const neutral = Object.fromEntries(parts.map(part => [part, 1])) as Record<Part, number>;
function possibilities(keys: Part[], includeUnknown = false): Array<Partial<Record<Part, number>>> {
  let values: Array<Partial<Record<Part, number>>> = [{}];
  for (const part of keys) {
    const scores = Array.from({ length: RULA_POSTURE_SCORE_LIMITS[part] }, (_, index) => index + 1);
    values = values.flatMap(value => [...(includeUnknown ? [undefined] : []), ...scores].map(score => ({ ...value, [part]: score })));
  }
  return values;
}
function tableScore(group: "A" | "B", scores: Record<Part, number>, adjustment: number) {
  return (group === "A" ? RULA_TABLE_A[(scores.upperArm - 1) * 3 + scores.lowerArm - 1][(scores.wrist - 1) * 2 + scores.wristTwist - 1] : RULA_TABLE_B[scores.neck - 1][(scores.trunk - 1) * 2 + scores.legs - 1]) + adjustment;
}
function render(analysis: Analysis, locale: "en" | "fa" = "en", activeSide: "RIGHT" | "LEFT" = "RIGHT") {
  vi.stubGlobal("localStorage", { getItem: () => locale });
  const right = calculateRula(rulaInputsFromAnalysis(rulaAnalysisForSide(analysis, "RIGHT"), 0, false));
  const left = calculateRula(rulaInputsFromAnalysis(rulaAnalysisForSide(analysis, "LEFT"), 0, false));
  return renderToStaticMarkup(<LocaleProvider><RulaPostureAnalysisStep analysis={analysis} bodySide={analysis.sideAnalyses ? "BOTH" : "RIGHT"} activeSide={activeSide} result={right} sideResults={{ RIGHT: right, LEFT: left }} imagePreview="synthetic.png" postureDescription="" locale={locale} onChange={() => undefined}/></LocaleProvider>);
}
function badges(html: string) {
  const match = html.match(/class="rula-group-summary"[^>]*><div><span>[^<]*<\/span><strong([^>]*)>([^<]*)<\/strong><\/div><div><span>[^<]*<\/span><strong([^>]*)>([^<]*)<\/strong>/u);
  expect(match).not.toBeNull();
  return { A: { attributes: match![1], text: match![2] }, B: { attributes: match![3], text: match![4] } };
}
afterEach(() => vi.unstubAllGlobals());

describe("RULA group score intervals", () => {
  it("uses fixed published table values for partial and complete groups with current adjustments", () => {
    const analysis = observation({ upperArm: 1, lowerArm: 1, wrist: 1, trunk: 2, legs: 1 });
    expect(rulaGroupScoreBounds(analysis, "A")).toEqual({ known: 3, total: 4, min: 1, max: 2, complete: false });
    expect(rulaGroupScoreBounds(analysis, "B")).toEqual({ known: 2, total: 3, min: 2, max: 8, complete: false });
    analysis.adjustments = { force: 2, muscleUse: true };
    expect(rulaGroupScoreBounds(analysis, "A")).toMatchObject({ min: 4, max: 5 });
    expect(rulaGroupScoreBounds(analysis, "B")).toMatchObject({ min: 5, max: 11 });
    analysis.wristTwist = reviewed(2); analysis.neck = reviewed(3);
    expect(rulaGroupScoreBounds(analysis, "A")).toEqual({ known: 4, total: 4, min: 5, max: 5, complete: true });
    expect(rulaGroupScoreBounds(analysis, "B")).toEqual({ known: 3, total: 3, min: 6, max: 6, complete: true });
  });

  it("enumerates the exact extrema and contains every legal completion for all 567 known/unknown patterns", () => {
    let patterns = 0;
    for (const group of ["A", "B"] as const) {
      const legal = possibilities(groups[group]);
      expect(legal).toHaveLength(group === "A" ? 144 : 72);
      for (const known of possibilities(groups[group], true)) {
        const bounds = rulaGroupScoreBounds(observation(known), group)!;
        const completions = legal.filter(scores => groups[group].every(part => known[part] === undefined || known[part] === scores[part]));
        const scores = completions.map(scores => tableScore(group, { ...neutral, ...scores }, 0));
        expect(bounds.known).toBe(groups[group].filter(part => known[part] !== undefined).length);
        expect(bounds.min).toBe(Math.min(...scores)); expect(bounds.max).toBe(Math.max(...scores));
        expect(scores.every(score => bounds.min <= score && bounds.max >= score)).toBe(true);
        expect(bounds.complete).toBe(bounds.known === groups[group].length);
        patterns += 1;
      }
    }
    expect(patterns).toBe(567);
  });

  it("distinguishes completed abstentions from each group's untouched pending state", () => {
    const analysis = observation();
    expect(rulaGroupScoreBounds(analysis, "A")).toMatchObject({ known: 0, min: 1, max: 9, complete: false });
    expect(rulaGroupScoreBounds(analysis, "B")).toMatchObject({ known: 0, min: 1, max: 9, complete: false });
    analysis.upperArm.source = "DEFAULT";
    expect(rulaGroupScoreBounds(analysis, "A")).toBeUndefined();
    expect(rulaGroupScoreBounds(analysis, "B")).toMatchObject({ min: 1, max: 9 });
    const pending = observation(neutral);
    pending.neck = { ...unknown(), source: "DEFAULT" };
    expect(rulaGroupScoreBounds(pending, "A")).toMatchObject({ min: 1, max: 1, complete: true });
    expect(rulaGroupScoreBounds(pending, "B")).toBeUndefined();
    const html = badges(render(pending));
    expect(html.A.text).toBe("1"); expect(html.B.text).toBe("—");
    expect(html.A.attributes).not.toContain('role="note"');
    expect(html.A.attributes).not.toContain('dir=');
  });

  it("retains intervals even when all completions agree and never clamps group scores to final-score limits", () => {
    const analysis = observation({ upperArm: 6, lowerArm: 3, wrist: 4, neck: 6, trunk: 6 }, { force: 3, muscleUse: true });
    expect(rulaGroupScoreBounds(analysis, "A")).toMatchObject({ min: 13, max: 13, complete: false });
    expect(rulaGroupScoreBounds(analysis, "B")).toMatchObject({ min: 13, max: 13, complete: false });
    const html = render(analysis), values = badges(html);
    expect(values.A.text).toBe("13–13"); expect(values.B.text).toBe("13–13");
    expect(values.A.attributes).toContain('role="note"');
    expect(values.A.attributes).toContain("Possible group score range using current force and muscle use: 13–13");
    expect(html).not.toContain("RULA Score ="); expect(html).not.toContain('aria-valuenow=');
    const fullBand = observation({}, { force: 3, muscleUse: true });
    expect(rulaGroupScoreBounds(fullBand, "A")).toMatchObject({ min: 5, max: 13 });
    expect(rulaGroupScoreBounds(fullBand, "B")).toMatchObject({ min: 5, max: 13 });
  });

  it("keeps photo/side values independent, preserves fallback and explicit zero/false, and does not mutate observations", () => {
    const photos = [0, 1, 2, 3].map(index => {
      const right = observation({ upperArm: 1, lowerArm: 1, wrist: 1 }, { force: index, muscleUse: false });
      const left = { ...observation({ upperArm: 6, lowerArm: 3, wrist: 4 }, { force: 3 - index, muscleUse: true }), bodySide: "LEFT" as const };
      return { ...right, sideAnalyses: { RIGHT: right, LEFT: left } };
    });
    const before = JSON.stringify(photos);
    for (const [index, analysis] of photos.entries()) {
      expect(rulaGroupScoreBounds(rulaAnalysisForSide(analysis, "RIGHT"), "A", { force: 3, muscleUse: true })).toMatchObject({ min: 1 + index, max: 2 + index });
      expect(rulaGroupScoreBounds(rulaAnalysisForSide(analysis, "LEFT"), "A", { force: 0, muscleUse: false })).toMatchObject({ min: 13 - index, max: 13 - index });
      expect(badges(render(analysis, "en", "RIGHT")).A.text).toBe(`${1 + index}–${2 + index}`);
      expect(badges(render(analysis, "en", "LEFT")).A.text).toBe(`${13 - index}–${13 - index}`);
    }
    const { adjustments: _adjustments, ...withoutModifiers } = observation({ upperArm: 1, lowerArm: 1, wrist: 1 });
    expect(rulaGroupScoreBounds(withoutModifiers, "A", { force: 2, muscleUse: true })).toMatchObject({ min: 4, max: 5 });
    expect(JSON.stringify(photos)).toBe(before);
  });

  it("localizes only the existing badge content and descriptions without populating final scores or confirmations", () => {
    const analysis = observation({ upperArm: 1, lowerArm: 1, wrist: 1, trunk: 2, legs: 1 });
    const before = JSON.stringify(analysis), html = render(analysis, "fa"), values = badges(html);
    expect(values.A.text).toBe("۱–۲"); expect(values.B.text).toBe("۲–۸");
    expect(values.A.attributes).toContain('dir="ltr"'); expect(values.B.attributes).toContain('dir="ltr"');
    expect(values.A.attributes).toContain("بازهٔ ممکن امتیاز گروه با نیرو و استفادهٔ عضلانی فعلی");
    expect(areRulaPostureRowsReviewed(parts.map(part => analysis[part]))).toBe(false);
    expect(rulaProposalSummary(analysis).complete).toBe(false);
    expect(html).not.toContain("RULA Score ="); expect(html).not.toContain('aria-valuenow=');
    expect(html).not.toContain('rula-analysis-source ready');
    expect(JSON.stringify(analysis)).toBe(before);
  });
});
