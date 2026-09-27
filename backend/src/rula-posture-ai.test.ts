import { describe, expect, it } from "vitest";
import { buildRulaPostureImageAnalysisPrompt, buildRulaPostureTextAnalysisPrompt, fallbackRulaPostureTextAnalysis, parseRulaPostureImageAnalysis, parseRulaPostureTextAnalysis, rulaPostureImageAnalysisResponseSchema, rulaPostureTextAnalysisResponseSchema } from "./rula-posture-ai.js";

describe("RULA posture image analysis", () => {
  it("requires normalized, image-relative landmarks and preserves valid side overlays", () => {
    const result = parseRulaPostureImageAnalysis(JSON.stringify({
      sides: {
        RIGHT: {
          upperArm: { angle: 52, score: 3, detected: true, confidence: 0.94 },
          lowerArm: { angle: 87, score: 2, detected: true, confidence: 0.92 },
          wrist: { angle: 18, score: 1, detected: true, confidence: 0.9 },
          wristTwist: { angle: 0, score: 1, detected: false, confidence: 0.55 },
          neck: { angle: 24, score: 3, detected: true, confidence: 0.91 },
          trunk: { angle: 17, score: 2, detected: true, confidence: 0.89 },
          legs: { angle: null, score: 1, detected: true, confidence: 0.86 },
          overlay: {
            points: {
              head: { x: 0.61, y: 0.08, confidence: 0.98 },
              neck: { x: 0.6, y: 0.18, confidence: 0.97 },
              shoulder: { x: 0.58, y: 0.26, confidence: 0.96 },
              elbow: { x: 0.64, y: 0.43, confidence: 0.92 },
              wrist: { x: 0.7, y: 0.55, confidence: 0.91 },
              hip: { x: 0.51, y: 0.54, confidence: 0.9 },
              knee: { x: 0.48, y: 0.76, confidence: 0.88 },
              ankle: { x: 0.45, y: 0.93, confidence: 0.87 },
            },
          },
        },
      },
      notes: "بررسی انسانی لازم است.",
    }), "RIGHT");

    expect(result.sides.RIGHT?.overlay.points.shoulder).toEqual({ x: 0.58, y: 0.26, confidence: 0.96 });
    expect(result.sides.RIGHT?.overlay.points.ankle).toEqual({ x: 0.45, y: 0.93, confidence: 0.87 });
  });

  it("rejects coordinates outside the original image bounds", () => {
    expect(() => parseRulaPostureImageAnalysis(JSON.stringify({
      sides: {
        RIGHT: {
          upperArm: { angle: 52, score: 3, detected: true, confidence: 0.94 },
          lowerArm: { angle: 87, score: 2, detected: true, confidence: 0.92 },
          wrist: { angle: 18, score: 1, detected: true, confidence: 0.9 },
          wristTwist: { angle: 0, score: 1, detected: false, confidence: 0.55 },
          neck: { angle: 24, score: 3, detected: true, confidence: 0.91 },
          trunk: { angle: 17, score: 2, detected: true, confidence: 0.89 },
          legs: { angle: null, score: 1, detected: true, confidence: 0.86 },
          overlay: { points: { shoulder: { x: 1.02, y: 0.26, confidence: 0.96 } } },
        },
      },
      notes: "",
    }), "RIGHT")).toThrow("RULA_IMAGE_AI_INVALID_RESPONSE");
  });

  it("derives provisional scores from detected angles and clears undetected parts", () => {
    const result = parseRulaPostureImageAnalysis(JSON.stringify({
      sides: {
        RIGHT: {
          upperArm: { angle: 52, score: 1, detected: true, confidence: 0.94 },
          lowerArm: { angle: 87, score: 6, detected: true, confidence: 0.92 },
          wrist: { angle: null, score: 4, detected: false, confidence: 0.2 },
          wristTwist: { angle: 0, score: 1, detected: true, confidence: 0.55 },
          neck: { angle: 24, score: 1, detected: true, confidence: 0.91 },
          trunk: { angle: 17, score: 1, detected: true, confidence: 0.89 },
          legs: { angle: null, score: 5, detected: false, confidence: 0.86 },
          overlay: { points: { shoulder: { x: 0.58, y: 0.26, confidence: 0.2 }, elbow: { x: 0.64, y: 0.43, confidence: 0.92 } } },
        },
      },
      notes: "",
    }), "RIGHT");

    expect(result.sides.RIGHT?.upperArm.score).toBe(3);
    expect(result.sides.RIGHT?.lowerArm.score).toBe(1);
    expect(result.sides.RIGHT?.neck.score).toBe(3);
    expect(result.sides.RIGHT?.trunk.score).toBe(2);
    expect(result.sides.RIGHT?.legs.score).toBe(1);
    expect(result.sides.RIGHT?.overlay.points.shoulder).toBeUndefined();
    expect(result.sides.RIGHT?.overlay.points.elbow).toEqual({ x: 0.64, y: 0.43, confidence: 0.92 });
  });

  it("validates the route response shape used by the frontend", () => {
    const row = { angle: 24, score: 3, detected: true, confidence: 0.91 };
    const side = { upperArm: row, lowerArm: row, wrist: row, wristTwist: row, neck: row, trunk: row, legs: row, overlay: { points: { shoulder: { x: 0.58, y: 0.26, confidence: 0.96 } } } };
    expect(rulaPostureImageAnalysisResponseSchema.parse({ sides: { RIGHT: side }, notes: "", provider: "arvancloud", aiStatus: "connected" }).sides.RIGHT?.overlay.points.shoulder).toEqual({ x: 0.58, y: 0.26, confidence: 0.96 });
  });

  it("explicitly instructs the vision model to use original-image normalized coordinates", () => {
    const prompt = buildRulaPostureImageAnalysisPrompt({ bodySide: "RIGHT", jobTitle: "اپراتور تصفیه‌خانه", taskDescription: "بازرسی مسیر فرایند", locale: "fa" });
    expect(prompt).toContain('\"overlay\":{\"points\"');
    expect(prompt).toContain("normalized x and y coordinates from 0 to 1");
    expect(prompt).toContain("Do not draw a skeleton when a landmark is not visible");
  });

  it("builds a text-analysis prompt from process information without sending an image", () => {
    const prompt = buildRulaPostureTextAnalysisPrompt({
      bodySide: "BOTH",
      jobTitle: "اپراتور خط تولید",
      taskDescription: "جابجایی دستی قطعات و کنترل دستگاه",
      postureDescription: "گردن رو به پایین و بازوها در ارتفاع شانه",
      durationPerOccurrence: 15,
      durationUnit: "MINUTE",
      repetitionsPerShift: 40,
      postureHoldDuration: 30,
      postureHoldUnit: "SECOND",
      loadWeight: 8,
      loadUnit: "KG",
      force: 1,
      muscleUse: true,
      locale: "fa",
    });
    expect(prompt).toContain("NIVASAFE_RULA_POSTURE_TEXT_REVIEW");
    expect(prompt).toContain("No image is provided");
    expect(prompt).toContain("اپراتور خط تولید");
    expect(prompt).toContain("Force adjustment input: 1");
    expect(prompt).toContain("LEFT and RIGHT");
  });

  it("parses complete text results and keeps both anatomical sides independent", () => {
    const row = (score: number) => ({ angle: null, score, detected: true, confidence: 0.35 });
    const result = parseRulaPostureTextAnalysis(JSON.stringify({
      sides: {
        RIGHT: { upperArm: row(3), lowerArm: row(2), wrist: row(2), wristTwist: row(1), neck: row(3), trunk: row(2), legs: row(1), overlay: { points: {} } },
        LEFT: { upperArm: row(2), lowerArm: row(1), wrist: row(1), wristTwist: row(2), neck: row(2), trunk: row(1), legs: row(2), overlay: { points: {} } },
      },
      notes: "بررسی انسانی لازم است.",
    }), "BOTH");
    expect(result.sides.RIGHT?.upperArm.score).toBe(3);
    expect(result.sides.LEFT?.upperArm.score).toBe(2);
    expect(result.sides.RIGHT?.overlay.points).toEqual({});
  });

  it("provides a bounded text fallback when the configured provider cannot return structured output", () => {
    const result = fallbackRulaPostureTextAnalysis({ bodySide: "BOTH", jobTitle: "اپراتور", taskDescription: "کار ایستاده با خم شدن گردن", force: 0, muscleUse: false, locale: "fa" });
    expect(result.sides.LEFT).toBeDefined();
    expect(result.sides.RIGHT).toBeDefined();
    expect(result.sides.LEFT?.neck.score).toBeGreaterThan(1);
    expect(result.sides.RIGHT?.overlay.points).toEqual({});
    expect(rulaPostureTextAnalysisResponseSchema.parse({ ...result, provider: "fallback", aiStatus: "fallback" }).sides.RIGHT).toBeDefined();
  });
});
