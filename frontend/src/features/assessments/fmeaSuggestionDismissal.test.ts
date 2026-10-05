import { describe, expect, it } from "vitest";
import { fmeaSuggestionDismissalKey, withoutDismissedFmeaSuggestions } from "./fmeaSuggestionDismissal";

describe("FMEA suggested action dismissal", () => {
  it("dismisses only the matching risk and normalized action title", () => {
    const suggestions = [
      { id: "one", fmeaItemId: "risk-1", title: "بازبینی محافظ" },
      { id: "two", fmeaItemId: "risk-2", title: "بازبینی محافظ" },
      { id: "three", fmeaItemId: "risk-1", title: "بررسی ابزار" },
    ];
    const dismissed = new Set([fmeaSuggestionDismissalKey({ fmeaItemId: "risk-1", title: "  بازبینی محافظ  " })]);

    expect(withoutDismissedFmeaSuggestions(suggestions, dismissed)).toEqual([suggestions[1], suggestions[2]]);
  });
});
