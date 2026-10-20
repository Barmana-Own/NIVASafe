import { classifyRulaImageFailure, imageAnalysisFailureMetadata } from "../image-analysis-diagnostics.js";
import { assertAIAccess, isAIAccessError } from "../ai-access.js";
import { retryInvalidAIAnswer, retryRulaInvalidAnswer } from "../rula-ai-retry.js";
import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { calculateRpn, calculateRula, DEFAULT_THRESHOLDS, riskLevel, type RulaInput } from "@nivasafe/domain";
import { authenticate } from "../auth-guard.js";
import { aggregateAIProviderUsage, recordAIUsage } from "../ai-usage.js";
import { audit, envelope, parse, prisma, requireOrg, requirePermission } from "../core.js";
import { getAssessmentImageAIProvider, getAvailableAssessmentAIProvider, getRulaPostureImageAIProvider } from "../ai-provider.js";
import { imageProviderApprovalFailure } from "../image-provider-approval.js";
import { generateRulaActionSuggestions, rulaActionSuggestionBodySchema } from "../rula-action-generation.js";
import { allowedMime, hasValidFileSignature, MAX_ATTACHMENT_FILE_BYTES } from "./files.js";
import { assertFmeaProcessItemSelectionLimit, buildDescriptionPrompt, buildFmeaImageAnalysisPrompt, buildFmeaProcessAutofillPrompt, buildFmeaRiskRowsPrompt, buildFmeaRiskSuggestionsPrompt, buildJobTitleSuggestionsPrompt, buildProcessSuggestionsPrompt, catalogSuggestions, cleanDescription, cleanJobTitleList, cleanTextList, defaultFmeaProcessStep, emptyFmeaRiskSuggestions, emptyProcessSuggestions, fallbackProcessDescription, FMEA_PROCESS_DESCRIPTION_MAX, FMEA_PROCESS_ITEM_LENGTH_MAX, FMEA_PROCESS_ITEM_MAX, FMEA_PROCESS_AI_SUGGESTION_MAX, FMEA_PROCESS_RISK_ROW_SUGGESTION_MAX, FMEA_PROCESS_SUGGESTION_MAX, isValidShortActivityDescription, limitProcessSuggestions, nextFmeaRowNumber, normalizeJobTitle, parseFmeaImageAnalysis, parseFmeaProcessAutofill, parseFmeaRiskRows, parseFmeaRiskScoreSuggestion, parseFmeaRiskSuggestions, parseJobTitleSuggestions, parseProcessSuggestions, type FmeaImageAnalysis, type FmeaProcessAutofill, type FmeaRiskRowSuggestion, type FmeaRiskScoreSuggestion, type FmeaRiskSuggestions, type ProcessSuggestions } from "../fmea-process.js";
import { hasExplicitlyEmptyFmeaRiskRows } from "../fmea-process.js";
import { buildRulaSideResults, primaryRulaResult } from "../rula-report.js";
import { resolveRulaTitle, rulaActivityInfoSchema, rulaBodySideSchema, rulaTitleSchema } from "../rula-process.js";
import { buildRulaPostureImageAnalysisPrompt, buildRulaPostureTextAnalysisPrompt, buildRulaTaskDescriptionPrompt, cleanRulaTaskDescription, parseRulaPostureImageAnalysis, parseRulaPostureTextAnalysis, rulaPostureImageAnalysisResponseSchema, rulaPostureTextAnalysisResponseSchema, RULA_TASK_DESCRIPTION_MAX_LENGTH, type RulaPostureImageAnalysis, type RulaPostureTextAnalysisInput } from "../rula-posture-ai.js";
import { assertRulaFinalStatusReviewed, assertRulaPostureAnalysisReviewed, isRulaPostureAnalysisReviewed, rulaPostureAnalysisSchema, rulaPosturePartKeys, type RulaPostureAnalysis } from "../rula-posture.js";
import { normalizeRulaImage } from "../rula-image-normalization.js";
import { rulaImageTransferReceipt } from "../rula-image-consent.js";
import { fmeaImageTransferReceipt } from "../fmea-image-consent.js";
import { assertAccountImageConsent, readAccountImageConsent } from "../image-processing-consent.js";
import { rulaPostureImageAnalysisRequestSchema } from "../rula-posture-image-request.js";

const idParam = z.object({ id: z.string().uuid() });
const nullableUuid = z.preprocess((value) => value === "" ? null : value, z.string().uuid().nullable().optional());
const nullableDepartment = z.preprocess((value) => value === "" ? null : value, z.string().trim().max(160).nullable().optional());
const nullableProcessText = z.preprocess((value) => value === "" ? null : value, z.string().trim().max(FMEA_PROCESS_DESCRIPTION_MAX).nullable().optional());
const jobCatalogCreateBody = z.object({ title: z.string().trim().min(2).max(180), locale: z.enum(["fa", "en"]).default("fa"), department: nullableDepartment });
const requiredProcessDescription = z.string().trim().min(2).max(FMEA_PROCESS_DESCRIPTION_MAX).refine(isValidShortActivityDescription, "Activity description must contain no more than two sentences");
const processItemList = z.array(z.string().trim().min(1).max(FMEA_PROCESS_ITEM_LENGTH_MAX)).max(FMEA_PROCESS_ITEM_MAX).optional();
const fmeaBody = z.object({ projectId: z.string().uuid(), activityId: nullableUuid, jobCatalogId: nullableUuid, title: z.string().trim().min(2).max(180), code: z.string().trim().min(2).max(80), scope: z.string().trim().max(500).nullable().optional(), department: nullableDepartment, activityDescription: requiredProcessDescription, equipment: processItemList, materials: processItemList, existingControls: processItemList, specialConditions: nullableProcessText, status: z.enum(["DRAFT", "IN_PROGRESS", "UNDER_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"]).optional() });
const fmeaImageAnalysisBody = z.object({ jobTitle: z.string().trim().min(2).max(180), department: nullableDepartment, activityDescription: nullableProcessText, locale: z.enum(["fa", "en"]).default("fa") });
const rulaTaskDescriptionSuggestionBody = z.object({ jobTitle: z.string().trim().min(2).max(180), taskDescription: z.string().trim().max(RULA_TASK_DESCRIPTION_MAX_LENGTH).default(""), locale: z.enum(["fa", "en"]).default("fa") });
const rulaPostureTextAnalysisBody = z.object({
  bodySide: rulaBodySideSchema,
  jobTitle: z.string().trim().min(2).max(180),
  taskDescription: z.string().trim().min(2).max(500),
  postureDescription: z.preprocess((value) => value === null ? "" : value, z.string().trim().max(1000).default("")),
  durationPerOccurrence: z.number().positive().max(1440).optional(),
  durationUnit: z.enum(["SECOND", "MINUTE", "HOUR"]).optional(),
  repetitionsPerShift: z.number().int().min(1).max(10000).optional(),
  postureHoldDuration: z.number().positive().max(1440).optional(),
  postureHoldUnit: z.enum(["SECOND", "MINUTE", "HOUR"]).optional(),
  loadWeight: z.number().nonnegative().max(10000).nullable().optional(),
  loadUnit: z.enum(["KG", "LB"]).optional(),
  force: z.number().int().min(0).max(3),
  muscleUse: z.boolean(),
  locale: z.enum(["fa", "en"]).default("fa"),
});
const nullableRiskText = z.preprocess((value) => value === "" ? null : value, z.string().trim().max(1_200).nullable().optional());
const requiredRiskText = z.string().trim().min(1).max(1_200);
const fmeaItemBody = z.object({ rowNumber: z.number().int().positive(), processStep: requiredRiskText, failureMode: requiredRiskText, effect: requiredRiskText, cause: requiredRiskText, preventiveControls: nullableRiskText, detectionControls: nullableRiskText, severity: z.number().int().min(1).max(10), occurrence: z.number().int().min(1).max(10), detection: z.number().int().min(1).max(10), recommendation: nullableRiskText, residualSeverity: z.number().int().min(1).max(10).nullable().optional(), residualOccurrence: z.number().int().min(1).max(10).nullable().optional(), residualDetection: z.number().int().min(1).max(10).nullable().optional() });
const fmeaItemCreateBody = fmeaItemBody.extend({ rowNumber: fmeaItemBody.shape.rowNumber.optional(), processStep: fmeaItemBody.shape.processStep.optional() });
const processSuggestionBody = z.object({ projectId: nullableUuid, projectName: z.preprocess((value) => value === "" ? null : value, z.string().trim().max(180).nullable().optional()), jobCatalogId: nullableUuid, jobTitle: z.string().trim().min(2).max(180), department: nullableDepartment, activityDescription: nullableProcessText, specialConditions: nullableProcessText, processStep: nullableRiskText, failureMode: nullableRiskText, effect: nullableRiskText, cause: nullableRiskText, preventiveControls: nullableRiskText, detectionControls: nullableRiskText, recommendation: nullableRiskText, locale: z.enum(["fa", "en"]).default("fa"), mode: z.enum(["suggestions", "description", "risk-row", "risk-rows", "job-titles", "autofill"]).default("suggestions") });
const rulaInputs = z.object({ upperArm: z.number().int().min(1).max(6), lowerArm: z.number().int().min(1).max(3), wrist: z.number().int().min(1).max(4), wristTwist: z.number().int().min(1).max(2), neck: z.number().int().min(1).max(6), trunk: z.number().int().min(1).max(6), legs: z.number().int().min(1).max(2), muscleUse: z.boolean(), force: z.number().int().min(0).max(3) });
function requireSubmittedRulaReview(analysis: RulaPostureAnalysis): RulaPostureAnalysis {
  const requireSideReview = (side: RulaPostureAnalysis) => ({
    ...side,
    ...Object.fromEntries(rulaPosturePartKeys.map(part => [part, { ...side[part], requiresReview: true }])),
  });
  const reviewed: RulaPostureAnalysis = requireSideReview(analysis);
  if (analysis.sideAnalyses) {
    reviewed.sideAnalyses = {
      ...(analysis.sideAnalyses.LEFT ? { LEFT: requireSideReview(analysis.sideAnalyses.LEFT) } : {}),
      ...(analysis.sideAnalyses.RIGHT ? { RIGHT: requireSideReview(analysis.sideAnalyses.RIGHT) } : {}),
    };
  }
  if (analysis.imageAssessments) {
    reviewed.imageAssessments = analysis.imageAssessments.map(image => ({ ...image, analysis: requireSubmittedRulaReview(image.analysis) }));
  }
  return reviewed;
}
// Flags received from the browser are not a trusted review policy. Apply this
// only to mutation payloads; historical stored rows retain their read semantics.
const rulaBody = z.object({ projectId: z.string().uuid(), activityId: nullableUuid, title: rulaTitleSchema, subjectCode: z.string().nullable().optional(), bodySide: rulaBodySideSchema, inputs: rulaInputs, activityInfo: rulaActivityInfoSchema.optional(), postureAnalysis: rulaPostureAnalysisSchema.transform(requireSubmittedRulaReview).optional(), status: z.enum(["DRAFT", "IN_PROGRESS", "UNDER_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"]).optional() });
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const FMEA_PROCESS_IMAGE_MAX_BYTES = MAX_ATTACHMENT_FILE_BYTES;
const multipartFieldValue = (field: unknown) => field && !Array.isArray(field) && typeof (field as { value?: unknown }).value === "string" ? (field as { value: string }).value : undefined;
function inputsWithPostureAnalysis(inputs: RulaInput, analysis?: RulaPostureAnalysis): RulaInput {
  if (!analysis) return inputs;
  return { ...inputs, upperArm: analysis.upperArm.score, lowerArm: analysis.lowerArm.score, wrist: analysis.wrist.score, wristTwist: analysis.wristTwist.score, neck: analysis.neck.score, trunk: analysis.trunk.score, legs: analysis.legs.score };
}

