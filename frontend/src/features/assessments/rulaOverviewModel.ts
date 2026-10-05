export const rulaImpactLevels = ["HIGH", "MEDIUM", "LOW"] as const;

export type RulaImpactLevel = (typeof rulaImpactLevels)[number];

export type RulaOverviewFactor = {
  score: number;
  impactLevel: RulaImpactLevel;
};

export type RulaOverviewCorrectiveAction = {
  priority: string;
  status?: string;
  bodySide?: "RIGHT" | "LEFT" | "BOTH" | null;
};

export type RulaCorrectiveActionSummary = {
  firstPriorityCount: number;
  totalCount: number;
  completedCount: number;
  remainingCount: number;
  completionPercent: number;
};

export type RulaOverviewMetrics = {
  impactDistribution: Array<{
    level: RulaImpactLevel;
    score: number;
    factorCount: number;
    sharePercent: number;
    share: number;
  }>;
  totalFactorScore: number;
  selectedRecommendationCount: number;
  remainingRecommendationCount: number;
  recommendationCount: number;
  selectionPercent: number;
  manualActionCount: number;
  estimatedScoreReduction: number;
};

function nonNegativeInteger(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

export function summarizeRulaCorrectiveActions(
  actions: readonly RulaOverviewCorrectiveAction[],
  bodySide?: "RIGHT" | "LEFT",
): RulaCorrectiveActionSummary {
  const activeActions = actions.filter((action) =>
    action.status !== "CANCELLED"
    && action.status !== "REJECTED"
    && (!bodySide || !action.bodySide || action.bodySide === "BOTH" || action.bodySide === bodySide),
  );
  const totalCount = activeActions.length;
  const completedCount = activeActions.filter((action) => action.status === "COMPLETED").length;

  return {
    firstPriorityCount: activeActions.filter((action) => action.priority === "CRITICAL" || action.priority === "HIGH").length,
    totalCount,
    completedCount,
    remainingCount: totalCount - completedCount,
    completionPercent: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
  };
}

export function buildRulaOverviewMetrics({
  factors,
  selectedRecommendationCount,
  recommendationCount,
  manualActionCount,
  currentScore,
  predictedScore,
  reviewComplete,
}: {
  factors: readonly RulaOverviewFactor[];
  selectedRecommendationCount: number;
  recommendationCount: number;
  manualActionCount: number;
  currentScore: number;
  predictedScore: number;
  reviewComplete: boolean;
}): RulaOverviewMetrics {
  const groups = new Map<RulaImpactLevel, { score: number; factorCount: number }>(
    rulaImpactLevels.map((level) => [level, { score: 0, factorCount: 0 }]),
  );

  if (reviewComplete) {
    for (const factor of factors) {
      if (!Number.isFinite(factor.score) || factor.score <= 0) continue;
      const group = groups.get(factor.impactLevel);
      if (!group) continue;
      group.score += factor.score;
      group.factorCount += 1;
    }
  }

  const totalFactorScore = [...groups.values()].reduce((total, group) => total + group.score, 0);
  const impactDistribution = rulaImpactLevels.map((level) => {
    const group = groups.get(level)!;
    const share = totalFactorScore > 0 ? group.score / totalFactorScore : 0;
    return {
      level,
      ...group,
      share,
      sharePercent: Math.round(share * 100),
    };
  });

  const normalizedRecommendationCount = nonNegativeInteger(recommendationCount);
  const normalizedSelectedCount = Math.min(
    normalizedRecommendationCount,
    nonNegativeInteger(selectedRecommendationCount),
  );
  const selectionPercent = normalizedRecommendationCount > 0
    ? Math.round((normalizedSelectedCount / normalizedRecommendationCount) * 100)
    : 0;
  const estimatedScoreReduction = reviewComplete && Number.isFinite(currentScore) && Number.isFinite(predictedScore)
    ? Math.max(0, currentScore - predictedScore)
    : 0;

  return {
    impactDistribution,
    totalFactorScore,
    selectedRecommendationCount: normalizedSelectedCount,
    remainingRecommendationCount: normalizedRecommendationCount - normalizedSelectedCount,
    recommendationCount: normalizedRecommendationCount,
    selectionPercent,
    manualActionCount: nonNegativeInteger(manualActionCount),
    estimatedScoreReduction,
  };
}
