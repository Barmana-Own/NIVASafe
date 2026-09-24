import { z } from "zod";
import { rulaBodySideKeys, rulaPosturePartKeys, type RulaBodySideResult, type RulaPosturePart } from "./rula-posture.js";

export type RulaPostureImageRow = {
  angle: number | null;
  score: number;
  detected: boolean;
  confidence: number | null;
};

export type RulaPostureImageSide = Record<RulaPosturePart, RulaPostureImageRow>;

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

function parseSide(value: unknown): RulaPostureImageSide | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const rows = Object.fromEntries(rulaPosturePartKeys.map((part) => {
    const candidate = source[part];
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return [part, null];
    const row = candidate as Record<string, unknown>;
    const score = parseScore(row.score);
    const detected = parseBoolean(row.detected);
    if (score === null || detected === null) return [part, null];
    return [part, {
      angle: parseAngle(row.angle),
      score,
      detected,
      confidence: parseConfidence(row.confidence),
    } satisfies RulaPostureImageRow];
  }));
  return rulaPosturePartKeys.every((part) => rows[part] !== null) ? rows as RulaPostureImageSide : null;
}

export function buildRulaPostureImageAnalysisPrompt(input: { bodySide: "LEFT" | "RIGHT" | "BOTH"; jobTitle?: string; taskDescription?: string; postureDescription?: string; locale: "fa" | "en" }) {
  const language = input.locale === "en" ? "English" : "Persian";
  const requestedSides = input.bodySide === "BOTH" ? "LEFT and RIGHT" : input.bodySide;
  return [
    "NIVASAFE_RULA_POSTURE_IMAGE_REVIEW",
    'Return only valid JSON: {"sides":{"LEFT":{"upperArm":{"angle":null,"score":1,"detected":false,"confidence":0},"lowerArm":{"angle":null,"score":1,"detected":false,"confidence":0},"wrist":{"angle":null,"score":1,"detected":false,"confidence":0},"wristTwist":{"angle":null,"score":1,"detected":false,"confidence":0},"neck":{"angle":null,"score":1,"detected":false,"confidence":0},"trunk":{"angle":null,"score":1,"detected":false,"confidence":0},"legs":{"angle":null,"score":1,"detected":false,"confidence":0}},"RIGHT":{}},"notes":""}.',
    `Use ${language}. Analyse the requested anatomical side(s): ${requestedSides}. For BOTH, return complete independent LEFT and RIGHT objects; never copy one side's values to the other side.`,
    "LEFT and RIGHT refer to the person's anatomical sides, not the left and right side of the image. Do not swap them because of the camera view.",
    "Use only visible evidence. Do not identify a person, diagnose illness, invent exact measurements, or infer an angle that cannot be observed. Use angle null and detected false when a part is not visible; the numeric score is only a provisional manual-review starting point.",
    "For every body part, score must be an integer from 1 to 6. Confidence must be a number from 0 to 1 or null. The output is advisory and must be reviewed and confirmed by a qualified HSE assessor.",
    `Job/process: ${cleanText(input.jobTitle, 180) || "-"}`,
    `Task: ${cleanText(input.taskDescription, 500) || "-"}`,
    `Human-provided posture notes: ${cleanText(input.postureDescription, 1_000) || "-"}`,
  ].join("\n");
}

export function parseRulaPostureImageAnalysis(answer: string, bodySide: "LEFT" | "RIGHT" | "BOTH"): RulaPostureImageAnalysis {
  const parsed = parseJsonObject(answer);
  const rawSides = parsed?.sides ?? parsed?.sideAnalyses;
  if (!rawSides || typeof rawSides !== "object" || Array.isArray(rawSides)) throw Object.assign(new Error("AI posture analysis returned no side results"), { code: "RULA_IMAGE_AI_INVALID_RESPONSE" });
  const requestedSides = bodySide === "BOTH" ? rulaBodySideKeys : [bodySide] as const;
  const sides = Object.fromEntries(requestedSides.map((side) => {
    const parsedSide = parseSide((rawSides as Record<string, unknown>)[side]);
    if (!parsedSide) throw Object.assign(new Error(`AI posture analysis returned an incomplete ${side} result`), { code: "RULA_IMAGE_AI_INVALID_RESPONSE" });
    return [side, parsedSide];
  })) as Partial<Record<RulaBodySideResult, RulaPostureImageSide>>;
  return { sides, notes: cleanText(parsed?.notes ?? parsed?.summary, MAX_NOTE_LENGTH) };
}

export const rulaPostureImageAnalysisResponseSchema = z.object({
  sides: z.record(z.enum(rulaBodySideKeys), z.record(z.enum(rulaPosturePartKeys), z.object({ angle: z.number().nullable(), score: z.number().int(), detected: z.boolean(), source: z.literal("AI"), confirmedByUser: z.literal(false), confidence: z.number().nullable().optional() }).strict())),
  notes: z.string().max(MAX_NOTE_LENGTH),
}).strict();
