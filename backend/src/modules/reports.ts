import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { FastifyInstance, FastifyReply } from "fastify";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import PDFDocument from "pdfkit";
import { z } from "zod";
import { calculateRpn, DEFAULT_THRESHOLDS, riskLevel, type RiskThresholds } from "@nivasafe/domain";
import { authenticate } from "../auth-guard.js";
import { recordAIUsage } from "../ai-usage.js";
import { getAvailableAssessmentAIProvider } from "../ai-provider.js";
import { audit, envelope, parse, prisma, requireOrg, requirePermission } from "../core.js";
import { actionPriority, buildFmeaReportDetailSeedRows, buildFmeaReportDetailSuggestionsPrompt, ensureMinimumFmeaReportDetailSuggestions, fallbackFmeaReportDetailSuggestions, FMEA_REPORT_DETAIL_SUGGESTION_MAX, FMEA_REPORT_DETAIL_SUGGESTION_MIN, parseFmeaReportDetailSuggestions, summariseFmea, topFailureModes, type FmeaReportDetailSuggestion, type FmeaReportRisk } from "../fmea-report.js";
import { buildRulaFactors, buildRulaSideResults, parseRulaInputs, parseRulaPostureAnalysis, predictedRulaScore, rulaImpactSchema, type RulaReportFactor, type RulaSideResults } from "../rula-report.js";
import { isRulaPostureAnalysisReviewed, isRulaPostureResultReviewed, rulaPostureAnalysisSchema, type RulaPostureAnalysis, type RulaPosturePart, type RulaPostureResult } from "../rula-posture.js";
import { buildFmeaActionSuggestionsPrompt, buildRulaActionSuggestionsPrompt, fallbackFmeaActionSuggestions, fallbackRulaActionSuggestions, mergeFmeaActionSuggestions, mergeRulaActionSuggestions, parseFmeaActionSuggestions, parseRulaActionSuggestions, type FmeaActionCandidate } from "../assessment-action-suggestions.js";

const paramsSchema = z.object({ type: z.enum(["fmea", "rula"]), id: z.string().uuid(), format: z.enum(["pdf", "xlsx", "doc", "docx"]) });
const reportQuerySchema = z.object({ view: z.enum(["final-table"]).optional(), locale: z.enum(["fa", "en"]).default("fa") });

type ReportLocale = "fa" | "en";

const fmeaExportLabels = {
  en: {
    reportTitle: "NIVASafe — FMEA risk assessment",
    finalTableTitle: "NIVASafe — FMEA final assessment table",
    finalTableHeading: "Final FMEA assessment table",
    header: "Assessment header",
    process: "Process / job name",
    company: "Company",
    date: "Assessment date",
    method: "Assessment method",
    team: "Evaluation team",
    teamMembers: "member(s)",
    code: "Assessment code",
    project: "Project",
    status: "Assessment status",
    version: "Version",
    processInformation: "Process information",
    department: "Department / unit",
    activity: "Activity description",
    equipment: "Equipment / machinery",
    materials: "Materials",
    existingControls: "Existing controls",
    specialConditions: "Special conditions",
    summary: "Executive risk summary",
    totalFailureModes: "Total failure modes",
    highPriorityRisks: "High-priority risks",
    correctiveActionsNeeded: "Corrective actions needed",
    immediateActions: "Immediate actions",
    registeredActions: "Registered corrective actions",
    completedActions: "Completed corrective actions",
    activeActions: "In-progress corrective actions",
    remainingActions: "Remaining corrective actions",
    progress: "Average corrective-action progress",
    riskDistribution: "Risk-level distribution",
    count: "Count",
    share: "Share",
    topFailureModes: "Top failure modes",
    proposedActions: "Proposed corrective actions / controls",
    actionRegister: "Corrective-action register",
    fullDetails: "Full FMEA details",
    assessmentDetails: "Assessment details",
    field: "Field",
    value: "Value",
    row: "Row",
    processActivity: "Process / activity",
    failureMode: "Failure mode",
    effect: "Failure effect",
    cause: "Failure cause",
    currentControls: "Current controls",
    severity: "Severity (S)",
    occurrence: "Occurrence (O)",
    detection: "Detection (D)",
    actionPriority: "Action priority (AP)",
    rpn: "RPN",
    riskLevel: "Risk level",
    recommendedAction: "Recommended corrective action",
    relatedRisk: "Related risk",
    title: "Title",
    description: "Description",
    priority: "Priority",
    actionStatus: "Status",
    assignee: "Assignee",
    actionProgress: "Progress",
    dueDate: "Due date",
    noRows: "No failure modes registered",
    noRecommendations: "No unregistered recommendations",
    noActions: "No corrective action registered",
    registered: "Registered",
    unregistered: "Unregistered recommendation",
    selection: "Selection",
    selected: "Selected",
    notSelected: "Not selected",
    footer: "NIVASafe - FMEA report",
  },
  fa: {
    reportTitle: "NIVASafe — ارزیابی ریسک FMEA",
    finalTableTitle: "NIVASafe — جدول نهایی ارزیابی FMEA",
    finalTableHeading: "جدول نهایی ارزیابی FMEA",
    header: "مشخصات ارزیابی",
    process: "نام فرآیند / شغل",
    company: "شرکت",
    date: "تاریخ ارزیابی",
    method: "روش ارزیابی",
    team: "تیم ارزیابی",
    teamMembers: "عضو",
    code: "کد ارزیابی",
    project: "پروژه",
    status: "وضعیت ارزیابی",
    version: "نسخه",
    processInformation: "اطلاعات فرآیند",
    department: "واحد / بخش",
    activity: "شرح فعالیت",
    equipment: "تجهیزات / ماشین‌آلات",
    materials: "مواد و ملزومات",
    existingControls: "کنترل‌های موجود",
    specialConditions: "شرایط خاص",
    summary: "خلاصه مدیریتی ریسک",
    totalFailureModes: "کل حالات خرابی",
    highPriorityRisks: "ریسک‌های با اولویت بالا",
    correctiveActionsNeeded: "اقدامات اصلاحی موردنیاز",
    immediateActions: "اقدامات فوری",
    registeredActions: "اقدامات اصلاحی ثبت‌شده",
    completedActions: "اقدامات تکمیل‌شده",
    activeActions: "اقدامات در حال انجام",
    remainingActions: "اقدامات باقی‌مانده",
    progress: "میانگین پیشرفت اقدامات اصلاحی",
    riskDistribution: "توزیع سطح ریسک",
    count: "تعداد",
    share: "سهم",
    topFailureModes: "مهم‌ترین حالات خرابی",
    proposedActions: "اقدامات / کنترل‌های اصلاحی پیشنهادی",
    actionRegister: "فهرست اقدامات اصلاحی",
    fullDetails: "جزئیات کامل FMEA",
    assessmentDetails: "جزئیات ارزیابی",
    field: "عنوان",
    value: "مقدار",
    row: "ردیف",
    processActivity: "فرآیند / فعالیت",
    failureMode: "حالت خرابی",
    effect: "اثر خرابی",
    cause: "علت خرابی",
    currentControls: "کنترل‌های موجود",
    severity: "شدت (S)",
    occurrence: "وقوع (O)",
    detection: "کشف (D)",
    actionPriority: "اولویت اقدام (AP)",
    rpn: "RPN",
    riskLevel: "سطح ریسک",
    recommendedAction: "اقدام اصلاحی پیشنهادی",
    relatedRisk: "ریسک مرتبط",
    title: "عنوان",
    description: "شرح",
    priority: "اولویت",
    actionStatus: "وضعیت",
    assignee: "مسئول",
    actionProgress: "پیشرفت",
    dueDate: "موعد انجام",
    noRows: "هیچ حالت خرابی ثبت نشده است",
    noRecommendations: "پیشنهاد ثبت‌نشده‌ای وجود ندارد",
    noActions: "اقدام اصلاحی ثبت نشده است",
    registered: "ثبت‌شده",
    unregistered: "پیشنهاد ثبت‌نشده",
    selection: "انتخاب",
    selected: "انتخاب‌شده",
    notSelected: "انتخاب‌نشده",
    footer: "NIVASafe - گزارش FMEA",
  },
} as const satisfies Record<ReportLocale, Record<string, string>>;

type FmeaExportLabelSet = { [Key in keyof typeof fmeaExportLabels.en]: string };

function fmeaLabels(locale: ReportLocale): FmeaExportLabelSet {
  return fmeaExportLabels[locale];
}

const rulaExportLabels = {
  en: {
    reportTitle: "NIVASafe — RULA assessment",
    header: "Assessment header",
    assessmentDetails: "Assessment details",
    field: "Field",
    value: "Value",
    title: "Title",
    project: "Project",
    code: "Assessment code",
    date: "Assessment date",
    status: "Status",
    method: "Assessment method",
    version: "Version",
    process: "Process / job name",
    processInformation: "Process information",
    jobTitle: "Job / process",
    activity: "Activity / task",
    duration: "Duration per occurrence",
    repetitions: "Repetitions per shift",
    postureHold: "Posture hold duration",
    loadWeight: "Load weight",
    postureDescription: "Posture description",
    bodySide: "Body side",
    right: "RIGHT",
    left: "LEFT",
    both: "BOTH",
    score: "Score",
    actionLevel: "Action level",
    explanation: "Explanation",
    postureReview: "Posture review",
    completed: "Completed",
    manualReview: "Manual review required",
    summary: "Assessment summary",
    factorDistribution: "Factor score distribution",
    count: "Count",
    share: "Share",
    factorScore: "Total factor score",
    highFactors: "High-impact factors",
    mediumFactors: "Medium-impact factors",
    lowFactors: "Low-impact factors",
    correctionProgress: "Corrective-action progress",
    selectedRecommendations: "Selected recommendations",
    remainingRecommendations: "Remaining recommendations",
    manualActions: "Manual corrective actions",
    estimatedScoreReduction: "Estimated score reduction",
    additionalDetails: "Additional result details",
    predictedEffect: "Predicted effect",
    currentScore: "Current score",
    currentActionLevel: "Current action level",
    predictedScore: "Predicted score (estimate)",
    predictedActionLevel: "Predicted action level",
    predictionNote: "Prediction note",
    mainFactors: "Main factors",
    factor: "Factor",
    angle: "Angle",
    detected: "Detected",
    contribution: "Contribution",
    effect: "Effect",
    source: "Source",
    assessmentData: "RULA assessment data",
    row: "Row",
    group: "Group",
    bodyPart: "Body part",
    detectedAngle: "Detected angle",
    detectedStatus: "Detected status",
    suggestedScore: "Suggested score",
    scoreShare: "Score share",
    selectedActions: "Selected corrective actions",
    proposedActions: "Proposed corrective actions",
    relatedFactors: "Related factors",
    suggestedAction: "Suggested action",
    description: "Description",
    priority: "Priority",
    estimatedReduction: "Estimated reduction",
    selection: "Selection",
    selected: "Selected",
    notSelected: "Not selected",
    action: "Action",
    generalCorrectiveActions: "General corrective actions",
    noSelectedActions: "No selected corrective actions",
    footer: "NIVASafe - RULA report",
    noData: "No data",
  },
  fa: {
    reportTitle: "NIVASafe — ارزیابی ارگونومی RULA",
    header: "سربرگ ارزیابی",
    assessmentDetails: "جزئیات ارزیابی",
    field: "عنوان",
    value: "مقدار",
    title: "عنوان ارزیابی",
    project: "پروژه",
    code: "کد ارزیابی",
    date: "تاریخ انجام ارزیابی",
    status: "وضعیت ارزیابی",
    method: "روش ارزیابی",
    version: "نسخه",
    process: "نام فرآیند / شغل",
    processInformation: "اطلاعات فرآیند",
    jobTitle: "شغل / فرآیند",
    activity: "فعالیت / وظیفه",
    duration: "مدت هر بار انجام",
    repetitions: "تعداد تکرار در شیفت",
    postureHold: "مدت حفظ پوسچر",
    loadWeight: "وزن بار",
    postureDescription: "شرح پوسچر",
    bodySide: "سمت بدن",
    right: "سمت راست",
    left: "سمت چپ",
    both: "هر دو سمت",
    score: "امتیاز",
    actionLevel: "سطح اقدام",
    explanation: "توضیح",
    postureReview: "بازبینی پوسچر",
    completed: "تکمیل‌شده",
    manualReview: "نیازمند بازبینی دستی",
    summary: "خلاصه ارزیابی RULA",
    factorDistribution: "توزیع سهم عوامل RULA",
    count: "تعداد",
    share: "سهم",
    factorScore: "مجموع امتیاز عوامل",
    highFactors: "عوامل با اثر زیاد",
    mediumFactors: "عوامل با اثر متوسط",
    lowFactors: "عوامل با اثر کم",
    correctionProgress: "پیشرفت اقدامات اصلاحی",
    selectedRecommendations: "پیشنهادهای انتخاب‌شده",
    remainingRecommendations: "پیشنهادهای باقی‌مانده",
    manualActions: "اقدامات اصلاحی دستی",
    estimatedScoreReduction: "کاهش تخمینی امتیاز",
    additionalDetails: "جزئیات تکمیلی نتیجه",
    predictedEffect: "اثر پیش‌بینی‌شده",
    currentScore: "امتیاز فعلی",
    currentActionLevel: "سطح اقدام فعلی",
    predictedScore: "امتیاز پیش‌بینی‌شده (تخمینی)",
    predictedActionLevel: "سطح اقدام پیش‌بینی‌شده",
    predictionNote: "یادداشت پیش‌بینی",
    mainFactors: "عوامل اصلی مؤثر",
    factor: "عامل اصلی",
    angle: "زاویه",
    detected: "تشخیص داده‌شده",
    contribution: "سهم امتیاز",
    effect: "اثر",
    source: "منبع",
    assessmentData: "جدول داده‌های ارزیابی RULA",
    row: "ردیف",
    group: "گروه",
    bodyPart: "عضو بدن",
    detectedAngle: "زاویه شناسایی‌شده",
    detectedStatus: "وضعیت تشخیص",
    suggestedScore: "امتیاز پیشنهادی",
    scoreShare: "سهم امتیاز",
    selectedActions: "اقدامات اصلاحی انتخاب‌شده",
    proposedActions: "اقدامات اصلاحی پیشنهادی",
    relatedFactors: "عوامل مرتبط",
    suggestedAction: "اقدام پیشنهادی",
    description: "شرح",
    priority: "اولویت",
    estimatedReduction: "کاهش تخمینی",
    selection: "انتخاب",
    selected: "انتخاب‌شده",
    notSelected: "انتخاب‌نشده",
    action: "اقدام",
    generalCorrectiveActions: "اقدامات اصلاحی عمومی",
    noSelectedActions: "اقدام اصلاحی انتخاب نشده است",
    footer: "NIVASafe - گزارش RULA",
    noData: "اطلاعاتی ثبت نشده است",
  },
} as const satisfies Record<ReportLocale, Record<string, string>>;

type RulaExportLabelSet = { [Key in keyof typeof rulaExportLabels.en]: string };

function rulaLabels(locale: ReportLocale): RulaExportLabelSet {
  return rulaExportLabels[locale];
}

function localizedRulaBodySide(value: string | undefined, locale: ReportLocale) {
  if (locale === "en") return value ?? "-";
  return ({ RIGHT: rulaExportLabels.fa.right, LEFT: rulaExportLabels.fa.left, BOTH: rulaExportLabels.fa.both } as Record<string, string>)[value ?? ""] ?? value ?? "-";
}

function localizedRulaPriority(value: string | undefined, locale: ReportLocale) {
  if (!value || locale === "en") return value ?? "-";
  return ({ CRITICAL: "بحرانی", HIGH: "زیاد", MEDIUM: "متوسط", LOW: "کم" } as Record<string, string>)[value] ?? value;
}

function localizedRulaStatus(value: string | undefined, locale: ReportLocale) {
  if (!value || locale === "en") return value ?? "-";
  return ({ DRAFT: "پیش‌نویس", IN_PROGRESS: "در حال انجام", IN_REVIEW: "در حال بازبینی", COMPLETED: "تکمیل‌شده", APPROVED: "تأییدشده", OPEN: "باز", ASSIGNED: "تخصیص‌یافته", WAITING_FOR_REVIEW: "در انتظار بازبینی", REJECTED: "ردشده", CANCELLED: "لغوشده" } as Record<string, string>)[value] ?? value;
}

function localizedRulaSelection(selected: boolean, locale: ReportLocale) {
  const labels = rulaLabels(locale);
  return selected ? labels.selected : labels.notSelected;
}

function fmeaProcessTitle(data: Pick<FmeaReportData, "title" | "jobCatalog">, locale: ReportLocale) {
  return (locale === "fa" ? data.jobCatalog?.titleFa : data.jobCatalog?.titleEn) || data.title;
}

function fmeaCompanyName(data: Pick<FmeaReportData, "organization">, locale: ReportLocale) {
  return (locale === "fa" ? data.organization.nameFa : data.organization.nameEn) || data.organization.nameFa || data.organization.nameEn || "-";
}

function reportDate(value: Date | null | undefined, locale: ReportLocale) {
  if (!value) return "-";
  if (locale === "en") return value.toISOString().slice(0, 10);
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
}

function localizedFmeaRiskLevel(value: string, locale: ReportLocale) {
  if (locale === "en") return value;
  return ({ CRITICAL: "بحرانی", HIGH: "زیاد", MEDIUM: "متوسط", LOW: "کم", VERY_LOW: "خیلی کم" } as Record<string, string>)[value] ?? value;
}

function localizedFmeaStatus(value: string, locale: ReportLocale) {
  if (locale === "en") return value;
  return ({ DRAFT: "پیش‌نویس", IN_REVIEW: "در حال بازبینی", COMPLETED: "تکمیل‌شده", APPROVED: "تأییدشده", OPEN: "باز", ASSIGNED: "تخصیص‌یافته", IN_PROGRESS: "در حال انجام", WAITING_FOR_REVIEW: "در انتظار بازبینی", REJECTED: "ردشده", OVERDUE: "سررسیدگذشته", CANCELLED: "لغوشده" } as Record<string, string>)[value] ?? value;
}

function localizedFmeaActionPriority(value: string, locale: ReportLocale) {
  if (locale === "en") return value;
  return ({ CRITICAL: "بحرانی", HIGH: "زیاد", MEDIUM: "متوسط", LOW: "کم" } as Record<string, string>)[value] ?? value;
}

const pdfRtlCharacter = /[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufeff]/u;
const pdfLtrCharacter = /[A-Za-z\u00c0-\u024f\u1e00-\u1eff0-9]/u;
const pdfSectionHeadings = new Set([
  "REPORT HEADER",
  "PROCESS INFORMATION",
  "EXECUTIVE RISK SUMMARY",
  "RISK-LEVEL DISTRIBUTION",
  "TOP FAILURE MODES",
  "CORRECTIVE ACTIONS / CONTROLS",
  "CORRECTIVE-ACTION REGISTER",
  "FINAL FMEA ASSESSMENT TABLE",
  "FULL FMEA DETAILS",
  "سربرگ گزارش",
  "اطلاعات فرآیند",
  "خلاصه مدیریتی ریسک",
  "توزیع سطح ریسک",
  "مهم‌ترین حالات خرابی",
  "اقدامات / کنترل‌های اصلاحی پیشنهادی",
  "فهرست اقدامات اصلاحی",
  "جدول نهایی ارزیابی FMEA",
  "جزئیات کامل FMEA",
  "ASSESSMENT DETAILS",
  "RULA ASSESSMENT SUMMARY",
  "PREDICTED EFFECT",
  "MAIN FACTORS",
  "RULA ASSESSMENT DATA",
  "PROPOSED CORRECTIVE ACTIONS",
  "SELECTED CORRECTIVE ACTIONS",
  "جزئیات ارزیابی",
  "خلاصه ارزیابی RULA",
  "اثر پیش‌بینی‌شده",
  "عوامل اصلی مؤثر",
  "جدول داده‌های ارزیابی RULA",
  "اقدامات اصلاحی پیشنهادی",
  "اقدامات اصلاحی انتخاب‌شده",
]);

type PdfFontPaths = { regular: string; bold: string };

let cachedPdfFontPaths: PdfFontPaths | null | undefined;

function resolvePdfFontPaths(): PdfFontPaths | null {
  if (cachedPdfFontPaths !== undefined) return cachedPdfFontPaths;

  const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
  const regularCandidates = [
    process.env.NIVASAFE_PDF_FONT_PATH,
    path.resolve(moduleDirectory, "../../assets/fonts/DejaVuSans.ttf"),
    "C:\\Windows\\Fonts\\tahoma.ttf",
    "C:\\Windows\\Fonts\\arial.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf",
  ].filter((candidate): candidate is string => Boolean(candidate?.trim()));
  const regular = regularCandidates.find((candidate) => fs.existsSync(candidate));
  if (!regular) {
    cachedPdfFontPaths = null;
    return cachedPdfFontPaths;
  }

  const boldCandidates = [
    process.env.NIVASAFE_PDF_FONT_BOLD_PATH,
    path.resolve(moduleDirectory, "../../assets/fonts/DejaVuSans-Bold.ttf"),
    "C:\\Windows\\Fonts\\tahomabd.ttf",
    "C:\\Windows\\Fonts\\arialbd.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    regular,
  ].filter((candidate): candidate is string => Boolean(candidate?.trim()));
  const bold = boldCandidates.find((candidate) => fs.existsSync(candidate)) ?? regular;
  cachedPdfFontPaths = { regular, bold };
  return cachedPdfFontPaths;
}

function hasPdfRtlText(value: string) {
  return pdfRtlCharacter.test(value);
}

function normalizePdfText(value: string) {
  return value.replace(/[\u00a0\u200b]/gu, " ").replace(/[·•]/gu, "-").replace(/\s+/gu, " ").trim();
}

function pdfDirectionOfCharacter(character: string, fallback: "rtl" | "ltr") {
  if (pdfRtlCharacter.test(character)) return "rtl" as const;
  if (pdfLtrCharacter.test(character)) return "ltr" as const;
  return fallback;
}

function pdfTextRuns(value: string) {
  const firstStrong = [...value].find((character) => pdfRtlCharacter.test(character) || pdfLtrCharacter.test(character));
  const baseDirection = firstStrong && pdfRtlCharacter.test(firstStrong) ? "rtl" : "ltr";
  const runs: Array<{ direction: "rtl" | "ltr"; text: string }> = [];
  let current: { direction: "rtl" | "ltr"; text: string } | null = null;
  for (const character of value) {
    const direction = pdfDirectionOfCharacter(character, current?.direction ?? baseDirection);
    if (!current || current.direction !== direction) {
      current = { direction, text: character };
      runs.push(current);
    } else {
      current.text += character;
    }
  }
  return { baseDirection, runs };
}

function drawPdfText(doc: PDFKit.PDFDocument, value: string, fonts: PdfFontPaths, width: number, fontSize: number, bold = false) {
  const text = normalizePdfText(value);
  if (!text) return;
  const font = bold ? fonts.bold : fonts.regular;
  doc.font(font).fontSize(fontSize);
  if (!hasPdfRtlText(text)) {
    doc.text(text, { width, lineGap: 2 });
    return;
  }

  const { baseDirection, runs } = pdfTextRuns(text);
  const visualRuns = baseDirection === "rtl" ? [...runs].reverse() : runs;
  if (visualRuns.length === 1) {
    doc.text(visualRuns[0]!.text, { width, align: baseDirection === "rtl" ? "right" : "left", lineGap: 2 });
    return;
  }
  visualRuns.forEach((run, index) => {
    doc.font(font).fontSize(fontSize).text(run.text, { width, continued: index < visualRuns.length - 1, lineGap: 2 });
  });
}

