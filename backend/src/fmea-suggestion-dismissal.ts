import { createHash } from "node:crypto";

export type FmeaSuggestionDismissalIdentity = { fmeaItemId: string; title: string };

export function fmeaSuggestionDismissalHash(suggestion: FmeaSuggestionDismissalIdentity) {
  const title = suggestion.title.trim().toLowerCase();
  if (!suggestion.fmeaItemId.trim() || !title) throw new Error("A FMEA item and suggestion title are required");
  return createHash("sha256").update(`${suggestion.fmeaItemId}\u0000${title}`).digest("hex");
}
