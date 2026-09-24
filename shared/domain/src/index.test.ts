import { describe, expect, it } from "vitest";
import { calculateRpn, calculateRula, detectContactInput, isForbiddenDisplayName, isStrongPassword, isSubscriptionActive, isValidContactInput, isValidDisplayName, isValidEmail, isValidIranianNationalId, isValidPhone, normalizeNationalId, normalizePhone, riskLevel, suggestedRulaPostureScore } from "./index.js";

describe("FMEA", () => {
  it("calculates server-authoritative RPN and applies the reference risk bands", () => {
    expect(calculateRpn(10, 5, 4)).toBe(200);
    expect(riskLevel(1)).toBe("VERY_LOW");
    expect(riskLevel(50)).toBe("VERY_LOW");
    expect(riskLevel(51)).toBe("LOW");
    expect(riskLevel(100)).toBe("LOW");
    expect(riskLevel(101)).toBe("MEDIUM");
    expect(riskLevel(200)).toBe("MEDIUM");
    expect(riskLevel(201)).toBe("HIGH");
    expect(riskLevel(400)).toBe("HIGH");
    expect(riskLevel(401)).toBe("CRITICAL");
  });
  it("rejects invalid scores", () => expect(() => calculateRpn(0, 2, 3)).toThrow());
});
describe("RULA", () => {
  it("returns a bounded transparent result", () => { const result = calculateRula({upperArm:4,lowerArm:3,wrist:3,wristTwist:2,neck:4,trunk:5,legs:2,muscleUse:true,force:2}); expect(result.score).toBeGreaterThanOrEqual(1); expect(result.score).toBeLessThanOrEqual(7); expect(result.trace).toHaveLength(4); });
  it("adds the selected force points directly to the final score", () => {
    const posture = { upperArm: 1, lowerArm: 1, wrist: 1, wristTwist: 1, neck: 1, trunk: 1, legs: 1, muscleUse: false } as const;
    const scores = [0, 1, 2, 3].map((force) => calculateRula({ ...posture, force }).score);
    expect(scores).toEqual([2, 3, 4, 5]);
    expect(calculateRula({ ...posture, force: 3 }).trace).toContain("Adjustment: muscle use 0 + force 3 = 3");
  });
  it("adds the repetitive-muscle criterion score to the final result", () => {
    const posture = { upperArm: 1, lowerArm: 1, wrist: 1, wristTwist: 1, neck: 1, trunk: 1, legs: 1, force: 0 } as const;
    expect(calculateRula({ ...posture, muscleUse: false }).score).toBe(2);
    expect(calculateRula({ ...posture, muscleUse: true }).score).toBe(3);
    expect(calculateRula({ ...posture, muscleUse: true }).trace).toContain("Adjustment: muscle use 1 + force 0 = 1");
  });
  it("recalculates group and final scores after a reviewed angle change", () => {
    const baseline = { upperArm: 1, lowerArm: 1, wrist: 1, wristTwist: 1, neck: 1, trunk: 1, legs: 1, muscleUse: false, force: 0 } as const;
    const before = calculateRula(baseline);
    const editedUpperArm = suggestedRulaPostureScore("upperArm", 52, true, baseline.upperArm);
    const after = calculateRula({ ...baseline, upperArm: editedUpperArm });
    expect(editedUpperArm).toBe(3);
    expect(suggestedRulaPostureScore("wristTwist", 0, true, 2)).toBe(1);
    expect(before.groupA).toBe(2);
    expect(after.groupA).toBe(3);
    expect(after.groupB).toBe(before.groupB);
    expect(after.score).toBeGreaterThan(before.score);
  });
});
describe("registration input security", () => {
  it("accepts normal email and rejects malformed addresses", () => {
    expect(isValidEmail("person@example.com")).toBe(true);
    expect(isValidEmail("person..name@example.com")).toBe(false);
    expect(isValidEmail("person@example")).toBe(false);
  });
  it("detects the contact type before applying the matching validator", () => {
    expect(detectContactInput("person@example.com")).toBe("email");
    expect(detectContactInput("۰۹۱۲۱۲۳۴۵۶۷")).toBe("phone");
    expect(detectContactInput("09121234567@")).toBe("email");
    expect(detectContactInput("contact name")).toBe("unknown");
    expect(isValidContactInput("person@example.com", "email")).toBe(true);
    expect(isValidContactInput("09121234567", "phone")).toBe(true);
    expect(isValidContactInput("09121234567", "email")).toBe(false);
  });
  it("normalizes Persian mobile digits and rejects fake numbers", () => {
    expect(normalizePhone("۰۹۱۲۱۲۳۴۵۶۷")).toBe("09121234567");
    expect(normalizePhone("٠٩١٢١٢٣٤٥٦٧")).toBe("09121234567");
    expect(isValidPhone("۰۹۱۲۱۲۳۴۵۶۷")).toBe(true);
    expect(isValidPhone("09121234567")).toBe(true);
    expect(isValidPhone("۰۰۰۰۰۰۰۰۰۰۰")).toBe(false);
    expect(isValidPhone("0912123456")).toBe(false);
    expect(isValidPhone("091212345678")).toBe(false);
    expect(isValidPhone("08121234567")).toBe(false);
    expect(isValidPhone("+989121234567")).toBe(false);
  });
  it("blocks reserved identities and weak passwords", () => {
    expect(isForbiddenDisplayName("admin")).toBe(true);
    expect(isForbiddenDisplayName("admin-operator")).toBe(true);
    expect(isValidDisplayName("admin-operator")).toBe(false);
    expect(isValidDisplayName("علی رضایی")).toBe(true);
    expect(isStrongPassword("Short1!", { email: "person@example.com" })).toBe(false);
    expect(isStrongPassword("Longer-Secure9!", { email: "person@example.com" })).toBe(true);
  });
  it("validates company national identifiers after digit normalization", () => {
    expect(normalizeNationalId("۱۲۵۶۳۲۵۴۸۰۶")).toBe("12563254806");
    expect(isValidIranianNationalId("۱۲۵۶۳۲۵۴۸۰۶")).toBe(true);
    expect(isValidIranianNationalId("12563254807")).toBe(false);
    expect(isValidIranianNationalId("11111111111")).toBe(false);
  });
  it("keeps each company subscription independently gated", () => {
    expect(isSubscriptionActive("ACTIVE")).toBe(true);
    expect(isSubscriptionActive("TRIALING", new Date(Date.now() + 60_000))).toBe(true);
    expect(isSubscriptionActive("TRIALING", new Date(Date.now() - 60_000))).toBe(false);
    expect(isSubscriptionActive("PENDING_PAYMENT")).toBe(false);
  });
});
