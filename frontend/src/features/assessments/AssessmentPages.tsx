import { calculateRpn, calculateRula, riskLevel, suggestedRulaPostureScore, type RulaInput } from "@nivasafe/domain";
import { get as getDraft, set as setDraft } from "idb-keyval";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ChangeEvent, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type MutableRefObject } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, download, getCurrentRole, getSession, useLoad } from "../../api/client";
import { EmptyState, Icon, LocalizedDateInput, PageHeader, SectionCard, StatusBadge, StyledSelect, formatDate, useDialog } from "../../components/UI";
import { AutoSaveForm, clearAutoSaveDraft } from "../../forms/AutoSaveForm";
import { assessmentDraftKey, assessmentWizardStepKey, clearAssessmentWizardStep, readStoredDraft, scopedDraftKey, snapshotForm as snapshotStoredForm, writeStoredDraft, type AutoSaveDraft } from "../../forms/autoSave";
import { useI18n } from "../../i18n";
import { LoadState } from "../general/GeneralPages";

type Project = { id: string; name: string; nameFa?: string; nameEn?: string };
type FmeaItem = { id: string; rowNumber: number; processStep: string; failureMode: string; effect: string; cause: string; preventiveControls?: string | null; detectionControls?: string | null; severity: number; occurrence: number; detection: number; rpn: number; riskLevel: string; recommendation?: string | null };
type FmeaItemDraft = { rowNumber: number; processStep: string; failureMode: string; effect: string; cause: string; preventiveControls: string; detectionControls: string; severity: number; occurrence: number; detection: number; recommendation: string };
type FmeaRiskRowInput = Omit<FmeaItemDraft, "rowNumber" | "processStep">;
type RiskSortField = "rowNumber" | "rpn" | "severity" | "occurrence" | "detection";
type ProcessSuggestionCategory = "equipment" | "materials" | "controls";
type ProcessSuggestions = Record<ProcessSuggestionCategory, string[]>;
type ProcessSuggestionInputs = Record<ProcessSuggestionCategory, string>;
type FmeaProcessAutofill = { department: string; activityDescription: string; specialConditions: string; suggestions: ProcessSuggestions };
type FmeaAutofillField = "department" | "activityDescription" | "specialConditions" | ProcessSuggestionCategory;
type FmeaRiskSuggestionField = "failureModes" | "effects" | "causes" | "preventiveControls" | "detectionControls" | "recommendations";
type FmeaRiskSuggestions = Record<FmeaRiskSuggestionField, string[]>;
type FmeaRiskSuggestionContext = { projectName?: string | null; jobTitle: string; department?: string | null; activityDescription?: string | null; processStep?: string | null; failureMode?: string | null; effect?: string | null; cause?: string | null; preventiveControls?: string | null; detectionControls?: string | null; recommendation?: string | null };
type FmeaRiskScoreSuggestion = { severity: number; occurrence: number; detection: number; rationale: string };
type FmeaImageRiskRow = { failureMode: string; effect: string; cause: string; preventiveControls: string; detectionControls: string; recommendation: string; severity: number; occurrence: number; detection: number };
type FmeaProcessImageAnalysis = { summary: string; riskRows: FmeaImageRiskRow[]; provider: string; aiStatus: "connected" | "fallback" };
type FmeaRiskSuggestionInputName = "failureMode" | "effect" | "cause" | "preventiveControls" | "detectionControls" | "recommendation";
type FmeaScoreKind = "severity" | "occurrence" | "detection";
type ScoreCriterion = { score: number; label: string; description: string };
type JobCatalogEntry = { id: string; organizationId: string | null; titleFa: string; titleEn: string; source?: string; sourceLocale?: string | null; keywords: string[]; departmentFa: string | null; departmentEn: string | null; descriptionFa: string | null; descriptionEn: string | null; equipment: string[]; materials: string[]; controls: string[] };
type ProcessSuggestionResponse = { job: JobCatalogEntry | null; databaseSuggestions: ProcessSuggestions; aiSuggestions: ProcessSuggestions; provider: string; aiStatus: "connected" | "fallback" | "unavailable"; descriptionSuggestion?: string | null; riskSuggestions?: FmeaRiskSuggestions; scoreSuggestion?: FmeaRiskScoreSuggestion | null; jobTitleSuggestions?: string[]; aiJobCatalogSuggestions?: JobCatalogEntry[]; autofill?: FmeaProcessAutofill | null };
type Fmea = { id: string; title: string; code: string; scope?: string; activityId?: string | null; department?: string; activityDescription?: string; equipment?: string[]; materials?: string[]; existingControls?: string[]; specialConditions?: string; status: string; version: number; project: Project; items: FmeaItem[]; jobCatalog?: JobCatalogEntry | null };
type RulaActivityInfo = { jobTitle: string; taskDescription: string; postureDescription?: string | null; durationPerOccurrence?: number; durationUnit?: "SECOND" | "MINUTE" | "HOUR"; repetitionsPerShift?: number; postureHoldDuration?: number; postureHoldUnit?: "SECOND" | "MINUTE" | "HOUR"; loadWeight?: number | null; loadUnit?: "KG" | "LB"; postureImageAttachmentId?: string | null };
type RulaPosturePart = "upperArm" | "lowerArm" | "wrist" | "wristTwist" | "neck" | "trunk" | "legs";
type RulaPostureSource = "AI" | "USER" | "DEFAULT";
type RulaPostureRow = { angle: number | null; score: number; detected: boolean; source: RulaPostureSource; confirmedByUser: boolean; confidence?: number | null };
type RulaBodySide = "LEFT" | "RIGHT";
type RulaActionBodySide = "LEFT" | "RIGHT" | "BOTH";
type RulaSinglePostureAnalysis = Record<RulaPosturePart, RulaPostureRow>;
type RulaPostureAnalysis = RulaSinglePostureAnalysis & { sideAnalyses?: Partial<Record<RulaBodySide, RulaSinglePostureAnalysis>> };
type Rula = { id: string; title: string; subjectCode?: string; bodySide?: "RIGHT" | "LEFT" | "BOTH"; score: number; actionLevel: number; explanation: string; status: string; version: number; createdAt?: string; updatedAt?: string; project: Project; postureReviewComplete?: boolean; activityInfo?: RulaActivityInfo | null; postureAnalysis?: RulaPostureAnalysis | null; postureImage?: { id: string; originalName: string; mimeType: string; size: number; createdAt: string } | null };
type RulaActionPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type RulaReportFactor = { key: "neck" | "upperArm" | "trunk"; angle: number | null; detected?: boolean; score: number; impactPercent: number; impactLevel: "LOW" | "MEDIUM" | "HIGH"; source: RulaPostureSource; reviewed?: boolean };
type RulaCorrectionAction = { id: string; titleFa: string; titleEn: string; descriptionFa: string; descriptionEn: string; priority: RulaActionPriority; scoreReduction: number; affectedParts: RulaPosturePart[]; bodySide?: RulaActionBodySide; persistedId?: string; suggestionId?: string };
type RulaPersistedAction = { id: string; title: string; description: string; priority: RulaActionPriority; status: string; progress: number; assigneeName?: string | null; dueDate?: string | null; beforeRisk?: number | null; afterRisk?: number | null; bodySide?: RulaActionBodySide | null; rulaImpact?: { suggestionId?: string; scoreReduction: number; affectedParts: RulaPosturePart[] } | null };
type RulaReportPayload = { assessment: { id: string; title: string; project: Project; score: number; actionLevel: number; explanation: string; status: string; updatedAt: string; bodySide: RulaActionBodySide; activityInfo?: RulaActivityInfo | null; postureAnalysis: RulaPostureAnalysis }; factors: RulaReportFactor[]; suggestedActions: RulaCorrectionAction[]; actions: RulaPersistedAction[]; predictedScore: number };
type VersionRow = { id: string; version: number; createdAt: string };
type DraftRecord = AutoSaveDraft;

const processSuggestionCategories: ProcessSuggestionCategory[] = ["equipment", "materials", "controls"];
const fmeaRiskSuggestionFields: FmeaRiskSuggestionField[] = ["failureModes", "effects", "causes", "preventiveControls", "detectionControls", "recommendations"];
const fmeaScoreKinds: FmeaScoreKind[] = ["severity", "occurrence", "detection"];
const FMEA_PROCESS_DESCRIPTION_MAX = 1_200;
const FMEA_PROCESS_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const FMEA_PROCESS_IMAGE_MAX_COUNT = 3;
const FMEA_PROCESS_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const FMEA_CREATE_PROJECT_OPTION = "__create_project__";
const RULA_CREATE_PROJECT_OPTION = "__create_rula_project__";
const FMEA_RISK_PAGE_SIZE = 10;
const FMEA_AI_VISIBLE_SUGGESTION_COUNT = 3;
const FMEA_PROCESS_SUGGESTION_MAX = 10;
const FMEA_PROCESS_BOARD_SUGGESTION_MAX = 6;
const FMEA_PROCESS_SELECTION_MAX = 5;
const FMEA_ASSISTANT_STORAGE_KEY = "nivasafe-fmea-assistant-enabled-v2";
const FMEA_JOB_CATALOG_LIMIT = 200;
const FMEA_JOB_VISIBLE_COUNT = 12;
const RULA_POSTURE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const RULA_POSTURE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function emptyFmeaRiskRowInput(): FmeaRiskRowInput {
  return { failureMode: "", effect: "", cause: "", preventiveControls: "", detectionControls: "", severity: 1, occurrence: 1, detection: 1, recommendation: "" };
}

const fmeaScoreCriteria: Record<"fa" | "en", Record<FmeaScoreKind, ScoreCriterion[]>> = {
  fa: {
    severity: [
      { score: 1, label: "فاقد اثر", description: "هیچ‌گونه تأثیری ندارد." },
      { score: 2, label: "خیلی کم", description: "وظایف و عملکرد سیستم به‌طور مختصر تحت تأثیر قرار می‌گیرد و رفع نقص هنگام گزارش خرابی انجام می‌شود." },
      { score: 3, label: "کم", description: "وظایف و عملکرد سیستم به‌طور مختصر تحت تأثیر قرار می‌گیرد و رفع نقص زمان‌بر است." },
      { score: 4, label: "کم تا متوسط", description: "وظایف و عملکرد سیستم به‌طور متوسط تحت تأثیر قرار می‌گیرد و بخشی از عملیات دچار تأخیر می‌شود." },
      { score: 5, label: "متوسط", description: "وظایف و عملکرد سیستم به‌طور متوسط تحت تأثیر قرار می‌گیرد و کل عملیات دچار تأخیر می‌شود." },
      { score: 6, label: "متوسط به بالا", description: "وظایف و عملکرد سیستم به‌طور متوسط تحت تأثیر قرار می‌گیرد و قسمتی از عملیات متوقف می‌شود." },
      { score: 7, label: "زیاد", description: "وظایف و عملکرد کل سیستم تحت تأثیر قرار می‌گیرد و قسمتی از عملیات متوقف می‌شود." },
      { score: 8, label: "بسیار زیاد", description: "وظایف و عملکرد کل سیستم تحت تأثیر قرار می‌گیرد و کل عملیات متوقف می‌شود." },
      { score: 9, label: "بسیار خطرناک با هشدار اولیه", description: "نقص بالقوه بسیار خطرناک است و همراه با هشدار اولیه رخ می‌دهد." },
      { score: 10, label: "بسیار خطرناک بدون هشدار اولیه", description: "نقص بالقوه بسیار خطرناک است و بدون هیچ‌گونه هشدار اولیه رخ می‌دهد." },
    ],
    occurrence: [
      { score: 1, label: "فوق‌العاده کم", description: "احتمال وقوع بسیار کم است." },
      { score: 2, label: "خیلی کم", description: "احتمال وقوع خیلی کم است." },
      { score: 3, label: "کم", description: "احتمال وقوع کم است." },
      { score: 4, label: "کم تا متوسط", description: "احتمال وقوع کم تا متوسط است." },
      { score: 5, label: "متوسط", description: "احتمال وقوع متوسط است." },
      { score: 6, label: "متوسط به بالا", description: "احتمال وقوع متوسط به بالا است." },
      { score: 7, label: "زیاد", description: "احتمال وقوع زیاد است." },
      { score: 8, label: "تکرارشونده", description: "وقوع خطا در چرخه‌های کاری تکرار می‌شود." },
      { score: 9, label: "خیلی زیاد", description: "احتمال وقوع خیلی زیاد است." },
      { score: 10, label: "فوق‌العاده زیاد", description: "احتمال وقوع فوق‌العاده زیاد است." },
    ],
    detection: [
      { score: 1, label: "به‌راحتی قابل تشخیص می‌باشد", description: "احتمال کشف بسیار بالا است و خطا به‌راحتی قابل تشخیص می‌باشد." },
      { score: 2, label: "به‌راحتی قابل تشخیص می‌باشد", description: "احتمال کشف بسیار بالا است و خطا به‌راحتی قابل تشخیص می‌باشد." },
      { score: 3, label: "احتمال کشف بسیار بالاست", description: "احتمال کشف بسیار بالا است." },
      { score: 4, label: "احتمال کشف بسیار بالاست", description: "احتمال کشف بسیار بالا است." },
      { score: 5, label: "احتمال کشف معمولی", description: "احتمال کشف معمولی است." },
      { score: 6, label: "احتمال کشف معمولی", description: "احتمال کشف معمولی است." },
      { score: 7, label: "احتمال کشف پایین", description: "احتمال کشف پایین است." },
      { score: 8, label: "احتمال کشف پایین", description: "احتمال کشف پایین است." },
      { score: 9, label: "غیرقابل شناسایی", description: "خطا غیرقابل شناسایی است." },
      { score: 10, label: "غیرقابل شناسایی", description: "خطا غیرقابل شناسایی است." },
    ],
  },
  en: {
    severity: [
      { score: 1, label: "No effect", description: "No effect." },
      { score: 2, label: "Very low", description: "System functions are briefly affected and the defect is corrected when the failure is reported." },
      { score: 3, label: "Low", description: "System functions are briefly affected and correction takes time." },
      { score: 4, label: "Low to moderate", description: "System functions are moderately affected and part of the operation is delayed." },
      { score: 5, label: "Moderate", description: "System functions are moderately affected and the whole operation is delayed." },
      { score: 6, label: "Moderate to high", description: "System functions are moderately affected and part of the operation stops." },
      { score: 7, label: "High", description: "The whole system is affected and part of the operation stops." },
      { score: 8, label: "Very high", description: "The whole system is affected and the entire operation stops." },
      { score: 9, label: "Very dangerous with early warning", description: "The potential defect is very dangerous and comes with an early warning." },
      { score: 10, label: "Very dangerous without early warning", description: "The potential defect is very dangerous and occurs without any early warning." },
    ],
    occurrence: [
      { score: 1, label: "Extremely low", description: "The likelihood of occurrence is extremely low." },
      { score: 2, label: "Very low", description: "The likelihood of occurrence is very low." },
      { score: 3, label: "Low", description: "The likelihood of occurrence is low." },
      { score: 4, label: "Low to moderate", description: "The likelihood of occurrence is low to moderate." },
      { score: 5, label: "Moderate", description: "The likelihood of occurrence is moderate." },
      { score: 6, label: "Moderate to high", description: "The likelihood of occurrence is moderate to high." },
      { score: 7, label: "High", description: "The likelihood of occurrence is high." },
      { score: 8, label: "Recurrent", description: "The failure recurs in repeating work cycles." },
      { score: 9, label: "Very high", description: "The likelihood of occurrence is very high." },
      { score: 10, label: "Extremely high", description: "The likelihood of occurrence is extremely high." },
    ],
    detection: [
      { score: 1, label: "Readily detectable", description: "Detection probability is very high; the failure is readily detectable." },
      { score: 2, label: "Readily detectable", description: "Detection probability is very high; the failure is readily detectable." },
      { score: 3, label: "Very high detection probability", description: "Detection probability is very high." },
      { score: 4, label: "Very high detection probability", description: "Detection probability is very high." },
      { score: 5, label: "Moderate detection probability", description: "Detection probability is moderate." },
      { score: 6, label: "Moderate detection probability", description: "Detection probability is moderate." },
      { score: 7, label: "Low detection probability", description: "Detection probability is low." },
      { score: 8, label: "Low detection probability", description: "Detection probability is low." },
      { score: 9, label: "Undetectable", description: "The failure is undetectable." },
      { score: 10, label: "Undetectable", description: "The failure is undetectable." },
    ],
  },
};

function emptyProcessSuggestions(): ProcessSuggestions { return { equipment: [], materials: [], controls: [] }; }
function emptyProcessSuggestionInputs(): ProcessSuggestionInputs { return { equipment: "", materials: "", controls: "" }; }

function normaliseProcessSuggestions(value: Partial<ProcessSuggestions> | null | undefined): ProcessSuggestions {
  return Object.fromEntries(processSuggestionCategories.map((category) => [category, Array.isArray(value?.[category]) ? value[category]!.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()).filter((item, index, list) => list.indexOf(item) === index).slice(0, FMEA_PROCESS_SUGGESTION_MAX) : []])) as ProcessSuggestions;
}

function normaliseProcessBoardSuggestions(value: Partial<ProcessSuggestions> | null | undefined): ProcessSuggestions {
  const normalized = normaliseProcessSuggestions(value);
  return Object.fromEntries(processSuggestionCategories.map((category) => [category, normalized[category].slice(0, FMEA_PROCESS_BOARD_SUGGESTION_MAX)])) as ProcessSuggestions;
}

function normaliseFmeaAutofill(value: FmeaProcessAutofill | null | undefined): FmeaProcessAutofill | null {
  if (!value || typeof value !== "object") return null;
  const text = (candidate: unknown, maxLength: number) => typeof candidate === "string" ? candidate.trim().slice(0, maxLength) : "";
  return {
    department: text(value.department, 160),
    activityDescription: text(value.activityDescription, FMEA_PROCESS_DESCRIPTION_MAX),
    specialConditions: text(value.specialConditions, FMEA_PROCESS_DESCRIPTION_MAX),
    suggestions: normaliseProcessSuggestions(value.suggestions),
  };
}

function emptyFmeaRiskSuggestions(): FmeaRiskSuggestions {
  return { failureModes: [], effects: [], causes: [], preventiveControls: [], detectionControls: [], recommendations: [] };
}

function normaliseFmeaRiskSuggestions(value: Partial<FmeaRiskSuggestions> | null | undefined): FmeaRiskSuggestions {
  return Object.fromEntries(fmeaRiskSuggestionFields.map((field) => [field, Array.isArray(value?.[field]) ? value[field]!.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()).filter((item, index, list) => list.indexOf(item) === index).slice(0, 6) : []])) as FmeaRiskSuggestions;
}

function emptyFmeaRiskSuggestionExpansion(): Record<FmeaRiskSuggestionField, boolean> {
  return Object.fromEntries(fmeaRiskSuggestionFields.map((field) => [field, false])) as Record<FmeaRiskSuggestionField, boolean>;
}

const fmeaRiskSuggestionInputName: Record<FmeaRiskSuggestionField, FmeaRiskSuggestionInputName> = { failureModes: "failureMode", effects: "effect", causes: "cause", preventiveControls: "preventiveControls", detectionControls: "detectionControls", recommendations: "recommendation" };

function scoreCriteriaFor(locale: "fa" | "en", kind: FmeaScoreKind) {
  return fmeaScoreCriteria[locale][kind];
}

function localizedJobTitle(job: JobCatalogEntry, locale: "fa" | "en") { return locale === "en" ? job.titleEn : job.titleFa; }

function normalizeJobSearchText(value: unknown) {
  return typeof value === "string"
    ? value.normalize("NFKC").replace(/[يى]/gu, "ی").replace(/[ك]/gu, "ک").replace(/[ۀة]/gu, "ه").replace(/[\u200c\u200d]/gu, " ").replace(/\s+/g, " ").trim().toLocaleLowerCase("fa-IR")
    : "";
}

function filterJobCatalog(jobs: JobCatalogEntry[], query: string, locale: "fa" | "en") {
  const normalizedQuery = normalizeJobSearchText(query);
  const uniqueJobs = jobs.filter((job, index, list) => list.findIndex((candidate) => candidate.id === job.id) === index);
  if (!normalizedQuery) return uniqueJobs.slice(0, FMEA_JOB_VISIBLE_COUNT);
  return uniqueJobs.filter((job) => [
    localizedJobTitle(job, locale),
    locale === "en" ? job.titleFa : job.titleEn,
    localizedJobDepartment(job, locale),
    ...(job.keywords ?? []),
  ].some((value) => normalizeJobSearchText(value).includes(normalizedQuery))).slice(0, FMEA_JOB_VISIBLE_COUNT);
}

function hasExactJobCatalogTitle(jobs: JobCatalogEntry[], value: string, locale: "fa" | "en") {
  const normalizedValue = normalizeJobSearchText(value);
  return Boolean(normalizedValue) && jobs.some((job) => [job.titleFa, job.titleEn].some((title) => normalizeJobSearchText(title) === normalizedValue) || normalizeJobSearchText(localizedJobTitle(job, locale)) === normalizedValue);
}

function assessmentProcessName(assessment: Fmea, locale: "fa" | "en") {
  return assessment.jobCatalog ? localizedJobTitle(assessment.jobCatalog, locale) : assessment.title;
}
function localizedJobDepartment(job: JobCatalogEntry, locale: "fa" | "en") { return (locale === "en" ? job.departmentEn : job.departmentFa) ?? ""; }
function generatedFmeaCode() { return `FMEA-${Date.now().toString(36).toUpperCase().slice(-8)}`; }
function automaticFmeaScope(projectLabel: string, jobTitle: string) {
  return [projectLabel, jobTitle].map((value) => value.trim()).filter(Boolean).join(" / ");
}

function readFmeaAssistantPreference() {
  try { return localStorage.getItem(FMEA_ASSISTANT_STORAGE_KEY) === "true"; } catch { return false; }
}

type FmeaWizardStep = 1 | 2 | 3;

function readFmeaWizardStep(draftKey: string): FmeaWizardStep {
  try {
    const storedStep = sessionStorage.getItem(assessmentWizardStepKey(draftKey));
    return storedStep === "3" ? 3 : storedStep === "2" ? 2 : 1;
  } catch {
    return 1;
  }
}

function clearFmeaWizardStep(draftKey: string) {
  clearAssessmentWizardStep(draftKey);
}

function countShortDescriptionSentences(value: string) {
  const text = value.trim();
  if (!text) return 0;
  return text.split(/(?:[.!?؟]+|\n+)/u).map((part) => part.trim()).filter(Boolean).length;
}

function formTextList(form: FormData, name: string) {
  try {
    const parsed = JSON.parse(String(form.get(name) ?? "[]")) as unknown;
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string" && value.trim().length > 0).map((value) => value.trim()).slice(0, 20) : [];
  } catch { return []; }
}

function draftKeyFor(kind: "fmea" | "rula") {
  const { session, orgId } = getSession();
  return assessmentDraftKey(kind, session?.user.id, orgId);
}

const canEdit = () => { const { session, orgId } = getSession(); return ["SUPER_ADMIN", "ORG_ADMIN", "HSE_MANAGER", "HSE_SPECIALIST", "HSE_OFFICER", "ASSISTANT", "ASSESSOR"].includes(session?.organizations.find((org) => org.id === orgId)?.role ?? "VIEWER") || session?.user.globalRole === "SUPER_ADMIN"; };
async function saveBlob(path: string, filename: string) {
  const blob = await download(path);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
  }, 1_000);
}

function browserStorage(): Storage | undefined {
  try { return window.localStorage; } catch { return undefined; }
}

function readLocalDraft(key: string): DraftRecord | null {
  return readStoredDraft(browserStorage(), key);
}

async function readAssessmentDraft(key: string): Promise<DraftRecord | null> {
  const localDraft = readLocalDraft(key);
  if (localDraft) return localDraft;
  try {
    const indexedDraft = await getDraft<DraftRecord>(key);
    return indexedDraft && typeof indexedDraft === "object" && !Array.isArray(indexedDraft) ? indexedDraft : null;
  } catch {
    return null;
  }
}

function enqueueIndexedDraft(key: string, draft: DraftRecord, queue: MutableRefObject<Promise<void>>): Promise<void> {
  const pending = queue.current.catch(() => undefined).then(() => setDraft(key, draft));
  queue.current = pending.then(() => undefined, () => undefined);
  return pending;
}

async function persistDraftNow(key: string, draft: DraftRecord, queue: MutableRefObject<Promise<void>>): Promise<boolean> {
  const localSaved = writeStoredDraft(browserStorage(), key, draft);
  try {
    await enqueueIndexedDraft(key, draft, queue);
    return true;
  } catch {
    return localSaved;
  }
}

function cancelDraftTimer(timer: MutableRefObject<number | null>) {
  if (timer.current !== null) window.clearTimeout(timer.current);
  timer.current = null;
}

function queueDraft(form: HTMLFormElement, key: string, timer: MutableRefObject<number | null>, queue: MutableRefObject<Promise<void>>, onSaved: (time: Date) => void, onError?: () => void) {
  const draft = snapshotStoredForm(form);
  const localSaved = writeStoredDraft(browserStorage(), key, draft);
  if (localSaved) onSaved(new Date());
  cancelDraftTimer(timer);
  timer.current = window.setTimeout(() => {
    timer.current = null;
    void enqueueIndexedDraft(key, draft, queue).then(() => { if (!localSaved) onSaved(new Date()); }).catch((reason) => {
      if (localSaved) return;
      if (onError) onError();
      else console.error("NIVASafe assessment draft persistence failed", reason);
    });
  }, 160);
}

function draftValue(draft: DraftRecord | null, key: string, fallback = "") {
  const value = draft?.[key];
  return value === undefined || value === null ? fallback : String(value);
}

function draftNumber(draft: DraftRecord | null, key: string, fallback: number) {
  const value = Number(draft?.[key]);
  return Number.isInteger(value) && value >= 1 && value <= 10 ? value : fallback;
}

function draftBoolean(draft: DraftRecord | null, key: string) {
  const value = draft?.[key];
  return value === true || value === "true" || value === "on";
}

function projectName(project: Project, locale: "fa" | "en") {
  return locale === "en" ? project.nameEn ?? project.name : project.nameFa ?? project.name;
}

function AutoSaveStatus({ lastSaved, hasError }: { lastSaved: Date | null; hasError: boolean }) {
  const { locale, t } = useI18n();
  const timeLocale = locale === "en" ? "en-US" : "fa-IR";
  const label = hasError ? t("assessment.autosaveError") : lastSaved ? `${t("assessment.autosaveActive")} · ${t("assessment.lastSaved", { time: lastSaved.toLocaleTimeString(timeLocale, { hour: "2-digit", minute: "2-digit" }) })}` : t("assessment.autosaveActive");
  return <small className={`autosave-status ${hasError ? "autosave-error" : ""}`} role="status"><Icon name={hasError ? "warning" : "check"} size={14}/>{label}</small>;
}

function FmeaCreationStepper({ currentStep, onStepClick }: { currentStep: FmeaWizardStep; onStepClick?: (step: FmeaWizardStep) => void }) {
  const { t } = useI18n();
  const labels = [t("assessment.processInformation"), t("assessment.review"), t("assessment.reportResults")];
  return <div className="wizard-stepper fmea-creation-stepper" aria-label={t("assessment.stepsLabel", { type: "FMEA" })}>{labels.map((label, index) => { const step = (index + 1) as FmeaWizardStep; const onClick = onStepClick && currentStep !== step ? () => onStepClick(step) : undefined; const clickable = Boolean(onClick); return <button type="button" aria-current={currentStep === step ? "step" : undefined} className={currentStep === step ? "current" : currentStep > step ? "done" : ""} onClick={onClick} disabled={!clickable} key={label}><b>{currentStep > step ? "✓" : step}</b>{label}</button>; })}</div>;
}

function FmeaReportStepper({ onStepClick }: { onStepClick?: (step: FmeaWizardStep) => void }) {
  return <FmeaCreationStepper currentStep={3} onStepClick={onStepClick}/>;
}

function fmeaItemDraftFromRow(item: FmeaItem): FmeaItemDraft {
  return {
    rowNumber: item.rowNumber,
    processStep: item.processStep,
    failureMode: item.failureMode,
    effect: item.effect,
    cause: item.cause,
    preventiveControls: item.preventiveControls ?? "",
    detectionControls: item.detectionControls ?? "",
    severity: item.severity,
    occurrence: item.occurrence,
    detection: item.detection,
    recommendation: item.recommendation ?? "",
  };
}

function parseFmeaRiskRowDrafts(value: unknown): FmeaRiskRowInput[] {
  const parsed = typeof value === "string" ? (() => { try { return JSON.parse(value) as unknown; } catch { return null; } })() : value;
  if (!Array.isArray(parsed)) return [];
  return parsed.slice(0, 20).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Record<string, unknown>;
    const text = (key: keyof Pick<FmeaRiskRowInput, "failureMode" | "effect" | "cause" | "preventiveControls" | "detectionControls" | "recommendation">) => typeof candidate[key] === "string" ? candidate[key].trim().slice(0, 1_200) : "";
    const score = (key: keyof Pick<FmeaRiskRowInput, "severity" | "occurrence" | "detection">) => Number(candidate[key]);
    const row = { failureMode: text("failureMode"), effect: text("effect"), cause: text("cause"), preventiveControls: text("preventiveControls"), detectionControls: text("detectionControls"), severity: score("severity"), occurrence: score("occurrence"), detection: score("detection"), recommendation: text("recommendation") } satisfies FmeaRiskRowInput;
    return row.failureMode && row.effect && row.cause && [row.severity, row.occurrence, row.detection].every((scoreValue) => Number.isInteger(scoreValue) && scoreValue >= 1 && scoreValue <= 10) ? [row] : [];
  });
}

function FmeaScoreField({ kind, value, name = kind, idPrefix = "fmea-score", disabled = false, onChange }: { kind: FmeaScoreKind; value: number; name?: string; idPrefix?: string; disabled?: boolean; onChange: (value: number) => void }) {
  const { locale, t } = useI18n();
  const criteria = scoreCriteriaFor(locale, kind);
  const criterion = criteria.find((item) => item.score === value) ?? criteria[0];
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const id = `${idPrefix}-${kind}`;
  return <label className="risk-score-field" htmlFor={id}><span className="risk-score-label"><span>{t(`assessment.${kind}`)}</span><b>{kind === "severity" ? "S" : kind === "occurrence" ? "O" : "D"}</b></span><StyledSelect id={id} name={name} value={value} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} aria-describedby={`${id}-criterion`} required>{criteria.map((item) => <option key={item.score} value={item.score}>{item.score.toLocaleString(numberLocale)} — {item.label}</option>)}</StyledSelect><small id={`${id}-criterion`}>{criterion.description}</small></label>;
}

type FmeaRiskAiAssistProps = {
  getContext: () => FmeaRiskSuggestionContext;
  autoRequestKey?: string;
  onAccept: (field: FmeaRiskSuggestionField, value: string) => void;
  onAutoAccept?: (field: FmeaRiskSuggestionField, value: string) => boolean | void;
  onAcceptScore?: (suggestion: FmeaRiskScoreSuggestion) => void;
  onAutoAcceptScore?: (suggestion: FmeaRiskScoreSuggestion) => boolean | void;
};

