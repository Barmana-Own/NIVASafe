import { calculateRpn, riskLevel, type RiskLevel, type RiskThresholds } from "@nivasafe/domain";

export type FmeaReportRisk = {
  id?: string;
  rowNumber: number;
  failureMode: string;
  effect: string;
  cause: string;
  severity: number;
  occurrence: number;
  detection: number;
  rpn: number;
  riskLevel: string;
  recommendation?: string | null;
};

export type FmeaRiskDistribution = Record<"CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "VERY_LOW", number>;

export const FMEA_REPORT_DETAIL_SUGGESTION_MIN = 5;
export const FMEA_REPORT_DETAIL_SUGGESTION_MAX = 8;

export type FmeaReportDetailSuggestion = {
  processStep: string;
  failureMode: string;
  effect: string;
  cause: string;
  preventiveControls: string;
  detectionControls: string;
  recommendation: string;
  severity: number;
  occurrence: number;
  detection: number;
};

const riskPriority: Record<string, number> = { CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, VERY_LOW: 1 };

function normaliseRiskLevel(value: string): keyof FmeaRiskDistribution {
  return value in riskPriority ? value as keyof FmeaRiskDistribution : "MEDIUM";
}

export function actionPriority(riskLevel: string): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" {
  if (riskLevel === "VERY_LOW") return "LOW";
  if (riskLevel === "CRITICAL" || riskLevel === "HIGH" || riskLevel === "MEDIUM") return riskLevel;
  return "MEDIUM";
}

export function summariseFmea(items: FmeaReportRisk[]) {
  const distribution: FmeaRiskDistribution = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, VERY_LOW: 0 };
  for (const item of items) {
    const level = normaliseRiskLevel(item.riskLevel);
    distribution[level] += 1;
  }
  return {
    totalFailureModes: items.length,
    highPriorityRisks: distribution.CRITICAL + distribution.HIGH,
    correctiveActionsNeeded: items.filter((item) => Boolean(item.recommendation?.trim()) || ["CRITICAL", "HIGH"].includes(actionPriority(item.riskLevel))).length,
    immediateActions: distribution.CRITICAL,
    distribution,
  };
}

export function topFailureModes<T extends FmeaReportRisk>(items: T[], limit = 5): T[] {
  const boundedLimit = Math.min(items.length, Math.max(1, Math.trunc(limit)));
  return [...items]
    .sort((left, right) => (riskPriority[normaliseRiskLevel(right.riskLevel)] ?? 0) - (riskPriority[normaliseRiskLevel(left.riskLevel)] ?? 0) || right.rpn - left.rpn || right.severity - left.severity || right.occurrence - left.occurrence || left.rowNumber - right.rowNumber)
    .slice(0, boundedLimit);
}

function boundedDetailText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, 1_200) : fallback;
}

function detailSuggestionKey(row: Pick<FmeaReportDetailSuggestion, "processStep" | "failureMode" | "effect" | "cause">) {
  return [row.processStep, row.failureMode, row.effect, row.cause]
    .map((value) => boundedDetailText(value).toLocaleLowerCase())
    .join("\u0000");
}

function detailScore(value: unknown, fallback: number) {
  const score = typeof value === "number" ? value : Number(value);
  return Number.isInteger(score) && score >= 1 && score <= 10 ? score : fallback;
}

