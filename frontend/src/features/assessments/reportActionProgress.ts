export type ProgressBodySide = "LEFT" | "RIGHT" | "BOTH";

export type ReportActionItem = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  persisted?: boolean;
  suggestionId?: string | null;
  bodySide?: ProgressBodySide | null;
  priority?: string;
  dueDate?: string | null;
};

export type ReportSuggestionItem = {
  id: string;
  title: string;
  description?: string | null;
  suggestionId?: string | null;
  bodySide?: ProgressBodySide | null;
  priority?: string;
};

export type ReportActionProgressInput = {
  actions: readonly ReportActionItem[];
  suggestions?: readonly ReportSuggestionItem[];
  dismissedSuggestionIds?: readonly string[];
  bodySide?: Exclude<ProgressBodySide, "BOTH">;
};

export type ReportActionProgress = {
  completed: ReportActionItem[];
  registeredActive: ReportActionItem[];
  remainingSuggestions: ReportSuggestionItem[];
  completedCount: number;
  inProgressCount: number;
  remainingCount: number;
  totalCount: number;
  completedPercentage: number;
  inProgressPercentage: number;
  remainingPercentage: number;
};

const activeStatuses = new Set(["OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING_FOR_REVIEW", "OVERDUE"]);
const excludedStatuses = new Set(["CANCELLED", "REJECTED"]);

function isInSideScope(side: ProgressBodySide | null | undefined, selectedSide: ReportActionProgressInput["bodySide"]) {
  if (!selectedSide) return true;
  return side === selectedSide || side === "BOTH";
}

function percentage(count: number, total: number) {
  return total > 0 ? (count / total) * 100 : 0;
}

/** Build the report inventory from saved actions and unsaved recommendations separately. */
export function buildReportActionProgress(input: ReportActionProgressInput): ReportActionProgress {
  const seenActionIds = new Set<string>();
  const linkedSuggestionIds = new Set<string>();
  const completed: ReportActionItem[] = [];
  const registeredActive: ReportActionItem[] = [];

  for (const action of input.actions) {
    if (action.persisted === false || !action.id.trim() || seenActionIds.has(action.id)) continue;
    if (!isInSideScope(action.bodySide, input.bodySide)) continue;
    seenActionIds.add(action.id);
    const status = action.status.trim().toUpperCase();
    if (status === "COMPLETED") {
      completed.push(action);
      if (action.suggestionId) linkedSuggestionIds.add(action.suggestionId);
    } else if (!excludedStatuses.has(status) && activeStatuses.has(status)) {
      registeredActive.push(action);
      if (action.suggestionId) linkedSuggestionIds.add(action.suggestionId);
    }
  }

  const dismissed = new Set(input.dismissedSuggestionIds ?? []);
  const seenSuggestionIds = new Set<string>();
  const remainingSuggestions = (input.suggestions ?? []).filter((suggestion) => {
    const id = suggestion.id.trim();
    if (!id || seenSuggestionIds.has(id) || dismissed.has(id) || linkedSuggestionIds.has(id)) return false;
    if (!isInSideScope(suggestion.bodySide, input.bodySide)) return false;
    seenSuggestionIds.add(id);
    return true;
  });

  const totalCount = completed.length + registeredActive.length + remainingSuggestions.length;
  return {
    completed,
    registeredActive,
    remainingSuggestions,
    completedCount: completed.length,
    inProgressCount: registeredActive.length,
    remainingCount: remainingSuggestions.length,
    totalCount,
    completedPercentage: percentage(completed.length, totalCount),
    inProgressPercentage: percentage(registeredActive.length, totalCount),
    remainingPercentage: percentage(remainingSuggestions.length, totalCount),
  };
}
