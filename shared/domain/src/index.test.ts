import { describe, expect, it } from "vitest";
import { calculateRpn, calculateRula, isForbiddenDisplayName, isStrongPassword, isSubscriptionActive, isValidDisplayName, isValidEmail, isValidPhone, normalizePhone, riskLevel } from "./index.js";

describe("FMEA", () => {
  it("calculates server-authoritative RPN and risk", () => { expect(calculateRpn(10, 5, 4)).toBe(200); expect(riskLevel(200)).toBe("CRITICAL"); });
  it("rejects invalid scores", () => expect(() => calculateRpn(0, 2, 3)).toThrow());
});
describe("RULA", () => {
  it("returns a bounded transparent result", () => { const result = calculateRula({upperArm:4,lowerArm:3,wrist:3,wristTwist:2,neck:4,trunk:5,legs:2,muscleUse:true,force:2}); expect(result.score).toBeGreaterThanOrEqual(1); expect(result.score).toBeLessThanOrEqual(7); expect(result.trace).toHaveLength(4); });
});
describe("registration input security", () => {
  it("accepts normal email and rejects malformed addresses", () => {
    expect(isValidEmail("person@example.com")).toBe(true);
    expect(isValidEmail("person..name@example.com")).toBe(false);
    expect(isValidEmail("person@example")).toBe(false);
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
    expect(isValidDisplayName("علی رضایی")).toBe(true);
    expect(isStrongPassword("Short1!", { email: "person@example.com" })).toBe(false);
    expect(isStrongPassword("Longer-Secure9!", { email: "person@example.com" })).toBe(true);
  });
  it("keeps each company subscription independently gated", () => {
    expect(isSubscriptionActive("ACTIVE")).toBe(true);
    expect(isSubscriptionActive("TRIALING", new Date(Date.now() + 60_000))).toBe(true);
    expect(isSubscriptionActive("TRIALING", new Date(Date.now() - 60_000))).toBe(false);
    expect(isSubscriptionActive("PENDING_PAYMENT")).toBe(false);
  });
});
