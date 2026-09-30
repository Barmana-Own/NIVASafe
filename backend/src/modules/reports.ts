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
    activeActions: "Active corrective actions",
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
    activeActions: "اقدامات فعال",
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

function fmeaLabels(locale: ReportLocale) {
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
    footer: "NIVASafe - گزارش RULA",
    noData: "اطلاعاتی ثبت نشده است",
  },
} as const satisfies Record<ReportLocale, Record<string, string>>;

function rulaLabels(locale: ReportLocale) {
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

function sendPdf(reply: FastifyReply, title: string, lines: string[], options?: { documentTitle?: string; footerLabel?: string }) {
  return buildPdfDocument(options?.documentTitle ?? title, lines, options?.footerLabel).then((buffer) => reply.header("content-type", "application/pdf").header("content-disposition", `attachment; filename=${reportFilename(title, "pdf")}`).send(buffer));
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
  return normaliseFmeaItems(data.items, DEFAULT_THRESHOLDS);
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

type FmeaReportPayload = {
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
  const active = actions.filter((action) => !["COMPLETED", "CANCELLED", "REJECTED"].includes(action.status)).length;
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

async function loadFmeaReport(id: string, organizationId: string): Promise<FmeaReportPayload> {
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
  const suggestedActions = fallbackFmeaActionSuggestions({ candidates: items, existingActionTitles: actions.filter((action) => !["CANCELLED", "REJECTED"].includes(action.status)).map((action) => action.title), locale: "fa" });
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
  return values.join(" | ") || "-";
}

function fmeaExportRows(data: FmeaReportData, locale: ReportLocale = "en"): ExportRow[] {
  return fmeaItemsForOutput(data).map((item) => [
    item.rowNumber,
    item.processStep,
    item.failureMode,
    item.effect,
    item.cause,
    [item.preventiveControls, item.detectionControls].filter(Boolean).join(" | ") || "-",
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
    [item.preventiveControls, item.detectionControls].filter(Boolean).join(" | ") || "-",
    item.severity,
    item.occurrence,
    item.detection,
    item.rpn,
    localizedFmeaRiskLevel(item.riskLevel, locale),
    fmeaRecommendedAction(data, item, locale),
  ]);
}

function pdfFinalTableCellText(value: ExportCell) {
  return normalizePdfText(String(value ?? "-")) || "-";
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

function drawFmeaFinalTableRow(doc: PDFKit.PDFDocument, row: ExportRow, widths: number[], fonts: PdfFontPaths, header = false) {
  const y = doc.y;
  const height = pdfFinalTableRowHeight(doc, row, widths, fonts, header);
  let x = doc.page.margins.left;
  row.forEach((value, index) => {
    const width = widths[index] ?? 20;
    doc.save();
    doc.rect(x, y, width, height).fillAndStroke(header ? "#1e5b8f" : "#ffffff", "#c9d9e5");
    doc.fillColor(header ? "#ffffff" : "#253746");
    doc.x = x + 4;
    doc.y = y + 4;
    drawPdfText(doc, pdfFinalTableCellText(value), fonts, Math.max(12, width - 8), header ? 7.1 : 7.3, header);
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
  const drawHeader = () => drawFmeaFinalTableRow(doc, [...headers], widths, resolvedFonts, true);
  drawHeader();
  for (const row of rows.length ? rows : [Array.from({ length: headers.length }, () => "-")]) {
    const rowHeight = pdfFinalTableRowHeight(doc, row, widths, resolvedFonts);
    if (doc.y + rowHeight > doc.page.height - margin - 28) {
      doc.addPage();
      drawHeader();
    }
    drawFmeaFinalTableRow(doc, row, widths, resolvedFonts);
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

function styleExportSheet(sheet: ExcelJS.Worksheet, widths: number[]) {
  sheet.columns.forEach((column, index) => { column.width = widths[index] ?? 18; });
  sheet.eachRow((row, rowNumber) => {
    row.height = rowNumber === 1 ? 28 : 38;
    row.eachCell((cell) => {
      cell.alignment = { vertical: "top", wrapText: true };
      if (rowNumber === 1) {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E5B8F" } };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      } else if (rowNumber % 2 === 0) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F7FB" } };
      }
    });
  });
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  if (sheet.rowCount > 1) sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: sheet.rowCount, column: sheet.columnCount } };
}

function addExportSheet(workbook: ExcelJS.Workbook, name: string, headers: string[], rows: ExportRow[], widths: number[]) {
  const sheet = workbook.addWorksheet(name);
  sheet.columns = headers.map((_, index) => ({ key: `column${index}`, width: widths[index] ?? 18 }));
  sheet.addRow(headers);
  rows.forEach((row) => sheet.addRow(row.map(excelExportCell)));
  styleExportSheet(sheet, widths);
  return sheet;
}

const DEFAULT_RULA_PREDICTION_NOTE = "Estimated from selected corrective actions; reassessment is required for the final RULA result.";
const INCOMPLETE_RULA_EXPLANATION = "Posture review is incomplete; the final RULA score is unavailable.";

type RulaExportModel = {
  assessment: RulaReportData | RulaReportExport["assessment"];
  reviewComplete: boolean;
  detailsRows: ExportRow[];
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
    ? affectedParts.map((part) => locale === "en" ? part : rulaPostureExportLabels[part as RulaPosturePart]?.[locale] ?? part).join(", ")
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

  const detailsRows: ExportRow[] = [
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
        hasIndependentSides ? `${localizedRulaBodySide(side, locale)} / ${locale === "en" ? factor.key : rulaPostureLabel(factor.key as RulaPosturePart, locale)}` : (locale === "en" ? factor.key : rulaPostureLabel(factor.key as RulaPosturePart, locale)),
        hasIndependentSides ? localizedRulaBodySide(side, locale) : "-",
        factor.angle === null ? "-" : String(factor.angle) + "°",
        factor.detected === undefined ? "-" : factor.detected ? "Yes" : "No",
        factor.reviewed === false ? "-" : factor.score,
        factor.reviewed === false ? "-" : String(factor.impactPercent) + "%",
        factor.reviewed === false ? labels.manualReview : factor.impactLevel,
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
      const relatedActions = activeActions.filter((action) => action.rulaImpact?.affectedParts?.includes(item.key));
      dataRows.push([
        hasIndependentSides ? localizedRulaBodySide(side, locale) : "-",
        index + 1,
        item.group,
        locale === "en" ? item.label : rulaPostureLabel(item.key, locale),
        row.angle === null ? "-" : String(row.angle) + "°",
        rulaPostureStatus(item.key, row, locale),
        reviewed ? row.score : "-",
        scoreShare === null ? "-" : String(scoreShare) + "%",
        relatedActions.length ? relatedActions.map((action) => action.title).join(" | ") : (locale === "fa" ? "اقدام اصلاحی انتخاب نشده است" : "No selected corrective action"),
      ]);
    }
  }

  const suggestionRows: ExportRow[] = (report?.suggestedActions ?? []).slice(0, 6).map((suggestion) => {
    const suggestedSide = suggestion.bodySide ?? (bodySide === "BOTH" ? "BOTH" : bodySide);
    const selected = report?.actions.some((action) => rulaActionMatchesSuggestion(action, suggestion, suggestedSide)) ?? false;
    return [
      localizedRulaBodySide(suggestedSide, locale),
      suggestion.affectedParts.map((part) => locale === "en" ? part : rulaPostureExportLabels[part]?.[locale] ?? part).join(", ") || "-",
      locale === "fa" ? suggestion.titleFa || suggestion.titleEn : suggestion.titleEn || suggestion.titleFa,
      locale === "fa" ? suggestion.descriptionFa || suggestion.descriptionEn : suggestion.descriptionEn || suggestion.descriptionFa,
      localizedRulaPriority(suggestion.priority, locale),
      suggestion.scoreReduction,
      localizedRulaSelection(selected, locale),
    ];
  });

  const actionRows: ExportRow[] = report?.actions.map((action) => [
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

  return { assessment, reviewComplete, detailsRows, summaryRows, processRows, impactRows, factorRows, dataRows, suggestionRows, actionRows };
}

function rulaPdfRows(headers: string[], rows: ExportRow[], emptyLabel: string) {
  return [headers.join(" | "), ...(rows.length ? rows : [headers.map(() => emptyLabel)]).map((row) => row.map((value) => String(value ?? "-")).join(" | "))];
}

export function buildRulaPdfLines(data: RulaReportData, report?: RulaReportExport, locale: ReportLocale = "en") {
  const labels = rulaLabels(locale);
  const model = buildRulaExportModel(data, report, locale);
  const factorHeaders = locale === "en"
    ? ["Body side", "Main factor", "Angle", "Detected", "Score", "Contribution", "Effect", "Source"]
    : [labels.bodySide, labels.factor, labels.angle, labels.detected, labels.score, labels.contribution, labels.effect, labels.source];
  const dataHeaders = [labels.bodySide, labels.row, labels.group, labels.bodyPart, labels.detectedAngle, labels.detectedStatus, labels.suggestedScore, labels.scoreShare, labels.selectedActions];
  const correctionHeaders = [labels.bodySide, labels.relatedFactors, labels.suggestedAction, labels.description, labels.priority, labels.estimatedReduction, labels.selection];
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
    ...(model.impactRows.length ? tableSection(impactHeading, [labels.bodySide, labels.field, labels.value], model.impactRows) : []),
    ...(report ? [
      ...tableSection(factorsHeading, factorHeaders, model.factorRows),
      ...tableSection(dataHeading, dataHeaders, model.dataRows),
      ...tableSection(correctionsHeading, correctionHeaders, model.suggestionRows),
      ...tableSection(actionsHeading, actionHeaders, model.actionRows),
    ] : []),
  ];
}

export async function buildFmeaWorkbook(data: FmeaReportData, locale: ReportLocale = "en") {
  const labels = fmeaLabels(locale);
  const workbook = new ExcelJS.Workbook();
  const summary = summariseFmea(fmeaItemsForOutput(data));
  const fmeaHeaders = locale === "en"
    ? ["Row", "Process / activity", "Failure mode", "Failure effect", "Failure cause", "Current controls", "S", "O", "D", "AP", "RPN", "Risk level", "Recommended action"]
    : [labels.row, labels.processActivity, labels.failureMode, labels.effect, labels.cause, labels.currentControls, labels.severity, labels.occurrence, labels.detection, labels.actionPriority, labels.rpn, labels.riskLevel, labels.recommendedAction];
  addExportSheet(workbook, "FMEA", fmeaHeaders, fmeaExportRows(data, locale), [8, 24, 26, 28, 28, 34, 7, 7, 7, 10, 10, 14, 44]);
  const summaryHeaders = locale === "en" ? ["Metric", "Value"] : [labels.field, labels.value];
  addExportSheet(workbook, "SUMMARY", summaryHeaders, [
    [locale === "en" ? "Assessment title" : labels.title, data.title],
    [labels.code, data.code],
    [labels.project, data.project.name],
    [labels.company, fmeaCompanyName(data, locale)],
    [labels.status, localizedFmeaStatus(data.status, locale)],
    [labels.date, reportDate(data.approvedAt ?? data.updatedAt, locale)],
    [labels.totalFailureModes, summary.totalFailureModes],
    [labels.highPriorityRisks, summary.highPriorityRisks],
    [labels.correctiveActionsNeeded, summary.correctiveActionsNeeded],
    [labels.immediateActions, summary.immediateActions],
    [localizedFmeaRiskLevel("CRITICAL", locale), summary.distribution.CRITICAL],
    [localizedFmeaRiskLevel("HIGH", locale), summary.distribution.HIGH],
    [localizedFmeaRiskLevel("MEDIUM", locale), summary.distribution.MEDIUM],
    [localizedFmeaRiskLevel("LOW", locale), summary.distribution.LOW],
    [localizedFmeaRiskLevel("VERY_LOW", locale), summary.distribution.VERY_LOW],
  ], [34, 90]);
  addExportSheet(workbook, "PROCESS", summaryHeaders, [
    [locale === "en" ? "Job/process" : labels.process, fmeaProcessTitle(data, locale)],
    [labels.department, data.department ?? "-"],
    [labels.activity, data.activityDescription ?? "-"],
    [labels.equipment, reportList(data.equipment)],
    [labels.materials, reportList(data.materials)],
    [labels.existingControls, reportList(data.existingControls)],
    [labels.specialConditions, data.specialConditions ?? "-"],
  ], [34, 90]);
  const actionHeaders = locale === "en"
    ? ["Related risk", "Title", "Description", "Priority", "Status", "Assignee", "Progress", "Due date"]
    : [labels.relatedRisk, labels.title, labels.description, labels.priority, labels.actionStatus, labels.assignee, labels.actionProgress, labels.dueDate];
  addExportSheet(workbook, "ACTIONS", actionHeaders, data.actions.map((action) => [
    action.fmeaItem ? `#${action.fmeaItem.rowNumber} · ${action.fmeaItem.failureMode}` : "-",
    action.title,
    action.description,
    localizedFmeaActionPriority(action.priority, locale),
    localizedFmeaStatus(action.status, locale),
    action.assigneeName ?? "-",
    action.progress,
    reportDate(action.dueDate, locale),
  ]), [28, 28, 40, 14, 18, 24, 12, 16]);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function buildFmeaFinalTableWorkbook(data: FmeaReportData, locale: ReportLocale = "en") {
  const labels = fmeaLabels(locale);
  const workbook = new ExcelJS.Workbook();
  addExportSheet(workbook, "FMEA", fmeaFinalTableHeaders(locale), fmeaFinalTableRows(data, locale), FMEA_FINAL_TABLE_WIDTHS);
  if (locale === "fa") {
    addExportSheet(workbook, "DETAILS", [labels.field, labels.value], [
      [labels.process, fmeaProcessTitle(data, locale)],
      [labels.company, fmeaCompanyName(data, locale)],
      [labels.date, reportDate(data.approvedAt ?? data.updatedAt, locale)],
      [labels.code, data.code],
      [labels.project, data.project.name],
      [labels.status, localizedFmeaStatus(data.status, locale)],
      [labels.method, "FMEA"],
      [labels.version, data.version ?? "-"],
    ], [34, 110]);
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function buildRulaWorkbook(data: RulaReportData, report?: RulaReportExport, locale: ReportLocale = "en") {
  const labels = rulaLabels(locale);
  const workbook = new ExcelJS.Workbook();
  const model = buildRulaExportModel(data, report, locale);
  const fieldValueHeaders = [labels.field, labels.value];
  const factorHeaders = locale === "en"
    ? ["Body side", "Main factor", "Angle", "Detected", "Score", "Contribution", "Effect", "Source"]
    : [labels.bodySide, labels.factor, labels.angle, labels.detected, labels.score, labels.contribution, labels.effect, labels.source];
  const dataHeaders = [labels.bodySide, labels.row, labels.group, labels.bodyPart, labels.detectedAngle, labels.detectedStatus, labels.suggestedScore, labels.scoreShare, labels.selectedActions];
  const correctionHeaders = [labels.bodySide, labels.relatedFactors, labels.suggestedAction, labels.description, labels.priority, labels.estimatedReduction, labels.selection];
  const actionHeaders = locale === "en"
    ? ["Action", "Description", "Related factors", "Body side", "Priority", "Status", "Selection", "Estimated reduction"]
    : [labels.action, labels.description, labels.relatedFactors, labels.bodySide, labels.priority, labels.status, labels.selection, labels.estimatedReduction];
  addExportSheet(workbook, "RULA", fieldValueHeaders, model.summaryRows, [34, 100]);
  addExportSheet(workbook, "SUMMARY", fieldValueHeaders, model.detailsRows, [34, 100]);
  addExportSheet(workbook, "PROCESS", fieldValueHeaders, model.processRows, [34, 100]);
  addExportSheet(workbook, "IMPACT", [labels.bodySide, labels.field, labels.value], model.impactRows, [16, 34, 80]);
  addExportSheet(workbook, "FACTORS", factorHeaders, model.factorRows, [16, 28, 16, 12, 12, 18, 28, 18]);
  addExportSheet(workbook, "RULA DATA", dataHeaders, model.dataRows, [16, 8, 8, 24, 18, 22, 18, 16, 48]);
  addExportSheet(workbook, "CORRECTIONS", correctionHeaders, model.suggestionRows, [16, 28, 34, 60, 14, 20, 16]);
  addExportSheet(workbook, "ACTIONS", actionHeaders, model.actionRows, [32, 52, 28, 16, 16, 18, 18, 22]);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function docxRuns(value: unknown, bold = false, rtl = false) {
  const runProperties = bold || rtl ? `<w:rPr>${bold ? "<w:b/>" : ""}${rtl ? "<w:rtl/>" : ""}</w:rPr>` : "";
  return String(value ?? "-").split(/\r?\n/).map((line, index) => `${index ? "<w:r><w:br/></w:r>" : ""}<w:r>${runProperties}<w:t xml:space="preserve">${xmlEscape(line)}</w:t></w:r>`).join("");
}

function docxParagraph(value: unknown, style?: "Title" | "Heading1" | "Heading2", locale: ReportLocale = "en") {
  const paragraphProperties = style || locale === "fa" ? `<w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ""}${locale === "fa" ? "<w:bidi/><w:jc w:val=\"right\"/>" : ""}</w:pPr>` : "";
  return `<w:p>${paragraphProperties}${docxRuns(value, false, locale === "fa")}</w:p>`;
}

function docxTable(headers: string[], rows: ExportRow[], locale: ReportLocale = "en") {
  const widths = headers.map((_, index) => index === headers.length - 1 ? 15400 - Math.floor(15400 / headers.length) * (headers.length - 1) : Math.floor(15400 / headers.length));
  const grid = widths.map((width) => `<w:gridCol w:w="${width}"/>`).join("");
  const renderRow = (row: ExportRow, header = false) => `<w:tr>${header ? "<w:trPr><w:tblHeader/></w:trPr>" : ""}${headers.map((_, index) => `<w:tc><w:tcPr><w:tcW w:w="${widths[index] ?? 1000}" w:type="dxa"/>${header ? "<w:shd w:fill=\"1E5B8F\"/>" : ""}</w:tcPr><w:p><w:pPr><w:spacing w:after="0"/>${locale === "fa" ? "<w:bidi/><w:jc w:val=\"right\"/>" : "<w:jc w:val=\"left\"/>"}</w:pPr>${docxRuns(row[index] ?? "-", header, locale === "fa")}</w:p></w:tc>`).join("")}</w:tr>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="15400" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="C9D9E5"/><w:left w:val="single" w:sz="4" w:color="C9D9E5"/><w:bottom w:val="single" w:sz="4" w:color="C9D9E5"/><w:right w:val="single" w:sz="4" w:color="C9D9E5"/><w:insideH w:val="single" w:sz="4" w:color="C9D9E5"/><w:insideV w:val="single" w:sz="4" w:color="C9D9E5"/></w:tblBorders><w:tblCellMar><w:top w:w="80" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${renderRow(headers, true)}${rows.map((row) => renderRow(row)).join("")}</w:tbl>`;
}

type DocxSection = { heading: string; headers: string[]; rows: ExportRow[] };

const docxStyles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="20"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:color w:val="174E86"/><w:sz w:val="32"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:color w:val="255B88"/><w:sz w:val="26"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:color w:val="255B88"/><w:sz w:val="22"/></w:rPr></w:style></w:styles>`;

async function buildDocx(title: string, subtitle: string, sections: DocxSection[], locale: ReportLocale = "en") {
  const generatedAt = new Date().toISOString();
  const body = `${docxParagraph(title, "Title", locale)}${docxParagraph(subtitle, undefined, locale)}${sections.map((section) => `${docxParagraph(section.heading, "Heading1", locale)}${docxTable(section.headers, section.rows, locale)}`).join("")}<w:sectPr><w:pgSz w:w="16840" w:h="11900" w:orient="landscape"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/></w:sectPr>`;
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

export async function buildFmeaWordDocument(data: FmeaReportData, locale: ReportLocale = "en") {
  const labels = fmeaLabels(locale);
  const items = fmeaItemsForOutput(data);
  const summary = summariseFmea(items);
  const actionMetrics = fmeaActionMetrics(data.actions);
  const totalFailureModes = Math.max(summary.totalFailureModes, 1);
  const itemRows = items.map((item) => ({ ...item, actionPriority: actionPriority(item.riskLevel) }));
  const topItems = topFailureModes(itemRows);
  const suggestedActions = fmeaSuggestedActions(data);
  const evaluationTeam = data.evaluationTeam?.map((member) => `${member.displayName || member.email} (${member.role})`).filter(Boolean).join(" | ") || "-";
  const processTitle = fmeaProcessTitle(data, locale);
  const actionHeaders = locale === "en"
    ? ["Related risk", "Title", "Description", "Priority", "Status", "Assignee", "Progress", "Due date"]
    : [labels.relatedRisk, labels.title, labels.description, labels.priority, labels.actionStatus, labels.assignee, labels.actionProgress, labels.dueDate];
  const fullDetailsHeaders = locale === "en"
    ? ["Row", "Process / activity", "Failure mode", "Failure effect", "Failure cause", "Current controls", "S", "O", "D", "AP", "RPN", "Risk level", "Recommended action"]
    : [labels.row, labels.processActivity, labels.failureMode, labels.effect, labels.cause, labels.currentControls, labels.severity, labels.occurrence, labels.detection, labels.actionPriority, labels.rpn, labels.riskLevel, labels.recommendedAction];
  const actionRows = data.actions.map((action) => [
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
    { heading: labels.assessmentDetails, headers: [labels.field, labels.value], rows: [[labels.process, processTitle], [labels.company, fmeaCompanyName(data, locale)], [labels.date, reportDate(data.approvedAt ?? data.updatedAt, locale)], [labels.code, data.code], [labels.project, data.project.name], [labels.status, localizedFmeaStatus(data.status, locale)], [labels.method, "FMEA"], [labels.version, data.version ?? "-"]] },
    { heading: labels.summary, headers: [labels.field, labels.value], rows: [[labels.totalFailureModes, summary.totalFailureModes], [labels.highPriorityRisks, summary.highPriorityRisks], [labels.correctiveActionsNeeded, summary.correctiveActionsNeeded], [labels.immediateActions, summary.immediateActions], [labels.registeredActions, data.actions.length], [labels.completedActions, actionMetrics.completed], [labels.activeActions, actionMetrics.active], [labels.progress, `${actionMetrics.progress}%`]] },
    { heading: labels.processInformation, headers: [labels.field, labels.value], rows: [[labels.process, processTitle], [labels.company, fmeaCompanyName(data, locale)], [labels.status, localizedFmeaStatus(data.status, locale)], [labels.date, reportDate(data.approvedAt ?? data.updatedAt, locale)], [labels.method, "FMEA"], [labels.team, evaluationTeam], [labels.department, data.department ?? "-"], [labels.activity, data.activityDescription ?? "-"], [labels.equipment, reportList(data.equipment)], [labels.materials, reportList(data.materials)], [labels.existingControls, reportList(data.existingControls)], [labels.specialConditions, data.specialConditions ?? "-"]] },
    { heading: locale === "en" ? "Risk-level distribution" : labels.riskDistribution, headers: [labels.riskLevel, labels.count, labels.share], rows: Object.entries(summary.distribution).map(([level, count]) => [localizedFmeaRiskLevel(level, locale), count, `${Math.round((count / totalFailureModes) * 100)}%`]) },
    { heading: locale === "en" ? "Top failure modes" : labels.topFailureModes, headers: locale === "en" ? ["Row", "Process / activity", "Failure mode", "Effect", "S", "O", "D", "AP", "RPN", "Risk level"] : [labels.row, labels.processActivity, labels.failureMode, labels.effect, labels.severity, labels.occurrence, labels.detection, labels.actionPriority, labels.rpn, labels.riskLevel], rows: topItems.map((item) => [item.rowNumber, item.processStep, item.failureMode, item.effect, item.severity, item.occurrence, item.detection, localizedFmeaActionPriority(item.actionPriority, locale), item.rpn, localizedFmeaRiskLevel(item.riskLevel, locale)]) },
    { heading: locale === "en" ? "Proposed corrective actions / controls" : labels.proposedActions, headers: locale === "en" ? ["Related risk", "Failure mode", "Proposed action", "Priority"] : [labels.relatedRisk, labels.failureMode, labels.recommendedAction, labels.priority], rows: suggestedActions.length ? suggestedActions.map((item) => [`#${item.rowNumber}`, item.failureMode, item.recommendation?.trim() ?? "-", localizedFmeaActionPriority(actionPriority(item.riskLevel), locale)]) : [["-", "-", labels.noRecommendations, "-"]] },
    { heading: locale === "en" ? "Corrective actions" : labels.actionRegister, headers: actionHeaders, rows: actionRows.length ? actionRows : [["-", "-", labels.noActions, "-", "-", "-", 0, "-"]] },
    { heading: locale === "en" ? "Full FMEA details" : labels.fullDetails, headers: fullDetailsHeaders, rows: fmeaExportRows(data, locale) },
    { heading: labels.finalTableHeading, headers: fmeaFinalTableHeaders(locale), rows: fmeaFinalTableRows(data, locale) },
  ], locale);
}

export async function buildFmeaFinalTableWordDocument(data: FmeaReportData, locale: ReportLocale = "en") {
  const labels = fmeaLabels(locale);
  const processTitle = fmeaProcessTitle(data, locale);
  return buildDocx(labels.finalTableTitle, `${labels.process}: ${processTitle} · ${labels.date}: ${reportDate(data.approvedAt ?? data.updatedAt, locale)}`, [
    { heading: labels.assessmentDetails, headers: [labels.field, labels.value], rows: [[labels.process, processTitle], [labels.company, fmeaCompanyName(data, locale)], [labels.date, reportDate(data.approvedAt ?? data.updatedAt, locale)], [labels.code, data.code], [labels.project, data.project.name], [labels.status, localizedFmeaStatus(data.status, locale)], [labels.method, "FMEA"], [labels.version, data.version ?? "-"]] },
    { heading: labels.finalTableHeading, headers: fmeaFinalTableHeaders(locale), rows: fmeaFinalTableRows(data, locale) },
  ], locale);
}

export async function buildRulaWordDocument(data: RulaReportData, report?: RulaReportExport, locale: ReportLocale = "en") {
  const labels = rulaLabels(locale);
  const model = buildRulaExportModel(data, report, locale);
  const factorHeaders = locale === "en"
    ? ["Body side", "Factor", "Angle", "Detected", "Score", "Contribution", "Effect", "Source"]
    : [labels.bodySide, labels.factor, labels.angle, labels.detected, labels.score, labels.contribution, labels.effect, labels.source];
  const dataHeaders = [labels.bodySide, labels.row, labels.group, labels.bodyPart, labels.detectedAngle, labels.detectedStatus, labels.suggestedScore, labels.scoreShare, labels.selectedActions];
  const correctionHeaders = [labels.bodySide, labels.relatedFactors, labels.suggestedAction, labels.description, labels.priority, labels.estimatedReduction, labels.selection];
  const actionHeaders = locale === "en"
    ? ["Action", "Description", "Related factors", "Body side", "Priority", "Status", "Selection", "Estimated reduction"]
    : [labels.action, labels.description, labels.relatedFactors, labels.bodySide, labels.priority, labels.status, labels.selection, labels.estimatedReduction];
  return buildDocx(labels.reportTitle, `${labels.code}: ${model.assessment.subjectCode?.trim() || "-"} · ${labels.project}: ${model.assessment.project.name}`, [
    { heading: labels.assessmentDetails, headers: [labels.field, labels.value], rows: model.detailsRows },
    { heading: labels.summary, headers: [labels.field, labels.value], rows: model.summaryRows },
    ...(model.processRows.length ? [{ heading: labels.processInformation, headers: [labels.field, labels.value], rows: model.processRows }] : []),
    ...(model.impactRows.length ? [{ heading: labels.predictedEffect, headers: [labels.bodySide, labels.field, labels.value], rows: model.impactRows }] : []),
    ...(report ? [
      { heading: labels.mainFactors, headers: factorHeaders, rows: model.factorRows },
      { heading: labels.assessmentData, headers: dataHeaders, rows: model.dataRows },
      { heading: labels.proposedActions, headers: correctionHeaders, rows: model.suggestionRows },
      { heading: labels.selectedActions, headers: actionHeaders, rows: model.actionRows },
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
    const organizationId = requireOrg(request); requirePermission(request, "reports.generate"); const { id } = parse(reportIdParams, request.params);
    return envelope(await loadFmeaReport(id, organizationId));
  });
  app.post("/api/v1/fmea/:id/report/action-suggestions", { preHandler: authenticate, config: { rateLimit: { max: 8, timeWindow: "1 minute" } } }, async (request) => {
    const organizationId = requireOrg(request); requirePermission(request, "reports.generate");
    const { id } = parse(reportIdParams, request.params);
    const body = parse(reportActionSuggestionBody, request.body);
    const report = await loadFmeaReport(id, organizationId);
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
    if (type === "fmea") {
      const fmea = data as unknown as FmeaReportData;
      fmea.riskThresholds = fmeaReferenceRiskThresholds();
      fmea.items = normaliseFmeaItems(fmea.items, fmea.riskThresholds);
      const linkedActions = await prisma.correctiveAction.findMany({ where: { organizationId, OR: [{ fmeaId: id }, { fmeaItem: { assessmentId: id } }] }, include: { fmeaItem: { select: { rowNumber: true, failureMode: true } } }, orderBy: { updatedAt: "desc" } });
      fmea.actions = linkedActions;
      if (!finalFmeaTable && (format === "pdf" || format === "doc" || format === "docx")) {
        const members = await prisma.organizationMember.findMany({ where: { organizationId, active: true }, select: { user: { select: { displayName: true, email: true } }, role: true }, orderBy: { user: { displayName: "asc" } } });
        fmea.evaluationTeam = members.map((member) => ({ displayName: member.user.displayName, email: member.user.email, role: member.role }));
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
        return sendPdf(reply, `NIVASafe-${type.toUpperCase()}`, buildFmeaPdfLines({ ...fmea, evaluationTeam: fmea.evaluationTeam ?? [] }, locale), { documentTitle: fmeaLabels(locale).reportTitle, footerLabel: fmeaLabels(locale).footer });
      }
      const rula = data as RulaReportData;
      return sendPdf(reply, `NIVASafe-${type.toUpperCase()}`, buildRulaPdfLines(rula, rulaReport ?? undefined, locale), { documentTitle: rulaLabels(locale).reportTitle, footerLabel: rulaLabels(locale).footer });
    }
    if (format === "doc" || format === "docx") return sendWord(reply, `NIVASafe-${type.toUpperCase()}`, type === "fmea" ? await buildFmeaWordDocument(data as unknown as FmeaReportData, locale) : await buildRulaWordDocument(data as RulaReportData, rulaReport ?? undefined, locale));
    const document = type === "fmea" && "items" in data
      ? await buildFmeaWorkbook(data as unknown as FmeaReportData, locale)
      : await buildRulaWorkbook(data as RulaReportData, rulaReport ?? undefined, locale);
    return reply.header("content-type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet").header("content-disposition", `attachment; filename="${reportFilename(`NIVASafe-${type.toUpperCase()}`, "xlsx")}"`).send(document);
  });
}
