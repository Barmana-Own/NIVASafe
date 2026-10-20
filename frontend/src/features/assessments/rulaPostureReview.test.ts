import { describe, expect, it } from "vitest";
import { areRulaPostureRowsReviewed, areRulaPostureSidesReviewed, isRulaPostureResultReviewed, summarizeReviewedRulaAssessments } from "./rulaPostureReview";

describe("RULA posture review gate", () => {
  it("keeps existing saved AI observations compatible", () => {
    expect(isRulaPostureResultReviewed({ source: "AI", confirmedByUser: false })).toBe(true);
  });

  it("requires explicit confirmation for an uncertain or unseen new AI observation", () => {
    expect(isRulaPostureResultReviewed({ source: "AI", confirmedByUser: false, requiresReview: true })).toBe(false);
    expect(isRulaPostureResultReviewed({ source: "AI", confirmedByUser: true, requiresReview: true })).toBe(true);
  });

  it("does not treat default scores as reviewed", () => {
    expect(isRulaPostureResultReviewed({ source: "DEFAULT", confirmedByUser: false })).toBe(false);
  });

  it("keeps side and aggregate results pending until every relevant finding is reviewed", () => {
    const reviewed = [{ source: "USER", confirmedByUser: true }, { source: "AI", confirmedByUser: true, requiresReview: true }] as const;
    const uncertain = [{ source: "USER", confirmedByUser: true }, { source: "AI", confirmedByUser: false, requiresReview: true }] as const;
    expect(areRulaPostureRowsReviewed(reviewed)).toBe(true);
    expect(areRulaPostureRowsReviewed(uncertain)).toBe(false);
    expect(areRulaPostureSidesReviewed([reviewed, undefined])).toBe(false);
    expect(areRulaPostureSidesReviewed([reviewed, uncertain])).toBe(false);
    expect(areRulaPostureSidesReviewed([reviewed, reviewed])).toBe(true);
  });

  it("calculates overview risk only from completed human reviews and leaves an empty average unset", () => {
    expect(summarizeReviewedRulaAssessments([
      { score: 6, actionLevel: 3, postureReviewComplete: true },
      { score: 1, actionLevel: 1, postureReviewComplete: false },
    ])).toEqual({ total: 2, high: 1, average: 6 });
    expect(summarizeReviewedRulaAssessments([{ score: 1, actionLevel: 1, postureReviewComplete: false }])).toEqual({ total: 1, high: 0, average: null });
  });
});
