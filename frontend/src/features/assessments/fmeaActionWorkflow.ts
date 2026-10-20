type LinkedAction = { status: string };
type WorkflowRow = { correctiveActions: readonly LinkedAction[] };

export function isFmeaSuggestionRegistered(suggestion: { title: string; fmeaItemId: string; failureMode: string }, actions: readonly { title: string; status?: string; fmeaItemId: string | null; fmeaItem: { failureMode: string } | null }[]) {
  const normalize = (value: string) => value.trim().toLocaleLowerCase();
  return actions.some(action => !["CANCELLED", "REJECTED"].includes(action.status?.toUpperCase() ?? "")
    && normalize(action.title) === normalize(suggestion.title)
    && (action.fmeaItemId === suggestion.fmeaItemId || action.fmeaItem?.failureMode === suggestion.failureMode));
}

export function isFmeaRowCompleted(row: WorkflowRow) {
  const active = row.correctiveActions.filter(action => !["CANCELLED", "REJECTED"].includes(action.status));
  return active.length > 0 && active.every(action => action.status === "COMPLETED");
}

/** One workflow entry per registered risk row, plus unregistered recommendations. */
export function summarizeFmeaRowWorkflow(rows: readonly WorkflowRow[], remainingSuggestions: number) {
  const completedCount = rows.filter(isFmeaRowCompleted).length;
  const remainingCount = Math.max(0, Math.trunc(remainingSuggestions));
  const total = rows.length + remainingCount;
  return { completedCount, inProgressCount: rows.length - completedCount, remainingCount,
    completionPercent: total ? Math.round(completedCount / total * 100) : 0 };
}
