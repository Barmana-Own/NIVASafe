export const FMEA_PROCESS_DESCRIPTION_MAX = 1_200;
export const FMEA_PROCESS_ITEM_MAX = 20;
export const FMEA_PROCESS_SUGGESTION_MAX = 10;
export const FMEA_PROCESS_AI_SUGGESTION_MAX = 6;
export const FMEA_PROCESS_SELECTION_MAX = 5;
export const FMEA_PROCESS_ITEM_LENGTH_MAX = 160;
export const FMEA_JOB_TITLE_MAX = 180;
export const FMEA_JOB_TITLE_SUGGESTION_MAX = 8;
export const FMEA_SPECIAL_CONDITIONS_MAX = 1_200;
export const FMEA_PROCESS_RISK_ROW_SUGGESTION_MIN = 5;
export const FMEA_PROCESS_RISK_ROW_SUGGESTION_MAX = 5;

export type ProcessSuggestionCategory = "equipment" | "materials" | "controls";

export type ProcessSuggestions = Record<ProcessSuggestionCategory, string[]>;
export type JobTitleSuggestions = string[];
export type FmeaProcessAutofill = {
  department: string;
  activityDescription: string;
  specialConditions: string;
  suggestions: ProcessSuggestions;
};

export type FmeaRiskSuggestionField = "failureModes" | "effects" | "causes" | "preventiveControls" | "detectionControls" | "recommendations";

export type FmeaRiskSuggestions = Record<FmeaRiskSuggestionField, string[]>;

export type FmeaRiskScoreSuggestion = {
  severity: number;
  occurrence: number;
  detection: number;
  rationale: string;
};

