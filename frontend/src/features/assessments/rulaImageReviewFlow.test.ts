import { describe, expect, it } from "vitest";
import { canAdvanceRulaImageReview, isManualRulaReviewComplete } from "./rulaImageReviewFlow";

const reviewedSide = Object.fromEntries(
  ["upperArm", "lowerArm", "wrist", "wristTwist", "neck", "trunk", "legs"].map((part) => [part, { source: "USER", confirmedByUser: true }]),
);

describe("RULA image review recovery", () => {
  it("allows photos with confirmed analysis to continue through the existing review flow", () => {
    expect(canAdvanceRulaImageReview([{ status: "ready" }], false)).toBe(true);
  });

  it("keeps queued and analyzing photos from being mistaken for completed work", () => {
    expect(canAdvanceRulaImageReview([{ status: "queued" }], true)).toBe(false);
    expect(canAdvanceRulaImageReview([{ status: "loading" }], true)).toBe(false);
  });

  it("requires explicit manual mode and a complete manual review for failed photos", () => {
    expect(canAdvanceRulaImageReview([{ status: "error", manualReviewComplete: true }], false)).toBe(false);
    expect(canAdvanceRulaImageReview([{ status: "error", manualReviewComplete: false }], true)).toBe(false);
    expect(canAdvanceRulaImageReview([{ status: "error", manualReviewComplete: true }], true)).toBe(true);
    expect(canAdvanceRulaImageReview([{ status: "ready" }, { status: "error", manualReviewComplete: false }], true)).toBe(false);
    expect(canAdvanceRulaImageReview([{ status: "ready" }, { status: "error", manualReviewComplete: true }], true)).toBe(true);
  });

  it("requires each anatomical side to be reviewed independently for BOTH", () => {
    const right = reviewedSide;
    const left = { ...reviewedSide, trunk: { source: "DEFAULT", confirmedByUser: false } };
    expect(isManualRulaReviewComplete({ ...right, sideAnalyses: { RIGHT: right, LEFT: left } }, "BOTH")).toBe(false);
    expect(isManualRulaReviewComplete({ ...right, sideAnalyses: { RIGHT: right, LEFT: reviewedSide } }, "BOTH")).toBe(true);
    expect(isManualRulaReviewComplete(right, "LEFT")).toBe(true);
  });

  it("does not treat a cancelled photo as an AI result", () => {
    expect(canAdvanceRulaImageReview([{ status: "cancelled", manualReviewComplete: false }], true)).toBe(false);
    expect(canAdvanceRulaImageReview([{ status: "cancelled", manualReviewComplete: true }], true)).toBe(true);
  });
});
