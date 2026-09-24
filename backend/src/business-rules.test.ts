import { describe, expect, it } from "vitest";
import { calculateRpn, calculateRula, riskLevel } from "@nivasafe/domain";
import { generateProjectCode, projectBody, projectCreateBody } from "./modules/projects.js";

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

  it("allows project codes to be omitted while generating a unique display code", () => {
    expect(projectBody.parse({ name: "پروژه آزمایشی" }).code).toBeUndefined();
    expect(generateProjectCode()).toMatch(/^PRJ-[A-F0-9]{10}$/);
  });

  it("keeps the initial process optional while allowing the legacy activity pair", () => {
    const parsed = projectCreateBody.parse({
      name: "پروژه تولید",
      initialProcessName: "مونتاژ قطعات",
      initialActivityTitle: "بازرسی خط تولید",
    });
    expect(parsed.initialProcessName).toBe("مونتاژ قطعات");
    expect(parsed.initialActivityTitle).toBe("بازرسی خط تولید");
    expect(parsed.initialActivityLocation).toBeUndefined();
    expect(projectCreateBody.parse({ name: "پروژه تولید" }).initialProcessName).toBeUndefined();
    expect(projectCreateBody.parse({ name: "پروژه تولید", initialProcessName: "مونتاژ قطعات" }).initialActivityTitle).toBeUndefined();
    expect(() => projectCreateBody.parse({ name: "پروژه تولید", initialActivityTitle: "بازرسی خط تولید" })).toThrow();
  });
});
