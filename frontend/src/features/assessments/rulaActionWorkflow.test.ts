import { describe, expect, it } from "vitest";
import { summarizeRulaActionWorkflow } from "./rulaOverviewModel";

describe("RULA corrective-action workflow", () => {
  it("counts unselected, selected and completed actions once and uses actual completion", () => {
    expect(summarizeRulaActionWorkflow([
      { priority: "HIGH", status: "UNSELECTED" },
      { priority: "LOW", status: "OPEN", progress: 0 },
      { priority: "MEDIUM", status: "IN_PROGRESS", progress: 50 },
      { priority: "HIGH", status: "COMPLETED", progress: 0 },
      { priority: "HIGH", status: "CANCELLED" },
    ])).toEqual({ totalCount: 4, firstPriorityCount: 2, completedCount: 1, inProgressCount: 2, remainingCount: 1, completionPercent: 25 });
  });
  it("handles empty inventory and a completed action without remaining recommendations", () => {
    expect(summarizeRulaActionWorkflow([]).completionPercent).toBe(0);
    expect(summarizeRulaActionWorkflow([{ priority: "LOW", status: "COMPLETED" }])).toMatchObject({ completedCount: 1, completionPercent: 100, remainingCount: 0 });
  });
});
