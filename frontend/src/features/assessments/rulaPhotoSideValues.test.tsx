import { calculateRula, suggestedRulaPostureScore } from "@nivasafe/domain";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../i18n";
import { RulaPostureAnalysisStep, isRulaSingleAnalysisUsable, parsePostureAnalysis, rulaActivityAdjustments, rulaAnalysisForSide, rulaAnalysisFromImageSide, rulaAnalysisWithAdjustments, rulaImageAssessmentResult, rulaInputsFromAnalysis, rulaPostureResultUsable, rulaReportAnalysisForImages } from "./AssessmentPages";
import { areRulaPostureRowsReviewed, isRulaPostureResultReviewed } from "./rulaPostureReview";

type Analysis = Parameters<typeof rulaInputsFromAnalysis>[0];
type Single = NonNullable<Analysis["sideAnalyses"]>["LEFT"] & {};
type Row = Analysis["upperArm"];
const parts = ["upperArm", "lowerArm", "wrist", "wristTwist", "neck", "trunk", "legs"] as const;
const angles = { upperArm: [5, 35, 65, 105], lowerArm: [45, 75, 105, 120], wrist: [0, 10, 20, 35], neck: [5, 15, 30, -10], trunk: [0, 15, 35, 70] } as const;
function single(photo: number, side: "LEFT" | "RIGHT", reviewed = false): Single {
  const rows = Object.fromEntries(parts.map(part => {
    const index = (photo + (side === "LEFT" ? 1 : 0)) % 4;
    const angle = part in angles ? angles[part as keyof typeof angles][index] : null;
    const score = angle === null ? 1 + index % 2 : suggestedRulaPostureScore(part, angle, true, 1);
    return [part, { angle, score, detected: true, source: reviewed ? "USER" : "AI", confirmedByUser: reviewed, requiresReview: true, confidence: .94, measurement: { version: "image-plane-audit-v1", state: angle === null ? "QUALITATIVE" : "ESTIMATED", basis: angle === null ? "SUPPORT" : "IMAGE_PLANE", aiAngle: angle, aiScore: score, geometryAngle: angle, qualityCodes: [], view: "SAGITTAL", width: 640, height: 960, landmarks: [] } }];
  })) as unknown as Record<(typeof parts)[number], Row>;
  return { ...rows, bodySide: side, adjustments: { force: (photo + (side === "LEFT" ? 2 : 0)) % 4, muscleUse: (photo + (side === "LEFT" ? 1 : 0)) % 2 === 1 } };
}
function both(photo: number): Analysis { const right = single(photo, "RIGHT"), left = single(photo, "LEFT"); return { ...right, sideAnalyses: { RIGHT: right, LEFT: left } }; }
afterEach(() => vi.unstubAllGlobals());

