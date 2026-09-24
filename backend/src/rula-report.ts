import { calculateRula, type RulaInput } from "@nivasafe/domain";
import { z } from "zod";
import { isRulaPostureResultReviewed, rulaPostureAnalysisSchema, rulaPosturePartKeys, type RulaPostureAnalysis, type RulaPosturePart } from "./rula-posture.js";

export const rulaInputSchema = z.object({
  upperArm: z.number().int().min(1).max(6),
  lowerArm: z.number().int().min(1).max(6),
  wrist: z.number().int().min(1).max(6),
  wristTwist: z.number().int().min(1).max(6),
  neck: z.number().int().min(1).max(6),
  trunk: z.number().int().min(1).max(6),
  legs: z.number().int().min(1).max(6),
  muscleUse: z.boolean(),
  force: z.number().int().min(0).max(3),
}).strict();

export const rulaImpactSchema = z.object({
  suggestionId: z.string().trim().min(1).max(80).optional(),
  scoreReduction: z.number().int().min(0).max(6),
  affectedParts: z.array(z.enum(rulaPosturePartKeys)).max(7),
}).strict();

export type RulaImpact = z.infer<typeof rulaImpactSchema>;
export type RulaActionPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type RulaReportFactor = {
  key: Extract<RulaPosturePart, "neck" | "upperArm" | "trunk">;
  angle: number | null;
  detected: boolean;
  score: number;
  impactPercent: number;
  impactLevel: "LOW" | "MEDIUM" | "HIGH";
  source: "AI" | "USER" | "DEFAULT";
  reviewed: boolean;
};

export type RulaCorrectionSuggestion = {
  id: string;
  titleFa: string;
  titleEn: string;
  descriptionFa: string;
  descriptionEn: string;
  priority: RulaActionPriority;
  scoreReduction: number;
  affectedParts: RulaPosturePart[];
  bodySide: "LEFT" | "RIGHT" | "BOTH";
};

export function parseRulaInputs(value: unknown): RulaInput {
  return rulaInputSchema.parse(value);
}

export function fallbackRulaPostureAnalysis(inputs: RulaInput): RulaPostureAnalysis {
  return Object.fromEntries(rulaPosturePartKeys.map((key) => [key, {
    angle: null,
    score: inputs[key],
    detected: key === "wristTwist" ? inputs.wristTwist > 1 : false,
    source: "DEFAULT" as const,
    confirmedByUser: false,
  }])) as unknown as RulaPostureAnalysis;
}

export function parseRulaPostureAnalysis(value: unknown, inputs: RulaInput): RulaPostureAnalysis {
  const parsed = rulaPostureAnalysisSchema.safeParse(value);
  return parsed.success ? parsed.data : fallbackRulaPostureAnalysis(inputs);
}

function factorImpactLevel(score: number): RulaReportFactor["impactLevel"] {
  return score >= 4 ? "HIGH" : score >= 3 ? "MEDIUM" : "LOW";
}

export function buildRulaFactors(analysis: RulaPostureAnalysis): RulaReportFactor[] {
  const keys = ["neck", "upperArm", "trunk"] as const;
  const total = Math.max(1, keys.reduce((sum, key) => sum + analysis[key].score, 0));
  return keys.map((key) => ({
    key,
    angle: analysis[key].angle,
    detected: analysis[key].detected,
    score: analysis[key].score,
    impactPercent: Math.round((analysis[key].score / total) * 100),
    impactLevel: factorImpactLevel(analysis[key].score),
    source: analysis[key].source,
    reviewed: isRulaPostureResultReviewed(analysis[key]),
  })).sort((left, right) => right.impactPercent - left.impactPercent || right.score - left.score || keys.indexOf(left.key) - keys.indexOf(right.key));
}

function actionPriority(score: number): RulaActionPriority {
  return score >= 5 ? "HIGH" : score >= 3 ? "MEDIUM" : "LOW";
}

export function buildRulaSuggestions(analysis: RulaPostureAnalysis, inputs: RulaInput, bodySide: "LEFT" | "RIGHT" | "BOTH" = "RIGHT"): RulaCorrectionSuggestion[] {
  const suggestions: Omit<RulaCorrectionSuggestion, "bodySide">[] = [];
  if (analysis.trunk.score >= 2 || analysis.neck.score >= 2) {
    suggestions.push({
      id: "adjust-work-surface",
      titleFa: "تنظیم ارتفاع سطح کار",
      titleEn: "Adjust work-surface height",
      descriptionFa: "ارتفاع سطح کار و محل قرارگیری بار را برای نزدیک‌شدن تنه و گردن به وضعیت خنثی تنظیم کنید.",
      descriptionEn: "Adjust the work-surface height and load position to bring the trunk and neck closer to neutral.",
      priority: actionPriority(Math.max(analysis.trunk.score, analysis.neck.score)),
      scoreReduction: 2,
      affectedParts: ["trunk", "neck"],
    });
  }
  if (analysis.neck.score >= 2) {
    suggestions.push({
      id: "correct-neck-position",
      titleFa: "اصلاح وضعیت گردن",
      titleEn: "Correct neck posture",
      descriptionFa: "خط دید و جایگاه قطعه را طوری اصلاح کنید که خم‌شدن و چرخش گردن کاهش یابد.",
      descriptionEn: "Reposition the line of sight and part so neck flexion and rotation are reduced.",
      priority: actionPriority(analysis.neck.score),
      scoreReduction: 1,
      affectedParts: ["neck"],
    });
  }
  if (inputs.muscleUse || inputs.force > 0) {
    suggestions.push({
      id: "reduce-posture-hold",
      titleFa: "کاهش مدت نگه‌داشتن پوسچر",
      titleEn: "Reduce posture-hold duration",
      descriptionFa: "وقفه کوتاه، تناوب کار و جابه‌جایی وظیفه را برای کاهش بار استاتیک اجرا کنید.",
      descriptionEn: "Add short breaks, task rotation, or alternation to reduce static loading.",
      priority: inputs.force >= 2 ? "HIGH" : "MEDIUM",
      scoreReduction: 1,
      affectedParts: ["neck", "trunk", "upperArm"],
    });
  }
  if (analysis.upperArm.score >= 2 || analysis.lowerArm.score >= 2 || analysis.wrist.score >= 2) {
    suggestions.push({
      id: "support-upper-limb",
      titleFa: "حمایت از اندام فوقانی",
      titleEn: "Support the upper limb",
      descriptionFa: "ابزار، دسته یا تکیه‌گاه مناسب برای کاهش زاویه بازو، ساعد و مچ فراهم کنید.",
      descriptionEn: "Provide a suitable tool, handle, or support to reduce upper-arm, forearm, and wrist angles.",
      priority: actionPriority(Math.max(analysis.upperArm.score, analysis.lowerArm.score, analysis.wrist.score)),
      scoreReduction: 1,
      affectedParts: ["upperArm", "lowerArm", "wrist"],
    });
  }
  return suggestions.map((suggestion) => ({ ...suggestion, bodySide }));
}

export function predictedRulaScore(score: number, impacts: Array<Pick<RulaImpact, "scoreReduction"> | null | undefined>): number {
  const reduction = impacts.reduce((sum, impact) => sum + (impact?.scoreReduction ?? 0), 0);
  return Math.max(1, Math.min(7, score - Math.min(6, reduction)));
}

export function predictedRulaScoreFromInputs(inputs: RulaInput, impacts: Array<Pick<RulaImpact, "scoreReduction"> | null | undefined>): number {
  return predictedRulaScore(calculateRula(inputs).score, impacts);
}
