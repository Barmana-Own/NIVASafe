import { describe, expect, it } from "vitest";
import { rulaAdjustmentsSchema, suggestRulaActivityAdjustments } from "./rula-adjustments.js";
import { withRulaActivityAdjustments, parseRulaPostureImageAnalysis, rulaPostureImageAnalysisResponseSchema } from "./rula-posture-ai.js";
import { assertRulaPostureSide, rulaPostureAnalysisSchema } from "./rula-posture.js";

const context = { jobTitle: "Synthetic operator", taskDescription: "Synthetic work activity" };
const row = { angle: null, score: 1, detected: false, confidence: null };
const side = { upperArm: row, lowerArm: row, wrist: row, wristTwist: row, neck: row, trunk: row, legs: row, overlay: { points: {} } };
const observation = Object.fromEntries(["upperArm", "lowerArm", "wrist", "wristTwist", "neck", "trunk", "legs"].map(part => [part, { ...row, source: "DEFAULT", confirmedByUser: false }]));

describe("RULA activity adjustment suggestions", () => {
  it("does not manufacture missing load or repetition facts", () => {
    expect(suggestRulaActivityAdjustments()).toEqual({});
    expect(suggestRulaActivityAdjustments(context)).toEqual({});
    expect(suggestRulaActivityAdjustments({ ...context, repetitionsPerShift: 120, durationPerOccurrence: 15, durationUnit: "MINUTE" })).toEqual({});
    expect(suggestRulaActivityAdjustments({ ...context, postureHoldDuration: 60, postureHoldUnit: "SECOND", loadWeight: 5, loadUnit: "KG" })).toEqual({});
    expect(suggestRulaActivityAdjustments({ ...context, loadWeight: 5 })).toEqual({});
  });
  it("uses explicit static duration and load units without reading image guesses", () => {
    expect(suggestRulaActivityAdjustments({ ...context, postureHoldDuration: 61, postureHoldUnit: "SECOND", loadWeight: 5, loadUnit: "KG" })).toEqual({ muscleUse: true, force: 2 });
    expect(suggestRulaActivityAdjustments({ ...context, postureHoldDuration: 2, postureHoldUnit: "MINUTE", loadWeight: 5 / 0.45359237, loadUnit: "LB" })).toEqual({ muscleUse: true, force: 2 });
    expect(suggestRulaActivityAdjustments({ ...context, postureHoldDuration: 0.5, postureHoldUnit: "HOUR" })).toEqual({ muscleUse: true });
    expect(suggestRulaActivityAdjustments({ ...context, loadWeight: 12, loadUnit: "KG" })).toEqual({ force: 3 });
    expect(suggestRulaActivityAdjustments({ ...context, loadWeight: 0, loadUnit: "KG" })).toEqual({ force: 0 });
  });
  it("keeps suggestions optional, independent and unable to auto-confirm posture", () => {
    const parsed = parseRulaPostureImageAnalysis(JSON.stringify({ sides: { LEFT: { ...side, adjustments: { force: 3, muscleUse: true } }, RIGHT: side } }), "BOTH");
    expect(parsed.sides.LEFT?.adjustments).toBeUndefined();
    expect(withRulaActivityAdjustments(parsed, context)).toBe(parsed);
    const result = withRulaActivityAdjustments(parsed, { ...context, loadWeight: 12, loadUnit: "KG" });
    expect(result.sides.LEFT?.adjustments).toEqual({ force: 3 });
    expect(result.sides.RIGHT?.adjustments).toEqual({ force: 3 });
    expect(result.sides.LEFT?.adjustments).not.toBe(result.sides.RIGHT?.adjustments);
    expect(result.sides.RIGHT?.neck.requiresReview).toBe(true);
    expect(parsed.sides.RIGHT?.adjustments).toBeUndefined();
    expect(rulaPostureImageAnalysisResponseSchema.safeParse({ ...result, provider: "synthetic", aiStatus: "connected" }).success).toBe(true);
  });
  it("validates complete persisted values and optional anatomical provenance without rejecting legacy rows", () => {
    expect(rulaAdjustmentsSchema.safeParse({ force: 4, muscleUse: true }).success).toBe(false);
    expect(rulaAdjustmentsSchema.safeParse({ force: 2, muscleUse: "yes" }).success).toBe(false);
    expect(rulaPostureAnalysisSchema.safeParse({ ...observation, adjustments: { force: 2 } }).success).toBe(false);
    const analysis = rulaPostureAnalysisSchema.parse({ ...observation, bodySide: "LEFT", adjustments: { force: 2, muscleUse: true } });
    expect(() => assertRulaPostureSide("LEFT", analysis)).not.toThrow();
    expect(() => assertRulaPostureSide("RIGHT", analysis)).toThrow();
    expect(() => assertRulaPostureSide("RIGHT", rulaPostureAnalysisSchema.parse(observation))).not.toThrow();
    expect(() => assertRulaPostureSide("BOTH", { ...analysis, sideAnalyses: { RIGHT: analysis } })).toThrow();
  });
});
