export type FmeaReportProgressAction = {
  id?: string;
  title: string;
  fmeaItemId: string | null;
  status: string;
  progress: number;
};

export type FmeaReportProgressSuggestion = {
  id: string;
  title: string;
  fmeaItemId: string;
};

export type FmeaReportActionProgress = {
  completedCount: number;
  activeCount: number;
  remainingCount: number;
  registeredCount: number;
  totalCount: number;
  completedPercentage: number;
  averageProgress: number;
};

const activeStatuses = new Set(["OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING_FOR_REVIEW", "OVERDUE"]);
const excludedStatuses = new Set(["CANCELLED", "REJECTED"]);

function suggestionIdentity(itemId: string, title: string) {
  return `${itemId.trim()}\u0000${title.trim().toLowerCase()}`;
}

/** Derive report counts from saved action IDs and distinct unregistered recommendations. */
export function buildFmeaReportActionProgress(
  actions: readonly FmeaReportProgressAction[],
  suggestions: readonly FmeaReportProgressSuggestion[],
): FmeaReportActionProgress {
  const seenActionIds = new Set<string>();
  const activeActions: FmeaReportProgressAction[] = [];
  const completedActions: FmeaReportProgressAction[] = [];

  actions.forEach((action, index) => {
    const id = action.id?.trim() || `record-${index}`;
    if (seenActionIds.has(id)) return;
    seenActionIds.add(id);
    const status = action.status.trim().toUpperCase();
    if (status === "COMPLETED") completedActions.push(action);
    else if (!excludedStatuses.has(status) && activeStatuses.has(status)) activeActions.push(action);
  });

  const registeredIdentities = new Set([...activeActions, ...completedActions]
    .filter((action) => action.fmeaItemId)
    .map((action) => suggestionIdentity(action.fmeaItemId!, action.title)));
  const seenSuggestions = new Set<string>();
  let remainingCount = 0;
  for (const suggestion of suggestions) {
    if (!suggestion.fmeaItemId.trim() || !suggestion.title.trim()) continue;
    const identity = suggestionIdentity(suggestion.fmeaItemId, suggestion.title);
    if (seenSuggestions.has(identity) || registeredIdentities.has(identity)) continue;
    seenSuggestions.add(identity);
    remainingCount += 1;
  }

  const registered = [...activeActions, ...completedActions];
  const registeredCount = registered.length;
  const totalCount = registeredCount + remainingCount;
  const averageProgress = registeredCount
    ? Math.round(registered.reduce((sum, action) => sum + Math.max(0, Math.min(100, Number(action.progress) || 0)), 0) / registeredCount)
    : 0;
  return {
    completedCount: completedActions.length,
    activeCount: activeActions.length,
    remainingCount,
    registeredCount,
    totalCount,
    completedPercentage: totalCount ? completedActions.length / totalCount * 100 : 0,
    averageProgress,
  };
}
