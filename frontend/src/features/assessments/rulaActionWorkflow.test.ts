import { describe, expect, it } from "vitest";
import { buildReportActionProgress } from "./reportActionProgress";
import { summarizeRulaActionWorkflow } from "./rulaOverviewModel";

describe("RULA corrective-action workflow", () => {
  it("counts saved OPEN actions as active and keeps recommendations separate", () => {
    const actions = [
      { id: "open", title: "Open", priority: "HIGH", status: "OPEN" },
      { id: "running", title: "Running", priority: "LOW", status: "IN_PROGRESS" },
      { id: "done", title: "Done", priority: "MEDIUM", status: "COMPLETED" },
      { id: "cancelled", title: "Cancelled", priority: "HIGH", status: "CANCELLED" },
    ];
    const progress = buildReportActionProgress({ actions, suggestions: [{ id: "rec", title: "Not registered" }] });

    expect(summarizeRulaActionWorkflow(actions, progress)).toEqual({
      totalCount: 4,
      firstPriorityCount: 1,
      completedCount: 1,
      inProgressCount: 2,
      remainingCount: 1,
      completionPercent: 25,
    });
  });

  it("reports zero completion for an empty inventory", () => {
    const progress = buildReportActionProgress({ actions: [], suggestions: [] });
    expect(summarizeRulaActionWorkflow([], progress).completionPercent).toBe(0);
    expect(summarizeRulaActionWorkflow([], progress).totalCount).toBe(0);
  });
});