function drawPdfMultilineText(doc: PDFKit.PDFDocument, value: string, fonts: PdfFontPaths, width: number, fontSize: number, bold = false) {
  const x = doc.x;
  for (const [index, line] of String(value ?? "-").split(/\r?\n/).entries()) {
    if (index) doc.moveDown(0.15);
    doc.x = x;
    drawPdfText(doc, line || " ", fonts, width, fontSize, bold);
  }
}

function drawPdfSectionHeading(doc: PDFKit.PDFDocument, heading: string, fonts: PdfFontPaths, margin: number, width: number) {
  const y = doc.y;
  if (y > doc.page.height - margin - 70) {
    doc.addPage();
  }
  const top = doc.y;
  doc.save();
  doc.roundedRect(margin, top, width, 25, 5).fillAndStroke("#eaf3fb", "#c9dfef");
  doc.restore();
  doc.fillColor("#164b76");
  drawPdfText(doc, heading, fonts, width - 20, 10, true);
  doc.y = top + 31;
  doc.fillColor("#253746");
}

function drawPdfFooter(doc: PDFKit.PDFDocument, fonts: PdfFontPaths, margin: number, pageNumber: number, pageCount: number, label = "NIVASafe - FMEA report") {
  const lineY = doc.page.height - margin - 20;
  const textY = doc.page.height - margin - 12;
  doc.save();
  doc.strokeColor("#d9e5ee").lineWidth(0.6).moveTo(margin, lineY).lineTo(doc.page.width - margin, lineY).stroke();
  doc.fillColor("#6d7e8b").font(fonts.regular).fontSize(8).text(`${label} | ${pageNumber} / ${pageCount}`, margin, textY, { width: doc.page.width - margin * 2, align: "center", lineBreak: false });
  doc.restore();
}

export async function buildPdfDocument(title: string, lines: string[], footerLabel = "NIVASafe - FMEA report") {
  const fonts = resolvePdfFontPaths();
  const rtlPresent = hasPdfRtlText(title) || lines.some((line) => hasPdfRtlText(line));
  if (rtlPresent && !fonts) throw new Error("A Unicode PDF font is required for Persian or Arabic report content");
  const resolvedFonts = fonts ?? { regular: "Helvetica", bold: "Helvetica-Bold" };
  const doc = new PDFDocument({ size: "A4", margin: 42, bufferPages: true, info: { Title: title, Author: "NIVASafe" } });
  const chunks: Buffer[] = [];
  const complete = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const margin = 42;
  const width = doc.page.width - margin * 2;
  doc.save();
  doc.rect(0, 0, doc.page.width, 68).fill("#123f66");
  doc.restore();
  doc.fillColor("#ffffff");
  doc.y = 18;
  drawPdfText(doc, "NIVASafe", resolvedFonts, width / 2, 15, true);
  doc.y = 44;
  drawPdfText(doc, title, resolvedFonts, width, 10, false);
  doc.y = 91;
  doc.fillColor("#253746");

  for (const rawLine of lines) {
    const line = normalizePdfText(rawLine);
    if (!line) {
      doc.moveDown(0.55);
      continue;
    }
    if (pdfSectionHeadings.has(line)) {
      drawPdfSectionHeading(doc, line, resolvedFonts, margin, width);
      continue;
    }
    if (doc.y > doc.page.height - margin - 46) doc.addPage();
    doc.fillColor("#253746");
    drawPdfText(doc, line, resolvedFonts, width, 9.5);
    doc.moveDown(0.28);
  }

  const pageRange = doc.bufferedPageRange();
  for (let index = pageRange.start; index < pageRange.start + pageRange.count; index += 1) {
    doc.switchToPage(index);
    drawPdfFooter(doc, resolvedFonts, margin, index - pageRange.start + 1, pageRange.count, footerLabel);
  }
  doc.end();
  return complete;
}

function sendPdfBuffer(reply: FastifyReply, title: string, buffer: Buffer) {
  return reply.header("content-type", "application/pdf").header("content-disposition", `attachment; filename=${reportFilename(title, "pdf")}`).send(buffer);
}

function reportList(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()).join(", ") || "-" : "-"; }

export type FmeaReportData = {
  title: string;
  code: string;
  status: string;
  version?: number | null;
  createdAt: Date;
  updatedAt: Date;
  approvedAt: Date | null;
  project: { name: string };
  organization: { nameFa: string; nameEn: string };
  riskThresholds?: RiskThresholds;
  department: string | null;
  activityDescription: string | null;
  equipment: unknown;
  materials: unknown;
  existingControls: unknown;
  specialConditions: string | null;
  jobCatalog: { titleFa: string; titleEn: string } | null;
  evaluationTeam?: Array<{ displayName: string; email: string; role: string }>;
  items: Array<{ id?: string; rowNumber: number; processStep: string; failureMode: string; effect: string; cause: string; preventiveControls: string | null; detectionControls: string | null; severity: number; occurrence: number; detection: number; rpn: number; riskLevel: string; recommendation: string | null }>;
  actions: Array<{ id?: string; title: string; description: string; priority: string; status: string; progress: number; assigneeName: string | null; dueDate: Date | null; fmeaItemId: string | null; fmeaItem: { rowNumber: number; failureMode: string } | null }>;
};

export type FmeaReportPdfData = FmeaReportData & {
  evaluationTeam: Array<{ displayName: string; email: string; role: string }>;
};

function fmeaReferenceRiskThresholds(): RiskThresholds {
  return DEFAULT_THRESHOLDS;
}

function normaliseFmeaItems<T extends FmeaReportData["items"][number]>(items: T[], thresholds: ReturnType<typeof fmeaReferenceRiskThresholds>) {
  return items.map((item) => {
    const rpn = calculateRpn(item.severity, item.occurrence, item.detection);
    return { ...item, rpn, riskLevel: riskLevel(rpn, thresholds) };
  });
}

function fmeaItemsForOutput(data: FmeaReportData) {
  return normaliseFmeaItems(data.items, data.riskThresholds ?? DEFAULT_THRESHOLDS);
}

export type RulaSideResultData = Pick<RulaSideResults["LEFT"], "score" | "actionLevel" | "explanation" | "groupA" | "groupB" | "adjustment" | "trace">;
export type RulaSideFactorData = Pick<RulaReportFactor, "key" | "angle" | "detected" | "score" | "impactPercent" | "impactLevel" | "source" | "reviewed">;
export type RulaActivityInfoData = {
  jobTitle?: string;
  taskDescription?: string;
  postureDescription?: string | null;
  durationPerOccurrence?: number;
  durationUnit?: "SECOND" | "MINUTE" | "HOUR";
  repetitionsPerShift?: number;
  postureHoldDuration?: number;
  postureHoldUnit?: "SECOND" | "MINUTE" | "HOUR";
  loadWeight?: number | null;
  loadUnit?: "KG" | "LB";
};
export type RulaReportData = { id?: string; title: string; subjectCode?: string | null; version?: number | null; createdAt?: Date; updatedAt?: Date; project: { name: string }; score: number; actionLevel: number; explanation: string; status?: string; bodySide?: "LEFT" | "RIGHT" | "BOTH"; postureReviewComplete?: boolean; activityInfo?: RulaActivityInfoData | null; postureAnalysis?: RulaPostureAnalysis | null; sideResults?: Partial<Record<"LEFT" | "RIGHT", RulaSideResultData>>; sideFactors?: Partial<Record<"LEFT" | "RIGHT", RulaSideFactorData[]>> };
export type RulaReportExport = {
  assessment: { id?: string; title: string; subjectCode?: string | null; version?: number | null; createdAt?: Date; updatedAt?: Date; project: { name: string }; score: number; actionLevel: number; explanation: string; status?: string; bodySide?: "LEFT" | "RIGHT" | "BOTH"; postureReviewComplete?: boolean; activityInfo?: RulaActivityInfoData | null; postureAnalysis?: RulaPostureAnalysis | null };
  factors: Array<{ key: string; angle: number | null; detected?: boolean; score: number; impactPercent: number; impactLevel: string; source?: string; reviewed?: boolean }>;
  sideResults?: Partial<Record<"LEFT" | "RIGHT", RulaSideResultData>>;
  sideFactors?: Partial<Record<"LEFT" | "RIGHT", RulaSideFactorData[]>>;
  suggestedActions?: Array<{ id: string; titleFa: string; titleEn: string; descriptionFa: string; descriptionEn: string; priority: string; scoreReduction: number; affectedParts: RulaPosturePart[]; bodySide?: "LEFT" | "RIGHT" | "BOTH"; source?: string }>;
  actions: Array<{ title: string; description: string; priority: string; status?: string; bodySide?: "LEFT" | "RIGHT" | "BOTH" | null; rulaImpact?: { suggestionId?: string; scoreReduction: number; affectedParts?: string[] } | null }>;
  predictedScore: number;
  predictedSideScores?: Partial<Record<"LEFT" | "RIGHT", number>>;
  predictedNote?: string;
};

const reportIdParams = z.object({ id: z.string().uuid() });
const fmeaReportDetailSuggestionBody = z.object({ locale: z.enum(["fa", "en"]).default("fa"), autoCreate: z.boolean().default(false) });
const reportActionSuggestionBody = z.object({ locale: z.enum(["fa", "en"]).default("fa"), excludeTitles: z.array(z.string().trim().min(1).max(240)).max(8).default([]) });

export type FmeaReportPayload = {
  riskThresholds: RiskThresholds;
  assessment: {
    id: string;
    title: string;
    code: string;
    status: string;
    version: number;
    createdAt: Date;
    updatedAt: Date;
    approvedAt: Date | null;
    fmeaDetailSeeded: boolean;
    method: "FMEA";
    processName: { fa: string; en: string };
    companyName: { fa: string; en: string };
    project: { id: string; name: string; code: string };
    evaluationTeam: Array<{ id: string; displayName: string; email: string; role: string }>;
  };
  summary: ReturnType<typeof summariseFmea>;
  items: Array<FmeaReportRisk & { processStep: string; preventiveControls: string | null; detectionControls: string | null; correctiveActions: Array<{ id: string; title: string; status: string; priority: string }> }>;
  topFailureModes: Array<FmeaReportRisk & { processStep: string; preventiveControls: string | null; detectionControls: string | null; correctiveActions: Array<{ id: string; title: string; status: string; priority: string }>; actionPriority: string }>;
  suggestedActions: Array<{ id: string; title: string; description: string; fmeaItemId: string; failureMode: string; priority: string; status: "SUGGESTED"; source: "AI" | "FALLBACK" }>;
  actions: Array<{ id: string; title: string; description: string; priority: string; status: string; progress: number; assigneeName: string | null; dueDate: Date | null; fmeaItemId: string | null; fmeaItem: { rowNumber: number; failureMode: string } | null }>;
};

function actionRulaImpact(action: { rulaImpact: unknown; beforeRisk: number | null; afterRisk: number | null }, score: number) {
  const parsed = rulaImpactSchema.safeParse(action.rulaImpact);
  if (parsed.success) return parsed.data;
  return {
    scoreReduction: Math.max(0, Math.min(6, (action.beforeRisk ?? score) - (action.afterRisk ?? score))),
    affectedParts: [],
  };
}

function isActiveRulaAction(status: string) {
  return status !== "CANCELLED" && status !== "REJECTED";
}

function pdfDate(value: Date | null | undefined) {
  return value?.toISOString().slice(0, 10) ?? "-";
}

function fmeaActionMetrics(actions: FmeaReportData["actions"]) {
  const completed = actions.filter((action) => action.status === "COMPLETED").length;
  const active = actions.filter((action) => ["ASSIGNED", "IN_PROGRESS", "WAITING_FOR_REVIEW"].includes(action.status)).length;
  const progress = actions.length ? Math.round(actions.reduce((total, action) => total + Math.max(0, Math.min(100, action.progress)), 0) / actions.length) : 0;
  return { completed, active, progress };
}

function fmeaSuggestedActions(data: FmeaReportData) {
  return fmeaItemsForOutput(data).filter((item) => Boolean(item.recommendation?.trim()) && !data.actions.some((action) => action.fmeaItem?.rowNumber === item.rowNumber && action.title.trim().toLocaleLowerCase() === item.recommendation!.trim().toLocaleLowerCase()));
}

function parseRulaActivityInfo(value: unknown): RulaActivityInfoData | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const text = (key: string) => typeof source[key] === "string" ? source[key] as string : undefined;
  const number = (key: string) => typeof source[key] === "number" && Number.isFinite(source[key]) ? source[key] as number : undefined;
  const unit = <T extends string>(key: string, allowed: readonly T[]) => typeof source[key] === "string" && allowed.includes(source[key] as T) ? source[key] as T : undefined;
  return {
    jobTitle: text("jobTitle"),
    taskDescription: text("taskDescription"),
    postureDescription: text("postureDescription") ?? null,
    durationPerOccurrence: number("durationPerOccurrence"),
    durationUnit: unit("durationUnit", ["SECOND", "MINUTE", "HOUR"] as const),
    repetitionsPerShift: number("repetitionsPerShift"),
    postureHoldDuration: number("postureHoldDuration"),
    postureHoldUnit: unit("postureHoldUnit", ["SECOND", "MINUTE", "HOUR"] as const),
    loadWeight: source.loadWeight === null ? null : number("loadWeight"),
    loadUnit: unit("loadUnit", ["KG", "LB"] as const),
  };
}

export function buildFmeaPdfLines(data: FmeaReportPdfData, locale: ReportLocale = "en") {
  const labels = fmeaLabels(locale);
  const items = fmeaItemsForOutput(data);
  const summary = summariseFmea(items);
  const itemRows = items.map((item) => ({ ...item, actionPriority: actionPriority(item.riskLevel) }));
  const topItems = topFailureModes(itemRows);
  const suggestedActions = fmeaSuggestedActions(data);
  const actionMetrics = fmeaActionMetrics(data.actions);
  const team = data.evaluationTeam.map((member) => `${member.displayName || member.email} (${member.role})`).filter(Boolean).join(" | ") || "-";
  const processTitle = fmeaProcessTitle(data, locale);
  const controls = (item: FmeaReportData["items"][number]) => [item.preventiveControls, item.detectionControls].filter(Boolean).join(" | ") || "-";
  const relatedRisk = (action: FmeaReportData["actions"][number]) => action.fmeaItem ? `#${action.fmeaItem.rowNumber} · ${action.fmeaItem.failureMode}` : locale === "fa" ? "بدون ریسک مرتبط" : "Unlinked";
  const rowTable = fmeaFinalTableRows(data, locale);

  return [
    labels.header === "Assessment header" ? "REPORT HEADER" : labels.header,
    `${labels.status}: ${localizedFmeaStatus(data.status, locale)}`,
    `${labels.process}: ${processTitle}`,
    `${labels.company}: ${locale === "fa" ? data.organization.nameFa || data.organization.nameEn : data.organization.nameEn || data.organization.nameFa}`,
    `${labels.date}: ${reportDate(data.approvedAt ?? data.updatedAt, locale)}`,
    `${labels.method}: FMEA`,
    `${labels.team} (${data.evaluationTeam.length}): ${team}`,
    `${labels.code}: ${data.code}`,
    `${labels.project}: ${data.project.name}`,
    `${labels.version}: ${data.version ?? "-"}`,
    "",
    labels.processInformation === "Process information" ? "PROCESS INFORMATION" : labels.processInformation,
    `${labels.department}: ${data.department ?? "-"}`,
    `${labels.activity}: ${data.activityDescription ?? "-"}`,
    `${labels.equipment}: ${reportList(data.equipment)}`,
    `${labels.materials}: ${reportList(data.materials)}`,
    `${labels.existingControls}: ${reportList(data.existingControls)}`,
    `${labels.specialConditions}: ${data.specialConditions ?? "-"}`,
    "",
    labels.summary === "Executive risk summary" ? "EXECUTIVE RISK SUMMARY" : labels.summary,
    `${labels.totalFailureModes}: ${summary.totalFailureModes}`,
    `${labels.highPriorityRisks}: ${summary.highPriorityRisks}`,
    `${labels.correctiveActionsNeeded}: ${summary.correctiveActionsNeeded}`,
    `${labels.immediateActions}: ${summary.immediateActions}`,
    `${labels.registeredActions}: ${data.actions.length}`,
    `${labels.completedActions}: ${actionMetrics.completed}`,
    `${labels.activeActions}: ${actionMetrics.active}`,
    `${labels.progress}: ${actionMetrics.progress}%`,
    "",
    labels.riskDistribution === "Risk-level distribution" ? "RISK-LEVEL DISTRIBUTION" : labels.riskDistribution,
    `${localizedFmeaRiskLevel("CRITICAL", locale)}: ${summary.distribution.CRITICAL}`,
    `${localizedFmeaRiskLevel("HIGH", locale)}: ${summary.distribution.HIGH}`,
    `${localizedFmeaRiskLevel("MEDIUM", locale)}: ${summary.distribution.MEDIUM}`,
    `${localizedFmeaRiskLevel("LOW", locale)}: ${summary.distribution.LOW}`,
    `${localizedFmeaRiskLevel("VERY_LOW", locale)}: ${summary.distribution.VERY_LOW}`,
    "",
    labels.topFailureModes === "Top failure modes" ? "TOP FAILURE MODES" : labels.topFailureModes,
    ...(topItems.length ? topItems.flatMap((item) => [
      `#${item.rowNumber} · ${item.processStep} · ${item.failureMode}`,
      `${labels.effect}: ${item.effect} | S ${item.severity} | O ${item.occurrence} | D ${item.detection} | AP ${localizedFmeaActionPriority(item.actionPriority, locale)} | RPN ${item.rpn}`,
    ]) : [labels.noRows]),
    "",
    labels.proposedActions === "Proposed corrective actions / controls" ? "CORRECTIVE ACTIONS / CONTROLS" : labels.proposedActions,
    ...(data.actions.length ? data.actions.flatMap((action) => [
      `${labels.registered} | ${relatedRisk(action)} | ${action.title}`,
      `${labels.description}: ${action.description} | ${labels.priority}: ${localizedFmeaActionPriority(action.priority, locale)} | ${labels.actionStatus}: ${localizedFmeaStatus(action.status, locale)} | ${labels.assignee}: ${action.assigneeName ?? "-"} | ${labels.actionProgress}: ${action.progress}% | ${labels.dueDate}: ${reportDate(action.dueDate, locale)}`,
    ]) : [`${labels.registeredActions}: -`]),
    ...(suggestedActions.length ? [locale === "fa" ? "پیشنهادهای NIVASafe (ثبت‌نشده):" : "NIVASafe suggestions (not registered):", ...suggestedActions.map((item) => `#${item.rowNumber} · ${item.failureMode} | ${item.recommendation!.trim()} | ${labels.priority}: ${localizedFmeaActionPriority(actionPriority(item.riskLevel), locale)}`)] : [locale === "fa" ? "پیشنهادهای NIVASafe (ثبت‌نشده): -" : "NIVASafe suggestions (not registered): -"]),
    "",
    labels.actionRegister === "Corrective-action register" ? "CORRECTIVE-ACTION REGISTER" : labels.actionRegister,
    ...(data.actions.length ? data.actions.map((action) => `${relatedRisk(action)} | ${action.title} | ${labels.actionStatus}: ${localizedFmeaStatus(action.status, locale)} | ${labels.actionProgress}: ${action.progress}%`) : [labels.noActions]),
    "",
    labels.fullDetails === "Full FMEA details" ? "FULL FMEA DETAILS" : labels.fullDetails,
    ...(data.items.length ? data.items.flatMap((item) => {
      const actionText = fmeaRecommendedAction(data, item, locale);
      return [
        `#${item.rowNumber} · ${labels.processActivity}: ${item.processStep}`,
        `${labels.failureMode}: ${item.failureMode}`,
        `${labels.effect}: ${item.effect}`,
        `${labels.cause}: ${item.cause}`,
        `${labels.currentControls}: ${controls(item)}`,
        `S ${item.severity} | O ${item.occurrence} | D ${item.detection} | AP ${localizedFmeaActionPriority(actionPriority(item.riskLevel), locale)} | RPN ${item.rpn} | ${labels.riskLevel}: ${localizedFmeaRiskLevel(item.riskLevel, locale)}`,
        `${labels.recommendedAction}: ${actionText}`,
      ];
    }) : [labels.noRows]),
    "",
    labels.finalTableHeading === "Final FMEA assessment table" ? "FINAL FMEA ASSESSMENT TABLE" : labels.finalTableHeading,
    [...fmeaFinalTableHeaders(locale)].join(" | "),
    ...(rowTable.length ? rowTable.map((row) => row.map((value) => String(value ?? "-")).join(" | ")) : [labels.noRows]),
  ];
}

async function loadRulaReport(id: string, organizationId: string) {
  const rula = await prisma.rulaAssessment.findFirst({
    where: { id, organizationId },
    include: { project: true, actions: { orderBy: { updatedAt: "desc" } } },
  });
  if (!rula) throw Object.assign(new Error("Assessment not found"), { statusCode: 404, code: "NOT_FOUND" });
  const inputs = parseRulaInputs(rula.inputs);
  const postureAnalysis = parseRulaPostureAnalysis(rula.postureAnalysis, inputs);
  const bodySide: "LEFT" | "RIGHT" | "BOTH" = rula.bodySide === "LEFT" ? "LEFT" : rula.bodySide === "BOTH" ? "BOTH" : "RIGHT";
  const sideResults = buildRulaSideResults(bodySide, inputs, postureAnalysis);
  const sideFactors = bodySide === "BOTH" && postureAnalysis.sideAnalyses?.LEFT && postureAnalysis.sideAnalyses.RIGHT
    ? { LEFT: buildRulaFactors(postureAnalysis.sideAnalyses.LEFT), RIGHT: buildRulaFactors(postureAnalysis.sideAnalyses.RIGHT) }
    : undefined;
  const impacts = rula.actions.map((action) => actionRulaImpact(action, rula.score));
  const activeImpacts = rula.actions.flatMap((action, index) => isActiveRulaAction(action.status) ? [impacts[index]] : []);
  const activeActions = rula.actions.flatMap((action, index) => isActiveRulaAction(action.status) && impacts[index] ? [{ action, impact: impacts[index] }] : []);
  const predictedSideScores = sideResults
    ? (Object.fromEntries((['RIGHT', 'LEFT'] as const).map((side) => [side, predictedRulaScore(
      sideResults[side].score,
      activeActions
        .filter(({ action }) => !action.bodySide || action.bodySide === 'BOTH' || action.bodySide === side)
        .map(({ impact }) => impact),
    )])) as Partial<Record<'LEFT' | 'RIGHT', number>>)
    : undefined;
  const predictedScore = sideResults
    ? Math.max(...(["RIGHT", "LEFT"] as const).map((side) => predictedSideScores?.[side] ?? sideResults[side].score))
    : predictedRulaScore(rula.score, activeImpacts);
  return {
    assessment: {
      id: rula.id,
      title: rula.title,
      subjectCode: rula.subjectCode,
      version: rula.version,
      createdAt: rula.createdAt,
      updatedAt: rula.updatedAt,
      project: rula.project,
      score: rula.score,
      actionLevel: rula.actionLevel,
      explanation: rula.explanation,
      status: rula.status,
      activityInfo: parseRulaActivityInfo(rula.activityInfo),
      bodySide,
      postureReviewComplete: isRulaPostureAnalysisReviewed(bodySide, postureAnalysis),
      postureAnalysis,
    },
    factors: buildRulaFactors(postureAnalysis),
    sideResults,
    sideFactors,
    suggestedActions: fallbackRulaActionSuggestions({ bodySide, analysis: postureAnalysis, inputs, locale: "fa" }),
    actions: rula.actions.map((action, index) => ({
      id: action.id,
      title: action.title,
      description: action.description,
      priority: action.priority,
      status: action.status,
      progress: action.progress,
      assigneeName: action.assigneeName,
      dueDate: action.dueDate,
      beforeRisk: action.beforeRisk,
      afterRisk: action.afterRisk,
      bodySide: (action.bodySide === "LEFT" || action.bodySide === "BOTH" ? action.bodySide : action.bodySide === "RIGHT" ? "RIGHT" : null) as "LEFT" | "RIGHT" | "BOTH" | null,
      rulaImpact: impacts[index],
    })),
    predictedScore,
    predictedSideScores,
  };
}

