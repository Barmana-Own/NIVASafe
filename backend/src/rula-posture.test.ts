import { describe, expect, it } from "vitest";
import { assertRulaFinalStatusReviewed, assertRulaPostureAnalysisReviewed, isRulaPostureAnalysisReviewed, isRulaPostureResultReviewed, rulaPostureAnalysisSchema } from "./rula-posture.js";

const validAnalysis = {
  upperArm: { angle: 52, score: 3, detected: true, source: "AI", confirmedByUser: true },
  lowerArm: { angle: 87, score: 2, detected: true, source: "AI", confirmedByUser: true },
  wrist: { angle: 18, score: 1, detected: true, source: "AI", confirmedByUser: true },
  wristTwist: { angle: 0, score: 1, detected: false, source: "AI", confirmedByUser: true },
  neck: { angle: 24, score: 3, detected: true, source: "AI", confirmedByUser: true },
  trunk: { angle: 17, score: 2, detected: true, source: "AI", confirmedByUser: true },
  legs: { angle: null, score: 1, detected: true, source: "AI", confirmedByUser: true },
} as const;

describe("RULA posture analysis", () => {
  it("retains geometry provenance but does not accept confirmation-only for an AI conflict",()=>{
    const measurement={version:"image-plane-audit-v1",state:"CONFLICT",basis:"IMAGE_PLANE",aiAngle:180,aiScore:2,geometryAngle:90,qualityCodes:["ANGLE_LANDMARK_CONFLICT"],view:"SAGITTAL",width:1000,height:700,landmarks:[]} as const;
    const row={...validAnalysis.lowerArm,measurement:{...measurement,qualityCodes:[...measurement.qualityCodes],landmarks:[]},source:"AI" as const,angle:null,requiresReview:true};
    expect(isRulaPostureResultReviewed(row)).toBe(false);
    expect(isRulaPostureResultReviewed({...row,source:"USER",angle:90,detected:true})).toBe(true);
    expect(rulaPostureAnalysisSchema.parse({...validAnalysis,lowerArm:row}).lowerArm.measurement).toEqual(measurement);
  });
  it("persists independent image observations and rejects unbounded or nested collections", () => {
    const image = { imageKey: "one", fileName: "one.png", analysis: validAnalysis, force: 0, muscleUse: false };
    expect(rulaPostureAnalysisSchema.parse({ ...validAnalysis, imageAssessments: [image, { ...image, imageKey: "two", fileName: "two.png", analysis: { ...validAnalysis, trunk: { ...validAnalysis.trunk, score: 4 } } }] }).imageAssessments).toHaveLength(2);
    expect(rulaPostureAnalysisSchema.safeParse({ ...validAnalysis, imageAssessments: Array(5).fill(image) }).success).toBe(false);
    expect(rulaPostureAnalysisSchema.safeParse({ ...validAnalysis, imageAssessments: [{ ...image, analysis: { ...validAnalysis, imageAssessments: [image] } }] }).success).toBe(false);
  });
  it("accepts reviewable posture observations for both groups", () => {
    expect(rulaPostureAnalysisSchema.safeParse(validAnalysis).success).toBe(true);
  });

  it("accepts independent left and right observations for BOTH-side assessments", () => {
    const result = rulaPostureAnalysisSchema.safeParse({
      ...validAnalysis,
      sideAnalyses: {
        LEFT: { ...validAnalysis, trunk: { ...validAnalysis.trunk, score: 4 } },
        RIGHT: { ...validAnalysis, trunk: { ...validAnalysis.trunk, score: 2 } },
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid angles, scores, and unknown fields", () => {
    expect(rulaPostureAnalysisSchema.safeParse({ ...validAnalysis, upperArm: { ...validAnalysis.upperArm, angle: 181 } }).success).toBe(false);
    expect(rulaPostureAnalysisSchema.safeParse({ ...validAnalysis, wrist: { ...validAnalysis.wrist, score: 0 } }).success).toBe(false);
    expect(rulaPostureAnalysisSchema.safeParse({ ...validAnalysis, extra: validAnalysis.legs }).success).toBe(false);
  });

  it("treats automatic AI results as complete while keeping them editable", () => {
    const automatic = { ...validAnalysis, neck: { ...validAnalysis.neck, confirmedByUser: false } };
    expect(rulaPostureAnalysisSchema.safeParse(automatic).success).toBe(true);
    expect(isRulaPostureAnalysisReviewed("RIGHT", automatic)).toBe(true);
    expect(() => assertRulaPostureAnalysisReviewed("RIGHT", automatic)).not.toThrow();
    expect(rulaPostureAnalysisSchema.safeParse({ ...validAnalysis, neck: { ...validAnalysis.neck, source: "USER", confirmedByUser: true } }).success).toBe(true);
  });

  it("does not treat base scores as reviewed posture observations", () => {
    const baseResult = { ...validAnalysis.neck, source: "DEFAULT" as const, confirmedByUser: false };
    expect(isRulaPostureResultReviewed(baseResult)).toBe(false);
    expect(isRulaPostureAnalysisReviewed("RIGHT", { ...validAnalysis, neck: baseResult })).toBe(false);
    expect(() => assertRulaPostureAnalysisReviewed("RIGHT")).toThrow();
    expect(() => assertRulaPostureAnalysisReviewed("RIGHT", { ...validAnalysis, neck: baseResult })).toThrow();
  });

  it("requires explicit confirmation before an unseen AI body part can enter a final RULA score", () => {
    const unseen = { ...validAnalysis.wristTwist, confirmedByUser: false, requiresReview: true };
    expect(isRulaPostureResultReviewed(unseen)).toBe(false);
    expect(isRulaPostureAnalysisReviewed("RIGHT", { ...validAnalysis, wristTwist: unseen })).toBe(false);
    expect(() => assertRulaPostureAnalysisReviewed("RIGHT", { ...validAnalysis, wristTwist: unseen })).toThrow();
    expect(isRulaPostureResultReviewed({ ...unseen, confirmedByUser: true })).toBe(true);
  });

  it("requires explicit confirmation before a low-confidence AI observation enters a final RULA score", () => {
    const uncertain = { ...validAnalysis.neck, confidence: 0.3, confirmedByUser: false, requiresReview: true };
    expect(isRulaPostureResultReviewed(uncertain)).toBe(false);
    expect(isRulaPostureResultReviewed({ ...uncertain, confirmedByUser: true })).toBe(true);
  });

  it("blocks approving a RULA record with uncertain observations while preserving in-progress drafts", () => {
    const uncertain = { ...validAnalysis, neck: { ...validAnalysis.neck, confidence: 0.3, confirmedByUser: false, requiresReview: true } };
    expect(() => assertRulaFinalStatusReviewed("APPROVED", "RIGHT", uncertain)).toThrow();
    expect(() => assertRulaFinalStatusReviewed("IN_PROGRESS", "RIGHT", uncertain)).not.toThrow();
    expect(() => assertRulaFinalStatusReviewed("APPROVED", "RIGHT", validAnalysis)).not.toThrow();
  });

  it("requires independent reviewed observations for both-side assessments", () => {
    const reviewed = Object.fromEntries(Object.entries(validAnalysis).map(([key, value]) => [key, { ...value, source: "USER", confirmedByUser: true }])) as unknown as typeof validAnalysis;
    expect(isRulaPostureAnalysisReviewed("BOTH", { ...reviewed, sideAnalyses: { LEFT: reviewed, RIGHT: reviewed } })).toBe(true);
    expect(() => assertRulaPostureAnalysisReviewed("BOTH", { ...reviewed, sideAnalyses: { LEFT: reviewed, RIGHT: reviewed } })).not.toThrow();
    expect(() => assertRulaPostureAnalysisReviewed("BOTH", { ...reviewed, sideAnalyses: { LEFT: reviewed } })).toThrow();
  });
});
