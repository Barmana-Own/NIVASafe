import { describe, expect, it } from "vitest";
import { assertRulaPostureAnalysisReviewed, isRulaPostureAnalysisReviewed, isRulaPostureResultReviewed, rulaPostureAnalysisSchema } from "./rula-posture.js";

const validAnalysis = {
  upperArm: { angle: 52, score: 3, detected: true, source: "AI", confirmedByUser: true },
  lowerArm: { angle: 87, score: 2, detected: true, source: "AI", confirmedByUser: true },
  wrist: { angle: 18, score: 1, detected: true, source: "AI", confirmedByUser: true },
  wristTwist: { angle: 0, score: 1, detected: false, source: "AI", confirmedByUser: true },
  neck: { angle: 24, score: 3, detected: true, source: "AI", confirmedByUser: true },
  trunk: { angle: 17, score: 2, detected: true, source: "AI", confirmedByUser: true },
  legs: { angle: null, score: 1, detected: true, source: "AI", confirmedByUser: true },
} as const;

describe("RULA posture analysis", () => {
  it("accepts reviewable posture observations for both groups", () => {
    expect(rulaPostureAnalysisSchema.safeParse(validAnalysis).success).toBe(true);
  });

  it("accepts independent left and right observations for BOTH-side assessments", () => {
    const result = rulaPostureAnalysisSchema.safeParse({
      ...validAnalysis,
      sideAnalyses: {
        LEFT: { ...validAnalysis, trunk: { ...validAnalysis.trunk, score: 4 } },
        RIGHT: { ...validAnalysis, trunk: { ...validAnalysis.trunk, score: 2 } },
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid angles, scores, and unknown fields", () => {
    expect(rulaPostureAnalysisSchema.safeParse({ ...validAnalysis, upperArm: { ...validAnalysis.upperArm, angle: 181 } }).success).toBe(false);
    expect(rulaPostureAnalysisSchema.safeParse({ ...validAnalysis, wrist: { ...validAnalysis.wrist, score: 0 } }).success).toBe(false);
    expect(rulaPostureAnalysisSchema.safeParse({ ...validAnalysis, extra: validAnalysis.legs }).success).toBe(false);
  });

  it("does not allow an AI result to become final without user confirmation", () => {
    expect(rulaPostureAnalysisSchema.safeParse({ ...validAnalysis, neck: { ...validAnalysis.neck, confirmedByUser: false } }).success).toBe(false);
    expect(rulaPostureAnalysisSchema.safeParse({ ...validAnalysis, neck: { ...validAnalysis.neck, source: "USER", confirmedByUser: true } }).success).toBe(true);
  });

  it("does not treat base scores as reviewed posture observations", () => {
    const baseResult = { ...validAnalysis.neck, source: "DEFAULT" as const, confirmedByUser: false };
    expect(isRulaPostureResultReviewed(baseResult)).toBe(false);
    expect(isRulaPostureAnalysisReviewed("RIGHT", { ...validAnalysis, neck: baseResult })).toBe(false);
    expect(() => assertRulaPostureAnalysisReviewed("RIGHT")).toThrow();
    expect(() => assertRulaPostureAnalysisReviewed("RIGHT", { ...validAnalysis, neck: baseResult })).toThrow();
  });

  it("requires independent reviewed observations for both-side assessments", () => {
    const reviewed = Object.fromEntries(Object.entries(validAnalysis).map(([key, value]) => [key, { ...value, source: "USER", confirmedByUser: true }])) as unknown as typeof validAnalysis;
    expect(isRulaPostureAnalysisReviewed("BOTH", { ...reviewed, sideAnalyses: { LEFT: reviewed, RIGHT: reviewed } })).toBe(true);
    expect(() => assertRulaPostureAnalysisReviewed("BOTH", { ...reviewed, sideAnalyses: { LEFT: reviewed, RIGHT: reviewed } })).not.toThrow();
    expect(() => assertRulaPostureAnalysisReviewed("BOTH", { ...reviewed, sideAnalyses: { LEFT: reviewed } })).toThrow();
  });
});