async function loadFmeaReport(id: string, organizationId: string, locale: ReportLocale = "fa"): Promise<FmeaReportPayload> {
  const fmea = await prisma.fmeaAssessment.findFirst({
    where: { id, organizationId, deletedAt: null },
    include: {
      project: { select: { id: true, name: true, code: true } },
      organization: { select: { nameFa: true, nameEn: true } },
      jobCatalog: { select: { titleFa: true, titleEn: true } },
      items: { orderBy: { rowNumber: "asc" } },
    },
  });
  if (!fmea) throw Object.assign(new Error("Assessment not found"), { statusCode: 404, code: "NOT_FOUND" });
  const detailAutoSeed = await prisma.auditLog.findFirst({ where: { organizationId, action: "FMEA_REPORT_DETAIL_AUTOCREATE", entityType: "FmeaAssessment", entityId: id }, select: { id: true } });
  const actions = await prisma.correctiveAction.findMany({ where: { organizationId, OR: [{ fmeaId: id }, { fmeaItem: { assessmentId: id } }] }, include: { fmeaItem: { select: { rowNumber: true, failureMode: true } } }, orderBy: { updatedAt: "desc" } });
  const members = await prisma.organizationMember.findMany({ where: { organizationId, active: true }, select: { role: true, user: { select: { id: true, displayName: true, email: true } } } });
  const thresholds = fmeaReferenceRiskThresholds();
  const items = fmea.items.map((item) => {
    const rpn = calculateRpn(item.severity, item.occurrence, item.detection);
    return {
      id: item.id,
      rowNumber: item.rowNumber,
      processStep: item.processStep,
      failureMode: item.failureMode,
      effect: item.effect,
      cause: item.cause,
      preventiveControls: item.preventiveControls,
      detectionControls: item.detectionControls,
      severity: item.severity,
      occurrence: item.occurrence,
      detection: item.detection,
      rpn,
      riskLevel: riskLevel(rpn, thresholds),
      recommendation: item.recommendation,
    };
  });
  const reportItems = items as FmeaReportRisk[];
  const processName = { fa: fmea.jobCatalog?.titleFa ?? fmea.title, en: fmea.jobCatalog?.titleEn ?? fmea.title };
  const correctiveActionsByItem = new Map<string, Array<{ id: string; title: string; status: string; priority: string }>>();
  for (const action of actions) {
    if (!action.fmeaItemId) continue;
    const current = correctiveActionsByItem.get(action.fmeaItemId) ?? [];
    current.push({ id: action.id, title: action.title, status: action.status, priority: action.priority });
    correctiveActionsByItem.set(action.fmeaItemId, current);
  }
  const reportItemsWithActions = items.map((item) => ({ ...item, actionPriority: actionPriority(item.riskLevel), correctiveActions: correctiveActionsByItem.get(item.id) ?? [] }));
  const suggestedActions = fallbackFmeaActionSuggestions({ candidates: items, existingActionTitles: actions.filter((action) => !["CANCELLED", "REJECTED"].includes(action.status)).map((action) => action.title), locale });
  return {
    riskThresholds: thresholds,
    assessment: {
      id: fmea.id,
      title: fmea.title,
      code: fmea.code,
      status: fmea.status,
      version: fmea.version,
      createdAt: fmea.createdAt,
      updatedAt: fmea.updatedAt,
      approvedAt: fmea.approvedAt,
      fmeaDetailSeeded: Boolean(detailAutoSeed),
      method: "FMEA",
      processName,
      companyName: { fa: fmea.organization.nameFa, en: fmea.organization.nameEn },
      project: fmea.project,
      evaluationTeam: members.map((member) => ({ id: member.user.id, displayName: member.user.displayName, email: member.user.email, role: member.role })),
    },
    summary: summariseFmea(reportItems),
    items: reportItemsWithActions,
    topFailureModes: topFailureModes(reportItemsWithActions, reportItemsWithActions.length).map((item) => ({ ...item, actionPriority: actionPriority(item.riskLevel) })),
    suggestedActions: suggestedActions.slice(0, 5),
    actions,
  };
}

type ExportCell = string | number | null;
type ExportRow = ExportCell[];

type ReportPdfBlock =
  | { kind: "keyValues"; heading: string; rows: ExportRow[] }
  | { kind: "metrics"; heading?: string; cards: Array<{ label: string; value: string | number; tone?: "blue" | "green" | "amber" | "red" }> }
  | { kind: "progress"; heading: string; progress: number; centerLabel: string; rows: Array<{ label: string; count: number; color: string }> }
  | { kind: "distribution"; heading: string; centerLabel: string; centerValue?: number; rows: Array<{ label: string; count: number; weight?: number; percentage: number; color: string }> }
  | { kind: "factorCards"; heading: string; rows: Array<{ side: string; factor: string; angle: string; detected: string; score: string; contribution: string; effect: string; source: string; tone: "blue" | "green" | "amber" | "red" }> }
  | { kind: "table"; heading: string; headers: string[]; rows: ExportRow[]; widths?: number[] };

function exportText(value: ExportCell | undefined) {
  return String(value ?? "-").trim() || "-";
}

function pdfCellTextHeight(doc: PDFKit.PDFDocument, value: ExportCell, width: number, fonts: PdfFontPaths, fontSize: number, bold = false) {
  const font = bold ? fonts.bold : fonts.regular;
  doc.font(font).fontSize(fontSize);
  return exportText(value).split(/\r?\n/).reduce((height, line) => height + doc.heightOfString(normalizePdfText(line) || " ", { width: Math.max(10, width), lineGap: 1 }) + 1, 0);
}

function drawPdfDonutSegment(doc: PDFKit.PDFDocument, centerX: number, centerY: number, outerRadius: number, innerRadius: number, startPercent: number, endPercent: number, color: string) {
  if (endPercent <= startPercent) return;
  const startAngle = startPercent * 3.6 - 90;
  const endAngle = endPercent * 3.6 - 90;
  const steps = Math.max(2, Math.ceil((endAngle - startAngle) / 3));
  const points: number[][] = [];
  for (let index = 0; index <= steps; index += 1) {
    const angle = (startAngle + (endAngle - startAngle) * index / steps) * Math.PI / 180;
    points.push([centerX + Math.cos(angle) * outerRadius, centerY + Math.sin(angle) * outerRadius]);
  }
  for (let index = steps; index >= 0; index -= 1) {
    const angle = (startAngle + (endAngle - startAngle) * index / steps) * Math.PI / 180;
    points.push([centerX + Math.cos(angle) * innerRadius, centerY + Math.sin(angle) * innerRadius]);
  }
  doc.save();
  doc.polygon(...points).fill(color, "even-odd");
  doc.restore();
}

function reportBlockText(block: ReportPdfBlock) {
  if (block.kind === "metrics") return [block.heading ?? "", ...block.cards.flatMap((card) => [card.label, String(card.value)])];
  if (block.kind === "distribution") return [block.heading, block.centerLabel, ...block.rows.flatMap((row) => [row.label, String(row.count), String(row.percentage)])];
  if (block.kind === "progress") return [block.heading, block.centerLabel, ...block.rows.flatMap((row) => [row.label, String(row.count)])];
  if (block.kind === "factorCards") return [block.heading, ...block.rows.flatMap((row) => [row.side, row.factor, row.angle, row.detected, row.score, row.contribution, row.effect, row.source])];
  if (block.kind === "table") return [block.heading, ...block.headers, ...block.rows.flatMap((row) => row.map((cell) => String(cell ?? "-")))];
  return [block.heading, ...block.rows.flatMap((row) => row.map((cell) => String(cell ?? "-")))];
}

function drawStyledReportPdf(title: string, subtitle: string, blocks: ReportPdfBlock[], locale: ReportLocale, footer: string) {
  const fonts = resolvePdfFontPaths();
  const allText = [title, subtitle, ...blocks.flatMap(reportBlockText)];
  if (allText.some(hasPdfRtlText) && !fonts) throw new Error("A Unicode PDF font is required for Persian or Arabic report content");
  const resolvedFonts = fonts ?? { regular: "Helvetica", bold: "Helvetica-Bold" };
  const margin = 26;
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin, bufferPages: true, info: { Title: title, Author: "NIVASafe" } });
  const chunks: Buffer[] = [];
  const complete = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  const contentWidth = doc.page.width - margin * 2;
  const footerReserve = 31;
  const pageTitle = title.replace(/^NIVASafe\s*[—-]\s*/u, "");
  const drawPageHeader = (first = false) => {
    doc.save();
    doc.rect(0, 0, doc.page.width, first ? 74 : 46).fill("#123f66");
    doc.restore();
    doc.fillColor("#ffffff").font(resolvedFonts.bold).fontSize(first ? 15 : 10).text("NIVASafe", margin, first ? 10 : 8, { width: contentWidth, lineBreak: false });
    doc.x = margin;
    doc.y = first ? 34 : 22;
    drawPdfText(doc, pageTitle, resolvedFonts, contentWidth, first ? 8.5 : 7.5, true);
    if (first && subtitle.trim()) {
      doc.x = margin;
      doc.y = 52;
      drawPdfText(doc, subtitle, resolvedFonts, contentWidth, 7.2);
    }
    doc.fillColor("#253746");
    doc.y = first ? 84 : 58;
  };
  const addPage = () => { doc.addPage(); drawPageHeader(); };
  const ensureRoom = (height: number) => {
    if (doc.y + height > doc.page.height - margin - footerReserve) {
      addPage();
      return true;
    }
    return false;
  };
  const drawSection = (heading: string) => {
    ensureRoom(34);
    const y = doc.y;
    doc.save();
    doc.roundedRect(margin, y, contentWidth, 24, 5).fillAndStroke("#eaf3fb", "#c9dfef");
    doc.restore();
    doc.fillColor("#164b76");
    doc.x = margin + 9;
    doc.y = y + 6;
    drawPdfText(doc, heading, resolvedFonts, contentWidth - 18, 9, true);
    doc.y = y + 31;
    doc.fillColor("#253746");
  };
  const cellText = (value: ExportCell, x: number, y: number, width: number, fontSize: number, bold: boolean, align: "left" | "right" | "center", textColor?: string) => {
    const lines = exportText(value).split(/\r?\n/);
    let lineY = y;
    for (const line of lines) {
      doc.fillColor(textColor ?? (bold ? "#174e86" : "#253746"));
      doc.font(bold ? resolvedFonts.bold : resolvedFonts.regular).fontSize(fontSize);
      const normalized = normalizePdfText(line);
      if (hasPdfRtlText(normalized)) {
        const measuredWidth = doc.widthOfString(normalized);
        const textWidth = align === "center" ? Math.min(width, Math.max(1, measuredWidth + 1)) : width;
        doc.x = align === "center" ? x + Math.max(0, (width - textWidth) / 2) : x;
        doc.y = lineY;
        drawPdfText(doc, normalized, resolvedFonts, textWidth, fontSize, bold);
      } else {
        doc.text(normalized || " ", x, lineY, { width, align, lineGap: 1 });
      }
      lineY += doc.heightOfString(normalized || " ", { width, lineGap: 1 }) + 1;
    }
  };
  const tableHeaderHeight = (headers: string[], widths: number[]) => Math.max(25, ...headers.map((header, index) => pdfCellTextHeight(doc, header, widths[index]! - 10, resolvedFonts, 6.5, true) + 10));
  const drawTableHeader = (headers: string[], widths: number[]) => {
    const y = doc.y;
    const height = tableHeaderHeight(headers, widths);
    const visual = headers.map((header, index) => ({ value: header, width: widths[index]! }));
    if (locale === "fa") visual.reverse();
    let x = margin;
    for (const column of visual) {
      doc.save();
      doc.rect(x, y, column.width, height).fillAndStroke("#1e5b8f", "#c9d9e5");
      doc.fillColor("#ffffff");
      cellText(column.value, x + 4, y + 5, column.width - 8, 6.5, true, locale === "fa" ? "right" : "left", "#ffffff");
      doc.restore();
      x += column.width;
    }
    doc.y = y + height;
  };

  drawPageHeader(true);
  for (const block of blocks) {
    if (block.kind === "metrics") {
      const gap = 8;
      const cardWidth = (contentWidth - gap * Math.max(0, block.cards.length - 1)) / Math.max(1, block.cards.length);
      const cardHeight = 48;
      ensureRoom(cardHeight + 8 + (block.heading ? 34 : 0));
      if (block.heading) drawSection(block.heading);
      const cards = locale === "fa" ? [...block.cards].reverse() : block.cards;
      const rowY = doc.y;
      cards.forEach((card, index) => {
        const x = margin + index * (cardWidth + gap);
        const tone = card.tone === "red" ? "#fff1f1" : card.tone === "amber" ? "#fff7e9" : card.tone === "green" ? "#eef9f4" : "#f1f7fc";
        const accent = card.tone === "red" ? "#c94a4d" : card.tone === "amber" ? "#bd7a1b" : card.tone === "green" ? "#18845c" : "#1e5b8f";
        doc.save();
        doc.roundedRect(x, rowY, cardWidth, cardHeight, 6).fillAndStroke(tone, "#d7e5ef");
        doc.restore();
        cellText(card.label, x + 8, rowY + 7, cardWidth - 16, 7, false, locale === "fa" ? "right" : "left");
        doc.fillColor(accent).font(resolvedFonts.bold).fontSize(15).text(String(card.value), x + 8, rowY + 23, { width: cardWidth - 16, align: locale === "fa" ? "right" : "left", lineBreak: false });
      });
      doc.y = rowY + cardHeight + 10;
      continue;
    }
    let firstContentHeight = 40;
    if (block.kind === "distribution") firstContentHeight = Math.max(126, block.rows.length * 19 + 20) + 7;
    else if (block.kind === "progress") firstContentHeight = 111;
    else if (block.kind === "factorCards") firstContentHeight = 84;
    else if (block.kind === "keyValues") {
      const cardWidth = (contentWidth - 7) / 2;
      firstContentHeight = Math.max(36, ...block.rows.slice(0, 2).map((pair) => pdfCellTextHeight(doc, pair[1] ?? "-", cardWidth - 18, resolvedFonts, 8, true) + 18)) + 5;
    } else {
      const total = block.widths?.reduce((sum, width) => sum + width, 0) || block.headers.length;
      const widths = block.headers.map((_, index) => contentWidth * ((block.widths?.[index] ?? 1) / total));
      const firstRow = block.rows[0] ?? block.headers.map(() => "-");
      const rowHeight = Math.max(25, ...block.headers.map((_, index) => pdfCellTextHeight(doc, firstRow[index] ?? "-", widths[index]! - 10, resolvedFonts, 6.4) + 9));
      firstContentHeight = tableHeaderHeight(block.headers, widths) + rowHeight + 4;
    }
    ensureRoom(34 + firstContentHeight);
    drawSection(block.heading);
    if (block.kind === "keyValues") {
      const gap = 7;
      const cardWidth = (contentWidth - gap) / 2;
      for (let index = 0; index < block.rows.length; index += 2) {
        const row = block.rows.slice(index, index + 2);
        const visualRow = locale === "fa" ? [...row].reverse() : row;
        const heights = row.map((pair) => Math.max(36, pdfCellTextHeight(doc, pair[1] ?? "-", cardWidth - 18, resolvedFonts, 8, true) + 18));
        const height = Math.max(...heights);
        if (ensureRoom(height + 5)) drawSection(block.heading);
        const rowY = doc.y;
        visualRow.forEach((pair, columnIndex) => {
          const key = pair[0] ?? "-";
          const value = pair[1] ?? "-";
          const x = margin + columnIndex * (cardWidth + gap);
          doc.save();
          doc.roundedRect(x, rowY, cardWidth, height, 5).fillAndStroke("#ffffff", "#d7e5ef");
          doc.restore();
          cellText(key, x + 8, rowY + 5, cardWidth - 16, 6.6, false, locale === "fa" ? "right" : "left");
          cellText(value, x + 8, rowY + 17, cardWidth - 16, 8, true, locale === "fa" ? "right" : "left");
        });
        doc.y = rowY + height + 5;
      }
      continue;
    }
    if (block.kind === "distribution") {
      const height = Math.max(126, block.rows.length * 19 + 20);
      ensureRoom(height + 7);
      const y = doc.y;
      doc.save();
      doc.roundedRect(margin, y, contentWidth, height, 7).fillAndStroke("#ffffff", "#d7e5ef");
      doc.restore();
      const chartSize = 118;
      const centerX = locale === "fa" ? margin + contentWidth - chartSize / 2 - 10 : margin + chartSize / 2 + 10;
      const centerY = y + height / 2;
      const total = block.centerValue ?? block.rows.reduce((sum, row) => sum + (row.weight ?? row.count), 0);
      doc.save();
      doc.circle(centerX, centerY, 43).fillAndStroke("#e8eef2", "#e8eef2");
      let startPercent = 0;
      if (total > 0) for (const row of block.rows) {
        const endPercent = startPercent + (row.weight ?? row.count) / total * 100;
        drawPdfDonutSegment(doc, centerX, centerY, 43, 29, startPercent, endPercent, row.color);
        startPercent = endPercent;
      }
      doc.circle(centerX, centerY, 27).fill("#ffffff");
      doc.restore();
      doc.fillColor("#174e86").font(resolvedFonts.bold).fontSize(16).text(String(block.centerValue ?? total), centerX - 35, centerY - 10, { width: 70, align: "center", lineBreak: false });
      cellText(block.centerLabel, centerX - 42, centerY + 8, 84, 5.8, false, "center");
      const legendX = locale === "fa" ? margin + 12 : margin + chartSize + 14;
      const legendWidth = contentWidth - chartSize - 26;
      block.rows.forEach((row, index) => {
        const rowY = y + 12 + index * 19;
        const dotX = locale === "fa" ? legendX + legendWidth - 4 : legendX + 4;
        doc.save();
        doc.circle(dotX, rowY + 5, 3).fill(row.color);
        doc.restore();
        const labelX = locale === "fa" ? legendX + legendWidth - 15 : legendX + 13;
        const labelWidth = Math.max(50, legendWidth * 0.58);
        cellText(row.label, locale === "fa" ? labelX - labelWidth : labelX, rowY, labelWidth, 7.1, true, locale === "fa" ? "right" : "left");
        const valueText = `${row.count} · ${row.percentage}%`;
        cellText(valueText, locale === "fa" ? legendX : legendX + legendWidth * 0.64, rowY, legendWidth * 0.32, 6.8, false, locale === "fa" ? "left" : "right");
      });
      doc.y = y + height + 7;
      continue;
    }
    if (block.kind === "progress") {
      const height = 104;
      ensureRoom(height + 7);
      const y = doc.y;
      doc.save();
      doc.roundedRect(margin, y, contentWidth, height, 7).fillAndStroke("#ffffff", "#d7e5ef");
      doc.restore();
      const chartSize = 96;
      const centerX = locale === "fa" ? margin + contentWidth - chartSize / 2 - 10 : margin + chartSize / 2 + 10;
      const centerY = y + height / 2;
      doc.save();
      doc.circle(centerX, centerY, 35).fillAndStroke("#e8eef2", "#e8eef2");
      drawPdfDonutSegment(doc, centerX, centerY, 35, 24, 0, Math.max(0, Math.min(100, block.progress)), "#279a78");
      doc.circle(centerX, centerY, 22).fill("#ffffff");
      doc.restore();
      doc.fillColor("#174e86").font(resolvedFonts.bold).fontSize(13).text(`${block.progress}%`, centerX - 32, centerY - 8, { width: 64, align: "center", lineBreak: false });
      cellText(block.centerLabel, centerX - 37, centerY + 8, 74, 5.4, false, "center");
      const legendX = locale === "fa" ? margin + 12 : margin + chartSize + 14;
      const legendWidth = contentWidth - chartSize - 26;
      block.rows.forEach((row, index) => {
        const rowY = y + 17 + index * 20;
        const dotX = locale === "fa" ? legendX + legendWidth - 4 : legendX + 4;
        doc.save();
        doc.circle(dotX, rowY + 5, 3).fill(row.color);
        doc.restore();
        const labelX = locale === "fa" ? legendX + legendWidth - 15 : legendX + 13;
        cellText(row.label, locale === "fa" ? labelX - legendWidth * 0.62 : labelX, rowY, legendWidth * 0.58, 7, false, locale === "fa" ? "right" : "left");
        cellText(String(row.count), locale === "fa" ? legendX : legendX + legendWidth * 0.68, rowY, legendWidth * 0.25, 7, true, locale === "fa" ? "left" : "right");
      });
      doc.y = y + height + 7;
      continue;
    }
    if (block.kind === "factorCards") {
      const gap = 8;
      const columns = 3;
      const cardWidth = (contentWidth - gap * (columns - 1)) / columns;
      const cardHeight = 76;
      const rows = block.rows.length ? block.rows : [{ side: "-", factor: locale === "fa" ? "اطلاعاتی ثبت نشده است" : "No data", angle: "-", detected: "-", score: "-", contribution: "0%", effect: "-", source: "-", tone: "blue" as const }];
      for (let offset = 0; offset < rows.length; offset += columns) {
        ensureRoom(cardHeight + 8);
        const y = doc.y;
        const row = rows.slice(offset, offset + columns);
        const visual = locale === "fa" ? [...row].reverse() : row;
        visual.forEach((factor, index) => {
          const x = margin + index * (cardWidth + gap);
          const tone = factor.tone === "red" ? { fill: "#fff5f4", border: "#efcfcd", accent: "#c94a4d" }
            : factor.tone === "amber" ? { fill: "#fff9ef", border: "#eeddb9", accent: "#bd7a1b" }
              : factor.tone === "green" ? { fill: "#f2faf6", border: "#cfe7dc", accent: "#18845c" }
                : { fill: "#f3f8fc", border: "#d7e5ef", accent: "#1e5b8f" };
          doc.save();
          doc.roundedRect(x, y, cardWidth, cardHeight, 6).fillAndStroke(tone.fill, tone.border);
          doc.restore();
          if (factor.side !== "-" || factor.source) cellText([factor.side !== "-" ? factor.side : "", factor.source].filter(Boolean).join(" · "), x + 8, y + 5, cardWidth - 16, 5.7, false, locale === "fa" ? "right" : "left");
          const effectWidth = Math.min(cardWidth * 0.38, Math.max(54, factor.effect.length * 3.1));
          const effectX = locale === "fa" ? x + 8 : x + cardWidth - effectWidth - 8;
          doc.save();
          doc.roundedRect(effectX, y + 4, effectWidth, 15, 7).fill(tone.fill);
          doc.restore();
          cellText(factor.effect, effectX + 4, y + 8, effectWidth - 8, 5.6, true, "center", tone.accent);
          cellText(factor.factor, x + 8, y + 19, cardWidth - 16, 8.2, true, locale === "fa" ? "right" : "left", tone.accent);
          cellText(`${factor.angle}  ·  ${factor.score}`, x + 8, y + 33, cardWidth - 16, 6.8, false, locale === "fa" ? "right" : "left");
          cellText(`${factor.detected}  ·  ${factor.contribution}`, x + 8, y + 46, cardWidth - 16, 5.8, false, locale === "fa" ? "right" : "left");
          const contribution = Number.parseFloat(factor.contribution) || 0;
          doc.save();
          doc.roundedRect(x + 8, y + 64, cardWidth - 16, 5, 2).fill("#e7eef2");
          if (contribution > 0) doc.roundedRect(x + 8, y + 64, (cardWidth - 16) * Math.min(100, contribution) / 100, 5, 2).fill(tone.accent);
          doc.restore();
        });
        doc.y = y + cardHeight + 8;
      }
      continue;
    }
    const weightTotal = block.widths?.reduce((sum, width) => sum + width, 0) || block.headers.length;
    const logicalWidths = block.headers.map((_, index) => contentWidth * ((block.widths?.[index] ?? 1) / weightTotal));
    const drawHeader = () => drawTableHeader(block.headers, logicalWidths);
    drawHeader();
    const rows = block.rows.length ? block.rows : [block.headers.map(() => "-")];
    for (const row of rows) {
      const logical = block.headers.map((_, index) => ({ value: row[index] ?? "-", width: logicalWidths[index]! }));
      const maxHeight = Math.max(25, ...logical.map((column) => pdfCellTextHeight(doc, column.value, column.width - 10, resolvedFonts, 6.4) + 9));
      if (doc.y + maxHeight > doc.page.height - margin - footerReserve) {
        addPage();
        drawSection(block.heading);
        drawHeader();
      }
      const visual = locale === "fa" ? logical.reverse() : logical;
      const y = doc.y;
      let x = margin;
      visual.forEach((column, index) => {
        doc.save();
        doc.rect(x, y, column.width, maxHeight).fillAndStroke("#ffffff", "#d7e5ef");
        const valueIsNumeric = typeof column.value === "number" || /^\d+(?:[.,]\d+)?%?$/.test(String(column.value));
        cellText(column.value, x + 4, y + 5, column.width - 8, 6.4, false, valueIsNumeric ? "center" : locale === "fa" ? "right" : "left");
        doc.restore();
        x += column.width;
      });
      doc.y = y + maxHeight;
    }
    doc.y += 8;
  }
  const pages = doc.bufferedPageRange();
  for (let index = pages.start; index < pages.start + pages.count; index += 1) {
    doc.switchToPage(index);
    drawPdfFooter(doc, resolvedFonts, margin, index - pages.start + 1, pages.count, footer);
  }
  doc.end();
  return complete;
}

