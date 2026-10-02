import { describe, expect, it } from "vitest";
import {
  isRulaSingleAnalysisReviewed,
  postureAnalysisFromValue,
  rulaActionLevelForScore,
  rulaAnalysisFromImageSide,
  rulaPayloadFromDraft,
  withBothSideAnalyses,
} from "./rulaModel";

describe("RULA assessment model transformations", () => {
  it("normalizes detected, reviewed, and invalid posture values consistently", () => {
    const analysis = postureAnalysisFromValue({
      upperArm: { angle: 35, score: 3, detected: true, source: "USER", confirmedByUser: true },
      lowerArm: { angle: 999, score: 8, detected: true, source: "DEFAULT", confirmedByUser: true },
    });

    expect(analysis.upperArm).toMatchObject({ angle: 35, score: 3, detected: true, source: "USER", confirmedByUser: true });
    expect(analysis.lowerArm).toMatchObject({ angle: null, score: 1, source: "DEFAULT", confirmedByUser: false });
    expect(isRulaSingleAnalysisReviewed(analysis)).toBe(false);
  });

  it("keeps independently reviewed left and right postures when preparing BOTH-side state", () => {
    const analysis = postureAnalysisFromValue({
      sideAnalyses: {
        LEFT: { upperArm: { angle: 20, score: 2, detected: true, source: "USER", confirmedByUser: true } },
        RIGHT: { upperArm: { angle: 70, score: 4, detected: true, source: "AI", confirmedByUser: false } },
      },
    });
    const bothSides = withBothSideAnalyses(analysis);

    expect(bothSides.sideAnalyses?.LEFT?.upperArm).toMatchObject({ angle: 20, score: 2, source: "USER" });
    expect(bothSides.sideAnalyses?.RIGHT?.upperArm).toMatchObject({ angle: 70, score: 4, source: "AI" });
    expect(bothSides.upperArm).toMatchObject({ angle: 70, score: 4 });
  });

  it("preserves side context and normalized activity fields in a recovered draft payload", () => {
    const payload = rulaPayloadFromDraft({
      projectId: "project-1",
      title: "Workstation review",
      bodySide: "BOTH",
      jobTitle: "  Assembler  ",
      taskDescription: "  Repetitive assembly  ",
      durationPerOccurrence: "15",
      repetitionsPerShift: "invalid",
      postureAnalysis: JSON.stringify({
        sideAnalyses: {
          LEFT: { upperArm: { angle: 15, score: 2, detected: true, source: "USER", confirmedByUser: true } },
          RIGHT: { upperArm: { angle: 65, score: 4, detected: true, source: "AI" } },
        },
      }),
      inputs: { force: 2, muscleUse: "true" },
    });

    expect(payload).toMatchObject({
      projectId: "project-1",
      bodySide: "BOTH",
      activityInfo: { jobTitle: "Assembler", taskDescription: "Repetitive assembly", durationPerOccurrence: 15 },
    });
    expect(payload.postureAnalysis.sideAnalyses?.LEFT?.upperArm.angle).toBe(15);
    expect(payload.postureAnalysis.sideAnalyses?.RIGHT?.upperArm.angle).toBe(65);
    expect(payload.inputs.force).toBe(2);
    expect(payload.inputs.muscleUse).toBe(true);
  });

  it("rejects incomplete image-analysis shapes and retains current action-level boundaries", () => {
    expect(rulaAnalysisFromImageSide({})).toBeNull();
    expect(rulaActionLevelForScore(0)).toMatchObject({ className: "review-required" });
    expect(rulaActionLevelForScore(2)).toMatchObject({ className: "acceptable" });
    expect(rulaActionLevelForScore(3)).toMatchObject({ className: "investigation" });
    expect(rulaActionLevelForScore(5)).toMatchObject({ className: "review" });
    expect(rulaActionLevelForScore(7)).toMatchObject({ className: "immediate" });
  });
});