function FmeaRiskAiAssist({ getContext, autoRequestKey, onAccept, onAutoAccept, onAcceptScore, onAutoAcceptScore }: FmeaRiskAiAssistProps) {
  const { locale, t } = useI18n();
  const [suggestions, setSuggestions] = useState<FmeaRiskSuggestions>(emptyFmeaRiskSuggestions);
  const [scoreSuggestion, setScoreSuggestion] = useState<FmeaRiskScoreSuggestion | null>(null);
  const [expandedFields, setExpandedFields] = useState<Record<FmeaRiskSuggestionField, boolean>>(emptyFmeaRiskSuggestionExpansion);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<ProcessSuggestionResponse["aiStatus"] | null>(null);
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const getContextRef = useRef(getContext);
  const onAutoAcceptRef = useRef(onAutoAccept);
  const onAutoAcceptScoreRef = useRef(onAutoAcceptScore);
  getContextRef.current = getContext;
  onAutoAcceptRef.current = onAutoAccept;
  onAutoAcceptScoreRef.current = onAutoAcceptScore;
  const fieldLabels: Record<FmeaRiskSuggestionField, string> = { failureModes: t("assessment.failureMode"), effects: t("assessment.effect"), causes: t("assessment.cause"), preventiveControls: t("assessment.preventiveControls"), detectionControls: t("assessment.detectionControls"), recommendations: t("assessment.recommendation") };

  async function requestSuggestions(automatically = false) {
    const context = getContextRef.current();
    if (context.jobTitle.trim().length < 2 && (context.processStep ?? "").trim().length < 2) {
      setError(t("assessment.riskAiNeedsContext"));
      return;
    }
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError("");
    setStatus(null);
    setSuggestions(emptyFmeaRiskSuggestions());
    setScoreSuggestion(null);
    setExpandedFields(emptyFmeaRiskSuggestionExpansion());
    try {
      const result = await api<ProcessSuggestionResponse>("/fmea/process-suggestions", {
        method: "POST",
        body: JSON.stringify({ ...context, jobTitle: context.jobTitle.trim() || context.processStep?.trim(), locale, mode: "risk-row", jobCatalogId: null }),
      });
      if (currentRequest !== requestId.current) return;
      setStatus(result.data.aiStatus);
      const next = normaliseFmeaRiskSuggestions(result.data.riskSuggestions);
      const nextSuggestions = { ...next };
      const nextScoreSuggestion = result.data.scoreSuggestion ?? null;
      const hasSuggestions = fmeaRiskSuggestionFields.some((field) => next[field].length) || Boolean(nextScoreSuggestion);
      if (automatically && onAutoAcceptRef.current) {
        for (const field of fmeaRiskSuggestionFields) {
          const value = next[field][0];
          if (!value) continue;
          if (onAutoAcceptRef.current(field, value) !== false) nextSuggestions[field] = next[field].slice(1);
        }
      }
      let remainingScoreSuggestion = nextScoreSuggestion;
      if (automatically && nextScoreSuggestion && onAutoAcceptScoreRef.current && onAutoAcceptScoreRef.current(nextScoreSuggestion) !== false) remainingScoreSuggestion = null;
      setSuggestions(nextSuggestions);
      setScoreSuggestion(remainingScoreSuggestion);
      if (!hasSuggestions) setError(t("assessment.noRiskAiSuggestions"));
    } catch {
      if (currentRequest === requestId.current) {
        setStatus("unavailable");
        setError(t("assessment.riskAiUnavailable"));
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }

  function accept(field: FmeaRiskSuggestionField, value: string) {
    onAccept(field, value);
    setSuggestions((current) => ({ ...current, [field]: current[field].filter((item) => item !== value) }));
  }

  const scoreSuggestionFields: Array<{ kind: FmeaScoreKind; letter: string }> = [{ kind: "severity", letter: "S" }, { kind: "occurrence", letter: "O" }, { kind: "detection", letter: "D" }];
  function acceptScoreSuggestion() {
    if (!scoreSuggestion || !onAcceptScore) return;
    onAcceptScore(scoreSuggestion);
    setScoreSuggestion(null);
  }
  useEffect(() => {
    if (!autoRequestKey?.trim()) return undefined;
    const timer = window.setTimeout(() => { void requestSuggestions(true); }, 450);
    return () => {
      window.clearTimeout(timer);
      requestId.current += 1;
      setLoading(false);
    };
  }, [autoRequestKey]);
  return <div className="fmea-risk-ai-assist"><div className="fmea-risk-ai-head"><div><strong>{t("assessment.riskAiTitle")}</strong><small>{t("assessment.riskAiHint")}</small></div><button type="button" className="ghost" onClick={() => void requestSuggestions()} disabled={loading}><Icon name="sparkles" size={15}/>{loading ? t("assessment.riskAiWorking") : t("assessment.getRiskAiSuggestions")}</button></div>{status && !loading && <small className={`ai-status ${status}`}>{t(`assessment.aiStatus.${status}`)}</small>}{error && <small className="field-error" role="status">{error}</small>}{fmeaRiskSuggestionFields.some((field) => suggestions[field].length) && <div className="fmea-risk-ai-grid">{fmeaRiskSuggestionFields.map((field) => { const expanded = expandedFields[field]; const hiddenSuggestionCount = Math.max(0, suggestions[field].length - FMEA_AI_VISIBLE_SUGGESTION_COUNT); const visibleSuggestions = expanded ? suggestions[field] : suggestions[field].slice(0, FMEA_AI_VISIBLE_SUGGESTION_COUNT); return suggestions[field].length ? <div key={field} className="fmea-risk-ai-group"><span>{fieldLabels[field]}</span><div id={`fmea-risk-ai-${field}-suggestions`}>{visibleSuggestions.map((suggestion) => <button key={suggestion} type="button" className="fmea-risk-ai-suggestion" onClick={() => accept(field, suggestion)}><span>{suggestion}</span><small>{t("assessment.useSuggestion")}</small></button>)}{hiddenSuggestionCount > 0 && <button type="button" className="fmea-risk-ai-toggle" aria-expanded={expanded} aria-controls={`fmea-risk-ai-${field}-suggestions`} onClick={() => setExpandedFields((current) => ({ ...current, [field]: !current[field] }))}><span aria-hidden="true">{expanded ? "−" : "+"}</span>{expanded ? t("assessment.hideMoreSuggestions") : `${t("assessment.showMoreSuggestions")} (${hiddenSuggestionCount.toLocaleString(locale === "en" ? "en-US" : "fa-IR")})`}</button>}</div></div> : null; })}</div>}{scoreSuggestion && <div className="fmea-score-ai-suggestion" role="status"><div className="fmea-score-ai-heading"><Icon name="sparkles" size={16}/><div><strong>{t("assessment.scoreAiTitle")}</strong><small>{t("assessment.scoreAiHint")}</small></div></div><div className="fmea-score-ai-values">{scoreSuggestionFields.map(({ kind, letter }) => { const criterion = scoreCriteriaFor(locale, kind).find((item) => item.score === scoreSuggestion[kind]); return <span key={kind}><b>{letter}</b><strong>{scoreSuggestion[kind].toLocaleString(locale === "en" ? "en-US" : "fa-IR")}</strong><small>{criterion?.label}</small></span>; })}</div><p>{scoreSuggestion.rationale}</p><div className="fmea-score-ai-actions"><button type="button" className="primary" onClick={acceptScoreSuggestion} disabled={!onAcceptScore}><Icon name="check" size={14}/>{t("assessment.applyScoreSuggestion")}</button><button type="button" className="ghost" onClick={() => setScoreSuggestion(null)}>{t("assessment.dismissScoreSuggestion")}</button></div></div>}</div>;
}

function FmeaReviewRiskRow({ draft, rows, context, autoEnabled, onChange, onScoreChange, onAdd, onRemove, onAccept, onAutoAccept, onAcceptScore, onAutoAcceptScore }: { draft: FmeaRiskRowInput; rows: FmeaRiskRowInput[]; context: Omit<FmeaRiskSuggestionContext, "failureMode" | "effect" | "cause" | "recommendation">; autoEnabled: boolean; onChange: <K extends keyof FmeaRiskRowInput>(key: K, value: FmeaRiskRowInput[K]) => void; onScoreChange: (kind: FmeaScoreKind, value: number) => void; onAdd: () => void; onRemove: (index: number) => void; onAccept: (field: FmeaRiskSuggestionField, value: string) => void; onAutoAccept: (field: FmeaRiskSuggestionField, value: string) => boolean; onAcceptScore: (suggestion: FmeaRiskScoreSuggestion) => void; onAutoAcceptScore: (suggestion: FmeaRiskScoreSuggestion) => boolean }) {
  const { locale, t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const previewRpn = calculateRpn(draft.severity, draft.occurrence, draft.detection);
  const previewRiskLevel = riskLevel(previewRpn);
  const autoRequestKey = autoEnabled ? [locale, context.jobTitle, context.department ?? "", context.activityDescription ?? "", context.processStep ?? "", rows.length].join("|") : "";
  return <div className="fmea-review-risk-card" aria-labelledby="fmea-review-risk-title">
    <div className="fmea-review-risk-head"><div><h3 id="fmea-review-risk-title">{t("assessment.addRiskRow")}</h3><p>{t("assessment.scoreDescription")}</p></div><span className="optional-label">{t("common.optional")}</span></div>
    <div className="form-grid three">
      <label><span className="field-label-line"><span>{t("assessment.failureMode")}</span><span className="required-label">{t("common.required")}</span></span><input name="reviewFailureMode" value={draft.failureMode} placeholder={t("assessment.failureModePlaceholder")} onChange={(event) => onChange("failureMode", event.target.value)}/></label>
      <label><span className="field-label-line"><span>{t("assessment.effect")}</span><span className="required-label">{t("common.required")}</span></span><input name="reviewEffect" value={draft.effect} placeholder={t("assessment.effectPlaceholder")} onChange={(event) => onChange("effect", event.target.value)}/></label>
      <label><span className="field-label-line"><span>{t("assessment.cause")}</span><span className="required-label">{t("common.required")}</span></span><input name="reviewCause" value={draft.cause} placeholder={t("assessment.causePlaceholder")} onChange={(event) => onChange("cause", event.target.value)}/></label>
      <label><span className="field-label-line"><span>{t("assessment.preventiveControls")}</span><span className="optional-label">{t("common.optional")}</span></span><input name="reviewPreventiveControls" value={draft.preventiveControls} placeholder={t("assessment.existingControls")} onChange={(event) => onChange("preventiveControls", event.target.value)}/></label>
      <label><span className="field-label-line"><span>{t("assessment.detectionControls")}</span><span className="optional-label">{t("common.optional")}</span></span><input name="reviewDetectionControls" value={draft.detectionControls} placeholder={t("assessment.detectionPlaceholder")} onChange={(event) => onChange("detectionControls", event.target.value)}/></label>
      <label className="span-two"><span className="field-label-line"><span>{t("assessment.recommendation")}</span><span className="optional-label">{t("common.optional")}</span></span><textarea name="reviewRecommendation" rows={2} value={draft.recommendation} placeholder={t("assessment.recommendationPlaceholder")} onChange={(event) => onChange("recommendation", event.target.value)}/></label>
    </div>
    <div className="score-panel fmea-review-score-panel"><div className="score-panel-fields"><FmeaScoreField kind="severity" name="reviewSeverity" value={draft.severity} idPrefix="fmea-review-score" onChange={(value) => onScoreChange("severity", value)}/><span aria-hidden="true">×</span><FmeaScoreField kind="occurrence" name="reviewOccurrence" value={draft.occurrence} idPrefix="fmea-review-score" onChange={(value) => onScoreChange("occurrence", value)}/><span aria-hidden="true">×</span><FmeaScoreField kind="detection" name="reviewDetection" value={draft.detection} idPrefix="fmea-review-score" onChange={(value) => onScoreChange("detection", value)}/></div><div className="score-panel-actions"><div className="rpn-preview" aria-live="polite"><div className="rpn-preview-copy"><small>{t("assessment.calculatedRpn")}</small><strong>{previewRpn.toLocaleString(numberLocale)}</strong></div><StatusBadge value={previewRiskLevel}/></div><button className="primary" type="button" onClick={onAdd} disabled={rows.length >= 20}><Icon name="plus"/> {t("assessment.calculateRegister")}</button></div></div>
     <FmeaRiskAiAssist autoRequestKey={autoRequestKey} getContext={() => ({ ...context, failureMode: draft.failureMode, effect: draft.effect, cause: draft.cause, preventiveControls: draft.preventiveControls, detectionControls: draft.detectionControls, recommendation: draft.recommendation })} onAccept={onAccept} onAutoAccept={onAutoAccept} onAcceptScore={onAcceptScore} onAutoAcceptScore={onAutoAcceptScore}/>
    {rows.length > 0 && <div className="fmea-review-risk-list" aria-live="polite"><strong>{rows.length.toLocaleString(numberLocale)} {t("assessment.riskRowCount")}</strong>{rows.map((row, index) => <div className="fmea-review-risk-item" key={`${row.failureMode}-${index}`}><span><b>{row.failureMode}</b><small>{row.effect} · {row.cause}</small></span><button type="button" className="text-button danger-link" onClick={() => onRemove(index)}>{t("common.delete")}</button></div>)}</div>}
    <input type="hidden" name="reviewRiskRows" value={JSON.stringify(rows)}/>
  </div>;
}

function FmeaItemEditor({ item, saving, onCancel, onSave }: { item: FmeaItem; saving: boolean; onCancel: () => void; onSave: (draft: FmeaItemDraft) => Promise<void> }) {
  const { locale, t } = useI18n();
  const [draft, setDraft] = useState<FmeaItemDraft>(() => fmeaItemDraftFromRow(item));
  const editorRpn = [draft.severity, draft.occurrence, draft.detection].every((value) => Number.isInteger(value) && value >= 1 && value <= 10) ? calculateRpn(draft.severity, draft.occurrence, draft.detection) : 0;
  const editorRiskLevel = riskLevel(editorRpn);
  const update = <K extends keyof FmeaItemDraft>(key: K, value: FmeaItemDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const updateText = (key: FmeaRiskSuggestionInputName, value: string) => update(key, value);
  return <form className="risk-item-editor-form" onSubmit={(event) => { event.preventDefault(); void onSave({ ...draft, processStep: draft.processStep.trim(), failureMode: draft.failureMode.trim(), effect: draft.effect.trim(), cause: draft.cause.trim(), preventiveControls: draft.preventiveControls.trim(), detectionControls: draft.detectionControls.trim(), recommendation: draft.recommendation.trim() }); }}>
    <div className="risk-item-editor-head"><div><strong>{t("assessment.editRiskRow")}</strong><small>{t("assessment.editRiskRowDescription")}</small></div><button type="button" className="icon-button" onClick={onCancel} aria-label={t("assessment.cancelEdit")}><span aria-hidden="true">×</span></button></div>
    <div className="form-grid three">
      <label>{t("assessment.rowNumber")} <input type="number" min="1" value={draft.rowNumber} onChange={(event) => update("rowNumber", Number(event.target.value))} required/></label>
      <label>{t("assessment.processStep")} <input value={draft.processStep} onChange={(event) => update("processStep", event.target.value)} required/></label>
      <label>{t("assessment.failureMode")} <input value={draft.failureMode} onChange={(event) => update("failureMode", event.target.value)} required/></label>
      <label>{t("assessment.effect")} <input value={draft.effect} onChange={(event) => update("effect", event.target.value)} required/></label>
      <label>{t("assessment.cause")} <input value={draft.cause} onChange={(event) => update("cause", event.target.value)} required/></label>
      <label>{t("assessment.preventiveControls")} <input value={draft.preventiveControls} onChange={(event) => update("preventiveControls", event.target.value)}/></label>
      <label>{t("assessment.detectionControls")} <input value={draft.detectionControls} onChange={(event) => update("detectionControls", event.target.value)}/></label>
      <label className="span-two">{t("assessment.recommendation")} <textarea rows={2} value={draft.recommendation} onChange={(event) => update("recommendation", event.target.value)}/></label>
    </div>
    <div className="score-panel risk-editor-score-panel">
      <div className="score-panel-fields">
        <FmeaScoreField kind="severity" value={draft.severity} idPrefix={`fmea-edit-${item.id}`} onChange={(value) => update("severity", value)}/>
        <span aria-hidden="true">×</span>
        <FmeaScoreField kind="occurrence" value={draft.occurrence} idPrefix={`fmea-edit-${item.id}`} onChange={(value) => update("occurrence", value)}/>
        <span aria-hidden="true">×</span>
        <FmeaScoreField kind="detection" value={draft.detection} idPrefix={`fmea-edit-${item.id}`} onChange={(value) => update("detection", value)}/>
      </div>
      <div className="score-panel-actions">
        <div className="rpn-preview" aria-live="polite"><div className="rpn-preview-copy"><small>{t("assessment.calculatedRpn")}</small><strong>{editorRpn.toLocaleString(locale === "en" ? "en-US" : "fa-IR")}</strong></div><StatusBadge value={editorRiskLevel}/></div>
        <div className="risk-item-editor-actions"><button type="button" className="ghost" onClick={onCancel}>{t("assessment.cancelEdit")}</button><button type="submit" className="primary" disabled={saving}><Icon name="check"/> {saving ? t("assessment.savingChanges") : t("assessment.saveChanges")}</button></div>
      </div>
    </div>
    <FmeaRiskAiAssist getContext={() => ({ jobTitle: draft.processStep || item.processStep, processStep: draft.processStep, failureMode: draft.failureMode, effect: draft.effect, cause: draft.cause, preventiveControls: draft.preventiveControls, detectionControls: draft.detectionControls, recommendation: draft.recommendation })} onAccept={(field, value) => updateText(fmeaRiskSuggestionInputName[field], value)} onAcceptScore={(suggestion) => { update("severity", suggestion.severity); update("occurrence", suggestion.occurrence); update("detection", suggestion.detection); }}/>
  </form>;
}

function fmeaPayloadFromForm(form: HTMLFormElement) {
  const values = new FormData(form);
  const title = String(values.get("title") ?? "").trim();
  const scope = String(values.get("scope") ?? "").trim() || title || null;
  return { projectId: String(values.get("projectId") ?? ""), activityId: values.get("activityId") ? String(values.get("activityId")) : null, jobCatalogId: values.get("jobCatalogId") ? String(values.get("jobCatalogId")) : null, title, code: String(values.get("code") ?? "").trim() || generatedFmeaCode(), scope, department: values.get("department") ? String(values.get("department")) : null, activityDescription: String(values.get("activityDescription") ?? ""), equipment: formTextList(values, "equipment"), materials: formTextList(values, "materials"), existingControls: formTextList(values, "existingControls"), specialConditions: values.get("specialConditions") ? String(values.get("specialConditions")) : null };
}

function fmeaPayloadFromDraft(value: unknown) {
  const draft = (value && typeof value === "object" ? value : {}) as DraftRecord;
  const list = (key: string) => Array.isArray(draft[key]) ? draft[key]!.filter((item): item is string => typeof item === "string").slice(0, 20) : [];
  const title = String(draft.title ?? "").trim();
  return { projectId: draft.projectId ?? "", activityId: draft.activityId || null, jobCatalogId: draft.jobCatalogId || null, title, code: String(draft.code ?? "").trim() || generatedFmeaCode(), scope: String(draft.scope ?? "").trim() || title || null, department: draft.department || null, activityDescription: draft.activityDescription ?? "", equipment: list("equipment"), materials: list("materials"), existingControls: list("existingControls"), specialConditions: draft.specialConditions || null };
}

function fmeaRiskRowsFromDraft(draft: DraftRecord): FmeaRiskRowInput[] | null {
  const rows = parseFmeaRiskRowDrafts(draft.reviewRiskRows);
  const text = (key: keyof Pick<FmeaRiskRowInput, "failureMode" | "effect" | "cause" | "preventiveControls" | "detectionControls" | "recommendation">) => draftValue(draft, `review${key.charAt(0).toUpperCase()}${key.slice(1)}`).trim().slice(0, 1_200);
  const current: FmeaRiskRowInput = { failureMode: text("failureMode"), effect: text("effect"), cause: text("cause"), preventiveControls: text("preventiveControls"), detectionControls: text("detectionControls"), severity: draftNumber(draft, "reviewSeverity", 1), occurrence: draftNumber(draft, "reviewOccurrence", 1), detection: draftNumber(draft, "reviewDetection", 1), recommendation: text("recommendation") };
  const hasCurrentRow = Object.entries(current).some(([key, value]) => !["severity", "occurrence", "detection"].includes(key) && typeof value === "string" && value.length > 0);
  if (!hasCurrentRow) return rows;
  if (!current.failureMode || !current.effect || !current.cause) return null;
  return rows.length < 20 ? [...rows, current] : rows;
}

function JobCatalogSearch({ value, selectedJob, customSelected, jobs, loading, error, open, onOpenChange, onChange, onSelect, onUseCustom, onClear, inputName = "title", inputId = "fmea-job-search", listId = "fmea-job-catalog-options", label, placeholder, hint, className = "" }: { value: string; selectedJob: JobCatalogEntry | null; customSelected: boolean; jobs: JobCatalogEntry[]; loading: boolean; error: string; open: boolean; onOpenChange: (open: boolean) => void; onChange: (value: string) => void; onSelect: (job: JobCatalogEntry) => void; onUseCustom: () => void; onClear: () => void; inputName?: string; inputId?: string; listId?: string; label?: string; placeholder?: string; hint?: string; className?: string }) {
  const { locale, t } = useI18n();
  const [highlighted, setHighlighted] = useState(0);
  const fieldLabel = label ?? t("assessment.jobActivity");
  const fieldPlaceholder = placeholder ?? t("assessment.jobActivityPlaceholder");
  const fieldHint = hint ?? t("assessment.jobCatalogHint");
  const catalogOptions = filterJobCatalog(jobs, value, locale);
  const customOption = value.trim().length >= 2 && !hasExactJobCatalogTitle(jobs, value, locale);
  const optionCount = catalogOptions.length + (customOption ? 1 : 0);
  useEffect(() => setHighlighted(0), [jobs, value, locale]);
  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) { onOpenChange(true); setHighlighted(0); return; }
      setHighlighted((index) => Math.min(index + 1, Math.max(0, optionCount - 1)));
    }
    if (event.key === "ArrowUp") { event.preventDefault(); setHighlighted((index) => Math.max(index - 1, 0)); }
    if (event.key === "Enter" && open && catalogOptions[highlighted]) { event.preventDefault(); onSelect(catalogOptions[highlighted]); }
    if (event.key === "Enter" && open && customOption && highlighted === catalogOptions.length) { event.preventDefault(); onUseCustom(); }
    if (event.key === "Escape") onOpenChange(false);
  }
  return <div className={`fmea-job-search ${className}`.trim()}>
    <div className="fmea-field-label"><span>{fieldLabel}</span><span className="required-label">{t("common.required")}</span></div>
    <div className="fmea-job-input-area">
      <div className={`fmea-search-control ${selectedJob || customSelected ? "has-selection" : ""}`}>
        <Icon name="search" size={18}/>
        <input id={inputId} name={inputName} required value={value} autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-busy={loading} aria-controls={listId} aria-activedescendant={open && catalogOptions[highlighted] ? `${listId}-${catalogOptions[highlighted].id}` : open && customOption && highlighted === catalogOptions.length ? `${listId}-custom` : undefined} placeholder={fieldPlaceholder} onFocus={() => onOpenChange(true)} onChange={(event) => onChange(event.target.value)} onKeyDown={handleKeyDown}/>
        {value && <button type="button" className="fmea-search-clear" onClick={onClear} aria-label={t("assessment.clearJob")}>×</button>}
      </div>
      {open && <div id={listId} className="fmea-job-options" role="listbox" aria-label={fieldLabel}>
        {loading && <div className="fmea-job-option loading"><span className="spinner"/>{t("assessment.loadingJobs")}</div>}
        {catalogOptions.map((job, index) => <button id={`${listId}-${job.id}`} type="button" role="option" aria-selected={selectedJob?.id === job.id} className={`fmea-job-option ${highlighted === index ? "highlighted" : ""}`} key={job.id} onMouseDown={(event) => event.preventDefault()} onClick={() => onSelect(job)}><span><strong>{localizedJobTitle(job, locale)}</strong><small>{localizedJobDepartment(job, locale) || t("assessment.catalogJob")}</small></span><Icon name="arrow" size={16}/></button>)}
        {customOption && <button id={`${listId}-custom`} type="button" role="option" aria-selected={customSelected} className={`fmea-job-option custom ${highlighted === catalogOptions.length ? "highlighted" : ""}`} onMouseDown={(event) => event.preventDefault()} onClick={onUseCustom}><span><strong>{t("assessment.addNewJob")}</strong><small>{t("assessment.addNewJobHint")}</small></span><Icon name="plus" size={16}/></button>}
        {!loading && !catalogOptions.length && <div className="fmea-job-option empty">{value.trim().length >= 2 ? t("assessment.noMatchingJobs") : t("assessment.typeToSearchJobs")}</div>}
      </div>}
    </div>
    {selectedJob && <small className="fmea-selected-job"><Icon name="check" size={14}/>{t("assessment.selectedFromCatalog")}: {localizedJobTitle(selectedJob, locale)}</small>}
    {customSelected && !selectedJob && <small className="fmea-selected-job custom"><Icon name="check" size={14}/>{t("assessment.customJobSelected")}: {value.trim()}</small>}
    {error && <small className="field-error" role="status">{error}</small>}
    <small className="field-hint">{fieldHint}</small>
  </div>;
}

function ProcessSuggestionPicker({ category, suggestions, selected, newValue, onToggle, onNewValueChange, onAdd }: { category: ProcessSuggestionCategory; suggestions: string[]; selected: string[]; newValue: string; onToggle: (item: string) => void; onNewValueChange: (value: string) => void; onAdd: () => void }) {
  const { locale, t } = useI18n();
  const config: Record<ProcessSuggestionCategory, { title: string; description: string; icon: "fmea" | "folder" | "shield" }> = { equipment: { title: t("assessment.equipment"), description: t("assessment.equipmentHint"), icon: "fmea" }, materials: { title: t("assessment.materials"), description: t("assessment.materialsHint"), icon: "folder" }, controls: { title: t("assessment.existingControls"), description: t("assessment.controlsHint"), icon: "shield" } };
  const item = config[category];
  return <div className="fmea-suggestion-picker">
    <div className="fmea-suggestion-heading"><span className="fmea-suggestion-icon"><Icon name={item.icon} size={19}/></span><span><strong>{item.title}</strong><small>{item.description}</small><small className="fmea-suggestion-limit" aria-live="polite">{t("assessment.suggestionSelectionLimit", { selected: selected.length.toLocaleString(locale === "en" ? "en-US" : "fa-IR"), max: FMEA_PROCESS_SELECTION_MAX.toLocaleString(locale === "en" ? "en-US" : "fa-IR") })}</small></span></div>
    <div className="fmea-suggestion-list" aria-label={item.title}>
      {suggestions.length ? suggestions.map((suggestion) => { const isSelected = selected.includes(suggestion); const selectionLocked = !isSelected && selected.length >= FMEA_PROCESS_SELECTION_MAX; return <button type="button" className={`fmea-suggestion-chip ${isSelected ? "selected" : ""}`} aria-pressed={isSelected} disabled={selectionLocked} title={selectionLocked ? t("assessment.suggestionSelectionReached") : undefined} key={suggestion} onClick={() => onToggle(suggestion)}><span>{suggestion}</span><small>{isSelected ? "✓" : t("assessment.suggestion")}</small></button>; }) : <small className="fmea-no-suggestion">{t("assessment.noSuggestions")}</small>}
    </div>
    <div className="fmea-add-item"><input value={newValue} maxLength={160} placeholder={t("assessment.addItemPlaceholder")} aria-label={`${t("assessment.addNewItem")}: ${item.title}`} disabled={selected.length >= FMEA_PROCESS_SELECTION_MAX} onChange={(event) => onNewValueChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); onAdd(); } }}/><button type="button" className="ghost" onClick={onAdd} disabled={selected.length >= FMEA_PROCESS_SELECTION_MAX}><Icon name="plus" size={15}/>{t("assessment.addNewItem")}</button></div>
    {selected.length > 0 && <div className="fmea-selected-items">{selected.map((value) => <span key={value}>{value}<button type="button" onClick={() => onToggle(value)} aria-label={`${t("assessment.removeItem")}: ${value}`}>×</button></span>)}</div>}
  </div>;
}

