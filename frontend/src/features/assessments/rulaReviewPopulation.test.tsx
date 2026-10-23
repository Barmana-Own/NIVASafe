import { calculateRula } from "@nivasafe/domain";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../i18n";
import { RulaPostureAnalysisStep, parsePostureAnalysis, rulaActivityAdjustments, rulaAnalysisForSide, rulaAnalysisFromImageSide, rulaInputsFromAnalysis, rulaPostureProposal, rulaPostureResultUsable, rulaProposalSummary } from "./AssessmentPages";
import { areRulaPostureRowsReviewed } from "./rulaPostureReview";

type Analysis = Parameters<typeof rulaInputsFromAnalysis>[0];
type Row = Analysis["upperArm"];
const parts = ["upperArm", "lowerArm", "wrist", "wristTwist", "neck", "trunk", "legs"] as const;
const measurement = { version: "image-plane-audit-v1" as const, state: "ESTIMATED" as const, basis: "IMAGE_PLANE" as const, aiAngle: 40, aiScore: 2, aiDetected: true, geometryAngle: 40, qualityCodes: [], view: "SAGITTAL" as const, width: 640, height: 960, landmarks: [] };
function observed(side: "LEFT" | "RIGHT" = "RIGHT"): Analysis {
  const row = (angle: number | null, score: number): Row => ({ angle, score, detected: true, source: "AI", confirmedByUser: false, requiresReview: true, confidence: .9, measurement: { ...measurement, aiAngle: angle, geometryAngle: angle, aiScore: score } });
  const analysis: Analysis = {
    upperArm: row(40, 2), lowerArm: row(90, 1), wrist: row(20, 3), trunk: row(35, 3),
    wristTwist: { ...row(null, 1), detected: false, measurement: { ...measurement, state: "UNMEASURABLE", basis: "UNSUPPORTED", aiAngle: null, aiScore: 2, geometryAngle: null, qualityCodes: ["OUT_OF_PLANE_UNMEASURABLE"] } },
    neck: { ...row(null, 1), detected: false, measurement: { ...measurement, state: "CONFLICT", aiAngle: 30, aiScore: 3, geometryAngle: 10, qualityCodes: ["ANGLE_LANDMARK_CONFLICT"] } },
    legs: { ...row(null, 2), measurement: { ...measurement, state: "QUALITATIVE", basis: "SUPPORT", aiAngle: null, geometryAngle: null, aiScore: 2 } },
    bodySide: side, adjustments: { force: 2, muscleUse: true },
  };
  return rulaAnalysisFromImageSide(analysis, { force: 0, muscleUse: false }, side)!.analysis;
}
function render(analysis: Analysis, locale: "fa" | "en" = "en", activeSide?: "LEFT" | "RIGHT", initialEditPart?: "neck") {
  vi.stubGlobal("localStorage", { getItem: () => locale });
  const result = calculateRula(rulaInputsFromAnalysis(analysis, 0, false));
  return renderToStaticMarkup(<LocaleProvider><RulaPostureAnalysisStep analysis={analysis} bodySide={analysis.sideAnalyses ? "BOTH" : analysis.bodySide ?? "RIGHT"} activeSide={activeSide} result={result} sideResults={{ RIGHT: result, LEFT: result }} imagePreview="synthetic.png" postureDescription="" locale={locale} initialEditPart={initialEditPart} onChange={() => undefined}/></LocaleProvider>);
}
afterEach(() => vi.unstubAllGlobals());