const FMEA_RISK_COLORS: Record<string, string> = { CRITICAL: "#cf4a4d", HIGH: "#e19a31", MEDIUM: "#d7b83f", LOW: "#43a27d", VERY_LOW: "#78c4a1" };

export function buildFmeaReportPdfDocument(data: FmeaReportData, report: FmeaReportPayload, locale: ReportLocale = "en") {
  const labels = fmeaLabels(locale);
  const summary = report.summary;
  const reportData: FmeaReportData = { ...data, riskThresholds: report.riskThresholds, actions: report.actions };
  const actionMetrics = fmeaActionMetrics(reportData.actions);
  const evaluationTeam = data.evaluationTeam?.map((member) => `${member.displayName || member.email} (${member.role})`).filter(Boolean).join("\n") || "-";
  const metadataRows: ExportRow[] = [
    [labels.process, fmeaProcessTitle(data, locale)], [labels.company, fmeaCompanyName(data, locale)],
    [labels.date, reportDate(data.approvedAt ?? data.updatedAt, locale)], [labels.method, "FMEA"],
    [labels.team, `${data.evaluationTeam?.length ?? 0} ${labels.teamMembers}\n${evaluationTeam}`], [labels.code, data.code],
    [labels.project, data.project.name], [labels.status, localizedFmeaStatus(data.status, locale)], [labels.version, data.version ?? "-"],
    [labels.department, data.department ?? "-"], [labels.activity, data.activityDescription ?? "-"],
    [labels.equipment, reportList(data.equipment)], [labels.materials, reportList(data.materials)],
    [labels.existingControls, reportList(data.existingControls)], [labels.specialConditions, data.specialConditions ?? "-"],
  ];
  const totalActions = reportData.actions.length;
  const remainingActions = Math.max(0, totalActions - actionMetrics.completed - actionMetrics.active);
  const distributionRows = (["CRITICAL", "HIGH", "MEDIUM", "LOW", "VERY_LOW"] as const).map((level) => ({
    label: localizedFmeaRiskLevel(level, locale),
    count: summary.distribution[level],
    percentage: summary.totalFailureModes ? Math.round(summary.distribution[level] / summary.totalFailureModes * 1000) / 10 : 0,
    color: FMEA_RISK_COLORS[level]!,
  }));
  const topRiskRows = report.topFailureModes.slice(0, 5).map((item) => [
    item.rowNumber, item.failureMode, item.effect, item.severity, item.occurrence, item.detection,
    localizedFmeaActionPriority(item.actionPriority, locale), item.rpn,
  ]);
  const proposedRows = report.suggestedActions.filter((suggestion) => !report.actions.some((action) => action.fmeaItemId === suggestion.fmeaItemId && action.title.trim().toLocaleLowerCase() === suggestion.title.trim().toLocaleLowerCase())).map((suggestion) => [
    `#${report.items.find((item) => item.id === suggestion.fmeaItemId)?.rowNumber ?? "-"} · ${suggestion.failureMode}`,
    suggestion.title,
    localizedFmeaActionPriority(suggestion.priority, locale),
    locale === "fa" ? "پیشنهادی" : "Suggested",
  ]);
  const actionRows = reportData.actions.map((action) => [
    `${action.title}\n${action.description}`,
    action.fmeaItem ? `#${action.fmeaItem.rowNumber} · ${action.fmeaItem.failureMode}` : "-",
    localizedFmeaActionPriority(action.priority, locale), action.assigneeName ?? "-",
    localizedFmeaStatus(action.status, locale), `${Math.max(0, Math.min(100, action.progress))}%`,
  ]);
  const fullRows = fmeaFinalTableRows(reportData, locale);
  const fullHeaders = fmeaFinalTableHeaders(locale);
  return drawStyledReportPdf(labels.reportTitle, data.title, [
    { kind: "keyValues", heading: labels.header, rows: metadataRows },
    { kind: "metrics", heading: labels.summary, cards: [
      { label: labels.totalFailureModes, value: summary.totalFailureModes, tone: "blue" },
      { label: labels.highPriorityRisks, value: summary.highPriorityRisks, tone: "red" },
      { label: labels.correctiveActionsNeeded, value: summary.correctiveActionsNeeded, tone: "amber" },
      { label: labels.immediateActions, value: summary.immediateActions, tone: "red" },
    ] },
    { kind: "distribution", heading: labels.riskDistribution, centerLabel: labels.totalFailureModes, rows: distributionRows },
    { kind: "progress", heading: labels.actionRegister, progress: actionMetrics.progress, centerLabel: locale === "fa" ? "تکمیل‌شده" : "Complete", rows: [
      { label: labels.completedActions, count: actionMetrics.completed, color: "#279a78" },
      { label: labels.activeActions, count: actionMetrics.active, color: "#e19a31" },
      { label: labels.remainingActions, count: remainingActions, color: "#b8c7d0" },
    ] },
    { kind: "table", heading: labels.topFailureModes, headers: locale === "en" ? ["Row", "Failure mode", "Effect", "S", "O", "D", "AP", "RPN"] : [labels.row, labels.failureMode, labels.effect, "S", "O", "D", "AP", labels.rpn], rows: topRiskRows, widths: [0.6, 2.1, 2.1, 0.45, 0.45, 0.45, 0.8, 0.65] },
    { kind: "table", heading: labels.proposedActions, headers: [labels.relatedRisk, labels.title, labels.priority, locale === "fa" ? "وضعیت" : "Status"], rows: proposedRows.length ? proposedRows : [[labels.noRecommendations, "-", "-", "-"]], widths: [2, 3.4, 1, 1] },
    { kind: "table", heading: labels.actionRegister, headers: [labels.actionStatus === "Status" ? "Action / description" : "اقدام / شرح", labels.relatedRisk, labels.priority, labels.assignee, labels.actionStatus, labels.actionProgress], rows: actionRows.length ? actionRows : [[labels.noActions, "-", "-", "-", "-", "-"]], widths: [3.2, 2.2, 1, 1.4, 1.2, 0.8] },
    { kind: "table", heading: labels.fullDetails, headers: [...fullHeaders], rows: fullRows, widths: [0.6, 1.5, 1.4, 1.4, 1.6, 0.75, 0.75, 0.75, 0.8, 1, 2.2] },
  ], locale, labels.footer);
}

export const FMEA_FINAL_TABLE_HEADERS = ["Row", "Failure mode", "Effect", "Cause", "Current controls", "S", "O", "D", "RPN", "Risk level", "Recommended corrective action"] as const;
const FMEA_FINAL_TABLE_WIDTHS = [8, 28, 32, 32, 42, 7, 7, 7, 10, 16, 48];

function fmeaFinalTableHeaders(locale: ReportLocale = "en") {
  const labels = fmeaLabels(locale);
  return locale === "en"
    ? [...FMEA_FINAL_TABLE_HEADERS]
    : [labels.row, labels.failureMode, labels.effect, labels.cause, labels.currentControls, labels.severity, labels.occurrence, labels.detection, labels.rpn, labels.riskLevel, labels.recommendedAction];
}

function fmeaCorrectiveActions(data: FmeaReportData, item: FmeaReportData["items"][number]) {
  return data.actions.filter((action) => (item.id && action.fmeaItemId === item.id) || action.fmeaItem?.rowNumber === item.rowNumber);
}

function fmeaRecommendedAction(data: FmeaReportData, item: FmeaReportData["items"][number], locale: ReportLocale = "en") {
  const values = item.recommendation?.trim() ? [item.recommendation.trim()] : [];
  for (const action of fmeaCorrectiveActions(data, item)) {
    const title = action.title.trim();
    if (title && !values.some((value) => value.toLocaleLowerCase() === title.toLocaleLowerCase())) values.push(`${title} (${localizedFmeaStatus(action.status, locale)}, ${localizedFmeaActionPriority(action.priority, locale)})`);
  }
  return values.join("\n") || "-";
}

function fmeaExportRows(data: FmeaReportData, locale: ReportLocale = "en"): ExportRow[] {
  return fmeaItemsForOutput(data).map((item) => [
    item.rowNumber,
    item.processStep,
    item.failureMode,
    item.effect,
    item.cause,
    [item.preventiveControls, item.detectionControls].filter((value): value is string => Boolean(value?.trim())).join("\n") || "-",
    item.severity,
    item.occurrence,
    item.detection,
    localizedFmeaActionPriority(actionPriority(item.riskLevel), locale),
    item.rpn,
    localizedFmeaRiskLevel(item.riskLevel, locale),
    fmeaRecommendedAction(data, item, locale),
  ]);
}

export function fmeaFinalTableRows(data: FmeaReportData, locale: ReportLocale = "en"): ExportRow[] {
  return fmeaItemsForOutput(data).map((item) => [
    item.rowNumber,
    item.failureMode,
    item.effect,
    item.cause,
    [item.preventiveControls, item.detectionControls].filter((value): value is string => Boolean(value?.trim())).join("\n") || "-",
    item.severity,
    item.occurrence,
    item.detection,
    item.rpn,
    localizedFmeaRiskLevel(item.riskLevel, locale),
    fmeaRecommendedAction(data, item, locale),
  ]);
}

function pdfFinalTableCellText(value: ExportCell) {
  return String(value ?? "-").split(/\r?\n/).map((line) => normalizePdfText(line)).join("\n") || "-";
}

function pdfFinalTableRowHeight(doc: PDFKit.PDFDocument, row: ExportRow, widths: number[], fonts: PdfFontPaths, header = false) {
  const font = header ? fonts.bold : fonts.regular;
  const fontSize = header ? 7.1 : 7.3;
  const heights = row.map((value, index) => {
    doc.font(font).fontSize(fontSize);
    return doc.heightOfString(pdfFinalTableCellText(value), { width: Math.max(12, widths[index]! - 8), lineGap: 2 });
  });
  return Math.max(24, Math.max(...heights, 0) + 10);
}

function drawFmeaFinalTableRow(doc: PDFKit.PDFDocument, row: ExportRow, widths: number[], fonts: PdfFontPaths, header = false, locale: ReportLocale = "en") {
  const y = doc.y;
  const height = pdfFinalTableRowHeight(doc, row, widths, fonts, header);
  let x = doc.page.margins.left;
  const cells = row.map((value, index) => ({ value, width: widths[index] ?? 20 }));
  if (locale === "fa") cells.reverse();
  cells.forEach(({ value, width }) => {
    doc.save();
    doc.rect(x, y, width, height).fillAndStroke(header ? "#1e5b8f" : "#ffffff", "#c9d9e5");
    doc.fillColor(header ? "#ffffff" : "#253746");
    doc.x = x + 4;
    doc.y = y + 4;
    drawPdfMultilineText(doc, pdfFinalTableCellText(value), fonts, Math.max(12, width - 8), header ? 7.1 : 7.3, header);
    doc.restore();
    x += width;
  });
  doc.y = y + height;
  return height;
}

export async function buildFmeaFinalTablePdfDocument(data: FmeaReportData, locale: ReportLocale = "en") {
  const labels = fmeaLabels(locale);
  const fonts = resolvePdfFontPaths();
  const headers = fmeaFinalTableHeaders(locale);
  const rows = fmeaFinalTableRows(data, locale);
  const processTitle = fmeaProcessTitle(data, locale);
  const allValues = [
    labels.finalTableTitle,
    labels.assessmentDetails,
    labels.process,
    processTitle,
    labels.company,
    fmeaCompanyName(data, locale),
    labels.date,
    reportDate(data.approvedAt ?? data.updatedAt, locale),
    labels.code,
    data.code,
    labels.project,
    data.project.name,
    labels.status,
    localizedFmeaStatus(data.status, locale),
    ...headers,
    ...rows.flat(),
  ];
  if (allValues.some((value) => hasPdfRtlText(String(value ?? ""))) && !fonts) throw new Error("A Unicode PDF font is required for Persian or Arabic report content");
  const resolvedFonts = fonts ?? { regular: "Helvetica", bold: "Helvetica-Bold" };
  const margin = 24;
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin, bufferPages: true, info: { Title: labels.finalTableTitle, Author: "NIVASafe" } });
  const chunks: Buffer[] = [];
  const complete = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  const tableWidth = doc.page.width - margin * 2;
  const baseWidths = [30, 105, 105, 100, 125, 25, 25, 25, 40, 62, 150];
  const widthScale = tableWidth / baseWidths.reduce((sum, width) => sum + width, 0);
  const widths = baseWidths.map((width) => width * widthScale);
  doc.save();
  doc.rect(0, 0, doc.page.width, 56).fill("#123f66");
  doc.restore();
  doc.fillColor("#ffffff");
  doc.font(resolvedFonts.bold).fontSize(15).text("NIVASafe", margin, 13, { width: tableWidth, lineBreak: false });
  doc.font(resolvedFonts.regular).fontSize(9);
  doc.y = 35;
  drawPdfText(doc, labels.finalTableTitle, resolvedFonts, tableWidth, 9);
  doc.y = 74;
  doc.fillColor("#253746");
  drawPdfSectionHeading(doc, labels.assessmentDetails, resolvedFonts, margin, tableWidth);
  drawPdfText(doc, `${labels.process}: ${processTitle}`, resolvedFonts, tableWidth, 8.5, true);
  doc.moveDown(0.15);
  drawPdfText(doc, `${labels.company}: ${fmeaCompanyName(data, locale)} | ${labels.date}: ${reportDate(data.approvedAt ?? data.updatedAt, locale)}`, resolvedFonts, tableWidth, 8.5);
  doc.moveDown(0.15);
  drawPdfText(doc, `${labels.code}: ${data.code} | ${labels.project}: ${data.project.name} | ${labels.status}: ${localizedFmeaStatus(data.status, locale)}`, resolvedFonts, tableWidth, 8.5);
  doc.moveDown(0.6);
  drawPdfSectionHeading(doc, labels.finalTableHeading, resolvedFonts, margin, tableWidth);
  const drawHeader = () => drawFmeaFinalTableRow(doc, [...headers], widths, resolvedFonts, true, locale);
  drawHeader();
  for (const row of rows.length ? rows : [Array.from({ length: headers.length }, () => "-")]) {
    const rowHeight = pdfFinalTableRowHeight(doc, row, widths, resolvedFonts);
    if (doc.y + rowHeight > doc.page.height - margin - 28) {
      doc.addPage();
      drawHeader();
    }
    drawFmeaFinalTableRow(doc, row, widths, resolvedFonts, false, locale);
  }
  const pageRange = doc.bufferedPageRange();
  for (let index = pageRange.start; index < pageRange.start + pageRange.count; index += 1) {
    doc.switchToPage(index);
    drawPdfFooter(doc, resolvedFonts, margin, index - pageRange.start + 1, pageRange.count, labels.footer);
  }
  doc.end();
  return complete;
}

function xmlEscape(value: unknown) {
  return String(value ?? "-").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F&<>"']/g, (character) => {
    if (character.charCodeAt(0) < 0x20) return "";
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character] ?? character;
  });
}

function excelExportCell(value: ExportCell): ExportCell {
  if (typeof value !== "string") return value;
  const trimmed = value.trimStart();
  if (/^[=+@]/.test(trimmed) || /^-\S/.test(trimmed)) return `'${value}`;
  return value;
}

function styleExportSheet(sheet: ExcelJS.Worksheet, widths: number[], locale: ReportLocale) {
  sheet.columns.forEach((column, index) => { column.width = widths[index] ?? 18; });
  sheet.eachRow((row, rowNumber) => {
    const values = Array.isArray(row.values) ? row.values as unknown[] : [];
    const visualLines = values.slice(1).reduce<number>((maximum, value, index) => {
      const width = Math.max(8, (widths[index] ?? 18) * 1.15);
      const lines = String(value ?? "-").split(/\r?\n/).reduce((total, line) => total + Math.max(1, Math.ceil(line.length / width)), 0);
      return Math.max(maximum, lines);
    }, 1);
    row.height = rowNumber === 1 ? 30 : Math.max(24, Math.min(180, 14 * visualLines + 12));
    row.eachCell((cell) => {
      cell.alignment = { vertical: "top", wrapText: true, horizontal: typeof cell.value === "number" ? "center" : locale === "fa" ? "right" : "left" };
      if (rowNumber === 1) {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E5B8F" } };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      } else if (rowNumber % 2 === 0) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F7FB" } };
      }
    });
  });
  sheet.views = [{ state: "frozen", ySplit: 1, rightToLeft: locale === "fa" }];
  if (sheet.rowCount > 1) sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: sheet.rowCount, column: sheet.columnCount } };
}

function addExportSheet(workbook: ExcelJS.Workbook, name: string, headers: string[], rows: ExportRow[], widths: number[], locale: ReportLocale = "en") {
  const sheet = workbook.addWorksheet(name);
  sheet.columns = headers.map((_, index) => ({ key: `column${index}`, width: widths[index] ?? 18 }));
  sheet.addRow(headers);
  rows.forEach((row) => sheet.addRow(row.map(excelExportCell)));
  styleExportSheet(sheet, widths, locale);
  return sheet;
}

type DashboardTone = "blue" | "green" | "amber" | "red" | "header";
const dashboardPalette: Record<DashboardTone, { fill: string; border: string; accent: string }> = {
  blue: { fill: "FFF1F7FC", border: "FFD7E5EF", accent: "FF1E5B8F" },
  green: { fill: "FFEEF9F4", border: "FFCFE7DC", accent: "FF18845C" },
  amber: { fill: "FFFFF7E9", border: "FFEEDDB9", accent: "FFBD7A1B" },
  red: { fill: "FFFFF1F1", border: "FFEFCFCF", accent: "FFC94A4D" },
  header: { fill: "FF123F66", border: "FF123F66", accent: "FFFFFFFF" },
};

function dashboardCellStyle(cell: ExcelJS.Cell, tone: DashboardTone, locale: ReportLocale, bold = false, size = 11, vertical: "top" | "middle" = "middle") {
  const colors = dashboardPalette[tone];
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.fill } };
  cell.font = { bold, size, color: { argb: colors.accent } };
  cell.alignment = { vertical, wrapText: true, horizontal: typeof cell.value === "number" ? "center" : locale === "fa" ? "right" : "left" };
  cell.border = {
    top: { style: "thin", color: { argb: colors.border } },
    left: { style: "thin", color: { argb: colors.border } },
    bottom: { style: "thin", color: { argb: colors.border } },
    right: { style: "thin", color: { argb: colors.border } },
  };
}

function dashboardMergedCell(sheet: ExcelJS.Worksheet, row: number, firstColumn: number, lastColumn: number, value: ExportCell, locale: ReportLocale, tone: DashboardTone, bold = false, size = 11) {
  if (lastColumn > firstColumn) sheet.mergeCells(row, firstColumn, row, lastColumn);
  const master = sheet.getCell(row, firstColumn);
  master.value = excelExportCell(value);
  for (let column = firstColumn; column <= lastColumn; column += 1) dashboardCellStyle(sheet.getCell(row, column), tone, locale, bold, size);
}

function createDashboardSheet(workbook: ExcelJS.Workbook, name: string, title: string, subtitle: string, locale: ReportLocale) {
  const sheet = workbook.addWorksheet(name);
  sheet.columns = [15, 30, 30, 12, 12, 12, 16, 14, 20].map((width, index) => ({ key: `dashboard${index + 1}`, width }));
  sheet.views = [{ showGridLines: false, rightToLeft: locale === "fa" }];
  sheet.properties.tabColor = { argb: "FF1E5B8F" };
  dashboardMergedCell(sheet, 1, 1, 9, "NIVASafe", locale, "header", true, 15);
  dashboardMergedCell(sheet, 2, 1, 9, title, locale, "blue", true, 19);
  dashboardMergedCell(sheet, 3, 1, 9, subtitle, locale, "blue", false, 10);
  sheet.getRow(1).height = 28;
  sheet.getRow(2).height = 34;
  sheet.getRow(3).height = 24;
  return sheet;
}

function dashboardSection(sheet: ExcelJS.Worksheet, row: number, title: string, locale: ReportLocale) {
  dashboardMergedCell(sheet, row, 1, 9, title, locale, "blue", true, 12);
  sheet.getRow(row).height = 25;
  return row + 1;
}

function dashboardFieldCards(sheet: ExcelJS.Worksheet, row: number, fields: Array<[string, ExportCell]>, locale: ReportLocale) {
  for (let offset = 0; offset < fields.length; offset += 3) {
    const chunk = fields.slice(offset, offset + 3);
    chunk.forEach(([label, value], index) => {
      const first = index * 3 + 1;
      dashboardMergedCell(sheet, row, first, first + 2, label, locale, "blue", false, 9);
      dashboardMergedCell(sheet, row + 1, first, first + 2, value, locale, "blue", true, 11);
    });
    sheet.getRow(row).height = 22;
    sheet.getRow(row + 1).height = 34;
    row += 2;
  }
  return row;
}

function dashboardMetricCards(sheet: ExcelJS.Worksheet, row: number, cards: Array<{ label: string; value: ExportCell; tone?: Exclude<DashboardTone, "header"> }>, locale: ReportLocale) {
  const spans: Array<[number, number]> = [[1, 2], [3, 4], [5, 6], [7, 9]];
  cards.slice(0, 4).forEach((card, index) => {
    const [first, last] = spans[index]!;
    const tone = card.tone ?? "blue";
    dashboardMergedCell(sheet, row, first, last, card.label, locale, tone, false, 9);
    dashboardMergedCell(sheet, row + 1, first, last, card.value, locale, tone, true, 16);
  });
  sheet.getRow(row).height = 24;
  sheet.getRow(row + 1).height = 36;
  return row + 2;
}

function dashboardTable(sheet: ExcelJS.Worksheet, row: number, headers: string[], rows: ExportRow[], locale: ReportLocale, spans?: number[]) {
  const columns = spans ?? headers.map(() => 1);
  const write = (values: ExportRow, targetRow: number, tone: DashboardTone, bold: boolean) => {
    let firstColumn = 1;
    columns.forEach((span, index) => {
      dashboardMergedCell(sheet, targetRow, firstColumn, firstColumn + span - 1, values[index] ?? "-", locale, tone, bold, bold ? 9 : 10);
      firstColumn += span;
    });
    sheet.getRow(targetRow).height = bold ? 30 : 42;
  };
  write(headers, row, "header", true);
  rows.forEach((values, index) => write(values, row + index + 1, index % 2 === 0 ? "blue" : "green", false));
  return row + rows.length + 1;
}

