import { describe, expect, it } from "vitest";
import { buildRulaOverviewMetrics, summarizeRulaCorrectiveActions } from "./rulaOverviewModel";

describe("RULA stage-three overview metrics", () => {
  it("groups reviewed factor scores by their existing impact levels and summarizes selected actions", () => {
    const metrics = buildRulaOverviewMetrics({
      factors: [
        { score: 4, impactLevel: "HIGH" },
        { score: 2, impactLevel: "LOW" },
        { score: 0, impactLevel: "MEDIUM" },
      ],
      selectedRecommendationCount: 1,
      recommendationCount: 2,
      manualActionCount: 1,
      currentScore: 6,
      predictedScore: 4,
      reviewComplete: true,
    });

    expect(metrics.impactDistribution).toEqual([
      { level: "HIGH", score: 4, factorCount: 1, share: 2 / 3, sharePercent: 67 },
      { level: "MEDIUM", score: 0, factorCount: 0, share: 0, sharePercent: 0 },
      { level: "LOW", score: 2, factorCount: 1, share: 1 / 3, sharePercent: 33 },
    ]);
    expect(metrics.totalFactorScore).toBe(6);
    expect(metrics.selectedRecommendationCount).toBe(1);
    expect(metrics.remainingRecommendationCount).toBe(1);
    expect(metrics.selectionPercent).toBe(50);
    expect(metrics.manualActionCount).toBe(1);
    expect(metrics.estimatedScoreReduction).toBe(2);
  });

  it("does not present unreviewed factor scores or a predicted reduction as confirmed results", () => {
    const metrics = buildRulaOverviewMetrics({
      factors: [{ score: 5, impactLevel: "HIGH" }],
      selectedRecommendationCount: 4,
      recommendationCount: 2,
      manualActionCount: 0,
      currentScore: 6,
      predictedScore: 2,
      reviewComplete: false,
    });

    expect(metrics.totalFactorScore).toBe(0);
    expect(metrics.impactDistribution.every((item) => item.factorCount === 0)).toBe(true);
    expect(metrics.selectedRecommendationCount).toBe(2);
    expect(metrics.remainingRecommendationCount).toBe(0);
    expect(metrics.selectionPercent).toBe(100);
    expect(metrics.estimatedScoreReduction).toBe(0);
  });

  it("handles an assessment with no recommendations without inventing completion progress", () => {
    const metrics = buildRulaOverviewMetrics({
      factors: [],
      selectedRecommendationCount: 0,
      recommendationCount: 0,
      manualActionCount: 2,
      currentScore: 3,
      predictedScore: 3,
      reviewComplete: true,
    });

    expect(metrics.selectionPercent).toBe(0);
    expect(metrics.remainingRecommendationCount).toBe(0);
    expect(metrics.manualActionCount).toBe(2);
    expect(metrics.estimatedScoreReduction).toBe(0);
  });

  it("summarizes active corrective actions by urgency and persisted completion status", () => {
    expect(summarizeRulaCorrectiveActions([
      { priority: "CRITICAL", status: "OPEN" },
      { priority: "HIGH", status: "COMPLETED" },
      { priority: "MEDIUM", status: "IN_PROGRESS" },
      { priority: "HIGH", status: "CANCELLED" },
      { priority: "CRITICAL", status: "REJECTED" },
    ])).toEqual({
      firstPriorityCount: 2,
      totalCount: 3,
      completedCount: 1,
      remainingCount: 2,
      completionPercent: 33,
    });
  });

  it("counts selected draft actions as planned but not completed and handles an empty action list", () => {
    expect(summarizeRulaCorrectiveActions([
      { priority: "HIGH" },
      { priority: "LOW" },
    ])).toEqual({
      firstPriorityCount: 1,
      totalCount: 2,
      completedCount: 0,
      remainingCount: 2,
      completionPercent: 0,
    });
    expect(summarizeRulaCorrectiveActions([])).toEqual({
      firstPriorityCount: 0,
      totalCount: 0,
      completedCount: 0,
      remainingCount: 0,
      completionPercent: 0,
    });
  });

  it("keeps left- and right-side action totals independently scoped", () => {
    const actions = [
      { priority: "HIGH", bodySide: "RIGHT" as const, status: "COMPLETED" },
      { priority: "CRITICAL", bodySide: "LEFT" as const, status: "OPEN" },
      { priority: "MEDIUM", bodySide: "BOTH" as const, status: "IN_PROGRESS" },
    ];

    expect(summarizeRulaCorrectiveActions(actions, "RIGHT")).toMatchObject({
      firstPriorityCount: 1,
      totalCount: 2,
      completedCount: 1,
      remainingCount: 1,
      completionPercent: 50,
    });
    expect(summarizeRulaCorrectiveActions(actions, "LEFT")).toMatchObject({
      firstPriorityCount: 1,
      totalCount: 2,
      completedCount: 0,
      remainingCount: 2,
      completionPercent: 0,
    });
  });
});
