import { describe, expect, it } from "vitest";
import { calculateRpn, calculateRula, riskLevel } from "./index.js";

describe("FMEA", () => {
  it("calculates server-authoritative RPN and risk", () => { expect(calculateRpn(10, 5, 4)).toBe(200); expect(riskLevel(200)).toBe("CRITICAL"); });
  it("rejects invalid scores", () => expect(() => calculateRpn(0, 2, 3)).toThrow());
});
describe("RULA", () => {
  it("returns a bounded transparent result", () => { const result = calculateRula({upperArm:4,lowerArm:3,wrist:3,wristTwist:2,neck:4,trunk:5,legs:2,muscleUse:true,force:2}); expect(result.score).toBeGreaterThanOrEqual(1); expect(result.score).toBeLessThanOrEqual(7); expect(result.trace).toHaveLength(4); });
});
