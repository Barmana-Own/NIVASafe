import { describe, expect, it } from "vitest";
import { fmeaSuggestionDismissalHash } from "./fmea-suggestion-dismissal.js";

describe("FMEA suggestion dismissal identity", () => {
  it("normalizes title whitespace and case while keeping risk-row scope", () => {
    const base = fmeaSuggestionDismissalHash({ fmeaItemId: "risk-1", title: "  Inspect guard  " });
    expect(base).toMatch(/^[a-f0-9]{64}$/);
    expect(fmeaSuggestionDismissalHash({ fmeaItemId: "risk-1", title: "inspect guard" })).toBe(base);
    expect(fmeaSuggestionDismissalHash({ fmeaItemId: "risk-2", title: "inspect guard" })).not.toBe(base);
    expect(fmeaSuggestionDismissalHash({ fmeaItemId: "risk-1", title: "Inspect guard more" })).not.toBe(base);
  });

  it("does not treat an empty normalized title as a suggestion", () => {
    expect(() => fmeaSuggestionDismissalHash({ fmeaItemId: "risk-1", title: "  " })).toThrow();
  });
});
