import { describe, expect, it } from "vitest";
import { isFmeaRowCompleted, isFmeaSuggestionRegistered, summarizeFmeaRowWorkflow } from "./fmeaActionWorkflow";
const row = (...statuses: string[]) => ({ correctiveActions: statuses.map(status => ({ status })) });
describe("FMEA row corrective workflow", () => {
  it("removes a registered suggestion even when its action belongs to an independent row", () => {
    const suggestion = { title: "Adjust fixture", fmeaItemId: "source", failureMode: "Assembly error" };
    expect(isFmeaSuggestionRegistered(suggestion, [{ title: "Adjust fixture", fmeaItemId: "new-row", fmeaItem: { failureMode: "Assembly error" } }])).toBe(true);
    expect(isFmeaSuggestionRegistered(suggestion, [{ title: "Adjust fixture", fmeaItemId: "other", fmeaItem: { failureMode: "Other risk" } }])).toBe(false);
  });
  it("keeps a suggestion available after its matching saved action was cancelled or rejected", () => {
    const suggestion = { title: "Adjust fixture", fmeaItemId: "source", failureMode: "Assembly error" };
    expect(isFmeaSuggestionRegistered(suggestion, [
      { title: "Adjust fixture", status: "CANCELLED", fmeaItemId: "source", fmeaItem: null },
      { title: "Adjust fixture", status: "REJECTED", fmeaItemId: "source", fmeaItem: null },
    ])).toBe(false);
  });
  it("counts registered rows once and pending suggestions separately", () => {
    expect(summarizeFmeaRowWorkflow([row(), row("COMPLETED", "COMPLETED"), row("COMPLETED", "IN_PROGRESS")], 2)).toEqual({ completedCount: 1, inProgressCount: 2, remainingCount: 2, completionPercent: 20 });
  });
  it("does not let cancelled/rejected actions mark or block row completion", () => {
    expect(isFmeaRowCompleted(row("CANCELLED", "REJECTED"))).toBe(false);
    expect(isFmeaRowCompleted(row("COMPLETED", "CANCELLED"))).toBe(true);
    expect(isFmeaRowCompleted(row("COMPLETED", "OPEN"))).toBe(false);
  });
  it("has a safe empty denominator and updates all statuses after completion", () => {
    expect(summarizeFmeaRowWorkflow([], 0).completionPercent).toBe(0);
    expect(summarizeFmeaRowWorkflow([row("COMPLETED")], 0)).toEqual({ completedCount: 1, inProgressCount: 0, remainingCount: 0, completionPercent: 100 });
  });
});
