export const rulaActionLevels = [4, 3, 2, 1] as const;

export type RulaActionLevel = (typeof rulaActionLevels)[number];

export type RulaOverviewResult = {
  actionLevel: number;
};

export type RulaOverviewCorrectiveAction = {
  priority: string;
  status?: string;
  progress?: number;
  bodySide?: "RIGHT" | "LEFT" | "BOTH" | null;
};

export type RulaCorrectiveActionSummary = {
  firstPriorityCount: number;
  totalCount: number;
  completedCount: number;
  inProgressCount: number;
  remainingCount: number;
  completionPercent: number;
};

export type RulaOverviewMetrics = {
  riskDistribution: Array<{
    actionLevel: RulaActionLevel;
    count: number;
    percentage: number;
    startPercentage: number;
  }>;
  totalResults: number;
};

function actionProgress(action: RulaOverviewCorrectiveAction) {
  const value = Number.isFinite(action.progress) ? action.progress! : 0;
  return Math.min(100, Math.max(0, value));
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
  const inProgressCount = activeActions.filter((action) => ["ASSIGNED", "IN_PROGRESS", "WAITING_FOR_REVIEW"].includes(action.status ?? "")).length;
  const completionPercent = totalCount > 0
    ? Math.round(activeActions.reduce((total, action) => total + actionProgress(action), 0) / totalCount)
    : 0;

  return {
    firstPriorityCount: activeActions.filter((action) => action.priority === "CRITICAL" || action.priority === "HIGH").length,
    totalCount,
    completedCount,
    inProgressCount,
    remainingCount: totalCount - completedCount - inProgressCount,
    completionPercent,
  };
}

export function buildRulaOverviewMetrics(results: readonly RulaOverviewResult[], reviewComplete: boolean): RulaOverviewMetrics {
  const counts = new Map<RulaActionLevel, number>(rulaActionLevels.map((level) => [level, 0]));
  if (reviewComplete) {
    for (const result of results) {
      if (!Number.isInteger(result.actionLevel) || !counts.has(result.actionLevel as RulaActionLevel)) continue;
      const actionLevel = result.actionLevel as RulaActionLevel;
      counts.set(actionLevel, counts.get(actionLevel)! + 1);
    }
  }

  const totalResults = [...counts.values()].reduce((total, count) => total + count, 0);
  let cursor = 0;
  const riskDistribution = rulaActionLevels.map((actionLevel) => {
    const count = counts.get(actionLevel)!;
    const percentage = totalResults > 0 ? (count / totalResults) * 100 : 0;
    const entry = { actionLevel, count, percentage, startPercentage: cursor };
    cursor += percentage;
    return entry;
  });

  return { riskDistribution, totalResults };
}