const DEFAULT_RULA_PREDICTION_NOTE = "Estimated from selected corrective actions; reassessment is required for the final RULA result.";
const INCOMPLETE_RULA_EXPLANATION = "Posture review is incomplete; the final RULA score is unavailable.";

type RulaExportModel = {
  assessment: RulaReportData | RulaReportExport["assessment"];
  reviewComplete: boolean;
  hasIndependentSides: boolean;
  detailsRows: Array<[string, ExportCell]>;
  summaryRows: ExportRow[];
  processRows: ExportRow[];
  impactRows: ExportRow[];
  factorRows: ExportRow[];
  dataRows: ExportRow[];
  suggestionRows: ExportRow[];
  actionRows: ExportRow[];
};

function isRulaActionSelected(status?: string) {
  return status ? !["CANCELLED", "REJECTED"].includes(status) : true;
}

const RULA_POSTURE_EXPORT_ROWS: Array<{ key: RulaPosturePart; group: "A" | "B"; label: string }> = [
  { key: "upperArm", group: "A", label: "Upper arm" },
  { key: "lowerArm", group: "A", label: "Lower arm" },
  { key: "wrist", group: "A", label: "Wrist" },
  { key: "wristTwist", group: "A", label: "Wrist twist" },
  { key: "neck", group: "B", label: "Neck" },
  { key: "trunk", group: "B", label: "Trunk" },
  { key: "legs", group: "B", label: "Legs" },
];

function rulaBodySides(bodySide: RulaReportData["bodySide"]): Array<"RIGHT" | "LEFT"> {
  return bodySide === "BOTH" ? ["RIGHT", "LEFT"] : [bodySide === "LEFT" ? "LEFT" : "RIGHT"];
}

function rulaAnalysisForSide(analysis: RulaPostureAnalysis | null | undefined, bodySide: RulaReportData["bodySide"], side: "RIGHT" | "LEFT") {
  if (!analysis) return null;
  return bodySide === "BOTH" ? analysis.sideAnalyses?.[side] ?? analysis : analysis;
}

function rulaFactorsForSide(factors: RulaReportExport["factors"], sideFactors: RulaReportExport["sideFactors"], bodySide: RulaReportData["bodySide"], side: "RIGHT" | "LEFT") {
  return bodySide === "BOTH" ? sideFactors?.[side] ?? factors : factors;
}

const rulaPostureExportLabels: Record<RulaPosturePart, { en: string; fa: string }> = {
  upperArm: { en: "Upper arm", fa: "بازو" },
  lowerArm: { en: "Lower arm", fa: "ساعد" },
  wrist: { en: "Wrist", fa: "مچ دست" },
  wristTwist: { en: "Wrist twist", fa: "چرخش مچ" },
  neck: { en: "Neck", fa: "گردن" },
  trunk: { en: "Trunk", fa: "تنه" },
  legs: { en: "Legs", fa: "پاها" },
};

function rulaPostureLabel(key: RulaPosturePart | string, locale: ReportLocale) {
  return rulaPostureExportLabels[key as RulaPosturePart]?.[locale] ?? key;
}

function rulaSourceLabel(source: string | undefined, locale: ReportLocale = "en") {
  if (locale === "fa") return source === "AI" ? "پیشنهاد هوش مصنوعی" : source === "USER" ? "ویرایش کاربر" : "مقدار پیش‌فرض";
  return source === "AI" ? "AI suggested" : source === "USER" ? "User edited" : "Default value";
}

function localizedRulaDetected(value: boolean | undefined, locale: ReportLocale) {
  if (value === undefined) return "-";
  return locale === "fa" ? value ? "بله" : "خیر" : value ? "Yes" : "No";
}

function localizedRulaImpactLevel(value: string, locale: ReportLocale) {
  if (locale === "en") return value;
  return ({ HIGH: "زیاد", MEDIUM: "متوسط", LOW: "کم" } as Record<string, string>)[value] ?? value;
}

function rulaImpactTone(value: string): "blue" | "green" | "amber" | "red" {
  const normalized = value.trim().toLocaleLowerCase();
  if (normalized === "high" || normalized === "زیاد") return "red";
  if (normalized === "medium" || normalized === "متوسط" || normalized.includes("review") || normalized.includes("بازبینی")) return "amber";
  if (normalized === "low" || normalized === "کم") return "green";
  return "blue";
}

function rulaPostureStatus(key: RulaPosturePart, row: RulaPostureResult, locale: ReportLocale = "en") {
  if (locale === "fa") {
    if (key === "wristTwist") return row.detected ? "وجود دارد" : "وجود ندارد";
    if (row.detected) return "تشخیص داده شد";
    return row.source === "DEFAULT" ? "در انتظار تشخیص" : "تشخیص داده نشد";
  }
  if (key === "wristTwist") return row.detected ? "Present" : "Not present";
  if (row.detected) return "Detected";
  return row.source === "DEFAULT" ? "Pending detection" : "Not detected";
}

function rulaScoreShare(row: RulaPostureResult, key: RulaPosturePart, factors: RulaReportExport["factors"], totalScore: number) {
  if (!isRulaPostureResultReviewed(row)) return null;
  const factor = factors.find((item) => item.key === key);
  return factor?.impactPercent ?? Math.round((row.score / totalScore) * 100);
}

function rulaExportRowsWithOptionalSide(rows: ExportRow[], hasIndependentSides: boolean) {
  return hasIndependentSides ? rows : rows.map(([, ...row]) => row);
}

function rulaImpactRowsWithOptionalSide(rows: ExportRow[], hasIndependentSides: boolean) {
  return rulaExportRowsWithOptionalSide(rows, hasIndependentSides);
}

function rulaActivityUnit(value: string | undefined, units: Record<string, string>) {
  return value ? ` ${units[value] ?? value}` : "";
}

function rulaActivityRows(activityInfo: RulaActivityInfoData | null | undefined, locale: ReportLocale = "en"): ExportRow[] {
  if (!activityInfo) return [];
  const labels = rulaLabels(locale);
  const units = locale === "fa"
    ? { SECOND: "ثانیه", MINUTE: "دقیقه", HOUR: "ساعت", KG: "کیلوگرم", LB: "پوند" }
    : { SECOND: "seconds", MINUTE: "minutes", HOUR: "hours", KG: "kg", LB: "lb" };
  const number = (value: number | undefined, unit: string | undefined, units: Record<string, string>) => value === undefined ? "-" : `${value}${rulaActivityUnit(unit, units)}`;
  return [
    [labels.jobTitle, activityInfo.jobTitle?.trim() || "-"],
    [labels.activity, activityInfo.taskDescription?.trim() || "-"],
    [labels.duration, number(activityInfo.durationPerOccurrence, activityInfo.durationUnit, units)],
    [labels.repetitions, activityInfo.repetitionsPerShift ?? "-"],
    [labels.postureHold, number(activityInfo.postureHoldDuration, activityInfo.postureHoldUnit, units)],
    [labels.loadWeight, activityInfo.loadWeight === null || activityInfo.loadWeight === undefined ? "-" : `${activityInfo.loadWeight}${rulaActivityUnit(activityInfo.loadUnit, units)}`],
    [labels.postureDescription, activityInfo.postureDescription?.trim() || "-"],
  ];
}

function rulaActionAffectedParts(action: { rulaImpact?: { affectedParts?: string[] } | null }, locale: ReportLocale = "en") {
  const affectedParts = action.rulaImpact?.affectedParts ?? [];
  return affectedParts.length
    ? affectedParts.map((part) => locale === "en" ? part : rulaPostureExportLabels[part as RulaPosturePart]?.[locale] ?? part).join(locale === "fa" ? "، " : ", ")
    : "-";
}

function rulaActionMatchesSuggestion(action: RulaReportExport["actions"][number], suggestion: NonNullable<RulaReportExport["suggestedActions"]>[number], suggestedSide: "LEFT" | "RIGHT" | "BOTH") {
  if (!isRulaActionSelected(action.status)) return false;
  const actionSide = action.bodySide ?? "BOTH";
  const sideMatches = actionSide === "BOTH" || suggestedSide === "BOTH" || actionSide === suggestedSide;
  const suggestionTitle = suggestion.titleEn || suggestion.titleFa;
  return sideMatches && (action.rulaImpact?.suggestionId === suggestion.id || action.title === suggestionTitle || action.title === suggestion.titleFa);
}

function rulaActionLevelForScore(score: number) {
  if (score <= 2) return 1;
  if (score <= 4) return 2;
  if (score <= 6) return 3;
  return 4;
}

function buildRulaExportModel(data: RulaReportData, report?: RulaReportExport, locale: ReportLocale = "en"): RulaExportModel {
  const labels = rulaLabels(locale);
  const assessment = report?.assessment ?? data;
  const reviewComplete = assessment.postureReviewComplete ?? report?.factors.every((factor) => factor.reviewed !== false) ?? true;
  const predictionNote = report?.predictedNote ?? (locale === "fa" ? "برای نتیجه نهایی پس از اجرای اقدامات، ارزیابی را تکرار کنید." : DEFAULT_RULA_PREDICTION_NOTE);
  const bodySide = assessment.bodySide === "LEFT" ? "LEFT" : assessment.bodySide === "BOTH" ? "BOTH" : "RIGHT";
  const postureAnalysis = assessment.postureAnalysis ?? data.postureAnalysis ?? null;
  const activeActions = report?.actions.filter((action) => isRulaActionSelected(action.status)) ?? [];
  const hasIndependentSides = bodySide === "BOTH" && Boolean(
    (postureAnalysis?.sideAnalyses?.LEFT && postureAnalysis.sideAnalyses.RIGHT)
      || (report?.sideFactors?.LEFT && report.sideFactors.RIGHT)
      || (report?.sideResults?.LEFT && report.sideResults.RIGHT),
  );
  const sides = hasIndependentSides ? ["RIGHT", "LEFT"] as const : rulaBodySides(bodySide === "BOTH" ? "RIGHT" : bodySide);
  const summaryRows: ExportRow[] = [
    [labels.title, assessment.title],
    [labels.project, assessment.project.name],
    [labels.score, reviewComplete ? assessment.score : "-"],
    [labels.actionLevel, reviewComplete ? assessment.actionLevel : "-"],
    [labels.status, localizedRulaStatus(assessment.status, locale)],
    [labels.explanation, reviewComplete ? assessment.explanation : labels.manualReview],
  ];

  if (report && reviewComplete) {
    summaryRows.push([labels.predictedScore, report.predictedScore], [labels.predictionNote, predictionNote]);
    if (bodySide === "BOTH" && report.sideResults) {
      for (const side of ["RIGHT", "LEFT"] as const) {
        const sideResult = report.sideResults[side];
        if (sideResult) summaryRows.push(
          [locale === "en" ? side + " score" : `${localizedRulaBodySide(side, locale)} ${labels.score}`, sideResult.score],
          [locale === "en" ? side + " action level" : `${localizedRulaBodySide(side, locale)} ${labels.actionLevel}`, sideResult.actionLevel],
          [locale === "en" ? side + " predicted score (estimate)" : `${localizedRulaBodySide(side, locale)} ${labels.predictedScore}`, report.predictedSideScores?.[side] ?? "-"],
        );
      }
    }
  }
  summaryRows.push([labels.bodySide, localizedRulaBodySide(bodySide, locale)], [labels.postureReview, reviewComplete ? labels.completed : labels.manualReview]);

  const detailsRows: Array<[string, ExportCell]> = [
    [labels.title, assessment.title],
    [labels.code, assessment.subjectCode?.trim() || "-"],
    [labels.project, assessment.project.name],
    [labels.date, reportDate(assessment.updatedAt ?? assessment.createdAt, locale)],
    [labels.status, localizedRulaStatus(assessment.status, locale)],
    [labels.method, "RULA"],
    [labels.version, assessment.version ?? "-"],
    [labels.bodySide, localizedRulaBodySide(bodySide, locale)],
    [labels.postureReview, reviewComplete ? labels.completed : labels.manualReview],
  ];

  const factorRows: ExportRow[] = [];
  const dataRows: ExportRow[] = [];
  for (const side of sides) {
    const sideFactors = rulaFactorsForSide(report?.factors ?? [], report?.sideFactors, bodySide, side);
    for (const factor of sideFactors) {
      factorRows.push([
        hasIndependentSides ? localizedRulaBodySide(side, locale) : "-",
        hasIndependentSides ? `${localizedRulaBodySide(side, locale)} / ${locale === "en" ? factor.key : rulaPostureLabel(factor.key as RulaPosturePart, locale)}` : (locale === "en" ? factor.key : rulaPostureLabel(factor.key as RulaPosturePart, locale)),
        factor.angle === null ? "-" : String(factor.angle) + "°",
        localizedRulaDetected(factor.detected, locale),
        factor.reviewed === false ? "-" : factor.score,
        factor.reviewed === false ? "-" : String(factor.impactPercent) + "%",
        factor.reviewed === false ? labels.manualReview : localizedRulaImpactLevel(factor.impactLevel, locale),
        rulaSourceLabel(factor.source, locale),
      ]);
    }
    const sideAnalysis = rulaAnalysisForSide(postureAnalysis, bodySide, side);
    if (!sideAnalysis) continue;
    const totalScore = Math.max(1, RULA_POSTURE_EXPORT_ROWS.reduce((sum, item) => sum + (isRulaPostureResultReviewed(sideAnalysis[item.key]) ? sideAnalysis[item.key].score : 0), 0));
    const sideFactorForRows = report?.factors ?? [];
    for (const [index, item] of RULA_POSTURE_EXPORT_ROWS.entries()) {
      const row = sideAnalysis[item.key];
      const reviewed = isRulaPostureResultReviewed(row);
      const scoreShare = rulaScoreShare(row, item.key, hasIndependentSides ? report?.sideFactors?.[side] ?? [] : sideFactorForRows, totalScore);
      const relatedActions = activeActions.filter((action) => action.rulaImpact?.affectedParts?.includes(item.key)
        && (!hasIndependentSides || !action.bodySide || action.bodySide === "BOTH" || action.bodySide === side));
      dataRows.push([
        hasIndependentSides ? localizedRulaBodySide(side, locale) : "-",
        index + 1,
        item.group,
        locale === "en" ? item.label : rulaPostureLabel(item.key, locale),
        row.angle === null ? "-" : String(row.angle) + "°",
        rulaPostureStatus(item.key, row, locale),
        reviewed ? row.score : "-",
        scoreShare === null ? "-" : String(scoreShare) + "%",
        relatedActions.length ? relatedActions.map((action) => action.title).join("\n") : labels.noSelectedActions,
      ]);
    }
  }

  const postureParts = new Set<RulaPosturePart>(RULA_POSTURE_EXPORT_ROWS.map((item) => item.key));
  const generalActions = activeActions.filter((action) => !(action.rulaImpact?.affectedParts ?? []).some((part) => postureParts.has(part as RulaPosturePart)));
  for (const action of generalActions) {
    dataRows.push([
      hasIndependentSides ? localizedRulaBodySide(action.bodySide ?? "BOTH", locale) : "-",
      "-",
      "-",
      labels.generalCorrectiveActions,
      "-",
      "-",
      "-",
      "-",
      `${action.title} (${localizedRulaPriority(action.priority, locale)})`,
    ]);
  }

  const suggestionRows: ExportRow[] = (report?.suggestedActions ?? []).slice(0, 6).map((suggestion) => {
    const suggestedSide = suggestion.bodySide ?? (bodySide === "BOTH" ? "BOTH" : bodySide);
    const selected = report?.actions.some((action) => rulaActionMatchesSuggestion(action, suggestion, suggestedSide)) ?? false;
    return [
      localizedRulaBodySide(suggestedSide, locale),
      suggestion.affectedParts.map((part) => locale === "en" ? part : rulaPostureExportLabels[part]?.[locale] ?? part).join(locale === "fa" ? "، " : ", ") || "-",
      locale === "fa" ? suggestion.titleFa || suggestion.titleEn : suggestion.titleEn || suggestion.titleFa,
      locale === "fa" ? suggestion.descriptionFa || suggestion.descriptionEn : suggestion.descriptionEn || suggestion.descriptionFa,
      localizedRulaPriority(suggestion.priority, locale),
      suggestion.scoreReduction,
      localizedRulaSelection(selected, locale),
    ];
  });

  const actionRows: ExportRow[] = report?.actions.filter((action) => isRulaActionSelected(action.status)).map((action) => [
    action.title,
    action.description,
    rulaActionAffectedParts(action, locale),
    localizedRulaBodySide(action.bodySide ?? undefined, locale),
    localizedRulaPriority(action.priority, locale),
    localizedRulaStatus(action.status, locale),
    localizedRulaSelection(isRulaActionSelected(action.status), locale),
    action.rulaImpact?.scoreReduction ?? 0,
  ]) ?? [];

  const processRows = rulaActivityRows(assessment.activityInfo ?? data.activityInfo, locale);
  const impactRows: ExportRow[] = [];
  if (report) {
    for (const side of sides) {
      const currentScore = hasIndependentSides ? report.sideResults?.[side]?.score ?? assessment.score : assessment.score;
      const predictedScore = hasIndependentSides
        ? report.predictedSideScores?.[side] ?? predictedRulaScore(currentScore, activeActions.filter((action) => !action.bodySide || action.bodySide === "BOTH" || action.bodySide === side).map((action) => action.rulaImpact))
        : report.predictedScore;
      impactRows.push(
        [hasIndependentSides ? localizedRulaBodySide(side, locale) : "-", labels.currentScore, reviewComplete ? currentScore : "-"],
        [hasIndependentSides ? localizedRulaBodySide(side, locale) : "-", labels.currentActionLevel, reviewComplete ? (report.sideResults?.[side]?.actionLevel ?? assessment.actionLevel) : "-"],
        [hasIndependentSides ? localizedRulaBodySide(side, locale) : "-", labels.predictedScore, reviewComplete ? predictedScore : "-"],
        [hasIndependentSides ? localizedRulaBodySide(side, locale) : "-", labels.predictedActionLevel, reviewComplete ? rulaActionLevelForScore(predictedScore) : "-"],
        [hasIndependentSides ? localizedRulaBodySide(side, locale) : "-", labels.predictionNote, reviewComplete ? predictionNote : labels.manualReview],
      );
    }
  }

  return { assessment, reviewComplete, hasIndependentSides, detailsRows, summaryRows, processRows, impactRows, factorRows, dataRows, suggestionRows, actionRows };
}

type RulaOverviewExport = {
  totalFactorScore: number;
  factorDistribution: Array<{ label: string; score: number; count: number; percentage: number; color: string }>;
  selectedRecommendationCount: number;
  remainingRecommendationCount: number;
  recommendationCount: number;
  selectionPercent: number;
  manualActionCount: number;
  estimatedScoreReduction: number;
};

function buildRulaOverviewExport(model: RulaExportModel, report: RulaReportExport | undefined, locale: ReportLocale): RulaOverviewExport {
  const labels = rulaLabels(locale);
  const groups = new Map<"HIGH" | "MEDIUM" | "LOW", { score: number; count: number; color: string; label: string }>([
    ["HIGH", { score: 0, count: 0, color: "#c94a4d", label: labels.highFactors }],
    ["MEDIUM", { score: 0, count: 0, color: "#bd7a1b", label: labels.mediumFactors }],
    ["LOW", { score: 0, count: 0, color: "#18845c", label: labels.lowFactors }],
  ]);
  if (model.reviewComplete) {
    for (const row of model.factorRows) {
      const score = Number(row[4]);
      if (!Number.isFinite(score) || score <= 0) continue;
      const tone = rulaImpactTone(exportText(row[6]));
      const level = tone === "red" ? "HIGH" : tone === "amber" ? "MEDIUM" : tone === "green" ? "LOW" : null;
      if (!level) continue;
      const group = groups.get(level)!;
      group.score += score;
      group.count += 1;
    }
  }
  const totalFactorScore = [...groups.values()].reduce((sum, group) => sum + group.score, 0);
  const factorDistribution = [...groups.values()].map((group) => ({
    label: group.label,
    score: group.score,
    count: group.count,
    percentage: totalFactorScore ? Math.round(group.score / totalFactorScore * 100) : 0,
    color: group.color,
  }));
  const recommendationCount = model.suggestionRows.length;
  const selectedRecommendationCount = Math.min(recommendationCount, model.suggestionRows.filter((row) => row[6] === labels.selected).length);
  const selectionPercent = recommendationCount ? Math.round(selectedRecommendationCount / recommendationCount * 100) : 0;
  const suggestions = report?.suggestedActions ?? [];
  const activeActions = report?.actions.filter((action) => isRulaActionSelected(action.status)) ?? [];
  const manualActionCount = activeActions.filter((action) => !suggestions.some((suggestion) => {
    const suggestedSide = suggestion.bodySide ?? (model.assessment.bodySide === "BOTH" ? "BOTH" : model.assessment.bodySide ?? "RIGHT");
    return rulaActionMatchesSuggestion(action, suggestion, suggestedSide);
  })).length;
  const estimatedScoreReduction = model.reviewComplete && report
    ? Math.max(0, model.assessment.score - report.predictedScore)
    : 0;
  return {
    totalFactorScore,
    factorDistribution,
    selectedRecommendationCount,
    remainingRecommendationCount: recommendationCount - selectedRecommendationCount,
    recommendationCount,
    selectionPercent,
    manualActionCount,
    estimatedScoreReduction,
  };
}

function rulaPdfRows(headers: string[], rows: ExportRow[], emptyLabel: string) {
  return [headers.join(" | "), ...(rows.length ? rows : [headers.map(() => emptyLabel)]).map((row) => row.map((value) => String(value ?? "-")).join(" | "))];
}

export function buildRulaPdfLines(data: RulaReportData, report?: RulaReportExport, locale: ReportLocale = "en") {
  const labels = rulaLabels(locale);
  const model = buildRulaExportModel(data, report, locale);
  const factorHeaders = [
    ...(model.hasIndependentSides ? [labels.bodySide] : []),
    ...(locale === "en" ? ["Main factor"] : [labels.factor]),
    labels.angle, labels.detected, labels.score, labels.contribution, labels.effect, labels.source,
  ];
  const dataHeaders = [
    ...(model.hasIndependentSides ? [labels.bodySide] : []),
    labels.row, labels.group, labels.bodyPart, labels.detectedAngle, labels.detectedStatus,
    labels.suggestedScore, labels.scoreShare, labels.selectedActions,
  ];
  const correctionHeaders = [labels.bodySide, labels.relatedFactors, labels.suggestedAction, labels.description, labels.priority, labels.estimatedReduction, labels.selection];
  const impactHeaders = model.hasIndependentSides ? [labels.bodySide, labels.field, labels.value] : [labels.field, labels.value];
  const actionHeaders = locale === "en"
    ? ["Action", "Description", "Related factors", "Body side", "Priority", "Status", "Selection", "Estimated reduction"]
    : [labels.action, labels.description, labels.relatedFactors, labels.bodySide, labels.priority, labels.status, labels.selection, labels.estimatedReduction];
  const assessmentDetailsHeading = locale === "en" ? "ASSESSMENT DETAILS" : labels.assessmentDetails;
  const summaryHeading = locale === "en" ? "RULA ASSESSMENT SUMMARY" : labels.summary;
  const processHeading = locale === "en" ? "PROCESS INFORMATION" : labels.processInformation;
  const impactHeading = locale === "en" ? "PREDICTED EFFECT" : labels.predictedEffect;
  const factorsHeading = locale === "en" ? "MAIN FACTORS" : labels.mainFactors;
  const dataHeading = locale === "en" ? "RULA ASSESSMENT DATA" : labels.assessmentData;
  const correctionsHeading = locale === "en" ? "PROPOSED CORRECTIVE ACTIONS" : labels.proposedActions;
  const actionsHeading = locale === "en" ? "SELECTED CORRECTIVE ACTIONS" : labels.selectedActions;
  const keyValueLines = (rows: ExportRow[]) => rows.map(([key, value]) => `${key}: ${value ?? "-"}`);
  const tableSection = (heading: string, headers: string[], rows: ExportRow[]) => [heading, ...rulaPdfRows(headers, rows, labels.noData), ""];

  return [
    assessmentDetailsHeading,
    ...keyValueLines(model.detailsRows),
    "",
    summaryHeading,
    ...keyValueLines(model.summaryRows),
    "",
    processHeading,
    ...keyValueLines(model.processRows),
    "",
    ...(model.impactRows.length ? tableSection(impactHeading, impactHeaders, rulaImpactRowsWithOptionalSide(model.impactRows, model.hasIndependentSides)) : []),
    ...(report ? [
      ...tableSection(factorsHeading, factorHeaders, rulaExportRowsWithOptionalSide(model.factorRows, model.hasIndependentSides)),
      ...tableSection(dataHeading, dataHeaders, rulaExportRowsWithOptionalSide(model.dataRows, model.hasIndependentSides).length
        ? rulaExportRowsWithOptionalSide(model.dataRows, model.hasIndependentSides)
        : [dataHeaders.map((_, index) => index === (model.hasIndependentSides ? 3 : 2) ? labels.noData : "-")]),
      ...tableSection(correctionsHeading, correctionHeaders, model.suggestionRows),
      ...tableSection(actionsHeading, actionHeaders, model.actionRows),
    ] : []),
  ];
}