function parseJsonObject(answer: string): Record<string, unknown> | null {
  const candidate = answer.match(/\{[\s\S]*\}/)?.[0];
  if (!candidate) return null;
  try {
    const parsed = JSON.parse(candidate) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export function parseFmeaReportDetailSuggestions(answer: string): FmeaReportDetailSuggestion[] {
  const parsed = parseJsonObject(answer);
  if (!parsed || !Array.isArray(parsed.rows)) return [];
  return parsed.rows.slice(0, FMEA_REPORT_DETAIL_SUGGESTION_MAX).flatMap((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const row = value as Record<string, unknown>;
    const processStep = boundedDetailText(row.processStep);
    const failureMode = boundedDetailText(row.failureMode);
    const effect = boundedDetailText(row.effect);
    const cause = boundedDetailText(row.cause);
    if (!processStep || !failureMode || !effect || !cause) return [];
    return [{
      processStep,
      failureMode,
      effect,
      cause,
      preventiveControls: boundedDetailText(row.preventiveControls),
      detectionControls: boundedDetailText(row.detectionControls),
      recommendation: boundedDetailText(row.recommendation),
      severity: detailScore(row.severity, 5),
      occurrence: detailScore(row.occurrence, 3),
      detection: detailScore(row.detection, 4),
    }];
  });
}

export function buildFmeaReportDetailSuggestionsPrompt(input: {
  projectName?: string | null;
  processName: string;
  department?: string | null;
  activityDescription?: string | null;
  specialConditions?: string | null;
  existingRows: Array<Pick<FmeaReportDetailSuggestion, "processStep" | "failureMode" | "effect" | "cause">>;
  locale: "fa" | "en";
}) {
  const language = input.locale === "en" ? "English" : "Persian";
  const rows = input.existingRows.slice(0, 20).map((row) => ({
    processStep: boundedDetailText(row.processStep, "-"),
    failureMode: boundedDetailText(row.failureMode, "-"),
    effect: boundedDetailText(row.effect, "-"),
    cause: boundedDetailText(row.cause, "-"),
  }));
  return [
    "NIVASAFE_FMEA_REPORT_DETAIL_SUGGESTIONS",
    'Return only valid JSON: {"rows":[{"processStep":"","failureMode":"","effect":"","cause":"","preventiveControls":"","detectionControls":"","recommendation":"","severity":1,"occurrence":1,"detection":1}]}.' ,
    `Use ${language}. Return ${FMEA_REPORT_DETAIL_SUGGESTION_MIN} to ${FMEA_REPORT_DETAIL_SUGGESTION_MAX} distinct, concise FMEA risk-row drafts. Each text field must be no more than 1,200 characters. Do not add markdown or explanations.`,
    "Use the project and process context to propose plausible hazards, effects, causes, controls, and corrective recommendations. Do not claim exact measurements or organization-specific facts that are not supplied.",
    "Scores are advisory integers from 1 to 10 and must be reviewed by a qualified HSE assessor. These drafts must not be treated as approved results.",
    "These rows will be inserted automatically as editable defaults in the assessment table. Scores are advisory and must be reviewed by a qualified HSE assessor after insertion; do not claim that an unverified score is approved.",
    `Project: ${boundedDetailText(input.projectName, "-") || "-"}`,
    `Process / job: ${boundedDetailText(input.processName, "-") || "-"}`,
    `Department / unit: ${boundedDetailText(input.department, "-") || "-"}`,
    `Activity description: ${boundedDetailText(input.activityDescription, "-") || "-"}`,
    `Special work conditions: ${boundedDetailText(input.specialConditions, "-") || "-"}`,
    `Existing FMEA rows for context only: ${JSON.stringify(rows)}`,
  ].join("\n");
}

export function fallbackFmeaReportDetailSuggestions(input: { processName: string; projectName?: string | null; locale: "fa" | "en"; limit?: number }): FmeaReportDetailSuggestion[] {
  const processStep = boundedDetailText(input.processName, "-") || boundedDetailText(input.projectName, "-") || "-";
  if (input.locale === "en") {
    const suggestions = [
      { processStep, failureMode: "Incomplete execution of the work step", effect: "Quality deviation or unsafe exposure", cause: "Work instruction is unclear or not followed", preventiveControls: "Approved work instruction and pre-job briefing", detectionControls: "Supervisor observation and checklist review", recommendation: "Review the work instruction and confirm the critical steps before starting", severity: 6, occurrence: 4, detection: 5 },
      { processStep, failureMode: "Unexpected contact with moving equipment", effect: "Injury or equipment damage", cause: "Guarding or exclusion zone is inadequate", preventiveControls: "Guarding, isolation and marked exclusion zone", detectionControls: "Pre-use inspection and supervisor verification", recommendation: "Improve guarding and verify isolation before the task", severity: 8, occurrence: 3, detection: 5 },
      { processStep, failureMode: "Dropped or displaced material", effect: "Impact injury, damage or interruption", cause: "Load securing or handling method is unsuitable", preventiveControls: "Approved handling method and load inspection", detectionControls: "Lift/handling checklist and spotter confirmation", recommendation: "Use a verified securing method and inspect the load before movement", severity: 8, occurrence: 3, detection: 4 },
      { processStep, failureMode: "Exposure to energy, substance or harmful condition", effect: "Illness, burn or other occupational injury", cause: "Hazard identification and personal protection are incomplete", preventiveControls: "Permit controls, ventilation and suitable PPE", detectionControls: "Atmosphere or condition check before and during work", recommendation: "Confirm the hazard controls and PPE at the point of work", severity: 7, occurrence: 3, detection: 5 },
      { processStep, failureMode: "Delayed response to an abnormal condition", effect: "Escalation of the hazard and extended downtime", cause: "Alarm, communication or emergency response is not clear", preventiveControls: "Emergency plan, alarm test and assigned responsibilities", detectionControls: "Drill, alarm test and incident follow-up", recommendation: "Test the alarm and brief the response roles before work", severity: 7, occurrence: 2, detection: 6 },
      { processStep, failureMode: "Incorrect tool or equipment selection", effect: "Task failure, damage or unexpected exposure", cause: "The required tool and pre-use criteria are not defined", preventiveControls: "Approved equipment list and pre-use inspection", detectionControls: "Supervisor check before the task starts", recommendation: "Define the approved tool and verify its condition before use", severity: 6, occurrence: 3, detection: 5 },
      { processStep, failureMode: "Manual handling beyond the safe limit", effect: "Strain injury or dropped material", cause: "Load weight and handling method are not assessed", preventiveControls: "Handling limit, mechanical aid and team-lift rule", detectionControls: "Task observation and review of handling deviations", recommendation: "Assess the load and use a mechanical aid or team lift when required", severity: 7, occurrence: 4, detection: 5 },
      { processStep, failureMode: "Poor housekeeping around the work area", effect: "Slip, trip or delayed emergency access", cause: "Waste, cables or materials are left in circulation paths", preventiveControls: "Housekeeping standard and designated storage points", detectionControls: "End-of-task inspection and supervisor walk-through", recommendation: "Clear circulation paths and verify housekeeping at task completion", severity: 6, occurrence: 4, detection: 4 },
    ];
    return suggestions.slice(0, Math.max(FMEA_REPORT_DETAIL_SUGGESTION_MIN, Math.min(FMEA_REPORT_DETAIL_SUGGESTION_MAX, input.limit ?? FMEA_REPORT_DETAIL_SUGGESTION_MIN)));
  }
  const suggestions = [
    { processStep, failureMode: "اجرای ناقص مرحله کاری", effect: "انحراف کیفیت یا ایجاد مواجهه ناایمن", cause: "دستورالعمل کار روشن نیست یا به‌طور کامل اجرا نمی‌شود", preventiveControls: "دستورالعمل مصوب و جلسه توجیه پیش از کار", detectionControls: "مشاهده سرپرست و بررسی چک‌لیست", recommendation: "دستورالعمل را بازبینی و مراحل بحرانی را پیش از شروع تأیید کنید", severity: 6, occurrence: 4, detection: 5 },
    { processStep, failureMode: "تماس ناخواسته با تجهیز متحرک", effect: "آسیب به فرد یا خسارت به تجهیز", cause: "محافظ‌گذاری یا محدوده ممنوعه کافی نیست", preventiveControls: "محافظ‌گذاری، ایزولاسیون و علامت‌گذاری محدوده", detectionControls: "بازرسی پیش از استفاده و تأیید سرپرست", recommendation: "محافظ‌گذاری را تکمیل و ایزولاسیون را پیش از کار تأیید کنید", severity: 8, occurrence: 3, detection: 5 },
    { processStep, failureMode: "سقوط یا جابه‌جایی ناخواسته مواد", effect: "آسیب ناشی از ضربه، خسارت یا توقف کار", cause: "روش مهار یا جابه‌جایی بار مناسب نیست", preventiveControls: "روش مصوب جابه‌جایی و بازرسی بار", detectionControls: "چک‌لیست جابه‌جایی و تأیید فرد راهنما", recommendation: "روش مهار تأییدشده استفاده و بار را پیش از جابه‌جایی بازرسی کنید", severity: 8, occurrence: 3, detection: 4 },
    { processStep, failureMode: "مواجهه با انرژی، ماده یا شرایط زیان‌آور", effect: "بیماری، سوختگی یا آسیب شغلی", cause: "شناسایی خطر و حفاظت فردی کامل نیست", preventiveControls: "مجوز کار، تهویه و تجهیزات حفاظت فردی مناسب", detectionControls: "بررسی شرایط محیط پیش و حین کار", recommendation: "کنترل‌های خطر و تجهیزات حفاظت فردی را در محل کار تأیید کنید", severity: 7, occurrence: 3, detection: 5 },
    { processStep, failureMode: "تأخیر در واکنش به شرایط غیرعادی", effect: "تشدید خطر و افزایش زمان توقف", cause: "آژیر، ارتباطات یا واکنش اضطراری روشن نیست", preventiveControls: "برنامه واکنش اضطراری، آزمون آژیر و تعیین مسئولیت", detectionControls: "مانور، آزمون آژیر و پیگیری رویداد", recommendation: "پیش از کار آژیر را آزمون و نقش‌های واکنش را توجیه کنید", severity: 7, occurrence: 2, detection: 6 },
    { processStep, failureMode: "انتخاب نادرست ابزار یا تجهیز", effect: "شکست مرحله کاری، خسارت یا مواجهه ناخواسته", cause: "ابزار مجاز و معیارهای بازرسی پیش از کار مشخص نیست", preventiveControls: "فهرست تجهیزات مجاز و بازرسی پیش از استفاده", detectionControls: "بررسی سرپرست پیش از شروع کار", recommendation: "ابزار مجاز را مشخص و سلامت آن را پیش از استفاده تأیید کنید", severity: 6, occurrence: 3, detection: 5 },
    { processStep, failureMode: "جابجایی دستی بیش از حد ایمن", effect: "آسیب کششی یا سقوط بار", cause: "وزن بار و روش جابجایی ارزیابی نشده است", preventiveControls: "حد مجاز جابجایی، وسیله کمکی و الزام جابجایی دونفره", detectionControls: "مشاهده کار و بررسی انحرافات جابجایی", recommendation: "بار را ارزیابی و در صورت نیاز از وسیله کمکی یا جابجایی دونفره استفاده کنید", severity: 7, occurrence: 4, detection: 5 },
    { processStep, failureMode: "نظم نامناسب اطراف محل کار", effect: "لغزش، زمین‌خوردن یا تأخیر در دسترسی اضطراری", cause: "ضایعات، کابل یا مواد در مسیر تردد رها شده است", preventiveControls: "استاندارد نظافت و محل‌های مشخص نگهداری", detectionControls: "بازرسی پایان کار و بازدید سرپرست", recommendation: "مسیرهای تردد را پاک‌سازی و نظافت پایان کار را تأیید کنید", severity: 6, occurrence: 4, detection: 4 },
  ];
  return suggestions.slice(0, Math.max(FMEA_REPORT_DETAIL_SUGGESTION_MIN, Math.min(FMEA_REPORT_DETAIL_SUGGESTION_MAX, input.limit ?? FMEA_REPORT_DETAIL_SUGGESTION_MIN)));
}

export function ensureMinimumFmeaReportDetailSuggestions(primary: FmeaReportDetailSuggestion[], fallback: FmeaReportDetailSuggestion[]) {
  const result: FmeaReportDetailSuggestion[] = [];
  const seen = new Set<string>();
  for (const row of [...primary, ...fallback]) {
    const key = detailSuggestionKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(row);
    if (result.length >= FMEA_REPORT_DETAIL_SUGGESTION_MAX) break;
  }
  return result.slice(0, Math.max(FMEA_REPORT_DETAIL_SUGGESTION_MIN, Math.min(FMEA_REPORT_DETAIL_SUGGESTION_MAX, result.length)));
}

type FmeaReportDetailSeedRow = {
  assessmentId: string;
  rowNumber: number;
  processStep: string;
  failureMode: string;
  effect: string;
  cause: string;
  preventiveControls: string | null;
  detectionControls: string | null;
  severity: number;
  occurrence: number;
  detection: number;
  rpn: number;
  riskLevel: RiskLevel;
  recommendation: string | null;
};

export function buildFmeaReportDetailSeedRows(input: {
  assessmentId: string;
  suggestions: FmeaReportDetailSuggestion[];
  fallbackSuggestions?: FmeaReportDetailSuggestion[];
  existingRows?: Array<Pick<FmeaReportDetailSuggestion, "processStep" | "failureMode" | "effect" | "cause"> & { rowNumber?: number }>;
  additionalCount?: number;
  targetCount?: number;
  thresholds?: RiskThresholds;
}): FmeaReportDetailSeedRow[] {
  const existingRows = input.existingRows ?? [];
  const targetCount = Math.max(FMEA_REPORT_DETAIL_SUGGESTION_MIN, Math.min(FMEA_REPORT_DETAIL_SUGGESTION_MAX, input.targetCount ?? FMEA_REPORT_DETAIL_SUGGESTION_MIN));
  const seedCount = input.additionalCount === undefined ? Math.max(0, targetCount - existingRows.length) : Math.max(0, Math.min(FMEA_REPORT_DETAIL_SUGGESTION_MAX, input.additionalCount));
  if (!seedCount) return [];
  const seen = new Set(existingRows.map((row) => detailSuggestionKey(row)));
  const nextRowNumber = existingRows.reduce((highest, row) => Math.max(highest, Number(row.rowNumber) || 0), 0) + 1;
  const candidates = [...input.suggestions, ...(input.fallbackSuggestions ?? [])];
  const seedRows: FmeaReportDetailSeedRow[] = [];
  for (const suggestion of candidates) {
    if (seedRows.length >= seedCount) break;
    const identity = {
      processStep: boundedDetailText(suggestion.processStep, "-"),
      failureMode: boundedDetailText(suggestion.failureMode, "-"),
      effect: boundedDetailText(suggestion.effect, "-"),
      cause: boundedDetailText(suggestion.cause, "-"),
    };
    const key = detailSuggestionKey(identity);
    if (seen.has(key)) continue;
    seen.add(key);
    const severity = detailScore(suggestion.severity, 5);
    const occurrence = detailScore(suggestion.occurrence, 3);
    const detection = detailScore(suggestion.detection, 4);
    const rpn = calculateRpn(severity, occurrence, detection);
    seedRows.push({
      assessmentId: input.assessmentId,
      rowNumber: nextRowNumber + seedRows.length,
      ...identity,
      preventiveControls: boundedDetailText(suggestion.preventiveControls) || null,
      detectionControls: boundedDetailText(suggestion.detectionControls) || null,
      severity,
      occurrence,
      detection,
      rpn,
      riskLevel: riskLevel(rpn, input.thresholds),
      recommendation: boundedDetailText(suggestion.recommendation) || null,
    });
  }
  return seedRows;
}
