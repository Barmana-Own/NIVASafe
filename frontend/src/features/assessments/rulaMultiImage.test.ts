import { describe, expect, it } from "vitest";
import { rulaImageAssessmentResult, rulaReportAnalysisForImages, rulaUpdatePrimaryImageAnalysis } from "./AssessmentPages";

const row = { angle: 0, score: 1, detected: true, source: "AI" as const, confirmedByUser: false };
const neutral = { upperArm: row, lowerArm: row, wrist: row, wristTwist: row, neck: row, trunk: row, legs: row };
const bent = { ...neutral, upperArm: { ...row, score: 4 }, neck: { ...row, score: 4 }, trunk: { ...row, score: 4 }, legs: { ...row, score: 2 } };
const images = [
  { imageKey: "neutral", fileName: "one.png", analysis: neutral, force: 0, muscleUse: false },
  { imageKey: "bent", fileName: "two.png", analysis: bent, force: 2, muscleUse: true },
];
describe("Independent image scoring and final report", () => {
  it("uses each image's posture and force, independent of selection or list order", () => {
    expect(rulaImageAssessmentResult(images[0], "RIGHT").score).toBeLessThan(rulaImageAssessmentResult(images[1], "RIGHT").score);
    const report = rulaReportAnalysisForImages(images, "RIGHT", neutral);
    const reordered = rulaReportAnalysisForImages([...images].reverse(), "RIGHT", neutral);
    expect(report.trunk.score).toBe(bent.trunk.score);
    expect(reordered.trunk.score).toBe(bent.trunk.score);
    expect(report.imageAssessments).toHaveLength(2);
    expect(report.imageAssessments?.[0].analysis.trunk.score).toBe(1);
    expect(JSON.parse(JSON.stringify(report)).imageAssessments).toHaveLength(2);
  });
  it("scores BOTH sides independently for each image", () => {
    const both = { ...images[0], analysis: { ...neutral, sideAnalyses: { LEFT: bent, RIGHT: neutral } } };
    expect(rulaImageAssessmentResult(both, "BOTH").score).toBe(rulaImageAssessmentResult({ ...images[0], analysis: bent }, "LEFT").score);
  });
  it("preserves the manual single-posture path without photos", () => {
    expect(rulaReportAnalysisForImages([], "RIGHT", bent)).toBe(bent);
  });
  it("edits only the original worst photo and preserves the other photo when saving a report", () => {
    const previous = rulaReportAnalysisForImages(images, "RIGHT", neutral);
    const updated = rulaUpdatePrimaryImageAnalysis(previous, { ...previous, trunk: { ...row, score: 2 } }, "RIGHT");
    expect(updated.imageAssessments?.[0].analysis.trunk.score).toBe(1);
    expect(updated.imageAssessments?.[1].analysis.trunk.score).toBe(2);
    expect(updated.imageAssessments?.[1].analysis).not.toHaveProperty("imageAssessments");
  });
});