export function buildRulaReportPdfDocument(data: RulaReportData, report?: RulaReportExport, locale: ReportLocale = "en") {
  const labels = rulaLabels(locale);
  const model = buildRulaExportModel(data, report, locale);
  const overview = buildRulaOverviewExport(model, report, locale);
  const assessment = model.assessment;
  const dataHeaders = [
    ...(model.hasIndependentSides ? [labels.bodySide] : []),
    labels.row, labels.group, labels.bodyPart, labels.detectedAngle, labels.detectedStatus,
    labels.suggestedScore, labels.scoreShare, labels.selectedActions,
  ];
  const correctionHeaders = [labels.bodySide, labels.relatedFactors, labels.suggestedAction, labels.description, labels.priority, labels.estimatedReduction, labels.selection];
  const impactHeaders = model.hasIndependentSides ? [labels.bodySide, labels.field, labels.value] : [labels.field, labels.value];
  const actionHeaders = locale === "en"
    ? ["Action", "Description", "Related factors", "Body side", "Priority", "Status", "Selection", "Estimated reduction"]
    : [labels.action, labels.description, labels.relatedFactors, labels.bodySide, labels.priority, labels.status, labels.selection, labels.estimatedReduction];
  const factorCards = model.factorRows.map((row) => {
    const side = model.hasIndependentSides ? exportText(row[0]) : "-";
    const sidePrefix = side === "-" ? "" : `${side} / `;
    const rawFactor = exportText(row[1]);
    const factor = sidePrefix && rawFactor.startsWith(sidePrefix) ? rawFactor.slice(sidePrefix.length) : rawFactor;
    const effect = exportText(row[6]);
    const source = exportText(row[7]);
    return {
      side,
      factor,
      angle: exportText(row[2]),
      detected: exportText(row[3]),
      score: exportText(row[4]),
      contribution: exportText(row[5]),
      effect,
      source: source === "AI suggested" || source === "پیشنهاد هوش مصنوعی" ? "" : source === "-" ? "" : source,
      tone: rulaImpactTone(effect),
    };
  });
  const score = model.reviewComplete ? assessment.score : "-";
  const actionLevel = model.reviewComplete ? assessment.actionLevel : "-";
  const predicted = model.reviewComplete && report ? report.predictedScore : "-";
  const review = model.reviewComplete ? labels.completed : labels.manualReview;
  const detailLabels = new Set<string>([labels.title, labels.project, labels.score, labels.actionLevel, labels.status, labels.bodySide, labels.postureReview, labels.predictedScore, labels.predictionNote]);
  const supplementalSummaryRows = model.summaryRows.filter(([key]) => typeof key === "string" && !detailLabels.has(key));
  const blocks: ReportPdfBlock[] = [
    { kind: "metrics", heading: labels.summary, cards: [
      { label: labels.score, value: score, tone: model.reviewComplete ? "blue" : "amber" },
      { label: labels.actionLevel, value: actionLevel, tone: model.reviewComplete ? "amber" : "amber" },
      { label: labels.predictedScore, value: predicted, tone: "green" },
      { label: labels.postureReview, value: review, tone: model.reviewComplete ? "green" : "amber" },
    ] },
    ...(report ? [
      { kind: "distribution" as const, heading: labels.factorDistribution, centerLabel: locale === "fa" ? "امتیاز" : "Score", centerValue: overview.totalFactorScore, rows: overview.factorDistribution.map((row) => ({ ...row, weight: row.score })) },
      { kind: "progress" as const, heading: labels.correctionProgress, progress: overview.selectionPercent, centerLabel: `${overview.selectedRecommendationCount} / ${overview.recommendationCount}`, rows: [
        { label: labels.selectedRecommendations, count: overview.selectedRecommendationCount, color: "#18845c" },
        { label: labels.remainingRecommendations, count: overview.remainingRecommendationCount, color: "#bd7a1b" },
        { label: labels.manualActions, count: overview.manualActionCount, color: "#1e5b8f" },
      ] },
    ] : []),
    { kind: "keyValues", heading: labels.assessmentDetails, rows: model.detailsRows },
    ...(supplementalSummaryRows.length ? [{ kind: "keyValues" as const, heading: locale === "en" ? "Additional result details" : "جزئیات تکمیلی نتیجه", rows: supplementalSummaryRows }] : []),
    ...(report ? [
      { kind: "factorCards" as const, heading: labels.mainFactors, rows: factorCards },
      { kind: "table" as const, heading: labels.proposedActions, headers: correctionHeaders, rows: model.suggestionRows.length ? model.suggestionRows : [["-", "-", labels.noData, "-", "-", "-", "-"]], widths: [1, 1.6, 2.2, 3, 0.8, 0.9, 0.9] },
    ] : []),
    ...(model.impactRows.length ? [{ kind: "table" as const, heading: labels.predictedEffect, headers: impactHeaders, rows: rulaImpactRowsWithOptionalSide(model.impactRows, model.hasIndependentSides), widths: model.hasIndependentSides ? [1, 2, 1] : [2, 1] }] : []),
    ...(model.processRows.length ? [{ kind: "keyValues" as const, heading: labels.processInformation, rows: model.processRows }] : []),
    ...(report ? [
      { kind: "table" as const, heading: labels.assessmentData, headers: dataHeaders, rows: rulaExportRowsWithOptionalSide(model.dataRows, model.hasIndependentSides).length
        ? rulaExportRowsWithOptionalSide(model.dataRows, model.hasIndependentSides)
        : [dataHeaders.map((_, index) => index === (model.hasIndependentSides ? 3 : 2) ? labels.noData : "-")], widths: model.hasIndependentSides ? [1, 0.45, 0.45, 1.2, 0.9, 1, 0.8, 0.7, 2.2] : [0.45, 0.45, 0.45, 1.2, 0.9, 1, 0.8, 2.2] },
      { kind: "table" as const, heading: labels.selectedActions, headers: actionHeaders, rows: model.actionRows.length ? model.actionRows : [[labels.noSelectedActions, "-", "-", "-", "-", "-", "-", 0]], widths: [2, 3.2, 1.7, 1, 0.8, 1, 1, 1] },
    ] : []),
  ];
  return drawStyledReportPdf(labels.reportTitle, assessment.title, blocks, locale, labels.footer);
}

