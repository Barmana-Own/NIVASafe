import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { FastifyInstance, FastifyReply } from "fastify";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import PDFDocument from "pdfkit";
import { z } from "zod";
import { authenticate } from "../auth-guard.js";
import { recordAIUsage } from "../ai-usage.js";
import { getAvailableAssessmentAIProvider } from "../ai-provider.js";
import { audit, envelope, parse, prisma, requireOrg, requirePermission } from "../core.js";
import { actionPriority, buildFmeaReportDetailSeedRows, buildFmeaReportDetailSuggestionsPrompt, ensureMinimumFmeaReportDetailSuggestions, fallbackFmeaReportDetailSuggestions, FMEA_REPORT_DETAIL_SUGGESTION_MAX, FMEA_REPORT_DETAIL_SUGGESTION_MIN, parseFmeaReportDetailSuggestions, summariseFmea, topFailureModes, type FmeaReportDetailSuggestion, type FmeaReportRisk } from "../fmea-report.js";
import { buildRulaFactors, parseRulaInputs, parseRulaPostureAnalysis, predictedRulaScore, rulaImpactSchema } from "../rula-report.js";
import { isRulaPostureAnalysisReviewed, type RulaPostureAnalysis } from "../rula-posture.js";
import { buildFmeaActionSuggestionsPrompt, buildRulaActionSuggestionsPrompt, fallbackFmeaActionSuggestions, fallbackRulaActionSuggestions, mergeFmeaActionSuggestions, mergeRulaActionSuggestions, parseFmeaActionSuggestions, parseRulaActionSuggestions, type FmeaActionCandidate } from "../assessment-action-suggestions.js";

const paramsSchema = z.object({ type: z.enum(["fmea", "rula"]), id: z.string().uuid(), format: z.enum(["pdf", "xlsx", "doc", "docx"]) });

const pdfRtlCharacter = /[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufeff]/u;
const pdfLtrCharacter = /[A-Za-z\u00c0-\u024f\u1e00-\u1eff0-9]/u;
const pdfSectionHeadings = new Set([
  "REPORT HEADER",
  "PROCESS INFORMATION",
  "EXECUTIVE RISK SUMMARY",
  "RISK-LEVEL DISTRIBUTION",
  "TOP FAILURE MODES",
  "CORRECTIVE ACTIONS / CONTROLS",
  "FULL FMEA DETAILS",
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

function drawPdfFooter(doc: PDFKit.PDFDocument, fonts: PdfFontPaths, margin: number, pageNumber: number, pageCount: number) {
  const lineY = doc.page.height - margin - 20;
  const textY = doc.page.height - margin - 12;
  doc.save();
  doc.strokeColor("#d9e5ee").lineWidth(0.6).moveTo(margin, lineY).lineTo(doc.page.width - margin, lineY).stroke();
  doc.fillColor("#6d7e8b").font(fonts.regular).fontSize(8).text(`NIVASafe - FMEA report | ${pageNumber} / ${pageCount}`, margin, textY, { width: doc.page.width - margin * 2, align: "center", lineBreak: false });
  doc.restore();
}

export async function buildPdfDocument(title: string, lines: string[]) {
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
    drawPdfFooter(doc, resolvedFonts, margin, index - pageRange.start + 1, pageRange.count);
  }
  doc.end();
  return complete;
}

function sendPdf(reply: FastifyReply, title: string, lines: string[]) {
  return buildPdfDocument(title, lines).then((buffer) => reply.header("content-type", "application/pdf").header("content-disposition", `attachment; filename=${reportFilename(title, "pdf")}`).send(buffer));
}
function reportList(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()).join(", ") || "-" : "-"; }

export type FmeaReportData = {
  title: string;
  code: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  approvedAt: Date | null;
  project: { name: string };
  organization: { nameFa: string; nameEn: string };
  department: string | null;
  activityDescription: string | null;
  equipment: unknown;
  materials: unknown;
  existingControls: unknown;
  specialConditions: string | null;
  jobCatalog: { titleFa: string; titleEn: string } | null;
  items: Array<{ id?: string; rowNumber: number; processStep: string; failureMode: string; effect: string; cause: string; preventiveControls: string | null; detectionControls: string | null; severity: number; occurrence: number; detection: number; rpn: number; riskLevel: string; recommendation: string | null }>;
  actions: Array<{ id?: string; title: string; description: string; priority: string; status: string; progress: number; assigneeName: string | null; dueDate: Date | null; fmeaItemId: string | null; fmeaItem: { rowNumber: number; failureMode: string } | null }>;
};

