import type { RulaInput } from "@nivasafe/domain";
import { actionPriority, type FmeaReportRisk } from "./fmea-report.js";
import {
  buildRulaSuggestionsForAssessment,
  RULA_CORRECTIVE_SUGGESTION_MAX,
  type RulaActionPriority,
  type RulaCorrectionSuggestion,
} from "./rula-report.js";
import { rulaPosturePartKeys, type RulaPostureAnalysis, type RulaPosturePart } from "./rula-posture.js";

const MAX_ACTION_SUGGESTIONS = 8;
const MAX_RULA_ACTION_SUGGESTIONS = RULA_CORRECTIVE_SUGGESTION_MAX;
const actionPriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
type ActionSuggestionSource = "AI" | "FALLBACK";

export type FmeaActionCandidate = FmeaReportRisk & {
  id: string;
  processStep: string;
  preventiveControls: string | null;
  detectionControls: string | null;
};

export type FmeaActionSuggestion = {
  id: string;
  title: string;
  description: string;
  fmeaItemId: string;
  failureMode: string;
  priority: ReturnType<typeof actionPriority>;
  status: "SUGGESTED";
  source: ActionSuggestionSource;
};

function boundedText(value: unknown, fallback = "", maxLength = 1_200) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : fallback;
}

function normalisedKey(value: string) {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

function parseJsonObject(answer: string): Record<string, unknown> | null {
  const candidate = answer.match(/\{[\s\S]*\}/)?.[0];
  if (!candidate) return null;
  try {
    const parsed: unknown = JSON.parse(candidate);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function priority(value: unknown, fallback: ReturnType<typeof actionPriority>): ReturnType<typeof actionPriority> {
  const candidate = typeof value === "string" ? value.trim().toUpperCase() : "";
  return actionPriorities.includes(candidate as (typeof actionPriorities)[number]) ? candidate as ReturnType<typeof actionPriority> : fallback;
}

function boundedLimit(value: number, maximum = MAX_ACTION_SUGGESTIONS) {
  return Math.max(1, Math.min(maximum, Math.trunc(value)));
}

function fmeaSuggestionKey(suggestion: Pick<FmeaActionSuggestion, "fmeaItemId" | "title">) {
  return suggestion.fmeaItemId + "\u0000" + normalisedKey(suggestion.title);
}

export function buildFmeaActionSuggestionsPrompt(input: {
  processName: string;
  projectName?: string | null;
  department?: string | null;
  activityDescription?: string | null;
  specialConditions?: string | null;
  locale: "fa" | "en";
  candidates: FmeaActionCandidate[];
  existingActionTitles: string[];
}) {
  const language = input.locale === "en" ? "English" : "Persian";
  const rows = input.candidates.slice(0, 20).map((item) => ({
    rowNumber: item.rowNumber,
    processStep: boundedText(item.processStep, "-"),
    failureMode: boundedText(item.failureMode, "-"),
    effect: boundedText(item.effect, "-"),
    cause: boundedText(item.cause, "-"),
    preventiveControls: boundedText(item.preventiveControls, "-"),
    detectionControls: boundedText(item.detectionControls, "-"),
    severity: item.severity,
    occurrence: item.occurrence,
    detection: item.detection,
    rpn: item.rpn,
    riskLevel: item.riskLevel,
    recommendation: boundedText(item.recommendation, "-"),
  }));
  return [
    "NIVASAFE_FMEA_ACTION_SUGGESTIONS",
    'Return only valid JSON: {"actions":[{"rowNumber":1,"title":"","description":"","priority":"HIGH"}]}.',
    `Use ${language}. Return at most ${MAX_ACTION_SUGGESTIONS} concise corrective actions linked only to the supplied rowNumber values.`,
    "Prioritize elimination, substitution, engineering controls, administrative controls, then PPE. Do not invent measurements, equipment, incidents, or organization-specific facts.",
    "The suggestions are advisory drafts. A qualified HSE professional must review and approve them before implementation.",
    `Process / job: ${boundedText(input.processName, "-")}`,
    `Project: ${boundedText(input.projectName, "-")}`,
    `Department / unit: ${boundedText(input.department, "-")}`,
    `Activity description: ${boundedText(input.activityDescription, "-")}`,
    `Special work conditions: ${boundedText(input.specialConditions, "-")}`,
    `Registered action titles to avoid duplicating: ${JSON.stringify(input.existingActionTitles.slice(0, 40).map((title) => boundedText(title, "-", 240)))}`,
    `FMEA risk rows: ${JSON.stringify(rows)}`,
  ].join("\n");
}

export function parseFmeaActionSuggestions(answer: string, candidates: FmeaActionCandidate[]): FmeaActionSuggestion[] {
  const parsed = parseJsonObject(answer);
  const rows = parsed?.actions;
  if (!Array.isArray(rows)) return [];
  const candidatesByRow = new Map(candidates.map((candidate) => [candidate.rowNumber, candidate]));
  const seen = new Set<string>();
  return rows.slice(0, MAX_ACTION_SUGGESTIONS).flatMap((value, index) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const row = value as Record<string, unknown>;
    const rowNumber = typeof row.rowNumber === "number" ? row.rowNumber : Number(row.rowNumber);
    const candidate = Number.isInteger(rowNumber) ? candidatesByRow.get(rowNumber) : undefined;
    const title = boundedText(row.title, "", 240);
    if (!candidate || !title) return [];
    const suggestion: FmeaActionSuggestion = {
      id: `fmea-ai-${candidate.rowNumber}-${index + 1}`,
      title,
      description: boundedText(row.description, `${boundedText(candidate.failureMode)}: ${boundedText(candidate.effect)}`, 1_200),
      fmeaItemId: candidate.id,
      failureMode: candidate.failureMode,
      priority: priority(row.priority, actionPriority(candidate.riskLevel)),
      status: "SUGGESTED",
      source: "AI",
    };
    const key = fmeaSuggestionKey(suggestion);
    if (seen.has(key)) return [];
    seen.add(key);
    return [suggestion];
  });
}

function fallbackFmeaTitle(candidate: FmeaActionCandidate, locale: "fa" | "en") {
  const failureMode = boundedText(candidate.failureMode, locale === "fa" ? "خطر شناسایی‌شده" : "identified hazard", 180);
  return locale === "fa" ? `کنترل خطر «${failureMode}»` : `Control hazard: ${failureMode}`;
}

function fallbackFmeaDescription(candidate: FmeaActionCandidate, locale: "fa" | "en") {
  const failureMode = boundedText(candidate.failureMode, locale === "fa" ? "خطر شناسایی‌شده" : "identified hazard");
  const effect = boundedText(candidate.effect, locale === "fa" ? "اثر ثبت‌شده" : "recorded effect");
  const controls = [candidate.preventiveControls, candidate.detectionControls].map((value) => boundedText(value)).filter(Boolean).join(locale === "fa" ? "؛ " : "; ");
  if (locale === "fa") return `برای کاهش «${failureMode}» و پیامد «${effect}»، کنترل‌های موجود${controls ? ` (${controls})` : ""} را بازبینی و اقدام اصلاحی را پس از تأیید متخصص HSE ثبت کنید.`;
  return `Review the controls${controls ? ` (${controls})` : ""} for “${failureMode}” and its effect “${effect}”, then register the corrective action after HSE review.`;
}

function fallbackFmeaAlternateTitle(candidate: FmeaActionCandidate, locale: "fa" | "en", variant: 1 | 2 | 3) {
  const failureMode = boundedText(candidate.failureMode, locale === "fa" ? "خطر شناسایی‌شده" : "identified hazard", 180);
  if (variant === 1) return locale === "fa" ? `بازبینی کنترل پیشگیرانه برای «${failureMode}»` : `Review preventive control for “${failureMode}”`;
  if (variant === 2) return locale === "fa" ? `تدوین چک‌لیست بازرسی برای «${failureMode}»` : `Create an inspection checklist for “${failureMode}”`;
  return locale === "fa" ? `آموزش و پایش اجرای کنترل «${failureMode}»` : `Train and monitor the control for “${failureMode}”`;
}

export function fallbackFmeaActionSuggestions(input: { candidates: FmeaActionCandidate[]; existingActionTitles: string[]; locale: "fa" | "en"; limit?: number }): FmeaActionSuggestion[] {
  const registered = new Set(input.existingActionTitles.map(normalisedKey).filter(Boolean));
  const seen = new Set<string>();
  return [...input.candidates]
    .sort((left, right) => right.rpn - left.rpn || right.severity - left.severity || left.rowNumber - right.rowNumber)
    .flatMap((candidate) => {
      const recommendation = boundedText(candidate.recommendation, "", 240);
      const primaryTitle = recommendation || fallbackFmeaTitle(candidate, input.locale);
      const titles = registered.has(normalisedKey(primaryTitle))
        ? ([1, 2, 3] as const).map((variant) => fallbackFmeaAlternateTitle(candidate, input.locale, variant)).filter((title) => !registered.has(normalisedKey(title)))
        : [primaryTitle];
      return titles.flatMap((title, index) => {
        if (!title || registered.has(normalisedKey(title))) return [];
        const suggestion: FmeaActionSuggestion = {
          id: `fmea-fallback-${candidate.rowNumber}-${title === primaryTitle ? "primary" : `alternate-${index + 1}`}`,
          title,
          description: recommendation && title === primaryTitle ? `${boundedText(candidate.failureMode)}: ${boundedText(candidate.effect)}` : fallbackFmeaDescription(candidate, input.locale),
          fmeaItemId: candidate.id,
          failureMode: candidate.failureMode,
          priority: actionPriority(candidate.riskLevel),
          status: "SUGGESTED",
          source: "FALLBACK",
        };
        const key = fmeaSuggestionKey(suggestion);
        if (seen.has(key)) return [];
        seen.add(key);
        return [suggestion];
      });
    })
    .slice(0, boundedLimit(input.limit ?? MAX_ACTION_SUGGESTIONS));
}

export function mergeFmeaActionSuggestions(primary: FmeaActionSuggestion[], fallback: FmeaActionSuggestion[], existingActionTitles: string[] = [], limit = MAX_ACTION_SUGGESTIONS) {
  const registered = new Set(existingActionTitles.map(normalisedKey).filter(Boolean));
  const seen = new Set<string>();
  return [...primary, ...fallback].flatMap((suggestion) => {
    if (registered.has(normalisedKey(suggestion.title))) return [];
    const key = fmeaSuggestionKey(suggestion);
    if (seen.has(key)) return [];
    seen.add(key);
    return [suggestion];
  }).slice(0, boundedLimit(limit));
}

export type RulaActionSuggestionContext = {
  bodySide: "LEFT" | "RIGHT" | "BOTH";
  score: number;
  actionLevel: number;
  inputs: RulaInput;
  analysis: RulaPostureAnalysis;
  jobTitle?: string | null;
  taskDescription?: string | null;
  postureDescription?: string | null;
  locale: "fa" | "en";
  sideResults?: Partial<Record<"LEFT" | "RIGHT", { score: number; actionLevel: number }>>;
};

function isRulaPart(value: unknown): value is RulaPosturePart {
  return typeof value === "string" && (rulaPosturePartKeys as readonly string[]).includes(value);
}

function rulaText(value: unknown, fallback = "", maxLength = 600) {
  return boundedText(value, fallback, maxLength);
}

function rulaSuggestionKey(suggestion: RulaCorrectionSuggestion) {
  return (suggestion.bodySide ?? "BOTH") + "\u0000" + normalisedKey(suggestion.titleEn || suggestion.titleFa);
}

export function buildRulaActionSuggestionsPrompt(input: RulaActionSuggestionContext) {
  const language = input.locale === "en" ? "English" : "Persian";
  const postureForSide = (analysis: RulaPostureAnalysis) => rulaPosturePartKeys.map((key) => ({ part: key, angle: analysis[key].angle, score: analysis[key].score, detected: analysis[key].detected }));
  const posture = input.bodySide === "BOTH" && input.analysis.sideAnalyses?.LEFT && input.analysis.sideAnalyses.RIGHT
    ? { LEFT: postureForSide(input.analysis.sideAnalyses.LEFT), RIGHT: postureForSide(input.analysis.sideAnalyses.RIGHT) }
    : postureForSide(input.analysis);
  const sideScores = input.sideResults ? Object.fromEntries(Object.entries(input.sideResults).map(([side, value]) => [side, { score: value.score, actionLevel: value.actionLevel }])) : undefined;
  return [
    "NIVASAFE_RULA_ACTION_SUGGESTIONS",
    'Return only valid JSON: {"actions":[{"titleFa":"","titleEn":"","descriptionFa":"","descriptionEn":"","priority":"HIGH","scoreReduction":1,"affectedParts":["trunk"],"bodySide":"RIGHT"}]}.',
    "For a BOTH-side assessment, return bodySide as LEFT, RIGHT, or BOTH for every action and keep the two sides independent; do not merge the sides into one score.",
    "Use " + language + " as the primary language and provide both Persian and English fields. Return at most " + MAX_RULA_ACTION_SUGGESTIONS + " distinct actions.",
    "Use the supplied posture and task data only. Do not invent angles, loads, equipment, diagnoses, or incidents. scoreReduction is an advisory estimate from 0 to 6 and must not be presented as a guaranteed result.",
    "Prioritize elimination, substitution, engineering controls, administrative controls, then PPE. A qualified HSE professional must review the suggestions.",
    "Body side: " + input.bodySide + "; current RULA score: " + input.score + "; action level: " + input.actionLevel,
    "Independent side scores: " + JSON.stringify(sideScores ?? {}),
    "Job: " + rulaText(input.jobTitle, "-") + "; Task: " + rulaText(input.taskDescription, "-") + "; Posture description: " + rulaText(input.postureDescription, "-"),
    "Inputs: " + JSON.stringify(input.inputs),
    "Posture analysis by side: " + JSON.stringify(posture),
  ].join("\n");
}
export function parseRulaActionSuggestions(answer: string, bodySide: "LEFT" | "RIGHT" | "BOTH"): RulaCorrectionSuggestion[] {
  const parsed = parseJsonObject(answer);
  const rows = parsed?.actions;
  if (!Array.isArray(rows)) return [];
  const seen = new Set<string>();
  return rows.slice(0, MAX_RULA_ACTION_SUGGESTIONS).flatMap((value, index) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const row = value as Record<string, unknown>;
    const titleFa = rulaText(row.titleFa, rulaText(row.title, ""));
    const titleEn = rulaText(row.titleEn, rulaText(row.title, titleFa));
    if (!titleFa && !titleEn) return [];
    const descriptionFa = rulaText(row.descriptionFa, rulaText(row.description, "بر اساس داده‌های ثبت‌شده، این اقدام را پس از بازبینی HSE بررسی کنید."));
    const descriptionEn = rulaText(row.descriptionEn, rulaText(row.description, "Review this action against the recorded data with a qualified HSE professional."));
    const affectedParts = Array.isArray(row.affectedParts) ? row.affectedParts.filter(isRulaPart).slice(0, 7) : [];
    const rawReduction = typeof row.scoreReduction === "number" ? row.scoreReduction : Number(row.scoreReduction);
    const scoreReduction = Number.isFinite(rawReduction) ? Math.max(0, Math.min(6, Math.trunc(rawReduction))) : 0;
    const candidateBodySide = typeof row.bodySide === "string" ? row.bodySide.trim().toUpperCase() : "";
    const resolvedBodySide = bodySide === "BOTH"
      ? (candidateBodySide === "LEFT" || candidateBodySide === "RIGHT" || candidateBodySide === "BOTH" ? candidateBodySide : "BOTH")
      : bodySide;
    const suggestion: RulaCorrectionSuggestion = {
      id: "rula-ai-" + resolvedBodySide.toLowerCase() + "-" + (index + 1),
      titleFa: titleFa || titleEn,
      titleEn: titleEn || titleFa,
      descriptionFa,
      descriptionEn,
      priority: priority(row.priority, "MEDIUM") as RulaActionPriority,
      scoreReduction,
      affectedParts,
      bodySide: resolvedBodySide,
      source: "AI",
    };
    const key = rulaSuggestionKey(suggestion);
    if (seen.has(key)) return [];
    seen.add(key);
    return [suggestion];
  });
}

function fallbackRulaActions(locale: "fa" | "en", bodySide: "LEFT" | "RIGHT" | "BOTH"): RulaCorrectionSuggestion[] {
  return [
    {
      id: `rula-fallback-neutral-${bodySide.toLowerCase()}`,
      titleFa: "بازبینی وضعیت خنثی بدن",
      titleEn: "Review neutral body posture",
      descriptionFa: "وضعیت بدن، زاویه‌های اصلی و تناسب محل کار را پیش از اجرای کار توسط متخصص HSE بازبینی کنید.",
      descriptionEn: "Have an HSE professional review the body posture, key angles, and workstation fit before work.",
      priority: "LOW",
      scoreReduction: 0,
      affectedParts: [],
      bodySide,
      source: "FALLBACK",
    },
    {
      id: `rula-fallback-variation-${bodySide.toLowerCase()}`,
      titleFa: "تنوع وظیفه و وقفه کوتاه",
      titleEn: "Add task variation and short breaks",
      descriptionFa: "برای کاهش بار استاتیک، تناوب وظیفه و وقفه‌های کوتاه متناسب با کار را برنامه‌ریزی کنید.",
      descriptionEn: "Plan task variation and short breaks appropriate to the work to reduce static loading.",
      priority: "LOW",
      scoreReduction: 0,
      affectedParts: ["neck", "trunk"],
      bodySide,
      source: "FALLBACK",
    },
    {
      id: `rula-fallback-verify-${bodySide.toLowerCase()}`,
      titleFa: "تأیید اقدام کنترلی در محل کار",
      titleEn: "Verify the control at the point of work",
      descriptionFa: "کنترل انتخاب‌شده را در محل کار اجرا و اثربخشی آن را با مشاهده و بازبینی مجدد تأیید کنید.",
      descriptionEn: "Apply the selected control at the point of work and verify its effectiveness with observation and reassessment.",
      priority: "LOW",
      scoreReduction: 0,
      affectedParts: [],
      bodySide,
      source: "FALLBACK",
    },
  ];
}

export function fallbackRulaActionSuggestions(input: { bodySide: "LEFT" | "RIGHT" | "BOTH"; analysis: RulaPostureAnalysis; inputs: RulaInput; locale: "fa" | "en"; limit?: number }) {
  const deterministic = buildRulaSuggestionsForAssessment(input.bodySide, input.analysis, input.inputs).map((suggestion) => ({ ...suggestion, source: "FALLBACK" as const }));
  const suggestions = deterministic.length ? deterministic : fallbackRulaActions(input.locale, input.bodySide);
  return suggestions.slice(0, boundedLimit(input.limit ?? MAX_RULA_ACTION_SUGGESTIONS, MAX_RULA_ACTION_SUGGESTIONS));
}

export function mergeRulaActionSuggestions(primary: RulaCorrectionSuggestion[], fallback: RulaCorrectionSuggestion[], existingActionTitles: string[] = [], limit = MAX_RULA_ACTION_SUGGESTIONS) {
  const registered = new Set(existingActionTitles.map(normalisedKey).filter(Boolean));
  const seen = new Set<string>();
  return [...primary, ...fallback].flatMap((suggestion) => {
    const titles = [suggestion.titleFa, suggestion.titleEn].map(normalisedKey).filter(Boolean);
    if (titles.some((title) => registered.has(title))) return [];
    const key = rulaSuggestionKey(suggestion);
    if (seen.has(key)) return [];
    seen.add(key);
    return [suggestion];
  }).slice(0, boundedLimit(limit, MAX_RULA_ACTION_SUGGESTIONS));
}
