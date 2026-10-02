import type { RulaCorrectionAction, RulaReportFactor } from "../assessmentShared";
import { rulaActionIsSame } from "./rulaModel";

export type RulaOverviewMetrics = {
  contributingFactorCount: number;
  impactDistribution: Record<RulaReportFactor["impactLevel"], number>;
  selectedSuggestionCount: number;
  remainingSuggestionCount: number;
  manualActionCount: number;
  suggestionSelectionPercent: number;
  predictedScoreReduction: number;
};

export function rulaOverviewMetrics({
  factors,
  suggestions,
  selectedActions,
  score,
  predictedScore,
}: {
  factors: RulaReportFactor[];
  suggestions: RulaCorrectionAction[];
  selectedActions: RulaCorrectionAction[];
  score: number;
  predictedScore: number;
}): RulaOverviewMetrics {
  const impactDistribution: RulaOverviewMetrics["impactDistribution"] = {
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };

  for (const factor of factors) impactDistribution[factor.impactLevel] += 1;

  const selectedSuggestionCount = suggestions.filter((suggestion) =>
    selectedActions.some((action) => rulaActionIsSame(action, suggestion)),
  ).length;
  const remainingSuggestionCount = Math.max(0, suggestions.length - selectedSuggestionCount);
  const manualActionCount = selectedActions.filter((action) =>
    !suggestions.some((suggestion) => rulaActionIsSame(action, suggestion)),
  ).length;

  return {
    contributingFactorCount: factors.filter((factor) => factor.score > 0).length,
    impactDistribution,
    selectedSuggestionCount,
    remainingSuggestionCount,
    manualActionCount,
    suggestionSelectionPercent: suggestions.length
      ? Math.round((selectedSuggestionCount / suggestions.length) * 100)
      : 0,
    predictedScoreReduction: Math.max(0, score - predictedScore),
  };
}
