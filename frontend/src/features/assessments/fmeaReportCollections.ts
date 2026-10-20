import { fmeaSuggestionDismissalKey, type FmeaSuggestionIdentity } from "./fmeaSuggestionDismissal";

export type FmeaReportActionSuggestion = FmeaSuggestionIdentity & {
  id: string;
  description: string;
  failureMode: string;
  priority: string;
  status: string;
  source?: "AI" | "FALLBACK";
};

/** Prefer the returned batch; retain existing recommendations without duplicates. */
export function mergeFmeaAutomaticSuggestions<T extends FmeaSuggestionIdentity>(
  current: readonly T[], candidates: readonly T[], isExcluded: (item: T) => boolean, maximum: number,
): T[] {
  const result: T[] = [];
  const seen = new Set<string>();
  const limit = Math.max(0, Math.trunc(maximum));
  for (const item of [...candidates, ...current]) {
    if (result.length >= limit) break;
    const key = fmeaSuggestionDismissalKey(item);
    if (seen.has(key) || isExcluded(item)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

export function visibleFmeaReportItems<T>(items: readonly T[], expanded: boolean, visibleLimit: number): T[] {
  return expanded ? [...items] : items.slice(0, Math.max(0, Math.trunc(visibleLimit)));
}

export function hiddenFmeaReportItemCount<T>(items: readonly T[], visibleLimit: number): number {
  return Math.max(0, items.length - Math.max(0, Math.trunc(visibleLimit)));
}

export function appendNextFmeaReportSuggestion<T>(
  current: readonly T[],
  candidates: readonly T[],
  getKey: (item: T) => string,
  isExcluded: (item: T) => boolean,
  maximum: number,
): T[] {
  const itemLimit = Math.max(0, Math.trunc(maximum));
  const boundedCurrent = current.slice(0, itemLimit);
  if (boundedCurrent.length >= itemLimit) return boundedCurrent;

  const existingKeys = new Set(boundedCurrent.map(getKey));
  const next = candidates.find((candidate) => !existingKeys.has(getKey(candidate)) && !isExcluded(candidate));

  return next ? [...boundedCurrent, next] : boundedCurrent;
}