export async function buildFmeaWorkbook(data: FmeaReportData, locale: ReportLocale = "en", pageReport?: FmeaReportPayload) {
  const labels = fmeaLabels(locale);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "NIVASafe";
  workbook.subject = labels.reportTitle;
  const exportData: FmeaReportData = pageReport
    ? { ...data, riskThresholds: pageReport.riskThresholds, actions: pageReport.actions }
    : data;
  const items = fmeaItemsForOutput(exportData);
  const summary = pageReport?.summary ?? summariseFmea(items);
  const actions = exportData.actions;
  const summaryHeaders = locale === "en" ? ["Metric", "Value"] : [labels.field, labels.value];
  const tableHeaders = fmeaFinalTableHeaders(locale);
  const extendedHeaders = locale === "en"
    ? ["Row", "Process / activity", "Failure mode", "Failure effect", "Failure cause", "Current controls", "S", "O", "D", "AP", "RPN", "Risk level", "Recommended action"]
    : [labels.row, labels.processActivity, labels.failureMode, labels.effect, labels.cause, labels.currentControls, labels.severity, labels.occurrence, labels.detection, labels.actionPriority, labels.rpn, labels.riskLevel, labels.recommendedAction];
  const topItems = (pageReport?.topFailureModes ?? topFailureModes(items.map((item) => ({ ...item, actionPriority: actionPriority(item.riskLevel) }))).slice(0, 5)).slice(0, 5);
  const topHeaders = locale === "en"
    ? ["Row", "Failure mode", "Effect", "S", "O", "D", "AP", "RPN", "Risk level"]
    : [labels.row, labels.failureMode, labels.effect, "S", "O", "D", labels.actionPriority, labels.rpn, labels.riskLevel];
  const topRows = topItems.map((item) => [item.rowNumber, item.failureMode, item.effect, item.severity, item.occurrence, item.detection, localizedFmeaActionPriority(item.actionPriority, locale), item.rpn, localizedFmeaRiskLevel(item.riskLevel, locale)]);
  const suggestions = pageReport?.suggestedActions.map((item) => ({
    fmeaItemId: item.fmeaItemId,
    risk: `#${pageReport.items.find((risk) => risk.id === item.fmeaItemId)?.rowNumber ?? "-"} · ${item.failureMode}`,
    title: item.title,
    priority: item.priority,
  })) ?? fmeaSuggestedActions(exportData).map((item) => ({
    fmeaItemId: exportData.items.find((risk) => risk.rowNumber === item.rowNumber)?.id ?? null,
    risk: `#${item.rowNumber} · ${item.failureMode}`,
    title: item.recommendation!.trim(),
    priority: actionPriority(item.riskLevel),
  }));
  const suggestionHeaders = locale === "en" ? ["Related risk", "Proposed action", "Priority", "Status"] : [labels.relatedRisk, labels.recommendedAction, labels.priority, labels.actionStatus];
  const suggestionRows = suggestions.filter((suggestion) => !actions.some((action) => action.fmeaItemId === suggestion.fmeaItemId && action.title.trim().toLocaleLowerCase() === suggestion.title.trim().toLocaleLowerCase())).slice(0, 5)
    .map((suggestion) => [suggestion.risk, suggestion.title, localizedFmeaActionPriority(suggestion.priority, locale), locale === "fa" ? "پیشنهادی" : "Suggested"]);
  const actionMetrics = fmeaActionMetrics(actions);
  const overview = createDashboardSheet(workbook, "OVERVIEW", labels.reportTitle, `${data.title} · ${labels.code}: ${data.code}`, locale);
  let overviewRow = dashboardSection(overview, 5, labels.header, locale);
  overviewRow = dashboardFieldCards(overview, overviewRow, [
    [labels.process, fmeaProcessTitle(data, locale)], [labels.company, fmeaCompanyName(data, locale)],
    [labels.date, reportDate(data.approvedAt ?? data.updatedAt, locale)], [labels.code, data.code],
    [labels.project, data.project.name], [labels.status, localizedFmeaStatus(data.status, locale)],
    [labels.method, "FMEA"], [labels.team, pageReport?.assessment.evaluationTeam.length ?? data.evaluationTeam?.length ?? 0],
    [labels.version, data.version ?? "-"],
  ], locale) + 1;
  overviewRow = dashboardSection(overview, overviewRow, labels.summary, locale);
  overviewRow = dashboardMetricCards(overview, overviewRow, [
    { label: labels.totalFailureModes, value: summary.totalFailureModes, tone: "blue" },
    { label: labels.highPriorityRisks, value: summary.highPriorityRisks, tone: "red" },
    { label: labels.correctiveActionsNeeded, value: summary.correctiveActionsNeeded, tone: "amber" },
    { label: labels.immediateActions, value: summary.immediateActions, tone: "red" },
  ], locale) + 1;
  overviewRow = dashboardSection(overview, overviewRow, labels.riskDistribution, locale);
  const fmeaDistributionRows: ExportRow[] = (["CRITICAL", "HIGH", "MEDIUM", "LOW", "VERY_LOW"] as const).map((level) => {
    const count = summary.distribution[level];
    const share = summary.totalFailureModes ? Math.round(count / summary.totalFailureModes * 1000) / 10 : 0;
    return [localizedFmeaRiskLevel(level, locale), count, `${share}%`, "■".repeat(Math.round(share / 10)) || "—"];
  });
  overviewRow = dashboardTable(overview, overviewRow, [labels.riskLevel, labels.count, labels.share, locale === "fa" ? "نمودار سهم" : "Distribution"], fmeaDistributionRows, locale, [2, 1, 1, 5]) + 1;
  overviewRow = dashboardSection(overview, overviewRow, labels.actionRegister, locale);
  overviewRow = dashboardMetricCards(overview, overviewRow, [
    { label: labels.progress, value: `${actionMetrics.progress}%`, tone: "green" },
    { label: labels.completedActions, value: actionMetrics.completed, tone: "green" },
    { label: labels.activeActions, value: actionMetrics.active, tone: "amber" },
    { label: labels.remainingActions, value: Math.max(0, actions.length - actionMetrics.completed - actionMetrics.active), tone: "blue" },
  ], locale) + 1;
  overviewRow = dashboardSection(overview, overviewRow, labels.topFailureModes, locale);
  overviewRow = dashboardTable(overview, overviewRow, topHeaders, topRows, locale) + 1;
  overviewRow = dashboardSection(overview, overviewRow, labels.proposedActions, locale);
  overviewRow = dashboardTable(overview, overviewRow, suggestionHeaders, suggestionRows.length ? suggestionRows : [[labels.noRecommendations, "-", "-", "-"]], locale, [2, 4, 1, 2]) + 1;
  overviewRow = dashboardSection(overview, overviewRow, labels.actionRegister, locale);
  const dashboardActionHeaders = locale === "en"
    ? ["Related risk", "Title", "Description", "Priority", "Status", "Assignee", "Progress", "Due date"]
    : [labels.relatedRisk, labels.title, labels.description, labels.priority, labels.actionStatus, labels.assignee, labels.actionProgress, labels.dueDate];
  const dashboardActionRows: ExportRow[] = actions.length ? actions.map((action) => [
    action.fmeaItem ? `#${action.fmeaItem.rowNumber} · ${action.fmeaItem.failureMode}` : "-", action.title,
    action.description, localizedFmeaActionPriority(action.priority, locale), localizedFmeaStatus(action.status, locale),
    action.assigneeName ?? "-", `${Math.max(0, Math.min(100, Number(action.progress) || 0))}%`, reportDate(action.dueDate, locale),
  ]) : [[labels.noActions, "-", "-", "-", "-", "-", "-", "-"]];
  dashboardTable(overview, overviewRow, dashboardActionHeaders, dashboardActionRows, locale, [1, 1, 2, 1, 1, 1, 1, 1]);
  const finalTableRows = fmeaFinalTableRows(exportData, locale);
  const extendedRows = fmeaExportRows(exportData, locale);
  addExportSheet(workbook, "FMEA", tableHeaders, finalTableRows.length ? finalTableRows : [tableHeaders.map((_, index) => index === 1 ? labels.noRows : "-")], FMEA_FINAL_TABLE_WIDTHS, locale);
  addExportSheet(workbook, "FMEA DATA", extendedHeaders, extendedRows.length ? extendedRows : [extendedHeaders.map((_, index) => index === 2 ? labels.noRows : "-")], [8, 24, 26, 28, 28, 34, 7, 7, 7, 10, 10, 14, 44], locale);
  addExportSheet(workbook, "SUMMARY", summaryHeaders, [
    [locale === "en" ? "Assessment title" : labels.title, data.title], [labels.code, data.code], [labels.project, data.project.name],
    [labels.company, fmeaCompanyName(data, locale)], [labels.status, localizedFmeaStatus(data.status, locale)],
    [labels.date, reportDate(data.approvedAt ?? data.updatedAt, locale)], [labels.totalFailureModes, summary.totalFailureModes],
    [labels.highPriorityRisks, summary.highPriorityRisks], [labels.correctiveActionsNeeded, summary.correctiveActionsNeeded],
    [labels.immediateActions, summary.immediateActions], [localizedFmeaRiskLevel("CRITICAL", locale), summary.distribution.CRITICAL],
    [localizedFmeaRiskLevel("HIGH", locale), summary.distribution.HIGH], [localizedFmeaRiskLevel("MEDIUM", locale), summary.distribution.MEDIUM],
    [localizedFmeaRiskLevel("LOW", locale), summary.distribution.LOW], [localizedFmeaRiskLevel("VERY_LOW", locale), summary.distribution.VERY_LOW],
  ], [34, 90], locale);
  addExportSheet(workbook, "PROCESS", summaryHeaders, [
    [locale === "en" ? "Job/process" : labels.process, fmeaProcessTitle(data, locale)], [labels.department, data.department ?? "-"],
    [labels.activity, data.activityDescription ?? "-"], [labels.equipment, reportList(data.equipment)], [labels.materials, reportList(data.materials)],
    [labels.existingControls, reportList(data.existingControls)], [labels.specialConditions, data.specialConditions ?? "-"],
  ], [34, 90], locale);
  addExportSheet(workbook, "RISK DISTRIBUTION", locale === "en" ? ["Risk level", "Count", "Share"] : [labels.riskLevel, labels.count, labels.share],
    (["CRITICAL", "HIGH", "MEDIUM", "LOW", "VERY_LOW"] as const).map((level) => [localizedFmeaRiskLevel(level, locale), summary.distribution[level], `${summary.totalFailureModes ? Math.round(summary.distribution[level] / summary.totalFailureModes * 1000) / 10 : 0}%`]), [28, 14, 14], locale);
  addExportSheet(workbook, "TOP RISKS", topHeaders, topRows, [8, 32, 36, 8, 8, 8, 16, 12, 18], locale);
  addExportSheet(workbook, "PROPOSED ACTIONS", suggestionHeaders, suggestionRows.length ? suggestionRows : [[labels.noRecommendations, "-", "-", "-"]], [30, 56, 18, 18], locale);
  const actionHeaders = locale === "en"
    ? ["Related risk", "Title", "Description", "Priority", "Status", "Assignee", "Progress", "Due date"]
    : [labels.relatedRisk, labels.title, labels.description, labels.priority, labels.actionStatus, labels.assignee, labels.actionProgress, labels.dueDate];
  const actionSheetRows = actions.map((action) => [
    action.fmeaItem ? `#${action.fmeaItem.rowNumber} · ${action.fmeaItem.failureMode}` : "-", action.title, action.description,
    localizedFmeaActionPriority(action.priority, locale), localizedFmeaStatus(action.status, locale), action.assigneeName ?? "-",
    action.progress, reportDate(action.dueDate, locale),
  ]);
  addExportSheet(workbook, "ACTIONS", actionHeaders, actionSheetRows.length ? actionSheetRows : [[labels.noActions, "-", "-", "-", "-", "-", "-", "-"]], [28, 28, 40, 14, 18, 24, 12, 16], locale);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function buildFmeaFinalTableWorkbook(data: FmeaReportData, locale: ReportLocale = "en") {
  const labels = fmeaLabels(locale);
  const workbook = new ExcelJS.Workbook();
  addExportSheet(workbook, "FMEA", fmeaFinalTableHeaders(locale), fmeaFinalTableRows(data, locale), FMEA_FINAL_TABLE_WIDTHS, locale);
  {
    addExportSheet(workbook, "DETAILS", [labels.field, labels.value], [
      [labels.process, fmeaProcessTitle(data, locale)],
      [labels.company, fmeaCompanyName(data, locale)],
      [labels.date, reportDate(data.approvedAt ?? data.updatedAt, locale)],
      [labels.code, data.code],
      [labels.project, data.project.name],
      [labels.status, localizedFmeaStatus(data.status, locale)],
      [labels.method, "FMEA"],
      [labels.version, data.version ?? "-"],
    ], [34, 110], locale);
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function buildRulaWorkbook(data: RulaReportData, report?: RulaReportExport, locale: ReportLocale = "en") {
  const labels = rulaLabels(locale);
  const workbook = new ExcelJS.Workbook();
  const model = buildRulaExportModel(data, report, locale);
  const fieldValueHeaders = [labels.field, labels.value];
  const factorHeaders = [
    ...(model.hasIndependentSides ? [labels.bodySide] : []),
    ...(locale === "en" ? ["Main factor"] : [labels.factor]),
    labels.angle, labels.detected, labels.score, labels.contribution, labels.effect, labels.source,
  ];
  const dataHeaders = [
    ...(model.hasIndependentSides ? [labels.bodySide] : []),
    labels.row, labels.group, labels.bodyPart, labels.detectedAngle, labels.detectedStatus,
    labels.suggestedScore, labels.scoreShare, labels.selectedActions,
  ];
  const correctionHeaders = [labels.bodySide, labels.relatedFactors, labels.suggestedAction, labels.description, labels.priority, labels.estimatedReduction, labels.selection];
  const actionHeaders = locale === "en"
    ? ["Action", "Description", "Related factors", "Body side", "Priority", "Status", "Selection", "Estimated reduction"]
    : [labels.action, labels.description, labels.relatedFactors, labels.bodySide, labels.priority, labels.status, labels.selection, labels.estimatedReduction];
  const overview = createDashboardSheet(workbook, "RULA", labels.reportTitle, `${model.assessment.title} · ${labels.code}: ${model.assessment.subjectCode?.trim() || "-"}`, locale);
  let overviewRow = dashboardSection(overview, 5, labels.assessmentDetails, locale);
  overviewRow = dashboardFieldCards(overview, overviewRow, model.detailsRows.map(([label, value]) => [String(label ?? ""), value] as [string, ExportCell]), locale) + 1;
  overviewRow = dashboardSection(overview, overviewRow, labels.summary, locale);
  overviewRow = dashboardMetricCards(overview, overviewRow, [
    { label: labels.score, value: model.reviewComplete ? model.assessment.score : "-", tone: model.reviewComplete ? "blue" : "amber" },
    { label: labels.actionLevel, value: model.reviewComplete ? model.assessment.actionLevel : "-", tone: "amber" },
    { label: labels.predictedScore, value: model.reviewComplete && report ? report.predictedScore : "-", tone: "green" },
    { label: labels.postureReview, value: model.reviewComplete ? labels.completed : labels.manualReview, tone: model.reviewComplete ? "green" : "amber" },
  ], locale) + 1;
  const coreSummaryLabels = new Set([
    labels.title, labels.project, labels.score, labels.actionLevel, labels.status, labels.explanation,
    labels.bodySide, labels.postureReview, labels.predictedScore, labels.predictionNote,
  ]);
  const sideSummaryRows = model.summaryRows.filter(([key]) => typeof key === "string" && !coreSummaryLabels.has(key));
  if (sideSummaryRows.length) {
    overviewRow = dashboardSection(overview, overviewRow, labels.additionalDetails, locale);
    overviewRow = dashboardTable(overview, overviewRow, fieldValueHeaders, sideSummaryRows, locale, [3, 6]) + 1;
  }
  if (report) {
    const rulaOverview = buildRulaOverviewExport(model, report, locale);
    overviewRow = dashboardSection(overview, overviewRow, labels.factorDistribution, locale);
    const distributionRows: ExportRow[] = rulaOverview.factorDistribution.map((factor) => [
      factor.label,
      factor.count,
      factor.score,
      `${factor.percentage}%`,
      "■".repeat(Math.round(factor.percentage / 10)) || "—",
    ]);
    overviewRow = dashboardTable(overview, overviewRow, [labels.effect, labels.count, labels.factorScore, labels.share, locale === "fa" ? "نمودار سهم" : "Distribution"], distributionRows, locale, [2, 1, 1, 1, 4]) + 1;
    overviewRow = dashboardSection(overview, overviewRow, labels.correctionProgress, locale);
    overviewRow = dashboardMetricCards(overview, overviewRow, [
      { label: labels.selectedRecommendations, value: `${rulaOverview.selectedRecommendationCount} / ${rulaOverview.recommendationCount}`, tone: "green" },
      { label: labels.remainingRecommendations, value: rulaOverview.remainingRecommendationCount, tone: "amber" },
      { label: labels.manualActions, value: rulaOverview.manualActionCount, tone: "blue" },
      { label: labels.estimatedScoreReduction, value: rulaOverview.estimatedScoreReduction, tone: "green" },
    ], locale) + 1;
    overviewRow = dashboardSection(overview, overviewRow, labels.mainFactors, locale);
    overviewRow = dashboardTable(overview, overviewRow, factorHeaders, rulaExportRowsWithOptionalSide(model.factorRows, model.hasIndependentSides).length
      ? rulaExportRowsWithOptionalSide(model.factorRows, model.hasIndependentSides)
      : [factorHeaders.map((_, index) => index === (model.hasIndependentSides ? 1 : 0) ? labels.noData : "-")], locale,
    model.hasIndependentSides ? [1, 2, 1, 1, 1, 1, 1, 1] : [2, 1, 1, 1, 1, 1, 2]) + 1;
    overviewRow = dashboardSection(overview, overviewRow, labels.proposedActions, locale);
    overviewRow = dashboardTable(overview, overviewRow, correctionHeaders, model.suggestionRows.length
      ? model.suggestionRows
      : [correctionHeaders.map((_, index) => index === 2 ? labels.noData : "-")], locale, [1, 1, 2, 2, 1, 1, 1]) + 1;
    if (model.impactRows.length) {
      overviewRow = dashboardSection(overview, overviewRow, labels.predictedEffect, locale);
      overviewRow = dashboardTable(overview, overviewRow, model.hasIndependentSides ? [labels.bodySide, labels.field, labels.value] : fieldValueHeaders, rulaImpactRowsWithOptionalSide(model.impactRows, model.hasIndependentSides), locale) + 1;
    }
  }
  if (model.processRows.length) {
    overviewRow = dashboardSection(overview, overviewRow, labels.processInformation, locale);
    overviewRow = dashboardTable(overview, overviewRow, fieldValueHeaders, model.processRows, locale, [3, 6]) + 1;
  }
  if (report) {
    overviewRow = dashboardSection(overview, overviewRow, labels.assessmentData, locale);
    const exportedDataRows = rulaExportRowsWithOptionalSide(model.dataRows, model.hasIndependentSides);
    overviewRow = dashboardTable(overview, overviewRow, dataHeaders, exportedDataRows.length
      ? exportedDataRows
      : [dataHeaders.map((_, index) => index === (model.hasIndependentSides ? 3 : 2) ? labels.noData : "-")], locale,
    model.hasIndependentSides ? undefined : [1, 1, 2, 1, 1, 1, 1, 1]) + 1;
    overviewRow = dashboardSection(overview, overviewRow, labels.selectedActions, locale);
    dashboardTable(overview, overviewRow, actionHeaders, model.actionRows.length
      ? model.actionRows
      : [actionHeaders.map((_, index) => index === 0 ? labels.noSelectedActions : "-")], locale, [1, 2, 1, 1, 1, 1, 1, 1]);
  }
  addExportSheet(workbook, "SUMMARY", fieldValueHeaders, model.detailsRows, [34, 100], locale);
  addExportSheet(workbook, "PROCESS", fieldValueHeaders, model.processRows, [34, 100], locale);
  const impactHeaders = model.hasIndependentSides ? [labels.bodySide, labels.field, labels.value] : [labels.field, labels.value];
  addExportSheet(workbook, "IMPACT", impactHeaders, rulaImpactRowsWithOptionalSide(model.impactRows, model.hasIndependentSides), model.hasIndependentSides ? [16, 34, 80] : [34, 80], locale);
  const factorRows = rulaExportRowsWithOptionalSide(model.factorRows, model.hasIndependentSides);
  const dataRows = rulaExportRowsWithOptionalSide(model.dataRows, model.hasIndependentSides);
  addExportSheet(workbook, "FACTORS", factorHeaders, factorRows.length ? factorRows : [factorHeaders.map((_, index) => index === (model.hasIndependentSides ? 1 : 0) ? labels.noData : "-")], model.hasIndependentSides ? [16, 28, 16, 12, 12, 18, 28, 18] : [28, 16, 12, 12, 18, 28, 18], locale);
  addExportSheet(workbook, "RULA DATA", dataHeaders, dataRows.length ? dataRows : [dataHeaders.map((_, index) => index === (model.hasIndependentSides ? 3 : 2) ? labels.noData : "-")], model.hasIndependentSides ? [16, 8, 8, 24, 18, 22, 18, 16, 48] : [8, 8, 24, 18, 22, 18, 16, 48], locale);
  addExportSheet(workbook, "CORRECTIONS", correctionHeaders, model.suggestionRows.length ? model.suggestionRows : [correctionHeaders.map((_, index) => index === 2 ? labels.noData : "-")], [16, 28, 34, 60, 14, 20, 16], locale);
  addExportSheet(workbook, "ACTIONS", actionHeaders, model.actionRows.length ? model.actionRows : [actionHeaders.map((_, index) => index === 0 ? labels.noSelectedActions : "-")], [32, 52, 28, 16, 16, 18, 18, 22], locale);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function docxRuns(value: unknown, bold = false, rtl = false, color?: string, size?: number) {
  const runProperties = bold || rtl || color || size ? `<w:rPr>${bold ? "<w:b/>" : ""}${rtl ? "<w:rtl/>" : ""}${color ? `<w:color w:val="${color}"/>` : ""}${size ? `<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>` : ""}</w:rPr>` : "";
  return String(value ?? "-").split(/\r?\n/).map((line, index) => `${index ? "<w:r><w:br/></w:r>" : ""}<w:r>${runProperties}<w:t xml:space="preserve">${xmlEscape(line)}</w:t></w:r>`).join("");
}

function docxParagraph(value: unknown, style?: "Title" | "Heading1" | "Heading2", locale: ReportLocale = "en") {
  const paragraphProperties = style || locale === "fa" ? `<w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ""}${locale === "fa" ? "<w:bidi/><w:jc w:val=\"right\"/>" : ""}</w:pPr>` : "";
  return `<w:p>${paragraphProperties}${docxRuns(value, false, locale === "fa")}</w:p>`;
}

function docxTable(headers: string[], rows: ExportRow[], locale: ReportLocale = "en", requestedWidths?: number[]) {
  const weightTotal = requestedWidths?.reduce((sum, width) => sum + width, 0) || headers.length;
  const widths = headers.map((_, index) => index === headers.length - 1
    ? 15400 - Math.floor(headers.slice(0, -1).reduce((sum, __, previousIndex) => sum + 15400 * ((requestedWidths?.[previousIndex] ?? 1) / weightTotal), 0))
    : Math.max(350, Math.floor(15400 * ((requestedWidths?.[index] ?? 1) / weightTotal))));
  const grid = widths.map((width) => `<w:gridCol w:w="${width}"/>`).join("");
  const renderRow = (row: ExportRow, header = false, rowIndex = 0) => `<w:tr><w:trPr>${header ? "<w:tblHeader/>" : ""}<w:cantSplit/></w:trPr>${headers.map((_, index) => `<w:tc><w:tcPr><w:tcW w:w="${widths[index] ?? 1000}" w:type="dxa"/><w:vAlign w:val="center"/><w:shd w:fill="${header ? "1E5B8F" : rowIndex % 2 === 0 ? "F2F7FB" : "FFFFFF"}"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0"/>${locale === "fa" ? "<w:bidi/><w:jc w:val=\"right\"/>" : "<w:jc w:val=\"left\"/>"}</w:pPr>${docxRuns(row[index] ?? "-", header, locale === "fa", header ? "FFFFFF" : undefined)}</w:p></w:tc>`).join("")}</w:tr>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="15400" w:type="dxa"/><w:tblLayout w:type="fixed"/>${locale === "fa" ? "<w:bidiVisual/>" : ""}<w:tblBorders><w:top w:val="single" w:sz="4" w:color="C9D9E5"/><w:left w:val="single" w:sz="4" w:color="C9D9E5"/><w:bottom w:val="single" w:sz="4" w:color="C9D9E5"/><w:right w:val="single" w:sz="4" w:color="C9D9E5"/><w:insideH w:val="single" w:sz="4" w:color="C9D9E5"/><w:insideV w:val="single" w:sz="4" w:color="C9D9E5"/></w:tblBorders><w:tblCellMar><w:top w:w="80" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${renderRow(headers, true)}${rows.map((row, index) => renderRow(row, false, index)).join("")}</w:tbl>`;
}

type DocxCard = { label: string; value: ExportCell; detail?: string; tone?: "blue" | "green" | "amber" | "red" };
type DocxSection =
  | { heading: string; kind: "cards"; cards: DocxCard[]; columns?: number }
  | { heading: string; kind?: "table"; headers: string[]; rows: ExportRow[]; widths?: number[] };

const docxCardTones = {
  blue: { fill: "F1F7FC", border: "D7E5EF", accent: "1E5B8F" },
  green: { fill: "EEF9F4", border: "CFE7DC", accent: "18845C" },
  amber: { fill: "FFF7E9", border: "EEDDB9", accent: "BD7A1B" },
  red: { fill: "FFF1F1", border: "EFCFCF", accent: "C94A4D" },
} as const;

function docxCardGrid(cards: DocxCard[], locale: ReportLocale, columns = 4) {
  const safeColumns = Math.max(1, Math.min(4, Math.trunc(columns)));
  const baseWidth = Math.floor(15400 / safeColumns);
  const widths = Array.from({ length: safeColumns }, (_, index) => index === safeColumns - 1 ? 15400 - baseWidth * (safeColumns - 1) : baseWidth);
  const grid = widths.map((width) => `<w:gridCol w:w="${width}"/>`).join("");
  const rows: DocxCard[][] = [];
  for (let index = 0; index < cards.length; index += safeColumns) rows.push(cards.slice(index, index + safeColumns));
  const cell = (card: DocxCard | undefined, columnIndex: number) => {
    const tone = docxCardTones[card?.tone ?? "blue"];
    const label = card?.label ?? "";
    const value = card ? exportText(card.value) : "";
    const detail = card?.detail ?? "";
    return `<w:tc><w:tcPr><w:tcW w:w="${widths[columnIndex]}" w:type="dxa"/><w:vAlign w:val="center"/><w:shd w:fill="${tone.fill}"/><w:tcBorders><w:top w:val="single" w:sz="5" w:color="${tone.border}"/><w:left w:val="single" w:sz="5" w:color="${tone.border}"/><w:bottom w:val="single" w:sz="5" w:color="${tone.border}"/><w:right w:val="single" w:sz="5" w:color="${tone.border}"/></w:tcBorders></w:tcPr><w:p><w:pPr>${locale === "fa" ? "<w:bidi/><w:jc w:val=\"right\"/>" : "<w:jc w:val=\"left\"/>"}<w:spacing w:after="50"/></w:pPr>${docxRuns(label, false, locale === "fa", "6D7E8B", 16)}</w:p><w:p><w:pPr>${locale === "fa" ? "<w:bidi/><w:jc w:val=\"right\"/>" : "<w:jc w:val=\"left\"/>"}<w:spacing w:after="50"/></w:pPr>${docxRuns(value, true, locale === "fa", tone.accent, 26)}</w:p>${detail ? `<w:p><w:pPr>${locale === "fa" ? "<w:bidi/><w:jc w:val=\"right\"/>" : "<w:jc w:val=\"left\"/>"}</w:pPr>${docxRuns(detail, false, locale === "fa", "526879", 16)}</w:p>` : ""}</w:tc>`;
  };
  const borders = `<w:tblBorders><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders><w:tblCellMar><w:top w:w="120" w:type="dxa"/><w:left w:w="150" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:right w:w="150" w:type="dxa"/></w:tblCellMar>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="15400" w:type="dxa"/><w:tblLayout w:type="fixed"/>${locale === "fa" ? "<w:bidiVisual/>" : ""}${borders}</w:tblPr><w:tblGrid>${grid}</w:tblGrid>${rows.map((row) => `<w:tr><w:trPr><w:cantSplit/></w:trPr>${Array.from({ length: safeColumns }, (_, index) => cell(row[index], index)).join("")}</w:tr>`).join("")}</w:tbl>`;
}

function docxBanner(title: string, subtitle: string, locale: ReportLocale) {
  const paragraphProperties = locale === "fa" ? "<w:pPr><w:bidi/><w:jc w:val=\"right\"/></w:pPr>" : "<w:pPr><w:jc w:val=\"left\"/></w:pPr>";
  return `<w:tbl><w:tblPr><w:tblW w:w="15400" w:type="dxa"/><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/></w:tblBorders><w:tblCellMar><w:top w:w="190" w:type="dxa"/><w:left w:w="240" w:type="dxa"/><w:bottom w:w="190" w:type="dxa"/><w:right w:w="240" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="15400"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="15400" w:type="dxa"/><w:shd w:fill="123F66"/></w:tcPr><w:p>${paragraphProperties}${docxRuns("NIVASafe", true, locale === "fa", "FFFFFF", 24)}</w:p><w:p>${paragraphProperties}${docxRuns(title, true, locale === "fa", "FFFFFF", 34)}</w:p><w:p>${paragraphProperties}${docxRuns(subtitle, false, locale === "fa", "D9EAF8", 18)}</w:p></w:tc></w:tr></w:tbl>`;
}

const docxStyles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="20"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:color w:val="174E86"/><w:sz w:val="32"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:color w:val="255B88"/><w:sz w:val="26"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:color w:val="255B88"/><w:sz w:val="22"/></w:rPr></w:style></w:styles>`;

async function buildDocx(title: string, subtitle: string, sections: DocxSection[], locale: ReportLocale = "en") {
  const generatedAt = new Date().toISOString();
  const body = `${docxBanner(title, subtitle, locale)}${sections.map((section) => `${docxParagraph(section.heading, "Heading1", locale)}${section.kind === "cards" ? docxCardGrid(section.cards, locale, section.columns) : docxTable(section.headers, section.rows, locale, section.widths)}`).join("")}<w:sectPr><w:pgSz w:w="16840" w:h="11900" w:orient="landscape"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/></w:sectPr>`;
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`);
  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`);
  zip.file("word/styles.xml", docxStyles);
  zip.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  zip.file("docProps/core.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xmlEscape(title)}</dc:title><dc:creator>NIVASafe</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${xmlEscape(generatedAt)}</dcterms:created></cp:coreProperties>`);
  zip.file("docProps/app.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>NIVASafe</Application></Properties>`);
  return Buffer.from(await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
}

export async function buildFmeaWordDocument(data: FmeaReportData, locale: ReportLocale = "en", pageReport?: FmeaReportPayload) {
  const labels = fmeaLabels(locale);
  const reportData: FmeaReportData = pageReport
    ? { ...data, riskThresholds: pageReport.riskThresholds, actions: pageReport.actions }
    : data;
  const summary = pageReport?.summary ?? summariseFmea(fmeaItemsForOutput(reportData));
  const actionMetrics = fmeaActionMetrics(reportData.actions);
  const totalFailureModes = Math.max(summary.totalFailureModes, 1);
  const topItems = (pageReport?.topFailureModes ?? topFailureModes(fmeaItemsForOutput(reportData).map((item) => ({ ...item, actionPriority: actionPriority(item.riskLevel) }))).slice(0, 5)).slice(0, 5);
  const suggestedActions = pageReport?.suggestedActions.filter((item) => !pageReport.actions.some((action) => action.fmeaItemId === item.fmeaItemId && action.title.trim().toLocaleLowerCase() === item.title.trim().toLocaleLowerCase())).slice(0, 5).map((item) => ({
    rowNumber: pageReport.items.find((risk) => risk.id === item.fmeaItemId)?.rowNumber ?? 0,
    failureMode: item.failureMode,
    title: item.title,
    priority: item.priority,
  })) ?? fmeaSuggestedActions(reportData).slice(0, 5).map((item) => ({ rowNumber: item.rowNumber, failureMode: item.failureMode, title: item.recommendation?.trim() ?? "-", priority: actionPriority(item.riskLevel) }));
  const evaluationTeam = data.evaluationTeam?.map((member) => `${member.displayName || member.email} (${member.role})`).filter(Boolean).join(" | ") || "-";
  const processTitle = fmeaProcessTitle(data, locale);
  const remainingActions = Math.max(0, reportData.actions.length - actionMetrics.completed - actionMetrics.active);
  const actionHeaders = locale === "en"
    ? ["Related risk", "Title", "Description", "Priority", "Status", "Assignee", "Progress", "Due date"]
    : [labels.relatedRisk, labels.title, labels.description, labels.priority, labels.actionStatus, labels.assignee, labels.actionProgress, labels.dueDate];
  const actionRows = reportData.actions.map((action) => [
    action.fmeaItem ? `#${action.fmeaItem.rowNumber} · ${action.fmeaItem.failureMode}` : "-",
    action.title,
    action.description,
    localizedFmeaActionPriority(action.priority, locale),
    localizedFmeaStatus(action.status, locale),
    action.assigneeName ?? "-",
    action.progress,
    reportDate(action.dueDate, locale),
  ]);
  return buildDocx(labels.reportTitle, `${labels.code}: ${data.code} · ${labels.project}: ${data.project.name}`, [
    { heading: labels.header, headers: [labels.field, labels.value], rows: [[labels.process, processTitle], [labels.company, fmeaCompanyName(data, locale)], [labels.date, reportDate(data.approvedAt ?? data.updatedAt, locale)], [labels.method, "FMEA"], [labels.team, `${data.evaluationTeam?.length ?? 0} ${labels.teamMembers}\n${evaluationTeam}`], [labels.code, data.code], [labels.project, data.project.name], [labels.status, localizedFmeaStatus(data.status, locale)], [labels.version, data.version ?? "-"]] },
    { kind: "cards", heading: labels.summary, cards: [
      { label: labels.totalFailureModes, value: summary.totalFailureModes, tone: "blue" },
      { label: labels.highPriorityRisks, value: summary.highPriorityRisks, tone: "red" },
      { label: labels.correctiveActionsNeeded, value: summary.correctiveActionsNeeded, tone: "amber" },
      { label: labels.immediateActions, value: summary.immediateActions, tone: "red" },
    ] },
    { heading: locale === "en" ? "Risk-level distribution" : labels.riskDistribution, headers: [labels.riskLevel, labels.count, labels.share, locale === "en" ? "Distribution" : "نمودار سهم"], rows: Object.entries(summary.distribution).map(([level, count]) => [localizedFmeaRiskLevel(level, locale), count, `${Math.round((count / totalFailureModes) * 100)}%`, "■".repeat(Math.round(count / totalFailureModes * 10)) || "—"]) },
    { kind: "cards", heading: labels.actionRegister, cards: [
      { label: labels.progress, value: `${actionMetrics.progress}%`, tone: "green" },
      { label: labels.completedActions, value: actionMetrics.completed, tone: "green" },
      { label: labels.activeActions, value: actionMetrics.active, tone: "amber" },
      { label: labels.remainingActions, value: remainingActions, tone: "blue" },
    ] },
    { heading: labels.processInformation, headers: [labels.field, labels.value], rows: [[labels.department, data.department ?? "-"], [labels.activity, data.activityDescription ?? "-"], [labels.equipment, reportList(data.equipment)], [labels.materials, reportList(data.materials)], [labels.existingControls, reportList(data.existingControls)], [labels.specialConditions, data.specialConditions ?? "-"]] },
    { heading: locale === "en" ? "Top failure modes" : labels.topFailureModes, headers: locale === "en" ? ["Row", "Failure mode", "Effect", "S", "O", "D", "AP", "RPN"] : [labels.row, labels.failureMode, labels.effect, "S", "O", "D", "AP", labels.rpn], rows: topItems.map((item) => [item.rowNumber, item.failureMode, item.effect, item.severity, item.occurrence, item.detection, localizedFmeaActionPriority(item.actionPriority, locale), item.rpn]), widths: [0.6, 2.2, 2, 0.5, 0.5, 0.5, 0.9, 0.7] },
    { heading: labels.proposedActions, headers: locale === "en" ? ["Related risk", "Failure mode", "Proposed action", "Priority", "Status"] : [labels.relatedRisk, labels.failureMode, labels.recommendedAction, labels.priority, labels.actionStatus], rows: suggestedActions.length ? suggestedActions.map((item) => [`#${item.rowNumber || "-"}`, item.failureMode, item.title, localizedFmeaActionPriority(item.priority, locale), locale === "fa" ? "پیشنهادی" : "Suggested"]) : [["-", "-", labels.noRecommendations, "-", "-"]], widths: [1, 2, 4, 1, 1] },
    { heading: locale === "en" ? "Corrective actions" : labels.actionRegister, headers: actionHeaders, rows: actionRows.length ? actionRows : [["-", "-", labels.noActions, "-", "-", "-", 0, "-"]] },
    { heading: labels.fullDetails, headers: fmeaFinalTableHeaders(locale), rows: fmeaFinalTableRows(reportData, locale), widths: [0.5, 1.6, 1.5, 1.5, 1.8, 0.45, 0.45, 0.45, 0.65, 0.9, 2.2] },
  ], locale);
}

export async function buildFmeaFinalTableWordDocument(data: FmeaReportData, locale: ReportLocale = "en") {
  const labels = fmeaLabels(locale);
  const processTitle = fmeaProcessTitle(data, locale);
  return buildDocx(labels.finalTableTitle, `${labels.process}: ${processTitle} · ${labels.date}: ${reportDate(data.approvedAt ?? data.updatedAt, locale)}`, [
    { heading: labels.assessmentDetails, headers: [labels.field, labels.value], rows: [[labels.process, processTitle], [labels.company, fmeaCompanyName(data, locale)], [labels.date, reportDate(data.approvedAt ?? data.updatedAt, locale)], [labels.code, data.code], [labels.project, data.project.name], [labels.status, localizedFmeaStatus(data.status, locale)], [labels.method, "FMEA"], [labels.version, data.version ?? "-"]] },
    { heading: labels.finalTableHeading, headers: fmeaFinalTableHeaders(locale), rows: fmeaFinalTableRows(data, locale), widths: FMEA_FINAL_TABLE_WIDTHS },
  ], locale);
}

export async function buildRulaWordDocument(data: RulaReportData, report?: RulaReportExport, locale: ReportLocale = "en") {
  const labels = rulaLabels(locale);
  const model = buildRulaExportModel(data, report, locale);
  const overview = buildRulaOverviewExport(model, report, locale);
  const dataHeaders = [
    ...(model.hasIndependentSides ? [labels.bodySide] : []),
    labels.row, labels.group, labels.bodyPart, labels.detectedAngle, labels.detectedStatus,
    labels.suggestedScore, labels.scoreShare, labels.selectedActions,
  ];
  const impactHeaders = model.hasIndependentSides ? [labels.bodySide, labels.field, labels.value] : [labels.field, labels.value];
  const correctionHeaders = [labels.bodySide, labels.relatedFactors, labels.suggestedAction, labels.description, labels.priority, labels.estimatedReduction, labels.selection];
  const actionHeaders = locale === "en"
    ? ["Action", "Description", "Related factors", "Body side", "Priority", "Status", "Selection", "Estimated reduction"]
    : [labels.action, labels.description, labels.relatedFactors, labels.bodySide, labels.priority, labels.status, labels.selection, labels.estimatedReduction];
  const summaryCoreKeys = new Set<string>([
    labels.title, labels.project, labels.score, labels.actionLevel, labels.status, labels.bodySide,
    labels.postureReview, labels.predictedScore,
  ]);
  const summaryDetailRows = model.summaryRows.filter(([key]) => typeof key === "string" && !summaryCoreKeys.has(key));
  return buildDocx(labels.reportTitle, `${labels.code}: ${model.assessment.subjectCode?.trim() || "-"} · ${labels.project}: ${model.assessment.project.name}`, [
    { heading: labels.assessmentDetails, headers: [labels.field, labels.value], rows: model.detailsRows },
    { kind: "cards", heading: labels.summary, cards: [
      { label: labels.score, value: model.reviewComplete ? model.assessment.score : "-", tone: model.reviewComplete ? "blue" : "amber" },
      { label: labels.actionLevel, value: model.reviewComplete ? model.assessment.actionLevel : "-", tone: "amber" },
      { label: labels.predictedScore, value: model.reviewComplete && report ? report.predictedScore : "-", tone: "green" },
      { label: labels.postureReview, value: model.reviewComplete ? labels.completed : labels.manualReview, tone: model.reviewComplete ? "green" : "amber" },
    ] },
    ...(summaryDetailRows.length ? [{ heading: labels.additionalDetails, headers: [labels.field, labels.value], rows: summaryDetailRows }] : []),
    ...(report ? [
      { kind: "cards" as const, heading: labels.factorDistribution, cards: [
        { label: labels.factorScore, value: overview.totalFactorScore, tone: "blue" as const },
        ...overview.factorDistribution.map((row) => ({ label: row.label, value: row.score, detail: `${row.count} · ${row.percentage}%`, tone: (row.label === labels.highFactors ? "red" : row.label === labels.mediumFactors ? "amber" : "green") as "red" | "amber" | "green" })),
      ] },
      { kind: "cards" as const, heading: labels.correctionProgress, cards: [
        { label: labels.selectedRecommendations, value: `${overview.selectedRecommendationCount} / ${overview.recommendationCount}`, tone: "green" as const },
        { label: labels.remainingRecommendations, value: overview.remainingRecommendationCount, tone: "amber" as const },
        { label: labels.manualActions, value: overview.manualActionCount, tone: "blue" as const },
        { label: labels.estimatedScoreReduction, value: overview.estimatedScoreReduction, tone: "green" as const },
      ] },
      { kind: "cards" as const, heading: labels.mainFactors, columns: 3, cards: model.factorRows.length ? model.factorRows.map((row) => {
        const side = model.hasIndependentSides ? `${exportText(row[0])} · ` : "";
        const effect = exportText(row[6]);
        const tone = rulaImpactTone(effect);
        const source = exportText(row[7]);
        return {
          label: `${side}${exportText(row[1])}`,
          value: `${exportText(row[4])} · ${exportText(row[2])}`,
          detail: [exportText(row[3]), exportText(row[5]), effect, source].filter((part) => part !== "-").join(" · "),
          tone,
        };
      }) : [{ label: labels.noData, value: "-", detail: labels.manualReview, tone: "blue" as const }] },
      { heading: labels.proposedActions, headers: correctionHeaders, rows: model.suggestionRows.length ? model.suggestionRows : [["-", "-", labels.noData, "-", "-", "-", "-"]], widths: [0.8, 1.3, 2, 3, 0.8, 0.9, 0.9] },
    ] : []),
    ...(model.impactRows.length ? [{ heading: labels.predictedEffect, headers: impactHeaders, rows: rulaImpactRowsWithOptionalSide(model.impactRows, model.hasIndependentSides), widths: model.hasIndependentSides ? [0.8, 1.8, 1] : [1.8, 1] }] : []),
    ...(model.processRows.length ? [{ heading: labels.processInformation, headers: [labels.field, labels.value], rows: model.processRows, widths: [1, 3] }] : []),
    ...(report ? [
      { heading: labels.assessmentData, headers: dataHeaders, rows: model.dataRows.length ? rulaExportRowsWithOptionalSide(model.dataRows, model.hasIndependentSides) : [dataHeaders.map((_, index) => index === dataHeaders.length - 1 ? labels.noData : "-")], widths: model.hasIndependentSides ? [0.7, 0.35, 0.35, 1.2, 0.9, 1, 0.8, 0.7, 2.2] : [0.35, 0.35, 1.2, 0.9, 1, 0.8, 0.7, 2.2] },
      { heading: labels.selectedActions, headers: actionHeaders, rows: model.actionRows.length ? model.actionRows : [[labels.noSelectedActions, "-", "-", "-", "-", "-", "-", 0]], widths: [1.6, 2.6, 1.5, 0.8, 0.8, 0.8, 0.8, 0.8] },
    ] : []),
  ], locale);
}

function reportFilename(value: string, extension: "docx" | "xlsx" | "pdf") {
  const safeTitle = value.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "NIVASafe-report";
  return `${safeTitle}.${extension}`;
}

function sendWord(reply: FastifyReply, title: string, document: Buffer) {
  return reply.header("content-type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document").header("content-disposition", `attachment; filename="${reportFilename(title, "docx")}"`).send(document);
}

export type RegisteredReportInput = {
  id: string;
  title: string;
  code?: string | null;
  projectName: string;
  projectCode?: string | null;
  finalizedAt: Date;
};

export type RegisteredReportSummary = Omit<RegisteredReportInput, "finalizedAt"> & {
  type: "FMEA" | "RULA";
  finalizedAt: string;
};

export function buildRegisteredReportSummaries(fmea: RegisteredReportInput[], rula: RegisteredReportInput[]): RegisteredReportSummary[] {
  return [
    ...fmea.map((item) => ({ ...item, type: "FMEA" as const, finalizedAt: item.finalizedAt.toISOString() })),
    ...rula.map((item) => ({ ...item, type: "RULA" as const, finalizedAt: item.finalizedAt.toISOString() })),
  ].sort((left, right) => {
    const dateOrder = right.finalizedAt.localeCompare(left.finalizedAt);
    if (dateOrder !== 0) return dateOrder;
    return `${left.type}:${left.id}`.localeCompare(`${right.type}:${right.id}`);
  });
}

export async function registerReportRoutes(app: FastifyInstance) {
  app.get("/api/v1/reports/registered", { preHandler: authenticate }, async (request) => {
    const organizationId = requireOrg(request);
    requirePermission(request, "reports.generate");
    const [fmeaAssessments, rulaAssessments] = await Promise.all([
      prisma.fmeaAssessment.findMany({
        where: { organizationId, status: "APPROVED", deletedAt: null },
        select: { id: true, title: true, code: true, approvedAt: true, updatedAt: true, project: { select: { name: true, code: true } }, jobCatalog: { select: { titleFa: true } } },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.rulaAssessment.findMany({
        where: { organizationId, status: { not: "ARCHIVED" } },
        select: { id: true, title: true, subjectCode: true, bodySide: true, postureAnalysis: true, updatedAt: true, project: { select: { name: true, code: true } } },
        orderBy: { updatedAt: "desc" },
      }),
    ]);
    const finalRula = rulaAssessments.filter((assessment) => {
      const bodySide = assessment.bodySide === "LEFT" || assessment.bodySide === "BOTH" ? assessment.bodySide : "RIGHT";
      const postureAnalysis = rulaPostureAnalysisSchema.safeParse(assessment.postureAnalysis);
      return postureAnalysis.success && isRulaPostureAnalysisReviewed(bodySide, postureAnalysis.data as RulaPostureAnalysis);
    });
    return envelope(buildRegisteredReportSummaries(
      fmeaAssessments.map((assessment) => ({ id: assessment.id, title: assessment.jobCatalog?.titleFa ?? assessment.title, code: assessment.code, projectName: assessment.project.name, projectCode: assessment.project.code, finalizedAt: assessment.approvedAt ?? assessment.updatedAt })),
      finalRula.map((assessment) => ({ id: assessment.id, title: assessment.title, code: assessment.subjectCode ?? assessment.id.slice(0, 8).toUpperCase(), projectName: assessment.project.name, projectCode: assessment.project.code, finalizedAt: assessment.updatedAt })),
    ));
  });
  app.get("/api/v1/fmea/:id/report", { preHandler: authenticate }, async (request) => {
    const organizationId = requireOrg(request); requirePermission(request, "reports.generate"); const { id } = parse(reportIdParams, request.params); const { locale } = parse(reportQuerySchema, request.query);
    return envelope(await loadFmeaReport(id, organizationId, locale));
  });
  app.post("/api/v1/fmea/:id/report/action-suggestions", { preHandler: authenticate, config: { rateLimit: { max: 8, timeWindow: "1 minute" } } }, async (request) => {
    const organizationId = requireOrg(request); requirePermission(request, "reports.generate");
    const { id } = parse(reportIdParams, request.params);
    const body = parse(reportActionSuggestionBody, request.body);
    const report = await loadFmeaReport(id, organizationId, body.locale);
    const candidates: FmeaActionCandidate[] = report.items.flatMap((item) => {
      if (!item.id) return [];
      return [{
        id: item.id,
        rowNumber: item.rowNumber,
        processStep: item.processStep,
        failureMode: item.failureMode,
        effect: item.effect,
        cause: item.cause,
        preventiveControls: item.preventiveControls,
        detectionControls: item.detectionControls,
        severity: item.severity,
        occurrence: item.occurrence,
        detection: item.detection,
        rpn: item.rpn,
        riskLevel: item.riskLevel,
        recommendation: item.recommendation,
      }];
    });
    const existingActionTitles = [...report.actions.filter((action) => !["CANCELLED", "REJECTED"].includes(action.status)).map((action) => action.title), ...body.excludeTitles];
    const fallback = fallbackFmeaActionSuggestions({ candidates, existingActionTitles, locale: body.locale });
    const provider = getAvailableAssessmentAIProvider();
    let suggestions = fallback;
    let aiStatus: "connected" | "fallback" | "unavailable" = provider.name === "fallback" ? "fallback" : "connected";
    let model: string | null = null;
    try {
      const result = await provider.analyze({
        organizationId,
        userId: request.actor!.userId,
        message: buildFmeaActionSuggestionsPrompt({
          processName: body.locale === "en" ? report.assessment.processName.en : report.assessment.processName.fa,
          projectName: report.assessment.project.name,
          locale: body.locale,
          candidates,
          existingActionTitles,
        }),
      });
      suggestions = mergeFmeaActionSuggestions(parseFmeaActionSuggestions(result.answer, candidates), fallback, existingActionTitles);
      aiStatus = result.usedFallback || result.provider === "fallback" ? "fallback" : "connected";
      model = result.model ?? null;
      await recordAIUsage(prisma, { organizationId, userId: request.actor!.userId, useCase: "risk", sourceType: "FMEA_ACTION_SUGGESTIONS", sourceId: request.id, result });
    } catch {
      aiStatus = "fallback";
    }
    await audit(request, "FMEA_REPORT_ACTION_SUGGESTIONS", "FmeaAssessment", id, { provider: provider.name, model, aiStatus, suggestionCount: suggestions.length });
    return envelope({ suggestions, provider: provider.name, model, aiStatus, minimum: report.items.length ? 1 : 0 });
  });
  app.post("/api/v1/fmea/:id/report/detail-suggestions", { preHandler: authenticate, config: { rateLimit: { max: 8, timeWindow: "1 minute" } } }, async (request) => {
    const organizationId = requireOrg(request); requirePermission(request, "reports.generate");
    const { id } = parse(reportIdParams, request.params);
    const body = parse(fmeaReportDetailSuggestionBody, request.body);
    const fmea = await prisma.fmeaAssessment.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: {
        id: true,
        title: true,
        department: true,
        activityDescription: true,
        specialConditions: true,
        project: { select: { name: true } },
        jobCatalog: { select: { titleFa: true, titleEn: true } },
        items: { select: { rowNumber: true, processStep: true, failureMode: true, effect: true, cause: true }, orderBy: { rowNumber: "asc" }, take: 20 },
      },
    });
    if (!fmea) throw Object.assign(new Error("Assessment not found"), { statusCode: 404, code: "NOT_FOUND" });
    const processName = body.locale === "en" ? fmea.jobCatalog?.titleEn ?? fmea.title : fmea.jobCatalog?.titleFa ?? fmea.title;
    const fallback = fallbackFmeaReportDetailSuggestions({ processName, projectName: fmea.project.name, locale: body.locale, limit: FMEA_REPORT_DETAIL_SUGGESTION_MAX });
    const provider = getAvailableAssessmentAIProvider();
    let suggestions = fallback;
    let aiStatus: "connected" | "fallback" | "unavailable" = provider.name === "fallback" ? "fallback" : "connected";
    try {
      const result = await provider.analyze({
        organizationId,
        userId: request.actor!.userId,
        message: buildFmeaReportDetailSuggestionsPrompt({
          projectName: fmea.project.name,
          processName,
          department: fmea.department,
          activityDescription: fmea.activityDescription,
          specialConditions: fmea.specialConditions,
          existingRows: fmea.items,
          locale: body.locale,
        }),
      });
      const parsed = parseFmeaReportDetailSuggestions(result.answer);
      suggestions = ensureMinimumFmeaReportDetailSuggestions(parsed, fallback);
      aiStatus = result.usedFallback || result.provider === "fallback" ? "fallback" : "connected";
      await recordAIUsage(prisma, { organizationId, userId: request.actor!.userId, useCase: "risk", sourceType: "FMEA_REPORT_DETAILS", sourceId: request.id, result });
    } catch {
      // The deterministic rows are already prepared before the provider call.
      // Keep the report usable when an external provider times out, returns an
      // invalid answer, or is not configured; an unavailable provider must not
      // turn an otherwise valid suggestions response into an error state.
      aiStatus = "fallback";
    }
    let createdCount = 0;
    if (body.autoCreate && suggestions.length >= FMEA_REPORT_DETAIL_SUGGESTION_MIN) {
      requirePermission(request, "assessments.update");
      createdCount = await prisma.$transaction(async (tx) => {
        await tx.fmeaAssessment.update({ where: { id }, data: { updatedAt: new Date() } });
        const previousAutoSeed = await tx.auditLog.findFirst({ where: { organizationId, action: "FMEA_REPORT_DETAIL_AUTOCREATE", entityType: "FmeaAssessment", entityId: id }, select: { id: true } });
        if (previousAutoSeed) return 0;
        const currentRows = await tx.fmeaItem.findMany({
          where: { assessmentId: id },
          select: { rowNumber: true, processStep: true, failureMode: true, effect: true, cause: true },
          orderBy: { rowNumber: "asc" },
        });
        const seedRows = buildFmeaReportDetailSeedRows({
          assessmentId: id,
          suggestions,
          fallbackSuggestions: fallback,
          existingRows: currentRows,
          additionalCount: FMEA_REPORT_DETAIL_SUGGESTION_MIN,
          thresholds: DEFAULT_THRESHOLDS,
        });
        if (!seedRows.length) return 0;
        const created = (await tx.fmeaItem.createMany({ data: seedRows })).count;
        if (created > 0) {
          await tx.auditLog.create({ data: { userId: request.actor!.userId, organizationId, action: "FMEA_REPORT_DETAIL_AUTOCREATE", entityType: "FmeaAssessment", entityId: id, metadata: { provider: provider.name, aiStatus, createdCount: created }, requestId: request.id } });
        }
        return created;
      });
    }
    await audit(request, "FMEA_REPORT_DETAIL_SUGGESTIONS", "FmeaAssessment", id, { provider: provider.name, aiStatus, suggestionCount: suggestions.length, createdCount });
    return envelope({ suggestions: body.autoCreate ? [] : suggestions, provider: provider.name, aiStatus, minimum: 5, createdCount });
  });
  app.post("/api/v1/fmea/:id/report/save", { preHandler: authenticate }, async (request) => {
    const organizationId = requireOrg(request); requirePermission(request, "reports.generate"); const { id } = parse(reportIdParams, request.params);
    const fmea = await prisma.fmeaAssessment.findFirst({ where: { id, organizationId, deletedAt: null }, select: { id: true, version: true } });
    if (!fmea) throw Object.assign(new Error("Assessment not found"), { statusCode: 404, code: "NOT_FOUND" });
    await prisma.auditLog.create({ data: { userId: request.actor?.userId, organizationId, action: "FMEA_REPORT_SAVED", entityType: "FmeaAssessment", entityId: id, metadata: { version: fmea.version }, requestId: request.id } });
    return envelope({ assessmentId: fmea.id, savedAt: new Date().toISOString() });
  });
  app.post("/api/v1/rula/:id/report/action-suggestions", { preHandler: authenticate, config: { rateLimit: { max: 8, timeWindow: "1 minute" } } }, async (request) => {
    const organizationId = requireOrg(request); requirePermission(request, "reports.generate");
    const { id } = parse(reportIdParams, request.params);
    const body = parse(reportActionSuggestionBody, request.body);
    const rula = await prisma.rulaAssessment.findFirst({
      where: { id, organizationId },
      include: { project: { select: { name: true } }, actions: { select: { title: true, status: true } } },
    });
    if (!rula) throw Object.assign(new Error("Assessment not found"), { statusCode: 404, code: "NOT_FOUND" });
    const inputs = parseRulaInputs(rula.inputs);
    const analysis = parseRulaPostureAnalysis(rula.postureAnalysis, inputs);
    const bodySide: "LEFT" | "RIGHT" | "BOTH" = rula.bodySide === "LEFT" ? "LEFT" : rula.bodySide === "BOTH" ? "BOTH" : "RIGHT";
    const activityInfo = rula.activityInfo && typeof rula.activityInfo === "object" && !Array.isArray(rula.activityInfo) ? rula.activityInfo as Record<string, unknown> : {};
    const textField = (key: string) => typeof activityInfo[key] === "string" ? activityInfo[key] as string : null;
    const sideResults = buildRulaSideResults(bodySide, inputs, analysis);
    const fallback = fallbackRulaActionSuggestions({ bodySide, analysis, inputs, locale: body.locale });
    const existingActionTitles = rula.actions.filter((action) => !["CANCELLED", "REJECTED"].includes(action.status)).map((action) => action.title);
    const provider = getAvailableAssessmentAIProvider();
    let suggestions = mergeRulaActionSuggestions([], fallback, existingActionTitles);
    let aiStatus: "connected" | "fallback" | "unavailable" = provider.name === "fallback" ? "fallback" : "connected";
    let model: string | null = null;
    try {
      const result = await provider.analyze({
        organizationId,
        userId: request.actor!.userId,
        message: buildRulaActionSuggestionsPrompt({
          bodySide,
          score: rula.score,
          actionLevel: rula.actionLevel,
          inputs,
          analysis,
          sideResults,
          jobTitle: textField("jobTitle"),
          taskDescription: textField("taskDescription"),
          postureDescription: textField("postureDescription"),
          locale: body.locale,
        }),
      });
      suggestions = mergeRulaActionSuggestions(parseRulaActionSuggestions(result.answer, bodySide), fallback, existingActionTitles);
      aiStatus = result.usedFallback || result.provider === "fallback" ? "fallback" : "connected";
      model = result.model ?? null;
      await recordAIUsage(prisma, { organizationId, userId: request.actor!.userId, useCase: "risk", sourceType: "RULA_ACTION_SUGGESTIONS", sourceId: request.id, result });
    } catch {
      aiStatus = "fallback";
    }
    await audit(request, "RULA_REPORT_ACTION_SUGGESTIONS", "RulaAssessment", id, { provider: provider.name, model, aiStatus, suggestionCount: suggestions.length });
    return envelope({ suggestions, provider: provider.name, model, aiStatus, minimum: 1 });
  });
  app.get("/api/v1/rula/:id/report", { preHandler: authenticate }, async (request) => {
    const organizationId = requireOrg(request); requirePermission(request, "reports.generate"); const { id } = parse(reportIdParams, request.params);
    return envelope(await loadRulaReport(id, organizationId));
  });
  app.get("/api/v1/reports/:type/:id.:format", { preHandler: authenticate }, async (request, reply) => {
    const organizationId = requireOrg(request); requirePermission(request, "reports.generate"); const { type, id, format } = parse(paramsSchema, request.params); const { view, locale } = parse(reportQuerySchema, request.query); const finalFmeaTable = type === "fmea" && view === "final-table";
    const data = type === "fmea" ? await prisma.fmeaAssessment.findFirst({ where: { id, organizationId, deletedAt: null }, include: { project: true, organization: { select: { nameFa: true, nameEn: true } }, jobCatalog: { select: { titleFa: true, titleEn: true } }, items: { orderBy: { rowNumber: "asc" } } } }) : await prisma.rulaAssessment.findFirst({ where: { id, organizationId }, include: { project: true } });
    if (!data) throw Object.assign(new Error("Assessment not found"), { statusCode: 404, code: "NOT_FOUND" });
    const rulaReport = type === "rula" ? await loadRulaReport(id, organizationId) : null;
    let fmeaPageReport: FmeaReportPayload | null = null;
    if (type === "fmea") {
      const fmea = data as unknown as FmeaReportData;
      fmea.riskThresholds = fmeaReferenceRiskThresholds();
      fmea.items = normaliseFmeaItems(fmea.items, fmea.riskThresholds);
      if (finalFmeaTable) {
        fmea.actions = await prisma.correctiveAction.findMany({ where: { organizationId, OR: [{ fmeaId: id }, { fmeaItem: { assessmentId: id } }] }, include: { fmeaItem: { select: { rowNumber: true, failureMode: true } } }, orderBy: { updatedAt: "desc" } });
      } else {
        fmeaPageReport = await loadFmeaReport(id, organizationId, locale);
        fmea.actions = fmeaPageReport.actions;
        fmea.evaluationTeam = fmeaPageReport.assessment.evaluationTeam.map((member) => ({ displayName: member.displayName, email: member.email, role: member.role }));
      }
    }
    if (finalFmeaTable) {
      const fmea = data as unknown as FmeaReportData;
      if (format === "pdf") return sendPdfBuffer(reply, "NIVASafe-FMEA-final-table", await buildFmeaFinalTablePdfDocument(fmea, locale));
      if (format === "doc" || format === "docx") return sendWord(reply, "NIVASafe-FMEA-final-table", await buildFmeaFinalTableWordDocument(fmea, locale));
      const document = await buildFmeaFinalTableWorkbook(fmea, locale);
      return reply.header("content-type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet").header("content-disposition", `attachment; filename="${reportFilename("NIVASafe-FMEA-final-table", "xlsx")}"`).send(document);
    }
    if (format === "pdf") {
      if (type === "fmea") {
        const fmea = data as unknown as FmeaReportData;
        if (!fmeaPageReport) throw new Error("FMEA report data was not loaded");
        return sendPdfBuffer(reply, `NIVASafe-${type.toUpperCase()}`, await buildFmeaReportPdfDocument(fmea, fmeaPageReport, locale));
      }
      const rula = data as RulaReportData;
      return sendPdfBuffer(reply, `NIVASafe-${type.toUpperCase()}`, await buildRulaReportPdfDocument(rula, rulaReport ?? undefined, locale));
    }
    if (format === "doc" || format === "docx") return sendWord(reply, `NIVASafe-${type.toUpperCase()}`, type === "fmea"
      ? await buildFmeaWordDocument(data as unknown as FmeaReportData, locale, fmeaPageReport ?? undefined)
      : await buildRulaWordDocument(data as RulaReportData, rulaReport ?? undefined, locale));
    const document = type === "fmea" && "items" in data
      ? await buildFmeaWorkbook(data as unknown as FmeaReportData, locale, fmeaPageReport ?? undefined)
      : await buildRulaWorkbook(data as RulaReportData, rulaReport ?? undefined, locale);
    return reply.header("content-type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet").header("content-disposition", `attachment; filename="${reportFilename(`NIVASafe-${type.toUpperCase()}`, "xlsx")}"`).send(document);
  });
}