function postureAnalysisForSide(analysis: RulaPostureAnalysis | undefined, side: "LEFT" | "RIGHT") {
  return analysis?.sideAnalyses?.[side] ?? analysis;
}

function assertRulaSideAnalyses(bodySide: "LEFT" | "RIGHT" | "BOTH", analysis?: RulaPostureAnalysis) {
  if (bodySide !== "BOTH") return;
  if (!analysis?.sideAnalyses?.LEFT || !analysis.sideAnalyses.RIGHT) {
    throw Object.assign(new Error("هر دو سمت بدن باید به‌صورت جداگانه بررسی و ثبت شوند."), { statusCode: 400, code: "RULA_BOTH_SIDES_REQUIRED" });
  }
}

export function calculateRulaAssessment(bodySide: "LEFT" | "RIGHT" | "BOTH", rawInputs: RulaInput, analysis?: RulaPostureAnalysis, requireReviewedAnalysis = true) {
  rawInputs = { ...rawInputs, algorithmVersion: !requireReviewedAnalysis && rawInputs.algorithmVersion === 'legacy-average-v1' ? 'legacy-average-v1' : 'cornell-worksheet-2001-tables-v1' };
  parse(rulaInputs, rawInputs);
  const validateObservation = (observation: RulaPostureAnalysis) => {
    parse(rulaInputs, inputsWithPostureAnalysis(rawInputs, observation));
    for (const side of Object.values(observation.sideAnalyses ?? {})) if (side) parse(rulaInputs, inputsWithPostureAnalysis(rawInputs, side));
  };
  if (analysis) {
    validateObservation(analysis);
    for (const image of analysis.imageAssessments ?? []) validateObservation(image.analysis);
  }
  if (analysis?.imageAssessments?.length) {
    const observations = analysis.imageAssessments.map(image => {
      assertRulaPostureAnalysisReviewed(bodySide, image.analysis);
      assertRulaSideAnalyses(bodySide, image.analysis);
      const imageInputs = { ...rawInputs, force: image.force, muscleUse: image.muscleUse };
      const sides = buildRulaSideResults(bodySide, imageInputs, image.analysis);
      const result = sides ? primaryRulaResult(sides) : calculateRula(inputsWithPostureAnalysis(imageInputs, image.analysis));
      return { analysis: image.analysis, inputs: imageInputs, result };
    });
    const worst = observations.reduce((current, item) => item.result.score > current.result.score ? item : current);
    analysis = { ...worst.analysis, ...(analysis.evaluationRows ? { evaluationRows: analysis.evaluationRows } : {}), imageAssessments: analysis.imageAssessments };
    rawInputs = worst.inputs;
  }
  if (requireReviewedAnalysis) {
    assertRulaSideAnalyses(bodySide, analysis);
    assertRulaPostureAnalysisReviewed(bodySide, analysis);
  } else if (bodySide === "BOTH" && analysis) {
    assertRulaSideAnalyses(bodySide, analysis);
  }
  if (bodySide !== "BOTH") {
    const inputs = inputsWithPostureAnalysis(rawInputs, analysis);
    return { inputs, result: calculateRula(inputs), sideResults: undefined, analysis };
  }
  const sideResults = buildRulaSideResults(bodySide, rawInputs, analysis);
  if (!sideResults) throw Object.assign(new Error("هر دو سمت بدن باید به‌صورت جداگانه بررسی و ثبت شوند."), { statusCode: 400, code: "RULA_BOTH_SIDES_REQUIRED" });
  const rightInputs = inputsWithPostureAnalysis(rawInputs, postureAnalysisForSide(analysis, "RIGHT"));
  return { inputs: rightInputs, result: primaryRulaResult(sideResults), sideResults, analysis };
}

function rulaReviewComplete(bodySide: string, value: unknown) {
  const parsed = rulaPostureAnalysisSchema.safeParse(value);
  return parsed.success && (bodySide === "LEFT" || bodySide === "RIGHT" || bodySide === "BOTH") ? isRulaPostureAnalysisReviewed(bodySide, parsed.data) : false;
}

async function ensureProject(projectId: string, organizationId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, organizationId, deletedAt: null } });
  if (!project) throw Object.assign(new Error("Project not found"), { statusCode: 404, code: "NOT_FOUND" });
}

async function ensureActivity(activityId: string | null | undefined, projectId: string, organizationId: string) {
  if (!activityId) return;
  const activity = await prisma.activity.findFirst({ where: { id: activityId, projectId, organizationId, deletedAt: null } });
  if (!activity) throw Object.assign(new Error("The selected activity does not belong to this project"), { statusCode: 400, code: "ACTIVITY_PROJECT_MISMATCH" });
}

async function ensureRulaPostureImage(attachmentId: string | null | undefined, assessmentId: string, organizationId: string) {
  if (!attachmentId) return;
  const attachment = await prisma.attachment.findFirst({ where: { id: attachmentId, organizationId, entityType: "RulaAssessment", entityId: assessmentId, kind: "IMAGE", deletedAt: null }, select: { id: true } });
  if (!attachment) throw Object.assign(new Error("The selected posture image is not linked to this RULA assessment"), { statusCode: 400, code: "RULA_IMAGE_ASSESSMENT_MISMATCH" });
}

const jobCatalogSelect = {
  id: true,
  organizationId: true,
  titleFa: true,
  titleEn: true,
  keywords: true,
  departmentFa: true,
  departmentEn: true,
  descriptionFa: true,
  descriptionEn: true,
  equipment: true,
  materials: true,
  controls: true,
} as const;

type JobCatalogRecord = Prisma.JobCatalogGetPayload<{ select: typeof jobCatalogSelect }>;

function serializeJobCatalog(job: JobCatalogRecord) {
  return {
    id: job.id,
    organizationId: job.organizationId,
    titleFa: job.titleFa,
    titleEn: job.titleEn,
    keywords: Array.isArray(job.keywords) ? job.keywords.filter((value): value is string => typeof value === "string").slice(0, 20) : [],
    departmentFa: job.departmentFa,
    departmentEn: job.departmentEn,
    descriptionFa: job.descriptionFa,
    descriptionEn: job.descriptionEn,
    equipment: cleanTextList(job.equipment, FMEA_PROCESS_SUGGESTION_MAX),
    materials: cleanTextList(job.materials, FMEA_PROCESS_SUGGESTION_MAX),
    controls: cleanTextList(job.controls, FMEA_PROCESS_SUGGESTION_MAX),
  };
}

