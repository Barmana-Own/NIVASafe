import { describe, expect, it } from "vitest";
import { appendNextFmeaReportSuggestion, hiddenFmeaReportItemCount, visibleFmeaReportItems } from "./fmeaReportCollections";

describe("FMEA report collections", () => {
  it("shows five items by default and reveals the full collection when expanded", () => {
    const items = Array.from({ length: 9 }, (_, index) => ({ id: `item-${index + 1}` }));

    expect(visibleFmeaReportItems(items, false, 5)).toEqual(items.slice(0, 5));
    expect(hiddenFmeaReportItemCount(items, 5)).toBe(4);
    expect(visibleFmeaReportItems(items, true, 5)).toEqual(items);
    expect(hiddenFmeaReportItemCount(items.slice(0, 5), 5)).toBe(0);
  });

  it("appends only the next eligible AI suggestion and never exceeds eight", () => {
    type Suggestion = { fmeaItemId: string; title: string };
    const current = Array.from({ length: 7 }, (_, index) => ({ fmeaItemId: `risk-${index}`, title: `Action ${index}` }));
    const candidates: Suggestion[] = [
      current[0],
      { fmeaItemId: "risk-8", title: "Registered action" },
      { fmeaItemId: "risk-8", title: "First new suggestion" },
      { fmeaItemId: "risk-9", title: "Second new suggestion" },
    ];
    const registeredKeys = new Set(["risk-8\u0000registered action"]);
    const keyOf = (item: Suggestion) => `${item.fmeaItemId}\u0000${item.title.toLowerCase()}`;
    const excludeRegistered = (item: Suggestion) => registeredKeys.has(keyOf(item));

    const firstClick = appendNextFmeaReportSuggestion(current, candidates, keyOf, excludeRegistered, 8);
    expect(firstClick).toHaveLength(8);
    expect(firstClick.at(-1)?.title).toBe("First new suggestion");

    const secondClick = appendNextFmeaReportSuggestion(firstClick, candidates, keyOf, excludeRegistered, 8);
    expect(secondClick).toEqual(firstClick);
    expect(appendNextFmeaReportSuggestion(secondClick, [{ fmeaItemId: "risk-10", title: "Over limit" }], keyOf, () => false, 8)).toHaveLength(8);
  });

  it("adds at most one suggestion per invocation while skipping already displayed items", () => {
    type Suggestion = { fmeaItemId: string; title: string };
    const candidates: Suggestion[] = [
      { fmeaItemId: "risk-1", title: "First" },
      { fmeaItemId: "risk-2", title: "Second" },
    ];
    const keyOf = (item: Suggestion) => `${item.fmeaItemId}:${item.title}`;

    const firstClick = appendNextFmeaReportSuggestion([], candidates, keyOf, () => false, 8);
    const secondClick = appendNextFmeaReportSuggestion(firstClick, candidates, keyOf, () => false, 8);

    expect(firstClick).toEqual([candidates[0]]);
    expect(secondClick).toEqual(candidates);
  });
});