export type FmeaReportPdfData = FmeaReportData & {
  evaluationTeam: Array<{ displayName: string; email: string; role: string }>;
};

export type RulaReportData = { title: string; project: { name: string }; score: number; actionLevel: number; explanation: string; status?: string; bodySide?: "LEFT" | "RIGHT" | "BOTH"; postureReviewComplete?: boolean };
export type RulaReportExport = {
  assessment: { title: string; project: { name: string }; score: number; actionLevel: number; explanation: string; status?: string; bodySide?: "LEFT" | "RIGHT" | "BOTH"; postureReviewComplete?: boolean };
  factors: Array<{ key: string; angle: number | null; detected?: boolean; score: number; impactPercent: number; impactLevel: string; source?: string; reviewed?: boolean }>;
  actions: Array<{ title: string; description: string; priority: string; status?: string; bodySide?: "LEFT" | "RIGHT" | "BOTH" | null; rulaImpact?: { scoreReduction: number; affectedParts?: string[] } | null }>;
  predictedScore: number;
  predictedNote?: string;
};

const reportIdParams = z.object({ id: z.string().uuid() });
const fmeaReportDetailSuggestionBody = z.object({ locale: z.enum(["fa", "en"]).default("fa"), autoCreate: z.boolean().default(false) });
const reportActionSuggestionBody = z.object({ locale: z.enum(["fa", "en"]).default("fa") });

