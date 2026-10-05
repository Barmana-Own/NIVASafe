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