function FmeaProcessPage() {
  const { locale, t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const [searchParams] = useSearchParams();
  const editingAssessmentId = searchParams.get("edit");
  const registeredAssessmentsView = searchParams.get("view") === "registered";
  const requestedProjectId = searchParams.get("project")?.trim() ?? "";
  const requestedWizardStep: FmeaWizardStep = searchParams.get("step") === "3" ? 3 : searchParams.get("step") === "2" ? 2 : 1;
  const editingExistingAssessment = Boolean(editingAssessmentId);
  const draftKey = draftKeyFor("fmea");
  const state = useLoad<Fmea[]>("/fmea");
  const projects = useLoad<Project[]>("/projects");
  const [selected, setSelected] = useState(editingAssessmentId ?? "");
  const [draftNotice, setDraftNotice] = useState("");
  const [draftSyncAvailable, setDraftSyncAvailable] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<VersionRow[]>([]);
  const [historyAssessment, setHistoryAssessment] = useState("");
  const [scores, setScores] = useState({ severity: 1, occurrence: 1, detection: 1 });
  const [reviewRiskDraft, setReviewRiskDraft] = useState<FmeaRiskRowInput>(emptyFmeaRiskRowInput);
  const [reviewRiskRows, setReviewRiskRows] = useState<FmeaRiskRowInput[]>([]);
  const [wizardStep, setWizardStep] = useState<FmeaWizardStep>(() => editingAssessmentId ? requestedWizardStep : readFmeaWizardStep(draftKey));
  const [creating, setCreating] = useState(false);
  const [draft, setDraftState] = useState<DraftRecord | null>(() => editingExistingAssessment ? null : readLocalDraft(draftKey));
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autosaveError, setAutosaveError] = useState(false);
  const [fmeaAssistantEnabled, setFmeaAssistantEnabled] = useState(readFmeaAssistantPreference);
  const [assessmentCode, setAssessmentCode] = useState(() => draftValue(readLocalDraft(draftKey), "code").trim() || generatedFmeaCode());
  const [selectedProjectId, setSelectedProjectId] = useState(() => draftValue(readLocalDraft(draftKey), "projectId"));
  const [jobQuery, setJobQuery] = useState(() => draftValue(readLocalDraft(draftKey), "title"));
  const [selectedJobId, setSelectedJobId] = useState(() => draftValue(readLocalDraft(draftKey), "jobCatalogId"));
  const [selectedJob, setSelectedJob] = useState<JobCatalogEntry | null>(null);
  const [customJobSelected, setCustomJobSelected] = useState(() => draftBoolean(readLocalDraft(draftKey), "customJobSelected"));
  const [department, setDepartment] = useState(() => draftValue(readLocalDraft(draftKey), "department"));
  const [activityDescription, setActivityDescription] = useState(() => draftValue(readLocalDraft(draftKey), "activityDescription"));
  const [processImages, setProcessImages] = useState<File[]>([]);
  const [processImagePreviews, setProcessImagePreviews] = useState<string[]>([]);
  const [processImageError, setProcessImageError] = useState("");
  const [processImageAnalysis, setProcessImageAnalysis] = useState<FmeaProcessImageAnalysis | null>(null);
  const [processImageAnalysisLoading, setProcessImageAnalysisLoading] = useState(false);
  const [processImageAnalysisError, setProcessImageAnalysisError] = useState("");
  const [descriptionLoading, setDescriptionLoading] = useState(false);
  const [descriptionAiStatus, setDescriptionAiStatus] = useState<ProcessSuggestionResponse["aiStatus"] | null>(null);
  const [descriptionAiError, setDescriptionAiError] = useState("");
  const [descriptionSuggestion, setDescriptionSuggestion] = useState("");
  const [specialConditions, setSpecialConditions] = useState(() => draftValue(readLocalDraft(draftKey), "specialConditions"));
  const [selectedItems, setSelectedItems] = useState<ProcessSuggestions>(() => ({
    equipment: [],
    materials: [],
    controls: [],
  }));
  const [newItemInputs, setNewItemInputs] = useState<ProcessSuggestionInputs>(emptyProcessSuggestionInputs);
  const [jobCatalog, setJobCatalog] = useState<JobCatalogEntry[]>([]);
  const [jobCatalogLoaded, setJobCatalogLoaded] = useState(false);
  const [jobCatalogOrganizationId, setJobCatalogOrganizationId] = useState("");
  const [jobLoading, setJobLoading] = useState(false);
  const [jobSearchError, setJobSearchError] = useState("");
  const [jobSearchOpen, setJobSearchOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<ProcessSuggestions>(emptyProcessSuggestions);
  const [aiSuggestions, setAiSuggestions] = useState<ProcessSuggestions>(emptyProcessSuggestions);
  const [aiStatus, setAiStatus] = useState<ProcessSuggestionResponse["aiStatus"] | null>(null);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionError, setSuggestionError] = useState("");
  const [processAiSuggestionsRequested, setProcessAiSuggestionsRequested] = useState(false);
  const [autofillLoading, setAutofillLoading] = useState(false);
  const [autofillStatus, setAutofillStatus] = useState<ProcessSuggestionResponse["aiStatus"] | null>(null);
  const [autofillError, setAutofillError] = useState("");
  const [riskSearch, setRiskSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [riskSort, setRiskSort] = useState<RiskSortField>("rowNumber");
  const [riskSortDirection, setRiskSortDirection] = useState<"asc" | "desc">("asc");
  const [riskPage, setRiskPage] = useState(1);
  const [editingItem, setEditingItem] = useState<FmeaItem | null>(null);
  const [viewingItem, setViewingItem] = useState<FmeaItem | null>(null);
  const [itemSaving, setItemSaving] = useState(false);
  const [itemCreating, setItemCreating] = useState(false);
  const dialog = useDialog();
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const processImageInputRef = useRef<HTMLInputElement>(null);
  const fmeaReviewStepRef = useRef<HTMLFieldSetElement>(null);
  const fmeaReportStepRef = useRef<HTMLFieldSetElement>(null);
  const saveTimer = useRef<number | null>(null);
  const draftWriteQueue = useRef<Promise<void>>(Promise.resolve());
  const jobRequestId = useRef(0);
  const assistantRequestId = useRef(0);
  const descriptionRequestId = useRef(0);
  const autofillRequestId = useRef(0);
  const processImageAnalysisRequestId = useRef(0);
  const processImageAnalysisContextKey = useRef("");
  const processImageGeneratedRiskKeys = useRef<Set<string>>(new Set());
  const autofillContextKey = useRef("");
  const autofilledFields = useRef<Set<FmeaAutofillField>>(new Set());
  const scoreTouchedRef = useRef(false);
  const reviewScoreTouchedRef = useRef(false);
  const creatingRef = useRef(false);
  const { session, orgId } = getSession();
  const itemDraftKey = scopedDraftKey(`fmea-item:${selected || "new"}`, session?.user.id, orgId);
  const selectedAssessment = state.data?.find((item) => item.id === (editingAssessmentId ?? selected));
  const editingAssessment = editingAssessmentId ? selectedAssessment : undefined;
  const selectedProject = projects.data?.find((project) => project.id === selectedProjectId);
  const storedFmeaScope = (editingAssessment?.scope ?? draftValue(draft, "scope")).trim();
  const assessmentScope = storedFmeaScope || automaticFmeaScope(selectedProject ? projectName(selectedProject, locale) : "", jobQuery) || jobQuery.trim() || null;
  const previewRpn = calculateRpn(scores.severity, scores.occurrence, scores.detection);
  const previewRiskLevel = riskLevel(previewRpn);
  const filteredRiskRows = useMemo(() => {
    const query = riskSearch.trim().toLocaleLowerCase(locale === "fa" ? "fa-IR" : "en-US");
    const rows = (selectedAssessment?.items ?? []).filter((row) => {
      if (riskFilter !== "ALL" && row.riskLevel !== riskFilter) return false;
      if (!query) return true;
      return [String(row.rowNumber), row.processStep, row.failureMode, row.effect, row.cause, row.preventiveControls, row.detectionControls, String(row.severity), String(row.occurrence), String(row.detection), String(row.rpn), row.recommendation, row.riskLevel]
        .filter((value): value is string => typeof value === "string")
        .some((value) => value.toLocaleLowerCase(locale === "fa" ? "fa-IR" : "en-US").includes(query));
    });
      return [...rows].sort((left, right) => {
      const leftValue = left[riskSort];
      const rightValue = right[riskSort];
      const comparison = Number(leftValue) - Number(rightValue);
      return (comparison || left.rowNumber - right.rowNumber) * (riskSortDirection === "asc" ? 1 : -1);
    });
  }, [locale, riskFilter, riskSearch, riskSort, riskSortDirection, selectedAssessment]);
  const riskPageCount = Math.max(1, Math.ceil(filteredRiskRows.length / FMEA_RISK_PAGE_SIZE));
  const paginatedRiskRows = useMemo(() => filteredRiskRows.slice((riskPage - 1) * FMEA_RISK_PAGE_SIZE, riskPage * FMEA_RISK_PAGE_SIZE), [filteredRiskRows, riskPage]);
  const draftList = (key: string) => {
    const value = draft?.[key];
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 20) : [];
  };

  useEffect(() => {
    try {
      sessionStorage.setItem(assessmentWizardStepKey(draftKey), String(wizardStep));
    } catch { /* storage may be unavailable */ }
  }, [draftKey, wizardStep]);

  useEffect(() => {
    if (!editingAssessmentId || !state.data) return;
    const assessment = state.data.find((item) => item.id === editingAssessmentId);
    if (!assessment) return;
    setSelected(editingAssessmentId);
    setWizardStep(requestedWizardStep);
    setSelectedProjectId(assessment.project.id);
    setAssessmentCode(assessment.code?.trim() || generatedFmeaCode());
    setJobQuery(assessment.jobCatalog ? localizedJobTitle(assessment.jobCatalog, locale) : assessment.title);
    setSelectedJobId(assessment.jobCatalog?.id ?? "");
    setSelectedJob(assessment.jobCatalog ?? null);
    setCustomJobSelected(!assessment.jobCatalog);
    setDepartment(assessment.department ?? "");
    setActivityDescription(assessment.activityDescription ?? "");
    setSpecialConditions(assessment.specialConditions ?? "");
    setSelectedItems({ equipment: assessment.equipment ?? [], materials: assessment.materials ?? [], controls: assessment.existingControls ?? [] });
    setReviewRiskRows([]);
    setReviewRiskDraft(emptyFmeaRiskRowInput());
    reviewScoreTouchedRef.current = false;
    setDraftState(null);
    setDraftNotice("");
    setDraftSyncAvailable(false);
    autofilledFields.current.clear();
    autofillContextKey.current = "";
  }, [editingAssessmentId, locale, requestedWizardStep, state.data]);

  useEffect(() => {
    if (editingExistingAssessment || !requestedProjectId || !projects.data) return;
    const project = projects.data.find((candidate) => candidate.id === requestedProjectId);
    if (!project) return;
    setSelectedProjectId(project.id);
    setAutofillError("");
    autofillContextKey.current = "";
    window.setTimeout(() => {
      const form = formRef.current;
      const nextDraft = form ? snapshotStoredForm(form) : (readStoredDraft(browserStorage(), draftKey) ?? {});
      nextDraft.projectId = project.id;
      writeStoredDraft(browserStorage(), draftKey, nextDraft);
    }, 0);
    navigate("/fmea", { replace: true });
  }, [draftKey, editingExistingAssessment, navigate, projects.data, requestedProjectId]);

  useEffect(() => {
    if (editingExistingAssessment) return;
    const savedCode = draftValue(draft, "code").trim();
    if (savedCode) setAssessmentCode(savedCode);
  }, [draft, editingExistingAssessment]);

  useEffect(() => {
    try { localStorage.setItem(FMEA_ASSISTANT_STORAGE_KEY, String(fmeaAssistantEnabled)); } catch { /* storage may be unavailable */ }
    autofillRequestId.current += 1;
    setAutofillLoading(false);
    setAutofillError("");
    autofillContextKey.current = "";
  }, [fmeaAssistantEnabled]);

  useEffect(() => {
    if (editingExistingAssessment) return;
    let active = true;
    const localDraft = readLocalDraft(draftKey);
    if (localDraft) {
      setDraftState(localDraft);
      setDraftNotice(t("assessment.draftAvailable", { type: "FMEA" }));
      setDraftSyncAvailable(true);
    }
    void getDraft<DraftRecord>(draftKey).then((value) => {
      if (active && !localDraft && value && typeof value === "object" && !Array.isArray(value)) {
        setDraftState(value);
        setDraftNotice(t("assessment.draftAvailable", { type: "FMEA" }));
        setDraftSyncAvailable(true);
      }
    }).catch(() => {
      if (active && !localDraft) setAutosaveError(true);
    });
    return () => { active = false; cancelDraftTimer(saveTimer); };
  }, [draftKey, editingExistingAssessment, locale]);

  useEffect(() => {
    if (!draft || editingExistingAssessment) return;
    setJobQuery(draftValue(draft, "title"));
    if (!requestedProjectId) setSelectedProjectId(draftValue(draft, "projectId"));
    setSelectedJobId(draftValue(draft, "jobCatalogId"));
    setCustomJobSelected(draftBoolean(draft, "customJobSelected"));
    setDepartment(draftValue(draft, "department"));
    setActivityDescription(draftValue(draft, "activityDescription"));
    setSpecialConditions(draftValue(draft, "specialConditions"));
    setSelectedItems({ equipment: draftList("equipment"), materials: draftList("materials"), controls: draftList("existingControls") });
    setReviewRiskRows(parseFmeaRiskRowDrafts(draft.reviewRiskRows));
    const restoredReviewScores = { severity: draftNumber(draft, "reviewSeverity", 1), occurrence: draftNumber(draft, "reviewOccurrence", 1), detection: draftNumber(draft, "reviewDetection", 1) };
    reviewScoreTouchedRef.current = Object.values(restoredReviewScores).some((score) => score !== 1);
    setReviewRiskDraft({
      failureMode: draftValue(draft, "reviewFailureMode"),
      effect: draftValue(draft, "reviewEffect"),
      cause: draftValue(draft, "reviewCause"),
      preventiveControls: draftValue(draft, "reviewPreventiveControls"),
      detectionControls: draftValue(draft, "reviewDetectionControls"),
      ...restoredReviewScores,
      recommendation: draftValue(draft, "reviewRecommendation"),
    });
  }, [draft, editingExistingAssessment, requestedProjectId]);

  useEffect(() => {
    const objectUrls = processImages.map((file) => URL.createObjectURL(file));
    setProcessImagePreviews(objectUrls);
    return () => objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
  }, [processImages]);

  useEffect(() => {
    if (!processImages.length || processImageAnalysis || processImageAnalysisLoading) return;
    const imageKey = processImages.map((file) => `${file.name}:${file.size}:${file.lastModified}`).join("|");
    const contextKey = `${imageKey}\u0000${jobQuery.trim()}`;
    if (processImageAnalysisContextKey.current === contextKey) return;
    if (jobQuery.trim().length < 2) {
      setProcessImageAnalysisError(t("assessment.fmeaProcessImageNeedsJob"));
      return;
    }
    processImageAnalysisContextKey.current = contextKey;
    void requestFmeaProcessImageAnalysis(processImages);
  }, [jobQuery, processImages]);

  useEffect(() => {
    setRiskPage(1);
  }, [selected, riskFilter, riskSearch, riskSort, riskSortDirection]);

  useEffect(() => {
    setRiskPage((page) => Math.min(page, riskPageCount));
  }, [riskPageCount]);

  useEffect(() => {
    scoreTouchedRef.current = false;
    setScores({ severity: 1, occurrence: 1, detection: 1 });
    const frame = window.requestAnimationFrame(() => {
      const form = document.getElementById("fmea-risk-row-form");
      if (!(form instanceof HTMLFormElement)) return;
      const value = (name: string) => Number(new FormData(form).get(name));
      const restored = { severity: value("severity"), occurrence: value("occurrence"), detection: value("detection") };
      if (Object.values(restored).every((score) => Number.isInteger(score) && score >= 1 && score <= 10)) {
        scoreTouchedRef.current = Object.values(restored).some((score) => score !== 1);
        setScores(restored);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [itemDraftKey]);

  useEffect(() => {
    if (jobCatalogOrganizationId === orgId) return;
    jobRequestId.current += 1;
    setJobCatalogOrganizationId(orgId);
    setJobCatalog([]);
    setJobCatalogLoaded(false);
    setJobSearchError("");
  }, [jobCatalogOrganizationId, orgId]);

  useEffect(() => {
    if (!jobSearchOpen || !orgId || jobCatalogOrganizationId !== orgId || jobCatalogLoaded) return;
    const requestId = ++jobRequestId.current;
    setJobLoading(true);
    setJobSearchError("");
    void api<JobCatalogEntry[]>(`/fmea/job-catalog?limit=${FMEA_JOB_CATALOG_LIMIT}`).then((result) => {
      if (requestId !== jobRequestId.current) return;
      setJobCatalog(result.data);
      setJobCatalogLoaded(true);
    }).catch(() => {
      if (requestId === jobRequestId.current) setJobSearchError(t("assessment.jobSearchUnavailable"));
    }).finally(() => {
      if (requestId === jobRequestId.current) setJobLoading(false);
    });
  }, [jobCatalogLoaded, jobCatalogOrganizationId, jobSearchOpen, orgId]);

  useEffect(() => {
    if (editingExistingAssessment || !fmeaAssistantEnabled) return;
    const projectId = selectedProjectId.trim();
    const title = jobQuery.trim();
    if (!projectId || projectId === FMEA_CREATE_PROJECT_OPTION || title.length < 2) return;
    const timer = window.setTimeout(() => { void requestFmeaAutofill(); }, 850);
    return () => window.clearTimeout(timer);
  }, [editingExistingAssessment, fmeaAssistantEnabled, jobQuery, selectedJobId, selectedProjectId]);

  useEffect(() => {
    if (!selectedJobId || selectedJob || !jobCatalog.length) return;
    const restoredJob = jobCatalog.find((job) => job.id === selectedJobId);
    if (restoredJob) {
      setSelectedJob(restoredJob);
      setSuggestions(normaliseProcessBoardSuggestions({ equipment: restoredJob.equipment, materials: restoredJob.materials, controls: restoredJob.controls }));
    }
  }, [jobCatalog, selectedJob, selectedJobId]);

  useEffect(() => {
    if (!selectedJob) return;
    setJobQuery(localizedJobTitle(selectedJob, locale));
  }, [locale, selectedJob]);

  useEffect(() => {
    if (!jobSearchOpen) return;
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!formRef.current?.querySelector(".fmea-job-search")?.contains(target)) setJobSearchOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [jobSearchOpen]);

  function queueCurrentDraft() {
    window.setTimeout(() => {
      if (formRef.current) queueDraft(formRef.current, draftKey, saveTimer, draftWriteQueue, (time) => { setAutosaveError(false); setLastSaved(time); }, () => setAutosaveError(true));
    }, 0);
  }

  function openProjectCreator() {
    const form = formRef.current;
    const nextDraft = form ? snapshotStoredForm(form) : (readStoredDraft(browserStorage(), draftKey) ?? {});
    nextDraft.projectId = selectedProjectId === FMEA_CREATE_PROJECT_OPTION ? "" : selectedProjectId;
    writeStoredDraft(browserStorage(), draftKey, nextDraft);
    navigate("/projects?from=fmea");
  }

  function openRegisteredAssessments() {
    if (!editingExistingAssessment) queueCurrentDraft();
    setSelected("");
    setHistoryAssessment("");
    navigate("/fmea?view=registered");
  }

  function resetProcessForm() {
    cancelAssistantRequests();
    setAssessmentCode(generatedFmeaCode());
    setSelectedProjectId("");
    setJobQuery("");
    setSelectedJobId("");
    setSelectedJob(null);
    setCustomJobSelected(false);
    setDepartment("");
    setActivityDescription("");
    processImageAnalysisRequestId.current += 1;
    processImageGeneratedRiskKeys.current.clear();
    setProcessImages([]);
    setProcessImagePreviews([]);
    setProcessImageError("");
    setProcessImageAnalysis(null);
    setProcessImageAnalysisError("");
    if (processImageInputRef.current) processImageInputRef.current.value = "";
    setDescriptionAiStatus(null);
    setDescriptionAiError("");
    setDescriptionSuggestion("");
    setSpecialConditions("");
    setSelectedItems(emptyProcessSuggestions());
    setProcessImageAnalysis(null);
    setProcessImageAnalysisError("");
    setNewItemInputs(emptyProcessSuggestionInputs());
    setSuggestions(emptyProcessSuggestions());
    setAiSuggestions(emptyProcessSuggestions());
    setAiStatus(null);
    setSuggestionError("");
    setProcessAiSuggestionsRequested(false);
    setAutofillStatus(null);
    setAutofillError("");
    setJobSearchError("");
    setReviewRiskRows([]);
    setReviewRiskDraft(emptyFmeaRiskRowInput());
    scoreTouchedRef.current = false;
    reviewScoreTouchedRef.current = false;
    autofilledFields.current.clear();
    autofillContextKey.current = "";
  }

  function cancelAssistantRequests() {
    assistantRequestId.current += 1;
    descriptionRequestId.current += 1;
    autofillRequestId.current += 1;
    processImageAnalysisRequestId.current += 1;
    setSuggestionLoading(false);
    setDescriptionLoading(false);
    setDescriptionSuggestion("");
    setAutofillLoading(false);
    setProcessImageAnalysisLoading(false);
    clearFmeaImageRiskRows();
  }

  function clearJobSelection() {
    cancelAssistantRequests();
    autofillContextKey.current = "";
    setJobQuery("");
    setSelectedJobId("");
    setSelectedJob(null);
    setCustomJobSelected(false);
    setSelectedItems(emptyProcessSuggestions());
    setProcessImageAnalysis(null);
    setProcessImageAnalysisError("");
    setNewItemInputs(emptyProcessSuggestionInputs());
    setSuggestions(emptyProcessSuggestions());
    setAiSuggestions(emptyProcessSuggestions());
    setAiStatus(null);
    setSuggestionError("");
    setProcessAiSuggestionsRequested(false);
    setAutofillStatus(null);
    setAutofillError("");
    setDescriptionAiStatus(null);
    setDescriptionAiError("");
    setDescriptionSuggestion("");
    setJobSearchOpen(true);
    setJobSearchError("");
    setError("");
    queueCurrentDraft();
  }

  function selectJob(job: JobCatalogEntry) {
    cancelAssistantRequests();
    autofillContextKey.current = "";
    autofilledFields.current.clear();
    const title = localizedJobTitle(job, locale);
    setSelectedJob(job);
    setSelectedJobId(job.id);
    setCustomJobSelected(false);
    setJobQuery(title);
    setDepartment(localizedJobDepartment(job, locale));
    setSuggestions(normaliseProcessBoardSuggestions({ equipment: job.equipment, materials: job.materials, controls: job.controls }));
    setSelectedItems(emptyProcessSuggestions());
    setProcessImageAnalysis(null);
    setProcessImageAnalysisError("");
    setNewItemInputs(emptyProcessSuggestionInputs());
    setAiSuggestions(emptyProcessSuggestions());
    setAiStatus(null);
    setSuggestionError("");
    setProcessAiSuggestionsRequested(false);
    setDescriptionAiStatus(null);
    setDescriptionAiError("");
    setDescriptionSuggestion("");
    setJobSearchOpen(false);
    setJobSearchError("");
    setError("");
    queueCurrentDraft();
  }

  async function useCustomJobTitle(titleOverride?: string) {
    const title = (titleOverride ?? jobQuery).trim();
    if (title.length < 2) {
      setError(t("assessment.jobActivityRequired"));
      return;
    }
    cancelAssistantRequests();
    autofillContextKey.current = "";
    autofilledFields.current.clear();
    setSelectedJob(null);
    setSelectedJobId("");
    setJobQuery(title);
    setSuggestions(emptyProcessSuggestions());
    setAiSuggestions(emptyProcessSuggestions());
    setAiStatus(null);
    setSuggestionError("");
    setProcessAiSuggestionsRequested(false);
    setDescriptionAiStatus(null);
    setDescriptionAiError("");
    setDescriptionSuggestion("");
    setJobSearchOpen(false);
    setJobSearchError("");
    setError("");
    setJobLoading(true);
    try {
      const result = await api<JobCatalogEntry>("/fmea/job-catalog", {
        method: "POST",
        body: JSON.stringify({ title, locale, department: department.trim() || null }),
      });
      setJobCatalog((current) => [result.data, ...current.filter((job) => job.id !== result.data.id)]);
      setJobCatalogLoaded(true);
      selectJob(result.data);
      queueCurrentDraft();
    } catch {
      setCustomJobSelected(true);
      setJobSearchError(t("assessment.jobCatalogSaveFailed"));
      queueCurrentDraft();
    } finally {
      setJobLoading(false);
    }
  }

  function changeJobQuery(value: string) {
    if (value.trim() !== jobQuery.trim()) {
      autofillContextKey.current = "";
      setProcessAiSuggestionsRequested(false);
    }
    setJobQuery(value);
    setDescriptionSuggestion("");
    if (selectedJob && value.trim() !== localizedJobTitle(selectedJob, locale)) {
      cancelAssistantRequests();
      setSelectedJob(null);
      setSelectedJobId("");
      setCustomJobSelected(false);
      setSuggestions(emptyProcessSuggestions());
      setAiSuggestions(emptyProcessSuggestions());
      setAiStatus(null);
      setSuggestionError("");
      setProcessAiSuggestionsRequested(false);
      setSelectedItems(emptyProcessSuggestions());
    }
    if (customJobSelected && value.trim() !== jobQuery.trim()) {
      cancelAssistantRequests();
      setCustomJobSelected(false);
      setSuggestions(emptyProcessSuggestions());
      setAiSuggestions(emptyProcessSuggestions());
      setAiStatus(null);
      setSuggestionError("");
      setProcessAiSuggestionsRequested(false);
      setSelectedItems(emptyProcessSuggestions());
    }
    setAutofillError("");
    setJobSearchError("");
    setJobSearchOpen(true);
  }

  function fmeaImageRiskRowKey(row: FmeaRiskRowInput) {
    return [row.failureMode, row.effect, row.cause, row.preventiveControls, row.detectionControls, row.recommendation]
      .map((value) => value.trim().replace(/\s+/gu, " ").toLocaleLowerCase("fa-IR"))
      .join("\u0000");
  }

  function clearFmeaImageRiskRows() {
    const generatedKeys = processImageGeneratedRiskKeys.current;
    if (generatedKeys.size) setReviewRiskRows((current) => current.filter((row) => !generatedKeys.has(fmeaImageRiskRowKey(row))));
    generatedKeys.clear();
    processImageAnalysisRequestId.current += 1;
    processImageAnalysisContextKey.current = "";
    setProcessImageAnalysisLoading(false);
    setProcessImageAnalysis(null);
    setProcessImageAnalysisError("");
  }

  function handleFmeaProcessImageChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (!selectedFiles.length) return;
    const nextFiles = [...processImages];
    const existingKeys = new Set(nextFiles.map((file) => `${file.name}:${file.size}:${file.lastModified}`));
    let validationError = "";
    for (const file of selectedFiles) {
      if (!FMEA_PROCESS_IMAGE_TYPES.has(file.type)) {
        validationError ||= t("assessment.fmeaProcessImageInvalidType");
        continue;
      }
      if (file.size > FMEA_PROCESS_IMAGE_MAX_BYTES) {
        validationError ||= t("assessment.fmeaProcessImageTooLarge");
        continue;
      }
      const key = `${file.name}:${file.size}:${file.lastModified}`;
      if (existingKeys.has(key)) continue;
      if (nextFiles.length >= FMEA_PROCESS_IMAGE_MAX_COUNT) {
        validationError ||= t("assessment.fmeaProcessImageTooMany");
        continue;
      }
      nextFiles.push(file);
      existingKeys.add(key);
    }
    event.target.value = "";
    if (!nextFiles.length) {
      clearFmeaImageRiskRows();
      setProcessImages([]);
      setProcessImagePreviews([]);
    } else if (nextFiles.length !== processImages.length) {
      clearFmeaImageRiskRows();
      setProcessImages(nextFiles);
    }
    setProcessImageError(validationError);
  }

  function removeFmeaProcessImage(index?: number) {
    const nextFiles = typeof index === "number" ? processImages.filter((_, fileIndex) => fileIndex !== index) : [];
    clearFmeaImageRiskRows();
    setProcessImages(nextFiles);
    setProcessImagePreviews([]);
    setProcessImageError("");
    if (processImageInputRef.current) processImageInputRef.current.value = "";
  }

  async function requestFmeaProcessImageAnalysis(files = processImages) {
    if (!files.length) return;
    const title = jobQuery.trim();
    if (title.length < 2) return;
    const requestId = ++processImageAnalysisRequestId.current;
    setProcessImageAnalysisLoading(true);
    setProcessImageAnalysisError("");
    setError("");
    const analyses: FmeaProcessImageAnalysis[] = [];
    let failedCount = 0;
    try {
      for (const file of files) {
        if (requestId !== processImageAnalysisRequestId.current) return;
        const body = new FormData();
        body.append("jobTitle", title);
        body.append("department", department.trim());
        body.append("activityDescription", activityDescription.trim());
        body.append("locale", locale);
        body.append("file", file);
        try {
          const result = await api<FmeaProcessImageAnalysis>("/fmea/process-image-analysis", { method: "POST", body });
          analyses.push(result.data);
        } catch {
          failedCount += 1;
        }
      }
      if (requestId !== processImageAnalysisRequestId.current) return;
      const riskRows = Array.from(new Map(analyses.flatMap((analysis) => analysis.riskRows).map((row) => [fmeaImageRiskRowKey(row), row])).values()).slice(0, 20);
      const summary = analyses.map((analysis) => analysis.summary.trim()).filter(Boolean).join("\n");
      if (!analyses.length) {
        setProcessImageAnalysisError(t("assessment.fmeaProcessImageUnavailable"));
        return;
      }
      const merged: FmeaProcessImageAnalysis = {
        summary,
        riskRows,
        provider: analyses[analyses.length - 1]?.provider ?? "",
        aiStatus: analyses.some((analysis) => analysis.aiStatus === "fallback") ? "fallback" : "connected",
      };
      const generatedKeys = new Set(riskRows.map((row) => fmeaImageRiskRowKey(row)));
      const previousGeneratedKeys = processImageGeneratedRiskKeys.current;
      processImageGeneratedRiskKeys.current = generatedKeys;
      setReviewRiskRows((current) => [...current.filter((row) => !previousGeneratedKeys.has(fmeaImageRiskRowKey(row))), ...riskRows].slice(0, 20));
      window.setTimeout(queueCurrentDraft, 0);
      setProcessImageAnalysis(merged);
      if (failedCount) setProcessImageAnalysisError(t("assessment.fmeaProcessImagePartialFailure", { count: failedCount }));
      else if (!riskRows.length && !summary) setProcessImageAnalysisError(t("assessment.fmeaProcessImageNoFindings"));
    } finally {
      if (requestId === processImageAnalysisRequestId.current) setProcessImageAnalysisLoading(false);
    }
  }

  async function requestProcessAssistant() {
    const title = jobQuery.trim();
    const selectedDepartment = department;
    if (title.length < 2) {
      setError(t("assessment.jobActivityRequired"));
      return;
    }
    const requestId = ++assistantRequestId.current;
    setSuggestionLoading(true);
    setSuggestionError("");
    try {
      const result = await api<ProcessSuggestionResponse>("/fmea/process-suggestions", {
        method: "POST",
        body: JSON.stringify({ jobCatalogId: selectedJobId || null, jobTitle: title, department: selectedDepartment.trim() || null, activityDescription: activityDescription.trim() || null, locale, mode: "suggestions" }),
      });
      if (requestId !== assistantRequestId.current) return;
      const response = result.data;
      setAiStatus(response.aiStatus);
      const databaseSuggestions = normaliseProcessSuggestions(response.databaseSuggestions);
      const nextAiSuggestions = normaliseProcessSuggestions(response.aiSuggestions);
      setAiSuggestions(nextAiSuggestions);
      setSuggestions(normaliseProcessBoardSuggestions({
        equipment: [...nextAiSuggestions.equipment, ...databaseSuggestions.equipment],
        materials: [...nextAiSuggestions.materials, ...databaseSuggestions.materials],
        controls: [...nextAiSuggestions.controls, ...databaseSuggestions.controls],
      }));
      setProcessAiSuggestionsRequested(true);
    } catch {
      if (requestId === assistantRequestId.current) setSuggestionError(t("assessment.suggestionLoadFailed"));
    } finally {
      if (requestId === assistantRequestId.current) {
        setSuggestionLoading(false);
      }
    }
  }

  async function requestFmeaAutofill() {
    if (editingExistingAssessment || !fmeaAssistantEnabled) return;
    const projectId = selectedProjectId.trim();
    const title = jobQuery.trim();
    if (!projectId || projectId === FMEA_CREATE_PROJECT_OPTION || title.length < 2) return;
    const contextKey = [projectId, selectedJobId, title].join("|");
    if (autofillContextKey.current === contextKey) return;
    autofillContextKey.current = contextKey;
    const requestId = ++autofillRequestId.current;
    setAutofillLoading(true);
    setAutofillError("");
    try {
      const result = await api<ProcessSuggestionResponse>("/fmea/process-suggestions", {
        method: "POST",
        body: JSON.stringify({ projectId, jobCatalogId: selectedJobId || null, jobTitle: title, department: department.trim() || null, activityDescription: activityDescription.trim() || null, specialConditions: specialConditions.trim() || null, locale, mode: "autofill" }),
      });
      if (requestId !== autofillRequestId.current) return;
      const next = normaliseFmeaAutofill(result.data.autofill);
      setAutofillStatus(result.data.aiStatus);
      if (!next) {
        setAutofillError(t("assessment.fmeaAssistantEmpty"));
        return;
      }
      const fieldValue = (name: string, fallback: string) => {
        const field = formRef.current?.elements.namedItem(name);
        return field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement ? field.value : fallback;
      };
      const applyText = (field: Exclude<FmeaAutofillField, ProcessSuggestionCategory>, value: string, setter: (nextValue: string) => void, fallback: string) => {
        if (!value) return;
        const current = fieldValue(field, fallback).trim();
        if (!current || autofilledFields.current.has(field)) {
          setter(value);
          autofilledFields.current.add(field);
        }
      };
      applyText("department", next.department, setDepartment, department);
      applyText("activityDescription", next.activityDescription, setActivityDescription, activityDescription);
      applyText("specialConditions", next.specialConditions, setSpecialConditions, specialConditions);
      setSuggestions(normaliseProcessBoardSuggestions(next.suggestions));
      setAiSuggestions(normaliseProcessBoardSuggestions(next.suggestions));
      setSelectedItems((current) => {
        const updated = { ...current };
        for (const category of processSuggestionCategories) {
          const incoming = next.suggestions[category];
          if (incoming.length && (!current[category].length || autofilledFields.current.has(category))) {
            updated[category] = incoming.slice(0, FMEA_PROCESS_SELECTION_MAX);
            autofilledFields.current.add(category);
          }
        }
        return updated;
      });
      setAutofillError("");
      window.setTimeout(queueCurrentDraft, 0);
    } catch {
      if (requestId === autofillRequestId.current) {
        setAutofillStatus("unavailable");
        setAutofillError(t("assessment.fmeaAssistantUnavailable"));
      }
    } finally {
      if (requestId === autofillRequestId.current) setAutofillLoading(false);
    }
  }

  async function requestDescriptionSuggestion() {
    const title = jobQuery.trim();
    if (title.length < 2) {
      setError(t("assessment.jobActivityRequired"));
      return;
    }
    const requestId = ++descriptionRequestId.current;
    setDescriptionLoading(true);
    setDescriptionAiError("");
    setDescriptionSuggestion("");
    try {
      const result = await api<ProcessSuggestionResponse>("/fmea/process-suggestions", {
        method: "POST",
        body: JSON.stringify({ jobCatalogId: selectedJobId || null, jobTitle: title, department: department.trim() || null, activityDescription: activityDescription.trim() || null, locale, mode: "description" }),
      });
      if (requestId !== descriptionRequestId.current) return;
      setDescriptionAiStatus(result.data.aiStatus);
      const suggestion = result.data.descriptionSuggestion?.trim() ?? "";
      if (suggestion && countShortDescriptionSentences(suggestion) <= 2) {
        setDescriptionSuggestion(suggestion);
        setDescriptionAiError("");
      } else setDescriptionAiError(t("assessment.descriptionSuggestionUnavailable"));
    } catch {
      if (requestId === descriptionRequestId.current) {
        setDescriptionAiStatus("unavailable");
        setDescriptionAiError(t("assessment.descriptionSuggestionUnavailable"));
      }
    } finally {
      if (requestId === descriptionRequestId.current) setDescriptionLoading(false);
    }
  }

  function acceptDescriptionSuggestion() {
    const suggestion = descriptionSuggestion.trim();
    if (!suggestion) return;
    autofilledFields.current.add("activityDescription");
    setActivityDescription(suggestion);
    setDescriptionSuggestion("");
    setDescriptionAiError("");
    setError("");
    window.setTimeout(() => {
      queueCurrentDraft();
      document.getElementById("fmea-activity-description")?.focus();
    }, 0);
  }

  function dismissDescriptionSuggestion() {
    setDescriptionSuggestion("");
  }

  function toggleItem(category: ProcessSuggestionCategory, item: string) {
    setSelectedItems((current) => {
      if (current[category].includes(item)) return { ...current, [category]: current[category].filter((value) => value !== item) };
      if (current[category].length >= FMEA_PROCESS_SELECTION_MAX) return current;
      return { ...current, [category]: [...current[category], item] };
    });
    queueCurrentDraft();
  }

  function addNewItem(category: ProcessSuggestionCategory) {
    const value = newItemInputs[category].trim().slice(0, 160);
    if (!value) return;
    setSelectedItems((current) => current[category].includes(value) || current[category].length >= FMEA_PROCESS_SELECTION_MAX ? current : { ...current, [category]: [...current[category], value] });
    setNewItemInputs((current) => ({ ...current, [category]: "" }));
    queueCurrentDraft();
  }

  function validateWizardStep(step = wizardStep) {
    const values = formRef.current ? new FormData(formRef.current) : null;
    const required = step === 1 ? [["projectId", t("assessment.projectRequired")], ["title", t("assessment.jobActivity")], ["activityDescription", t("assessment.activityDescription")]] : [];
    const missing = required.find(([name]) => !String(values?.get(name) ?? "").trim() || (name === "title" && String(values?.get(name) ?? "").trim().length < 2) || (name === "activityDescription" && String(values?.get(name) ?? "").trim().length < 2));
    if (missing) {
      setError(t("assessment.validationEnter", { field: missing[1] }));
      return false;
    }
    const description = String(values?.get("activityDescription") ?? "").trim();
    if (step === 1 && countShortDescriptionSentences(description) > 2) {
      setError(t("assessment.activityDescriptionSentenceLimit"));
      return false;
    }
    setError("");
    return true;
  }

  function nextWizardStep() {
    if (wizardStep !== 1 || creatingRef.current) return;
    if (validateWizardStep(1)) setWizardStep(2);
  }

  function handleFmeaStepClick(step: FmeaWizardStep) {
    setError("");
    if (step === 3 && editingAssessmentId) {
      navigate(`/fmea/${editingAssessmentId}/report`);
      return;
    }
    setWizardStep(step);
  }

  function goToPreviousWizardStep() {
    setError("");
    setWizardStep((step) => step === 3 ? 2 : 1);
  }

  function continueToFmeaReview(event: ReactMouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    nextWizardStep();
  }

  function submitFmeaFromReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (wizardStep !== 2) return;
    void create(event);
  }

  async function uploadFmeaProcessImages(assessmentId: string) {
    let failed = false;
    for (const image of processImages) {
      const upload = new FormData();
      upload.append("entityType", "FmeaAssessment");
      upload.append("entityId", assessmentId);
      upload.append("file", image);
      try {
        await api<{ id: string }>("/files", { method: "POST", body: upload });
      } catch {
        failed = true;
      }
    }
    return failed;
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creatingRef.current) return;
    if (wizardStep === 1) {
      nextWizardStep();
      return;
    }
    if (!validateWizardStep(1)) { setWizardStep(1); return; }
    const reviewRows = reviewRiskRowsForSubmit();
    if (!reviewRows) {
      setError(t("assessment.riskRowRequired"));
      return;
    }
    creatingRef.current = true;
    setCreating(true);
    setError("");
    const formElement = event.currentTarget;
    try {
      const payload = fmeaPayloadFromForm(formElement);
      if (editingAssessmentId) {
        await api(`/fmea/${editingAssessmentId}`, { method: "PATCH", body: JSON.stringify(payload) });
        const imageUploadFailed = processImages.length ? await uploadFmeaProcessImages(editingAssessmentId) : false;
        for (const row of reviewRows) {
          await api(`/fmea/${editingAssessmentId}/items`, { method: "POST", body: JSON.stringify({ failureMode: row.failureMode, effect: row.effect, cause: row.cause, preventiveControls: row.preventiveControls || null, detectionControls: row.detectionControls || null, severity: row.severity, occurrence: row.occurrence, detection: row.detection, recommendation: row.recommendation || null }) });
        }
        state.reload();
        if (imageUploadFailed) setError(t("assessment.fmeaProcessImageUploadFailed"));
        navigate(`/fmea/${editingAssessmentId}/report`, { replace: true });
        return;
      }
      cancelDraftTimer(saveTimer);
      const draftSaved = await persistDraftNow(draftKey, snapshotStoredForm(formElement), draftWriteQueue);
      if (!draftSaved) { setAutosaveError(true); setError(t("assessment.autosaveError")); return; }
      if (!navigator.onLine) { setDraftNotice(t("assessment.draftSavedOffline")); setDraftSyncAvailable(true); return; }
      const created = await api<{ id: string }>("/fmea", { method: "POST", body: JSON.stringify(payload) });
      const imageUploadFailed = processImages.length ? await uploadFmeaProcessImages(created.data.id) : false;
      for (const row of reviewRows) {
        await api(`/fmea/${created.data.id}/items`, { method: "POST", body: JSON.stringify({ failureMode: row.failureMode, effect: row.effect, cause: row.cause, preventiveControls: row.preventiveControls || null, detectionControls: row.detectionControls || null, severity: row.severity, occurrence: row.occurrence, detection: row.detection, recommendation: row.recommendation || null }) });
      }
      await clearAutoSaveDraft(draftKey);
      formElement.reset();
      resetProcessForm();
      setDraftState(null);
      clearFmeaWizardStep(draftKey);
      setLastSaved(null);
      setAutosaveError(false);
      state.reload();
      setDraftSyncAvailable(false);
      if (imageUploadFailed) setError(t("assessment.fmeaProcessImageUploadFailed"));
      navigate(`/fmea/${created.data.id}/report`, { replace: true });
    } catch { setError(t("assessment.processSaveFailed")); }
    finally {
      creatingRef.current = false;
      setCreating(false);
    }
  }

  async function syncDraft() {
    cancelDraftTimer(saveTimer);
    await draftWriteQueue.current.catch(() => undefined);
    const value = await readAssessmentDraft(draftKey);
    if (!value) return;
    try {
      const reviewRows = fmeaRiskRowsFromDraft(value);
      if (!reviewRows) {
        setError(t("assessment.riskRowRequired"));
        return;
      }
      const created = await api<{ id: string }>("/fmea", { method: "POST", body: JSON.stringify(fmeaPayloadFromDraft(value)) });
      for (const row of reviewRows) {
        await api(`/fmea/${created.data.id}/items`, { method: "POST", body: JSON.stringify({ failureMode: row.failureMode, effect: row.effect, cause: row.cause, preventiveControls: row.preventiveControls || null, detectionControls: row.detectionControls || null, severity: row.severity, occurrence: row.occurrence, detection: row.detection, recommendation: row.recommendation || null }) });
      }
      await clearAutoSaveDraft(draftKey);
      resetProcessForm();
      setDraftState(null);
      clearFmeaWizardStep(draftKey);
      setDraftSyncAvailable(false);
      setAutosaveError(false);
      state.reload();
      navigate(`/fmea/${created.data.id}/report`, { replace: true });
    } catch { setError(t("assessment.processSaveFailed")); }
  }

  async function editAssessment(item: Fmea) { const title = (await dialog.prompt(t("assessment.editTitle"), item.title))?.trim(); if (!title || title === item.title) return; try { await api(`/fmea/${item.id}`, { method: "PATCH", body: JSON.stringify({ title }) }); state.reload(); } catch (reason) { setError((reason as Error).message); } }
  async function deleteAssessment(item: Fmea) { if (!(await dialog.confirm(t("assessment.deleteConfirm", { title: item.title })))) return; try { await api(`/fmea/${item.id}`, { method: "DELETE" }); if (selected === item.id) setSelected(""); state.reload(); } catch (reason) { setError((reason as Error).message); } }
  async function loadHistory(id: string) { try { const result = await api<VersionRow[]>(`/fmea/${id}/history`); setHistory(result.data); setHistoryAssessment(id); } catch (reason) { setError((reason as Error).message); } }
  function riskRowFormContext(): FmeaRiskSuggestionContext {
    const form = document.getElementById("fmea-risk-row-form");
    const value = (name: string) => form instanceof HTMLFormElement ? String(new FormData(form).get(name) ?? "") : "";
    return { projectName: selectedAssessment?.project?.name ?? null, jobTitle: selectedAssessment?.title ?? "", department: selectedAssessment?.department ?? null, activityDescription: selectedAssessment?.activityDescription ?? null, processStep: selectedAssessment?.activityDescription ?? null, failureMode: value("failureMode"), effect: value("effect"), cause: value("cause"), preventiveControls: value("preventiveControls"), detectionControls: value("detectionControls"), recommendation: value("recommendation") };
  }
  function applyRiskSuggestionToForm(field: FmeaRiskSuggestionField, value: string, emptyOnly = false) {
    const form = document.getElementById("fmea-risk-row-form");
    if (!(form instanceof HTMLFormElement)) return false;
    const control = form.elements.namedItem(fmeaRiskSuggestionInputName[field]);
    if (!(control instanceof HTMLInputElement) && !(control instanceof HTMLTextAreaElement)) return false;
    if (emptyOnly && control.value.trim()) return false;
    control.value = value;
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }
  function applyReviewRiskSuggestion(field: FmeaRiskSuggestionField, value: string, emptyOnly = false) {
    const key = fmeaRiskSuggestionInputName[field];
    if (emptyOnly && String(reviewRiskDraft[key]).trim()) return false;
    updateReviewRiskDraft(key, value);
    window.setTimeout(queueCurrentDraft, 0);
    return true;
  }
  function applyReviewRiskScoreSuggestion(suggestion: FmeaRiskScoreSuggestion, onlyIfUntouched = false) {
    if (onlyIfUntouched && (reviewScoreTouchedRef.current || [reviewRiskDraft.severity, reviewRiskDraft.occurrence, reviewRiskDraft.detection].some((score) => score !== 1))) return false;
    reviewScoreTouchedRef.current = true;
    setReviewRiskDraft((current) => ({ ...current, severity: suggestion.severity, occurrence: suggestion.occurrence, detection: suggestion.detection }));
    window.setTimeout(queueCurrentDraft, 0);
    return true;
  }
  function updateReviewRiskDraft<K extends keyof FmeaRiskRowInput>(key: K, value: FmeaRiskRowInput[K]) {
    if (key === "severity" || key === "occurrence" || key === "detection") reviewScoreTouchedRef.current = true;
    setReviewRiskDraft((current) => ({ ...current, [key]: value }));
  }
  function addReviewRiskRow() {
    const row = {
      ...reviewRiskDraft,
      failureMode: reviewRiskDraft.failureMode.trim(),
      effect: reviewRiskDraft.effect.trim(),
      cause: reviewRiskDraft.cause.trim(),
      preventiveControls: reviewRiskDraft.preventiveControls.trim(),
      detectionControls: reviewRiskDraft.detectionControls.trim(),
      recommendation: reviewRiskDraft.recommendation.trim(),
    };
    if (!row.failureMode || !row.effect || !row.cause) {
      setError(t("assessment.riskRowRequired"));
      return;
    }
    if (reviewRiskRows.length >= 20) return;
    setError("");
    setReviewRiskRows((current) => [...current, row]);
    setReviewRiskDraft(emptyFmeaRiskRowInput());
    reviewScoreTouchedRef.current = false;
    window.setTimeout(queueCurrentDraft, 0);
  }
  function removeReviewRiskRow(index: number) {
    setReviewRiskRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
    window.setTimeout(queueCurrentDraft, 0);
  }
  function reviewRiskRowsForSubmit() {
    const current = {
      ...reviewRiskDraft,
      failureMode: reviewRiskDraft.failureMode.trim(),
      effect: reviewRiskDraft.effect.trim(),
      cause: reviewRiskDraft.cause.trim(),
      preventiveControls: reviewRiskDraft.preventiveControls.trim(),
      detectionControls: reviewRiskDraft.detectionControls.trim(),
      recommendation: reviewRiskDraft.recommendation.trim(),
    };
    const hasCurrentRow = Object.values(current).some((value) => typeof value === "string" && value.length > 0);
    if (!hasCurrentRow) return reviewRiskRows;
    if (!current.failureMode || !current.effect || !current.cause) return null;
    return reviewRiskRows.length < 20 ? [...reviewRiskRows, current] : reviewRiskRows;
  }
  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || itemCreating) return;
    setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    const numeric = (name: string) => Number(form.get(name));
    const requiredFields = ["failureMode", "effect", "cause"];
    if (requiredFields.some((name) => !text(name))) {
      setError(t("assessment.riskRowRequired"));
      return;
    }
    setItemCreating(true);
    try {
      await api(`/fmea/${selected}/items`, { method: "POST", body: JSON.stringify({ failureMode: text("failureMode"), effect: text("effect"), cause: text("cause"), preventiveControls: text("preventiveControls") || null, detectionControls: text("detectionControls") || null, severity: numeric("severity"), occurrence: numeric("occurrence"), detection: numeric("detection"), recommendation: text("recommendation") || null }) });
      await clearAutoSaveDraft(itemDraftKey);
      formElement.reset();
      scoreTouchedRef.current = false;
      setScores({ severity: 1, occurrence: 1, detection: 1 });
      state.reload();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setItemCreating(false);
    }
  }
  async function saveEditedItem(draftValue: FmeaItemDraft) {
    if (!selected || !editingItem) return;
    setItemSaving(true);
    setError("");
    try {
      await api(`/fmea/${selected}/items/${editingItem.id}`, { method: "PATCH", body: JSON.stringify({ ...draftValue, preventiveControls: draftValue.preventiveControls || null, detectionControls: draftValue.detectionControls || null, recommendation: draftValue.recommendation || null }) });
      setEditingItem(null);
      setViewingItem(null);
      state.reload();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setItemSaving(false);
    }
  }
  async function deleteItem(item: FmeaItem) {
    if (!selected || !(await dialog.confirm(t("assessment.deleteRowConfirm")))) return;
    try {
      await api(`/fmea/${selected}/items/${item.id}`, { method: "DELETE" });
      if (editingItem?.id === item.id) setEditingItem(null);
      if (viewingItem?.id === item.id) setViewingItem(null);
      state.reload();
    } catch (reason) {
      setError((reason as Error).message);
    }
  }
  function downloadFmeaReport(format: "xlsx" | "pdf" | "docx") {
    if (!selectedAssessment) return;
    const filename = `${selectedAssessment.code}.${format}`;
    void saveBlob(`/reports/fmea/${selectedAssessment.id}.${format}`, filename).catch((reason) => setError((reason as Error).message));
  }

  useEffect(() => {
    if (wizardStep !== 2) return;
    const frame = window.requestAnimationFrame(() => {
      const reviewStep = fmeaReviewStepRef.current;
      if (!reviewStep) return;
      reviewStep.scrollIntoView({ block: "start", behavior: "smooth" });
      const firstControl = reviewStep.querySelector<HTMLElement>("input, select, textarea, button");
      firstControl?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [wizardStep]);

  useEffect(() => {
    if (wizardStep !== 3) return;
    const frame = window.requestAnimationFrame(() => {
      const reportStep = fmeaReportStepRef.current;
      if (!reportStep) return;
      reportStep.scrollIntoView({ block: "start", behavior: "smooth" });
      reportStep.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [wizardStep]);

  return <section className="page-shell">
    {registeredAssessmentsView ? <PageHeader eyebrow={t("assessment.fmeaEyebrow")} title={t("assessment.registered")} description={t("assessment.registeredDescription")} actions={<button type="button" className="ghost button-link" onClick={() => navigate("/fmea")}><Icon name="arrow" className="back-arrow" size={16}/><span className="page-action-label">{t("assessment.backToNewFmea")}</span></button>}/> : <PageHeader eyebrow={t("assessment.fmeaEyebrow")} title={t("assessment.fmeaTitle")} description={t("assessment.fmeaDescription")} actions={<div className="page-actions-inline">{canEdit() && <button type="button" className={`fmea-assistant-toggle ${fmeaAssistantEnabled ? "enabled" : "disabled"}`} aria-pressed={fmeaAssistantEnabled} onClick={() => setFmeaAssistantEnabled((enabled) => !enabled)}><span className="fmea-assistant-toggle-mark" aria-hidden="true">{fmeaAssistantEnabled ? "✓" : ""}</span><span><strong>{t("assessment.fmeaAssistant")}</strong><small>{fmeaAssistantEnabled ? t("assessment.fmeaAssistantOn") : t("assessment.fmeaAssistantOff")}</small></span></button>}<button type="button" className="ghost button-link fmea-registered-button" aria-controls="fmea-registered-assessments" aria-expanded={registeredAssessmentsView} onClick={openRegisteredAssessments}><Icon name="fmea" size={16}/><span className="page-action-label">{t("assessment.registered")}</span></button><Link className="ghost button-link" to="/choose-path"><Icon name="arrow" className="back-arrow" size={16}/><span className="page-action-label">{t("assessment.changeAssessmentMethod")}</span></Link></div>}/>}
    {error && <div className="alert error" role="alert"><Icon name="warning"/>{error}</div>}
    {!registeredAssessmentsView && draftNotice && <div className="alert info" role="status"><Icon name="files"/>{draftNotice}{navigator.onLine && draftSyncAvailable && <button type="button" className="text-button" onClick={() => void syncDraft()}>{t("common.sync")}</button>}</div>}
    {!registeredAssessmentsView && canEdit() && <SectionCard title={editingExistingAssessment ? t("assessment.editFmea") : t("assessment.evaluateNew", { type: "FMEA" })} description={t("assessment.threeSteps", { steps: t("assessment.stepFmeaProcessReviewReport") })} icon="plus">
      <form ref={formRef} className="assessment-wizard fmea-process-form" data-fmea-step={wizardStep} key={editingAssessment ? `edit-${editingAssessment.id}-${editingAssessment.version}` : draft ? "restored-draft" : "new-draft"} noValidate onInput={(event) => { if (!editingExistingAssessment) queueDraft(event.currentTarget, draftKey, saveTimer, draftWriteQueue, (time) => { setAutosaveError(false); setLastSaved(time); }, () => setAutosaveError(true)); }} onChange={(event) => { if (!editingExistingAssessment) queueDraft(event.currentTarget, draftKey, saveTimer, draftWriteQueue, (time) => { setAutosaveError(false); setLastSaved(time); }, () => setAutosaveError(true)); }} onSubmit={submitFmeaFromReview}>
        {wizardStep === 3 ? <FmeaReportStepper onStepClick={handleFmeaStepClick}/> : <FmeaCreationStepper currentStep={wizardStep} onStepClick={handleFmeaStepClick}/>}
        <fieldset id="fmea-process-step" data-step="1" hidden={wizardStep !== 1}><legend>{t("assessment.processInformation")}</legend>
          {!editingExistingAssessment && fmeaAssistantEnabled && <div className="fmea-autofill-banner enabled" role="status" aria-live="polite"><div><strong>{t("assessment.fmeaAssistant")}</strong><small>{t("assessment.fmeaAssistantReviewHint")}</small></div>{autofillLoading && <span className="ai-status loading"><span className="spinner"/>{t("assessment.fmeaAssistantWorking")}</span>}{!autofillLoading && autofillStatus && <span className={`ai-status ${autofillStatus}`}>{t(`assessment.aiStatus.${autofillStatus}`)}</span>}{autofillError && <small className="field-error" role="alert">{autofillError}</small>}</div>}
          <div className="fmea-process-grid">
             <label><span className="fmea-field-label"><span>{t("assessment.projectRequired")}</span><span className="required-label">{t("common.required")}</span></span><StyledSelect name="projectId" value={selectedProjectId} onChange={(event) => { const value = event.target.value; if (value === FMEA_CREATE_PROJECT_OPTION) { openProjectCreator(); return; } setSelectedProjectId(value); autofillContextKey.current = ""; setAutofillError(""); }} required><option value="">{t("assessment.projectSelect")}</option>{projects.data?.map((project) => <option key={project.id} value={project.id}>{projectName(project, locale)}</option>)}<option value={FMEA_CREATE_PROJECT_OPTION}>＋ {t("projects.newProject")}</option></StyledSelect></label>
             <JobCatalogSearch value={jobQuery} selectedJob={selectedJob} customSelected={customJobSelected} jobs={jobCatalog} loading={jobLoading} error={jobSearchError} open={jobSearchOpen} onOpenChange={setJobSearchOpen} onChange={changeJobQuery} onSelect={selectJob} onUseCustom={useCustomJobTitle} onClear={clearJobSelection}/>
            <label><span className="fmea-field-label"><span>{t("assessment.department")}</span><span className="optional-label">{t("common.optional")}</span></span><input name="department" value={department} onChange={(event) => { autofilledFields.current.delete("department"); setDepartment(event.target.value); }} placeholder={t("assessment.departmentPlaceholder")}/></label>
            <div className="fmea-description-field">
              <div className="fmea-description-head"><label htmlFor="fmea-activity-description"><span className="fmea-field-label"><span>{t("assessment.activityDescription")}</span><span className="required-label">{t("common.required")}</span></span></label><button type="button" className="fmea-description-ai" onClick={() => void requestDescriptionSuggestion()} disabled={descriptionLoading} aria-busy={descriptionLoading}><Icon name="sparkles" size={15}/>{descriptionLoading ? t("assessment.aiDescriptionWorking") : t(activityDescription.trim() ? "assessment.improveDescriptionWithAi" : "assessment.suggestDescriptionWithAi")}</button></div>
              <textarea id="fmea-activity-description" name="activityDescription" value={activityDescription} maxLength={FMEA_PROCESS_DESCRIPTION_MAX} rows={4} required aria-invalid={countShortDescriptionSentences(activityDescription) > 2} aria-describedby="fmea-activity-description-hint fmea-activity-description-error" placeholder={t("assessment.activityDescriptionPlaceholder")} onChange={(event) => { autofilledFields.current.delete("activityDescription"); setActivityDescription(event.target.value); setDescriptionSuggestion(""); setDescriptionAiError(""); setDescriptionAiStatus(null); }}/>
              <div className="fmea-description-meta"><span id="fmea-activity-description-hint" className="field-counter">{activityDescription.length.toLocaleString(numberLocale)} / {Number(FMEA_PROCESS_DESCRIPTION_MAX).toLocaleString(numberLocale)} · {t("assessment.activityDescriptionLimit")}</span>{descriptionAiStatus && !descriptionLoading && <span className={`ai-status ${descriptionAiStatus}`}>{t(`assessment.aiStatus.${descriptionAiStatus}`)}</span>}</div>
              {descriptionSuggestion && <div className="fmea-description-suggestion" role="status" aria-live="polite"><div className="fmea-description-suggestion-head"><div><strong>{t("assessment.descriptionSuggestionTitle")}</strong><small>{t("assessment.descriptionSuggestionHint")}</small></div><span className={`ai-status ${descriptionAiStatus ?? "connected"}`}>{descriptionAiStatus ? t(`assessment.aiStatus.${descriptionAiStatus}`) : "AI"}</span></div><p>{descriptionSuggestion}</p><div className="fmea-description-suggestion-actions"><button type="button" className="primary" onClick={acceptDescriptionSuggestion}>{t("assessment.useDescriptionSuggestion")}</button><button type="button" className="ghost" onClick={dismissDescriptionSuggestion}>{t("assessment.dismissDescriptionSuggestion")}</button></div></div>}
              {countShortDescriptionSentences(activityDescription) > 2 && <small id="fmea-activity-description-error" className="field-error" role="alert">{t("assessment.activityDescriptionSentenceLimit")}</small>}
              {descriptionAiError && <small className="field-error fmea-description-assist-error" role="status">{descriptionAiError}</small>}
            </div>
            <div className="fmea-process-image-field">
              <div className="fmea-process-image-head"><div><span className="fmea-field-label"><span>{t("assessment.fmeaProcessImage")}</span><span className="optional-label">{t("common.optional")}</span></span></div>{processImageAnalysisLoading && <span className="ai-status loading" role="status"><span className="spinner"/>{t("assessment.fmeaProcessImageWorking")}</span>}{processImageAnalysis && !processImageAnalysisLoading && <span className={`ai-status ${processImageAnalysis.aiStatus}`} role="status">{t("assessment.fmeaProcessImageAnalyzed", { count: processImageAnalysis.riskRows.length })}</span>}</div>
              <label className={`fmea-process-image-dropzone ${processImagePreviews.length ? "has-image" : ""}`}>
                <input ref={processImageInputRef} name="fmeaProcessImage" type="file" multiple accept="image/jpeg,image/png,image/webp" aria-invalid={processImageError ? true : undefined} aria-describedby={processImageError ? "fmea-process-image-error" : undefined} onChange={handleFmeaProcessImageChange}/>
                {processImagePreviews.length ? <><div className="fmea-process-image-gallery" aria-label={t("assessment.fmeaProcessImage")}>
                  {processImagePreviews.map((preview, index) => <span key={`${processImages[index]?.name ?? "image"}-${index}`}><img src={preview} alt={`${t("assessment.fmeaProcessImage")} ${(index + 1).toLocaleString(numberLocale)}`}/></span>)}
                </div><span className="fmea-process-image-change">{t("assessment.fmeaProcessImageChange")}</span></> : <><Icon name="files" size={20}/><strong>{t("assessment.fmeaProcessImageChoose")}</strong><small>{t("assessment.fmeaProcessImageChooseHint")}</small><span className="ghost fake-button">{t("assessment.choosePhoto")}</span></>}
              </label>
              {processImages.length > 0 && <div className="fmea-process-image-meta"><span>{t("assessment.fmeaProcessImageCount", { count: processImages.length, max: FMEA_PROCESS_IMAGE_MAX_COUNT })}</span><button type="button" className="text-button" onClick={() => removeFmeaProcessImage()}>{t("assessment.fmeaProcessImageRemove")}</button></div>}
              {processImageError && <small id="fmea-process-image-error" className="field-error" role="alert">{processImageError}</small>}
              {processImageAnalysisError && <small className="field-error" role="status">{processImageAnalysisError}</small>}
            </div>
            <div className="fmea-suggestion-board"><div className="fmea-suggestion-board-head"><div><strong>{t("assessment.processSuggestions")}</strong><small>{t("assessment.processSuggestionsHint")}</small></div><div className="fmea-suggestion-board-actions"><button type="button" className="primary fmea-suggestion-ai-button" onClick={() => void requestProcessAssistant()} disabled={suggestionLoading || jobQuery.trim().length < 2} aria-busy={suggestionLoading}><Icon name="sparkles" size={15}/>{suggestionLoading ? t("assessment.aiWorking") : processAiSuggestionsRequested ? t("assessment.getNewProcessAiSuggestions") : t("assessment.getProcessAiSuggestions")}</button>{aiStatus && !suggestionLoading && <span className={`ai-status ${aiStatus}`}>{t(`assessment.aiStatus.${aiStatus}`)}</span>}</div>{suggestionError && <small className="field-error" role="status">{suggestionError}</small>}</div><div className="fmea-suggestion-grid">{processSuggestionCategories.map((category) => <ProcessSuggestionPicker key={category} category={category} suggestions={suggestions[category].slice(0, FMEA_PROCESS_BOARD_SUGGESTION_MAX)} selected={selectedItems[category]} newValue={newItemInputs[category]} onToggle={(item) => toggleItem(category, item)} onNewValueChange={(value) => setNewItemInputs((current) => ({ ...current, [category]: value }))} onAdd={() => addNewItem(category)}/>)}</div></div>
            <label className="fmea-special-conditions"><span className="fmea-field-label"><span>{t("assessment.specialConditions")}</span><span className="optional-label">{t("common.optional")}</span></span><textarea name="specialConditions" value={specialConditions} maxLength={1200} rows={2} placeholder={t("assessment.specialConditionsPlaceholder")} onChange={(event) => { autofilledFields.current.delete("specialConditions"); setSpecialConditions(event.target.value); }}/></label>
          </div>
          <input type="hidden" name="activityId" value={editingAssessment?.activityId ?? ""}/><input type="hidden" name="jobCatalogId" value={selectedJobId}/><input type="hidden" name="customJobSelected" value={customJobSelected ? "true" : "false"}/><input type="hidden" name="equipment" value={JSON.stringify(selectedItems.equipment)}/><input type="hidden" name="materials" value={JSON.stringify(selectedItems.materials)}/><input type="hidden" name="existingControls" value={JSON.stringify(selectedItems.controls)}/>
        </fieldset>
        <fieldset ref={fmeaReviewStepRef} id="fmea-review-step" data-step="2" hidden={wizardStep !== 2}><legend>{t("assessment.review")}</legend><input type="hidden" data-fmea-auto-metadata="true" name="code" value={assessmentCode}/><input type="hidden" data-fmea-auto-metadata="true" name="scope" value={assessmentScope ?? ""}/><div className="fmea-process-review"><div className="wizard-review"><Icon name="check" size={25}/><div><strong>{t("assessment.reviewReadyFmea")}</strong><p>{t("assessment.reviewFmeaDescription")}</p></div></div><div className="fmea-review-grid"><div><small>{t("assessment.jobActivity")}</small><strong>{jobQuery || "—"}</strong></div><div><small>{t("assessment.department")}</small><strong>{department || "—"}</strong></div><div className="fmea-review-wide"><small>{t("assessment.activityDescription")}</small><p>{activityDescription || "—"}</p></div><div className="fmea-review-wide"><small>{t("assessment.selectedItems")}</small><div className="fmea-review-chips">{processSuggestionCategories.flatMap((category) => selectedItems[category].map((item) => <span key={`${category}-${item}`}>{item}</span>)).length ? processSuggestionCategories.flatMap((category) => selectedItems[category].map((item) => <span key={`${category}-${item}`}>{item}</span>)) : <span>—</span>}</div></div></div></div></fieldset>
        <fieldset ref={fmeaReportStepRef} id="fmea-report-step" data-step="3" hidden={wizardStep !== 3}><legend>{t("assessment.reportResults")}</legend><div className="fmea-process-review fmea-report-preview"><div className="wizard-review"><Icon name="chart" size={25}/><div><strong>{t("assessment.fmeaReportPreviewTitle")}</strong><p>{t(editingAssessmentId ? "assessment.fmeaReportPreviewSavedDescription" : "assessment.fmeaReportPreviewDraftDescription")}</p></div></div><div className="fmea-review-grid"><div><small>{t("assessment.projectRequired")}</small><strong>{selectedProject ? projectName(selectedProject, locale) : "—"}</strong></div><div><small>{t("assessment.jobActivity")}</small><strong>{jobQuery || "—"}</strong></div><div><small>{t("assessment.codeRequired")}</small><strong>{assessmentCode}</strong></div><div><small>{t("assessment.riskRowCount")}</small><strong>{reviewRiskRows.length.toLocaleString(numberLocale)}</strong></div><div className="fmea-review-wide"><small>{t("assessment.activityDescription")}</small><p>{activityDescription || "—"}</p></div></div>{editingAssessmentId && <div className="wizard-actions"><span/><button type="button" className="primary" onClick={() => navigate(`/fmea/${editingAssessmentId}/report`)}>{t("assessment.openReport")} <Icon name="arrow"/></button></div>}</div></fieldset>
        {wizardStep === 2 && <FmeaReviewRiskRow draft={reviewRiskDraft} rows={reviewRiskRows} context={{ projectName: projects.data?.find((project) => project.id === selectedProjectId)?.name ?? null, jobTitle: jobQuery, department, activityDescription, processStep: activityDescription }} autoEnabled={fmeaAssistantEnabled} onChange={updateReviewRiskDraft} onScoreChange={(kind, value) => updateReviewRiskDraft(kind, value)} onAdd={addReviewRiskRow} onRemove={removeReviewRiskRow} onAccept={(field, value) => applyReviewRiskSuggestion(field, value)} onAutoAccept={(field, value) => applyReviewRiskSuggestion(field, value, true)} onAcceptScore={(suggestion) => applyReviewRiskScoreSuggestion(suggestion)} onAutoAcceptScore={(suggestion) => applyReviewRiskScoreSuggestion(suggestion, true)} />}
        <div className="wizard-actions"><button className="ghost" type="button" disabled={wizardStep === 1 || creating} onClick={goToPreviousWizardStep}>{t("assessment.previousStep")}</button>{wizardStep === 1 ? <button className="primary" type="button" onClick={continueToFmeaReview}>{t("common.next")} <Icon name="arrow"/></button> : wizardStep === 2 ? <button className="primary" type="submit" disabled={creating}><Icon name={creating ? "clock" : "plus"}/> {creating ? t("assessment.registeringFmea") : t(editingExistingAssessment ? "assessment.saveFmeaAndOpenReport" : "assessment.createFmeaAndOpenReport")}</button> : <button className="primary" type="button" onClick={() => editingAssessmentId ? navigate(`/fmea/${editingAssessmentId}/report`) : setWizardStep(2)}>{t(editingAssessmentId ? "assessment.openReport" : "assessment.returnToReview")} <Icon name="arrow"/></button>}</div>{!editingExistingAssessment && <AutoSaveStatus lastSaved={lastSaved} hasError={autosaveError}/>}
      </form>
    </SectionCard>}
    {registeredAssessmentsView && <div id="fmea-registered-assessments" className="fmea-registered-assessments"><SectionCard title={t("assessment.registered")} description={t("assessment.registeredDescription")} icon="fmea"><LoadState state={state} empty={t("assessment.noFmea")}>{(data) => <div className="assessment-list">{data.map((item) => { const maxRpn = Math.max(0, ...item.items.map((row) => row.rpn)); return <button type="button" className="assessment-card" key={item.id} onClick={() => navigate(`/fmea/${item.id}/report`)}><div className="assessment-card-head"><span className="project-code">{item.code}</span><StatusBadge value={item.status}/></div><h3>{item.title}</h3><p>{projectName(item.project, locale)}{item.scope ? ` · ${item.scope}` : ""}</p><div className="assessment-metrics"><span><b>{item.items.length.toLocaleString(numberLocale)}</b> {t("assessment.riskRowCount")}</span><span><b>{maxRpn.toLocaleString(numberLocale)}</b> {t("assessment.maxRpn")}</span><span><b>{item.version.toLocaleString(numberLocale)}</b> {t("common.version")}</span></div>{canEdit() && <div className="card-actions"><span onClick={(event) => { event.stopPropagation(); void editAssessment(item); }}><Icon name="activity" size={16}/> {t("assessment.edit")}</span><span onClick={(event) => { event.stopPropagation(); void loadHistory(item.id); }}><Icon name="clock" size={16}/> {t("assessment.history")}</span><span title={t("assessment.downloadExcel")} onClick={(event) => { event.stopPropagation(); void saveBlob(`/reports/fmea/${item.id}.xlsx`, `${item.code}.xlsx`).catch((reason) => setError((reason as Error).message)); }}><Icon name="download" size={16}/> Excel</span><span title={t("assessment.downloadPdf")} onClick={(event) => { event.stopPropagation(); void saveBlob(`/reports/fmea/${item.id}.pdf`, `${item.code}.pdf`).catch((reason) => setError((reason as Error).message)); }}><Icon name="download" size={16}/> PDF</span><span title={t("assessment.downloadWord")} onClick={(event) => { event.stopPropagation(); void saveBlob(`/reports/fmea/${item.id}.docx`, `${item.code}.docx`).catch((reason) => setError((reason as Error).message)); }}><Icon name="download" size={16}/> Word</span><span className="danger-link" onClick={(event) => { event.stopPropagation(); void deleteAssessment(item); }}><Icon name="trash" size={16}/> {t("common.delete")}</span></div>}</button>; })}</div>}</LoadState></SectionCard></div>}
    {registeredAssessmentsView && historyAssessment && <SectionCard title={t("assessment.history")} description={t("assessment.historyDescription")} icon="clock" actions={<button className="text-button" onClick={() => setHistoryAssessment("")}>{t("assessment.historyClose")}</button>}><div className="history-list">{history.length ? history.map((version) => <div className="history-row" key={version.id}><strong>{t("common.version")} {version.version.toLocaleString(numberLocale)}</strong><span>{formatDate(version.createdAt, true)}</span></div>) : <EmptyState title={t("assessment.noHistory")} icon="clock"/>}</div></SectionCard>}
    {registeredAssessmentsView && selectedAssessment && <SectionCard title={t("assessment.riskRows", { title: selectedAssessment.title })} description={t("assessment.riskRowsDescription")} icon="chart" actions={canEdit() ? <div className="risk-report-actions"><button type="button" className="primary" onClick={() => navigate(`/fmea/${selectedAssessment.id}/report`)}><Icon name="chart" size={15}/> {t("assessment.openReport")}</button><button type="button" className="ghost" onClick={() => downloadFmeaReport("xlsx")}><Icon name="download" size={15}/> Excel</button><button type="button" className="ghost" onClick={() => downloadFmeaReport("pdf")}><Icon name="download" size={15}/> PDF</button><button type="button" className="ghost" onClick={() => downloadFmeaReport("docx")}><Icon name="download" size={15}/> Word</button></div> : undefined}>
       {!selectedAssessment.items.length ? <EmptyState title={t("assessment.noRiskRows")} description={t("assessment.addFirstRisk")} icon="fmea"/> : <>
         <div className="risk-table-toolbar">
           <label className="search-box risk-table-search"><Icon name="search" size={17}/><span className="sr-only">{t("assessment.riskSearch")}</span><input value={riskSearch} onChange={(event) => setRiskSearch(event.target.value)} placeholder={t("assessment.riskSearchPlaceholder")} aria-label={t("assessment.riskSearch")}/></label>
           <div className="risk-table-controls">
             <label><span>{t("assessment.riskFilter")}</span><StyledSelect value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)}><option value="ALL">{t("assessment.allRiskLevels")}</option><option value="VERY_LOW">{t("status.veryLow")}</option><option value="LOW">{t("status.low")}</option><option value="MEDIUM">{t("status.medium")}</option><option value="HIGH">{t("status.high")}</option><option value="CRITICAL">{t("status.critical")}</option></StyledSelect></label>
             <label><span>{t("assessment.riskSort")}</span><StyledSelect value={riskSort} onChange={(event) => setRiskSort(event.target.value as RiskSortField)}><option value="rowNumber">{t("assessment.sortRow")}</option><option value="rpn">{t("assessment.sortRpn")}</option><option value="severity">{t("assessment.sortSeverity")}</option><option value="occurrence">{t("assessment.sortOccurrence")}</option><option value="detection">{t("assessment.sortDetection")}</option></StyledSelect></label>
             <button type="button" className="ghost risk-sort-direction" onClick={() => setRiskSortDirection((direction) => direction === "asc" ? "desc" : "asc")} aria-label={t("assessment.toggleSortDirection")}>{riskSortDirection === "asc" ? "↑" : "↓"}</button>
           </div>
         </div>
         <details className="risk-score-guide"><summary><Icon name="chart" size={16}/>{t("assessment.scoreGuide")}</summary><p>{t("assessment.scoreGuideDescription")}</p><div className="table-wrap"><table className="score-guide-table"><thead><tr><th>{t("assessment.scoreRange")}</th><th>{t("assessment.severity")}</th><th>{t("assessment.occurrence")}</th><th>{t("assessment.detection")}</th></tr></thead><tbody>{fmeaScoreCriteria[locale].severity.map((criterion, index) => <tr key={criterion.score}><td><strong>{criterion.score.toLocaleString(numberLocale)}</strong></td><td><strong>{criterion.label}</strong><small>{criterion.description}</small></td><td><strong>{fmeaScoreCriteria[locale].occurrence[index].label}</strong><small>{fmeaScoreCriteria[locale].occurrence[index].description}</small></td><td><strong>{fmeaScoreCriteria[locale].detection[index].label}</strong><small>{fmeaScoreCriteria[locale].detection[index].description}</small></td></tr>)}</tbody></table></div></details>
         {viewingItem && <div className="risk-detail-panel" role="region" aria-label={t("assessment.riskDetails")}><div className="risk-detail-head"><div><strong>{t("assessment.riskDetails")}</strong><small>{viewingItem.failureMode}</small></div><button type="button" className="text-button" onClick={() => setViewingItem(null)}>{t("assessment.closeDetails")}</button></div><div className="risk-detail-grid"><div><span>{t("assessment.processActivity")}</span><strong>{viewingItem.processStep}</strong></div><div><span>{t("assessment.effect")}</span><strong>{viewingItem.effect}</strong></div><div><span>{t("assessment.cause")}</span><strong>{viewingItem.cause}</strong></div><div><span>{t("assessment.recommendation")}</span><strong>{viewingItem.recommendation || "—"}</strong></div><div className="risk-detail-wide"><span>{t("assessment.existingControls")}</span><strong>{[viewingItem.preventiveControls, viewingItem.detectionControls].filter(Boolean).join(" · ") || "—"}</strong></div><div className="risk-detail-scores"><span>S <b>{viewingItem.severity}</b></span><span>O <b>{viewingItem.occurrence}</b></span><span>D <b>{viewingItem.detection}</b></span><span>RPN <b>{viewingItem.rpn.toLocaleString(numberLocale)}</b></span><StatusBadge value={viewingItem.riskLevel}/></div></div></div>}
         {editingItem && <FmeaItemEditor key={editingItem.id} item={editingItem} saving={itemSaving} onCancel={() => setEditingItem(null)} onSave={saveEditedItem}/>}
         {filteredRiskRows.length ? <><div className="table-wrap risk-table-wrap"><table className="assessment-report-table fmea-risk-table"><thead><tr><th>{t("assessment.row")}</th><th>{t("assessment.processActivity")}</th><th>{t("assessment.failureMode")}</th><th>{t("assessment.effect")}</th><th>{t("assessment.cause")}</th><th>{t("assessment.existingControls")}</th><th title={t("assessment.severity")}>S</th><th title={t("assessment.occurrence")}>O</th><th title={t("assessment.detection")}>D</th><th>RPN</th><th>{t("assessment.riskLevel")}</th><th>{t("assessment.recommendation")}</th><th>{t("assessment.operations")}</th></tr></thead><tbody>{paginatedRiskRows.map((row) => <tr key={row.id}><td>{row.rowNumber.toLocaleString(numberLocale)}</td><td className="risk-text-cell">{assessmentProcessName(selectedAssessment, locale)}</td><td className="risk-text-cell"><strong>{row.failureMode}</strong></td><td className="risk-text-cell">{row.effect}</td><td className="risk-text-cell">{row.cause}</td><td className="risk-controls-cell">{row.preventiveControls && <span><b>{t("assessment.preventiveControls")}:</b> {row.preventiveControls}</span>}{row.detectionControls && <span><b>{t("assessment.detectionControls")}:</b> {row.detectionControls}</span>}{!row.preventiveControls && !row.detectionControls && <span>—</span>}</td><td>{row.severity}</td><td>{row.occurrence}</td><td>{row.detection}</td><td><strong className="rpn-number">{row.rpn.toLocaleString(numberLocale)}</strong></td><td><StatusBadge value={row.riskLevel}/></td><td className="risk-text-cell">{row.recommendation || "—"}</td><td><div className="risk-row-actions"><button type="button" className="icon-button" title={t("assessment.viewDetails")} aria-label={t("assessment.viewDetails")} onClick={() => { setViewingItem(row); setEditingItem(null); }}><Icon name="eye" size={16}/></button>{canEdit() && <><button type="button" className="icon-button" title={t("assessment.editRiskRow")} aria-label={t("assessment.editRiskRow")} onClick={() => { setEditingItem(row); setViewingItem(null); }}><Icon name="activity" size={16}/></button><button type="button" className="icon-button danger" title={t("assessment.deleteRow")} aria-label={t("assessment.deleteRow")} onClick={() => void deleteItem(row)}><Icon name="trash" size={16}/></button></>}</div></td></tr>)}</tbody></table></div>{riskPageCount > 1 && <nav className="risk-table-pagination" aria-label={t("assessment.riskPagination")}><span>{t("assessment.riskPageOf", { current: riskPage, total: riskPageCount })}</span><div><button type="button" className="ghost" onClick={() => setRiskPage((page) => Math.max(1, page - 1))} disabled={riskPage === 1}>{t("assessment.previousPage")}</button><button type="button" className="ghost" onClick={() => setRiskPage((page) => Math.min(riskPageCount, page + 1))} disabled={riskPage === riskPageCount}>{t("assessment.nextPage")}</button></div></nav>}</> : <EmptyState title={t("assessment.noRiskMatches")} icon="search"/>}
       </>}
     </SectionCard>}
      {registeredAssessmentsView && selectedAssessment && canEdit() && wizardStep === 2 && <SectionCard title={t("assessment.addRiskRow")} description={t("assessment.scoreDescription")} icon="plus"><AutoSaveForm id="fmea-risk-row-form" storageKey={itemDraftKey} className="fmea-item-form" onSubmit={addItem}><div className="form-grid three"><label><span className="field-label-line"><span>{t("assessment.failureMode")}</span><span className="required-label">{t("common.required")}</span></span><input name="failureMode" placeholder={t("assessment.failureModePlaceholder")} required/></label><label><span className="field-label-line"><span>{t("assessment.effect")}</span><span className="required-label">{t("common.required")}</span></span><input name="effect" placeholder={t("assessment.effectPlaceholder")} required/></label><label><span className="field-label-line"><span>{t("assessment.cause")}</span><span className="required-label">{t("common.required")}</span></span><input name="cause" placeholder={t("assessment.causePlaceholder")} required/></label><label><span className="field-label-line"><span>{t("assessment.preventiveControls")}</span><span className="optional-label">{t("common.optional")}</span></span><input name="preventiveControls" placeholder={t("assessment.existingControls")}/></label><label><span className="field-label-line"><span>{t("assessment.detectionControls")}</span><span className="optional-label">{t("common.optional")}</span></span><input name="detectionControls" placeholder={t("assessment.detectionPlaceholder")}/></label><label className="span-two"><span className="field-label-line"><span>{t("assessment.recommendation")}</span><span className="optional-label">{t("common.optional")}</span></span><textarea name="recommendation" rows={2} placeholder={t("assessment.recommendationPlaceholder")}/></label></div><div className="score-panel"><div className="score-panel-fields"><FmeaScoreField kind="severity" name="severity" value={scores.severity} onChange={(value) => { scoreTouchedRef.current = true; setScores((current) => ({ ...current, severity: value })); }}/><span aria-hidden="true">×</span><FmeaScoreField kind="occurrence" name="occurrence" value={scores.occurrence} onChange={(value) => { scoreTouchedRef.current = true; setScores((current) => ({ ...current, occurrence: value })); }}/><span aria-hidden="true">×</span><FmeaScoreField kind="detection" name="detection" value={scores.detection} onChange={(value) => { scoreTouchedRef.current = true; setScores((current) => ({ ...current, detection: value })); }}/></div><div className="score-panel-actions"><div className="rpn-preview" aria-live="polite"><div className="rpn-preview-copy"><small>{t("assessment.calculatedRpn")}</small><strong>{previewRpn.toLocaleString(numberLocale)}</strong></div><StatusBadge value={previewRiskLevel}/></div><button className="primary" type="submit" disabled={itemCreating}><Icon name="plus"/> {itemCreating ? t("assessment.savingChanges") : t("assessment.calculateRegister")}</button></div></div><FmeaRiskAiAssist autoRequestKey={fmeaAssistantEnabled ? [locale, selectedAssessment.id, selectedAssessment.items.length, selectedAssessment.title, selectedAssessment.department ?? "", selectedAssessment.activityDescription ?? ""].join("|") : ""} getContext={riskRowFormContext} onAccept={applyRiskSuggestionToForm} onAutoAccept={(field, value) => applyRiskSuggestionToForm(field, value, true)} onAcceptScore={(suggestion) => { scoreTouchedRef.current = true; setScores({ severity: suggestion.severity, occurrence: suggestion.occurrence, detection: suggestion.detection }); }} onAutoAcceptScore={(suggestion) => { if (scoreTouchedRef.current) return false; scoreTouchedRef.current = true; setScores({ severity: suggestion.severity, occurrence: suggestion.occurrence, detection: suggestion.detection }); return true; }}/></AutoSaveForm></SectionCard>}
  </section>;
}

export function FmeaPage() { return <FmeaProcessPage/>; }

type FmeaReportItem = FmeaItem & { actionPriority: string; correctiveActions: Array<{ id: string; title: string; status: string; priority: string }> };
type FmeaReportDetailSuggestion = Omit<FmeaItemDraft, "rowNumber">;
type FmeaReportDetailSuggestionsResponse = { suggestions: FmeaReportDetailSuggestion[]; provider: string; aiStatus: "connected" | "fallback" | "unavailable"; minimum: number; createdCount?: number };
type FmeaReportAction = { id: string; title: string; description: string; priority: string; status: string; progress: number; assigneeName: string | null; dueDate: string | null; fmeaItemId: string | null; fmeaItem: { rowNumber: number; failureMode: string } | null };
type FmeaReport = {
  assessment: { id: string; title: string; code: string; status: string; version: number; createdAt: string; updatedAt: string; approvedAt: string | null; fmeaDetailSeeded: boolean; method: string; processName: { fa: string; en: string }; companyName: { fa: string; en: string }; project: { id: string; name: string; code: string }; evaluationTeam: Array<{ id: string; displayName: string; email: string; role: string }> };
  summary: { totalFailureModes: number; highPriorityRisks: number; correctiveActionsNeeded: number; immediateActions: number; distribution: Record<"CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "VERY_LOW", number> };
  items: FmeaReportItem[];
  topFailureModes: FmeaReportItem[];
  suggestedActions: Array<{ id: string; title: string; description: string; fmeaItemId: string; failureMode: string; priority: string; status: string }>;
  actions: FmeaReportAction[];
};

const fmeaReportRiskLevels = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "VERY_LOW"] as const;
const fmeaReportRiskColors: Record<(typeof fmeaReportRiskLevels)[number], string> = { CRITICAL: "#cf4a4d", HIGH: "#e19a31", MEDIUM: "#d7b83f", LOW: "#43a27d", VERY_LOW: "#78c4a1" };

function fmeaReportDonutGradient(distribution: FmeaReport["summary"]["distribution"]) {
  const total = fmeaReportRiskLevels.reduce((sum, level) => sum + Math.max(0, Number(distribution[level]) || 0), 0);
  if (!total) return "conic-gradient(#dfeaf0 0 100%)";
  let cursor = 0;
  const segments = fmeaReportRiskLevels.map((level) => {
    const next = cursor + ((Math.max(0, Number(distribution[level]) || 0) / total) * 100);
    const segment = `${fmeaReportRiskColors[level]} ${cursor}% ${next}%`;
    cursor = next;
    return segment;
  });
  return `conic-gradient(${segments.join(", ")})`;
}

function FmeaReportRiskTable({ report, locale, canEdit, onView, onEdit }: { report: FmeaReport; locale: "fa" | "en"; canEdit: boolean; onView: (item: FmeaReportItem) => void; onEdit: (item: FmeaReportItem) => void }) {
  const { t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const processName = locale === "en" ? report.assessment.processName.en : report.assessment.processName.fa;
  return <div className="table-wrap report-data-table-wrap"><table className="assessment-report-table fmea-report-data-table"><thead><tr><th>{t("assessment.row")}</th><th>{t("assessment.processActivity")}</th><th>{t("assessment.failureMode")}</th><th>{t("assessment.effect")}</th><th>{t("assessment.cause")}</th><th>{t("assessment.existingControls")}</th><th title={t("assessment.severity")}>S</th><th title={t("assessment.occurrence")}>O</th><th title={t("assessment.detection")}>D</th><th>RPN</th><th>{t("assessment.riskLevel")}</th><th>{t("assessment.recommendation")}</th><th>{t("assessment.operations")}</th></tr></thead><tbody>{report.items.map((item) => {
    const controls = [item.preventiveControls, item.detectionControls].filter((value): value is string => Boolean(value?.trim()));
    const linkedActions = item.correctiveActions;
    return <tr key={item.id}><td className="report-table-number">{item.rowNumber.toLocaleString(numberLocale)}</td><td className="report-table-text">{processName}</td><td className="report-table-text"><strong>{item.failureMode}</strong></td><td className="report-table-text">{item.effect}</td><td className="report-table-text">{item.cause}</td><td className="report-table-text"><div className="report-table-stack">{controls.length ? controls.map((control, index) => <span key={`${item.id}-control-${index}`}>{control}</span>) : <span>—</span>}</div></td><td className="report-table-number">{item.severity.toLocaleString(numberLocale)}</td><td className="report-table-number">{item.occurrence.toLocaleString(numberLocale)}</td><td className="report-table-number">{item.detection.toLocaleString(numberLocale)}</td><td className="report-table-number"><strong className="rpn-number">{item.rpn.toLocaleString(numberLocale)}</strong></td><td className="report-table-number"><StatusBadge value={item.riskLevel}/></td><td className="report-table-text"><div className="report-table-stack">{item.recommendation?.trim() && <span><strong>{item.recommendation.trim()}</strong><small><StatusBadge value="SUGGESTED"/></small></span>}{linkedActions.map((action) => <span key={action.id}><strong>{action.title}</strong><small><StatusBadge value={action.status}/> <StatusBadge value={action.priority}/></small></span>)}{!item.recommendation?.trim() && !linkedActions.length && <span>—</span>}</div></td><td className="report-table-number"><div className="report-table-actions" aria-label={t("assessment.operations")}><button type="button" className="icon-button" title={t("assessment.viewDetails")} aria-label={`${t("assessment.viewDetails")}: ${item.failureMode}`} onClick={() => onView(item)}><Icon name="eye" size={15}/></button>{canEdit && <button type="button" className="icon-button" title={t("assessment.editRiskRow")} aria-label={`${t("assessment.editRiskRow")}: ${item.failureMode}`} onClick={() => onEdit(item)}><Icon name="edit" size={15}/></button>}</div></td></tr>;
  })}</tbody></table></div>;
}

function FmeaScoreGuide({ locale }: { locale: "fa" | "en" }) {
  const { t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  return <details className="risk-score-guide"><summary><Icon name="chart" size={16}/>{t("assessment.scoreGuide")}</summary><p>{t("assessment.scoreGuideDescription")}</p><div className="table-wrap"><table className="score-guide-table"><thead><tr><th>{t("assessment.scoreRange")}</th><th>{t("assessment.severity")}</th><th>{t("assessment.occurrence")}</th><th>{t("assessment.detection")}</th></tr></thead><tbody>{fmeaScoreCriteria[locale].severity.map((criterion, index) => <tr key={criterion.score}><td><strong>{criterion.score.toLocaleString(numberLocale)}</strong></td><td><strong>{criterion.label}</strong><small>{criterion.description}</small></td><td><strong>{fmeaScoreCriteria[locale].occurrence[index].label}</strong><small>{fmeaScoreCriteria[locale].occurrence[index].description}</small></td><td><strong>{fmeaScoreCriteria[locale].detection[index].label}</strong><small>{fmeaScoreCriteria[locale].detection[index].description}</small></td></tr>)}</tbody></table></div></details>;
}

function FmeaInteractiveReportRiskTable({ report, locale, canEdit, onView, onEdit, onDelete }: { report: FmeaReport; locale: "fa" | "en"; canEdit: boolean; onView: (item: FmeaReportItem) => void; onEdit: (item: FmeaReportItem) => void; onDelete: (item: FmeaReportItem) => void }) {
  const { t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const processName = locale === "en" ? report.assessment.processName.en : report.assessment.processName.fa;
  const [riskSearch, setRiskSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [riskSort, setRiskSort] = useState<RiskSortField>("rowNumber");
  const [riskSortDirection, setRiskSortDirection] = useState<"asc" | "desc">("asc");
  const [riskPage, setRiskPage] = useState(1);
  const filteredItems = useMemo(() => {
    const query = riskSearch.trim().toLocaleLowerCase(locale === "fa" ? "fa-IR" : "en-US");
    const rows = report.items.filter((item) => {
      if (riskFilter !== "ALL" && item.riskLevel !== riskFilter) return false;
      if (!query) return true;
      const actions = item.correctiveActions.flatMap((action) => [action.title, action.status, action.priority]);
      return [String(item.rowNumber), processName, item.processStep, item.failureMode, item.effect, item.cause, item.preventiveControls, item.detectionControls, String(item.severity), String(item.occurrence), String(item.detection), String(item.rpn), item.riskLevel, item.recommendation, item.actionPriority, ...actions]
        .filter((value): value is string => typeof value === "string")
        .some((value) => value.toLocaleLowerCase(locale === "fa" ? "fa-IR" : "en-US").includes(query));
    });
    return [...rows].sort((left, right) => {
      const comparison = Number(left[riskSort]) - Number(right[riskSort]);
      return (comparison || left.rowNumber - right.rowNumber) * (riskSortDirection === "asc" ? 1 : -1);
    });
  }, [locale, processName, report.items, riskFilter, riskSearch, riskSort, riskSortDirection]);
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / FMEA_RISK_PAGE_SIZE));
  const pageItems = useMemo(() => filteredItems.slice((riskPage - 1) * FMEA_RISK_PAGE_SIZE, riskPage * FMEA_RISK_PAGE_SIZE), [filteredItems, riskPage]);

  useEffect(() => setRiskPage(1), [report.items, riskFilter, riskSearch, riskSort, riskSortDirection]);
  useEffect(() => setRiskPage((page) => Math.min(page, pageCount)), [pageCount]);

  return <>
    <div className="risk-table-toolbar fmea-report-table-toolbar"><label className="search-box risk-table-search"><Icon name="search" size={17}/><span className="sr-only">{t("assessment.riskSearch")}</span><input value={riskSearch} onChange={(event) => setRiskSearch(event.target.value)} placeholder={t("assessment.riskSearchPlaceholder")} aria-label={t("assessment.riskSearch")}/></label><div className="risk-table-controls"><label><span>{t("assessment.riskFilter")}</span><StyledSelect value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)}><option value="ALL">{t("assessment.allRiskLevels")}</option><option value="VERY_LOW">{t("status.veryLow")}</option><option value="LOW">{t("status.low")}</option><option value="MEDIUM">{t("status.medium")}</option><option value="HIGH">{t("status.high")}</option><option value="CRITICAL">{t("status.critical")}</option></StyledSelect></label><label><span>{t("assessment.riskSort")}</span><StyledSelect value={riskSort} onChange={(event) => setRiskSort(event.target.value as RiskSortField)}><option value="rowNumber">{t("assessment.sortRow")}</option><option value="rpn">{t("assessment.sortRpn")}</option><option value="severity">{t("assessment.sortSeverity")}</option><option value="occurrence">{t("assessment.sortOccurrence")}</option><option value="detection">{t("assessment.sortDetection")}</option></StyledSelect></label><button type="button" className="ghost risk-sort-direction" onClick={() => setRiskSortDirection((direction) => direction === "asc" ? "desc" : "asc")} aria-label={t("assessment.toggleSortDirection")}>{riskSortDirection === "asc" ? "↑" : "↓"}</button></div></div>
    <FmeaScoreGuide locale={locale}/>
    {pageItems.length ? <div className="table-wrap report-data-table-wrap fmea-report-table-wrap"><table className="assessment-report-table fmea-report-data-table"><thead><tr><th>{t("assessment.row")}</th><th>{t("assessment.processActivity")}</th><th>{t("assessment.failureMode")}</th><th>{t("assessment.effect")}</th><th>{t("assessment.cause")}</th><th>{t("assessment.existingControls")}</th><th title={t("assessment.severity")}>S</th><th title={t("assessment.occurrence")}>O</th><th title={t("assessment.detection")}>D</th><th>RPN</th><th>{t("assessment.riskLevel")}</th><th>{t("assessment.recommendation")}</th><th>{t("assessment.operations")}</th></tr></thead><tbody>{pageItems.map((item) => {
      const controls = [item.preventiveControls, item.detectionControls].filter((value): value is string => Boolean(value?.trim()));
      const linkedActions = item.correctiveActions;
      return <tr key={item.id}><td className="report-table-number">{item.rowNumber.toLocaleString(numberLocale)}</td><td className="report-table-text">{processName}</td><td className="report-table-text"><strong>{item.failureMode}</strong></td><td className="report-table-text">{item.effect}</td><td className="report-table-text">{item.cause}</td><td className="report-table-text"><div className="report-table-stack">{controls.length ? controls.map((control, index) => <span key={`${item.id}-control-${index}`}>{control}</span>) : <span>—</span>}</div></td><td className="report-table-number">{item.severity.toLocaleString(numberLocale)}</td><td className="report-table-number">{item.occurrence.toLocaleString(numberLocale)}</td><td className="report-table-number">{item.detection.toLocaleString(numberLocale)}</td><td className="report-table-number"><strong className="rpn-number">{item.rpn.toLocaleString(numberLocale)}</strong></td><td className="report-table-number"><StatusBadge value={item.riskLevel}/></td><td className="report-table-text"><div className="report-table-stack">{item.recommendation?.trim() && <span><strong>{item.recommendation.trim()}</strong><small><StatusBadge value="SUGGESTED"/></small></span>}{linkedActions.map((action) => <span key={action.id}><strong>{action.title}</strong><small><StatusBadge value={action.status}/> <StatusBadge value={action.priority}/></small></span>)}{!item.recommendation?.trim() && !linkedActions.length && <span>—</span>}</div></td><td className="report-table-number"><div className="report-table-actions" aria-label={t("assessment.operations")}><button type="button" className="icon-button" title={t("assessment.viewDetails")} aria-label={`${t("assessment.viewDetails")}: ${item.failureMode}`} onClick={() => onView(item)}><Icon name="eye" size={15}/></button>{canEdit && <><button type="button" className="icon-button" title={t("assessment.editRiskRow")} aria-label={`${t("assessment.editRiskRow")}: ${item.failureMode}`} onClick={() => onEdit(item)}><Icon name="edit" size={15}/></button><button type="button" className="icon-button danger" title={t("assessment.deleteRow")} aria-label={`${t("assessment.deleteRow")}: ${item.failureMode}`} onClick={() => onDelete(item)}><Icon name="trash" size={15}/></button></>}</div></td></tr>;
    })}</tbody></table></div> : <EmptyState title={t("assessment.noRiskMatches")} icon="search"/>}
    {pageCount > 1 && <nav className="risk-table-pagination" aria-label={t("assessment.riskPagination")}><span>{t("assessment.riskPageOf", { current: riskPage, total: pageCount })}</span><div><button type="button" className="ghost" onClick={() => setRiskPage((page) => Math.max(1, page - 1))} disabled={riskPage === 1}>{t("assessment.previousPage")}</button><button type="button" className="ghost" onClick={() => setRiskPage((page) => Math.min(pageCount, page + 1))} disabled={riskPage === pageCount}>{t("assessment.nextPage")}</button></div></nav>}
  </>;
}

function FmeaReportItemDetailsDialog({ item, locale, canEdit, onClose, onEdit }: { item: FmeaReportItem; locale: "fa" | "en"; canEdit: boolean; onClose: () => void; onEdit: () => void }) {
  const { t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const controls = [item.preventiveControls, item.detectionControls].filter((value): value is string => Boolean(value?.trim()));
  return <div className="fmea-report-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="fmea-report-dialog" role="dialog" aria-modal="true" aria-labelledby="fmea-report-detail-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="fmea-report-dialog-head"><div><strong id="fmea-report-detail-title">{t("assessment.riskDetails")}</strong><small>{item.failureMode}</small></div><button type="button" className="icon-button" onClick={onClose} aria-label={t("assessment.closeDetails")}><span aria-hidden="true">×</span></button></div>
      <div className="fmea-report-detail-grid">
        <div><span>{t("assessment.row")}</span><strong>{item.rowNumber.toLocaleString(numberLocale)}</strong></div>
        <div><span>{t("assessment.processActivity")}</span><strong>{item.processStep}</strong></div>
        <div><span>{t("assessment.failureMode")}</span><strong>{item.failureMode}</strong></div>
        <div><span>{t("assessment.effect")}</span><strong>{item.effect}</strong></div>
        <div><span>{t("assessment.cause")}</span><strong>{item.cause}</strong></div>
        <div><span>{t("assessment.recommendation")}</span><strong>{item.recommendation?.trim() || "—"}</strong></div>
        <div className="fmea-report-detail-wide"><span>{t("assessment.existingControls")}</span><strong>{controls.length ? controls.join(" · ") : "—"}</strong></div>
      </div>
      <div className="fmea-report-detail-scores"><span><b>S</b>{item.severity.toLocaleString(numberLocale)}</span><span><b>O</b>{item.occurrence.toLocaleString(numberLocale)}</span><span><b>D</b>{item.detection.toLocaleString(numberLocale)}</span><span><b>RPN</b>{item.rpn.toLocaleString(numberLocale)}</span><StatusBadge value={item.riskLevel}/></div>
      <div className="fmea-report-dialog-actions"><button type="button" className="ghost" onClick={onClose}>{t("assessment.closeDetails")}</button>{canEdit && <button type="button" className="primary" onClick={onEdit}><Icon name="edit" size={15}/>{t("assessment.editRiskRow")}</button>}</div>
    </section>
  </div>;
}

function FmeaReportDetailSuggestionsPanel({ suggestions, locale, canEdit, loading, status, error, onAddProcess, onChange, onAdd, onRemove }: { suggestions: FmeaReportDetailSuggestion[]; locale: "fa" | "en"; canEdit: boolean; loading: boolean; status: ProcessSuggestionResponse["aiStatus"] | null; error: string; onAddProcess: () => void; onChange: <K extends keyof FmeaReportDetailSuggestion>(index: number, key: K, value: FmeaReportDetailSuggestion[K]) => void; onAdd: (index: number) => void; onRemove: (index: number) => void }) {
  const { t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const fields: Array<{ key: "processStep" | "failureMode" | "effect" | "cause" | "preventiveControls" | "detectionControls" | "recommendation"; label: string; area?: boolean }> = [
    { key: "processStep", label: t("assessment.processActivity") },
    { key: "failureMode", label: t("assessment.failureMode") },
    { key: "effect", label: t("assessment.effect") },
    { key: "cause", label: t("assessment.cause") },
    { key: "preventiveControls", label: t("assessment.preventiveControls") },
    { key: "detectionControls", label: t("assessment.detectionControls") },
    { key: "recommendation", label: t("assessment.recommendation"), area: true },
  ];
  return <section className="fmea-report-ai-details" aria-labelledby="fmea-report-ai-details-title"><div className="fmea-report-ai-details-head"><div><strong id="fmea-report-ai-details-title">{t("report.aiDetailsTitle")}</strong><small>{t("report.aiDetailsDescription")}</small></div>{canEdit && <button type="button" className="primary" onClick={onAddProcess}><Icon name="plus" size={15}/>{t("report.addProcess")}</button>}</div>{loading && <span className="ai-status loading"><span className="spinner"/>{t("report.aiDetailsWorking")}</span>}{status && !loading && <span className={`ai-status ${status}`}>{t(`assessment.aiStatus.${status}`)}</span>}{error && <small className="field-error" role="alert">{error}</small>}{suggestions.length > 0 && <div className="fmea-report-ai-details-list">{suggestions.map((suggestion, index) => <article className="fmea-report-ai-detail-card" key={`${index}-${suggestion.failureMode || suggestion.processStep}`}><div className="fmea-report-ai-detail-card-head"><strong>#{(index + 1).toLocaleString(numberLocale)}</strong><span>{t("report.aiDraftLabel")}</span>{canEdit && <button type="button" className="icon-button" onClick={() => onRemove(index)} aria-label={t("report.removeAiDetail")} title={t("report.removeAiDetail")}><span aria-hidden="true">×</span></button>}</div><div className="form-grid three">{fields.map((field) => <label className={field.area ? "span-two" : ""} key={field.key}>{field.label}{field.area ? <textarea rows={2} value={suggestion[field.key]} disabled={!canEdit} onChange={(event) => onChange(index, field.key, event.target.value)}/> : <input value={suggestion[field.key]} disabled={!canEdit} onChange={(event) => onChange(index, field.key, event.target.value)}/>}</label>)}</div><div className="score-panel fmea-report-ai-score-panel"><div className="score-panel-fields"><FmeaScoreField kind="severity" name={`ai-detail-${index}-severity`} value={suggestion.severity} disabled={!canEdit} idPrefix={`fmea-ai-detail-${index}`} onChange={(value) => onChange(index, "severity", value)}/><span aria-hidden="true">×</span><FmeaScoreField kind="occurrence" name={`ai-detail-${index}-occurrence`} value={suggestion.occurrence} disabled={!canEdit} idPrefix={`fmea-ai-detail-${index}`} onChange={(value) => onChange(index, "occurrence", value)}/><span aria-hidden="true">×</span><FmeaScoreField kind="detection" name={`ai-detail-${index}-detection`} value={suggestion.detection} disabled={!canEdit} idPrefix={`fmea-ai-detail-${index}`} onChange={(value) => onChange(index, "detection", value)}/></div>{canEdit && <button type="button" className="primary" onClick={() => onAdd(index)}><Icon name="plus" size={14}/>{t("report.addAiDetail")}</button>}</div></article>)}</div>}{!canEdit && suggestions.length > 0 && <small className="fmea-report-ai-details-note">{t("report.aiDetailsReadOnly")}</small>}</section>;
}

export function FmeaReportPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const state = useLoad<FmeaReport>(id ? `/fmea/${id}/report` : null, [id]);
  const { locale, t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionSaving, setActionSaving] = useState(false);
  const [updatingActionId, setUpdatingActionId] = useState("");
  const [showActionForm, setShowActionForm] = useState(false);
  const [actionFormScrollRequest, setActionFormScrollRequest] = useState(0);
  const [viewingReportItem, setViewingReportItem] = useState<FmeaReportItem | null>(null);
  const [editingReportItem, setEditingReportItem] = useState<FmeaReportItem | null>(null);
  const [reportItemSaving, setReportItemSaving] = useState(false);
  const [aiDetailLoading, setAiDetailLoading] = useState(false);
  const [aiDetailError, setAiDetailError] = useState("");
  const aiDetailRequestKeyRef = useRef("");
  const actionFormRef = useRef<HTMLDivElement>(null);
  const [actionDraft, setActionDraft] = useState<{ title: string; description: string; fmeaItemId: string; priority: string }>({ title: "", description: "", fmeaItemId: "", priority: "MEDIUM" });
  const dialog = useDialog();
  const canEditActions = ["SUPER_ADMIN", "ORG_ADMIN", "HSE_MANAGER", "HSE_SPECIALIST", "HSE_OFFICER", "ASSISTANT", "ASSESSOR"].includes(getCurrentRole());
  const report = state.data;
  const processName = report ? (locale === "en" ? report.assessment.processName.en : report.assessment.processName.fa) : "";
  const companyName = report ? (locale === "en" ? report.assessment.companyName.en : report.assessment.companyName.fa) : "";
  const completedActionCount = report?.actions.filter((action) => action.status === "COMPLETED").length ?? 0;
  const inProgressActionCount = report?.actions.filter((action) => ["ASSIGNED", "IN_PROGRESS", "WAITING_FOR_REVIEW"].includes(action.status)).length ?? 0;
  const remainingActionCount = report ? Math.max(0, report.actions.length - completedActionCount - inProgressActionCount) : 0;
  const actionCompletionPercent = report?.actions.length ? Math.round(report.actions.reduce((sum, action) => sum + Math.min(100, Math.max(0, Number(action.progress) || 0)), 0) / report.actions.length) : 0;

  useEffect(() => {
    if (!showActionForm) return;
    const frame = window.requestAnimationFrame(() => {
      const formAnchor = actionFormRef.current;
      if (!formAnchor) return;
      formAnchor.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start", inline: "nearest" });
      formAnchor.querySelector<HTMLInputElement>('input[name="title"]')?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [showActionForm, actionFormScrollRequest]);

  async function saveReport() {
    if (!id) return;
    setSaving(true); setError(""); setMessage("");
    try { await api(`/fmea/${id}/report/save`, { method: "POST" }); setMessage(t("report.saved")); }
    catch (reason) { setError((reason as Error).message); }
    finally { setSaving(false); }
  }

  function downloadFmeaReport(format: "xlsx" | "pdf" | "docx") {
    if (!id || !report) return;
    void saveBlob(`/reports/fmea/${id}.${format}`, `${report.assessment.code}.${format}`).catch((reason) => setError((reason as Error).message));
  }

  async function approveReport() {
    if (!id || !report || report.assessment.status === "APPROVED" || !(await dialog.confirm(t("assessment.approveConfirm", { title: report.assessment.title })))) return;
    setSaving(true); setError(""); setMessage("");
    try { await api(`/fmea/${id}`, { method: "PATCH", body: JSON.stringify({ status: "APPROVED" }) }); setMessage(t("assessment.approvedMessage")); state.reload(); }
    catch (reason) { setError((reason as Error).message); }
    finally { setSaving(false); }
  }

  async function deleteReport() {
    if (!id || !report || !(await dialog.confirm(t("assessment.deleteConfirm", { title: report.assessment.title })))) return;
    setSaving(true); setError("");
    try { await api(`/fmea/${id}`, { method: "DELETE" }); navigate("/fmea?view=registered", { replace: true }); }
    catch (reason) { setError((reason as Error).message); setSaving(false); }
  }

  function chooseSuggestion(suggestion: FmeaReport["suggestedActions"][number]) {
    setActionDraft({ title: suggestion.title, description: suggestion.description, fmeaItemId: suggestion.fmeaItemId, priority: suggestion.priority });
    setShowActionForm(true);
    setActionFormScrollRequest((request) => request + 1);
  }

  function openManualActionForm() {
    setShowActionForm(true);
    setActionFormScrollRequest((request) => request + 1);
  }

  async function createAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!report || actionSaving) return;
    const form = new FormData(event.currentTarget);
    setActionSaving(true); setError(""); setMessage("");
    try {
      await api("/actions", { method: "POST", body: JSON.stringify({ projectId: report.assessment.project.id, fmeaId: report.assessment.id, fmeaItemId: String(form.get("fmeaItemId") || "") || null, title: String(form.get("title") || ""), description: String(form.get("description") || ""), priority: String(form.get("priority") || "MEDIUM"), status: String(form.get("status") || "OPEN"), assigneeName: String(form.get("assigneeName") || "") || null, dueDate: String(form.get("dueDate") || "") || null }) });
      setActionDraft({ title: "", description: "", fmeaItemId: "", priority: "MEDIUM" }); setShowActionForm(false); setMessage(t("report.actionCreated")); state.reload();
    } catch (reason) { setError((reason as Error).message); }
    finally { setActionSaving(false); }
  }

  async function updateActionStatus(actionId: string, status: string) {
    if (updatingActionId) return;
    setUpdatingActionId(actionId); setError("");
    try { await api(`/actions/${actionId}`, { method: "PATCH", body: JSON.stringify({ status }) }); state.reload(); }
    catch (reason) { setError((reason as Error).message); }
    finally { setUpdatingActionId(""); }
  }

  async function requestAiDetailSuggestions() {
    if (!id || !report || aiDetailLoading) return;
    const autoCreate = !report.assessment.fmeaDetailSeeded && canEditActions;
    if (!autoCreate) return;
    setAiDetailLoading(true); setAiDetailError("");
    try {
      const result = await api<FmeaReportDetailSuggestionsResponse>(`/fmea/${id}/report/detail-suggestions`, { method: "POST", body: JSON.stringify({ locale, autoCreate }) });
      if (result.data.createdCount) setMessage(t("report.aiDetailsAutoAdded", { count: result.data.createdCount }));
      state.reload();
    } catch (reason) {
      setAiDetailError((reason as Error).message);
    } finally { setAiDetailLoading(false); }
  }

  useEffect(() => {
    if (!report || !id || report.assessment.fmeaDetailSeeded || !canEditActions) return;
    const requestKey = `${id}:${locale}:${report.items.length}:pending`;
    if (aiDetailRequestKeyRef.current === requestKey) return;
    aiDetailRequestKeyRef.current = requestKey;
    void requestAiDetailSuggestions();
  }, [id, locale, report?.assessment.id, report?.items.length, canEditActions]);

  async function saveReportItem(draftValue: FmeaItemDraft) {
    if (!id || !editingReportItem) return;
    setReportItemSaving(true); setError(""); setMessage("");
    try {
      await api(`/fmea/${id}/items/${editingReportItem.id}`, { method: "PATCH", body: JSON.stringify({ ...draftValue, preventiveControls: draftValue.preventiveControls || null, detectionControls: draftValue.detectionControls || null, recommendation: draftValue.recommendation || null }) });
      setEditingReportItem(null); setViewingReportItem(null); setMessage(t("report.itemUpdated")); state.reload();
    } catch (reason) { setError((reason as Error).message); }
    finally { setReportItemSaving(false); }
  }

  async function deleteReportItem(item: FmeaReportItem) {
    if (!id || !(await dialog.confirm(t("assessment.deleteRowConfirm")))) return;
    setError("");
    try { await api(`/fmea/${id}/items/${item.id}`, { method: "DELETE" }); setViewingReportItem(null); setEditingReportItem(null); state.reload(); }
    catch (reason) { setError((reason as Error).message); }
  }

  function goToPreviousStep() {
    if (id && canEditActions) {
      navigate(`/fmea?edit=${encodeURIComponent(id)}&step=2`);
      return;
    }
    navigate("/fmea");
  }

  if (state.loading) return <section className="page-shell"><div className="state"><div className="spinner"/><p>{t("common.loading")}</p></div></section>;
  if (state.error || !report) return <section className="page-shell"><div className="state error-state"><span className="state-icon"><Icon name="warning" size={27}/></span><h3>{t("common.loadFailed")}</h3><p>{state.error || t("report.notFound")}</p><button className="primary" onClick={state.reload}>{t("common.retry")}</button></div></section>;

  return <section className="page-shell fmea-report-page">
     <PageHeader eyebrow={t("report.eyebrow")} title={t("report.title")} description={`${report.assessment.title} · ${report.assessment.code}`} actions={<div className="page-actions-inline"><button type="button" className="ghost" onClick={goToPreviousStep}><Icon name="arrow" className="back-arrow"/> {canEditActions ? t("assessment.previousStep") : t("report.back")}</button><button type="button" className="ghost" onClick={() => downloadFmeaReport("xlsx")}><Icon name="download"/> Excel</button><button type="button" className="ghost" onClick={() => downloadFmeaReport("pdf")}><Icon name="download"/> PDF</button><button type="button" className="ghost" onClick={() => downloadFmeaReport("docx")}><Icon name="download"/> Word</button>{canEditActions && report.assessment.status !== "APPROVED" && <button type="button" className="primary" onClick={() => void approveReport()} disabled={saving}><Icon name="check"/> {t("assessment.approve")}</button>}{canEditActions && <button type="button" className="ghost danger-button" onClick={() => void deleteReport()} disabled={saving}><Icon name="trash"/> {t("common.delete")}</button>}<button type="button" className="ghost" onClick={() => void saveReport()} disabled={saving}><Icon name="check"/> {saving ? t("report.saving") : t("report.save")}</button></div>}/>
     <FmeaReportStepper onStepClick={canEditActions && id ? (step) => navigate(`/fmea?edit=${encodeURIComponent(id)}&step=${step}`) : undefined}/>
     {error && <div className="alert error" role="alert"><Icon name="warning"/>{error}</div>}{message && <div className="alert success" role="status"><Icon name="check"/>{message}</div>}
    <div className="fmea-report-status-row"><span className="fmea-report-completion-badge"><Icon name="check" size={14}/>{report.assessment.status === "APPROVED" ? t("report.assessmentCompleted") : <StatusBadge value={report.assessment.status}/>}</span><span className="fmea-report-code">{report.assessment.code}</span></div>
    <SectionCard className="fmea-report-header" title={t("report.header")} icon="fmea">
      <div className="report-meta-grid"><div><small>{t("report.process")}</small><strong>{processName}</strong></div><div><small>{t("report.company")}</small><strong>{companyName}</strong></div><div><small>{t("report.date")}</small><strong>{formatDate(report.assessment.approvedAt ?? report.assessment.updatedAt)}</strong></div><div><small>{t("report.method")}</small><strong>{report.assessment.method}</strong></div><div><small>{t("report.team")}</small><strong>{report.assessment.evaluationTeam.length.toLocaleString(numberLocale)} {t("report.teamMembers")}</strong></div></div>
      <div className="report-team-list">{report.assessment.evaluationTeam.map((member) => <span className="report-team-member" key={member.id}><span className="report-team-avatar">{member.displayName.slice(0, 1)}</span><span><b>{member.displayName}</b><small>{member.email}</small></span></span>)}</div>
    </SectionCard>
    <div className="fmea-report-dashboard-grid">
      <SectionCard className="fmea-report-dashboard-panel fmea-report-summary-panel" title={t("report.summary")} icon="warning"><div className="report-summary-grid"><div className="report-stat"><span>{t("report.totalFailureModes")}</span><strong>{report.summary.totalFailureModes.toLocaleString(numberLocale)}</strong><Icon name="fmea"/></div><div className="report-stat danger"><span>{t("report.highPriorityRisks")}</span><strong>{report.summary.highPriorityRisks.toLocaleString(numberLocale)}</strong><Icon name="warning"/></div><div className="report-stat warning"><span>{t("report.correctiveActionsNeeded")}</span><strong>{report.summary.correctiveActionsNeeded.toLocaleString(numberLocale)}</strong><Icon name="actions"/></div><div className="report-stat critical"><span>{t("report.immediateActions")}</span><strong>{report.summary.immediateActions.toLocaleString(numberLocale)}</strong><Icon name="shield"/></div></div></SectionCard>
      <SectionCard className="fmea-report-dashboard-panel fmea-report-distribution-panel" title={t("report.riskDistribution")} description={t("report.riskDistributionDescription")} icon="chart"><div className="fmea-risk-distribution-visual"><div className="fmea-risk-donut" style={{ background: fmeaReportDonutGradient(report.summary.distribution) }} role="img" aria-label={t("report.riskDistribution") }><div className="fmea-risk-donut-label"><span>{report.summary.totalFailureModes.toLocaleString(numberLocale)}</span><small>{t("report.totalFailureModes")}</small></div></div><div className="fmea-risk-legend">{fmeaReportRiskLevels.map((level) => <div key={level}><span className="fmea-risk-legend-dot" style={{ background: fmeaReportRiskColors[level] }}/><StatusBadge value={level}/><strong>{report.summary.distribution[level].toLocaleString(numberLocale)}</strong></div>)}</div></div></SectionCard>
      <SectionCard className="fmea-report-dashboard-panel fmea-report-progress-panel" title={t("report.actionCompletion")} icon="actions"><div className="fmea-action-progress-layout"><div className="fmea-action-progress-ring" style={{ background: `conic-gradient(#138a61 ${actionCompletionPercent}%, #e6eef2 0)` }} role="img" aria-label={`${actionCompletionPercent}%`}><div><strong>{actionCompletionPercent.toLocaleString(numberLocale)}%</strong><small>{t("report.completed")}</small></div></div><div className="fmea-action-progress-list"><div><span className="completed-dot"/>{t("report.completed")}<strong>{completedActionCount.toLocaleString(numberLocale)}</strong></div><div><span className="in-progress-dot"/>{t("report.inProgress")}<strong>{inProgressActionCount.toLocaleString(numberLocale)}</strong></div><div><span className="remaining-dot"/>{t("report.remaining")}<strong>{remainingActionCount.toLocaleString(numberLocale)}</strong></div></div></div></SectionCard>
    </div>
     <div className="report-two-column fmea-report-primary-grid"><SectionCard title={t("report.topFailureModes")} description={t("report.topFailureModesDescription")} icon="warning"><div className="report-top-list">{report.topFailureModes.length ? report.topFailureModes.map((item) => <article className="report-top-item" key={item.id}><div className="report-top-index">{item.rowNumber.toLocaleString(numberLocale)}</div><div className="report-top-copy"><strong>{item.failureMode}</strong><small>{item.effect}</small></div><div className="report-score-trio"><span><b>S</b>{item.severity}</span><span><b>O</b>{item.occurrence}</span><span><b>D</b>{item.detection}</span><span><b>AP</b><StatusBadge value={item.actionPriority}/></span><span><b>RPN</b>{item.rpn.toLocaleString(numberLocale)}</span></div></article>) : <EmptyState title={t("report.noFailureModes")} icon="fmea"/>}</div></SectionCard><SectionCard title={t("report.proposedActions")} description={t("report.proposedActionsDescription")} icon="actions" actions={canEditActions ? <button type="button" className="primary" onClick={openManualActionForm}><Icon name="plus"/> {t("report.addManualAction")}</button> : undefined}>{report.suggestedActions.length ? <div className="report-action-list">{report.suggestedActions.map((item) => <article className="report-action-row" key={item.id}><div className="report-action-icon"><Icon name="sparkles" size={17}/></div><div><strong>{item.title}</strong><small>{t("report.relatedRisk")}: {item.failureMode}</small><small>{t("actions.assignee")}: {t("common.none")}</small></div><StatusBadge value={item.priority}/><StatusBadge value="SUGGESTED"/>{canEditActions && <button className="text-button" type="button" onClick={() => chooseSuggestion(item)}>{t("report.useSuggestion")}</button>}</article>)}</div> : <EmptyState title={t("report.noSuggestedActions")} icon="actions"/>}</SectionCard></div>
     {showActionForm && canEditActions && <div ref={actionFormRef} className="report-action-form-anchor"><SectionCard className="report-action-form-card" title={t("report.manualActionTitle")} description={t("report.manualActionDescription")} icon="plus"><form className="report-action-form" onSubmit={createAction}><label>{t("actions.titleLabel")}<input name="title" value={actionDraft.title} onChange={(event) => setActionDraft((draft) => ({ ...draft, title: event.target.value }))} placeholder={t("actions.titlePlaceholder")} required/></label><label>{t("actions.priority")}<StyledSelect name="priority" value={actionDraft.priority} onChange={(event) => setActionDraft((draft) => ({ ...draft, priority: event.target.value }))}><option value="CRITICAL">{t("status.critical")}</option><option value="HIGH">{t("status.high")}</option><option value="MEDIUM">{t("status.medium")}</option><option value="LOW">{t("status.low")}</option></StyledSelect></label><label>{t("report.relatedRisk")}<StyledSelect name="fmeaItemId" value={actionDraft.fmeaItemId} onChange={(event) => setActionDraft((draft) => ({ ...draft, fmeaItemId: event.target.value }))}><option value="">{t("report.noRelatedRisk")}</option>{report.items.map((item) => <option key={item.id} value={item.id}>#{item.rowNumber} · {item.failureMode}</option>)}</StyledSelect></label><label>{t("actions.statusColumn")}<StyledSelect name="status" defaultValue="OPEN"><option value="OPEN">{t("report.actionStatusNew")}</option><option value="ASSIGNED">{t("report.actionStatusWaiting")}</option><option value="IN_PROGRESS">{t("status.inProgress")}</option><option value="WAITING_FOR_REVIEW">{t("status.waitingForReview")}</option></StyledSelect></label><label>{t("actions.assignee")}<StyledSelect name="assigneeName" defaultValue=""><option value="">{t("common.none")}</option>{report.assessment.evaluationTeam.map((member) => <option key={member.id} value={member.displayName}>{member.displayName}</option>)}</StyledSelect></label><label>{t("actions.dueDate")}<LocalizedDateInput name="dueDate" ariaLabel={t("actions.dueDate")}/></label><label className="report-action-description">{t("actions.detailsLabel")}<textarea name="description" rows={3} value={actionDraft.description} onChange={(event) => setActionDraft((draft) => ({ ...draft, description: event.target.value }))} placeholder={t("actions.detailsPlaceholder")} required/></label><div className="report-action-form-actions"><button className="ghost" type="button" onClick={() => setShowActionForm(false)} disabled={actionSaving}>{t("common.cancel")}</button><button className="primary" type="submit" disabled={actionSaving}><Icon name="check"/> {actionSaving ? t("report.registeringAction") : t("report.registerAction")}</button></div></form></SectionCard></div>}
    <SectionCard title={t("report.actionRegister")} description={t("report.actionRegisterDescription")} icon="actions"><>{report.actions.length ? <div className="table-wrap"><table className="report-action-table"><thead><tr><th>{t("actions.action")}</th><th>{t("report.relatedRisk")}</th><th>{t("actions.priorityColumn")}</th><th>{t("actions.assigneeColumn")}</th><th>{t("actions.statusColumn")}</th><th>{t("actions.progress")}</th></tr></thead><tbody>{report.actions.map((item) => <tr key={item.id}><td><strong>{item.title}</strong><small>{item.description}</small></td><td>{item.fmeaItem ? `#${item.fmeaItem.rowNumber} · ${item.fmeaItem.failureMode}` : t("common.none")}</td><td><StatusBadge value={item.priority}/></td><td>{item.assigneeName ?? t("common.none")}</td><td>{canEditActions ? <StyledSelect className="compact-select" value={item.status} disabled={updatingActionId === item.id} onChange={(event) => void updateActionStatus(item.id, event.target.value)}><option value="OPEN">{t("report.actionStatusNew")}</option><option value="ASSIGNED">{t("report.actionStatusWaiting")}</option><option value="IN_PROGRESS">{t("status.inProgress")}</option><option value="WAITING_FOR_REVIEW">{t("status.waitingForReview")}</option><option value="COMPLETED">{t("status.completed")}</option><option value="REJECTED">{t("status.rejected")}</option><option value="OVERDUE">{t("status.overdue")}</option><option value="CANCELLED">{t("status.cancelled")}</option></StyledSelect> : <StatusBadge value={item.status}/>}</td><td><div className="table-progress"><div><span style={{ width: `${item.progress}%` }}/></div><b>{item.progress.toLocaleString(numberLocale)}%</b></div></td></tr>)}</tbody></table></div> : <EmptyState title={t("report.noActions")} icon="actions"/>}</></SectionCard>
      <SectionCard className="report-details-card" title={t("report.fullDetails")} description={t("report.fullDetailsDescription")} icon="fmea"><details open><summary>{t("report.expandDetails")}</summary>{aiDetailLoading && <div className="fmea-report-ai-seed-status" role="status" aria-live="polite"><span className="spinner"/>{t("report.aiDetailsWorking")}</div>}{aiDetailError && <div className="fmea-report-ai-seed-status error" role="alert"><span>{aiDetailError}</span><button type="button" className="text-button" onClick={() => { aiDetailRequestKeyRef.current = ""; void requestAiDetailSuggestions(); }}>{t("common.retry")}</button></div>}<FmeaInteractiveReportRiskTable report={report} locale={locale} canEdit={canEditActions} onView={setViewingReportItem} onEdit={setEditingReportItem} onDelete={(item) => void deleteReportItem(item)}/></details></SectionCard>
     <div className="report-bottom-actions"><button type="button" className="ghost" onClick={() => navigate("/fmea")}><Icon name="arrow" className="back-arrow"/> {t("report.back")}</button><div><button type="button" className="ghost" onClick={() => void saveReport()} disabled={saving}><Icon name="check"/> {saving ? t("report.saving") : t("report.save")}</button>{canEditActions && report.assessment.status !== "APPROVED" && <button type="button" className="primary" onClick={() => void approveReport()} disabled={saving}><Icon name="check"/> {t("assessment.approve")}</button>}</div></div>
    {viewingReportItem && !editingReportItem && <FmeaReportItemDetailsDialog item={viewingReportItem} locale={locale} canEdit={canEditActions} onClose={() => setViewingReportItem(null)} onEdit={() => { setEditingReportItem(viewingReportItem); setViewingReportItem(null); }}/>}
    {editingReportItem && <div className="fmea-report-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !reportItemSaving) setEditingReportItem(null); }}><section className="fmea-report-editor-dialog" role="dialog" aria-modal="true" aria-label={t("assessment.editRiskRow")} onMouseDown={(event) => event.stopPropagation()}><FmeaItemEditor key={editingReportItem.id} item={editingReportItem} saving={reportItemSaving} onCancel={() => setEditingReportItem(null)} onSave={saveReportItem}/></section></div>}
  </section>;
}

const rulaPostureRows: Array<{ key: RulaPosturePart; labelKey: string; group: "A" | "B" }> = [
  { key: "upperArm", labelKey: "assessment.upperArm", group: "A" },
  { key: "lowerArm", labelKey: "assessment.lowerArm", group: "A" },
  { key: "wrist", labelKey: "assessment.wrist", group: "A" },
  { key: "wristTwist", labelKey: "assessment.wristTwist", group: "A" },
  { key: "neck", labelKey: "assessment.neck", group: "B" },
  { key: "trunk", labelKey: "assessment.trunk", group: "B" },
  { key: "legs", labelKey: "assessment.legs", group: "B" },
];

const rulaGroupARows = rulaPostureRows.filter((row) => row.group === "A");
const rulaGroupBRows = rulaPostureRows.filter((row) => row.group === "B");

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function postureScore(value: unknown, fallback: number) {
  const score = Number(value);
  return Number.isInteger(score) && score >= 1 && score <= 6 ? score : fallback;
}

function hasPostureScore(value: unknown) {
  const score = Number(value);
  return Number.isInteger(score) && score >= 1 && score <= 6;
}

function postureAngle(value: unknown) {
  const angle = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(angle) || angle < -180 || angle > 180 ? null : angle;
}

function postureAnalysisRowsFromValue(value: unknown): RulaSinglePostureAnalysis {
  const source = isRecord(value) ? value : {};
  return Object.fromEntries(rulaPostureRows.map(({ key }) => {
    const candidate = isRecord(source[key]) ? source[key] : {};
    const score = hasPostureScore(candidate.score) ? postureScore(candidate.score, 1) : 1;
    const postureSource = candidate.source === "AI" || candidate.source === "USER" || candidate.source === "DEFAULT" ? candidate.source : "DEFAULT";
    return [key, {
      angle: postureAngle(candidate.angle),
      score,
      detected: typeof candidate.detected === "boolean" ? candidate.detected : key === "wristTwist" ? score > 1 : false,
      source: postureSource,
      confirmedByUser: candidate.confirmedByUser === true && postureSource !== "DEFAULT",
      confidence: typeof candidate.confidence === "number" && Number.isFinite(candidate.confidence) ? candidate.confidence : null,
    } satisfies RulaPostureRow];
  })) as RulaSinglePostureAnalysis;
}

function postureAnalysisFromValue(value: unknown): RulaPostureAnalysis {
  const source = isRecord(value) ? value : {};
  const direct = postureAnalysisRowsFromValue(source);
  const rawSides = isRecord(source.sideAnalyses) ? source.sideAnalyses : {};
  const sideAnalyses = Object.fromEntries((["LEFT", "RIGHT"] as const).filter((side) => isRecord(rawSides[side])).map((side) => [side, postureAnalysisRowsFromValue(rawSides[side])])) as Partial<Record<RulaBodySide, RulaSinglePostureAnalysis>>;
  return Object.keys(sideAnalyses).length ? { ...direct, sideAnalyses } : direct;
}

function parsePostureAnalysis(value: unknown) {
  if (typeof value === "string") {
    try { return postureAnalysisFromValue(JSON.parse(value)); } catch { return postureAnalysisFromValue(null); }
  }
  return postureAnalysisFromValue(value);
}

function rulaInputsFromAnalysis(analysis: RulaPostureAnalysis, force: number, muscleUse: boolean): RulaInput {
  return { upperArm: analysis.upperArm.score, lowerArm: analysis.lowerArm.score, wrist: analysis.wrist.score, wristTwist: analysis.wristTwist.score, neck: analysis.neck.score, trunk: analysis.trunk.score, legs: analysis.legs.score, muscleUse, force };
}

function rulaMuscleUseFromValue(value: unknown) {
  return value === true || value === 1 || value === "1" || value === "true" || value === "on";
}

function withBothSideAnalyses(analysis: RulaPostureAnalysis): RulaPostureAnalysis {
  const left = analysis.sideAnalyses?.LEFT ?? { ...analysis, sideAnalyses: undefined };
  const right = analysis.sideAnalyses?.RIGHT ?? { ...analysis, sideAnalyses: undefined };
  return { ...right, sideAnalyses: { LEFT: left, RIGHT: right } };
}

function hasUnconfirmedRulaResults(analysis: RulaPostureAnalysis, bodySide: "LEFT" | "RIGHT" | "BOTH") {
  const sides = bodySide === "BOTH" ? [analysis.sideAnalyses?.LEFT, analysis.sideAnalyses?.RIGHT] : [analysis];
  return sides.some((side) => !isRulaSingleAnalysisReviewed(side));
}

function isRulaPostureResultReviewed(row: RulaPostureRow) {
  return row.source !== "DEFAULT" && row.confirmedByUser;
}

function isRulaSingleAnalysisReviewed(analysis: RulaSinglePostureAnalysis | undefined) {
  return Boolean(analysis && rulaPostureRows.every(({ key }) => isRulaPostureResultReviewed(analysis[key])));
}

function isRulaAnalysisReady(analysis: RulaPostureAnalysis) {
  return analysis.sideAnalyses ? isRulaSingleAnalysisReviewed(analysis.sideAnalyses.LEFT) && isRulaSingleAnalysisReviewed(analysis.sideAnalyses.RIGHT) : isRulaSingleAnalysisReviewed(analysis);
}

function rulaActivityInfoFromForm(values: FormData): RulaActivityInfo {
  const loadWeight = String(values.get("loadWeight") ?? "").trim();
  const postureDescription = String(values.get("postureDescription") ?? "").trim();
  const number = (name: string) => {
    const raw = String(values.get(name) ?? "").trim();
    if (!raw) return undefined;
    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
  };
  const durationPerOccurrence = number("durationPerOccurrence");
  const repetitionsPerShift = number("repetitionsPerShift");
  const postureHoldDuration = number("postureHoldDuration");
  return {
    jobTitle: String(values.get("jobTitle") ?? "").trim(),
    taskDescription: String(values.get("taskDescription") ?? "").trim(),
    postureDescription: postureDescription || null,
    ...(durationPerOccurrence === undefined ? {} : { durationPerOccurrence, durationUnit: String(values.get("durationUnit") ?? "MINUTE") as NonNullable<RulaActivityInfo["durationUnit"]> }),
    ...(repetitionsPerShift === undefined ? {} : { repetitionsPerShift }),
    ...(postureHoldDuration === undefined ? {} : { postureHoldDuration, postureHoldUnit: String(values.get("postureHoldUnit") ?? "SECOND") as NonNullable<RulaActivityInfo["postureHoldUnit"]> }),
    loadWeight: loadWeight ? Number(loadWeight) : null,
    loadUnit: String(values.get("loadUnit") ?? "KG") as RulaActivityInfo["loadUnit"],
  };
}

function rulaPayloadFromForm(form: HTMLFormElement) {
  const values = new FormData(form);
  const rawPostureAnalysis = parsePostureAnalysis(values.get("postureAnalysis"));
  const bodySide = values.get("bodySide") === "LEFT" ? "LEFT" : values.get("bodySide") === "BOTH" ? "BOTH" : "RIGHT";
  const postureAnalysis = bodySide === "BOTH" ? withBothSideAnalyses(rawPostureAnalysis) : rawPostureAnalysis;
  const inputs = rulaInputsFromAnalysis(postureAnalysis, Number(values.get("force")), rulaMuscleUseFromValue(values.get("muscleUse")));
  return { projectId: String(values.get("projectId") ?? ""), title: String(values.get("title") ?? ""), subjectCode: values.get("subjectCode") ? String(values.get("subjectCode")) : null, bodySide, activityInfo: rulaActivityInfoFromForm(values), postureAnalysis, inputs };
}

function rulaPayloadFromDraft(value: unknown) {
  const draft = (value && typeof value === "object" ? value : {}) as DraftRecord;
  const nestedInputs = draft.inputs && typeof draft.inputs === "object" && !Array.isArray(draft.inputs) ? draft.inputs as Record<string, unknown> : {};
  const draftValueFor = (key: string) => draft[key] ?? nestedInputs[key];
  const number = (key: string, fallback: number) => Number(draftValueFor(key) ?? fallback);
  const optionalNumber = (key: string) => {
    const raw = String(draftValueFor(key) ?? "").trim();
    if (!raw) return undefined;
    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
  };
  const muscleUse = draftValueFor("muscleUse");
  const rawPostureAnalysis = parsePostureAnalysis(draft.postureAnalysis);
  const jobTitle = String(draft.jobTitle ?? "").trim();
  const taskDescription = String(draft.taskDescription ?? "").trim();
  const postureDescription = String(draft.postureDescription ?? "").trim();
  const durationPerOccurrence = optionalNumber("durationPerOccurrence");
  const repetitionsPerShift = optionalNumber("repetitionsPerShift");
  const postureHoldDuration = optionalNumber("postureHoldDuration");
  const loadWeight = optionalNumber("loadWeight");
  const bodySide = draft.bodySide === "LEFT" ? "LEFT" : draft.bodySide === "BOTH" ? "BOTH" : "RIGHT";
  const postureAnalysis = bodySide === "BOTH" ? withBothSideAnalyses(rawPostureAnalysis) : rawPostureAnalysis;
  const inputs = rulaInputsFromAnalysis(postureAnalysis, number("force", 0), rulaMuscleUseFromValue(muscleUse));
  const activityInfo = jobTitle && taskDescription ? {
    jobTitle,
    taskDescription,
    postureDescription: postureDescription || null,
    ...(durationPerOccurrence === undefined ? {} : { durationPerOccurrence, durationUnit: String(draft.durationUnit ?? "MINUTE") as NonNullable<RulaActivityInfo["durationUnit"]> }),
    ...(repetitionsPerShift === undefined ? {} : { repetitionsPerShift }),
    ...(postureHoldDuration === undefined ? {} : { postureHoldDuration, postureHoldUnit: String(draft.postureHoldUnit ?? "SECOND") as NonNullable<RulaActivityInfo["postureHoldUnit"]> }),
    loadWeight: loadWeight ?? null,
    loadUnit: String(draft.loadUnit ?? "KG") as RulaActivityInfo["loadUnit"],
  } : undefined;
  return { projectId: String(draft.projectId ?? ""), title: String(draft.title ?? ""), subjectCode: draft.subjectCode ? String(draft.subjectCode) : null, bodySide, ...(activityInfo ? { activityInfo } : {}), postureAnalysis, inputs };
}

function formatPostureAngle(angle: number | null, locale: "fa" | "en") {
  return angle === null ? "—" : `${angle.toLocaleString(locale === "en" ? "en-US" : "fa-IR")}°`;
}

const rulaActionLevelMeta = {
  1: { labelKey: "assessment.rulaAcceptable", className: "acceptable" },
  2: { labelKey: "assessment.rulaRiskInvestigation", className: "investigation" },
  3: { labelKey: "assessment.rulaNeedsReview", className: "review" },
  4: { labelKey: "assessment.rulaRiskImmediate", className: "immediate" },
} as const;
const rulaReportFactorKeys = ["neck", "upperArm", "trunk"] as const;

function rulaActionLevelFor(value: number) {
  const safeValue = Number.isFinite(value) ? value : 1;
  const level = Math.max(1, Math.min(4, Math.trunc(safeValue))) as keyof typeof rulaActionLevelMeta;
  return rulaActionLevelMeta[level];
}

function rulaActionLevelForScore(score: number) {
  if (score < 1) return { labelKey: "assessment.manualReviewRequiredShort", className: "review-required" } as const;
  const level = score <= 2 ? 1 : score <= 4 ? 2 : score <= 6 ? 3 : 4;
  return rulaActionLevelFor(level);
}

function rankRulaReportFactors(factors: RulaReportFactor[]) {
  return [...factors].sort((left, right) => right.impactPercent - left.impactPercent || right.score - left.score || rulaReportFactorKeys.indexOf(left.key) - rulaReportFactorKeys.indexOf(right.key));
}

function rulaActionIsSame(left: RulaCorrectionAction, right: RulaCorrectionAction) {
  const sameBodySide = !left.bodySide || !right.bodySide || left.bodySide === right.bodySide;
  return sameBodySide && (left.id === right.id || Boolean(left.suggestionId && left.suggestionId === right.id) || Boolean(right.suggestionId && right.suggestionId === left.id));
}

function rulaActionBodySideLabel(side: RulaActionBodySide | null | undefined, t: (key: string, values?: Record<string, string | number>) => string) {
  return side === "LEFT" ? t("assessment.left") : side === "BOTH" ? t("assessment.bothSides") : t("assessment.right");
}

function rulaActionPartLabel(action: RulaCorrectionAction, locale: "fa" | "en", t: (key: string, values?: Record<string, string | number>) => string) {
  if (!action.affectedParts.length) return t("assessment.rulaNoRelatedFactor");
  const separator = locale === "fa" ? "، " : ", ";
  return action.affectedParts.map((part) => t(`assessment.${part}`)).join(separator);
}

function rulaMainFactorKey(analysis: RulaPostureAnalysis): RulaReportFactor["key"] {
  const keys = ["neck", "upperArm", "trunk"] as const;
  return keys.reduce((highest, key) => analysis[key].score > analysis[highest].score ? key : highest, keys[0]);
}

function rulaSourceLabelKey(source: RulaPostureSource) {
  return source === "AI" ? "assessment.aiSuggested" : source === "USER" ? "assessment.userEdited" : "assessment.defaultValue";
}

function RulaPostureEditDialog({ part, row, onCancel, onSave }: { part: RulaPosturePart; row: RulaPostureRow; onCancel: () => void; onSave: (row: RulaPostureRow) => void }) {
  const { t } = useI18n();
  const [angle, setAngle] = useState(row.angle === null ? "" : String(row.angle));
  const [score, setScore] = useState(String(row.score));
  const [detected, setDetected] = useState(row.detected);
  const [validationError, setValidationError] = useState("");
  const rowLabel = rulaPostureRows.find((item) => item.key === part)?.labelKey ?? "assessment.posturePart";
  useEffect(() => {
    const handleEscape = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onCancel]);
  function changeAngle(value: string) {
    setValidationError("");
    setAngle(value);
    const nextAngle = Number(value);
    if (value.trim() && Number.isFinite(nextAngle) && nextAngle >= -180 && nextAngle <= 180) setScore(String(suggestedRulaPostureScore(part, nextAngle, detected, row.score)));
  }
  function changeDetected(value: boolean) {
    setValidationError("");
    setDetected(value);
    const currentAngle = postureAngle(angle);
    if (currentAngle !== null) setScore(String(suggestedRulaPostureScore(part, currentAngle, value, row.score)));
    else if (part === "wristTwist") setScore(String(value ? 2 : 1));
  }
  function save() {
    const rawAngle = angle.trim();
    const parsedAngle = postureAngle(angle);
    const parsedScore = Number(score);
    if (rawAngle && parsedAngle === null) { setValidationError(t("assessment.invalidPostureAngle")); return; }
    if (!Number.isInteger(parsedScore) || parsedScore < 1 || parsedScore > 6) { setValidationError(t("assessment.invalidPostureScore")); return; }
    onSave({ angle: parsedAngle, score: part === "wristTwist" && !detected ? 1 : parsedScore, detected, source: "USER", confirmedByUser: true });
  }
  return <div className="rula-edit-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
    <section className="rula-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="rula-edit-title" aria-describedby="rula-edit-hint" onMouseDown={(event) => event.stopPropagation()}>
      <div className="rula-edit-dialog-head"><div><strong id="rula-edit-title">{t("assessment.editPostureResult")}</strong><small>{t(rowLabel)}</small></div><button type="button" className="icon-button" onClick={onCancel} aria-label={t("assessment.cancelEdit")}><span aria-hidden="true">×</span></button></div>
      <p id="rula-edit-hint" className="rula-edit-dialog-hint">{t("assessment.editPostureResultHint")}</p>
      <div className="rula-edit-form">
        <label>{t("assessment.detectedAngle")}<span className="rula-angle-input"><input autoFocus type="number" min="-180" max="180" step="1" value={angle} aria-invalid={validationError ? true : undefined} onChange={(event) => changeAngle(event.target.value)} placeholder="—"/><span>°</span></span></label>
        <label>{t("assessment.suggestedScore")}<input type="number" min="1" max="6" step="1" value={score} disabled={part === "wristTwist" && !detected} aria-invalid={validationError ? true : undefined} onChange={(event) => { setValidationError(""); setScore(event.target.value); }} required/></label>
        <label className="rula-detection-toggle"><input type="checkbox" checked={detected} onChange={(event) => changeDetected(event.target.checked)}/><span>{part === "wristTwist" ? t("assessment.wristTwistPresent") : t("assessment.detectedInImage")}</span></label>
      </div>
      {validationError && <p className="rula-edit-error" role="alert">{validationError}</p>}
      <div className="rula-edit-actions"><button type="button" className="ghost" onClick={onCancel}>{t("common.cancel")}</button><button type="button" className="primary" onClick={save}><Icon name="check"/> {t("dialog.save")}</button></div>
    </section>
  </div>;
}

function RulaPostureTable({ title, rows, analysis, locale, onEdit, onConfirm }: { title: string; rows: Array<{ key: RulaPosturePart; labelKey: string; group: "A" | "B" }>; analysis: RulaPostureAnalysis; locale: "fa" | "en"; onEdit: (part: RulaPosturePart) => void; onConfirm: (part: RulaPosturePart) => void }) {
  const { t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  return <section className="rula-analysis-table-card"><div className="rula-analysis-table-head"><strong>{title}</strong><small>{t("assessment.rulaAiResultsHint")}</small></div><div className="table-wrap"><table className="rula-analysis-table"><thead><tr><th>{t("assessment.bodyPart")}</th><th>{t("assessment.detectedAngle")}</th><th>{t("assessment.detectedStatus")}</th><th>{t("assessment.resultSource")}</th><th>{t("assessment.suggestedScore")}</th><th>{t("assessment.operations")}</th></tr></thead><tbody>{rows.map((item) => { const row = analysis[item.key]; const reviewed = isRulaPostureResultReviewed(row); const status = item.key === "wristTwist" ? row.detected ? t("assessment.present") : t("assessment.notPresent") : row.detected ? t("assessment.detected") : row.source === "USER" ? t("assessment.notDetected") : t("assessment.pendingDetection"); const reviewLabel = reviewed ? t("assessment.confirmedByUser") : row.source === "AI" ? t("assessment.awaitingUserConfirmation") : t("assessment.manualReviewRequiredShort"); return <tr key={item.key}><td><strong>{t(item.labelKey)}</strong></td><td className="rula-angle-value">{formatPostureAngle(row.angle, locale)}</td><td><span className={`rula-detection-badge ${row.detected ? "detected" : "pending"}`}>{status}</span></td><td><div className="rula-source-stack"><small className={`rula-source-badge source-${row.source.toLowerCase()}`}>{t(rulaSourceLabelKey(row.source))}</small><small className={reviewed ? "rula-confirmed-badge" : "rula-awaiting-badge"}>{reviewLabel}</small></div></td><td><strong className={`rula-suggested-score ${reviewed ? "" : "rula-unreviewed-value"}`}>{reviewed ? row.score.toLocaleString(numberLocale) : "—"}</strong></td><td><div className="rula-row-actions"><button type="button" className="icon-button rula-edit-button" onClick={() => onEdit(item.key)} title={t("assessment.editPostureResult")} aria-label={`${t("assessment.editPostureResult")}: ${t(item.labelKey)}`}><Icon name="edit" size={15}/></button>{row.source === "AI" && !row.confirmedByUser && <button type="button" className="icon-button rula-confirm-button" onClick={() => onConfirm(item.key)} title={t("assessment.confirmPostureResult")} aria-label={`${t("assessment.confirmPostureResult")}: ${t(item.labelKey)}`}><Icon name="check" size={15}/></button>}</div></td></tr>; })}</tbody></table></div></section>;
}

function RulaPostureVisual({ imagePreview, analysis, locale, postureDescription }: { imagePreview: string; analysis: RulaPostureAnalysis; locale: "fa" | "en"; postureDescription: string }) {
  const { t } = useI18n();
  const calloutKeys: RulaPosturePart[] = ["upperArm", "lowerArm", "wrist", "neck", "trunk"];
  const callouts = calloutKeys.map((key) => rulaPostureRows.find((item) => item.key === key)!).filter((item) => analysis[item.key].angle !== null);
  return <section className="rula-analysis-visual"><div className="rula-analysis-visual-head"><div><strong>{t("assessment.rulaAnalysisImage")}</strong><small>{t("assessment.rulaAnalysisImageHint")}</small></div><span className="rula-ai-chip"><Icon name="sparkles" size={14}/> {t("assessment.rulaFutureModel")}</span></div><div className={`rula-analysis-canvas ${imagePreview ? "has-image" : "empty"}`}>{imagePreview ? <img src={imagePreview} alt={t("assessment.rulaAnalysisImage")}/> : <div className="rula-visual-empty"><Icon name="rula" size={36}/><strong>{t("assessment.rulaImagePending")}</strong><small>{t("assessment.rulaImagePendingHint")}</small></div>}{imagePreview && <div className="rula-skeleton-overlay" aria-hidden="true"><span className="rula-joint joint-neck"/><span className="rula-joint joint-shoulder"/><span className="rula-joint joint-elbow"/><span className="rula-joint joint-wrist"/><span className="rula-joint joint-hip"/><span className="rula-joint joint-knee"/><span className="rula-joint joint-ankle"/><i className="rula-bone bone-neck"/><i className="rula-bone bone-arm"/><i className="rula-bone bone-forearm"/><i className="rula-bone bone-trunk"/><i className="rula-bone bone-leg"/>{callouts.map((item, index) => <span className={`rula-angle-callout callout-${index + 1}`} key={item.key}>{t(item.labelKey)} · {formatPostureAngle(analysis[item.key].angle, locale)}</span>)}</div>}</div>{postureDescription.trim() && <div className="rula-posture-description-preview"><strong>{t("assessment.rulaPostureDescription")}</strong><p>{postureDescription.trim()}</p></div>}<small className="rula-analysis-visual-note">{t("assessment.rulaOverlayFutureHint")}</small></section>;
}

function RulaMuscleUseSelector({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  const { t } = useI18n();
  return <div className="rula-muscle-use-field"><span className="field-label-line"><span>{t("assessment.repetitiveMuscle")}</span></span><StyledSelect name="muscleUseOption" value={value ? "1" : "0"} aria-label={t("assessment.repetitiveMuscle")} onChange={(event) => onChange(event.target.value === "1")}><option value="1">{t("assessment.repetitiveMuscleCriterionOne")} — {t("assessment.repetitiveMuscleCriterionOneScore")}</option><option value="0">{t("assessment.repetitiveMuscleCriterionZero")} — {t("assessment.repetitiveMuscleCriterionZeroScore")}</option></StyledSelect></div>;
}

function RulaPostureAnalysisStep({ analysis, result, sideResults, bodySide, imagePreview, postureDescription, locale, onChange }: { analysis: RulaPostureAnalysis; result: ReturnType<typeof calculateRula>; sideResults?: Partial<Record<RulaBodySide, ReturnType<typeof calculateRula>>>; bodySide: "LEFT" | "RIGHT" | "BOTH"; imagePreview: string; postureDescription: string; locale: "fa" | "en"; onChange: (part: RulaPosturePart, row: RulaPostureRow, side?: RulaBodySide) => void }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState<RulaPosturePart | null>(null);
  const [activeSide, setActiveSide] = useState<RulaBodySide>("RIGHT");
  const visibleAnalysis = bodySide === "BOTH" ? analysis.sideAnalyses?.[activeSide] ?? analysis : analysis;
  const visibleResult = bodySide === "BOTH" ? sideResults?.[activeSide] ?? result : result;
  const actionLevel = rulaActionLevelFor(visibleResult.actionLevel);
  const mainFactor = rulaMainFactorKey(visibleAnalysis);
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const needsManualReview = rulaPostureRows.filter(({ key }) => !isRulaPostureResultReviewed(visibleAnalysis[key]));
  const unconfirmedAi = needsManualReview.filter(({ key }) => visibleAnalysis[key].source === "AI");
  const resultReady = bodySide === "BOTH" ? isRulaSingleAnalysisReviewed(analysis.sideAnalyses?.LEFT) && isRulaSingleAnalysisReviewed(analysis.sideAnalyses?.RIGHT) : isRulaSingleAnalysisReviewed(analysis);
  const scoreForGauge = resultReady ? Math.max(1, Math.min(7, visibleResult.score)) : 0;
  const gaugeStyle = { "--rula-score-progress": `${scoreForGauge ? Math.round((scoreForGauge / 7) * 100) : 0}%` } as CSSProperties;
  function confirmAll() { unconfirmedAi.forEach(({ key }) => onChange(key, { ...visibleAnalysis[key], confirmedByUser: true }, bodySide === "BOTH" ? activeSide : undefined)); }
  function change(part: RulaPosturePart, row: RulaPostureRow) { onChange(part, row, bodySide === "BOTH" ? activeSide : undefined); }
  return <div className="rula-analysis-step rula-smart-analysis"><div className="rula-analysis-intro"><div className="rula-analysis-heading"><span className="rula-analysis-heading-icon"><Icon name="rula" size={19}/></span><div><strong>{t("assessment.rulaSmartPostureTitle")}</strong><small>{t("assessment.rulaSmartPostureDescription")}</small></div></div><span className={`rula-analysis-source ${resultReady ? "ready" : "pending"}`}><Icon name={resultReady ? "check" : "activity"} size={15}/> {resultReady ? t("assessment.rulaAnalysisCompleted") : t("assessment.rulaModelReviewable")}</span></div>{bodySide === "BOTH" && <><div className="rula-side-tabs" role="tablist" aria-label={t("assessment.bodySide")}>{(["RIGHT", "LEFT"] as const).map((side) => <button type="button" role="tab" aria-selected={activeSide === side} className={activeSide === side ? "active" : ""} onClick={() => { setActiveSide(side); setEditing(null); }} key={side}>{side === "RIGHT" ? t("assessment.right") : t("assessment.left")}</button>)}</div>{sideResults?.LEFT && sideResults.RIGHT && <div className="rula-side-score-strip" aria-label={t("assessment.bothSides")}><span><small>{t("assessment.right")}</small><strong>{resultReady ? sideResults.RIGHT.score.toLocaleString(numberLocale) : "—"}</strong></span><span><small>{t("assessment.left")}</small><strong>{resultReady ? sideResults.LEFT.score.toLocaleString(numberLocale) : "—"}</strong></span><span className="final"><small>{t("assessment.bothSides")}</small><strong>{resultReady ? result.score.toLocaleString(numberLocale) : "—"}</strong></span></div>}</>}{!resultReady && <div className="rula-review-notice" role="alert"><div><strong>{needsManualReview.some(({ key }) => visibleAnalysis[key].source === "DEFAULT") ? t("assessment.manualReviewRequired") : t("assessment.awaitingUserConfirmation")}</strong><small>{t("assessment.confirmPostureResultsHint")}</small></div>{unconfirmedAi.length > 0 && <button type="button" className="ghost" onClick={confirmAll}><Icon name="check"/> {t("assessment.confirmAllPostureResults")}</button>}</div>}<div className="rula-analysis-layout"><div className="rula-analysis-table-stack"><RulaPostureTable title={t("assessment.rulaGroupA")} rows={rulaGroupARows} analysis={visibleAnalysis} locale={locale} onEdit={setEditing} onConfirm={(part) => change(part, { ...visibleAnalysis[part], confirmedByUser: true })}/><RulaPostureTable title={t("assessment.rulaGroupB")} rows={rulaGroupBRows} analysis={visibleAnalysis} locale={locale} onEdit={setEditing} onConfirm={(part) => change(part, { ...visibleAnalysis[part], confirmedByUser: true })}/><div className="rula-group-summary" aria-label={t("assessment.rulaGroupScores")}><div><span>{t("assessment.rulaGroupA")}</span><strong>{resultReady ? visibleResult.groupA.toLocaleString(numberLocale) : "—"}</strong></div><div><span>{t("assessment.rulaGroupB")}</span><strong>{resultReady ? visibleResult.groupB.toLocaleString(numberLocale) : "—"}</strong></div></div></div><RulaPostureVisual imagePreview={imagePreview} analysis={visibleAnalysis} postureDescription={postureDescription} locale={locale}/></div><section className="rula-analysis-summary"><div className="rula-score-summary-main"><div className="rula-score-gauge" style={gaugeStyle} role="progressbar" aria-label={t("assessment.rulaScoreLabel")} aria-valuemin={1} aria-valuemax={7} aria-valuenow={scoreForGauge || undefined}><span className="rula-score-gauge-progress"/><strong>{resultReady ? visibleResult.score.toLocaleString(numberLocale) : "—"}</strong><small>{t("assessment.rulaCurrentScore")}</small></div><div className="rula-summary-score"><small>{t("assessment.rulaAnalysisSummary")}</small><strong>{resultReady ? `RULA Score = ${visibleResult.score.toLocaleString(numberLocale)}` : t("assessment.manualReviewRequiredShort")}</strong></div></div>{resultReady && <><span className={`rula-summary-badge ${actionLevel.className}`}>{t(actionLevel.labelKey)}</span><p>{t("assessment.rulaMainFactorSummary", { factor: t(`assessment.${mainFactor}`) })}</p></>}</section>{editing && <RulaPostureEditDialog part={editing} row={visibleAnalysis[editing]} onCancel={() => setEditing(null)} onSave={(row) => { change(editing, row); setEditing(null); }}/>}</div>;
}

const rulaFactorImpactKeys: Record<RulaReportFactor["impactLevel"], string> = { LOW: "assessment.rulaEffectLow", MEDIUM: "assessment.rulaEffectMedium", HIGH: "assessment.rulaEffectHigh" };

function rulaActionPriorityFor(score: number): RulaActionPriority { return score >= 5 ? "HIGH" : score >= 3 ? "MEDIUM" : "LOW"; }

function buildLocalRulaSuggestions(analysis: RulaPostureAnalysis, inputs: RulaInput, bodySide: RulaActionBodySide = "RIGHT"): RulaCorrectionAction[] {
  const suggestions: RulaCorrectionAction[] = [];
  if (analysis.trunk.score >= 2 || analysis.neck.score >= 2) suggestions.push({ id: "adjust-work-surface", titleFa: "تنظیم ارتفاع سطح کار", titleEn: "Adjust work-surface height", descriptionFa: "ارتفاع سطح کار و محل قرارگیری بار را برای نزدیک‌شدن تنه و گردن به وضعیت خنثی تنظیم کنید.", descriptionEn: "Adjust the work-surface height and load position to bring the trunk and neck closer to neutral.", priority: rulaActionPriorityFor(Math.max(analysis.trunk.score, analysis.neck.score)), scoreReduction: 2, affectedParts: ["trunk", "neck"] });
  if (analysis.neck.score >= 2) suggestions.push({ id: "correct-neck-position", titleFa: "اصلاح وضعیت گردن", titleEn: "Correct neck posture", descriptionFa: "خط دید و جایگاه قطعه را طوری اصلاح کنید که خم‌شدن و چرخش گردن کاهش یابد.", descriptionEn: "Reposition the line of sight and part so neck flexion and rotation are reduced.", priority: rulaActionPriorityFor(analysis.neck.score), scoreReduction: 1, affectedParts: ["neck"] });
  if (inputs.muscleUse || inputs.force > 0) suggestions.push({ id: "reduce-posture-hold", titleFa: "کاهش مدت نگه‌داشتن پوسچر", titleEn: "Reduce posture-hold duration", descriptionFa: "وقفه کوتاه، تناوب کار و جابه‌جایی وظیفه را برای کاهش بار استاتیک اجرا کنید.", descriptionEn: "Add short breaks, task rotation, or alternation to reduce static loading.", priority: inputs.force >= 2 ? "HIGH" : "MEDIUM", scoreReduction: 1, affectedParts: ["neck", "trunk", "upperArm"] });
  if (analysis.upperArm.score >= 2 || analysis.lowerArm.score >= 2 || analysis.wrist.score >= 2) suggestions.push({ id: "support-upper-limb", titleFa: "حمایت از اندام فوقانی", titleEn: "Support the upper limb", descriptionFa: "ابزار، دسته یا تکیه‌گاه مناسب برای کاهش زاویه بازو، ساعد و مچ فراهم کنید.", descriptionEn: "Provide a suitable tool, handle, or support to reduce upper-arm, forearm, and wrist angles.", priority: rulaActionPriorityFor(Math.max(analysis.upperArm.score, analysis.lowerArm.score, analysis.wrist.score)), scoreReduction: 1, affectedParts: ["upperArm", "lowerArm", "wrist"] });
  return suggestions.map((suggestion) => ({ ...suggestion, bodySide }));
}

function buildLocalRulaSuggestionsForAssessment(analysis: RulaPostureAnalysis, inputs: RulaInput, bodySide: RulaActionBodySide) {
  if (bodySide !== "BOTH" || !analysis.sideAnalyses?.LEFT || !analysis.sideAnalyses.RIGHT) return buildLocalRulaSuggestions(analysis, inputs, bodySide);
  return (["RIGHT", "LEFT"] as const).flatMap((side) => buildLocalRulaSuggestions(analysis.sideAnalyses![side]!, rulaInputsFromAnalysis(analysis.sideAnalyses![side]!, inputs.force, inputs.muscleUse), side).map((suggestion) => ({ ...suggestion, id: `${suggestion.id}-${side.toLowerCase()}` })));
}

function predictedRulaScoreLocal(score: number, actions: RulaCorrectionAction[]) { return Math.max(1, Math.min(7, score - Math.min(6, actions.reduce((sum, action) => sum + action.scoreReduction, 0)))); }

function rulaActionText(action: RulaCorrectionAction, locale: "fa" | "en", field: "title" | "description") {
  if (field === "title") return locale === "fa" ? action.titleFa : action.titleEn;
  return locale === "fa" ? action.descriptionFa : action.descriptionEn;
}

function RulaReportContext({ activityInfo, locale }: { activityInfo?: RulaActivityInfo | null; locale: "fa" | "en" }) {
  const { t } = useI18n();
  if (!activityInfo) return null;
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const durationUnit = activityInfo.durationUnit === "SECOND" ? t("assessment.seconds") : activityInfo.durationUnit === "HOUR" ? t("assessment.hours") : t("assessment.minutes");
  const holdUnit = activityInfo.postureHoldUnit === "SECOND" ? t("assessment.seconds") : activityInfo.postureHoldUnit === "HOUR" ? t("assessment.hours") : t("assessment.minutes");
  const loadUnit = activityInfo.loadUnit === "LB" ? t("assessment.pounds") : t("assessment.kilograms");
  const fields = [[t("assessment.rulaJobTitle"), activityInfo.jobTitle], [t("assessment.rulaTask"), activityInfo.taskDescription], [t("assessment.rulaDuration"), activityInfo.durationPerOccurrence === undefined ? "—" : `${activityInfo.durationPerOccurrence.toLocaleString(numberLocale)} ${durationUnit}`], [t("assessment.rulaRepetitions"), activityInfo.repetitionsPerShift === undefined ? "—" : activityInfo.repetitionsPerShift.toLocaleString(numberLocale)], [t("assessment.rulaPostureHold"), activityInfo.postureHoldDuration === undefined ? "—" : `${activityInfo.postureHoldDuration.toLocaleString(numberLocale)} ${holdUnit}`], [t("assessment.rulaLoadWeight"), activityInfo.loadWeight === null || activityInfo.loadWeight === undefined ? "—" : `${activityInfo.loadWeight.toLocaleString(numberLocale)} ${loadUnit}`]] as const;
  return <section className="rula-report-context"><div className="rula-report-section-heading"><div><h3>{t("assessment.rulaProcessDetails")}</h3><p>{t("assessment.rulaProcessDetailsHint")}</p></div><Icon name="activity" size={21}/></div><div className="rula-report-context-grid">{fields.map(([label, value]) => <div key={label}><small>{label}</small><strong>{value || "—"}</strong></div>)}</div>{activityInfo.postureDescription?.trim() && <div className="rula-report-context-description"><small>{t("assessment.rulaPostureDescription")}</small><p>{activityInfo.postureDescription.trim()}</p></div>}</section>;
}

function RulaReportDataTable({ analysis, factors, selectedActions, locale }: { analysis: RulaPostureAnalysis; factors: RulaReportFactor[]; selectedActions: RulaCorrectionAction[]; locale: "fa" | "en" }) {
  const { t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const factorByKey: Map<string, RulaReportFactor> = new Map(factors.map((factor) => [factor.key, factor]));
  const totalScore = Math.max(1, rulaPostureRows.reduce((sum, item) => sum + (isRulaPostureResultReviewed(analysis[item.key]) ? analysis[item.key].score : 0), 0));
  return <section className="rula-report-section rula-report-data-section"><div className="rula-report-section-heading"><div><h3>{t("assessment.rulaReportDataTable")}</h3><p>{t("assessment.rulaReportDataTableDescription")}</p></div><Icon name="chart" size={21}/></div><div className="table-wrap report-data-table-wrap"><table className="assessment-report-table rula-report-data-table"><thead><tr><th>{t("assessment.row")}</th><th>{t("assessment.rulaReportGroup")}</th><th>{t("assessment.bodyPart")}</th><th>{t("assessment.detectedAngle")}</th><th>{t("assessment.detectedStatus")}</th><th>{t("assessment.suggestedScore")}</th><th>{t("assessment.rulaReportScoreShare")}</th><th>{t("assessment.resultSource")}</th><th>{t("assessment.rulaReportSelectedActions")}</th><th>{t("assessment.operations")}</th></tr></thead><tbody>{rulaPostureRows.map((item, index) => {
    const row = analysis[item.key];
    const factor = factorByKey.get(item.key);
    const reviewed = isRulaPostureResultReviewed(row);
    const scoreShare = reviewed ? factor?.impactPercent ?? Math.round((row.score / totalScore) * 100) : null;
    const reviewLabel = reviewed ? t("assessment.confirmedByUser") : row.source === "AI" ? t("assessment.awaitingUserConfirmation") : t("assessment.manualReviewRequiredShort");
    const status = item.key === "wristTwist" ? row.detected ? t("assessment.present") : t("assessment.notPresent") : row.detected ? t("assessment.detected") : t("assessment.pendingDetection");
    const relatedActions = selectedActions.filter((action) => action.affectedParts.includes(item.key));
    return <tr key={item.key}><td className="report-table-number">{(index + 1).toLocaleString(numberLocale)}</td><td className="report-table-number"><span className={`rula-group-badge group-${item.group.toLowerCase()}`}>{item.group}</span></td><td className="report-table-text"><strong>{t(item.labelKey)}</strong></td><td className="report-table-number report-angle-value">{formatPostureAngle(row.angle, locale)}</td><td><span className={`rula-detection-badge ${row.detected ? "detected" : "pending"}`}>{status}</span></td><td className="report-table-number"><strong className={`rula-suggested-score ${reviewed ? "" : "rula-unreviewed-value"}`}>{reviewed ? row.score.toLocaleString(numberLocale) : "—"}</strong></td><td className="report-table-number"><span className={`rula-table-impact ${scoreShare === null ? "impact-neutral" : `impact-${(factor?.impactLevel ?? (row.score >= 4 ? "HIGH" : row.score >= 3 ? "MEDIUM" : "LOW")).toLowerCase()}`}`}>{scoreShare === null ? "—" : `${scoreShare.toLocaleString(numberLocale)}٪`}</span></td><td><div className="report-table-stack"><span className={`rula-source-badge source-${row.source.toLowerCase()}`}>{t(rulaSourceLabelKey(row.source))}</span><small>{reviewLabel}</small></div></td><td className="report-table-text"><div className="report-table-stack">{relatedActions.length ? relatedActions.map((action) => <span key={action.id}><strong>{rulaActionText(action, locale, "title")}</strong><small><StatusBadge value={action.priority}/></small></span>) : <span>{t("assessment.rulaReportNoSelectedActions")}</span>}</div></td><td className="report-table-number"><details className="report-inline-details"><summary className="icon-button" title={t("assessment.viewDetails")} aria-label={`${t("assessment.viewDetails")}: ${t(item.labelKey)}`}><Icon name="eye" size={15}/></summary><div className="report-inline-details-popover"><strong>{t(item.labelKey)}</strong><span>{t("assessment.detectedAngle")}: {formatPostureAngle(row.angle, locale)}</span><span>{t("assessment.suggestedScore")}: {reviewed ? row.score.toLocaleString(numberLocale) : t("assessment.manualReviewRequiredShort")}</span></div></details></td></tr>;
  })}</tbody></table></div></section>;
}

function RulaCorrectionSuggestionsTable({ suggestions, selectedActions, bodySide, locale, busyActionId, onToggleAction }: { suggestions: RulaCorrectionAction[]; selectedActions: RulaCorrectionAction[]; bodySide: RulaActionBodySide; locale: "fa" | "en"; busyActionId?: string | null; onToggleAction?: (action: RulaCorrectionAction) => void }) {
  const { t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  if (!suggestions.length) return <EmptyState title={t("assessment.rulaNoCorrections")} icon="actions"/>;
  return <div className="table-wrap report-data-table-wrap rula-correction-table-wrap"><table className="assessment-report-table rula-correction-table"><thead><tr><th>{t("assessment.rulaRelatedFactor")}</th><th>{t("assessment.rulaSuggestedAction")}</th><th>{t("assessment.rulaActionBodySide")}</th><th>{t("assessment.rulaActionPriority")}</th><th>{t("assessment.rulaEstimatedReductionLabel")}</th><th>{t("assessment.operations")}</th></tr></thead><tbody>{suggestions.map((action) => {
    const suggestedSide = action.bodySide ?? (bodySide === "BOTH" ? "BOTH" : bodySide);
    const selectedAction = { ...action, bodySide: suggestedSide };
    const selected = selectedActions.some((item) => rulaActionIsSame(item, selectedAction));
    const busy = Boolean(busyActionId);
    return <tr className={selected ? "selected" : ""} key={`${action.id}-${suggestedSide}`}><td className="rula-correction-table-factor"><strong>{rulaActionPartLabel(action, locale, t)}</strong></td><td><div className="rula-suggestion-content"><strong>{rulaActionText(action, locale, "title")}</strong><span>{rulaActionText(action, locale, "description")}</span></div></td><td><span className="rula-correction-side">{rulaActionBodySideLabel(suggestedSide, t)}</span></td><td><span className={`rula-correction-priority priority-${action.priority.toLowerCase()}`}>{t(`status.${action.priority.toLowerCase()}`)}</span></td><td className="report-table-number">{action.scoreReduction.toLocaleString(numberLocale)}</td><td><button type="button" className={`rula-correction-toggle ${selected ? "selected" : ""}`} aria-pressed={selected} aria-busy={busy && busyActionId === action.id} disabled={!onToggleAction || busy} onClick={() => onToggleAction?.(selectedAction)}>{busy && busyActionId === action.id ? <span className="rula-action-spinner" aria-hidden="true"/> : selected ? <Icon name="check" size={15}/> : <Icon name="plus" size={15}/>}<span>{selected ? t("assessment.rulaSelected") : t("assessment.rulaSelectAction")}</span></button></td></tr>;
  })}</tbody></table></div>;
}

function RulaReportView({ result, analysis, activityInfo, factors, suggestions: rawSuggestions, selectedActions, bodySide, actionBodySide, onActionBodySideChange, locale, busyActionId, onToggleAction, onAddAction, onRemoveAction, showResultHero = true }: { result: { score: number; actionLevel: number; explanation?: string; status?: string }; analysis: RulaPostureAnalysis; activityInfo?: RulaActivityInfo | null; factors: RulaReportFactor[]; suggestions: RulaCorrectionAction[]; selectedActions: RulaCorrectionAction[]; bodySide: RulaActionBodySide; actionBodySide: RulaActionBodySide; onActionBodySideChange?: (side: RulaActionBodySide) => void; locale: "fa" | "en"; busyActionId?: string | null; onToggleAction?: (action: RulaCorrectionAction) => void; onAddAction?: (action: RulaCorrectionAction) => void; onRemoveAction?: (action: RulaCorrectionAction) => void; showResultHero?: boolean }) {
  const { t } = useI18n();
  const onActionBodySide = onActionBodySideChange;
  const [manualTitle, setManualTitle] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [manualPriority, setManualPriority] = useState<RulaActionPriority>("MEDIUM");
  const [manualReduction, setManualReduction] = useState(1);
  const [manualAffectedParts, setManualAffectedParts] = useState<RulaPosturePart[]>([]);
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const rankedFactors = useMemo(() => rankRulaReportFactors(factors), [factors]);
  const predictedScore = predictedRulaScoreLocal(result.score, selectedActions);
  const mainFactor = rankedFactors[0];
  const actionLevel = rulaActionLevelFor(result.actionLevel);
  const predictedActionLevel = rulaActionLevelForScore(predictedScore);
  const resultReady = isRulaAnalysisReady(analysis);
  const suggestions = resultReady ? rawSuggestions : [];
  const manualActions = selectedActions.filter((action) => !suggestions.some((suggestion) => rulaActionIsSame(action, suggestion)));
  const actionSideOptions: RulaActionBodySide[] = bodySide === "BOTH" ? ["RIGHT", "LEFT", "BOTH"] : [bodySide];
  function addManual() {
    const title = manualTitle.trim();
    if (!title || !onAddAction || busyActionId) return;
    const scoreReduction = Number.isFinite(manualReduction) ? Math.max(0, Math.min(6, Math.trunc(manualReduction))) : 0;
    onAddAction({ id: `manual-${Date.now()}`, titleFa: title, titleEn: title, descriptionFa: manualDescription.trim(), descriptionEn: manualDescription.trim(), priority: manualPriority, scoreReduction, affectedParts: [...manualAffectedParts], bodySide: actionBodySide });
    setManualTitle(""); setManualDescription(""); setManualPriority("MEDIUM"); setManualReduction(1); setManualAffectedParts([]);
  }
  return <div className="rula-report-view">
    {showResultHero && <header className="rula-result-hero"><div className="rula-result-hero-copy"><span className="rula-result-hero-icon" aria-hidden="true"><Icon name="rula" size={21}/></span><div><h2>{t("assessment.rulaReportTitle")}</h2><p>{t("assessment.rulaReportDescription")}</p></div></div><span className="rula-result-complete"><Icon name="check" size={14}/>{t("assessment.rulaReportCompleted")}</span></header>}
    <div className={`rula-report-score-card ${actionLevel.className}`}><div className="rula-report-score"><div className="rula-report-score-label"><small>{t("assessment.rulaScoreLabel")}</small><span className="rula-report-score-icon" aria-hidden="true"><Icon name="rula" size={21}/></span></div><strong>{result.score.toLocaleString(numberLocale)}</strong><span>{t("assessment.rulaCurrentScoreDescription")}</span></div><div className="rula-report-risk"><div className="rula-report-risk-head"><small>{t("assessment.rulaRiskLevel")}</small><span className={`rula-report-risk-badge ${actionLevel.className}`} role="status">{t(actionLevel.labelKey)}</span></div><div className="rula-report-status-line"><span>{t("assessment.rulaAssessmentStatus")}</span><StatusBadge value={result.status ?? "DRAFT"}/></div><p>{mainFactor ? t("assessment.rulaMainFactorSummary", { factor: t(`assessment.${mainFactor.key}`) }) : t("assessment.rulaSummaryText")}</p></div></div>
    <section className="rula-report-section rula-main-factors-section"><div className="rula-report-section-heading"><div><h3>{t("assessment.rulaMainFactors")}</h3><p>{t("assessment.rulaMainFactorsDescription")}</p></div><Icon name="chart" size={21}/></div><div className="rula-factor-grid">{rankedFactors.length ? rankedFactors.map((factor) => { const detected = factor.detected ?? factor.angle !== null; const contribution = Math.max(0, Math.min(100, factor.impactPercent)); return <article className={`rula-factor-card impact-${factor.impactLevel.toLowerCase()}`} key={factor.key}><div className="rula-factor-card-head"><div className="rula-factor-title"><span className="rula-factor-figure" aria-hidden="true"><Icon name="rula" size={17}/></span><div><strong>{t(`assessment.${factor.key}`)}</strong><small>{t(rulaSourceLabelKey(factor.source))}</small></div></div><span className="rula-factor-impact-label">{t(rulaFactorImpactKeys[factor.impactLevel])}</span></div><div className="rula-factor-value"><div><small>{t("assessment.detectedAngle")}</small><b>{formatPostureAngle(factor.angle, locale)}</b></div><div><small>{t("assessment.rulaFactorScore")}</small><strong>{factor.score.toLocaleString(numberLocale)}</strong></div></div><div className="rula-factor-status"><span className={`rula-detection-badge ${detected ? "detected" : "pending"}`}>{detected ? t("assessment.detected") : t("assessment.notDetected")}</span><small>{t("assessment.rulaFactorContribution", { percent: contribution })}</small></div><div className="rula-factor-meter" role="progressbar" aria-label={t("assessment.rulaFactorContribution", { percent: contribution })} aria-valuemin={0} aria-valuemax={100} aria-valuenow={contribution}><span style={{ width: `${contribution}%` }}/></div></article>; }) : <EmptyState title={t("assessment.rulaNoFactors")} icon="chart"/>}</div></section>
    <section className="rula-report-section rula-corrections-section"><div className="rula-report-section-heading"><div><h3>{t("assessment.rulaCorrections")}</h3><p>{t("assessment.rulaCorrectionsDescription")}</p></div><Icon name="actions" size={21}/></div><div className="rula-corrections-layout"><div className="rula-suggested-actions-panel"><div className="rula-suggested-actions-heading"><div><strong>{t("assessment.rulaCorrections")}</strong><small>{t("assessment.rulaCorrectionsDescription")}</small></div><Icon name="actions" size={18}/></div><div className="rula-action-scope"><strong>{t("assessment.rulaActionScope")}</strong><span>{t("assessment.bodySide")}: {rulaActionBodySideLabel(bodySide, t)}</span><small>{t("assessment.rulaActionBodySideHint")}</small></div><RulaCorrectionSuggestionsTable suggestions={suggestions} selectedActions={selectedActions} bodySide={bodySide} locale={locale} busyActionId={busyActionId} onToggleAction={onToggleAction}/>{manualActions.length > 0 && <div className="rula-manual-actions">{manualActions.map((action) => <article className="rula-manual-action" key={action.id}><div><div className="rula-manual-action-title-row"><strong>{rulaActionText(action, locale, "title")}</strong><span className="rula-selected-badge">{t("assessment.rulaSelected")}</span></div><small>{rulaActionText(action, locale, "description") || t("assessment.rulaManualAction")}</small><small className="rula-correction-related">{t("assessment.rulaRelatedFactor")}: {rulaActionPartLabel(action, locale, t)}</small><small className="rula-correction-side">{t("assessment.rulaActionScope")}: {rulaActionBodySideLabel(action.bodySide, t)}</small></div><span>{t(`status.${action.priority.toLowerCase()}`)}</span>{onRemoveAction && <button type="button" className="text-button danger-text" disabled={Boolean(busyActionId)} aria-busy={busyActionId === action.id} onClick={() => onRemoveAction(action)}>{busyActionId === action.id ? <span className="rula-action-spinner dark" aria-hidden="true"/> : t("common.delete")}</button>}</article>)}</div>}</div><aside className="rula-report-impact-panel" aria-live="polite"><div className="rula-impact-panel-heading"><div><strong>{t("assessment.rulaPredictedEffect")}</strong><small>{t("assessment.rulaPredictionEstimate")}</small></div><span className="rula-impact-panel-icon" aria-hidden="true"><Icon name="chart" size={18}/></span></div><div className="rula-prediction-score-pair"><div><small>{t("assessment.rulaCurrentScore")}</small><strong>{result.score.toLocaleString(numberLocale)}</strong></div><span aria-hidden="true">←</span><div><small>{t("assessment.rulaPredictedScore")}</small><strong className="predicted">{predictedScore.toLocaleString(numberLocale)}</strong></div></div><span className={`rula-prediction-badge ${predictedActionLevel.className}`}>{t(predictedActionLevel.labelKey)}</span><p>{t("assessment.rulaPredictedNote")}</p><div className="rula-selected-actions-preview"><strong>{t("assessment.rulaSelectedActionsSummary")}</strong>{selectedActions.length ? selectedActions.slice(0, 3).map((action) => <div key={action.id}><span>{rulaActionText(action, locale, "title")}</span><small>{t(`status.${action.priority.toLowerCase()}`)}</small></div>) : <small>{t("assessment.rulaNoSelectedActionsHint")}</small>}{selectedActions.length > 3 && <small>+ {(selectedActions.length - 3).toLocaleString(numberLocale)}</small>}</div></aside></div>{onAddAction && <div className="rula-manual-action-form" role="group" aria-busy={busyActionId === "manual"}><div className="rula-manual-action-heading"><strong>{t("assessment.rulaAddManualAction")}</strong><small>{t("assessment.rulaManualActionHint")}</small></div><div className="rula-manual-action-scope-note" aria-live="polite"><strong>{t("assessment.rulaManualActionBodySide")}</strong><span>{rulaActionBodySideLabel(actionBodySide, t)}</span><small>{t("assessment.rulaManualActionBodySideHint")}</small></div><label>{t("assessment.rulaManualActionTitle")}<input value={manualTitle} maxLength={180} onChange={(event) => setManualTitle(event.target.value)} required placeholder={t("assessment.rulaManualActionTitlePlaceholder")}/></label><label>{t("assessment.rulaManualActionDescription")}<textarea rows={2} maxLength={500} value={manualDescription} onChange={(event) => setManualDescription(event.target.value)} placeholder={t("assessment.rulaManualActionDescriptionPlaceholder")}/></label><fieldset className="rula-manual-factors"><legend>{t("assessment.rulaRelatedFactor")}</legend><div>{rulaReportFactorKeys.map((part) => <label key={part}><input type="checkbox" checked={manualAffectedParts.includes(part)} onChange={(event) => setManualAffectedParts((current) => event.target.checked ? [...current, part] : current.filter((item) => item !== part))}/><span>{t(`assessment.${part}`)}</span></label>)}</div></fieldset><label className="rula-manual-action-side-field">{t("assessment.rulaManualActionBodySide")}<StyledSelect value={actionBodySide} onChange={(event) => onActionBodySideChange?.(event.target.value as RulaActionBodySide)} disabled={!onActionBodySide || Boolean(busyActionId)}>{actionSideOptions.map((side) => <option key={side} value={side}>{rulaActionBodySideLabel(side, t)}</option>)}</StyledSelect></label><label>{t("assessment.rulaActionPriority")}<StyledSelect value={manualPriority} onChange={(event) => setManualPriority(event.target.value as RulaActionPriority)}><option value="CRITICAL">{t("status.critical")}</option><option value="HIGH">{t("status.high")}</option><option value="MEDIUM">{t("status.medium")}</option><option value="LOW">{t("status.low")}</option></StyledSelect></label><label>{t("assessment.rulaEstimatedReductionLabel")}<input type="number" min="0" max="6" step="1" value={manualReduction} onChange={(event) => { const next = Number(event.target.value); setManualReduction(Number.isFinite(next) ? Math.max(0, Math.min(6, next)) : 0); }}/></label><button type="button" className="primary" onClick={addManual} disabled={Boolean(busyActionId)}>{busyActionId === "manual" ? <span className="button-spinner" aria-hidden="true"/> : <Icon name="plus"/>} {t("assessment.rulaAddAction")}</button></div>}</section>
    <div className="rula-report-secondary-sections">{activityInfo && <RulaReportContext activityInfo={activityInfo} locale={locale}/>}<RulaReportDataTable analysis={analysis} factors={factors} selectedActions={selectedActions} locale={locale}/></div>
  </div>;
}

function RulaReportPreview({ result, analysis, force, muscleUse, bodySide, locale, selectedActions, onSelectedActionsChange }: { result: ReturnType<typeof calculateRula>; analysis: RulaPostureAnalysis; force: number; muscleUse: boolean; bodySide: RulaActionBodySide; locale: "fa" | "en"; selectedActions: RulaCorrectionAction[]; onSelectedActionsChange: (actions: RulaCorrectionAction[]) => void }) {
  const [actionBodySide, setActionBodySide] = useState<RulaActionBodySide>(bodySide);
  useEffect(() => setActionBodySide(bodySide), [bodySide]);
  const inputs = useMemo(() => rulaInputsFromAnalysis(analysis, force, muscleUse), [analysis, force, muscleUse]);
  const factors = useMemo<RulaReportFactor[]>(() => { const keys = rulaReportFactorKeys; const total = Math.max(1, keys.reduce((sum, key) => sum + analysis[key].score, 0)); return keys.map((key) => ({ key, angle: analysis[key].angle, detected: analysis[key].detected, score: analysis[key].score, impactPercent: Math.round((analysis[key].score / total) * 100), impactLevel: analysis[key].score >= 4 ? "HIGH" : analysis[key].score >= 3 ? "MEDIUM" : "LOW", source: analysis[key].source })); }, [analysis]);
  const suggestions = useMemo(() => buildLocalRulaSuggestionsForAssessment(analysis, inputs, bodySide), [analysis, inputs, bodySide]);
  return <RulaReportView result={{ ...result, status: "DRAFT" }} analysis={analysis} bodySide={bodySide} actionBodySide={actionBodySide} onActionBodySideChange={setActionBodySide} factors={factors} suggestions={suggestions} selectedActions={selectedActions} locale={locale} onToggleAction={(action) => onSelectedActionsChange(selectedActions.some((item) => rulaActionIsSame(item, action)) ? selectedActions.filter((item) => !rulaActionIsSame(item, action)) : [...selectedActions, action])} onAddAction={(action) => onSelectedActionsChange([...selectedActions, action])} onRemoveAction={(action) => onSelectedActionsChange(selectedActions.filter((item) => !rulaActionIsSame(item, action)))}/>;
}

function rulaClientActionFromPersisted(action: RulaPersistedAction, locale: "fa" | "en"): RulaCorrectionAction {
  const impact = action.rulaImpact;
  const title = action.title || (locale === "fa" ? "اقدام اصلاحی" : "Corrective action");
  return { id: impact?.suggestionId ?? `persisted-${action.id}`, persistedId: action.id, suggestionId: impact?.suggestionId, titleFa: title, titleEn: title, descriptionFa: action.description, descriptionEn: action.description, priority: action.priority, scoreReduction: impact?.scoreReduction ?? Math.max(0, (action.beforeRisk ?? 0) - (action.afterRisk ?? 0)), affectedParts: impact?.affectedParts ?? [], bodySide: action.bodySide ?? undefined };
}

export function RulaReportPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { locale, t } = useI18n();
  const state = useLoad<RulaReportPayload>(id ? `/rula/${id}/report` : null, [id]);
  const [error, setError] = useState("");
  const [selectedActions, setSelectedActions] = useState<RulaCorrectionAction[]>([]);
  const [actionBodySide, setActionBodySide] = useState<RulaActionBodySide>("RIGHT");
  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const canEditActions = canEdit();
  const report = state.data;
  const suggestions = useMemo(() => report?.suggestedActions ?? [], [report]);
  useEffect(() => { if (report) { setActionBodySide(report.assessment.bodySide); setSelectedActions(report.actions.filter((action) => action.status !== "CANCELLED" && action.status !== "REJECTED").map((action) => rulaClientActionFromPersisted(action, locale))); } }, [report, locale]);
  if (state.loading) return <section className="page-shell"><div className="state"><div className="spinner"/><p>{t("common.loading")}</p></div></section>;
  if (state.error || !report) return <section className="page-shell"><div className="state error-state"><span className="state-icon"><Icon name="warning" size={27}/></span><h3>{t("common.loadFailed")}</h3><p>{state.error || t("assessment.rulaReportNotFound")}</p><button className="primary" onClick={state.reload}>{t("common.retry")}</button></div></section>;
  async function toggleAction(action: RulaCorrectionAction) {
    if (busyActionId) return;
    const current = report as RulaReportPayload;
    const saved = selectedActions.find((item) => rulaActionIsSame(item, action));
    setBusyActionId(action.id); setError("");
    try {
      if (saved?.persistedId) await api(`/actions/${saved.persistedId}`, { method: "PATCH", body: JSON.stringify({ status: "CANCELLED" }) });
      else await api("/actions", { method: "POST", body: JSON.stringify({ projectId: current.assessment.project.id, rulaId: current.assessment.id, bodySide: action.bodySide ?? actionBodySide, title: rulaActionText(action, locale, "title"), description: rulaActionText(action, locale, "description"), priority: action.priority, status: "OPEN", beforeRisk: current.assessment.score, afterRisk: predictedRulaScoreLocal(current.assessment.score, [...selectedActions, action]), rulaImpact: { suggestionId: action.id, scoreReduction: action.scoreReduction, affectedParts: action.affectedParts } }) });
      setSelectedActions((items) => saved?.persistedId ? items.filter((item) => !rulaActionIsSame(item, action)) : items.some((item) => rulaActionIsSame(item, action)) ? items : [...items, action]);
      state.reload();
    } catch (reason) { setError((reason as Error).message); }
    finally { setBusyActionId(null); }
  }
  async function addManualAction(action: RulaCorrectionAction) {
    if (busyActionId) return;
    const current = report as RulaReportPayload;
    setBusyActionId("manual"); setError("");
    try { await api("/actions", { method: "POST", body: JSON.stringify({ projectId: current.assessment.project.id, rulaId: current.assessment.id, bodySide: action.bodySide ?? actionBodySide, title: rulaActionText(action, locale, "title"), description: rulaActionText(action, locale, "description") || t("assessment.rulaManualAction"), priority: action.priority, status: "OPEN", beforeRisk: current.assessment.score, afterRisk: predictedRulaScoreLocal(current.assessment.score, [...selectedActions, action]), rulaImpact: { suggestionId: action.id, scoreReduction: action.scoreReduction, affectedParts: action.affectedParts } }) }); setSelectedActions((items) => items.some((item) => rulaActionIsSame(item, action)) ? items : [...items, action]); state.reload(); } catch (reason) { setError((reason as Error).message); }
    finally { setBusyActionId(null); }
  }
  async function removeAction(action: RulaCorrectionAction) { if (busyActionId) return; if (!action.persistedId) { setSelectedActions((items) => items.filter((item) => !rulaActionIsSame(item, action))); return; } setBusyActionId(action.id); setError(""); try { await api(`/actions/${action.persistedId}`, { method: "PATCH", body: JSON.stringify({ status: "CANCELLED" }) }); setSelectedActions((items) => items.filter((item) => !rulaActionIsSame(item, action))); state.reload(); } catch (reason) { setError((reason as Error).message); } finally { setBusyActionId(null); } }
  const result = { score: report.assessment.score, actionLevel: report.assessment.actionLevel, explanation: report.assessment.explanation, status: report.assessment.status };
  return <section className="page-shell rula-report-page"><PageHeader eyebrow={t("assessment.rulaReportEyebrow")} title={t("assessment.rulaReportTitle")} description={`${report.assessment.title} · ${report.assessment.project.name}`} actions={<div className="page-actions-inline"><button type="button" className="ghost" onClick={() => navigate(-1)}><Icon name="arrow" className="back-arrow"/> {t("assessment.rulaReportBack")}</button><button type="button" className="ghost" onClick={() => void saveBlob(`/reports/rula/${report.assessment.id}.xlsx`, `RULA-${report.assessment.id}.xlsx`).catch((reason) => setError((reason as Error).message))}><Icon name="download"/> {t("assessment.downloadExcel")}</button><button type="button" className="ghost" onClick={() => void saveBlob(`/reports/rula/${report.assessment.id}.docx`, `RULA-${report.assessment.id}.docx`).catch((reason) => setError((reason as Error).message))}><Icon name="download"/> {t("assessment.downloadWord")}</button></div>}/><div className="rula-report-page-status"><span className="rula-result-complete"><Icon name="check" size={14}/>{t("assessment.rulaReportCompleted")}</span></div>{error && <div className="alert error" role="alert"><Icon name="warning"/>{error}</div>}<SectionCard className="rula-report-surface"><RulaReportView result={result} analysis={report.assessment.postureAnalysis} activityInfo={report.assessment.activityInfo} bodySide={report.assessment.bodySide} actionBodySide={actionBodySide} onActionBodySideChange={setActionBodySide} factors={report.factors} suggestions={suggestions} selectedActions={selectedActions} locale={locale} busyActionId={busyActionId} onToggleAction={canEditActions ? (action) => void toggleAction(action) : undefined} onAddAction={canEditActions ? (action) => void addManualAction(action) : undefined} onRemoveAction={canEditActions ? (action) => void removeAction(action) : undefined} showResultHero={false}/></SectionCard></section>;
}

function RulaAssessmentTable({ data, locale, editable, onOpenReport, onEdit, onHistory, onDownload, onDelete }: { data: Rula[]; locale: "fa" | "en"; editable: boolean; onOpenReport: (item: Rula) => void; onEdit: (item: Rula) => void; onHistory: (item: Rula) => void; onDownload: (item: Rula, format: "xlsx" | "docx") => void; onDelete: (item: Rula) => void }) {
  const { t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const bodySideLabel = (side?: Rula["bodySide"]) => side === "LEFT" ? t("assessment.left") : side === "BOTH" ? t("assessment.bothSides") : side === "RIGHT" ? t("assessment.right") : "—";
  data = data.map((item) => item.postureReviewComplete === true ? item : { ...item, score: 0, actionLevel: 0 });
  return <div className="table-wrap report-data-table-wrap"><table className="assessment-report-table rula-assessment-register-table"><thead><tr><th>{t("assessment.row")}</th><th>{t("assessment.rulaAssessmentTitleColumn")}</th><th>{t("assessment.rulaJobTitle")}</th><th>{t("assessment.rulaTask")}</th><th>{t("assessment.project")}</th><th>{t("assessment.bodySide")}</th><th>{t("assessment.rulaScoreLabel")}</th><th>{t("assessment.rulaRiskLevel")}</th><th>{t("assessment.rulaAssessmentStatus")}</th><th>{t("assessment.rulaUpdatedAt")}</th><th>{t("assessment.operations")}</th></tr></thead><tbody>{data.map((item, index) => <tr key={item.id}><td className="report-table-number">{(index + 1).toLocaleString(numberLocale)}</td><td className="report-table-text"><strong>{item.title}</strong>{item.subjectCode && <small>{item.subjectCode}</small>}</td><td className="report-table-text">{item.activityInfo?.jobTitle || "—"}</td><td className="report-table-text">{item.activityInfo?.taskDescription || "—"}</td><td className="report-table-text">{projectName(item.project, locale)}</td><td className="report-table-text">{bodySideLabel(item.bodySide)}</td><td className="report-table-number"><strong className={`rula-register-score level-${item.actionLevel}`}>{item.score.toLocaleString(numberLocale)}</strong></td><td className="report-table-number"><span className={`rula-report-risk-badge ${rulaActionLevelForScore(item.score).className}`}>{t(rulaActionLevelForScore(item.score).labelKey)}</span></td><td className="report-table-number"><StatusBadge value={item.status}/></td><td className="report-table-number rula-register-updated-at">{formatDate(item.updatedAt ?? item.createdAt, true)}</td><td><div className="report-table-actions">{editable && <><button type="button" className="icon-button" title={t("assessment.openRulaReport")} aria-label={`${t("assessment.openRulaReport")}: ${item.title}`} onClick={() => onOpenReport(item)}><Icon name="chart" size={15}/></button><button type="button" className="icon-button" title={t("assessment.edit")} aria-label={`${t("assessment.edit")}: ${item.title}`} onClick={() => onEdit(item)}><Icon name="activity" size={15}/></button><button type="button" className="icon-button" title={t("assessment.history")} aria-label={`${t("assessment.history")}: ${item.title}`} onClick={() => onHistory(item)}><Icon name="clock" size={15}/></button><button type="button" className="icon-button" title={t("assessment.downloadExcel")} aria-label={`${t("assessment.downloadExcel")}: ${item.title}`} onClick={() => onDownload(item, "xlsx")}><Icon name="download" size={15}/></button><button type="button" className="icon-button" title={t("assessment.downloadWord")} aria-label={`${t("assessment.downloadWord")}: ${item.title}`} onClick={() => onDownload(item, "docx")}><Icon name="download" size={15}/></button><button type="button" className="icon-button danger" title={t("common.delete")} aria-label={`${t("common.delete")}: ${item.title}`} onClick={() => onDelete(item)}><Icon name="trash" size={15}/></button></>}</div></td></tr>)}</tbody></table></div>;
}

function rulaOverview(data: Rula[]) {
  const reviewed = data.filter((item) => item.postureReviewComplete === true);
  return {
    total: data.length,
    high: reviewed.filter((item) => item.actionLevel >= 3).length,
    average: reviewed.length ? Math.round(reviewed.reduce((sum, item) => sum + item.score, 0) / reviewed.length) : 0,
  };
}

export function RulaPage() {
  const { locale, t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resultsView = searchParams.get("view") === "results";
  const requestedProjectId = searchParams.get("project")?.trim() ?? "";
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const assessmentLabel = "RULA"; const draftKey = draftKeyFor("rula"); const state = useLoad<Rula[]>("/rula"); const projects = useLoad<Project[]>("/projects"); const [error, setError] = useState(""); const [draftNotice, setDraftNotice] = useState(""); const [draftSyncAvailable, setDraftSyncAvailable] = useState(false); const [history, setHistory] = useState<VersionRow[]>([]); const [historyAssessment, setHistoryAssessment] = useState(""); const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1); const [draft, setDraftState] = useState<DraftRecord | null>(() => readLocalDraft(draftKey)); const [selectedProjectId, setSelectedProjectId] = useState(() => draftValue(readLocalDraft(draftKey), "projectId")); const [lastSaved, setLastSaved] = useState<Date | null>(null); const [autosaveError, setAutosaveError] = useState(false); const [postureImage, setPostureImage] = useState<File | null>(null); const [postureImagePreview, setPostureImagePreview] = useState(""); const [postureImageError, setPostureImageError] = useState(""); const [postureDescription, setPostureDescription] = useState(() => String(draft?.postureDescription ?? "")); const [rulaBodySide, setRulaBodySide] = useState<"LEFT" | "RIGHT" | "BOTH">(() => draft?.bodySide === "LEFT" ? "LEFT" : draft?.bodySide === "BOTH" ? "BOTH" : "RIGHT"); const [submitting, setSubmitting] = useState(false); const [postureAnalysis, setPostureAnalysis] = useState<RulaPostureAnalysis>(() => parsePostureAnalysis(draft?.postureAnalysis)); const [rulaForce, setRulaForce] = useState(() => { const value = Number(draft?.force ?? 0); return Number.isInteger(value) && value >= 0 && value <= 3 ? value : 0; }); const [rulaMuscleUse, setRulaMuscleUse] = useState(() => rulaMuscleUseFromValue(draft?.muscleUse)); const [selectedRulaActions, setSelectedRulaActions] = useState<RulaCorrectionAction[]>([]); const dialog = useDialog(); const formRef = useRef<HTMLFormElement>(null); const postureImageInputRef = useRef<HTMLInputElement>(null); const saveTimer = useRef<number | null>(null); const draftWriteQueue = useRef<Promise<void>>(Promise.resolve());
   const [jobQuery, setJobQuery] = useState(() => draftValue(readLocalDraft(draftKey), "jobTitle"));
   const [selectedJobId, setSelectedJobId] = useState(() => draftValue(readLocalDraft(draftKey), "jobCatalogId"));
   const [selectedJob, setSelectedJob] = useState<JobCatalogEntry | null>(null);
   const [customJobSelected, setCustomJobSelected] = useState(() => draftBoolean(readLocalDraft(draftKey), "customJobSelected"));
   const [jobCatalog, setJobCatalog] = useState<JobCatalogEntry[]>([]);
   const [jobCatalogLoaded, setJobCatalogLoaded] = useState(false);
   const [jobCatalogOrganizationId, setJobCatalogOrganizationId] = useState("");
   const [jobLoading, setJobLoading] = useState(false);
   const [jobSearchError, setJobSearchError] = useState("");
   const [jobSearchOpen, setJobSearchOpen] = useState(false);
   const { orgId } = getSession();
   const rulaJobRequestId = useRef(0);
   const overview = useMemo(() => rulaOverview(state.data ?? []), [state.data]);
  const currentRulaInputs = useMemo(() => rulaInputsFromAnalysis(postureAnalysis, rulaForce, rulaMuscleUse), [postureAnalysis, rulaForce, rulaMuscleUse]);
  const currentRulaSideResults = useMemo(() => {
    if (rulaBodySide !== "BOTH" || !postureAnalysis.sideAnalyses?.LEFT || !postureAnalysis.sideAnalyses.RIGHT) return {} as Partial<Record<RulaBodySide, ReturnType<typeof calculateRula>>>;
    return {
      LEFT: calculateRula(rulaInputsFromAnalysis(postureAnalysis.sideAnalyses.LEFT, rulaForce, rulaMuscleUse)),
      RIGHT: calculateRula(rulaInputsFromAnalysis(postureAnalysis.sideAnalyses.RIGHT, rulaForce, rulaMuscleUse)),
    };
  }, [postureAnalysis, rulaBodySide, rulaForce, rulaMuscleUse]);
  const currentRulaResult = useMemo(() => {
    const left = currentRulaSideResults.LEFT;
    const right = currentRulaSideResults.RIGHT;
    if (!left || !right) return calculateRula(currentRulaInputs);
    const primary = right.score >= left.score ? right : left;
    return { ...primary, explanation: `LEFT: ${left.explanation}; RIGHT: ${right.explanation}`, trace: [`LEFT — ${left.trace.join(" | ")}`, `RIGHT — ${right.trace.join(" | ")}`, `Final score: ${primary.score}`] };
  }, [currentRulaInputs, currentRulaSideResults]);
  useEffect(() => { let active = true; const localDraft = readLocalDraft(draftKey); if (localDraft) { setDraftState(localDraft); setDraftNotice(t("assessment.draftAvailable", { type: assessmentLabel })); setDraftSyncAvailable(true); } void getDraft<DraftRecord>(draftKey).then((value) => { if (active && !localDraft && value && typeof value === "object" && !Array.isArray(value)) { setDraftState(value); setDraftNotice(t("assessment.draftAvailable", { type: assessmentLabel })); setDraftSyncAvailable(true); } }).catch(() => { if (active && !localDraft) setAutosaveError(true); }); return () => { active = false; cancelDraftTimer(saveTimer); }; }, [assessmentLabel, draftKey, locale]);
   useEffect(() => { if (!draft) return; const nestedInputs = draft.inputs && typeof draft.inputs === "object" && !Array.isArray(draft.inputs) ? draft.inputs as Record<string, unknown> : {}; setSelectedProjectId(String(draft.projectId ?? nestedInputs.projectId ?? "")); setPostureAnalysis(parsePostureAnalysis(draft.postureAnalysis)); setRulaBodySide(draft.bodySide === "LEFT" ? "LEFT" : draft.bodySide === "BOTH" ? "BOTH" : "RIGHT"); const force = Number(draft.force ?? nestedInputs.force ?? 0); setRulaForce(Number.isInteger(force) && force >= 0 && force <= 3 ? force : 0); const muscleUse = draft.muscleUse ?? nestedInputs.muscleUse; setRulaMuscleUse(rulaMuscleUseFromValue(muscleUse)); setPostureDescription(String(draft.postureDescription ?? "")); }, [draft]);
    useEffect(() => {
      if (!draft) return;
      setJobQuery(draftValue(draft, "jobTitle"));
      setSelectedJobId(draftValue(draft, "jobCatalogId"));
      setCustomJobSelected(draftBoolean(draft, "customJobSelected"));
    }, [draft]);
   useEffect(() => {
     if (resultsView || !requestedProjectId || !projects.data) return;
     const project = projects.data.find((candidate) => candidate.id === requestedProjectId);
     if (!project) return;
     setSelectedProjectId(project.id);
     const nextDraft = readStoredDraft(browserStorage(), draftKey) ?? {};
     nextDraft.projectId = project.id;
     writeStoredDraft(browserStorage(), draftKey, nextDraft);
     navigate("/rula", { replace: true });
   }, [draftKey, navigate, projects.data, requestedProjectId, resultsView]);
  useEffect(() => { if (!formRef.current) return; queueDraft(formRef.current, draftKey, saveTimer, draftWriteQueue, (time) => { setAutosaveError(false); setLastSaved(time); }, () => setAutosaveError(true)); }, [draftKey, postureAnalysis, postureDescription, rulaForce, rulaMuscleUse]);
   useEffect(() => {
     if (jobCatalogOrganizationId === orgId) return;
     rulaJobRequestId.current += 1;
     setJobCatalogOrganizationId(orgId);
     setJobCatalog([]);
     setJobCatalogLoaded(false);
     setJobSearchError("");
   }, [jobCatalogOrganizationId, orgId]);
   useEffect(() => {
     if (!jobSearchOpen || !orgId || jobCatalogOrganizationId !== orgId || jobCatalogLoaded) return;
     const requestId = ++rulaJobRequestId.current;
     setJobLoading(true);
     setJobSearchError("");
     void api<JobCatalogEntry[]>("/fmea/job-catalog?limit=" + FMEA_JOB_CATALOG_LIMIT).then((result) => {
       if (requestId !== rulaJobRequestId.current) return;
       setJobCatalog(result.data);
       setJobCatalogLoaded(true);
     }).catch(() => {
       if (requestId === rulaJobRequestId.current) setJobSearchError(t("assessment.jobSearchUnavailable"));
     }).finally(() => {
       if (requestId === rulaJobRequestId.current) setJobLoading(false);
     });
   }, [jobCatalogLoaded, jobCatalogOrganizationId, jobSearchOpen, orgId]);
   useEffect(() => {
     if (!selectedJobId || selectedJob || !jobCatalog.length) return;
     const restoredJob = jobCatalog.find((job) => job.id === selectedJobId);
     if (restoredJob) {
       setSelectedJob(restoredJob);
       setCustomJobSelected(false);
     }
   }, [jobCatalog, selectedJob, selectedJobId]);
   useEffect(() => {
     if (!selectedJob) return;
     setJobQuery(localizedJobTitle(selectedJob, locale));
   }, [locale, selectedJob]);
   useEffect(() => {
     if (!jobSearchOpen) return;
     const close = (event: PointerEvent) => {
       const target = event.target as Node;
       if (!formRef.current?.querySelector(".rula-job-search")?.contains(target)) setJobSearchOpen(false);
     };
     document.addEventListener("pointerdown", close);
     return () => document.removeEventListener("pointerdown", close);
   }, [jobSearchOpen]);
   useEffect(() => { if (!postureImage) { setPostureImagePreview(""); return undefined; } const objectUrl = URL.createObjectURL(postureImage); setPostureImagePreview(objectUrl); return () => URL.revokeObjectURL(objectUrl); }, [postureImage]);
  function handlePostureImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setPostureImageError("");
    if (!file) { setPostureImage(null); return; }
    if (!RULA_POSTURE_IMAGE_TYPES.has(file.type)) { setPostureImage(null); setPostureImageError(t("assessment.postureImageInvalidType")); event.target.value = ""; return; }
    if (file.size > RULA_POSTURE_IMAGE_MAX_BYTES) { setPostureImage(null); setPostureImageError(t("assessment.postureImageTooLarge")); event.target.value = ""; return; }
    setPostureImage(file);
  }
  function removePostureImage() { setPostureImage(null); setPostureImageError(""); if (postureImageInputRef.current) postureImageInputRef.current.value = ""; }
  function changeBodySide(value: "LEFT" | "RIGHT" | "BOTH") {
    setRulaBodySide(value);
    setPostureAnalysis((current) => {
      if (value === "BOTH") return withBothSideAnalyses(current);
      const selected = current.sideAnalyses?.[value];
      return selected ? { ...selected, sideAnalyses: current.sideAnalyses } : current;
    });
  }
   function openRulaProjectCreator() {
    const form = formRef.current;
    const nextDraft = form ? snapshotStoredForm(form) : (readStoredDraft(browserStorage(), draftKey) ?? {});
    nextDraft.projectId = "";
    writeStoredDraft(browserStorage(), draftKey, nextDraft);
     navigate("/projects?from=rula");
   }
   function queueRulaJobDraft() {
     window.setTimeout(() => {
       if (formRef.current) queueDraft(formRef.current, draftKey, saveTimer, draftWriteQueue, (time) => { setAutosaveError(false); setLastSaved(time); }, () => setAutosaveError(true));
     }, 0);
   }
   function selectRulaJob(job: JobCatalogEntry) {
     const title = localizedJobTitle(job, locale);
     setSelectedJob(job);
     setSelectedJobId(job.id);
     setCustomJobSelected(false);
     setJobQuery(title);
     setJobSearchOpen(false);
     setJobSearchError("");
     setError("");
     queueRulaJobDraft();
   }
   async function useCustomRulaJobTitle(titleOverride?: string) {
     const title = (titleOverride ?? jobQuery).trim();
     if (title.length < 2) {
       setError(t("assessment.jobActivityRequired"));
       return;
     }
     setSelectedJob(null);
     setSelectedJobId("");
     setCustomJobSelected(true);
     setJobQuery(title);
     setJobSearchOpen(false);
     setJobSearchError("");
     setError("");
     setJobLoading(true);
     try {
       const result = await api<JobCatalogEntry>("/fmea/job-catalog", {
         method: "POST",
         body: JSON.stringify({ title, locale, department: null }),
       });
       setJobCatalog((current) => [result.data, ...current.filter((job) => job.id !== result.data.id)]);
       setJobCatalogLoaded(true);
       setSelectedJob(result.data);
       setSelectedJobId(result.data.id);
       setCustomJobSelected(false);
       setJobQuery(localizedJobTitle(result.data, locale));
       queueRulaJobDraft();
     } catch {
       setJobSearchError(t("assessment.jobCatalogSaveFailed"));
       queueRulaJobDraft();
     } finally {
       setJobLoading(false);
     }
   }
   function changeRulaJobQuery(value: string) {
     setJobQuery(value);
     setJobSearchError("");
     if (selectedJob && value.trim() !== localizedJobTitle(selectedJob, locale)) {
       setSelectedJob(null);
       setSelectedJobId("");
       setCustomJobSelected(false);
     }
     if (customJobSelected && value.trim() !== jobQuery.trim()) setCustomJobSelected(false);
   }
   function clearRulaJob() {
     setJobQuery("");
     setSelectedJob(null);
     setSelectedJobId("");
     setCustomJobSelected(false);
     setJobSearchError("");
     queueRulaJobDraft();
   }
   function validateRulaProcessInfo() {
    const values = formRef.current ? new FormData(formRef.current) : null;
    if (!values) { setError(t("assessment.validationEnter", { field: t("assessment.rulaJobTitle") })); return false; }
    const required: Array<[string, string]> = [["projectId", t("assessment.projectRequired")], ["jobTitle", t("assessment.rulaJobTitle")], ["taskDescription", t("assessment.rulaTask")]];
    const missing = required.find(([name]) => !String(values.get(name) ?? "").trim());
    if (missing) { setError(t("assessment.validationEnter", { field: missing[1] })); return false; }
    const title = String(values.get("title") ?? "").trim();
    const jobTitle = String(values.get("jobTitle") ?? "").trim();
    const taskDescription = String(values.get("taskDescription") ?? "").trim();
    const shortText = [[jobTitle, t("assessment.rulaJobTitle")], [taskDescription, t("assessment.rulaTask")]] as const;
    const tooShort = shortText.find(([value]) => value.length < 2);
    if (tooShort) { setError(t("assessment.validationMinLength", { field: tooShort[1], min: "۲" })); return false; }
    if (title && title.length < 2) { setError(t("assessment.validationMinLength", { field: t("assessment.titleRequired"), min: "۲" })); return false; }
    const numericRules: Array<{ name: string; label: string; min: number; max: number; integer?: boolean }> = [
      { name: "durationPerOccurrence", label: t("assessment.rulaDuration"), min: 0.1, max: 1440 },
      { name: "repetitionsPerShift", label: t("assessment.rulaRepetitions"), min: 1, max: 10000, integer: true },
      { name: "postureHoldDuration", label: t("assessment.rulaPostureHold"), min: 0.1, max: 1440 },
    ];
    const loadWeight = String(values.get("loadWeight") ?? "").trim();
    if (loadWeight) numericRules.push({ name: "loadWeight", label: t("assessment.rulaLoadWeight"), min: 0, max: 10000 });
    const invalidNumber = numericRules.find((rule) => { const raw = String(values.get(rule.name) ?? "").trim(); if (!raw) return false; const value = Number(raw); return !Number.isFinite(value) || value < rule.min || value > rule.max || (rule.integer && !Number.isInteger(value)); });
    if (invalidNumber) { const rule = invalidNumber; if (rule.integer) setError(t("assessment.validationInteger", { field: rule.label })); else setError(t("assessment.validationNumberRange", { field: rule.label, min: rule.min, max: rule.max })); return false; }
    if (postureDescription.trim().length > 1000) { setError(t("assessment.validationMaxLength", { field: t("assessment.rulaPostureDescription"), max: "۱۰۰۰" })); return false; }
    if (postureImageError) { setError(postureImageError); return false; }
    setError("");
    return true;
  }
  function validateWizardStep() {
    if (wizardStep === 1) return validateRulaProcessInfo();
    setError("");
    return true;
  }
  async function create(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (submitting) return; if (wizardStep === 3) { if (!validateRulaProcessInfo()) { setWizardStep(1); return; } if (hasUnconfirmedRulaResults(postureAnalysis, rulaBodySide)) { setError(t("assessment.confirmPostureResultsHint")); setWizardStep(2); return; } } else if (!validateWizardStep()) { setWizardStep(1); return; } if (wizardStep < 3) { setWizardStep((step) => step === 1 ? 2 : 3); return; } setSubmitting(true); try { await createRula(event); } finally { setSubmitting(false); } }
  async function createRula(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const element = event.currentTarget; const payload = rulaPayloadFromForm(element); setError(""); cancelDraftTimer(saveTimer); const draftSaved = await persistDraftNow(draftKey, snapshotStoredForm(element), draftWriteQueue); if (!draftSaved) { setAutosaveError(true); setError(t("assessment.autosaveError")); return; } if (!navigator.onLine) { setDraftNotice(t("assessment.draftSavedOffline")); setDraftSyncAvailable(true); if (postureImage) setError(t("assessment.postureImageOffline")); return; } try { const created = await api<Rula>("/rula", { method: "POST", body: JSON.stringify(payload) }); let imageUploadFailed = false; let actionPersistFailed = false; if (postureImage) { try { const upload = new FormData(); upload.append("entityType", "RulaAssessment"); upload.append("entityId", created.data.id); upload.append("file", postureImage); const attachment = await api<{ id: string }>("/files", { method: "POST", body: upload }); await api(`/rula/${created.data.id}`, { method: "PATCH", body: JSON.stringify({ activityInfo: { ...payload.activityInfo, postureImageAttachmentId: attachment.data.id } }) }); } catch { imageUploadFailed = true; } } const predictedScore = predictedRulaScoreLocal(created.data.score, selectedRulaActions); for (const action of selectedRulaActions) { try { await api("/actions", { method: "POST", body: JSON.stringify({ projectId: payload.projectId, rulaId: created.data.id, bodySide: action.bodySide ?? payload.bodySide, title: rulaActionText(action, locale, "title"), description: rulaActionText(action, locale, "description") || t("assessment.rulaManualAction"), priority: action.priority, status: "OPEN", beforeRisk: created.data.score, afterRisk: predictedScore, rulaImpact: { suggestionId: action.id, scoreReduction: action.scoreReduction, affectedParts: action.affectedParts } }) }); } catch { actionPersistFailed = true; } } await clearAutoSaveDraft(draftKey); element.reset(); setPostureImage(null); setPostureImageError(""); setPostureDescription(""); if (postureImageInputRef.current) postureImageInputRef.current.value = ""; setPostureAnalysis(postureAnalysisFromValue(null)); setRulaForce(0); setRulaMuscleUse(false); setSelectedRulaActions([]); setDraftState(null); setWizardStep(1); setLastSaved(null); setAutosaveError(false); state.reload(); setDraftNotice(t("assessment.created", { type: assessmentLabel })); setDraftSyncAvailable(false); if (imageUploadFailed) setError(t("assessment.postureImageUploadFailed")); if (actionPersistFailed) setError(t("assessment.rulaActionsPersistFailed")); navigate(`/rula/${created.data.id}/report`); } catch (reason) { setError((reason as Error).message); } }
  async function syncDraft() { cancelDraftTimer(saveTimer); await draftWriteQueue.current.catch(() => undefined); const value = await readAssessmentDraft(draftKey); if (!value) return; try { await api("/rula", { method: "POST", body: JSON.stringify(rulaPayloadFromDraft(value)) }); await clearAutoSaveDraft(draftKey); setDraftState(null); setWizardStep(1); setDraftNotice(t("assessment.synced", { type: assessmentLabel })); setDraftSyncAvailable(false); setAutosaveError(false); state.reload(); } catch (reason) { setError((reason as Error).message); } }
  async function editAssessment(item: Rula) { const title = (await dialog.prompt(t("assessment.editTitle"), item.title))?.trim(); if (!title || title === item.title) return; try { await api(`/rula/${item.id}`, { method: "PATCH", body: JSON.stringify({ title }) }); state.reload(); } catch (reason) { setError((reason as Error).message); } }
  async function deleteAssessment(item: Rula) { if (!(await dialog.confirm(t("assessment.deleteConfirm", { title: item.title })))) return; try { await api(`/rula/${item.id}`, { method: "DELETE" }); state.reload(); } catch (reason) { setError((reason as Error).message); } }
  async function loadHistory(id: string) { try { const result = await api<VersionRow[]>(`/rula/${id}/history`); setHistory(result.data); setHistoryAssessment(id); } catch (reason) { setError((reason as Error).message); } }
  function openRulaResults() { setHistoryAssessment(""); navigate("/rula?view=results"); }
  function returnToNewRula() { setHistoryAssessment(""); navigate("/rula"); }

  return <section className="page-shell">
    <PageHeader eyebrow={resultsView ? t("assessment.rulaResults") : t("assessment.rulaEyebrow")} title={resultsView ? t("assessment.rulaResults") : t("assessment.rulaTitle")} description={resultsView ? t("assessment.rulaResultsDescription") : t("assessment.rulaDescription")} actions={<div className="page-actions-inline">{resultsView ? <button type="button" className="ghost" onClick={returnToNewRula}><Icon name="arrow" className="back-arrow" size={16}/><span className="page-action-label">{t("assessment.backToNewRula")}</span></button> : <><button type="button" className="ghost" onClick={openRulaResults}><Icon name="chart" size={16}/><span className="page-action-label">{t("assessment.rulaResults")}</span></button><Link className="ghost button-link" to="/choose-path"><Icon name="arrow" className="back-arrow" size={16}/><span className="page-action-label">{t("assessment.changeAssessmentMethod")}</span></Link></>}</div>}/>
    {error && <div className="alert error" role="alert"><Icon name="warning"/>{error}</div>}
    {!resultsView && draftNotice && <div className="alert info" role="status"><Icon name="files"/>{draftNotice}{navigator.onLine && draftSyncAvailable && <button type="button" className="text-button" onClick={() => void syncDraft()}>{t("common.sync")}</button>}</div>}
    {!resultsView && <div className="mini-stats"><div><Icon name="rula"/><strong>{overview.total.toLocaleString(numberLocale)}</strong><span>{t("assessment.assessmentCount")}</span></div><div><Icon name="warning"/><strong>{overview.high.toLocaleString(numberLocale)}</strong><span>{t("assessment.needsAction")}</span></div><div><Icon name="chart"/><strong>{overview.average.toLocaleString(numberLocale)}</strong><span>{t("assessment.averageScore")}</span></div></div>}
    {!resultsView && canEdit() && <SectionCard title={t("assessment.evaluateNew", { type: assessmentLabel })} description={t("assessment.threeSteps", { steps: t("assessment.stepRulaProcessScoreReview") })} icon="plus">
       <form ref={formRef} className="rula-form assessment-wizard" key={draft ? "restored-draft" : "new-draft"} noValidate aria-busy={submitting} onInput={(event) => queueDraft(event.currentTarget, draftKey, saveTimer, draftWriteQueue, (time) => { setAutosaveError(false); setLastSaved(time); }, () => setAutosaveError(true))} onChange={(event) => queueDraft(event.currentTarget, draftKey, saveTimer, draftWriteQueue, (time) => { setAutosaveError(false); setLastSaved(time); }, () => setAutosaveError(true))} onSubmit={create}>
        <div className="wizard-stepper" aria-label={t("assessment.stepsLabel", { type: assessmentLabel })}>{[t("assessment.processInformation"), t("assessment.rulaReviewScoring"), t("assessment.rulaAssessmentReporting")].map((label, index) => { const step = (index + 1) as 1 | 2 | 3; return <button type="button" className={wizardStep === step ? "current" : wizardStep > step ? "done" : ""} aria-current={wizardStep === step ? "step" : undefined} onClick={() => { setError(""); setWizardStep(step); }} disabled={submitting} key={label}><b>{wizardStep > step ? "✓" : step}</b>{label}</button>; })}</div>
         <fieldset hidden={wizardStep !== 1}>
           <legend>{t("assessment.processInformation")}</legend>
           <div className="rula-process-layout">
             <div className="rula-process-fields">
               <div className="rula-process-heading"><div><strong>{t("assessment.rulaProcessDetails")}</strong><small>{t("assessment.rulaProcessDetailsHint")}</small></div><span className="required-label">{t("common.required")}</span></div>
               <div className="rula-process-form-grid">
                 <label className="span-two"><span className="field-label-line"><span>{t("assessment.projectRequired")}</span><span className="required-label">{t("common.required")}</span></span><StyledSelect name="projectId" value={selectedProjectId} onChange={(event) => { const value = event.target.value; if (value === RULA_CREATE_PROJECT_OPTION) { openRulaProjectCreator(); return; } setSelectedProjectId(value); }} required><option value="">{t("assessment.projectSelect")}</option>{projects.data?.map((project) => <option key={project.id} value={project.id}>{projectName(project, locale)}</option>)}<option value={RULA_CREATE_PROJECT_OPTION}>＋ {t("projects.newProject")}</option></StyledSelect></label>
                  <label><span className="field-label-line"><span>{t("assessment.titleRequired")}</span><span className="optional-label">{t("common.optional")}</span></span><input name="title" maxLength={180} defaultValue={draftValue(draft, "title")} placeholder={t("assessment.titleRulaPlaceholder")}/></label>
                  <label><span className="field-label-line">{t("assessment.bodySide")}</span><StyledSelect name="bodySide" value={rulaBodySide} onChange={(event) => changeBodySide(event.target.value as "LEFT" | "RIGHT" | "BOTH")}><option value="RIGHT">{t("assessment.right")}</option><option value="LEFT">{t("assessment.left")}</option><option value="BOTH">{t("assessment.bothSides")}</option></StyledSelect></label>
                  <JobCatalogSearch value={jobQuery} selectedJob={selectedJob} customSelected={customJobSelected} jobs={jobCatalog} loading={jobLoading} error={jobSearchError} open={jobSearchOpen} onOpenChange={setJobSearchOpen} onChange={changeRulaJobQuery} onSelect={selectRulaJob} onUseCustom={() => void useCustomRulaJobTitle()} onClear={clearRulaJob} inputName="jobTitle" inputId="rula-job-search" listId="rula-job-catalog-options" label={t("assessment.rulaJobTitle")} placeholder={t("assessment.jobActivityPlaceholder")} hint={t("assessment.jobCatalogHint")} className="rula-job-search"/>
                  <input type="hidden" name="jobCatalogId" value={selectedJobId} readOnly/><input type="hidden" name="customJobSelected" value={customJobSelected ? "true" : "false"} readOnly/>
                  <label className="span-two"><span className="field-label-line"><span>{t("assessment.rulaTask")}</span><span className="required-label">{t("common.required")}</span></span><textarea name="taskDescription" maxLength={500} rows={2} defaultValue={draftValue(draft, "taskDescription")} placeholder={t("assessment.rulaTaskPlaceholder")} required/></label>
                 <label><span className="field-label-line"><span>{t("assessment.rulaDuration")}</span><span className="optional-label">{t("common.optional")}</span></span><span className="measure-control"><input name="durationPerOccurrence" type="number" min="0.1" max="1440" step="0.1" defaultValue={draftValue(draft, "durationPerOccurrence")} placeholder="15"/><StyledSelect name="durationUnit" defaultValue={draftValue(draft, "durationUnit", "MINUTE")}><option value="SECOND">{t("assessment.seconds")}</option><option value="MINUTE">{t("assessment.minutes")}</option><option value="HOUR">{t("assessment.hours")}</option></StyledSelect></span></label>
                 <label><span className="field-label-line"><span>{t("assessment.rulaRepetitions")}</span><span className="optional-label">{t("common.optional")}</span></span><input name="repetitionsPerShift" type="number" min="1" max="10000" step="1" defaultValue={draftValue(draft, "repetitionsPerShift")} placeholder="120"/></label>
                 <label><span className="field-label-line"><span>{t("assessment.rulaPostureHold")}</span><span className="optional-label">{t("common.optional")}</span></span><span className="measure-control"><input name="postureHoldDuration" type="number" min="0.1" max="1440" step="0.1" defaultValue={draftValue(draft, "postureHoldDuration")} placeholder="30"/><StyledSelect name="postureHoldUnit" defaultValue={draftValue(draft, "postureHoldUnit", "SECOND")}><option value="SECOND">{t("assessment.seconds")}</option><option value="MINUTE">{t("assessment.minutes")}</option><option value="HOUR">{t("assessment.hours")}</option></StyledSelect></span></label>
                 <label><span className="field-label-line"><span>{t("assessment.rulaLoadWeight")}</span><span className="optional-label">{t("common.optional")}</span></span><span className="measure-control"><input name="loadWeight" type="number" min="0" max="10000" step="0.1" defaultValue={draftValue(draft, "loadWeight")} placeholder="0"/><StyledSelect name="loadUnit" defaultValue={draftValue(draft, "loadUnit", "KG")}><option value="KG">{t("assessment.kilograms")}</option><option value="LB">{t("assessment.pounds")}</option></StyledSelect></span></label>
                 <label><span className="field-label-line"><span>{t("assessment.subjectCode")}</span><span className="optional-label">{t("common.optional")}</span></span><input name="subjectCode" defaultValue={draftValue(draft, "subjectCode")} placeholder={t("assessment.subjectCodePlaceholder")}/></label>
               </div>
             </div>
             <div className="rula-posture-panel">
               <div className="rula-posture-heading"><span className="rula-posture-icon"><Icon name="rula" size={21}/></span><div><strong>{t("assessment.rulaPosturePhoto")}</strong><small>{t("assessment.rulaPosturePhotoHint")}</small></div></div>
               <div className="rula-posture-upload">
                 <label className={`rula-posture-dropzone ${postureImagePreview ? "has-image" : ""}`}>
                   <input ref={postureImageInputRef} name="postureImage" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" aria-invalid={postureImageError ? true : undefined} aria-describedby={postureImageError ? "rula-posture-image-error" : undefined} onChange={handlePostureImageChange}/>
                   {postureImagePreview ? <><img src={postureImagePreview} alt={t("assessment.rulaPosturePhoto")}/><span className="rula-posture-change">{t("assessment.changePostureImage")}</span></> : <><Icon name="files" size={34}/><strong>{t("assessment.choosePosturePhoto")}</strong><small>{t("assessment.choosePosturePhotoHint")}</small><span className="ghost fake-button">{t("assessment.choosePhoto")}</span></>}
                 </label>
                 {postureImage && <div className="rula-posture-file-meta"><span title={postureImage.name}>{postureImage.name}</span><button type="button" className="text-button" onClick={removePostureImage}>{t("assessment.removePostureImage")}</button></div>}
                 {postureImageError && <small id="rula-posture-image-error" className="field-error" role="alert">{postureImageError}</small>}
               </div>
               <label className="rula-posture-description-field"><span className="field-label-line"><span>{t("assessment.rulaPostureDescription")}</span><span className="optional-label">{t("common.optional")}</span></span><textarea name="postureDescription" value={postureDescription} maxLength={1000} rows={4} aria-describedby="rula-posture-description-hint" placeholder={t("assessment.rulaPostureDescriptionPlaceholder")} onChange={(event) => setPostureDescription(event.target.value)}/><small id="rula-posture-description-hint" className="field-hint">{t("assessment.rulaPostureDescriptionHint")} · <span className="rula-posture-description-counter">{postureDescription.length.toLocaleString(numberLocale)} / {Number(1000).toLocaleString(numberLocale)}</span></small></label>
               <div className="rula-photo-guidance"><strong>{t("assessment.rulaPhotoGuidanceTitle")}</strong><ul><li>{t("assessment.rulaPhotoGuidanceOne")}</li><li>{t("assessment.rulaPhotoGuidanceTwo")}</li><li>{t("assessment.rulaPhotoGuidanceThree")}</li></ul></div>
               <div className="rula-ai-image-note"><Icon name="sparkles" size={17}/><span><strong>{t("assessment.rulaAiImageFuture")}</strong><small>{t("assessment.rulaAiImageFutureHint")}</small></span></div>
             </div>
           </div>
         </fieldset>
         <fieldset hidden={wizardStep !== 2}><legend>{t("assessment.bodyScoring")}</legend><input type="hidden" name="postureAnalysis" value={JSON.stringify(postureAnalysis)} readOnly/>{rulaPostureRows.map(({ key }) => <input key={key} type="hidden" name={key} value={postureAnalysis[key].score} readOnly/>)}<RulaPostureAnalysisStep analysis={postureAnalysis} result={currentRulaResult} sideResults={currentRulaSideResults} bodySide={rulaBodySide} imagePreview={postureImagePreview} postureDescription={postureDescription} locale={locale} onChange={(part, row, side) => setPostureAnalysis((current) => { if (rulaBodySide === "BOTH" && side) { const normalized = withBothSideAnalyses(current); const nextSides = { ...normalized.sideAnalyses!, [side]: { ...normalized.sideAnalyses![side]!, [part]: row } }; return side === "RIGHT" ? { ...nextSides.RIGHT!, sideAnalyses: nextSides } : { ...normalized, sideAnalyses: nextSides }; } return { ...current, [part]: row }; })}/><div className="rula-extra"><label><span className="field-label-line"><span>{t("assessment.force")}</span><span className="required-label">{t("common.required")}</span></span><StyledSelect name="force" value={rulaForce} onChange={(event) => setRulaForce(Number(event.target.value))}><option value="0">{t("assessment.noSignificantForce")} — {t("assessment.noSignificantForcePoints")} — {t("assessment.noSignificantForceRange")}</option><option value="1">{t("assessment.lowForce")} — {t("assessment.lowForcePoints")} — {t("assessment.lowForceRange")}</option><option value="2">{t("assessment.mediumForce")} — {t("assessment.mediumForcePoints")} — {t("assessment.mediumForceRange")}</option><option value="3">{t("assessment.highForce")} — {t("assessment.highForcePoints")} — {t("assessment.highForceRange")}</option></StyledSelect></label><input type="hidden" name="muscleUse" value={rulaMuscleUse ? "1" : "0"}/><RulaMuscleUseSelector value={rulaMuscleUse} onChange={setRulaMuscleUse}/></div></fieldset>
         <fieldset hidden={wizardStep !== 3}><legend>{t("assessment.rulaAssessmentReporting")}</legend><RulaReportPreview result={currentRulaResult} analysis={postureAnalysis} force={rulaForce} muscleUse={rulaMuscleUse} bodySide={rulaBodySide} locale={locale} selectedActions={selectedRulaActions} onSelectedActionsChange={setSelectedRulaActions}/></fieldset>
        <div className="wizard-actions"><button className="ghost" type="button" disabled={wizardStep === 1 || submitting} onClick={() => { setError(""); setWizardStep((step) => step === 3 ? 2 : 1); }}>{t("assessment.previousStep")}</button>{wizardStep < 3 ? <button className="primary" type="button" disabled={submitting} onClick={() => { if (validateWizardStep()) setWizardStep((step) => step === 1 ? 2 : 3); }}>{t("common.next")} <Icon name="arrow"/></button> : <button className="primary" type="submit" disabled={submitting}>{submitting ? <span className="button-spinner" aria-hidden="true"/> : <Icon name="chart"/>} {submitting ? t("assessment.registeringRula") : t("assessment.calculateRegisterRula")}</button>}</div><AutoSaveStatus lastSaved={lastSaved} hasError={autosaveError}/>
      </form>
    </SectionCard>}
    {resultsView && <SectionCard title={t("assessment.rulaResults")} description={t("assessment.rulaResultsDescription")} icon="chart"><LoadState state={state} empty={t("assessment.noRula")}>{(data) => <RulaAssessmentTable data={data} locale={locale} editable={canEdit()} onOpenReport={(item) => navigate(`/rula/${item.id}/report`)} onEdit={(item) => void editAssessment(item)} onHistory={(item) => void loadHistory(item.id)} onDownload={(item, format) => void saveBlob(`/reports/rula/${item.id}.${format}`, `${assessmentLabel}-${item.id}.${format}`).catch((reason) => setError((reason as Error).message))} onDelete={(item) => void deleteAssessment(item)}/>}</LoadState></SectionCard>}
    {!resultsView && historyAssessment && <SectionCard title={t("assessment.history")} description={t("assessment.historyDescription")} icon="clock" actions={<button className="text-button" onClick={() => setHistoryAssessment("")}>{t("assessment.historyClose")}</button>}><div className="history-list">{history.length ? history.map((version) => <div className="history-row" key={version.id}><strong>{t("common.version")} {version.version.toLocaleString(numberLocale)}</strong><span>{formatDate(version.createdAt, true)}</span></div>) : <EmptyState title={t("assessment.noHistory")} icon="clock"/>}</div></SectionCard>}
  </section>;
}
