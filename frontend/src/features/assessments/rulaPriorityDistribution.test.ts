import { describe, expect, it } from "vitest";
import { buildRulaPriorityDistribution } from "./rulaOverviewModel";

describe("RULA corrective priority distribution", () => {
  it("maps all four priorities to their displayed action levels", () => {
    const metrics = buildRulaPriorityDistribution([
      { priority: "CRITICAL" }, { priority: "HIGH" }, { priority: "MEDIUM" }, { priority: "LOW" },
    ]);
    expect(metrics.totalResults).toBe(4);
    expect(metrics.riskDistribution.map(({ count, percentage }) => [count, percentage]))
      .toEqual([[1, 25], [1, 25], [1, 25], [1, 25]]);
    expect(metrics.riskDistribution.map(({ startPercentage }) => startPercentage))
      .toEqual([0, 25, 50, 75]);
  });

  it("includes unselected AI suggestions and completed/manual row actions", () => {
    const metrics = buildRulaPriorityDistribution([
      { priority: "LOW", status: "UNSELECTED" },
      { priority: "LOW", status: "UNSELECTED" },
      { priority: "LOW", status: "UNSELECTED" },
      { priority: "HIGH", status: "COMPLETED" },
      { priority: "CRITICAL", status: "IN_PROGRESS" },
    ]);
    expect(metrics.totalResults).toBe(5);
    expect(metrics.riskDistribution.map(({ count, percentage }) => [count, percentage]))
      .toEqual([[1, 20], [1, 20], [0, 0], [3, 60]]);
  });

  it("excludes cancelled/rejected and invalid priorities instead of inventing counts", () => {
    const metrics = buildRulaPriorityDistribution([
      { priority: "HIGH", status: "CANCELLED" }, { priority: "LOW", status: "REJECTED" },
      { priority: "" }, { priority: "UNKNOWN" }, { priority: "toString" },
      { priority: "__proto__" },
    ]);
    expect(metrics.totalResults).toBe(0);
    expect(metrics.riskDistribution.every(({ count, percentage }) => count === 0 && percentage === 0)).toBe(true);
    expect(buildRulaPriorityDistribution([]).totalResults).toBe(0);
  });
});