async function ensureJobCatalog(jobCatalogId: string | null | undefined, organizationId: string) {
  if (!jobCatalogId) return null;
  const job = await prisma.jobCatalog.findFirst({ where: { id: jobCatalogId, active: true, OR: [{ organizationId: null }, { organizationId }] }, select: jobCatalogSelect });
  if (!job) throw Object.assign(new Error("The selected job is not available for this organization"), { statusCode: 400, code: "JOB_CATALOG_NOT_AVAILABLE" });
  return job;
}

async function persistAiJobTitles(input: { organizationId: string; titles: string[]; locale: "fa" | "en"; department?: string | null }) {
  const persisted: JobCatalogRecord[] = [];
  for (const title of cleanJobTitleList(input.titles)) {
    const normalizedTitle = normalizeJobTitle(title);
    if (!normalizedTitle) continue;
    const existing = await prisma.jobCatalog.findFirst({
      where: {
        active: true,
        OR: [{ organizationId: null }, { organizationId: input.organizationId }],
        AND: [{ OR: [{ titleFa: title }, { titleEn: title }] }],
      },
      select: jobCatalogSelect,
    });
    if (existing) {
      persisted.push(existing);
      continue;
    }
    const localizedDepartment = input.department?.trim() || null;
    try {
      const created = await prisma.jobCatalog.create({
        data: {
          organizationId: input.organizationId,
          titleFa: title,
          titleEn: title,
          keywords: [title, "AI-generated"],
          departmentFa: input.locale === "fa" ? localizedDepartment : null,
          departmentEn: input.locale === "en" ? localizedDepartment : null,
          equipment: [],
          materials: [],
          controls: [],
          active: true,
        },
        select: jobCatalogSelect,
      });
      persisted.push(created);
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
      const concurrent = await prisma.jobCatalog.findFirst({ where: { organizationId: input.organizationId, active: true, OR: [{ titleFa: title }, { titleEn: title }] }, select: jobCatalogSelect });
      if (concurrent) persisted.push(concurrent);
    }
  }
  return persisted;
}

function suggestionResponse(databaseSuggestions: ProcessSuggestions, aiSuggestions: ProcessSuggestions, provider: string, aiStatus: "connected" | "fallback" | "unavailable", descriptionSuggestion: string | null = null, riskSuggestions: FmeaRiskSuggestions = emptyFmeaRiskSuggestions(), scoreSuggestion: FmeaRiskScoreSuggestion | null = null, jobTitleSuggestions: string[] = [], autofill: FmeaProcessAutofill | null = null, aiJobCatalogSuggestions: JobCatalogRecord[] = [], riskRows: FmeaRiskRowSuggestion[] = []) {
  return { databaseSuggestions, aiSuggestions, provider, aiStatus, descriptionSuggestion, riskSuggestions, scoreSuggestion, riskRows, maximumRiskRows: FMEA_PROCESS_RISK_ROW_SUGGESTION_MAX, jobTitleSuggestions, aiJobCatalogSuggestions: aiJobCatalogSuggestions.map((job) => ({ ...serializeJobCatalog(job), source: "AI" as const })), autofill };
}

async function getFmea(id: string, organizationId: string) {
  const assessment = await prisma.fmeaAssessment.findFirst({ where: { id, organizationId, deletedAt: null }, include: { items: { orderBy: { rowNumber: "asc" } }, project: true, activity: true, jobCatalog: { select: jobCatalogSelect } } });
  if (!assessment) throw Object.assign(new Error("FMEA not found"), { statusCode: 404, code: "NOT_FOUND" });
  return assessment;
}

async function getRula(id: string, organizationId: string) {
  const assessment = await prisma.rulaAssessment.findFirst({ where: { id, organizationId }, include: { project: true, activity: true } });
  if (!assessment) throw Object.assign(new Error("RULA not found"), { statusCode: 404, code: "NOT_FOUND" });
  const postureImages = await prisma.attachment.findMany({ where: { organizationId, entityType: "RulaAssessment", entityId: id, kind: "IMAGE", deletedAt: null }, select: { id: true, originalName: true, mimeType: true, size: true, createdAt: true }, orderBy: { createdAt: "asc" } });
  return {
    ...assessment,
    inputs: { ...(assessment.inputs as object), algorithmVersion: (assessment.inputs as { algorithmVersion?: string })?.algorithmVersion ?? 'legacy-average-v1' },
    postureImages,
    postureImage: postureImages.at(-1) ?? null,
    postureReviewComplete: rulaReviewComplete(assessment.bodySide, assessment.postureAnalysis),
  };
}

