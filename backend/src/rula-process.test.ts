import { describe, expect, it } from "vitest";
import { resolveRulaTitle, rulaActivityInfoSchema, rulaBodySideSchema, rulaTitleSchema } from "./rula-process.js";

describe("RULA activity information", () => {
  it("accepts measured activity context with an optional posture image reference", () => {
    const result = rulaActivityInfoSchema.safeParse({
      jobTitle: "اپراتور جابه‌جایی دستی",
      taskDescription: "برداشت و انتقال جعبه از پالت به میز کار",
      durationPerOccurrence: 15,
      durationUnit: "MINUTE",
      repetitionsPerShift: 120,
      postureHoldDuration: 30,
      postureHoldUnit: "SECOND",
      postureDescription: "گردن رو به پایین، تنه خمیده و بازوها در حین جابه‌جایی بار جلوتر از بدن قرار دارند.",
      loadWeight: 12.5,
      loadUnit: "KG",
      postureImageAttachmentId: "9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b101",
    });
    expect(result.success).toBe(true);
  });

  it("keeps posture notes bounded while preserving the structured activity contract", () => {
    const result = rulaActivityInfoSchema.safeParse({
      jobTitle: "اپراتور",
      taskDescription: "برداشت قطعه",
      durationPerOccurrence: 5,
      durationUnit: "MINUTE",
      repetitionsPerShift: 20,
      postureHoldDuration: 10,
      postureHoldUnit: "SECOND",
      postureDescription: "x".repeat(1001),
    });
    expect(result.success).toBe(false);
  });

  it("allows the three activity measurements to be omitted while keeping job and task required", () => {
    const result = rulaActivityInfoSchema.safeParse({
      jobTitle: "اپراتور",
      taskDescription: "برداشت قطعه",
      postureDescription: null,
    });
    expect(result.success).toBe(true);
  });

  it("requires a unit when an optional duration measurement is supplied", () => {
    expect(rulaActivityInfoSchema.safeParse({
      jobTitle: "اپراتور",
      taskDescription: "برداشت قطعه",
      durationPerOccurrence: 15,
    }).success).toBe(false);
    expect(rulaActivityInfoSchema.safeParse({
      jobTitle: "اپراتور",
      taskDescription: "برداشت قطعه",
      postureHoldUnit: "SECOND",
    }).success).toBe(false);
  });

  it("rejects incomplete or unsafe measurement values", () => {
    expect(rulaActivityInfoSchema.safeParse({ jobTitle: "A", taskDescription: "", durationPerOccurrence: 0, durationUnit: "MINUTE", repetitionsPerShift: 0, postureHoldDuration: -1, postureHoldUnit: "SECOND" }).success).toBe(false);
    expect(rulaActivityInfoSchema.safeParse({ jobTitle: "کار", taskDescription: "شرح فعالیت", durationPerOccurrence: 15, durationUnit: "DAY", repetitionsPerShift: 1, postureHoldDuration: 10, postureHoldUnit: "SECOND" }).success).toBe(false);
  });

  it("allows an optional title and supports assessing both body sides", () => {
    expect(rulaTitleSchema.safeParse(undefined).success).toBe(true);
    expect(rulaTitleSchema.safeParse("").success).toBe(true);
    expect(rulaTitleSchema.safeParse("A").success).toBe(false);
    expect(rulaBodySideSchema.safeParse("BOTH").success).toBe(true);
    expect(resolveRulaTitle(undefined, { jobTitle: "اپراتور" })).toBe("اپراتور");
    expect(resolveRulaTitle("", null)).toBe("RULA assessment");
  });
});