describe("RULA photo and anatomical-side values", () => {
  it("derives only supported activity modifiers at exact load and duration boundaries", () => {
    const base = { jobTitle: "Synthetic operator", taskDescription: "Inspect synthetic fixture cards." };
    expect(rulaActivityAdjustments(base)).toEqual({});
    expect(rulaActivityAdjustments({ ...base, repetitionsPerShift: 9999 })).toEqual({});
    expect(rulaActivityAdjustments({ ...base, postureHoldDuration: 1, postureHoldUnit: "MINUTE" })).toEqual({});
    expect(rulaActivityAdjustments({ ...base, postureHoldDuration: 61, postureHoldUnit: "SECOND" })).toEqual({ muscleUse: true });
    expect(rulaActivityAdjustments({ ...base, loadWeight: 12, loadUnit: "KG" })).toEqual({ force: 3 });
    expect(rulaActivityAdjustments({ ...base, loadWeight: 26.5, loadUnit: "LB" })).toEqual({ force: 3 });
    expect(rulaActivityAdjustments({ ...base, loadWeight: 0, loadUnit: "KG" })).toEqual({ force: 0 });
    expect(rulaActivityAdjustments({ ...base, loadWeight: 5, loadUnit: "KG" })).toEqual({});
    expect(rulaActivityAdjustments({ ...base, loadWeight: 5, loadUnit: "KG", postureHoldDuration: 2, postureHoldUnit: "MINUTE" })).toEqual({ force: 2, muscleUse: true });
    expect(rulaActivityAdjustments({ ...base, loadWeight: 1, loadUnit: "KG", postureHoldDuration: 2, postureHoldUnit: "MINUTE" })).toEqual({ muscleUse: true });
    expect(rulaActivityAdjustments({ ...base, loadWeight: Number.NaN, loadUnit: "KG", postureHoldDuration: Number.POSITIVE_INFINITY, postureHoldUnit: "MINUTE" })).toEqual({});
  });

  it("round-trips four independent bilateral photographs and computes every side from its own modifiers", () => {
    const images = [0, 1, 2, 3].map(photo => ({ imageKey: `photo-${photo}`, fileName: `synthetic-${photo}.png`, analysis: both(photo), force: 0, muscleUse: false }));
    const payload = rulaReportAnalysisForImages(images, "BOTH", both(0));
    const restored = parsePostureAnalysis(JSON.stringify(payload));
    expect(restored.imageAssessments).toHaveLength(4);
    for (const [photo, image] of restored.imageAssessments!.entries()) {
      const expected = images[photo];
      const sideScores = (["LEFT", "RIGHT"] as const).map(side => {
        const actual = rulaAnalysisForSide(image.analysis, side), original = rulaAnalysisForSide(expected.analysis, side);
        expect(actual).toEqual(original);
        const inputs = rulaInputsFromAnalysis(actual, 3, false);
        expect(inputs.force).toBe(original.adjustments!.force);
        expect(inputs.muscleUse).toBe(original.adjustments!.muscleUse);
        return calculateRula(inputs).score;
      });
      expect(rulaImageAssessmentResult(image, "BOTH").score).toBe(Math.max(...sideScores));
    }
    expect(rulaReportAnalysisForImages([...images].reverse(), "BOTH", both(0)).imageAssessments?.map(image => image.imageKey)).toEqual([...images].reverse().map(image => image.imageKey));
  });

  it("keeps a modifier edit within its original side and photograph", () => {
    const original = [both(0), both(1), both(2), both(3)];
    const snapshot = JSON.stringify(original);
    const edited = rulaAnalysisWithAdjustments(original[1], "LEFT", "BOTH", { force: 3, muscleUse: true });
    expect(edited.sideAnalyses!.LEFT!.adjustments).toEqual({ force: 3, muscleUse: true });
    expect(edited.sideAnalyses!.RIGHT).toEqual(original[1].sideAnalyses!.RIGHT);
    expect(edited.sideAnalyses!.LEFT!.upperArm).toEqual(original[1].sideAnalyses!.LEFT!.upperArm);
    expect(JSON.stringify(original)).toBe(snapshot);
  });

  it("never substitutes an explicit opposite side or a missing side with another observation", () => {
    const right = single(0, "RIGHT");
    const missing = rulaAnalysisForSide({ ...right, sideAnalyses: { RIGHT: right } }, "LEFT");
    expect(parts.every(part => missing[part].source === "DEFAULT")).toBe(true);
    expect(parts.every(part => rulaAnalysisForSide(right, "LEFT")[part].source === "DEFAULT")).toBe(true);
    expect(rulaAnalysisForSide(right, "RIGHT")).toEqual(right);
    const { bodySide: _tag, adjustments: _adjustments, ...legacy } = right;
    expect(rulaAnalysisForSide(legacy, "LEFT")).toEqual(legacy);
    expect(rulaInputsFromAnalysis(legacy, 2, true)).toMatchObject({ force: 2, muscleUse: true });
  });

  it("merges only known inference modifier fields and preserves a legacy fallback for unknown fields", () => {
    const observed = single(1, "LEFT");
    expect(rulaAnalysisFromImageSide({ ...observed, adjustments: { force: 2 } }, { force: 0, muscleUse: true }, "LEFT")?.analysis).toMatchObject({ bodySide: "LEFT", adjustments: { force: 2, muscleUse: true } });
    const { adjustments: _adjustments, ...without } = observed;
    expect(rulaAnalysisFromImageSide(without, { force: 3, muscleUse: false }, "LEFT")?.analysis.adjustments).toEqual({ force: 3, muscleUse: false });
    expect(rulaAnalysisFromImageSide({ ...observed, adjustments: { force: 99, muscleUse: "yes" } }, { force: 0, muscleUse: false }, "LEFT")?.analysis.adjustments).toEqual({ force: 0, muscleUse: false });
  });

  it("seals an unreported LEFT modifier fallback before a RIGHT recommendation or edit can leak into it", () => {
    const right = rulaAnalysisFromImageSide({ ...single(0, "RIGHT"), adjustments: { force: 2, muscleUse: true } }, { force: 0, muscleUse: false }, "RIGHT")!.analysis;
    const { adjustments: _suggestions, ...leftObservation } = single(0, "LEFT");
    const left = rulaAnalysisFromImageSide(leftObservation, { force: 0, muscleUse: false }, "LEFT")!.analysis;
    const combined = { ...right, sideAnalyses: { RIGHT: right, LEFT: left } };
    expect(rulaInputsFromAnalysis(left, 2, true)).toMatchObject({ force: 0, muscleUse: false });
    const edited = rulaAnalysisWithAdjustments(combined, "RIGHT", "BOTH", { force: 3, muscleUse: true });
    const restored = parsePostureAnalysis(JSON.stringify(edited));
    expect(restored.sideAnalyses!.LEFT!.adjustments).toEqual({ force: 0, muscleUse: false });
    expect(restored.sideAnalyses!.RIGHT!.adjustments).toEqual({ force: 3, muscleUse: true });
    const symmetricLeft = { ...right, bodySide: "LEFT" as const };
    expect(rulaImageAssessmentResult({ imageKey: "symmetric", fileName: "symmetric.png", analysis: { ...right, sideAnalyses: { RIGHT: right, LEFT: symmetricLeft } }, force: 0, muscleUse: false }, "BOTH").score).toBe(calculateRula(rulaInputsFromAnalysis(right, 0, false)).score);
  });

  it("hydrates a persisted missing side from its original photograph fallback before any primary-side publication", () => {
    const right = { ...single(0, "RIGHT"), adjustments: { force: 2, muscleUse: true } };
    const { adjustments: _leftAdjustments, ...left } = single(0, "LEFT");
    const partial = { ...right, sideAnalyses: { RIGHT: right, LEFT: left } };
    const images = [0, 1, 2, 3].map(photo => ({ imageKey: `saved-${photo}`, fileName: `saved-${photo}.png`, analysis: partial, force: photo, muscleUse: false }));
    const original = JSON.stringify(images);
    const restored = parsePostureAnalysis({ ...partial, imageAssessments: images }, { force: 2, muscleUse: true });
    for (const [photo, image] of restored.imageAssessments!.entries()) {
      expect(image.analysis.sideAnalyses!.LEFT!.adjustments).toEqual({ force: photo, muscleUse: false });
      expect(image.analysis.sideAnalyses!.RIGHT!.adjustments).toEqual({ force: 2, muscleUse: true });
      expect(rulaInputsFromAnalysis(image.analysis.sideAnalyses!.LEFT!, 2, true)).toMatchObject({ force: photo, muscleUse: false });
      expect(image.analysis.sideAnalyses!.LEFT!.neck).toEqual(left.neck);
      const edited = rulaAnalysisWithAdjustments(image.analysis, "RIGHT", "BOTH", { force: 3, muscleUse: true }, { force: 2, muscleUse: true });
      expect(edited.sideAnalyses!.LEFT!.adjustments).toEqual({ force: photo, muscleUse: false });
    }
    const roundTrip = parsePostureAnalysis(JSON.stringify(restored), { force: 2, muscleUse: true });
    expect(roundTrip).toEqual(restored);
    expect(JSON.stringify(images)).toBe(original);
    const draft = parsePostureAnalysis(JSON.stringify(partial), { force: 0, muscleUse: false });
    expect(draft.sideAnalyses!.LEFT!.adjustments).toEqual({ force: 0, muscleUse: false });
    expect(draft.sideAnalyses!.RIGHT!.adjustments).toEqual({ force: 2, muscleUse: true });
    expect(draft.sideAnalyses!.LEFT!.neck.confirmedByUser).toBe(false);
  });

  it("exposes valid provisional observations while retaining the independent human approval gate", () => {
    const observed = single(0, "RIGHT");
    expect(parts.every(part => rulaPostureResultUsable(observed[part]))).toBe(true);
    expect(isRulaSingleAnalysisUsable(observed)).toBe(true);
    expect(rulaPostureResultUsable({ ...observed.legs, detected: false })).toBe(false);
    expect(rulaPostureResultUsable({ ...observed.legs, detected: false, source: "USER", confirmedByUser: true })).toBe(true);
    expect(areRulaPostureRowsReviewed(parts.map(part => observed[part]))).toBe(false);
    expect(parts.every(part => observed[part].confirmedByUser === false)).toBe(true);
    const conflict: Row = { ...observed.neck, angle: null, measurement: { ...observed.neck.measurement!, state: "CONFLICT", aiAngle: 75, geometryAngle: 20, qualityCodes: ["ANGLE_LANDMARK_CONFLICT"] } };
    const unmeasurable: Row = { ...conflict, measurement: { ...conflict.measurement!, state: "UNMEASURABLE", geometryAngle: null, qualityCodes: ["LANDMARK_NOT_VISIBLE"] } };
    for (const row of [conflict, unmeasurable, { ...observed.neck, source: "DEFAULT" as const }, { ...observed.neck, angle: null }]) expect(rulaPostureResultUsable(row)).toBe(false);
    expect(isRulaSingleAnalysisUsable({ ...observed, neck: conflict })).toBe(false);
    expect(isRulaPostureResultReviewed({ ...conflict, confirmedByUser: true })).toBe(false);
    expect(isRulaPostureResultReviewed({ ...conflict, source: "USER", confirmedByUser: true, angle: 20 })).toBe(true);
  });

  it("renders supported provisional values and group summaries without claiming review completion", () => {
    vi.stubGlobal("localStorage", { getItem: () => "en" });
    const analysis = both(2), right = calculateRula(rulaInputsFromAnalysis(analysis.sideAnalyses!.RIGHT!, 0, false)), left = calculateRula(rulaInputsFromAnalysis(analysis.sideAnalyses!.LEFT!, 0, false));
    const html = renderToStaticMarkup(<LocaleProvider><RulaPostureAnalysisStep analysis={analysis} bodySide="BOTH" activeSide="LEFT" result={right.score >= left.score ? right : left} sideResults={{ RIGHT: right, LEFT: left }} imagePreview="" postureDescription="" locale="en" onChange={() => undefined}/></LocaleProvider>);
    expect(html.match(/class="rula-suggested-score[^\"]*"/g)).toHaveLength(7);
    expect(html).toContain(`RULA Score = ${left.score}`);
    expect(html).toContain('rula-analysis-source pending');
    expect(html).toContain('rula-detection-badge detected">Detected</span>');
    expect(html).toContain('rula-detection-badge detected">Present</span>');
    expect(html).toContain('rula-source-badge source-ai">AI suggestion</small>');
    expect(html).not.toContain('rula-awaiting-badge">Awaiting manual review</small>');
    expect(html).not.toContain("Waiting for image analysis");
    expect(html).toContain('rula-review-notice');
    expect(html).not.toContain('rula-analysis-source ready');
    expect(html).not.toContain('rula-summary-badge');
    const unsupported = { ...analysis.sideAnalyses!.LEFT!, neck: { ...analysis.sideAnalyses!.LEFT!.neck, angle: null, measurement: { ...analysis.sideAnalyses!.LEFT!.neck.measurement!, aiAngle: null, aiDetected: false, state: "UNMEASURABLE" as const } } };
    const blocked = renderToStaticMarkup(<LocaleProvider><RulaPostureAnalysisStep analysis={unsupported} bodySide="LEFT" result={left} imagePreview="" postureDescription="" locale="en" onChange={() => undefined}/></LocaleProvider>);
    expect(blocked).not.toContain("RULA Score =");
    expect(blocked).not.toContain('aria-valuenow=');
  });
});
