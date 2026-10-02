import { describe, expect, it } from "vitest";
import type { RulaCorrectionAction, RulaReportFactor } from "../assessmentShared";
import { rulaOverviewMetrics } from "./rulaOverviewModel";

function factor(key: RulaReportFactor["key"], impactLevel: RulaReportFactor["impactLevel"], score: number): RulaReportFactor {
  return { key, impactLevel, score, angle: null, impactPercent: 0, source: "DEFAULT" };
}

function action(id: string, extra: Partial<RulaCorrectionAction> = {}): RulaCorrectionAction {
  return {
    id,
    titleFa: id,
    titleEn: id,
    descriptionFa: "",
    descriptionEn: "",
    priority: "MEDIUM",
    scoreReduction: 1,
    affectedParts: [],
    ...extra,
  };
}

describe("rulaOverviewMetrics", () => {
  it("summarizes impact levels and distinguishes chosen suggestions from manual actions", () => {
    const suggestions = [action("suggestion-1"), action("suggestion-2")];
    const selectedActions = [suggestions[0], action("manual-1")];

    expect(rulaOverviewMetrics({
      factors: [factor("neck", "HIGH", 4), factor("upperArm", "MEDIUM", 3), factor("trunk", "LOW", 0)],
      suggestions,
      selectedActions,
      score: 6,
      predictedScore: 4,
    })).toEqual({
      contributingFactorCount: 2,
      impactDistribution: { HIGH: 1, MEDIUM: 1, LOW: 1 },
      selectedSuggestionCount: 1,
      remainingSuggestionCount: 1,
      manualActionCount: 1,
      suggestionSelectionPercent: 50,
      predictedScoreReduction: 2,
    });
  });

  it("handles an empty recommendation set without inventing completion progress", () => {
    expect(rulaOverviewMetrics({
      factors: [],
      suggestions: [],
      selectedActions: [action("manual-1")],
      score: 4,
      predictedScore: 5,
    })).toEqual({
      contributingFactorCount: 0,
      impactDistribution: { HIGH: 0, MEDIUM: 0, LOW: 0 },
      selectedSuggestionCount: 0,
      remainingSuggestionCount: 0,
      manualActionCount: 1,
      suggestionSelectionPercent: 0,
      predictedScoreReduction: 0,
    });
  });
});