type FmeaReportPayload = {
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

export function buildFmeaPdfLines(data: FmeaReportPdfData) {
  const summary = summariseFmea(data.items);
  const itemRows = data.items.map((item) => ({ ...item, actionPriority: actionPriority(item.riskLevel) }));
  const topItems = topFailureModes(itemRows);
  const suggestedActions = data.items.filter((item) => Boolean(item.recommendation?.trim()) && !data.actions.some((action) => action.fmeaItem?.rowNumber === item.rowNumber && action.title.trim().toLowerCase() === item.recommendation!.trim().toLowerCase()));
  const team = data.evaluationTeam.map((member) => `${member.displayName || member.email} (${member.role})`).filter(Boolean).join(" | ") || "-";
  const processTitle = data.jobCatalog?.titleEn || data.title;
  const controls = (item: FmeaReportData["items"][number]) => [item.preventiveControls, item.detectionControls].filter(Boolean).join(" | ") || "-";
  const relatedRisk = (action: FmeaReportData["actions"][number]) => action.fmeaItem ? `#${action.fmeaItem.rowNumber} · ${action.fmeaItem.failureMode}` : "Unlinked";

  return [
    "REPORT HEADER",
    `Assessment status: ${data.status}`,
    `Process / job: ${processTitle}`,
    `Company: ${data.organization.nameEn || data.organization.nameFa}`,
    `Assessment date: ${pdfDate(data.approvedAt ?? data.updatedAt)}`,
    "Assessment method: FMEA",
    `Evaluation team (${data.evaluationTeam.length}): ${team}`,
    `Assessment code: ${data.code}`,
    `Project: ${data.project.name}`,
    "",
    "PROCESS INFORMATION",
    `Department / unit: ${data.department ?? "-"}`,
    `Activity description: ${data.activityDescription ?? "-"}`,
    `Equipment / machinery: ${reportList(data.equipment)}`,
    `Materials: ${reportList(data.materials)}`,
    `Existing controls: ${reportList(data.existingControls)}`,
    `Special conditions: ${data.specialConditions ?? "-"}`,
    "",
    "EXECUTIVE RISK SUMMARY",
    `Total failure modes: ${summary.totalFailureModes}`,
    `High-priority risks: ${summary.highPriorityRisks}`,
    `Corrective actions needed: ${summary.correctiveActionsNeeded}`,
    `Immediate actions: ${summary.immediateActions}`,
    "",
    "RISK-LEVEL DISTRIBUTION",
    `Critical: ${summary.distribution.CRITICAL}`,
    `High: ${summary.distribution.HIGH}`,
    `Medium: ${summary.distribution.MEDIUM}`,
    `Low: ${summary.distribution.LOW}`,
    `Very low: ${summary.distribution.VERY_LOW}`,
    "",
    "TOP FAILURE MODES",
    ...(topItems.length ? topItems.flatMap((item) => [
      `#${item.rowNumber} · ${item.processStep} · ${item.failureMode}`,
      `Effect: ${item.effect} | S ${item.severity} | O ${item.occurrence} | D ${item.detection} | AP ${item.actionPriority} | RPN ${item.rpn}`,
    ]) : ["-"]),
    "",
    "CORRECTIVE ACTIONS / CONTROLS",
    ...(data.actions.length ? data.actions.flatMap((action) => [
      `Registered | ${relatedRisk(action)} | ${action.title}`,
      `Description: ${action.description} | Priority: ${action.priority} | Status: ${action.status} | Responsible: ${action.assigneeName ?? "-"} | Progress: ${action.progress}% | Due: ${pdfDate(action.dueDate)}`,
    ]) : ["Registered actions: -"]),
    ...(suggestedActions.length ? ["NIVASafe suggestions (not registered):", ...suggestedActions.map((item) => `#${item.rowNumber} · ${item.failureMode} | ${item.recommendation!.trim()} | Priority: ${actionPriority(item.riskLevel)}`)] : ["NIVASafe suggestions (not registered): -"]),
    "",
    "FULL FMEA DETAILS",
    ...(data.items.length ? data.items.flatMap((item) => {
      const actionText = fmeaRecommendedAction(data, item);
      return [
        `#${item.rowNumber} · Process / activity: ${item.processStep}`,
        `Failure mode: ${item.failureMode}`,
        `Failure effect: ${item.effect}`,
        `Failure cause: ${item.cause}`,
        `Current controls: ${controls(item)}`,
        `S ${item.severity} | O ${item.occurrence} | D ${item.detection} | AP ${actionPriority(item.riskLevel)} | RPN ${item.rpn} | Risk level: ${item.riskLevel}`,
        `Corrective actions: ${actionText}`,
      ];
    }) : ["-"]),
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
  const impacts = rula.actions.map((action) => actionRulaImpact(action, rula.score));
  const activeImpacts = rula.actions.flatMap((action, index) => isActiveRulaAction(action.status) ? [impacts[index]] : []);
  return {
    assessment: {
      id: rula.id,
      title: rula.title,
      project: rula.project,
      score: rula.score,
      actionLevel: rula.actionLevel,
      explanation: rula.explanation,
      status: rula.status,
      updatedAt: rula.updatedAt,
      activityInfo: rula.activityInfo,
      bodySide,
      postureReviewComplete: isRulaPostureAnalysisReviewed(bodySide, postureAnalysis),
      postureAnalysis,
    },
    factors: buildRulaFactors(postureAnalysis),
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
    predictedScore: predictedRulaScore(rula.score, activeImpacts),
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
  const items = fmea.items.map((item) => ({
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
  }));
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
    topFailureModes: topFailureModes(reportItemsWithActions).map((item) => ({ ...item, actionPriority: actionPriority(item.riskLevel) })),
    suggestedActions,
    actions,
  };
}

type ExportCell = string | number | null;
type ExportRow = ExportCell[];

function fmeaCorrectiveActions(data: FmeaReportData, item: FmeaReportData["items"][number]) {
  return data.actions.filter((action) => (item.id && action.fmeaItemId === item.id) || action.fmeaItem?.rowNumber === item.rowNumber);
}

function fmeaRecommendedAction(data: FmeaReportData, item: FmeaReportData["items"][number]) {
  const values = item.recommendation?.trim() ? [item.recommendation.trim()] : [];
  for (const action of fmeaCorrectiveActions(data, item)) {
    const title = action.title.trim();
    if (title && !values.some((value) => value.toLocaleLowerCase() === title.toLocaleLowerCase())) values.push(`${title} (${action.status}, ${action.priority})`);
  }
  return values.join(" | ") || "-";
}

function fmeaExportRows(data: FmeaReportData): ExportRow[] {
  return data.items.map((item) => [
    item.rowNumber,
    item.processStep,
    item.failureMode,
    item.effect,
    item.cause,
    [item.preventiveControls, item.detectionControls].filter(Boolean).join(" | ") || "-",
    item.severity,
    item.occurrence,
    item.detection,
    actionPriority(item.riskLevel),
    item.rpn,
    item.riskLevel,
    fmeaRecommendedAction(data, item),
  ]);
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
  summaryRows: ExportRow[];
  factorRows: ExportRow[];
  actionRows: ExportRow[];
};

function isRulaActionSelected(status?: string) {
  return status ? !["CANCELLED", "REJECTED"].includes(status) : true;
}

function buildRulaExportModel(data: RulaReportData, report?: RulaReportExport): RulaExportModel {
  const assessment = report?.assessment ?? data;
  const reviewComplete = assessment.postureReviewComplete ?? report?.factors.every((factor) => factor.reviewed !== false) ?? true;
  const predictionNote = report?.predictedNote ?? DEFAULT_RULA_PREDICTION_NOTE;
  const summaryRows: ExportRow[] = [
    ["Title", assessment.title],
    ["Project", assessment.project.name],
    ["Score", reviewComplete ? assessment.score : "-"],
    ["Action level", reviewComplete ? assessment.actionLevel : "-"],
    ["Status", assessment.status ?? "-"],
    ["Explanation", reviewComplete ? assessment.explanation : INCOMPLETE_RULA_EXPLANATION],
  ];

  if (report && reviewComplete) {
    summaryRows.push(["Predicted score (estimate)", report.predictedScore], ["Prediction note", predictionNote]);
  }

  const factorRows: ExportRow[] = report?.factors.map((factor) => [
    factor.key,
    factor.angle === null ? "-" : `${factor.angle}°`,
    factor.detected === undefined ? "-" : factor.detected ? "Yes" : "No",
    factor.reviewed === false ? "-" : factor.score,
    factor.reviewed === false ? "-" : `${factor.impactPercent}%`,
    factor.reviewed === false ? "Manual review required" : factor.impactLevel,
    factor.source ?? "-",
  ]) ?? [];

  const actionRows: ExportRow[] = report?.actions.map((action) => [
    action.title,
    action.description,
    action.rulaImpact?.affectedParts?.join(", ") || "-",
    action.bodySide ?? "-",
    action.priority,
    action.status ?? "-",
    isRulaActionSelected(action.status) ? "Selected" : "Not selected",
    action.rulaImpact?.scoreReduction ?? 0,
  ]) ?? [];

  return { assessment, reviewComplete, summaryRows, factorRows, actionRows };
}

export async function buildFmeaWorkbook(data: FmeaReportData) {
  const workbook = new ExcelJS.Workbook();
  const summary = summariseFmea(data.items);
  addExportSheet(workbook, "FMEA", ["Row", "Process / activity", "Failure mode", "Failure effect", "Failure cause", "Current controls", "S", "O", "D", "AP", "RPN", "Risk level", "Recommended action"], fmeaExportRows(data), [8, 24, 26, 28, 28, 34, 7, 7, 7, 10, 10, 14, 44]);
  addExportSheet(workbook, "SUMMARY", ["Metric", "Value"], [
    ["Assessment title", data.title],
    ["Assessment code", data.code],
    ["Project", data.project.name],
    ["Company", data.organization.nameEn],
    ["Assessment status", data.status],
    ["Assessment date", (data.approvedAt ?? data.updatedAt).toISOString().slice(0, 10)],
    ["Total failure modes", summary.totalFailureModes],
    ["High-priority risks", summary.highPriorityRisks],
    ["Corrective actions needed", summary.correctiveActionsNeeded],
    ["Immediate actions", summary.immediateActions],
    ["CRITICAL", summary.distribution.CRITICAL],
    ["HIGH", summary.distribution.HIGH],
    ["MEDIUM", summary.distribution.MEDIUM],
    ["LOW", summary.distribution.LOW],
    ["VERY_LOW", summary.distribution.VERY_LOW],
  ], [34, 90]);
  addExportSheet(workbook, "PROCESS", ["Field", "Value"], [
    ["Job/process", data.jobCatalog?.titleEn ?? data.title],
    ["Department/unit", data.department ?? "-"],
    ["Activity description", data.activityDescription ?? "-"],
    ["Equipment/machinery", reportList(data.equipment)],
    ["Materials", reportList(data.materials)],
    ["Existing controls", reportList(data.existingControls)],
    ["Special conditions", data.specialConditions ?? "-"],
  ], [34, 90]);
  addExportSheet(workbook, "ACTIONS", ["Related risk", "Title", "Description", "Priority", "Status", "Assignee", "Progress", "Due date"], data.actions.map((action) => [
    action.fmeaItem ? `#${action.fmeaItem.rowNumber} · ${action.fmeaItem.failureMode}` : "-",
    action.title,
    action.description,
    action.priority,
    action.status,
    action.assigneeName ?? "-",
    action.progress,
    action.dueDate?.toISOString().slice(0, 10) ?? "-",
  ]), [28, 28, 40, 14, 18, 24, 12, 16]);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function buildRulaWorkbook(data: RulaReportData, report?: RulaReportExport) {
  const workbook = new ExcelJS.Workbook();
  const model = buildRulaExportModel(data, report);
  addExportSheet(workbook, "RULA", ["Field", "Value"], model.summaryRows, [34, 100]);
  addExportSheet(workbook, "FACTORS", ["Main factor", "Angle", "Detected", "Score", "Contribution", "Effect", "Source"], model.factorRows, [28, 16, 12, 12, 18, 28, 18]);
  addExportSheet(workbook, "ACTIONS", ["Corrective action", "Description", "Related factors", "Body side", "Priority", "Status", "Selection", "Estimated reduction"], model.actionRows, [32, 52, 28, 16, 16, 18, 18, 22]);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function docxRuns(value: unknown, bold = false) {
  return String(value ?? "-").split(/\r?\n/).map((line, index) => `${index ? "<w:r><w:br/></w:r>" : ""}<w:r>${bold ? "<w:rPr><w:b/></w:rPr>" : ""}<w:t xml:space="preserve">${xmlEscape(line)}</w:t></w:r>`).join("");
}

function docxParagraph(value: unknown, style?: "Title" | "Heading1" | "Heading2") {
  return `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ""}${docxRuns(value)}</w:p>`;
}

function docxTable(headers: string[], rows: ExportRow[]) {
  const widths = headers.map((_, index) => index === headers.length - 1 ? 15400 - Math.floor(15400 / headers.length) * (headers.length - 1) : Math.floor(15400 / headers.length));
  const grid = widths.map((width) => `<w:gridCol w:w="${width}"/>`).join("");
  const renderRow = (row: ExportRow, header = false) => `<w:tr>${header ? "<w:trPr><w:tblHeader/></w:trPr>" : ""}${headers.map((_, index) => `<w:tc><w:tcPr><w:tcW w:w="${widths[index] ?? 1000}" w:type="dxa"/>${header ? "<w:shd w:fill=\"1E5B8F\"/>" : ""}</w:tcPr><w:p><w:pPr><w:spacing w:after="0"/><w:jc w:val="left"/></w:pPr>${docxRuns(row[index] ?? "-", header)}</w:p></w:tc>`).join("")}</w:tr>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="15400" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="C9D9E5"/><w:left w:val="single" w:sz="4" w:color="C9D9E5"/><w:bottom w:val="single" w:sz="4" w:color="C9D9E5"/><w:right w:val="single" w:sz="4" w:color="C9D9E5"/><w:insideH w:val="single" w:sz="4" w:color="C9D9E5"/><w:insideV w:val="single" w:sz="4" w:color="C9D9E5"/></w:tblBorders><w:tblCellMar><w:top w:w="80" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${renderRow(headers, true)}${rows.map((row) => renderRow(row)).join("")}</w:tbl>`;
}

type DocxSection = { heading: string; headers: string[]; rows: ExportRow[] };

const docxStyles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="20"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:color w:val="174E86"/><w:sz w:val="32"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:color w:val="255B88"/><w:sz w:val="26"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:color w:val="255B88"/><w:sz w:val="22"/></w:rPr></w:style></w:styles>`;

async function buildDocx(title: string, subtitle: string, sections: DocxSection[]) {
  const generatedAt = new Date().toISOString();
  const body = `${docxParagraph(title, "Title")}${docxParagraph(subtitle)}${sections.map((section) => `${docxParagraph(section.heading, "Heading1")}${docxTable(section.headers, section.rows)}`).join("")}<w:sectPr><w:pgSz w:w="16840" w:h="11900" w:orient="landscape"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/></w:sectPr>`;
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

export async function buildFmeaWordDocument(data: FmeaReportData) {
  const summary = summariseFmea(data.items);
  return buildDocx("NIVASafe — FMEA risk assessment", `Code: ${data.code} · Project: ${data.project.name}`, [
    { heading: "Executive summary", headers: ["Metric", "Value"], rows: [["Total failure modes", summary.totalFailureModes], ["High-priority risks", summary.highPriorityRisks], ["Corrective actions needed", summary.correctiveActionsNeeded], ["Immediate actions", summary.immediateActions], ["Risk distribution", Object.entries(summary.distribution).map(([level, count]) => `${level}: ${count}`).join(" | ")] ] },
    { heading: "Process information", headers: ["Field", "Value"], rows: [["Job/process", data.jobCatalog?.titleEn ?? data.title], ["Company", data.organization.nameEn], ["Assessment status", data.status], ["Assessment date", (data.approvedAt ?? data.updatedAt).toISOString().slice(0, 10)], ["Assessment method", "FMEA"], ["Department/unit", data.department ?? "-"], ["Activity description", data.activityDescription ?? "-"], ["Equipment/machinery", reportList(data.equipment)], ["Materials", reportList(data.materials)], ["Existing process controls", reportList(data.existingControls)], ["Special conditions", data.specialConditions ?? "-"]] },
    { heading: "Risk register", headers: ["Row", "Process / activity", "Failure mode", "Failure effect", "Failure cause", "Current controls", "S", "O", "D", "AP", "RPN", "Risk level", "Recommended action"], rows: fmeaExportRows(data) },
    { heading: "Corrective actions", headers: ["Related risk", "Title", "Description", "Priority", "Status", "Assignee", "Progress", "Due date"], rows: data.actions.map((action) => [action.fmeaItem ? `#${action.fmeaItem.rowNumber} · ${action.fmeaItem.failureMode}` : "-", action.title, action.description, action.priority, action.status, action.assigneeName ?? "-", action.progress, action.dueDate?.toISOString().slice(0, 10) ?? "-"]) },
  ]);
}

export async function buildRulaWordDocument(data: RulaReportData, report?: RulaReportExport) {
  const model = buildRulaExportModel(data, report);
  return buildDocx("NIVASafe — RULA assessment", `Title: ${model.assessment.title} · Project: ${model.assessment.project.name}`, [
    { heading: "Assessment summary", headers: ["Field", "Value"], rows: model.summaryRows },
    ...(report ? [{ heading: "Main factors", headers: ["Factor", "Angle", "Detected", "Score", "Contribution", "Effect", "Source"], rows: model.factorRows }, { heading: "Corrective actions", headers: ["Action", "Description", "Related factors", "Body side", "Priority", "Status", "Selection", "Estimated reduction"], rows: model.actionRows }] : []),
  ]);
}

function reportFilename(value: string, extension: "docx" | "xlsx" | "pdf") {
  const safeTitle = value.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "NIVASafe-report";
  return `${safeTitle}.${extension}`;
}

function sendWord(reply: FastifyReply, title: string, document: Buffer) {
  return reply.header("content-type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document").header("content-disposition", `attachment; filename="${reportFilename(title, "docx")}"`).send(document);
}

export async function registerReportRoutes(app: FastifyInstance) {
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
    const existingActionTitles = report.actions.filter((action) => !["CANCELLED", "REJECTED"].includes(action.status)).map((action) => action.title);
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
        organization: { select: { riskMedium: true, riskHigh: true, riskCritical: true } },
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
          thresholds: { medium: fmea.organization.riskMedium, high: fmea.organization.riskHigh, critical: fmea.organization.riskCritical },
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
    const organizationId = requireOrg(request); requirePermission(request, "reports.generate"); const { type, id, format } = parse(paramsSchema, request.params);
    const data = type === "fmea" ? await prisma.fmeaAssessment.findFirst({ where: { id, organizationId, deletedAt: null }, include: { project: true, organization: { select: { nameFa: true, nameEn: true } }, jobCatalog: { select: { titleFa: true, titleEn: true } }, items: { orderBy: { rowNumber: "asc" } } } }) : await prisma.rulaAssessment.findFirst({ where: { id, organizationId }, include: { project: true } });
    if (!data) throw Object.assign(new Error("Assessment not found"), { statusCode: 404, code: "NOT_FOUND" });
    const rulaReport = type === "rula" ? await loadRulaReport(id, organizationId) : null;
    if (type === "fmea") { const linkedActions = await prisma.correctiveAction.findMany({ where: { organizationId, OR: [{ fmeaId: id }, { fmeaItem: { assessmentId: id } }] }, include: { fmeaItem: { select: { rowNumber: true, failureMode: true } } }, orderBy: { updatedAt: "desc" } }); (data as unknown as FmeaReportData).actions = linkedActions; }
    if (format === "pdf") {
      if (type === "fmea") {
        const fmea = data as unknown as FmeaReportData;
        const members = await prisma.organizationMember.findMany({ where: { organizationId, active: true }, select: { user: { select: { displayName: true, email: true } }, role: true }, orderBy: { user: { displayName: "asc" } } });
        return sendPdf(reply, `NIVASafe-${type.toUpperCase()}`, buildFmeaPdfLines({ ...fmea, evaluationTeam: members.map((member) => ({ displayName: member.user.displayName, email: member.user.email, role: member.role })) }));
      }
      const rula = data as RulaReportData;
      const reviewComplete = rulaReport?.assessment.postureReviewComplete ?? true;
      return sendPdf(reply, `NIVASafe-${type.toUpperCase()}`, [
        `Project: ${rula.project.name}`,
        `Score: ${reviewComplete ? rula.score : "-"}`,
        `Action level: ${reviewComplete ? rula.actionLevel : "-"}`,
        `Status: ${rula.status ?? "-"}`,
        `Explanation: ${reviewComplete ? rula.explanation : "Posture review is incomplete; the final RULA score is unavailable."}`,
        ...(rulaReport && reviewComplete ? [
          `Predicted score (estimate): ${rulaReport.predictedScore}`,
          "Prediction note: Estimated from selected corrective actions; reassessment is required for the final RULA result.",
          "Main factors:",
          ...rulaReport.factors.map((factor) => `${factor.key} | Angle: ${factor.angle ?? "-"} | Detected: ${factor.detected === undefined ? "-" : factor.detected ? "Yes" : "No"} | Score: ${factor.reviewed === false ? "-" : factor.score} | Contribution: ${factor.reviewed === false ? "-" : `${factor.impactPercent}%`} | Effect: ${factor.reviewed === false ? "Manual review required" : factor.impactLevel} | Source: ${factor.source ?? "-"}`),
          "Corrective actions:",
          ...rulaReport.actions.map((action) => `${action.title} | Body side: ${action.bodySide ?? "-"} | Related factors: ${action.rulaImpact?.affectedParts?.join(", ") || "-"} | Priority: ${action.priority} | Status: ${action.status ?? "-"} | Selection: ${action.status && ["CANCELLED", "REJECTED"].includes(action.status) ? "Not selected" : "Selected"} | Estimated reduction: ${action.rulaImpact?.scoreReduction ?? 0}`),
        ] : []),
      ]);
    }
    if (format === "doc" || format === "docx") return sendWord(reply, `NIVASafe-${type.toUpperCase()}`, type === "fmea" ? await buildFmeaWordDocument(data as unknown as FmeaReportData) : await buildRulaWordDocument(data as RulaReportData, rulaReport ?? undefined));
    const document = type === "fmea" && "items" in data
      ? await buildFmeaWorkbook(data as unknown as FmeaReportData)
      : await buildRulaWorkbook(data as RulaReportData, rulaReport ?? undefined);
    return reply.header("content-type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet").header("content-disposition", `attachment; filename="${reportFilename(`NIVASafe-${type.toUpperCase()}`, "xlsx")}"`).send(document);
  });
}
