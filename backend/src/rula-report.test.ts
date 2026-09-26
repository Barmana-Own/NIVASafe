import { describe, expect, it } from "vitest";
import { buildRulaFactors, buildRulaSideResults, buildRulaSuggestions, buildRulaSuggestionsForAssessment, fallbackRulaPostureAnalysis, predictedRulaScore, primaryRulaResult, rulaImpactSchema, type RulaImpact } from "./rula-report.js";
import { rulaPosturePartKeys, type RulaPostureAnalysis } from "./rula-posture.js";

const analysis: RulaPostureAnalysis = {
  upperArm: { angle: 52, score: 3, detected: true, source: "AI", confirmedByUser: true },
  lowerArm: { angle: 87, score: 2, detected: true, source: "AI", confirmedByUser: true },
  wrist: { angle: 18, score: 1, detected: true, source: "AI", confirmedByUser: true },
  wristTwist: { angle: 0, score: 1, detected: false, source: "AI", confirmedByUser: true },
  neck: { angle: 24, score: 3, detected: true, source: "AI", confirmedByUser: true },
  trunk: { angle: 17, score: 2, detected: true, source: "AI", confirmedByUser: true },
  legs: { angle: null, score: 1, detected: true, source: "AI", confirmedByUser: true },
};

const inputs = { upperArm: 3, lowerArm: 2, wrist: 1, wristTwist: 1, neck: 3, trunk: 2, legs: 1, muscleUse: true, force: 1 };

describe("RULA results report", () => {
  it("exposes the three requested main factors with angle and contribution", () => {
    const factors = buildRulaFactors(analysis);
    expect(factors.map((factor) => factor.key)).toEqual(["neck", "upperArm", "trunk"]);
    expect(factors[0]).toMatchObject({ angle: 24, detected: true, score: 3, impactLevel: "MEDIUM" });
    expect(factors.every((factor) => factor.impactPercent >= 0 && factor.impactPercent <= 100)).toBe(true);
  });

  it("returns main factors in descending contribution order", () => {
    const factors = buildRulaFactors({ ...analysis, neck: { ...analysis.neck, score: 2 }, upperArm: { ...analysis.upperArm, score: 5 }, trunk: { ...analysis.trunk, score: 3 } });
    expect(factors.map((factor) => factor.key)).toEqual(["upperArm", "trunk", "neck"]);
  });

  it("creates corrective suggestions from the posture and force inputs", () => {
    const suggestions = buildRulaSuggestions(analysis, inputs);
    expect(suggestions.map((suggestion) => suggestion.id)).toEqual(expect.arrayContaining(["adjust-work-surface", "correct-neck-position", "reduce-posture-hold", "support-upper-limb"]));
    expect(suggestions.every((suggestion) => suggestion.scoreReduction >= 0 && suggestion.affectedParts.length > 0)).toBe(true);
    expect(suggestions.every((suggestion) => suggestion.bodySide === "RIGHT")).toBe(true);
    expect(buildRulaSuggestions(analysis, inputs, "LEFT").every((suggestion) => suggestion.bodySide === "LEFT")).toBe(true);
  });

  it("calculates both body sides independently and exposes side-scoped suggestions", () => {
    const bothAnalysis: RulaPostureAnalysis = {
      ...analysis,
      sideAnalyses: {
        LEFT: { ...analysis, neck: { ...analysis.neck, score: 5 }, trunk: { ...analysis.trunk, score: 4 } },
        RIGHT: { ...analysis, upperArm: { ...analysis.upperArm, score: 1 }, neck: { ...analysis.neck, score: 1 }, trunk: { ...analysis.trunk, score: 1 } },
      },
    };
    const sideResults = buildRulaSideResults("BOTH", inputs, bothAnalysis);
    expect(sideResults).toBeDefined();
    expect(sideResults!.LEFT.score).not.toBe(sideResults!.RIGHT.score);
    expect(primaryRulaResult(sideResults!).score).toBe(Math.max(sideResults!.LEFT.score, sideResults!.RIGHT.score));

    const suggestions = buildRulaSuggestionsForAssessment("BOTH", bothAnalysis, inputs);
    expect(suggestions).toHaveLength(6);
    expect(suggestions.some((suggestion) => suggestion.bodySide === "LEFT")).toBe(true);
    expect(suggestions.some((suggestion) => suggestion.bodySide === "RIGHT")).toBe(true);
    expect(new Set(suggestions.map((suggestion) => suggestion.id)).size).toBe(suggestions.length);
  });
  it("updates the predicted score from selected actions and keeps it bounded", () => {
    const impacts: RulaImpact[] = [{ scoreReduction: 2, affectedParts: ["neck", "trunk"] }, { scoreReduction: 1, affectedParts: ["upperArm"] }];
    expect(predictedRulaScore(6, impacts)).toBe(3);
    expect(predictedRulaScore(2, [{ scoreReduction: 6 }])).toBe(1);
  });

  it("validates persisted corrective-action impact metadata", () => {
    expect(rulaImpactSchema.safeParse({ suggestionId: "adjust-work-surface", scoreReduction: 2, affectedParts: ["neck", "trunk"] }).success).toBe(true);
    expect(rulaImpactSchema.safeParse({ scoreReduction: 7, affectedParts: ["unknown"] }).success).toBe(false);
  });

  it("marks legacy input-only posture values as unreviewed", () => {
    const fallback = fallbackRulaPostureAnalysis(inputs);
    expect(rulaPosturePartKeys.every((key) => fallback[key].source === "DEFAULT" && !fallback[key].confirmedByUser)).toBe(true);
  });
});
