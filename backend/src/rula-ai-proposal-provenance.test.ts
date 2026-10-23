import { describe, expect, it } from "vitest";
import { parseRulaPostureImageAnalysis } from "./rula-posture-ai.js";
import { rulaMeasurementSchema } from "./rula-measurement.js";
import { assertRulaFinalStatusReviewed, rulaPostureAnalysisSchema } from "./rula-posture.js";

const context = { width: 1000, height: 1000, normalized: true as const };
const row = { angle: 0, score: 1, detected: true, confidence: .95 };
const geometry = {
  side: "RIGHT", view: "SAGITTAL", facing: "IMAGE_RIGHT", upright: true,
  landmarks: [
    { name: "head", x: .5, y: .02 }, { name: "neck", x: .5, y: .1 },
    { name: "shoulder", x: .5, y: .2 }, { name: "elbow", x: .5, y: .5 },
    { name: "wrist", x: .8, y: .5 }, { name: "hand", x: .9, y: .5 },
    { name: "hip", x: .5, y: .8 },
  ].map(point => ({ ...point, visibility: "VISIBLE", confidence: .95 })),
};
const side = {
  upperArm: row, lowerArm: { ...row, angle: 90 }, wrist: row,
  wristTwist: { ...row, angle: null, score: 2 }, neck: row, trunk: row,
  legs: { ...row, angle: null, score: 2 }, overlay: { points: {} }, geometry,
};
const parse = (value: typeof side) => parseRulaPostureImageAnalysis(JSON.stringify({ sides: { RIGHT: value } }), "RIGHT", context).sides.RIGHT!;

describe("raw AI proposal detection provenance", () => {
  it("retains a rejected numeric proposal without weakening its independent audit", () => {
    const result = parse({ ...side, upperArm: { ...row, angle: 75, score: 3 } });
    expect(result.upperArm).toMatchObject({
      angle: null, score: 1, detected: false, confidence: .95, requiresReview: true,
      measurement: { aiDetected: true, aiAngle: 75, aiScore: 3, state: "CONFLICT", qualityCodes: ["ANGLE_LANDMARK_CONFLICT"] },
    });
    expect(result.lowerArm).toMatchObject({ angle: 90, detected: true, requiresReview: true, measurement: { aiDetected: true, state: "ESTIMATED" } });
  });

  it("distinguishes an explicit abstention from high-confidence default score one", () => {
    const result = parse({ ...side, upperArm: { angle: 75, score: 3, detected: false, confidence: .99 } });
    expect(result.upperArm).toMatchObject({
      angle: null, score: 1, detected: false, confidence: .99, requiresReview: true,
      measurement: { aiDetected: false, aiAngle: null, aiScore: 1, state: "UNMEASURABLE", qualityCodes: ["AI_ANGLE_MISSING"] },
    });
  });

  it("preserves different proposal support for the two anatomical sides", () => {
    const right = { ...side, upperArm: { ...row, angle: 75, score: 3 } };
    const left = { ...side, upperArm: { ...row, angle: 75, score: 3, detected: false }, geometry: { ...geometry, side: "LEFT" } };
    const result = parseRulaPostureImageAnalysis(JSON.stringify({ sides: { LEFT: left, RIGHT: right } }), "BOTH", context);
    expect(result.sides.LEFT!.upperArm.measurement).toMatchObject({ aiDetected: false, aiAngle: null, aiScore: 1 });
    expect(result.sides.RIGHT!.upperArm.measurement).toMatchObject({ aiDetected: true, aiAngle: 75, aiScore: 3 });
    expect(result.sides.LEFT!.upperArm.measurement).not.toBe(result.sides.RIGHT!.upperArm.measurement);
  });

  it("retains a qualitative proposal while wrist rotation remains unmeasurable", () => {
    const result = parse(side);
    expect(result.wristTwist).toMatchObject({
      angle: null, score: 1, detected: false, requiresReview: true,
      measurement: { aiDetected: true, aiAngle: null, aiScore: 2, state: "UNMEASURABLE", qualityCodes: ["OUT_OF_PLANE_UNMEASURABLE"] },
    });
    expect(result.legs).toMatchObject({ angle: null, score: 2, detected: true, requiresReview: true, measurement: { aiDetected: true, state: "QUALITATIVE" } });
  });

  it("keeps missing cervical evidence unavailable rather than inventing a landmark", () => {
    const result = parse({ ...side, neck: { ...row, angle: 35, score: 3 }, geometry: { ...geometry, landmarks: geometry.landmarks.filter(point => point.name !== "neck") } });
    expect(result.neck).toMatchObject({
      angle: null, score: 1, detected: false, requiresReview: true,
      measurement: { aiDetected: true, aiAngle: 35, aiScore: 3, state: "UNMEASURABLE", qualityCodes: ["LANDMARK_MISSING"] },
    });
    expect(result.neck.measurement!.landmarks.some(point => point.name === "neck")).toBe(false);
  });

  it("accepts legacy metadata and validates the optional marker as a strict boolean", () => {
    const measurement = parse(side).upperArm.measurement!;
    const { aiDetected: _aiDetected, ...legacy } = measurement as typeof measurement & { aiDetected?: boolean };
    expect(rulaMeasurementSchema.safeParse(legacy).success).toBe(true);
    for (const aiDetected of [true, false]) expect(rulaMeasurementSchema.safeParse({ ...legacy, aiDetected }).success).toBe(true);
    for (const aiDetected of ["true", "false", 0, 1, null, {}]) expect(rulaMeasurementSchema.safeParse({ ...legacy, aiDetected }).success).toBe(false);
  });

  it("cannot turn proposal metadata into permission to approve unreviewed sides", () => {
    const result = parse({ ...side, upperArm: { ...row, angle: 75, score: 3 } });
    const observation = Object.fromEntries(Object.entries(result).filter(([key]) => key !== "overlay").map(([key, value]) => [key, { ...value, source: "AI", confirmedByUser: false }]));
    const analysis = rulaPostureAnalysisSchema.parse(observation);
    expect(() => assertRulaFinalStatusReviewed("DRAFT", "RIGHT", analysis)).not.toThrow();
    expect(() => assertRulaFinalStatusReviewed("APPROVED", "RIGHT", analysis)).toThrow();
    expect(() => assertRulaFinalStatusReviewed("APPROVED", "BOTH", { ...analysis, sideAnalyses: { LEFT: analysis, RIGHT: analysis } })).toThrow();
  });
});
