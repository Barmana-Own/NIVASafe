export type FmeaSuggestionIdentity = {
  fmeaItemId: string;
  title: string;
};

export function fmeaSuggestionDismissalKey(suggestion: FmeaSuggestionIdentity): string {
  return `${suggestion.fmeaItemId}\u0000${suggestion.title.trim().toLowerCase()}`;
}

export function withoutDismissedFmeaSuggestions<T extends FmeaSuggestionIdentity>(
  suggestions: readonly T[],
  dismissedKeys: ReadonlySet<string>,
): T[] {
  return suggestions.filter((suggestion) => !dismissedKeys.has(fmeaSuggestionDismissalKey(suggestion)));
}