describe("completed RULA proposal presentation", () => {
  it("shows original conflict and out-of-plane proposals without changing audited rows or approval", () => {
    const analysis = observed(), before = JSON.stringify(analysis);
    expect(rulaPostureResultUsable(analysis.neck)).toBe(false);
    expect(rulaPostureResultUsable(analysis.wristTwist)).toBe(false);
    expect(rulaPostureProposal("neck", analysis.neck)).toEqual({ angle: 30, score: 3, detected: true });
    expect(rulaPostureProposal("wristTwist", analysis.wristTwist)).toEqual({ angle: null, score: 2, detected: true });
    expect(rulaPostureProposal("upperArm", analysis.upperArm)).toEqual({ angle: 40, score: 2, detected: true });
    const summary = rulaProposalSummary(analysis);
    expect(summary).toMatchObject({ count: 7, complete: true, groupAAvailable: true, groupBAvailable: true });
    expect(summary.result).toEqual(calculateRula({ ...rulaInputsFromAnalysis(analysis, 0, false), neck: 3, wristTwist: 2 }));
    expect(summary.result.adjustment).toBe(3);
    expect(areRulaPostureRowsReviewed(parts.map(part => analysis[part]))).toBe(false);
    const html = render(analysis);
    expect(html).toContain(`RULA Score = ${summary.result.score}`);
    expect(html).toContain("Angle/landmark conflict");
    expect(html).toContain("Not measurable in 2D");
    expect(html).toContain('source-ai">AI suggestion');
    expect(html).not.toContain("Waiting for image analysis");
    expect(html).not.toContain("Awaiting manual review");
    expect(html).not.toContain("Automatic analysis is not ready yet");
    expect(html).not.toContain('rula-analysis-source ready');
    expect(JSON.stringify(analysis)).toBe(before);
  });

  it("rejects explicit absence, empty legacy defaults, malformed scores and unrelated local geometry as proposals", () => {
    const base = observed().wristTwist;
    for (const row of [
      { ...base, measurement: { ...base.measurement!, aiDetected: false } },
      { ...base, measurement: { ...base.measurement!, aiDetected: undefined } },
      { ...base, measurement: { ...base.measurement!, aiScore: 3 } },
      { ...base, measurement: { ...base.measurement!, aiScore: Number.NaN } },
      { ...base, measurement: { ...base.measurement!, aiAngle: 999 } },
      { ...base, measurement: { ...base.measurement!, trustedSource: "DETERMINISTIC_IMAGE_PLANE" as const } },
      { ...base, source: "DEFAULT" as const }, { ...base, measurement: undefined },
    ]) expect(rulaPostureProposal("wristTwist", row)).toBeUndefined();
    expect(rulaPostureProposal("neck", { ...observed().neck, measurement: { ...observed().neck.measurement!, aiDetected: undefined } })).toEqual({ angle: 30, score: 3, detected: true });
    expect(rulaPostureProposal("neck", { ...observed().neck, measurement: { ...observed().neck.measurement!, aiDetected: false } })).toBeUndefined();
  });

  it("keeps the supported group exact and describes the other group's possible interval", () => {
    const analysis = observed();
    analysis.wristTwist.measurement = { ...analysis.wristTwist.measurement!, aiDetected: false, aiScore: 1 };
    expect(rulaProposalSummary(analysis)).toMatchObject({ count: 6, complete: false, groupAAvailable: false, groupBAvailable: true });
    const html = render(analysis);
    const groupA = html.match(/Group A — upper limb<\/span><strong\b([^>]*)>([^<]+)<\/strong>/);
    expect(groupA?.[1]).toContain('role="note"');
    expect(groupA?.[1]).toContain("white-space:nowrap");
    expect(groupA?.[1]).toContain("flex-shrink:0");
    expect(groupA?.[2]).toBe("6–6");
    expect(html).toContain('>6–6</strong>');
    expect(html).toContain("Possible group score range using current force and muscle use");
    expect(html).toContain(`Group B — neck, trunk, and legs</span><strong>${rulaProposalSummary(analysis).result.groupB}</strong>`);
    expect(html).toContain("suggestions are available for 6 of 7 body parts");
    expect(html).not.toContain("RULA Score =");
    expect(html).not.toContain('aria-valuenow=');
    expect(html).not.toContain("Waiting for image analysis");
    const persian = render(analysis, "fa");
    expect(persian).toContain("برای ۶ مورد از ۷ عضو پیشنهاد موجود است");
    expect(persian).not.toContain("هنوز نتیجه تحلیل خودکار آماده نیست");
  });

  it("round-trips separate four-photo and left/right proposals without publishing them as measured values", () => {
    const images = [0, 1, 2, 3].map(photo => {
      const right = observed(), left = observed("LEFT");
      right.neck.measurement = { ...right.neck.measurement!, aiAngle: 10 + photo, aiScore: 2 };
      left.neck.measurement = { ...left.neck.measurement!, aiAngle: 30 + photo, aiScore: 3 };
      return { imageKey: `synthetic-${photo}`, fileName: `synthetic-${photo}.png`, analysis: { ...right, sideAnalyses: { RIGHT: right, LEFT: left } }, force: 2, muscleUse: true };
    });
    const restored = parsePostureAnalysis({ ...images[0].analysis, imageAssessments: images });
    for (const [photo, image] of restored.imageAssessments!.entries()) {
      expect(rulaPostureProposal("neck", rulaAnalysisForSide(image.analysis, "RIGHT").neck)?.angle).toBe(10 + photo);
      expect(rulaPostureProposal("neck", rulaAnalysisForSide(image.analysis, "LEFT").neck)?.angle).toBe(30 + photo);
      expect(rulaAnalysisForSide(image.analysis, "LEFT").neck.angle).toBeNull();
      expect(rulaAnalysisForSide(image.analysis, "LEFT").neck.confirmedByUser).toBe(false);
    }
    expect(render(restored.imageAssessments![2].analysis, "en", "LEFT")).toContain("32°");
    expect(render(restored.imageAssessments![2].analysis, "en", "RIGHT")).toContain("12°");
  });

  it("seeds existing edit fields with the visible proposal while preserving quality and original state until save", () => {
    const analysis = observed(), before = JSON.stringify(analysis);
    const html = render(analysis, "en", undefined, "neck");
    expect(html).toContain('value="30"');
    expect(html).toContain('value="3"');
    expect(html).toContain("Angle/landmark conflict");
    expect(JSON.stringify(analysis)).toBe(before);
  });

  it("preserves real modifiers and leaves missing load or timing uninferred", () => {
    const analysis = observed();
    expect(rulaInputsFromAnalysis(analysis, 0, false)).toMatchObject({ force: 2, muscleUse: true });
    const facts = { jobTitle: "Synthetic operator", taskDescription: "Synthetic task", loadWeight: 12, loadUnit: "KG" as const, postureHoldDuration: 90, postureHoldUnit: "SECOND" as const };
    expect(rulaActivityAdjustments(facts)).toEqual({ force: 3, muscleUse: true });
    expect(rulaActivityAdjustments({ jobTitle: facts.jobTitle, taskDescription: facts.taskDescription })).toEqual({});
  });
});