export type FmeaRiskRowSuggestion = {
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

export type FmeaImageRiskRow = {
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

export type FmeaImageAnalysis = {
  summary: string;
  riskRows: FmeaImageRiskRow[];
};

const categories: ProcessSuggestionCategory[] = ["equipment", "materials", "controls"];
const riskSuggestionFields: FmeaRiskSuggestionField[] = ["failureModes", "effects", "causes", "preventiveControls", "detectionControls", "recommendations"];

export function cleanText(value: unknown, maxLength = FMEA_PROCESS_ITEM_LENGTH_MAX) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function nextFmeaRowNumber(existingRowNumbers: readonly number[]) {
  const highest = existingRowNumbers.reduce((current, rowNumber) => Number.isInteger(rowNumber) && rowNumber > current ? rowNumber : current, 0);
  return highest + 1;
}

export function defaultFmeaProcessStep(activityDescription: unknown, assessmentTitle: unknown) {
  return cleanText(activityDescription, FMEA_PROCESS_DESCRIPTION_MAX) || cleanText(assessmentTitle, FMEA_PROCESS_DESCRIPTION_MAX);
}

export function cleanTextList(value: unknown, maxItems = FMEA_PROCESS_ITEM_MAX) {
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  for (const item of value) {
    const text = cleanText(item);
    if (text && !result.includes(text)) result.push(text);
    if (result.length >= maxItems) break;
  }
  return result;
}

export function cleanJobTitleList(value: unknown, maxItems = FMEA_JOB_TITLE_SUGGESTION_MAX): JobTitleSuggestions {
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  for (const item of value) {
    const text = cleanText(item, FMEA_JOB_TITLE_MAX).replace(/\s+/g, " ");
    if (text && !result.some((current) => current.toLocaleLowerCase() === text.toLocaleLowerCase())) result.push(text);
    if (result.length >= maxItems) break;
  }
  return result;
}

export function normalizeJobTitle(value: unknown) {
  return cleanText(value, FMEA_JOB_TITLE_MAX)
    .normalize("NFKC")
    .replace(/[يى]/gu, "ی")
    .replace(/[ك]/gu, "ک")
    .replace(/[ۀة]/gu, "ه")
    .replace(/[\u200c\u200d]/gu, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("fa-IR");
}

export function emptyProcessSuggestions(): ProcessSuggestions {
  return { equipment: [], materials: [], controls: [] };
}

export function emptyFmeaRiskSuggestions(): FmeaRiskSuggestions {
  return { failureModes: [], effects: [], causes: [], preventiveControls: [], detectionControls: [], recommendations: [] };
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

export function parseProcessSuggestions(answer: string): ProcessSuggestions {
  const parsed = parseJsonObject(answer);
  return parsed ? {
    equipment: cleanTextList(parsed.equipment, FMEA_PROCESS_SUGGESTION_MAX),
    materials: cleanTextList(parsed.materials, FMEA_PROCESS_SUGGESTION_MAX),
    controls: cleanTextList(parsed.controls, FMEA_PROCESS_SUGGESTION_MAX),
  } : emptyProcessSuggestions();
}

export function parseJobTitleSuggestions(answer: string): JobTitleSuggestions {
  const parsed = parseJsonObject(answer);
  return cleanJobTitleList(parsed?.jobTitles);
}

export function parseFmeaProcessAutofill(answer: string): FmeaProcessAutofill {
  const parsed = parseJsonObject(answer);
  if (!parsed) return { department: "", activityDescription: "", specialConditions: "", suggestions: emptyProcessSuggestions() };
  return {
    department: cleanText(parsed.department, 160),
    activityDescription: cleanDescription(parsed.activityDescription),
    specialConditions: cleanText(parsed.specialConditions, FMEA_SPECIAL_CONDITIONS_MAX),
    suggestions: {
      equipment: cleanTextList(parsed.equipment, FMEA_PROCESS_SUGGESTION_MAX),
      materials: cleanTextList(parsed.materials, FMEA_PROCESS_SUGGESTION_MAX),
      controls: cleanTextList(parsed.controls, FMEA_PROCESS_SUGGESTION_MAX),
    },
  };
}

export function assertFmeaProcessItemSelectionLimit(input: Partial<Record<ProcessSuggestionCategory, unknown>>, legacy?: Partial<Record<ProcessSuggestionCategory, unknown>>) {
  for (const category of categories) {
    if (!(category in input)) continue;
    const submitted = cleanTextList(input[category], FMEA_PROCESS_ITEM_MAX);
    if (submitted.length <= FMEA_PROCESS_SELECTION_MAX) continue;
    const previous = new Set(cleanTextList(legacy?.[category], FMEA_PROCESS_ITEM_MAX));
    const preservesLegacyValues = Boolean(legacy) && submitted.every((item) => previous.has(item));
    if (preservesLegacyValues) continue;
    throw Object.assign(new Error(`A maximum of ${FMEA_PROCESS_SELECTION_MAX} items may be selected in each process-suggestion category.`), { statusCode: 400, code: "FMEA_PROCESS_SELECTION_LIMIT" });
  }
}

export function parseFmeaRiskSuggestions(answer: string): FmeaRiskSuggestions {
  const parsed = parseJsonObject(answer);
  return parsed ? Object.fromEntries(riskSuggestionFields.map((field) => [field, cleanTextList(parsed[field], 6)])) as FmeaRiskSuggestions : emptyFmeaRiskSuggestions();
}

export function parseFmeaRiskScoreSuggestion(answer: string): FmeaRiskScoreSuggestion | null {
  const parsed = parseJsonObject(answer);
  const value = parsed?.scoreSuggestion;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const suggestion = value as Record<string, unknown>;
  const score = (key: "severity" | "occurrence" | "detection") => {
    const candidate = typeof suggestion[key] === "number" ? suggestion[key] : Number(suggestion[key]);
    return Number.isInteger(candidate) && candidate >= 1 && candidate <= 10 ? candidate : null;
  };
  const severity = score("severity");
  const occurrence = score("occurrence");
  const detection = score("detection");
  if (severity === null || occurrence === null || detection === null) return null;
  return { severity, occurrence, detection, rationale: cleanText(suggestion.rationale, 320) || "Review the suggested scores against the actual work conditions before confirming them." };
}

export function parseFmeaRiskRows(answer: string): FmeaRiskRowSuggestion[] {
  const parsed = parseJsonObject(answer);
  const rawRows = parsed?.riskRows ?? parsed?.rows;
  if (!Array.isArray(rawRows)) return [];
  const seen = new Set<string>();
  return rawRows.flatMap((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const row = value as Record<string, unknown>;
    const processStep = cleanRiskField(row.processStep);
    const failureMode = cleanRiskField(row.failureMode);
    const effect = cleanRiskField(row.effect);
    const cause = cleanRiskField(row.cause);
    const severity = parseImageRiskScore(row.severity);
    const occurrence = parseImageRiskScore(row.occurrence);
    const detection = parseImageRiskScore(row.detection);
    const key = [processStep, failureMode, effect, cause].join("\u0000");
    if (!processStep || !failureMode || !effect || !cause || severity === null || occurrence === null || detection === null || seen.has(key)) return [];
    seen.add(key);
    return [{ processStep, failureMode, effect, cause, preventiveControls: cleanRiskField(row.preventiveControls), detectionControls: cleanRiskField(row.detectionControls), recommendation: cleanRiskField(row.recommendation), severity, occurrence, detection }];
  }).slice(0, FMEA_PROCESS_RISK_ROW_SUGGESTION_MAX);
}

function cleanRiskField(value: unknown) {
  return cleanText(value, 1_200);
}

function normaliseScoreText(value: string) {
  return value
    .replace(/[۰-۹]/gu, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/gu, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function parseImageRiskScore(value: unknown) {
  const candidate = typeof value === "string" ? normaliseScoreText(value).match(/\d{1,2}/u)?.[0] : value;
  const score = typeof candidate === "number" ? candidate : Number(candidate);
  return Number.isInteger(score) && score >= 1 && score <= 10 ? score : null;
}

export function parseFmeaImageAnalysis(answer: string): FmeaImageAnalysis {
  const parsed = parseJsonObject(answer);
  if (!parsed) return { summary: "", riskRows: [] };
  const rawRiskRows = parsed.riskRows ?? parsed.rows;
  const riskRows = Array.isArray(rawRiskRows)
    ? rawRiskRows.slice(0, 6).flatMap((value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return [];
      const row = value as Record<string, unknown>;
      const failureMode = cleanRiskField(row.failureMode);
      const effect = cleanRiskField(row.effect);
      const cause = cleanRiskField(row.cause);
      const severity = parseImageRiskScore(row.severity);
      const occurrence = parseImageRiskScore(row.occurrence);
      const detection = parseImageRiskScore(row.detection);
      if (!failureMode || !effect || !cause || severity === null || occurrence === null || detection === null) return [];
      return [{
        failureMode,
        effect,
        cause,
        preventiveControls: cleanRiskField(row.preventiveControls),
        detectionControls: cleanRiskField(row.detectionControls),
        recommendation: cleanRiskField(row.recommendation),
        severity,
        occurrence,
        detection,
      }];
    })
    : [];
  return { summary: cleanText(parsed.summary, 500), riskRows };
}

export function cleanDescription(value: unknown) {
  if (typeof value !== "string") return "";
  const text = value
    .replace(/^```(?:text|json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .replace(/^description\s*:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const bounded = text.slice(0, FMEA_PROCESS_DESCRIPTION_MAX).trim();
  return countShortDescriptionSentences(bounded) <= 2 ? bounded : "";
}

export function countShortDescriptionSentences(value: string) {
  const text = value.trim();
  if (!text) return 0;
  return text.split(/(?:[.!?؟]+|\n+)/u).map((part) => part.trim()).filter(Boolean).length;
}

export function isValidShortActivityDescription(value: unknown) {
  if (typeof value !== "string") return false;
  const text = value.trim();
  return text.length >= 2 && text.length <= FMEA_PROCESS_DESCRIPTION_MAX && countShortDescriptionSentences(text) <= 2;
}

export function fallbackProcessDescription(jobTitle: string, department?: string | null, locale: "fa" | "en" = "fa") {
  const title = cleanText(jobTitle, 180);
  const unit = cleanText(department, 120);
  if (locale === "en") return unit ? `Perform ${title} activities in the ${unit} unit according to the approved work instructions and safety controls.` : `Perform ${title} activities according to the approved work instructions and safety controls.`;
  return unit ? `فعالیت‌های ${title} در واحد ${unit} طبق دستورالعمل کار و کنترل‌های ایمنی مصوب انجام می‌شود.` : `فعالیت‌های ${title} طبق دستورالعمل کار و کنترل‌های ایمنی مصوب انجام می‌شود.`;
}

export function buildProcessSuggestionsPrompt(input: { jobTitle: string; department?: string | null; activityDescription?: string | null; databaseSuggestions: ProcessSuggestions; locale: "fa" | "en" }) {
  const language = input.locale === "en" ? "English" : "Persian";
  return [
    "NIVASAFE_PROCESS_SUGGESTIONS",
    `Return only valid JSON with exactly these arrays: {\"equipment\":[],\"materials\":[],\"controls\":[]}.`,
    `Use ${language}. Return at most ${FMEA_PROCESS_AI_SUGGESTION_MAX} concise items per array, each item at most 100 characters. Do not add markdown or explanations.`,
    `Job/process: ${cleanText(input.jobTitle, 180)}`,
    `Department/unit: ${cleanText(input.department, 120) || "-"}`,
    `Activity description: ${cleanText(input.activityDescription, 600) || "-"}`,
    `Existing catalog suggestions: ${JSON.stringify(input.databaseSuggestions)}`,
    "Suggest only plausible equipment/machinery, materials, and existing HSE controls for this job. The user will confirm every item.",
  ].join("\n");
}

export function buildJobTitleSuggestionsPrompt(input: { jobTitle: string; department?: string | null; activityDescription?: string | null; existingJobTitles?: string[]; locale: "fa" | "en" }) {
  const language = input.locale === "en" ? "English" : "Persian";
  const existingTitles = cleanJobTitleList(input.existingJobTitles, 20);
  return [
    "NIVASAFE_FMEA_JOB_TITLE_SUGGESTIONS",
    `Return only valid JSON with exactly this array: {\"jobTitles\":[]}.`,
    `Use ${language}. Return at most ${FMEA_JOB_TITLE_SUGGESTION_MAX} concise and distinct job/process titles, each at most ${FMEA_JOB_TITLE_MAX} characters. Do not add markdown or explanations.`,
    "Return titles only; do not return descriptions, codes, hazards, controls, or recommendations.",
    "Do not repeat the entered title or any existing catalog title.",
    `Entered job/process title: ${cleanText(input.jobTitle, FMEA_JOB_TITLE_MAX)}`,
    `Department/unit: ${cleanText(input.department, 160) || "-"}`,
    `Activity description: ${cleanText(input.activityDescription, 600) || "-"}`,
    `Existing catalog titles: ${JSON.stringify(existingTitles)}`,
    "Suggest practical alternative titles that an HSE assessor could use to identify the same or a closely related work activity. The user must review and confirm a title before it is used.",
  ].join("\n");
}

export function buildFmeaProcessAutofillPrompt(input: { projectName?: string | null; jobTitle: string; department?: string | null; activityDescription?: string | null; specialConditions?: string | null; databaseSuggestions: ProcessSuggestions; locale: "fa" | "en" }) {
  const language = input.locale === "en" ? "English" : "Persian";
  return [
    "NIVASAFE_FMEA_PROCESS_AUTOFILL",
    `Return only valid JSON with exactly these fields: {"department":"","activityDescription":"","specialConditions":"","equipment":[],"materials":[],"controls":[]}.`,
    `Use ${language}. Fill only fields that can be reasonably inferred from the project, job/process title, department, activity description and catalog context. Leave unknown fields as an empty string or empty array; do not invent organization-specific facts.`,
    "Department/unit: return one concise unit or department name, maximum 160 characters.",
    `Activity description: return one or two concise sentences, maximum ${FMEA_PROCESS_DESCRIPTION_MAX} characters.`,
    `Special work conditions: return only relevant conditions or limitations supported by the context, maximum ${FMEA_SPECIAL_CONDITIONS_MAX} characters; otherwise return an empty string.`,
    `Return at most ${FMEA_PROCESS_SUGGESTION_MAX} concise items per equipment/materials/controls array, each item at most ${FMEA_PROCESS_ITEM_LENGTH_MAX} characters.`,
    "Do not return markdown, explanations, risk rows, scores, codes, or recommendations. The user will review and edit every autofilled value before registration.",
    `Project: ${cleanText(input.projectName, 180) || "-"}`,
    `Job/process title: ${cleanText(input.jobTitle, FMEA_JOB_TITLE_MAX)}`,
    `Current department/unit: ${cleanText(input.department, 160) || "-"}`,
    `Current activity description: ${cleanText(input.activityDescription, FMEA_PROCESS_DESCRIPTION_MAX) || "-"}`,
    `Current special work conditions: ${cleanText(input.specialConditions, FMEA_SPECIAL_CONDITIONS_MAX) || "-"}`,
    `Existing catalog suggestions: ${JSON.stringify(input.databaseSuggestions)}`,
  ].join("\n");
}

export function buildDescriptionPrompt(input: { jobTitle: string; department?: string | null; activityDescription?: string | null; locale: "fa" | "en" }) {
  const language = input.locale === "en" ? "English" : "Persian";
  return [
    "NIVASAFE_PROCESS_DESCRIPTION",
    `Write only one concise ${language} activity description in one or two sentences. Maximum ${FMEA_PROCESS_DESCRIPTION_MAX} characters.`,
    "If an existing description is supplied, improve its clarity without adding unsupported facts. Do not use markdown, headings, or quotation marks.",
    `Job/process: ${cleanText(input.jobTitle, 180)}`,
    `Department/unit: ${cleanText(input.department, 120) || "-"}`,
    `Existing description: ${cleanText(input.activityDescription, FMEA_PROCESS_DESCRIPTION_MAX) || "-"}`,
  ].join("\n");
}

export function buildFmeaRiskSuggestionsPrompt(input: {
  projectName?: string | null;
  jobTitle: string;
  department?: string | null;
  activityDescription?: string | null;
  processStep?: string | null;
  failureMode?: string | null;
  effect?: string | null;
  cause?: string | null;
  preventiveControls?: string | null;
  detectionControls?: string | null;
  recommendation?: string | null;
  locale: "fa" | "en";
}) {
  const language = input.locale === "en" ? "English" : "Persian";
  return [
    "NIVASAFE_FMEA_RISK_ROW_SUGGESTIONS",
    `Return only valid JSON with exactly these arrays and one score object: {"failureModes":[],"effects":[],"causes":[],"preventiveControls":[],"detectionControls":[],"recommendations":[],"scoreSuggestion":{"severity":1,"occurrence":1,"detection":1,"rationale":""}}.`,
    `Use ${language}. Return at most 6 concise items per array, each item at most 160 characters. Do not add markdown or explanations.`,
    "scoreSuggestion must contain integer severity, occurrence, and detection values from 1 to 10. Severity describes impact, occurrence describes likelihood of recurrence, and detection describes how difficult the failure is to detect; include a concise rationale. These are advisory values, not final assessment results.",
    `Project: ${cleanText(input.projectName, 180) || "-"}`,
    `Job/process: ${cleanText(input.jobTitle, 180)}`,
    `Department/unit: ${cleanText(input.department, 120) || "-"}`,
    `Activity description: ${cleanText(input.activityDescription, 600) || "-"}`,
    `Process step: ${cleanText(input.processStep, 180) || "-"}`,
    `Existing failure mode: ${cleanText(input.failureMode, 500) || "-"}`,
    `Existing effect: ${cleanText(input.effect, 500) || "-"}`,
    `Existing cause: ${cleanText(input.cause, 500) || "-"}`,
    `Existing preventive controls: ${cleanText(input.preventiveControls, 500) || "-"}`,
    `Existing detection controls: ${cleanText(input.detectionControls, 500) || "-"}`,
    `Existing recommendation: ${cleanText(input.recommendation, 500) || "-"}`,
    "Suggest plausible failure modes, effects, preventive controls, detection controls, causes, and HSE corrective actions for the stated process. Suggestions are advisory drafts and require explicit user confirmation before final registration; the user may review and edit every field.",
  ].join("\n");
}

export function buildFmeaRiskRowsPrompt(input: {
  projectName?: string | null;
  jobTitle: string;
  department?: string | null;
  activityDescription?: string | null;
  specialConditions?: string | null;
  processStep?: string | null;
  locale: "fa" | "en";
}) {
  const language = input.locale === "en" ? "English" : "Persian";
  return [
    "NIVASAFE_FMEA_RISK_ROWS",
    'Return only valid JSON: {"riskRows":[{"processStep":"","failureMode":"","effect":"","cause":"","preventiveControls":"","detectionControls":"","recommendation":"","severity":1,"occurrence":1,"detection":1}]}.' ,
    `Use ${language}. Return exactly ${FMEA_PROCESS_RISK_ROW_SUGGESTION_MIN} distinct, concise editable FMEA risk-row drafts. Every text field must be no more than 1,200 characters. Do not add markdown, introductions, or explanations outside JSON.`,
    "Use the stage-one project, job, department, activity description, special conditions, and process step as the primary context. Do not invent exact measurements, equipment specifications, organization-specific facts, or unprovided incidents.",
    "Scores are advisory integers from 1 to 10 and must be reviewed by a qualified HSE assessor before final registration. These rows are defaults for the review table, not approved results.",
    `Project: ${cleanText(input.projectName, 180) || "-"}`,
    `Job/process: ${cleanText(input.jobTitle, 180) || "-"}`,
    `Department/unit: ${cleanText(input.department, 160) || "-"}`,
    `Activity description: ${cleanText(input.activityDescription, FMEA_PROCESS_DESCRIPTION_MAX) || "-"}`,
    `Special work conditions: ${cleanText(input.specialConditions, FMEA_SPECIAL_CONDITIONS_MAX) || "-"}`,
    `Process step: ${cleanText(input.processStep, FMEA_PROCESS_DESCRIPTION_MAX) || "-"}`,
  ].join("\n");
}

export function buildFmeaImageAnalysisPrompt(input: { jobTitle: string; department?: string | null; activityDescription?: string | null; locale: "fa" | "en" }) {
  const language = input.locale === "en" ? "English" : "Persian";
  return [
    "NIVASAFE_FMEA_IMAGE_REVIEW",
    'Return only valid JSON: {"summary":"","riskRows":[{"failureMode":"","effect":"","cause":"","preventiveControls":"","detectionControls":"","recommendation":"","severity":1,"occurrence":1,"detection":1}]}.',
    `Use ${language}. Return at most 6 concise risk rows. Every text field must be no more than 1,200 characters. Do not add markdown or explanations outside JSON.`,
    "Inspect the supplied workplace or process image for plausible FMEA hazards. Use only visible evidence and the supplied process context; do not identify people or infer unsupported facts. If the image is unclear, state that in summary and return an empty riskRows array.",
    "Each score is advisory: severity, occurrence, and detection are integers from 1 to 10 and must be reviewed by a qualified HSE assessor before use. Do not invent exact measurements, equipment specifications, or organization-specific controls.",
    `Job/process: ${cleanText(input.jobTitle, 180) || "-"}`,
    `Department/unit: ${cleanText(input.department, 120) || "-"}`,
    `Activity description: ${cleanText(input.activityDescription, 600) || "-"}`,
    "Suggestions are drafts only. They may be added automatically as editable review rows after upload, and a qualified HSE assessor must review and edit them before final registration.",
  ].join("\n");
}

export function catalogSuggestions(value: Record<string, unknown>): ProcessSuggestions {
  return Object.fromEntries(categories.map((category) => [category, cleanTextList(value[category], FMEA_PROCESS_SUGGESTION_MAX)])) as ProcessSuggestions;
}

export function limitProcessSuggestions(value: ProcessSuggestions, maxItems: number): ProcessSuggestions {
  const limit = Math.max(0, Math.min(FMEA_PROCESS_SUGGESTION_MAX, Math.floor(maxItems)));
  return Object.fromEntries(categories.map((category) => [category, value[category].slice(0, limit)])) as ProcessSuggestions;
}
