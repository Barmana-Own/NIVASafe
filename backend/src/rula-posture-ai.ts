import { suggestedRulaPostureScore } from "@nivasafe/domain";
import { z } from "zod";
import {
  rulaBodySideKeys,
  rulaOverlayPointKeys,
  rulaPostureImageOverlaySchema,
  rulaPosturePartKeys,
  type RulaBodySideResult,
  type RulaPostureImageOverlay,
  type RulaPosturePart,
} from "./rula-posture.js";

export type RulaPostureImageRow = {
  angle: number | null;
  score: number;
  detected: boolean;
  confidence: number | null;
};

export type RulaPostureImageSide = Record<RulaPosturePart, RulaPostureImageRow> & {
  overlay: RulaPostureImageOverlay;
};

export type RulaPostureImageAnalysis = {
  sides: Partial<Record<RulaBodySideResult, RulaPostureImageSide>>;
  notes: string;
};

const MAX_NOTE_LENGTH = 1_200;

function parseJsonObject(answer: string): Record<string, unknown> | null {
  const candidate = answer.match(/\{[\s\S]*\}/u)?.[0];
  if (!candidate) return null;
  try {
    const parsed = JSON.parse(candidate) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001F\u007F]/gu, " ").trim().slice(0, maxLength) : "";
}

function normaliseNumberText(value: string) {
  return value
    .replace(/[۰-۹]/gu, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/gu, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function numberValue(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value !== "string" || !value.trim()) return Number.NaN;
  return Number(normaliseNumberText(value).trim());
}

function parseAngle(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const result = numberValue(value);
  return Number.isFinite(result) && result >= -180 && result <= 180 ? result : null;
}

function parseScore(value: unknown) {
  const result = numberValue(value);
  return Number.isInteger(result) && result >= 1 && result <= 6 ? result : null;
}

function parseBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return null;
  if (["true", "1", "yes"].includes(value.trim().toLowerCase())) return true;
  if (["false", "0", "no"].includes(value.trim().toLowerCase())) return false;
  return null;
}

function parseConfidence(value: unknown) {
  const result = numberValue(value);
  return Number.isFinite(result) && result >= 0 && result <= 1 ? result : null;
}

function invalidResponse(message: string): never {
  throw Object.assign(new Error(`RULA_IMAGE_AI_INVALID_RESPONSE: ${message}`), { code: "RULA_IMAGE_AI_INVALID_RESPONSE" });
}

function parseOverlay(value: unknown): RulaPostureImageOverlay {
  if (value === undefined || value === null) return { points: {} };
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidResponse("AI posture analysis returned an invalid overlay");
  const source = value as Record<string, unknown>;
  const rawPoints = source.points;
  if (!rawPoints || typeof rawPoints !== "object" || Array.isArray(rawPoints)) invalidResponse("AI posture analysis returned invalid overlay points");
  const pointsSource = rawPoints as Record<string, unknown>;
  const points: Record<string, { x: number; y: number; confidence?: number | null }> = {};
  for (const key of rulaOverlayPointKeys) {
    if (!(key in pointsSource)) continue;
    const candidate = pointsSource[key];
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) invalidResponse("AI posture analysis returned an invalid landmark");
    const landmark = candidate as Record<string, unknown>;
    const x = numberValue(landmark.x);
    const y = numberValue(landmark.y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) invalidResponse("AI posture analysis returned out-of-bounds landmark coordinates");
    const hasConfidence = Object.prototype.hasOwnProperty.call(landmark, "confidence");
    const confidence = hasConfidence ? (landmark.confidence === null ? null : parseConfidence(landmark.confidence)) : undefined;
    if (hasConfidence && landmark.confidence !== null && confidence === null) invalidResponse("AI posture analysis returned an invalid landmark confidence");
    if (confidence !== undefined && confidence !== null && confidence < 0.5) continue;
    points[key] = confidence === undefined ? { x, y } : { x, y, confidence };
  }
  const parsed = rulaPostureImageOverlaySchema.safeParse({ points });
  if (!parsed.success) invalidResponse("AI posture analysis returned an invalid overlay");
  return parsed.data;
}

function parseSide(value: unknown): RulaPostureImageSide | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const rows: Partial<Record<RulaPosturePart, RulaPostureImageRow>> = {};
  for (const part of rulaPosturePartKeys) {
    const candidate = source[part];
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
    const row = candidate as Record<string, unknown>;
    const modelScore = parseScore(row.score);
    const detected = parseBoolean(row.detected);
    if (modelScore === null || detected === null) continue;
    const angle = detected ? parseAngle(row.angle) : null;
    const score = !detected ? 1 : angle === null ? modelScore : suggestedRulaPostureScore(part, angle, detected, modelScore);
    rows[part] = {
      angle,
      score,
      detected,
      confidence: parseConfidence(row.confidence),
    };
  }
  if (!rulaPosturePartKeys.every((part) => rows[part] !== undefined)) return null;
  return { ...(rows as Record<RulaPosturePart, RulaPostureImageRow>), overlay: parseOverlay(source.overlay) };
}

