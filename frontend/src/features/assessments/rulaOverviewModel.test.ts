import { describe, expect, it } from "vitest";
import { buildRulaOverviewMetrics, summarizeRulaCorrectiveActions } from "./rulaOverviewModel";

describe("RULA stage-three overview metrics", () => {
  it("distributes actual results across the four RULA action levels", () => {
    expect(buildRulaOverviewMetrics([
      { actionLevel: 4 }, { actionLevel: 3 }, { actionLevel: 2 }, { actionLevel: 1 }, { actionLevel: 2 },
    ], true)).toEqual({
      totalResults: 5,
      riskDistribution: [
        { actionLevel: 4, count: 1, percentage: 20, startPercentage: 0 },
        { actionLevel: 3, count: 1, percentage: 20, startPercentage: 20 },
        { actionLevel: 2, count: 2, percentage: 40, startPercentage: 40 },
        { actionLevel: 1, count: 1, percentage: 20, startPercentage: 80 },
      ],
    });
  });

  it("does not include pending results or malformed action levels", () => {
    const pending = buildRulaOverviewMetrics([{ actionLevel: 4 }], false);
    expect(pending.totalResults).toBe(0);
    expect(pending.riskDistribution.every((item) => item.count === 0 && item.percentage === 0)).toBe(true);

    const malformed = buildRulaOverviewMetrics([
      { actionLevel: 0 }, { actionLevel: 2.5 }, { actionLevel: 5 }, { actionLevel: 3 },
    ], true);
    expect(malformed.totalResults).toBe(1);
    expect(malformed.riskDistribution.find((item) => item.actionLevel === 3)?.count).toBe(1);
  });

  it("returns an empty distribution without fabricating results", () => {
    const metrics = buildRulaOverviewMetrics([], true);
    expect(metrics.totalResults).toBe(0);
    expect(metrics.riskDistribution.map((item) => item.count)).toEqual([0, 0, 0, 0]);
  });

  it("summarizes priority, status groups, and persisted action progress", () => {
    expect(summarizeRulaCorrectiveActions([
      { priority: "CRITICAL", status: "OPEN", progress: 0 },
      { priority: "HIGH", status: "COMPLETED", progress: 100 },
      { priority: "MEDIUM", status: "IN_PROGRESS", progress: 50 },
      { priority: "HIGH", status: "CANCELLED" },
      { priority: "CRITICAL", status: "REJECTED" },
    ])).toEqual({
      firstPriorityCount: 2,
      totalCount: 3,
      completedCount: 1,
      inProgressCount: 1,
      remainingCount: 1,
      completionPercent: 50,
    });
  });

  it("counts selected draft actions as remaining and handles an empty action list", () => {
    expect(summarizeRulaCorrectiveActions([
      { priority: "HIGH" }, { priority: "LOW" },
    ])).toEqual({
      firstPriorityCount: 1,
      totalCount: 2,
      completedCount: 0,
      inProgressCount: 0,
      remainingCount: 2,
      completionPercent: 0,
    });
    expect(summarizeRulaCorrectiveActions([])).toEqual({
      firstPriorityCount: 0,
      totalCount: 0,
      completedCount: 0,
      inProgressCount: 0,
      remainingCount: 0,
      completionPercent: 0,
    });
  });

  it("keeps left- and right-side action totals independently scoped", () => {
    const actions = [
      { priority: "HIGH", bodySide: "RIGHT" as const, status: "COMPLETED", progress: 100 },
      { priority: "CRITICAL", bodySide: "LEFT" as const, status: "OPEN", progress: 0 },
      { priority: "MEDIUM", bodySide: "BOTH" as const, status: "IN_PROGRESS", progress: 50 },
    ];

    expect(summarizeRulaCorrectiveActions(actions, "RIGHT")).toMatchObject({
      firstPriorityCount: 1, totalCount: 2, completedCount: 1, inProgressCount: 1, remainingCount: 0, completionPercent: 75,
    });
    expect(summarizeRulaCorrectiveActions(actions, "LEFT")).toMatchObject({
      firstPriorityCount: 1, totalCount: 2, completedCount: 0, inProgressCount: 1, remainingCount: 1, completionPercent: 25,
    });
  });

  it("clamps invalid progress and keeps overdue actions in the remaining group", () => {
    expect(summarizeRulaCorrectiveActions([
      { priority: "LOW", status: "OVERDUE", progress: 140 },
      { priority: "LOW", status: "OPEN", progress: -8 },
      { priority: "LOW", status: "COMPLETED", progress: Number.NaN },
    ])).toMatchObject({
      totalCount: 3, completedCount: 1, inProgressCount: 0, remainingCount: 2, completionPercent: 33,
    });
  });
});
