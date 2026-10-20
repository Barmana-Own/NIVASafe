import { z } from "zod";
import { isMeasurementResolved, rulaMeasurementSchema } from "./rula-measurement.js";

export const rulaPosturePartKeys = ["upperArm", "lowerArm", "wrist", "wristTwist", "neck", "trunk", "legs"] as const;
export const rulaPosturePartSchema = z.enum(rulaPosturePartKeys);
export type RulaPosturePart = typeof rulaPosturePartKeys[number];
export const rulaBodySideKeys = ["LEFT", "RIGHT"] as const;
export const rulaBodySideResultSchema = z.enum(rulaBodySideKeys);
export type RulaBodySideResult = typeof rulaBodySideKeys[number];

export const rulaOverlayPointKeys = ["head", "neck", "shoulder", "elbow", "wrist", "hand", "hip", "knee", "ankle"] as const;
export type RulaOverlayPointKey = typeof rulaOverlayPointKeys[number];

export const rulaPostureImagePointSchema = z.object({
  x: z.number().refine(Number.isFinite).min(0).max(1),
  y: z.number().refine(Number.isFinite).min(0).max(1),
  confidence: z.number().refine(Number.isFinite).min(0).max(1).nullable().optional(),
}).strict();

export const rulaPostureImageOverlaySchema = z.object({
  points: z.object({
    head: rulaPostureImagePointSchema.optional(),
    neck: rulaPostureImagePointSchema.optional(),
    shoulder: rulaPostureImagePointSchema.optional(),
    elbow: rulaPostureImagePointSchema.optional(),
    wrist: rulaPostureImagePointSchema.optional(),
    hand: rulaPostureImagePointSchema.optional(),
    hip: rulaPostureImagePointSchema.optional(),
    knee: rulaPostureImagePointSchema.optional(),
    ankle: rulaPostureImagePointSchema.optional(),
  }).strict(),
}).strict();

export type RulaPostureImageOverlay = z.infer<typeof rulaPostureImageOverlaySchema>;

const angle = z.number().refine(Number.isFinite).min(-180).max(180).nullable();
const postureResult = z.object({
  angle,
  score: z.number().int().min(1).max(6),
  detected: z.boolean(),
  source: z.enum(["AI", "USER", "DEFAULT"]),
  confirmedByUser: z.boolean().default(false),
  confidence: z.number().min(0).max(1).nullable().optional(),
  /** Set only for new AI observations that need a human decision; absent legacy data stays compatible. */
  requiresReview: z.boolean().optional(),
  measurement: rulaMeasurementSchema.optional(),
}).strict();

export type RulaPostureResult = z.infer<typeof postureResult>;

/** Persisted posture observations. AI output is complete by default and remains editable by the user. */
export const rulaSinglePostureAnalysisSchema = z.object({
  upperArm: postureResult,
  lowerArm: postureResult,
  wrist: postureResult,
  wristTwist: postureResult,
  neck: postureResult,
  trunk: postureResult,
  legs: postureResult,
  evaluationRows: z.array(z.object({ id: z.string().min(1).max(320), group: z.string().max(16).optional(), bodyPart: z.string().max(160).optional(), scoreShare: z.number().min(0).max(100).optional(), title: z.string().max(240).optional(), description: z.string().max(1200).optional(), priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(), status: z.enum(["UNSELECTED", "IN_PROGRESS", "COMPLETED"]).optional(), deleted: z.boolean().optional() }).strict()).max(200).optional(),
}).strict();

export const rulaPostureObservationSchema = rulaSinglePostureAnalysisSchema.extend({
  /** Independent observations kept for BOTH-side assessments. */
  sideAnalyses: z.object({
    LEFT: rulaSinglePostureAnalysisSchema.optional(),
    RIGHT: rulaSinglePostureAnalysisSchema.optional(),
  }).strict().optional(),
  /** Vision landmarks are advisory and remain normalized to the original image. */
  imageOverlay: rulaPostureImageOverlaySchema.optional(),
  sideImageOverlays: z.object({
    LEFT: rulaPostureImageOverlaySchema.optional(),
    RIGHT: rulaPostureImageOverlaySchema.optional(),
  }).strict().optional(),
}).strict();

export const rulaImageAssessmentSchema = z.object({
  imageKey: z.string().min(1).max(320),
  fileName: z.string().min(1).max(255),
  attachmentId: z.string().uuid().optional(),
  analysis: rulaPostureObservationSchema,
  model: z.string().max(120).optional(),
  force: z.number().int().min(0).max(3).default(0),
  muscleUse: z.boolean().default(false),
}).strict();
export const rulaPostureAnalysisSchema = rulaPostureObservationSchema.extend({
  imageAssessments: z.array(rulaImageAssessmentSchema).max(4).optional(),
}).strict();

export type RulaSinglePostureAnalysis = z.infer<typeof rulaSinglePostureAnalysisSchema>;
export type RulaPostureAnalysis = z.infer<typeof rulaPostureAnalysisSchema>;

export function isRulaPostureResultReviewed(result: RulaPostureResult) {
  return result.source !== "DEFAULT" && (result.requiresReview !== true || result.confirmedByUser) && isMeasurementResolved(result);
}

export function isRulaPostureAnalysisReviewed(bodySide: "LEFT" | "RIGHT" | "BOTH", analysis?: RulaPostureAnalysis) {
  if (!analysis) return false;
  const analyses = bodySide === "BOTH" ? [analysis.sideAnalyses?.LEFT, analysis.sideAnalyses?.RIGHT] : [analysis];
  return analyses.every((side) => Boolean(side && rulaPosturePartKeys.every((key) => isRulaPostureResultReviewed(side[key]))));
}

export function assertRulaPostureAnalysisReviewed(bodySide: "LEFT" | "RIGHT" | "BOTH", analysis?: RulaPostureAnalysis) {
  if (!analysis || !isRulaPostureAnalysisReviewed(bodySide, analysis)) {
    throw Object.assign(new Error("برای هر عضو بدن باید نتیجه تحلیل خودکار یا مقدار دستی معتبر ثبت شود."), { statusCode: 400, code: "RULA_POSTURE_REVIEW_REQUIRED" });
  }
}

/** Approved assessments are final and cannot contain unconfirmed new AI observations. */
export function assertRulaFinalStatusReviewed(status: string | undefined, bodySide: "LEFT" | "RIGHT" | "BOTH", analysis?: RulaPostureAnalysis) {
  if (status === "APPROVED") assertRulaPostureAnalysisReviewed(bodySide, analysis);
}