export async function registerAssessmentRoutes(app: FastifyInstance) {
  app.post("/api/v1/rula/action-suggestions", { preHandler: authenticate, config: { rateLimit: { max: 8, timeWindow: "1 minute" } } }, async (request) => {
    const organizationId = requireOrg(request);
    requirePermission(request, "assessments.create");
    const body = parse(rulaActionSuggestionBodySchema, request.body);
    const generated = await generateRulaActionSuggestions({
      organizationId, userId: request.actor!.userId,
      bodySide: body.bodySide, inputs: body.inputs, analysis: body.postureAnalysis,
      jobTitle: body.activityInfo?.jobTitle, taskDescription: body.activityInfo?.taskDescription,
      postureDescription: body.activityInfo?.postureDescription, locale: body.locale,
    });
    const { response, usageResult, accessError } = generated;
    if (usageResult) await recordAIUsage(prisma, { organizationId, userId: request.actor!.userId, useCase: "risk", sourceType: "RULA_ACTION_SUGGESTIONS", sourceId: request.id, result: usageResult });
    if (accessError) throw accessError;
    await audit(request, "RULA_DRAFT_ACTION_SUGGESTIONS", "RulaDraft", undefined, { useCase: "risk", provider: response.provider, model: response.model, aiStatus: response.aiStatus, reasonCode: response.reasonCode, bodySide: body.bodySide, suggestionCount: response.suggestions.length });
    return envelope(response);
  });
  app.get("/api/v1/fmea", { preHandler: authenticate }, async (request) => envelope(await prisma.fmeaAssessment.findMany({ where: { organizationId: requireOrg(request), deletedAt: null }, include: { items: true, project: { select: { name: true, code: true } }, jobCatalog: { select: jobCatalogSelect } }, orderBy: { updatedAt: "desc" } })));
  app.get("/api/v1/fmea/job-catalog", { preHandler: authenticate }, async (request) => {
    const organizationId = requireOrg(request);
    requirePermission(request, "assessments.create");
    const query = parse(z.object({ search: z.string().trim().max(120).optional(), limit: z.coerce.number().int().min(1).max(200).default(200) }), request.query);
    const where: Prisma.JobCatalogWhereInput = { active: true, OR: [{ organizationId: null }, { organizationId }] };
    if (query.search) where.AND = [{ OR: [{ titleFa: { contains: query.search } }, { titleEn: { contains: query.search } }] }];
    const jobs = await prisma.jobCatalog.findMany({ where, select: jobCatalogSelect, orderBy: { titleFa: "asc" }, take: query.limit });
    return envelope(jobs.map(serializeJobCatalog));
  });
  app.post("/api/v1/fmea/job-catalog", { preHandler: authenticate, config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, async (request, reply) => {
    const organizationId = requireOrg(request);
    requirePermission(request, "assessments.create");
    const body = parse(jobCatalogCreateBody, request.body);
    const title = body.title.replace(/\s+/gu, " ").trim();
    const existing = await prisma.jobCatalog.findFirst({ where: { organizationId, active: true, OR: [{ titleFa: title }, { titleEn: title }] }, select: jobCatalogSelect });
    if (existing) return envelope(serializeJobCatalog(existing));
    const department = body.department?.trim() || null;
    const data = {
      organizationId,
      titleFa: title,
      titleEn: title,
      keywords: [title, normalizeJobTitle(title)],
      departmentFa: body.locale === "fa" ? department : null,
      departmentEn: body.locale === "en" ? department : null,
      descriptionFa: null,
      descriptionEn: null,
      equipment: [],
      materials: [],
      controls: [],
      active: true,
    };
    try {
      const created = await prisma.jobCatalog.create({ data, select: jobCatalogSelect });
      return reply.code(201).send(envelope(serializeJobCatalog(created)));
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
      const concurrent = await prisma.jobCatalog.findFirst({ where: { organizationId, active: true, OR: [{ titleFa: title }, { titleEn: title }] }, select: jobCatalogSelect });
      if (!concurrent) throw error;
      return envelope(serializeJobCatalog(concurrent));
    }
  });
  app.get("/api/v1/fmea/image-analysis-policy", { preHandler: authenticate }, async (request, reply) => {
    requireOrg(request);
    requirePermission(request, "assessments.create");
    const provider = getAssessmentImageAIProvider();
    const approvalFailure = imageProviderApprovalFailure(provider, "fmea-process");
    const user = await prisma.user.findFirst({ where: { id: request.actor!.userId }, select: { active: true, aiEnabled: true, aiTokenLimit: true, aiTokensUsed: true } });
    assertAIAccess(user);
    reply.header("cache-control", "private, no-store");
    const consent = await readAccountImageConsent(request.actor!.userId);
    return envelope({ available: !approvalFailure && consent.accepted, provider: provider.name, reasonCode: !consent.accepted ? "account-consent-required" : approvalFailure, consentAccepted: consent.accepted, consentVersion: consent.policyVersion });
  });
  app.post("/api/v1/fmea/process-image-analysis", { preHandler: authenticate, config: { rateLimit: { max: 8, timeWindow: "1 minute" } } }, async (request) => {
    const organizationId = requireOrg(request);
    requirePermission(request, "assessments.create");
    const file = await request.file({ limits: { fileSize: FMEA_PROCESS_IMAGE_MAX_BYTES } });
    if (!file) throw Object.assign(new Error("File is required"), { statusCode: 400, code: "FILE_REQUIRED" });
    if (!allowedMime.has(file.mimetype) || !file.mimetype.startsWith("image/")) throw Object.assign(new Error("Unsupported image type"), { statusCode: 415, code: "FMEA_IMAGE_TYPE_NOT_ALLOWED" });
    const buffer = await file.toBuffer();
    if (buffer.length > FMEA_PROCESS_IMAGE_MAX_BYTES) throw Object.assign(new Error("حجم تصویر نباید بیشتر از ۱۰ مگابایت باشد."), { statusCode: 413, code: "FMEA_IMAGE_SIZE_LIMIT" });
    if (!hasValidFileSignature(buffer, file.mimetype)) throw Object.assign(new Error("محتوای تصویر با نوع اعلام‌شده مطابقت ندارد."), { statusCode: 415, code: "FMEA_IMAGE_SIGNATURE_INVALID" });
    const body = parse(fmeaImageAnalysisBody, {
      jobTitle: multipartFieldValue(file.fields.jobTitle) ?? "",
      department: multipartFieldValue(file.fields.department) ?? "",
      activityDescription: multipartFieldValue(file.fields.activityDescription) ?? "",
      locale: multipartFieldValue(file.fields.locale) ?? "fa",
    });
    const provider = getAssessmentImageAIProvider();
    const approvalFailure = imageProviderApprovalFailure(provider, "fmea-process");
    if (approvalFailure) {
      await audit(request, "FMEA_PROCESS_IMAGE_ANALYSIS_BLOCKED", "FmeaProcessImage", undefined, { provider: provider.name, failureCode: "FMEA_IMAGE_AI_UNAVAILABLE", approvalFailure });
      throw Object.assign(new Error("تحلیل تصویر تا زمان تأیید حریم خصوصی و قابلیت بینایی ارائه‌دهنده هوش مصنوعی در دسترس نیست."), { statusCode: 503, code: "FMEA_IMAGE_AI_UNAVAILABLE", retryable: false });
    }
    const accountConsent = await assertAccountImageConsent(request.actor!.userId);
    const transferReceipt = { ...fmeaImageTransferReceipt({ provider: provider.name, locale: body.locale, image: buffer }), accountConsentVersion: accountConsent.policyVersion, consentRecordId: accountConsent.recordId, consentSource: "ACCOUNT_POLICY" };
    // Persist the account-policy authorization and request-bound image fingerprint before external transfer.
    await audit(request, "FMEA_PROCESS_IMAGE_TRANSFER_AUTHORIZED", "FmeaProcessImage", undefined, transferReceipt);
    const providerResults: Awaited<ReturnType<typeof provider.analyze>>[] = [];
    let validationAttemptCount = 0;
    let validated: { result: Awaited<ReturnType<typeof provider.analyze>>; analysis: FmeaImageAnalysis } | undefined;
    let validationError: unknown;
    try {
      validated = await retryInvalidAIAnswer(async () => {
        validationAttemptCount += 1;
        const result = await provider.analyze({
          organizationId,
          userId: request.actor!.userId,
          imagePurpose: "fmea-process",
          includeKnowledge: false,
          maxOutputTokens: 3000,
          message: buildFmeaImageAnalysisPrompt(body),
          image: { mimeType: file.mimetype, base64: buffer.toString("base64") },
        });
        providerResults.push(result);
        return { result, analysis: parseFmeaImageAnalysis(result.answer) };
      }, ["FMEA_IMAGE_AI_INVALID_RESPONSE"]);
    } catch (error) {
      validationError = error;
    }
    const usageResult = aggregateAIProviderUsage(providerResults);
    if (usageResult) await recordAIUsage(prisma, { organizationId, userId: request.actor!.userId, useCase: "risk", sourceType: "FMEA_IMAGE_REVIEW", sourceId: request.id, result: usageResult });
    if (validationError !== undefined) {
      if (isAIAccessError(validationError)) throw validationError;
      await audit(request, "FMEA_PROCESS_IMAGE_ANALYSIS_FAILED", "FmeaProcessImage", undefined, { provider: provider.name, mimeType: file.mimetype, size: buffer.length, invalidResponseRetryCount: Math.min(1, Math.max(0, validationAttemptCount - 1)), ...imageAnalysisFailureMetadata(validationError) });
      throw Object.assign(new Error("AI image analysis is temporarily unavailable"), { statusCode: 503, code: "FMEA_IMAGE_AI_UNAVAILABLE" });
    }
    const { result, analysis } = validated!;
    await audit(request, "FMEA_PROCESS_IMAGE_ANALYSIS", "FmeaProcessImage", undefined, { provider: result.provider, aiStatus: result.usedFallback ? "fallback" : "connected", mimeType: file.mimetype, size: buffer.length, riskRowCount: analysis.riskRows.length });
    return envelope({ ...analysis, provider: result.provider, aiStatus: result.usedFallback ? "fallback" : "connected" });
  });
  app.post("/api/v1/rula/posture-analysis", { preHandler: authenticate, config: { rateLimit: { max: 12, timeWindow: "1 minute" } } }, async (request) => {
    const organizationId = requireOrg(request);
    requirePermission(request, "assessments.create");
    const body = parse(rulaPostureTextAnalysisBody, request.body) as RulaPostureTextAnalysisInput;
    const provider = getAvailableAssessmentAIProvider();
    let providerResult: Awaited<ReturnType<typeof provider.analyze>> | null = null;
    const providerResults: Awaited<ReturnType<typeof provider.analyze>>[] = [];
    let analysis: RulaPostureImageAnalysis | undefined;
    let analysisError: unknown;
    try {
      const validated = await retryRulaInvalidAnswer(async () => {
        const result = await provider.analyze({ organizationId, userId: request.actor!.userId, message: buildRulaPostureTextAnalysisPrompt(body), includeKnowledge: false, structuredOutput: true, maxOutputTokens: body.bodySide === "BOTH" ? 3000 : 1800 });
        providerResults.push(result);
        if (result.usedFallback || result.provider === "fallback") throw Object.assign(new Error("Assessment AI fallback is not permitted"), { code: "ASSESSMENT_PROVIDER_NOT_APPROVED" });
        return { result, analysis: parseRulaPostureTextAnalysis(result.answer, body.bodySide) };
      });
      providerResult = validated.result; analysis = validated.analysis;
    } catch (error) {
      analysisError = error;
    }
    const usageResult = aggregateAIProviderUsage(providerResults);
    if (usageResult) await recordAIUsage(prisma, { organizationId, userId: request.actor!.userId, useCase: "risk", sourceType: "RULA_TEXT_REVIEW", sourceId: request.id, result: usageResult });
    if (analysisError !== undefined) {
      if (isAIAccessError(analysisError)) throw analysisError;
      await audit(request, "RULA_POSTURE_TEXT_ANALYSIS_FAILED", "RulaPostureText", undefined, { provider: provider.name, bodySide: body.bodySide, ...imageAnalysisFailureMetadata(analysisError) });
      throw Object.assign(new Error("AI posture analysis is unavailable. Continue with manual review or retry later."), { statusCode: 503, code: "RULA_TEXT_AI_UNAVAILABLE", retryable: false });
    }
    await audit(request, "RULA_POSTURE_TEXT_ANALYSIS", "RulaPostureText", undefined, { provider: providerResult!.provider, aiStatus: "connected", bodySide: body.bodySide });
    const response = rulaPostureTextAnalysisResponseSchema.parse({ ...analysis!, provider: providerResult!.provider, aiStatus: "connected" });
    return envelope(response);
  });
  app.post("/api/v1/rula/task-description-suggestion", { preHandler: authenticate, config: { rateLimit: { max: 12, timeWindow: "1 minute" } } }, async (request) => {
    const organizationId = requireOrg(request);
    requirePermission(request, "assessments.create");
    const body = parse(rulaTaskDescriptionSuggestionBody, request.body);
    const provider = getAvailableAssessmentAIProvider();
    const providerResults: Awaited<ReturnType<typeof provider.analyze>>[] = [];
    let result: Awaited<ReturnType<typeof provider.analyze>> | undefined;
    let generationError: unknown;
    try {
      result = await retryRulaInvalidAnswer(async () => {
        const answer = await provider.analyze({ organizationId, userId: request.actor!.userId, message: buildRulaTaskDescriptionPrompt(body), includeKnowledge: false, maxOutputTokens: 1200 });
        providerResults.push(answer);
        if (answer.provider !== "fallback" && !cleanRulaTaskDescription(answer.answer)) throw Object.assign(new Error("Invalid RULA task description"), { code: "RULA_AI_INVALID_RESPONSE" });
        return answer;
      });
    } catch (error) {
      generationError = error;
    }
    const usageResult = aggregateAIProviderUsage(providerResults);
    if (usageResult) await recordAIUsage(prisma, { organizationId, userId: request.actor!.userId, useCase: "risk", sourceType: "RULA_TASK_DESCRIPTION_SUGGESTION", sourceId: request.id, result: usageResult });
    if (generationError) {
      if (isAIAccessError(generationError)) throw generationError;
      await audit(request, "RULA_TASK_DESCRIPTION_SUGGESTION_FAILED", "RulaTaskDescription", undefined, { provider: provider.name, aiStatus: "unavailable" });
      return envelope({ descriptionSuggestion: null, provider: provider.name, aiStatus: "unavailable" as const });
    }
    const finalResult = result!;
    const isLocalFallback = finalResult.provider === "fallback";
    const descriptionSuggestion = isLocalFallback ? null : cleanRulaTaskDescription(finalResult.answer) || null;
    const aiStatus = isLocalFallback ? "fallback" : descriptionSuggestion ? finalResult.usedFallback ? "fallback" : "connected" : "unavailable";
    await audit(request, "RULA_TASK_DESCRIPTION_SUGGESTION", "RulaTaskDescription", undefined, { provider: finalResult.provider, aiStatus, suggestionLength: descriptionSuggestion?.length ?? 0 });
    return envelope({ descriptionSuggestion, provider: finalResult.provider, aiStatus });
  });
  app.get("/api/v1/rula/image-analysis-policy", { preHandler: authenticate }, async (request, reply) => {
    requireOrg(request);
    requirePermission(request, "assessments.create");
    const provider = getRulaPostureImageAIProvider();
    const approvalFailure = imageProviderApprovalFailure(provider, "rula-posture");
    const user = await prisma.user.findFirst({ where: { id: request.actor!.userId }, select: { active: true, aiEnabled: true, aiTokenLimit: true, aiTokensUsed: true } });
    assertAIAccess(user);
    reply.header("cache-control", "private, no-store");
    const consent = await readAccountImageConsent(request.actor!.userId);
    return envelope({ available: !approvalFailure && consent.accepted, provider: provider.name, reasonCode: !consent.accepted ? "account-consent-required" : approvalFailure, consentAccepted: consent.accepted, consentVersion: consent.policyVersion });
  });
  app.post("/api/v1/rula/posture-image-analysis", { preHandler: authenticate, config: { rateLimit: { max: 8, timeWindow: "1 minute" } } }, async (request) => {
    const organizationId = requireOrg(request);
    requirePermission(request, "assessments.create");
    const file = await request.file({ limits: { fileSize: MAX_ATTACHMENT_FILE_BYTES } });
    if (!file) throw Object.assign(new Error("File is required"), { statusCode: 400, code: "FILE_REQUIRED" });
    if (!allowedMime.has(file.mimetype) || !file.mimetype.startsWith("image/")) throw Object.assign(new Error("Unsupported image type"), { statusCode: 415, code: "RULA_IMAGE_TYPE_NOT_ALLOWED" });
    const buffer = await file.toBuffer();
    if (buffer.length > FMEA_PROCESS_IMAGE_MAX_BYTES) throw Object.assign(new Error("حجم تصویر نباید بیشتر از ۱۰ مگابایت باشد."), { statusCode: 413, code: "RULA_IMAGE_SIZE_LIMIT" });
    if (!hasValidFileSignature(buffer, file.mimetype)) throw Object.assign(new Error("محتوای تصویر با نوع اعلام‌شده مطابقت ندارد."), { statusCode: 415, code: "RULA_IMAGE_SIGNATURE_INVALID" });
    const body = parse(rulaPostureImageAnalysisRequestSchema, {
      activityInfo: multipartFieldValue(file.fields.activityInfo) === undefined ? undefined : parse(z.string().max(4000).transform((text, context) => { try { return JSON.parse(text); } catch (error) {
      if (isAIAccessError(error)) throw error; context.addIssue({ code: "custom", message: "Invalid activity context" }); return z.NEVER; } }), multipartFieldValue(file.fields.activityInfo)),
      bodySide: multipartFieldValue(file.fields.bodySide) ?? "RIGHT",
      jobTitle: multipartFieldValue(file.fields.jobTitle) ?? "",
      taskDescription: multipartFieldValue(file.fields.taskDescription) ?? "",
      postureDescription: multipartFieldValue(file.fields.postureDescription) ?? "",
      locale: multipartFieldValue(file.fields.locale) ?? "fa",
    });
    const provider = getRulaPostureImageAIProvider();
    const accountConsent = await assertAccountImageConsent(request.actor!.userId);
    const approvalFailure = imageProviderApprovalFailure(provider, "rula-posture");
    if (approvalFailure) {
      await audit(request, "RULA_POSTURE_IMAGE_ANALYSIS_BLOCKED", "RulaPostureImage", undefined, { provider: provider.name, failureCode: "RULA_IMAGE_AI_UNAVAILABLE", retryable: false, approvalFailure });
      throw Object.assign(new Error("تحلیل تصویر تا زمان تأیید حریم خصوصی و قابلیت بینایی ارائه‌دهنده هوش مصنوعی در دسترس نیست."), { statusCode: 503, code: "RULA_IMAGE_AI_UNAVAILABLE", retryable: false });
    }
    const transferReceipt = { ...rulaImageTransferReceipt({ provider: provider.name, bodySide: body.bodySide, locale: body.locale, image: buffer }), accountConsentVersion: accountConsent.policyVersion, consentRecordId: accountConsent.recordId, consentSource: "ACCOUNT_POLICY" };
    // This durable, actor/tenant/request-bound account-policy receipt must exist before transfer.
    // A consent/audit failure stops the request; it never becomes provider permission.
    await audit(request, "RULA_IMAGE_TRANSFER_AUTHORIZED", "RulaPostureImage", undefined, transferReceipt);
    const image = await normalizeRulaImage(buffer,file.mimetype);
    const useCompactLandmarkResponse = process.env.NODE_ENV !== "production" && process.env.RULA_LANDMARK_EXPERIMENT_V2 === "1";
    let validated: { result: Awaited<ReturnType<typeof provider.analyze>>; analysis: RulaPostureImageAnalysis } | undefined;
    const providerResults: Awaited<ReturnType<typeof provider.analyze>>[] = [];
    let validationError: unknown;
    let validationAttemptCount = 0;
    try {
      validated = await retryRulaInvalidAnswer(async () => {
        validationAttemptCount += 1;
        const result = await provider.analyze({
        organizationId,
        userId: request.actor!.userId,
        imagePurpose: "rula-posture",
        message: buildRulaPostureImageAnalysisPrompt({...body,imageGeometry:image}),
        includeKnowledge: false,
        // The local landmark-only contract removes duplicated model angles, scores,
        // and overlay coordinates. Preserve the tested legacy budget elsewhere.
        maxOutputTokens: useCompactLandmarkResponse
          ? (body.bodySide === "BOTH" ? 5_000 : 3_000)
          : 8_000,
        image: { mimeType: image.mimeType, base64: image.buffer.toString("base64") },
      });
        providerResults.push(result);
        const analysis: RulaPostureImageAnalysis = parseRulaPostureImageAnalysis(result.answer, body.bodySide,image);
      if (!Object.values(analysis.sides).some(side => side && [side.upperArm, side.lowerArm, side.wrist, side.neck, side.trunk, side.legs].some(row => row.detected))) {
        throw Object.assign(new Error("No visible posture was assessed"), { code: "RULA_IMAGE_AI_EMPTY_OBSERVATION" });
      }
        return { result, analysis };
      });
    } catch (error) {
      validationError = error;
    }
    const usageResult = aggregateAIProviderUsage(providerResults);
    if (usageResult) await recordAIUsage(prisma, { organizationId, userId: request.actor!.userId, useCase: "risk", sourceType: "RULA_IMAGE_REVIEW", sourceId: request.id, result: usageResult });
    if (validationError !== undefined) {
      if (isAIAccessError(validationError)) throw validationError;
      await audit(request, "RULA_POSTURE_IMAGE_ANALYSIS_FAILED", "RulaPostureImage", undefined, { provider: provider.name, mimeType: file.mimetype, size: buffer.length, invalidResponseRetryCount: Math.min(1, Math.max(0, validationAttemptCount - 1)), ...imageAnalysisFailureMetadata(validationError) });
      const failure = classifyRulaImageFailure(validationError);
      throw Object.assign(new Error(failure.message), { statusCode: failure.statusCode, code: failure.code, retryable: failure.retryable });
    }
    const { result, analysis } = validated!;
    const overlayPointCount = Object.values(analysis.sides).reduce((count, side) => count + (side ? Object.keys(side.overlay.points).length : 0), 0);
    await audit(request, "RULA_POSTURE_IMAGE_ANALYSIS", "RulaPostureImage", undefined, { provider: result.provider, aiStatus: result.usedFallback ? "fallback" : "connected", imageConsent: true, mimeType: file.mimetype, size: buffer.length, overlayPointCount });
    const response = rulaPostureImageAnalysisResponseSchema.parse({ ...analysis, provider: result.provider, model: result.model, aiStatus: result.usedFallback ? "fallback" : "connected" });
    return envelope(response);
  });
  app.post("/api/v1/fmea/process-suggestions", { preHandler: authenticate, config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (request) => {
    const organizationId = requireOrg(request);
    requirePermission(request, "assessments.create");
    const body = parse(processSuggestionBody, request.body);
    const project = (body.mode === "autofill" || body.mode === "risk-rows") && body.projectId
      ? await prisma.project.findFirst({ where: { id: body.projectId, organizationId, deletedAt: null }, select: { name: true } })
      : null;
    if (body.mode === "autofill" && !project) throw Object.assign(new Error("A valid project is required for FMEA autofill"), { statusCode: 400, code: "FMEA_AUTOFILL_PROJECT_REQUIRED" });
    const job = await ensureJobCatalog(body.jobCatalogId, organizationId);
    const databaseSuggestions = job ? catalogSuggestions({ equipment: job.equipment, materials: job.materials, controls: job.controls }) : emptyProcessSuggestions();
    const projectName = project?.name ?? null;
    const fallbackAutofill = (): FmeaProcessAutofill => ({
      department: body.department?.trim() || (job ? (body.locale === "en" ? job.departmentEn : job.departmentFa) ?? "" : ""),
      activityDescription: body.activityDescription?.trim() || fallbackProcessDescription(body.jobTitle, body.department ?? (job ? (body.locale === "en" ? job.departmentEn : job.departmentFa) : null), body.locale),
      specialConditions: body.specialConditions?.trim() || "",
      suggestions: databaseSuggestions,
    });
    const provider = getAvailableAssessmentAIProvider();
    let aiSuggestions = emptyProcessSuggestions();
    let jobTitleSuggestions: string[] = [];
    let riskSuggestions = emptyFmeaRiskSuggestions();
    let scoreSuggestion: FmeaRiskScoreSuggestion | null = null;
    let riskRows: FmeaRiskRowSuggestion[] = [];
    let descriptionSuggestion: string | null = null;
    let autofill: FmeaProcessAutofill | null = body.mode === "autofill" ? fallbackAutofill() : null;
    let aiJobCatalogSuggestions: JobCatalogRecord[] = [];
    let aiStatus: "connected" | "fallback" | "unavailable" = provider.available() ? "connected" : "unavailable";
    try {
      const matchingJobTitles = body.mode === "job-titles"
        ? (await prisma.jobCatalog.findMany({ where: { active: true, OR: [{ organizationId: null }, { organizationId }], AND: [{ OR: [{ titleFa: { contains: body.jobTitle } }, { titleEn: { contains: body.jobTitle } }] }] }, select: { titleFa: true, titleEn: true }, take: 20 })).flatMap((item) => [item.titleFa, item.titleEn])
        : [];
      const message = body.mode === "description" ? buildDescriptionPrompt(body) : body.mode === "risk-row" ? buildFmeaRiskSuggestionsPrompt(body) : body.mode === "risk-rows" ? buildFmeaRiskRowsPrompt({ ...body, projectName }) : body.mode === "job-titles" ? buildJobTitleSuggestionsPrompt({ ...body, existingJobTitles: [...matchingJobTitles, ...(job ? [job.titleFa, job.titleEn] : [])] }) : body.mode === "autofill" ? buildFmeaProcessAutofillPrompt({ ...body, projectName, databaseSuggestions }) : buildProcessSuggestionsPrompt({ ...body, databaseSuggestions });
      const result = await provider.analyze({ organizationId, userId: request.actor!.userId, message, ...(body.mode === "risk-rows" ? { maxOutputTokens: 8000 } : {}) });
      if (result.usedFallback || result.provider === "fallback") throw Object.assign(new Error("Assessment AI fallback is not permitted"), { code: "ASSESSMENT_PROVIDER_NOT_APPROVED" });
      if (body.mode === "description") descriptionSuggestion = cleanDescription(result.answer) || fallbackProcessDescription(body.jobTitle, body.department, body.locale);
      else if (body.mode === "risk-row") {
        riskSuggestions = parseFmeaRiskSuggestions(result.answer);
        scoreSuggestion = parseFmeaRiskScoreSuggestion(result.answer);
      } else if (body.mode === "risk-rows") {
        const parsed = parseFmeaRiskRows(result.answer);
        if (!parsed.length && !hasExplicitlyEmptyFmeaRiskRows(result.answer)) throw Object.assign(new Error("Invalid FMEA risk rows"), { code: "FMEA_AI_INVALID_RESPONSE" });
        riskRows = parsed;
      } else if (body.mode === "job-titles") {
        jobTitleSuggestions = cleanJobTitleList(parseJobTitleSuggestions(result.answer));
        const currentTitle = normalizeJobTitle(body.jobTitle);
        const existingTitles = new Set(matchingJobTitles.map((title) => normalizeJobTitle(title)).filter(Boolean));
        jobTitleSuggestions = jobTitleSuggestions.filter((title) => {
          const normalizedTitle = normalizeJobTitle(title);
          return normalizedTitle && normalizedTitle !== currentTitle && !existingTitles.has(normalizedTitle);
        });
        aiJobCatalogSuggestions = await persistAiJobTitles({ organizationId, titles: jobTitleSuggestions, locale: body.locale, department: body.department });
      }
      else if (body.mode === "autofill") {
        const parsed = parseFmeaProcessAutofill(result.answer);
        const fallback = fallbackAutofill();
        autofill = {
          department: parsed.department || fallback.department,
          activityDescription: parsed.activityDescription || fallback.activityDescription,
          specialConditions: parsed.specialConditions || fallback.specialConditions,
          suggestions: {
            equipment: parsed.suggestions.equipment.length ? parsed.suggestions.equipment : fallback.suggestions.equipment,
            materials: parsed.suggestions.materials.length ? parsed.suggestions.materials : fallback.suggestions.materials,
            controls: parsed.suggestions.controls.length ? parsed.suggestions.controls : fallback.suggestions.controls,
          },
        };
      }
      else aiSuggestions = limitProcessSuggestions(parseProcessSuggestions(result.answer), FMEA_PROCESS_AI_SUGGESTION_MAX);
      aiStatus = "connected";
    } catch (error) {
      if (isAIAccessError(error)) throw error;
      aiStatus = "unavailable";
      if (body.mode === "description") descriptionSuggestion = fallbackProcessDescription(body.jobTitle, body.department, body.locale);
      if (body.mode === "autofill") autofill = fallbackAutofill();
      if (body.mode === "risk-rows") riskRows = [];
    }
    await audit(request, "FMEA_PROCESS_SUGGESTION", "JobCatalog", job?.id, { mode: body.mode, provider: provider.name, aiStatus, persistedTitleCount: aiJobCatalogSuggestions.length });
    return envelope({ job: job ? serializeJobCatalog(job) : null, ...suggestionResponse(databaseSuggestions, aiSuggestions, provider.name, aiStatus, descriptionSuggestion, riskSuggestions, scoreSuggestion, jobTitleSuggestions, autofill, aiJobCatalogSuggestions, riskRows) });
  });
  app.get("/api/v1/fmea/:id", { preHandler: authenticate }, async (request) => envelope(await getFmea(parse(idParam, request.params).id, requireOrg(request))));
  app.post("/api/v1/fmea", { preHandler: authenticate }, async (request, reply) => { const organizationId = requireOrg(request); requirePermission(request, "assessments.create"); const body = parse(fmeaBody, request.body); assertFmeaProcessItemSelectionLimit(body); await ensureProject(body.projectId, organizationId); await ensureActivity(body.activityId, body.projectId, organizationId); await ensureJobCatalog(body.jobCatalogId, organizationId); const assessment = await prisma.fmeaAssessment.create({ data: { organizationId, ...body } }); await prisma.fmeaVersion.create({ data: { assessmentId: assessment.id, version: 1, snapshot: json(assessment), createdBy: request.actor!.userId } }); await audit(request, "FMEA_CREATE", "FmeaAssessment", assessment.id); return reply.code(201).send(envelope(assessment)); });
  app.patch("/api/v1/fmea/:id", { preHandler: authenticate }, async (request) => { const organizationId = requireOrg(request); requirePermission(request, "assessments.update"); const { id } = parse(idParam, request.params); const current = await getFmea(id, organizationId); const body = parse(fmeaBody.partial(), request.body); assertFmeaProcessItemSelectionLimit(body, { equipment: current.equipment, materials: current.materials, controls: current.existingControls }); const projectId = body.projectId ?? current.projectId; await ensureProject(projectId, organizationId); await ensureActivity(body.activityId === undefined ? current.activityId : body.activityId, projectId, organizationId); await ensureJobCatalog(body.jobCatalogId === undefined ? current.jobCatalogId : body.jobCatalogId, organizationId); const nextVersion = current.version + 1; const approvedAt = body.status === "APPROVED" ? new Date() : current.approvedAt; const nextSnapshot = { ...current, ...body, projectId, activityId: body.activityId === undefined ? current.activityId : body.activityId, jobCatalogId: body.jobCatalogId === undefined ? current.jobCatalogId : body.jobCatalogId, version: nextVersion, approvedAt }; const assessment = await prisma.$transaction(async (tx) => { await tx.fmeaVersion.upsert({ where: { assessmentId_version: { assessmentId: id, version: current.version } }, update: {}, create: { assessmentId: id, version: current.version, snapshot: json(current), createdBy: request.actor!.userId } }); const updated = await tx.fmeaAssessment.update({ where: { id }, data: { ...body, version: nextVersion, approvedAt } }); await tx.fmeaVersion.upsert({ where: { assessmentId_version: { assessmentId: id, version: nextVersion } }, update: {}, create: { assessmentId: id, version: nextVersion, snapshot: json(nextSnapshot), createdBy: request.actor!.userId } }); return updated; }); await audit(request, "FMEA_UPDATE", "FmeaAssessment", id, { version: nextVersion }); return envelope(assessment); });
  app.delete("/api/v1/fmea/:id", { preHandler: authenticate }, async (request) => { const organizationId = requireOrg(request); requirePermission(request, "assessments.delete"); const { id } = parse(idParam, request.params); await getFmea(id, organizationId); await prisma.fmeaAssessment.update({ where: { id }, data: { deletedAt: new Date(), status: "ARCHIVED" } }); await audit(request, "FMEA_DELETE", "FmeaAssessment", id); return envelope({ success: true }); });
  app.get("/api/v1/fmea/:id/history", { preHandler: authenticate }, async (request) => { const organizationId = requireOrg(request); const { id } = parse(idParam, request.params); await getFmea(id, organizationId); return envelope(await prisma.fmeaVersion.findMany({ where: { assessmentId: id }, orderBy: { version: "desc" } })); });
  app.post("/api/v1/fmea/:id/duplicate", { preHandler: authenticate }, async (request, reply) => { const organizationId = requireOrg(request); requirePermission(request, "assessments.create"); const { id } = parse(idParam, request.params); const current = await getFmea(id, organizationId); const code = `${current.code}-COPY-${Date.now().toString().slice(-6)}`; const copy = await prisma.fmeaAssessment.create({ data: { organizationId, projectId: current.projectId, activityId: current.activityId, jobCatalogId: current.jobCatalogId, title: `${current.title} (Copy)`, code, scope: current.scope, department: current.department, activityDescription: current.activityDescription, equipment: current.equipment ?? undefined, materials: current.materials ?? undefined, existingControls: current.existingControls ?? undefined, specialConditions: current.specialConditions, items: { create: current.items.map((source) => { const rpn = calculateRpn(source.severity, source.occurrence, source.detection); return { rowNumber: source.rowNumber, processStep: source.processStep, failureMode: source.failureMode, effect: source.effect, cause: source.cause, preventiveControls: source.preventiveControls, detectionControls: source.detectionControls, severity: source.severity, occurrence: source.occurrence, detection: source.detection, rpn, riskLevel: riskLevel(rpn, DEFAULT_THRESHOLDS), recommendation: source.recommendation, residualSeverity: source.residualSeverity, residualOccurrence: source.residualOccurrence, residualDetection: source.residualDetection, residualRpn: source.residualRpn }; }) } } }); await audit(request, "FMEA_DUPLICATE", "FmeaAssessment", copy.id, { sourceId: id }); return reply.code(201).send(envelope(copy)); });
  app.post("/api/v1/fmea/:id/items", { preHandler: authenticate }, async (request, reply) => {
    const organizationId = requireOrg(request);
    requirePermission(request, "assessments.update");
    const { id } = parse(idParam, request.params);
    const assessment = await prisma.fmeaAssessment.findFirst({ where: { id, organizationId, deletedAt: null }, include: { organization: true } });
    if (!assessment) throw Object.assign(new Error("FMEA not found"), { statusCode: 404 });
    const body = parse(fmeaItemCreateBody, request.body);
    const previousItem = body.rowNumber === undefined ? await prisma.fmeaItem.findFirst({ where: { assessmentId: id }, orderBy: { rowNumber: "desc" }, select: { rowNumber: true } }) : null;
    const rowNumber = body.rowNumber ?? nextFmeaRowNumber(previousItem ? [previousItem.rowNumber] : []);
    const processStep = defaultFmeaProcessStep(body.processStep, assessment.activityDescription ?? assessment.title);
    const rpn = calculateRpn(body.severity, body.occurrence, body.detection);
    const residualRpn = body.residualSeverity && body.residualOccurrence && body.residualDetection ? calculateRpn(body.residualSeverity, body.residualOccurrence, body.residualDetection) : null;
    const item = await prisma.fmeaItem.create({ data: { assessmentId: id, ...body, rowNumber, processStep, rpn, residualRpn, riskLevel: riskLevel(rpn, DEFAULT_THRESHOLDS) } });
    await audit(request, "FMEA_ITEM_CREATE", "FmeaItem", item.id);
    return reply.code(201).send(envelope(item));
  });
   app.patch("/api/v1/fmea/:id/items/:itemId", { preHandler: authenticate }, async (request) => { const organizationId = requireOrg(request); requirePermission(request, "assessments.update"); const params = parse(z.object({ id: z.string().uuid(), itemId: z.string().uuid() }), request.params); await getFmea(params.id, organizationId); const current = await prisma.fmeaItem.findFirst({ where: { id: params.itemId, assessmentId: params.id } }); if (!current) throw Object.assign(new Error("FMEA item not found"), { statusCode: 404 }); const body = parse(fmeaItemBody.partial(), request.body); const severity = body.severity ?? current.severity, occurrence = body.occurrence ?? current.occurrence, detection = body.detection ?? current.detection; const rpn = calculateRpn(severity, occurrence, detection); const residualSeverity = body.residualSeverity === undefined ? current.residualSeverity : body.residualSeverity; const residualOccurrence = body.residualOccurrence === undefined ? current.residualOccurrence : body.residualOccurrence; const residualDetection = body.residualDetection === undefined ? current.residualDetection : body.residualDetection; const residualRpn = residualSeverity && residualOccurrence && residualDetection ? calculateRpn(residualSeverity, residualOccurrence, residualDetection) : null; const updated = await prisma.fmeaItem.update({ where: { id: params.itemId }, data: { ...body, rpn, residualRpn, riskLevel: riskLevel(rpn, DEFAULT_THRESHOLDS) } }); await audit(request, "FMEA_ITEM_UPDATE", "FmeaItem", updated.id, { assessmentId: params.id, rpn, riskLevel: updated.riskLevel }); return envelope(updated); });
   app.delete("/api/v1/fmea/:id/items/:itemId", { preHandler: authenticate }, async (request) => { const organizationId = requireOrg(request); requirePermission(request, "assessments.update"); const params = parse(z.object({ id: z.string().uuid(), itemId: z.string().uuid() }), request.params); await getFmea(params.id, organizationId); await deleteFmeaItemAndRenumber(params.id, params.itemId); await audit(request, "FMEA_ITEM_DELETE", "FmeaItem", params.itemId, { assessmentId: params.id }); return envelope({ success: true }); });

  app.get("/api/v1/rula", { preHandler: authenticate }, async (request) => {
    const organizationId = requireOrg(request);
    const assessments = await prisma.rulaAssessment.findMany({ where: { organizationId }, include: { project: { select: { id: true, name: true, code: true } } }, orderBy: { updatedAt: "desc" } });
    const images = assessments.length ? await prisma.attachment.findMany({ where: { organizationId, entityType: "RulaAssessment", entityId: { in: assessments.map((assessment) => assessment.id) }, kind: "IMAGE", deletedAt: null }, select: { id: true, entityId: true, originalName: true, mimeType: true, size: true, createdAt: true }, orderBy: { createdAt: "asc" } }) : [];
    const imagesByAssessment = new Map<string, typeof images>();
    for (const image of images) {
      if (!image.entityId) continue;
      const linked = imagesByAssessment.get(image.entityId) ?? [];
      linked.push(image);
      imagesByAssessment.set(image.entityId, linked);
    }
    return envelope(assessments.map((assessment) => {
      const postureImages = (imagesByAssessment.get(assessment.id) ?? []).map(({ entityId: _entityId, ...image }) => image);
      return { ...assessment, inputs: { ...(assessment.inputs as object), algorithmVersion: (assessment.inputs as { algorithmVersion?: string })?.algorithmVersion ?? 'legacy-average-v1' }, postureImages, postureImage: postureImages.at(-1) ?? null, postureReviewComplete: rulaReviewComplete(assessment.bodySide, assessment.postureAnalysis) };
    }));
  });
  app.get("/api/v1/rula/:id", { preHandler: authenticate }, async (request) => envelope(await getRula(parse(idParam, request.params).id, requireOrg(request))));
  app.post("/api/v1/rula", { preHandler: authenticate }, async (request, reply) => {
    const organizationId = requireOrg(request);
    requirePermission(request, "assessments.create");
    const body = parse(rulaBody, request.body);
    if (body.postureAnalysis?.imageAssessments?.some(image => image.attachmentId)) throw Object.assign(new Error("Upload images after assessment creation"), { statusCode: 400, code: "RULA_IMAGE_UPLOAD_ORDER" });
    if (body.activityInfo?.postureImageAttachmentId) throw Object.assign(new Error("Upload the posture image after creating the RULA assessment"), { statusCode: 400, code: "RULA_IMAGE_UPLOAD_ORDER" });
    await ensureProject(body.projectId, organizationId);
    await ensureActivity(body.activityId, body.projectId, organizationId);
    const title = resolveRulaTitle(body.title, body.activityInfo);
    const status = body.status ?? (rulaReviewComplete(body.bodySide, body.postureAnalysis) ? "DRAFT" : "IN_PROGRESS");
    assertRulaFinalStatusReviewed(status, body.bodySide, body.postureAnalysis);
    const calculation = calculateRulaAssessment(body.bodySide, body.inputs as RulaInput, body.postureAnalysis, false);
    const { inputs, result, sideResults } = calculation;
    const assessment = await prisma.rulaAssessment.create({ data: { organizationId, ...body, status, title, inputs: json(inputs), activityInfo: body.activityInfo ? json(body.activityInfo) : undefined, postureAnalysis: calculation.analysis ? json(calculation.analysis) : undefined, score: result.score, actionLevel: result.actionLevel, explanation: result.explanation } });
    await prisma.rulaVersion.create({ data: { assessmentId: assessment.id, version: 1, snapshot: json({ ...assessment, trace: result.trace, ...(sideResults ? { sideResults } : {}) }), createdBy: request.actor!.userId } });
    await audit(request, "RULA_CREATE", "RulaAssessment", assessment.id, { postureReviewComplete: rulaReviewComplete(body.bodySide, body.postureAnalysis), status });
    return reply.code(201).send(envelope({ ...assessment, trace: result.trace, ...(sideResults ? { sideResults } : {}) }));
  });
  app.patch("/api/v1/rula/:id", { preHandler: authenticate }, async (request) => {
    const organizationId = requireOrg(request);
    requirePermission(request, "assessments.update");
    const { id } = parse(idParam, request.params);
    const current = await getRula(id, organizationId);
    const body = parse(rulaBody.partial(), request.body);
    await ensureRulaPostureImage(body.activityInfo?.postureImageAttachmentId, id, organizationId);
    for (const image of body.postureAnalysis?.imageAssessments ?? []) await ensureRulaPostureImage(image.attachmentId, id, organizationId);
    const projectId = body.projectId ?? current.projectId;
    const bodySide = (body.bodySide ?? current.bodySide) as "LEFT" | "RIGHT" | "BOTH";
    await ensureProject(projectId, organizationId);
    await ensureActivity(body.activityId === undefined ? current.activityId : body.activityId, projectId, organizationId);
    const rawInputs = (body.inputs ?? current.inputs) as unknown as RulaInput;
    const postureAnalysis = body.postureAnalysis === undefined ? current.postureAnalysis as RulaPostureAnalysis | undefined : body.postureAnalysis;
    assertRulaFinalStatusReviewed(body.status ?? current.status, bodySide, postureAnalysis);
    const calculation = calculateRulaAssessment(bodySide, rawInputs, postureAnalysis, body.postureAnalysis !== undefined || body.inputs !== undefined || body.bodySide !== undefined);
    const { inputs, result, sideResults } = calculation;
    const nextVersion = current.version + 1;
    const nextSnapshot = { ...current, ...body, projectId, bodySide, activityId: body.activityId === undefined ? current.activityId : body.activityId, inputs, postureAnalysis: calculation.analysis, score: result.score, actionLevel: result.actionLevel, explanation: result.explanation, version: nextVersion };
    const updateData: Prisma.RulaAssessmentUncheckedUpdateInput = { ...(body.projectId !== undefined ? { projectId } : {}), ...(body.activityId !== undefined ? { activityId: body.activityId } : {}), ...(body.title !== undefined ? { title: body.title } : {}), ...(body.subjectCode !== undefined ? { subjectCode: body.subjectCode } : {}), ...(body.bodySide !== undefined ? { bodySide } : {}), ...(body.status !== undefined ? { status: body.status } : {}), ...(body.inputs !== undefined || body.postureAnalysis !== undefined ? { inputs: json(inputs) } : {}), ...(body.activityInfo !== undefined ? { activityInfo: body.activityInfo ? json(body.activityInfo) : Prisma.JsonNull } : {}), ...(body.postureAnalysis !== undefined ? { postureAnalysis: calculation.analysis ? json(calculation.analysis) : Prisma.JsonNull } : {}), score: result.score, actionLevel: result.actionLevel, explanation: result.explanation, version: nextVersion };
    const assessment = await prisma.$transaction(async (tx) => {
      await tx.rulaVersion.upsert({ where: { assessmentId_version: { assessmentId: id, version: current.version } }, update: {}, create: { assessmentId: id, version: current.version, snapshot: json(current), createdBy: request.actor!.userId } });
      const updated = await tx.rulaAssessment.update({ where: { id }, data: updateData });
      await tx.rulaVersion.upsert({ where: { assessmentId_version: { assessmentId: id, version: nextVersion } }, update: {}, create: { assessmentId: id, version: nextVersion, snapshot: json(nextSnapshot), createdBy: request.actor!.userId } });
      return updated;
    });
    await audit(request, "RULA_UPDATE", "RulaAssessment", id, { version: assessment.version });
    return envelope({ ...assessment, trace: result.trace, ...(sideResults ? { sideResults } : {}) });
  });
  app.delete("/api/v1/rula/:id", { preHandler: authenticate }, async (request) => { const organizationId = requireOrg(request); requirePermission(request, "assessments.delete"); const { id } = parse(idParam, request.params); await getRula(id, organizationId); await prisma.rulaAssessment.update({ where: { id }, data: { status: "ARCHIVED" } }); await audit(request, "RULA_DELETE", "RulaAssessment", id); return envelope({ success: true }); });
  app.get("/api/v1/rula/:id/history", { preHandler: authenticate }, async (request) => { const organizationId = requireOrg(request); const { id } = parse(idParam, request.params); await getRula(id, organizationId); return envelope(await prisma.rulaVersion.findMany({ where: { assessmentId: id }, orderBy: { version: "desc" } })); });
  app.post("/api/v1/rula/:id/duplicate", { preHandler: authenticate }, async (request, reply) => { const organizationId = requireOrg(request); requirePermission(request, "assessments.create"); const { id } = parse(idParam, request.params); const current = await getRula(id, organizationId); const copy = await prisma.rulaAssessment.create({ data: { organizationId, projectId: current.projectId, activityId: current.activityId, title: `${current.title} (Copy)`, subjectCode: current.subjectCode, bodySide: current.bodySide, inputs: current.inputs as Prisma.InputJsonValue, activityInfo: current.activityInfo as Prisma.InputJsonValue | null ?? undefined, postureAnalysis: current.postureAnalysis as Prisma.InputJsonValue | null ?? undefined, score: current.score, actionLevel: current.actionLevel, explanation: current.explanation } }); await audit(request, "RULA_DUPLICATE", "RulaAssessment", copy.id, { sourceId: id }); return reply.code(201).send(envelope(copy)); });
}

export async function deleteFmeaItemAndRenumber(assessmentId: string, itemId: string) {
  return prisma.$transaction(async (tx) => {
    // Lock the parent before deletion and compaction so concurrent deletions serialize.
    await tx.fmeaAssessment.update({ where: { id: assessmentId }, data: { updatedAt: new Date() } });
    const result = await tx.fmeaItem.deleteMany({ where: { id: itemId, assessmentId } });
    if (!result.count) throw Object.assign(new Error("FMEA item not found"), { statusCode: 404 });
    const remaining = await tx.fmeaItem.findMany({ where: { assessmentId }, orderBy: [{ rowNumber: "asc" }, { id: "asc" }], select: { id: true, rowNumber: true } });
    for (const [index, item] of remaining.entries()) {
      if (item.rowNumber !== index + 1) await tx.fmeaItem.update({ where: { id: item.id }, data: { rowNumber: index + 1 } });
    }
  });
}
