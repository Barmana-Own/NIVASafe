import { describe, expect, it } from "vitest";
import { calculateRpn, calculateRula, riskLevel } from "@nivasafe/domain";

describe("API-authoritative assessment rules", () => {
  it("classifies configurable FMEA thresholds", () => {
    const rpn = calculateRpn(9, 6, 4);
    expect(rpn).toBe(216);
    expect(riskLevel(rpn, { medium: 40, high: 90, critical: 180 })).toBe("CRITICAL");
  });

  it("produces a reviewable RULA trace", () => {
    const result = calculateRula({ upperArm: 3, lowerArm: 2, wrist: 3, wristTwist: 2, neck: 4, trunk: 4, legs: 2, muscleUse: true, force: 1 });
    expect(result.actionLevel).toBeGreaterThanOrEqual(1);
    expect(result.trace.at(-1)).toMatch(/Final score/);
  });
});