export function buildRulaPostureImageAnalysisPrompt(input: { bodySide: "LEFT" | "RIGHT" | "BOTH"; jobTitle?: string; taskDescription?: string; postureDescription?: string; locale: "fa" | "en" }) {
  const language = input.locale === "en" ? "English" : "Persian";
  const requestedSides = input.bodySide === "BOTH" ? "LEFT and RIGHT" : input.bodySide;
  return [
    "NIVASAFE_RULA_POSTURE_IMAGE_REVIEW",
    'Return only valid JSON: {"sides":{"LEFT":{"upperArm":{"angle":null,"score":1,"detected":false,"confidence":0},"lowerArm":{"angle":null,"score":1,"detected":false,"confidence":0},"wrist":{"angle":null,"score":1,"detected":false,"confidence":0},"wristTwist":{"angle":null,"score":1,"detected":false,"confidence":0},"neck":{"angle":null,"score":1,"detected":false,"confidence":0},"trunk":{"angle":null,"score":1,"detected":false,"confidence":0},"legs":{"angle":null,"score":1,"detected":false,"confidence":0},"overlay":{"points":{"head":{"x":0,"y":0,"confidence":0}}}},"RIGHT":{}},"notes":""}.',
    `Use ${language}. Analyse the requested anatomical side(s): ${requestedSides}. For BOTH, return complete independent LEFT and RIGHT objects; never copy one side's values to the other side.`,
    "LEFT and RIGHT refer to the person's anatomical sides, not the left and right side of the image. Do not swap them because of the camera view.",
    "Use only visible evidence. Do not identify a person, diagnose illness, invent exact measurements, or infer an angle that cannot be observed. Use angle null and detected false when a part is not visible; the numeric score is only a provisional manual-review starting point.",
    "For every body part, report the visible angle in degrees when it can be measured and derive the provisional score from the official RULA angle bands; if a part is not visible, use angle null, detected false and score 1. Confidence must be a number from 0 to 1 or null. The output is advisory and must be reviewed and confirmed by a qualified HSE assessor.",
    "For overlay.points, return visible landmarks only: head, neck, shoulder, elbow, wrist, hip, knee, ankle. Use normalized x and y coordinates from 0 to 1 relative to the original image, not a resized or cropped preview. Coordinates must point to the center of the visible anatomical landmark, not to an inferred location.",
    "Do not draw a skeleton when a landmark is not visible. Omit unavailable points and never connect a line through a missing point. LEFT and RIGHT remain the person's anatomical sides.",
    `Job/process: ${cleanText(input.jobTitle, 180) || "-"}`,
    `Task: ${cleanText(input.taskDescription, 500) || "-"}`,
    `Human-provided posture notes: ${cleanText(input.postureDescription, 1_000) || "-"}`,
  ].join("\n");
}

export function parseRulaPostureImageAnalysis(answer: string, bodySide: "LEFT" | "RIGHT" | "BOTH"): RulaPostureImageAnalysis {
  const parsed = parseJsonObject(answer);
  const rawSides = parsed?.sides ?? parsed?.sideAnalyses;
  if (!rawSides || typeof rawSides !== "object" || Array.isArray(rawSides)) invalidResponse("AI posture analysis returned no side results");
  const requestedSides = bodySide === "BOTH" ? rulaBodySideKeys : [bodySide] as const;
  const sides = Object.fromEntries(requestedSides.map((side) => {
    const parsedSide = parseSide((rawSides as Record<string, unknown>)[side]);
    if (!parsedSide) invalidResponse(`AI posture analysis returned an incomplete ${side} result`);
    return [side, parsedSide];
  })) as Partial<Record<RulaBodySideResult, RulaPostureImageSide>>;
  return { sides, notes: cleanText(parsed?.notes ?? parsed?.summary, MAX_NOTE_LENGTH) };
}

const rulaImageResponseRowSchema = z.object({
  angle: z.number().min(-180).max(180).nullable(),
  score: z.number().int().min(1).max(6),
  detected: z.boolean(),
  confidence: z.number().min(0).max(1).nullable(),
}).strict();

const rulaImageResponseSideSchema = z.object({
  upperArm: rulaImageResponseRowSchema,
  lowerArm: rulaImageResponseRowSchema,
  wrist: rulaImageResponseRowSchema,
  wristTwist: rulaImageResponseRowSchema,
  neck: rulaImageResponseRowSchema,
  trunk: rulaImageResponseRowSchema,
  legs: rulaImageResponseRowSchema,
  overlay: rulaPostureImageOverlaySchema,
}).strict();

export const rulaPostureImageAnalysisResponseSchema = z.object({
  sides: z.object({
    LEFT: rulaImageResponseSideSchema.optional(),
    RIGHT: rulaImageResponseSideSchema.optional(),
  }).strict(),
  notes: z.string().max(MAX_NOTE_LENGTH),
  provider: z.string().min(1).max(80),
  aiStatus: z.enum(["connected", "fallback"]),
}).strict();
