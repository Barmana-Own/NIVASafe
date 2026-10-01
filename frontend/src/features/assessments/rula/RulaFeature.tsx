import { calculateRula, suggestedRulaPostureScore, type RulaInput } from "@nivasafe/domain";
import { get as getDraft, set as setDraft } from "idb-keyval";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, getSession, useLoad } from "../../../api/client";
import { EmptyState, Icon, PageHeader, SectionCard, StatusBadge, StyledSelect, TableContainer, formatDate, useDialog } from "../../../components/UI";
import { clearAutoSaveDraft } from "../../../forms/AutoSaveForm";
import { clearAssessmentWizardStep, readStoredDraft, snapshotForm as snapshotStoredForm, writeStoredDraft } from "../../../forms/autoSave";
import { useI18n } from "../../../i18n";
import { LoadState } from "../../general/GeneralPages";
import { type Project, type JobCatalogEntry, type ProcessSuggestionResponse, type RulaActivityInfo, type RulaPosturePart, type RulaPostureSource, type RulaPostureRow, type RulaOverlayPoint, type RulaPostureImagePoint, type RulaPostureImageOverlay, type RulaPostureAnalysisResponse, type RulaPostureImageAnalysisResponse, type RulaBodySide, type RulaActionBodySide, type RulaSinglePostureAnalysis, type RulaPostureAnalysis, type RulaWizardStep, type Rula, type RulaActionPriority, type RulaReportFactor, type RulaCorrectionAction, type RulaSideAssessmentResult, type RulaPersistedAction, type RulaReportPayload, type ReportActionAiStatus, type ReportActionSuggestionsResponse, type VersionRow, type DraftRecord, OverlayDialogFrame, ReportInlineDetails, AssessmentImageLightbox, RulaPostureOverlayLayer, JobCatalogSearch, RULA_CREATE_PROJECT_OPTION, FMEA_JOB_CATALOG_LIMIT, RULA_TASK_DESCRIPTION_MAX, RULA_POSTURE_IMAGE_MAX_BYTES, RULA_POSTURE_IMAGE_TYPES, RULA_CORRECTIVE_SUGGESTION_MAX, localizedJobTitle, scrollAssessmentValidationToTop, countShortDescriptionSentences, draftKeyFor, canEdit, browserStorage, readLocalDraft, saveBlob, readAssessmentDraft, persistDraftNow, cancelDraftTimer, queueDraft, draftValue, draftBoolean, projectName, AutoSaveStatus, RulaReportStepper, isRecord } from "../assessmentShared";


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

function postureOverlayFromValue(value: unknown): RulaPostureImageOverlay | undefined {
  if (!isRecord(value) || !isRecord(value.points)) return undefined;
  const points: Partial<Record<RulaOverlayPoint, RulaPostureImagePoint>> = {};
  for (const key of ["head", "neck", "shoulder", "elbow", "wrist", "hip", "knee", "ankle"] as const) {
    const candidate = value.points[key];
    if (!isRecord(candidate)) continue;
    const x = Number(candidate.x);
    const y = Number(candidate.y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) continue;
    const confidence = candidate.confidence === null || candidate.confidence === undefined ? candidate.confidence : Number(candidate.confidence);
    if (confidence !== undefined && confidence !== null && (!Number.isFinite(confidence) || confidence < 0 || confidence > 1)) continue;
    points[key] = confidence === undefined ? { x, y } : { x, y, confidence };
  }
  return Object.keys(points).length ? { points } : undefined;
}

function rulaAnalysisFromImageSide(value: unknown): { analysis: RulaSinglePostureAnalysis; overlay?: RulaPostureImageOverlay } | null {
  if (!isRecord(value)) return null;
  const analysis: Partial<RulaSinglePostureAnalysis> = {};
  for (const { key } of rulaPostureRows) {
    const candidate = value[key];
    if (!isRecord(candidate) || !hasPostureScore(candidate.score) || typeof candidate.detected !== "boolean") return null;
    const confidence = candidate.confidence === null || candidate.confidence === undefined ? null : Number(candidate.confidence);
    if (confidence !== null && (!Number.isFinite(confidence) || confidence < 0 || confidence > 1)) return null;
    const angle = candidate.detected ? postureAngle(candidate.angle) : null;
    const score = !candidate.detected ? 1 : angle === null ? postureScore(candidate.score, 1) : suggestedRulaPostureScore(key, angle, candidate.detected, postureScore(candidate.score, 1));
    analysis[key] = {
      angle,
      score,
      detected: candidate.detected,
      source: "AI",
      confirmedByUser: false,
      confidence,
    };
  }
  return { analysis: analysis as RulaSinglePostureAnalysis, overlay: postureOverlayFromValue(value.overlay) };
}

function postureAnalysisFromValue(value: unknown): RulaPostureAnalysis {
  const source = isRecord(value) ? value : {};
  const direct = postureAnalysisRowsFromValue(source);
  const rawSides = isRecord(source.sideAnalyses) ? source.sideAnalyses : {};
  const sideAnalyses = Object.fromEntries((["LEFT", "RIGHT"] as const).filter((side) => isRecord(rawSides[side])).map((side) => [side, postureAnalysisRowsFromValue(rawSides[side])])) as Partial<Record<RulaBodySide, RulaSinglePostureAnalysis>>;
  const imageOverlay = postureOverlayFromValue(source.imageOverlay);
  const rawSideOverlays = isRecord(source.sideImageOverlays) ? source.sideImageOverlays : {};
  const sideImageOverlays = Object.fromEntries((["LEFT", "RIGHT"] as const).flatMap((side) => {
    const overlay = postureOverlayFromValue(rawSideOverlays[side]);
    return overlay ? [[side, overlay]] : [];
  })) as Partial<Record<RulaBodySide, RulaPostureImageOverlay>>;
  return {
    ...direct,
    ...(Object.keys(sideAnalyses).length ? { sideAnalyses } : {}),
    ...(imageOverlay ? { imageOverlay } : {}),
    ...(Object.keys(sideImageOverlays).length ? { sideImageOverlays } : {}),
  };
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
  const { sideAnalyses, imageOverlay, sideImageOverlays, ...directRows } = analysis;
  const left = sideAnalyses?.LEFT ?? directRows;
  const right = sideAnalyses?.RIGHT ?? directRows;
  const leftOverlay = sideImageOverlays?.LEFT ?? imageOverlay;
  const rightOverlay = sideImageOverlays?.RIGHT ?? imageOverlay;
  return {
    ...right,
    sideAnalyses: { LEFT: left, RIGHT: right },
    ...(leftOverlay || rightOverlay ? { sideImageOverlays: { LEFT: leftOverlay, RIGHT: rightOverlay } } : {}),
  };
}

function isRulaPostureResultReviewed(row: RulaPostureRow) {
  return row.source !== "DEFAULT";
}

function isRulaSingleAnalysisReviewed(analysis: RulaSinglePostureAnalysis | undefined) {
  return Boolean(analysis && rulaPostureRows.every(({ key }) => isRulaPostureResultReviewed(analysis[key])));
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
    ...(String(values.get("postureImageAttachmentId") ?? "").trim() ? { postureImageAttachmentId: String(values.get("postureImageAttachmentId")).trim() } : {}),
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

function rulaActionTitleKey(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/gu, " ");
}

function rulaActionMatchesSuggestion(action: RulaCorrectionAction, suggestion: RulaCorrectionAction) {
  return rulaActionIsSame(action, suggestion) || [action.titleFa, action.titleEn].some((title) => title && [suggestion.titleFa, suggestion.titleEn].some((suggestionTitle) => rulaActionTitleKey(title) === rulaActionTitleKey(suggestionTitle)));
}

function rulaActionForDataTable(action: RulaCorrectionAction, suggestions: RulaCorrectionAction[]) {
  if (action.affectedParts.length) return action;
  const suggestion = suggestions.find((item) => rulaActionMatchesSuggestion(action, item));
  return suggestion ? { ...action, affectedParts: suggestion.affectedParts } : action;
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

function RulaPostureEditDialog({ part, row, hasImage, onCancel, onSave }: { part: RulaPosturePart; row: RulaPostureRow; hasImage: boolean; onCancel: () => void; onSave: (row: RulaPostureRow) => void }) {
  const { t } = useI18n();
  const [angle, setAngle] = useState(row.angle === null ? "" : String(row.angle));
  const [score, setScore] = useState(String(row.score));
  const [detected, setDetected] = useState(row.detected);
  const [validationError, setValidationError] = useState("");
  const rowLabel = rulaPostureRows.find((item) => item.key === part)?.labelKey ?? "assessment.posturePart";
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
  return <OverlayDialogFrame onClose={onCancel} backdropClassName="dialog-backdrop rula-edit-backdrop" dialogClassName="rula-edit-dialog" ariaLabelledBy="rula-edit-title" ariaDescribedBy="rula-edit-hint">
      <div className="rula-edit-dialog-head"><div><strong id="rula-edit-title">{t("assessment.editPostureResult")}</strong><small>{t(rowLabel)}</small></div><button type="button" className="icon-button" onClick={onCancel} aria-label={t("assessment.cancelEdit")}><span aria-hidden="true">×</span></button></div>
      <p id="rula-edit-hint" className="rula-edit-dialog-hint">{t("assessment.editPostureResultHint")}</p>
      <div className="rula-edit-form">
        <label>{t("assessment.detectedAngle")}<span className="rula-angle-input"><input autoFocus type="number" min="-180" max="180" step="1" value={angle} aria-invalid={validationError ? true : undefined} onChange={(event) => changeAngle(event.target.value)} placeholder="—"/><span>°</span></span></label>
        <label>{t("assessment.suggestedScore")}<input type="number" min="1" max="6" step="1" value={score} disabled={part === "wristTwist" && !detected} aria-invalid={validationError ? true : undefined} onChange={(event) => { setValidationError(""); setScore(event.target.value); }} required/></label>
        <label className="rula-detection-toggle"><input type="checkbox" checked={detected} onChange={(event) => changeDetected(event.target.checked)}/><span>{part === "wristTwist" ? t("assessment.wristTwistPresent") : t(hasImage ? "assessment.detectedInImage" : "assessment.rulaDetectedFromInfo")}</span></label>
      </div>
      {validationError && <p className="rula-edit-error" role="alert">{validationError}</p>}
      <div className="rula-edit-actions"><button type="button" className="ghost" onClick={onCancel}>{t("common.cancel")}</button><button type="button" className="primary" onClick={save}><Icon name="check"/> {t("dialog.save")}</button></div>
  </OverlayDialogFrame>;
}

function RulaPostureTable({ title, rows, analysis, locale, onEdit }: { title: string; rows: Array<{ key: RulaPosturePart; labelKey: string; group: "A" | "B" }>; analysis: RulaPostureAnalysis; locale: "fa" | "en"; onEdit: (part: RulaPosturePart) => void }) {
  const { t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  return <section className="rula-analysis-table-card"><div className="rula-analysis-table-head"><strong>{title}</strong><small>{t("assessment.rulaAiResultsHint")}</small></div><TableContainer className="rula-analysis-table-container"><table className="rula-analysis-table"><thead><tr><th>{t("assessment.bodyPart")}</th><th>{t("assessment.detectedAngle")}</th><th>{t("assessment.detectedStatus")}</th><th>{t("assessment.resultSource")}</th><th>{t("assessment.suggestedScore")}</th><th>{t("assessment.operations")}</th></tr></thead><tbody>{rows.map((item) => { const row = analysis[item.key]; const reviewed = isRulaPostureResultReviewed(row); const status = item.key === "wristTwist" ? row.detected ? t("assessment.present") : t("assessment.notPresent") : row.detected ? t("assessment.detected") : row.source === "DEFAULT" ? t("assessment.pendingDetection") : t("assessment.notDetected"); const reviewLabel = row.confirmedByUser ? t("assessment.confirmedByUser") : row.source === "AI" ? "" : t("assessment.manualReviewRequiredShort"); return <tr key={item.key}><td data-label={t("assessment.bodyPart")}><strong>{t(item.labelKey)}</strong></td><td data-label={t("assessment.detectedAngle")} className="rula-angle-value">{formatPostureAngle(row.angle, locale)}</td><td data-label={t("assessment.detectedStatus")}><span className={`rula-detection-badge ${row.detected ? "detected" : "pending"}`}>{status}</span></td><td data-label={t("assessment.resultSource")}><div className="rula-source-stack"><small className={`rula-source-badge source-${row.source.toLowerCase()}`}>{t(rulaSourceLabelKey(row.source))}</small>{reviewLabel && <small className={reviewed ? "rula-confirmed-badge" : "rula-awaiting-badge"}>{reviewLabel}</small>}</div></td><td data-label={t("assessment.suggestedScore")}><strong className={`rula-suggested-score ${reviewed ? "" : "rula-unreviewed-value"}`}>{reviewed ? row.score.toLocaleString(numberLocale) : "—"}</strong></td><td data-label={t("assessment.operations")}><div className="rula-row-actions"><button type="button" className="icon-button rula-edit-button" onClick={() => onEdit(item.key)} title={t("assessment.editPostureResult")} aria-label={`${t("assessment.editPostureResult")}: ${t(item.labelKey)}`}><Icon name="edit" size={15}/></button></div></td></tr>; })}</tbody></table></TableContainer></section>;
}

function RulaPostureVisual({ imagePreview, overlay, postureDescription, analysis, locale }: { imagePreview: string; overlay?: RulaPostureImageOverlay; postureDescription: string; analysis: RulaSinglePostureAnalysis; locale: "fa" | "en" }) {
  const { t } = useI18n();
  const hasImage = Boolean(imagePreview);
  const imageTitle = t("assessment.rulaAnalysisImage");
  const visualTitle = hasImage ? imageTitle : t("assessment.rulaTextAnalysisTitle");
  const visualHint = hasImage ? t("assessment.rulaAnalysisImageHint") : t("assessment.rulaTextAnalysisHint");
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const details = <div className="assessment-image-analysis-details"><strong>{t("assessment.imageAnalysisDetails")}</strong><div className="rula-image-analysis-rows">{rulaPostureRows.map((item) => { const row = analysis[item.key]; return <div key={item.key}><span>{t(item.labelKey)}</span><strong>{formatPostureAngle(row.angle, locale)}</strong><b>{t("assessment.suggestedScore")}: {row.score.toLocaleString(numberLocale)}</b><small>{row.confirmedByUser ? t("assessment.confirmedByUser") : t(rulaSourceLabelKey(row.source))}</small></div>; })}</div>{postureDescription.trim() && <p>{postureDescription.trim()}</p>}</div>;
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { if (!imagePreview) setExpanded(false); }, [imagePreview]);
  return <section className="rula-analysis-visual"><div className="rula-analysis-visual-head"><div><strong>{visualTitle}</strong><small>{visualHint}</small></div><span className="rula-ai-chip"><Icon name="sparkles" size={14}/> {hasImage ? t("assessment.rulaFutureModel") : t("assessment.rulaTextAnalysisTitle")}</span></div><div className={`rula-analysis-canvas ${imagePreview ? "has-image" : "empty"}`}>{imagePreview ? <button type="button" className="rula-analysis-image-button" onClick={() => setExpanded(true)} aria-label={t("assessment.expandImage")}><img src={imagePreview} alt={imageTitle}/><RulaPostureOverlayLayer overlay={overlay}/><span className="rula-image-expand-hint">{t("assessment.expandImage")}</span></button> : <div className="rula-visual-empty"><Icon name="rula" size={36}/><strong>{t("assessment.rulaTextAnalysisTitle")}</strong><small>{t("assessment.rulaTextAnalysisHint")}</small></div>}</div>{postureDescription.trim() && <div className="rula-posture-description-preview"><strong>{t("assessment.rulaPostureDescription")}</strong><p>{postureDescription.trim()}</p></div>}<small className="rula-analysis-visual-note">{hasImage ? t("assessment.rulaOverlayFutureHint") : t("assessment.rulaTextAnalysisNote")}</small>{expanded && <AssessmentImageLightbox title={imageTitle} alt={imageTitle} preview={imagePreview} overlay={overlay} details={details} onClose={() => setExpanded(false)}/>}</section>;
}

function RulaMuscleUseSelector({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {

  const { t } = useI18n();
  return <label className="rula-muscle-use-field"><span className="field-label-line"><span>{t("assessment.repetitiveMuscle")}</span><span className="required-label">{t("common.required")}</span></span><StyledSelect name="muscleUseOption" value={value ? "1" : "0"} required aria-label={t("assessment.repetitiveMuscle")} onChange={(event) => onChange(event.target.value === "1")}><option value="1">{t("assessment.repetitiveMuscleCriterionOne")} — {t("assessment.repetitiveMuscleCriterionOneScore")}</option><option value="0">{t("assessment.repetitiveMuscleCriterionZero")} — {t("assessment.repetitiveMuscleCriterionZeroScore")}</option></StyledSelect></label>;
}

function RulaPostureAnalysisStep({ analysis, result, sideResults, bodySide, imagePreview, postureDescription, locale, initialEditPart, initialSide, onChange }: { analysis: RulaPostureAnalysis; result: ReturnType<typeof calculateRula>; sideResults?: Partial<Record<RulaBodySide, ReturnType<typeof calculateRula>>>; bodySide: "LEFT" | "RIGHT" | "BOTH"; imagePreview: string; postureDescription: string; locale: "fa" | "en"; initialEditPart?: RulaPosturePart; initialSide?: RulaBodySide; onChange: (part: RulaPosturePart, row: RulaPostureRow, side?: RulaBodySide) => void }) {
  const { t } = useI18n();
  const requestedPosturePartValue = typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("part")?.trim() ?? "";
  const initialRequestedPart = rulaPostureRows.some(({ key }) => key === requestedPosturePartValue) ? requestedPosturePartValue as RulaPosturePart : undefined;
  const requestedSideValue = typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("side")?.trim() ?? "";
  const initialRequestedSide = requestedSideValue === "LEFT" || requestedSideValue === "RIGHT" ? requestedSideValue : undefined;
  const [editing, setEditing] = useState<RulaPosturePart | null>(initialEditPart ?? initialRequestedPart ?? null);
  const [activeSide, setActiveSide] = useState<RulaBodySide>(initialSide ?? initialRequestedSide ?? "RIGHT");
  const visibleAnalysis = bodySide === "BOTH" ? analysis.sideAnalyses?.[activeSide] ?? analysis : analysis;
  const visibleResult = bodySide === "BOTH" ? sideResults?.[activeSide] ?? result : result;
  const actionLevel = rulaActionLevelFor(visibleResult.actionLevel);
  const mainFactor = rulaMainFactorKey(visibleAnalysis);
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const visibleOverlay = bodySide === "BOTH" ? analysis.sideImageOverlays?.[activeSide] : analysis.imageOverlay;
  const resultReady = bodySide === "BOTH" ? isRulaSingleAnalysisReviewed(analysis.sideAnalyses?.LEFT) && isRulaSingleAnalysisReviewed(analysis.sideAnalyses?.RIGHT) : isRulaSingleAnalysisReviewed(analysis);
  const scoreForGauge = resultReady ? Math.max(1, Math.min(7, visibleResult.score)) : 0;
  const gaugeStyle = { "--rula-score-angle": `${scoreForGauge ? Math.round((scoreForGauge / 7) * 270) : 0}deg` } as CSSProperties;
  const hasImage = Boolean(imagePreview);
  function change(part: RulaPosturePart, row: RulaPostureRow) { onChange(part, row, bodySide === "BOTH" ? activeSide : undefined); }
  return <div className="rula-analysis-step rula-smart-analysis"><div className="rula-analysis-intro"><div className="rula-analysis-heading"><span className="rula-analysis-heading-icon"><Icon name="rula" size={19}/></span><div><strong>{t("assessment.rulaSmartPostureTitle")}</strong><small>{t("assessment.rulaSmartPostureDescription")}</small></div></div><span className={`rula-analysis-source ${resultReady ? "ready" : "pending"}`}><Icon name={resultReady ? "check" : "activity"} size={15}/> {resultReady ? t("assessment.rulaAnalysisCompleted") : t("assessment.rulaModelReviewable")}</span></div>{bodySide === "BOTH" && <><div className="rula-side-tabs" role="tablist" aria-label={t("assessment.bodySide")}>{(["RIGHT", "LEFT"] as const).map((side) => <button type="button" role="tab" aria-selected={activeSide === side} className={activeSide === side ? "active" : ""} onClick={() => { setActiveSide(side); setEditing(null); }} key={side}>{side === "RIGHT" ? t("assessment.right") : t("assessment.left")}</button>)}</div>{sideResults?.LEFT && sideResults.RIGHT && <div className="rula-side-score-strip" aria-label={t("assessment.bothSides")}><span><small>{t("assessment.right")}</small><strong>{resultReady ? sideResults.RIGHT.score.toLocaleString(numberLocale) : "—"}</strong></span><span><small>{t("assessment.left")}</small><strong>{resultReady ? sideResults.LEFT.score.toLocaleString(numberLocale) : "—"}</strong></span><span className="final"><small>{t("assessment.bothSides")}</small><strong>{resultReady ? result.score.toLocaleString(numberLocale) : "—"}</strong></span></div>}</>}{!resultReady && <div className="rula-review-notice" role="status"><div><strong>{t("assessment.rulaAutomaticAnalysisPending")}</strong><small>{t(hasImage ? "assessment.rulaAutomaticAnalysisHint" : "assessment.rulaTextAnalysisNote")}</small></div></div>}<div className="rula-analysis-layout"><div className="rula-analysis-table-stack"><RulaPostureTable title={t("assessment.rulaGroupA")} rows={rulaGroupARows} analysis={visibleAnalysis} locale={locale} onEdit={setEditing}/><RulaPostureTable title={t("assessment.rulaGroupB")} rows={rulaGroupBRows} analysis={visibleAnalysis} locale={locale} onEdit={setEditing}/><div className="rula-group-summary" aria-label={t("assessment.rulaGroupScores")}><div><span>{t("assessment.rulaGroupA")}</span><strong>{resultReady ? visibleResult.groupA.toLocaleString(numberLocale) : "—"}</strong></div><div><span>{t("assessment.rulaGroupB")}</span><strong>{resultReady ? visibleResult.groupB.toLocaleString(numberLocale) : "—"}</strong></div></div></div><RulaPostureVisual imagePreview={imagePreview} overlay={visibleOverlay} postureDescription={postureDescription} analysis={visibleAnalysis} locale={locale}/></div><section className="rula-analysis-summary"><div className="rula-score-summary-main"><div className="rula-score-gauge" style={gaugeStyle} role="progressbar" aria-label={t("assessment.rulaScoreLabel")} aria-valuemin={1} aria-valuemax={7} aria-valuenow={scoreForGauge || undefined}><span className="rula-score-gauge-progress"/><strong>{resultReady ? visibleResult.score.toLocaleString(numberLocale) : "—"}</strong><small>{t("assessment.rulaCurrentScore")}</small></div><div className="rula-summary-score"><small>{t("assessment.rulaAnalysisSummary")}</small><strong>{resultReady ? `RULA Score = ${visibleResult.score.toLocaleString(numberLocale)}` : t("assessment.rulaAutomaticAnalysisPending")}</strong></div></div>{resultReady && <><span className={`rula-summary-badge ${actionLevel.className}`}>{t(actionLevel.labelKey)}</span><p>{t("assessment.rulaMainFactorSummary", { factor: t(`assessment.${mainFactor}`) })}</p></>}</section>{editing && <RulaPostureEditDialog part={editing} row={visibleAnalysis[editing]} hasImage={hasImage} onCancel={() => setEditing(null)} onSave={(row) => { change(editing, row); setEditing(null); }}/>}</div>;
}

const rulaFactorImpactKeys: Record<RulaReportFactor["impactLevel"], string> = { LOW: "assessment.rulaEffectLow", MEDIUM: "assessment.rulaEffectMedium", HIGH: "assessment.rulaEffectHigh" };

function rulaActionPriorityFor(score: number): RulaActionPriority { return score >= 5 ? "HIGH" : score >= 3 ? "MEDIUM" : "LOW"; }

function buildLocalRulaFallbackSuggestions(bodySide: RulaActionBodySide): RulaCorrectionAction[] {
  return [
    { id: `rula-local-fallback-neutral-${bodySide.toLowerCase()}`, titleFa: "بازبینی وضعیت خنثی بدن", titleEn: "Review neutral body posture", descriptionFa: "وضعیت بدن، زاویه‌های اصلی و تناسب محل کار را پیش از اجرای کار توسط متخصص HSE بازبینی کنید.", descriptionEn: "Have an HSE professional review the body posture, key angles, and workstation fit before work.", priority: "LOW", scoreReduction: 0, affectedParts: [], bodySide, source: "FALLBACK" },
    { id: `rula-local-fallback-variation-${bodySide.toLowerCase()}`, titleFa: "تنوع وظیفه و وقفه کوتاه", titleEn: "Add task variation and short breaks", descriptionFa: "برای کاهش بار استاتیک، تناوب وظیفه و وقفه‌های کوتاه متناسب با کار را برنامه‌ریزی کنید.", descriptionEn: "Plan task variation and short breaks appropriate to the work to reduce static loading.", priority: "LOW", scoreReduction: 0, affectedParts: ["neck", "trunk"], bodySide, source: "FALLBACK" },
    { id: `rula-local-fallback-verify-${bodySide.toLowerCase()}`, titleFa: "تأیید اقدام کنترلی در محل کار", titleEn: "Verify the control at the point of work", descriptionFa: "کنترل انتخاب‌شده را در محل کار اجرا و اثربخشی آن را با مشاهده و بازبینی مجدد تأیید کنید.", descriptionEn: "Apply the selected control at the point of work and verify its effectiveness with observation and reassessment.", priority: "LOW", scoreReduction: 0, affectedParts: [], bodySide, source: "FALLBACK" },
  ];
}

function buildLocalRulaSuggestions(analysis: RulaPostureAnalysis, inputs: RulaInput, bodySide: RulaActionBodySide = "RIGHT"): RulaCorrectionAction[] {
  const suggestions: RulaCorrectionAction[] = [];
  if (analysis.trunk.score >= 2 || analysis.neck.score >= 2) suggestions.push({ id: "adjust-work-surface", titleFa: "تنظیم ارتفاع سطح کار", titleEn: "Adjust work-surface height", descriptionFa: "ارتفاع سطح کار و محل قرارگیری بار را برای نزدیک‌شدن تنه و گردن به وضعیت خنثی تنظیم کنید.", descriptionEn: "Adjust the work-surface height and load position to bring the trunk and neck closer to neutral.", priority: rulaActionPriorityFor(Math.max(analysis.trunk.score, analysis.neck.score)), scoreReduction: 2, affectedParts: ["trunk", "neck"] });
  if (analysis.neck.score >= 2) suggestions.push({ id: "correct-neck-position", titleFa: "اصلاح وضعیت گردن", titleEn: "Correct neck posture", descriptionFa: "خط دید و جایگاه قطعه را طوری اصلاح کنید که خم‌شدن و چرخش گردن کاهش یابد.", descriptionEn: "Reposition the line of sight and part so neck flexion and rotation are reduced.", priority: rulaActionPriorityFor(analysis.neck.score), scoreReduction: 1, affectedParts: ["neck"] });
  if (inputs.muscleUse || inputs.force > 0) suggestions.push({ id: "reduce-posture-hold", titleFa: "کاهش مدت نگه‌داشتن پوسچر", titleEn: "Reduce posture-hold duration", descriptionFa: "وقفه کوتاه، تناوب کار و جابه‌جایی وظیفه را برای کاهش بار استاتیک اجرا کنید.", descriptionEn: "Add short breaks, task rotation, or alternation to reduce static loading.", priority: inputs.force >= 2 ? "HIGH" : "MEDIUM", scoreReduction: 1, affectedParts: ["neck", "trunk", "upperArm"] });
  if (analysis.upperArm.score >= 2 || analysis.lowerArm.score >= 2 || analysis.wrist.score >= 2) suggestions.push({ id: "support-upper-limb", titleFa: "حمایت از اندام فوقانی", titleEn: "Support the upper limb", descriptionFa: "ابزار، دسته یا تکیه‌گاه مناسب برای کاهش زاویه بازو، ساعد و مچ فراهم کنید.", descriptionEn: "Provide a suitable tool, handle, or support to reduce upper-arm, forearm, and wrist angles.", priority: rulaActionPriorityFor(Math.max(analysis.upperArm.score, analysis.lowerArm.score, analysis.wrist.score)), scoreReduction: 1, affectedParts: ["upperArm", "lowerArm", "wrist"] });
  return suggestions.length ? suggestions.map((suggestion) => ({ ...suggestion, bodySide, source: "FALLBACK" as const })).slice(0, RULA_CORRECTIVE_SUGGESTION_MAX) : buildLocalRulaFallbackSuggestions(bodySide).slice(0, RULA_CORRECTIVE_SUGGESTION_MAX);
}

function buildLocalRulaSuggestionsForAssessment(analysis: RulaPostureAnalysis, inputs: RulaInput, bodySide: RulaActionBodySide) {
  if (bodySide !== "BOTH" || !analysis.sideAnalyses?.LEFT || !analysis.sideAnalyses.RIGHT) return buildLocalRulaSuggestions(analysis, inputs, bodySide);
  return (["RIGHT", "LEFT"] as const).flatMap((side) => buildLocalRulaSuggestions(analysis.sideAnalyses![side]!, rulaInputsFromAnalysis(analysis.sideAnalyses![side]!, inputs.force, inputs.muscleUse), side).map((suggestion) => ({ ...suggestion, id: `${suggestion.id}-${side.toLowerCase()}` }))).slice(0, RULA_CORRECTIVE_SUGGESTION_MAX);
}

function predictedRulaScoreLocal(score: number, actions: RulaCorrectionAction[]) { return Math.max(1, Math.min(7, score - Math.min(6, actions.reduce((sum, action) => sum + action.scoreReduction, 0)))); }
function predictedRulaScoreForSide(score: number, actions: RulaCorrectionAction[], side?: RulaBodySide) { const relevant = side ? actions.filter((action) => !action.bodySide || action.bodySide === "BOTH" || action.bodySide === side) : actions; return predictedRulaScoreLocal(score, relevant); }

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

function RulaReportDataTable({ analysis, factors, selectedActions, locale, onEdit }: { analysis: RulaPostureAnalysis; factors: RulaReportFactor[]; selectedActions: RulaCorrectionAction[]; locale: "fa" | "en"; onEdit?: (part: RulaPosturePart) => void }) {
  const { t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const factorByKey: Map<string, RulaReportFactor> = new Map(factors.map((factor) => [factor.key, factor]));
  const posturePartKeys = new Set(rulaPostureRows.map((item) => item.key));
  const generalActions = selectedActions.filter((action) => !action.affectedParts.some((part) => posturePartKeys.has(part)));
  const totalScore = Math.max(1, rulaPostureRows.reduce((sum, item) => sum + (isRulaPostureResultReviewed(analysis[item.key]) ? analysis[item.key].score : 0), 0));
  return <SectionCard className="report-details-card rula-report-data-section" title={t("assessment.rulaReportDataTable")} description={t("assessment.rulaReportDataTableDescription")} icon="chart"><details open><summary>{t("report.expandDetails")}</summary><TableContainer className="report-data-table-wrap rula-report-table-wrap"><table className="assessment-report-table rula-report-data-table"><thead><tr><th>{t("assessment.row")}</th><th>{t("assessment.rulaReportGroup")}</th><th>{t("assessment.bodyPart")}</th><th>{t("assessment.detectedAngle")}</th><th>{t("assessment.detectedStatus")}</th><th>{t("assessment.suggestedScore")}</th><th>{t("assessment.rulaReportScoreShare")}</th><th>{t("assessment.rulaReportSelectedActions")}</th><th>{t("assessment.operations")}</th></tr></thead><tbody>{rulaPostureRows.map((item, index) => {
    const row = analysis[item.key];
    const factor = factorByKey.get(item.key);
    const reviewed = isRulaPostureResultReviewed(row);
    const scoreShare = reviewed ? factor?.impactPercent ?? Math.round((row.score / totalScore) * 100) : null;
    const status = item.key === "wristTwist" ? row.detected ? t("assessment.present") : t("assessment.notPresent") : row.detected ? t("assessment.detected") : row.source === "DEFAULT" ? t("assessment.pendingDetection") : t("assessment.notDetected");
    const relatedActions = selectedActions.filter((action) => action.affectedParts.includes(item.key));
    return <tr key={item.key}><td data-label={t("assessment.row")} className="report-table-number">{(index + 1).toLocaleString(numberLocale)}</td><td data-label={t("assessment.rulaReportGroup")} className="report-table-number"><span className={`rula-group-badge group-${item.group.toLowerCase()}`}>{item.group}</span></td><td data-label={t("assessment.bodyPart")} className="report-table-text"><strong>{t(item.labelKey)}</strong></td><td data-label={t("assessment.detectedAngle")} className="report-table-number report-angle-value">{formatPostureAngle(row.angle, locale)}</td><td data-label={t("assessment.detectedStatus")}><span className={`rula-detection-badge ${row.detected ? "detected" : "pending"}`}>{status}</span></td><td data-label={t("assessment.suggestedScore")} className="report-table-number"><strong className={`rula-suggested-score ${reviewed ? "" : "rula-unreviewed-value"}`}>{reviewed ? row.score.toLocaleString(numberLocale) : "—"}</strong></td><td data-label={t("assessment.rulaReportScoreShare")} className="report-table-number"><span className={`rula-table-impact ${scoreShare === null ? "impact-neutral" : `impact-${(factor?.impactLevel ?? (row.score >= 4 ? "HIGH" : row.score >= 3 ? "MEDIUM" : "LOW")).toLowerCase()}`}`}>{scoreShare === null ? "—" : `${scoreShare.toLocaleString(numberLocale)}٪`}</span></td><td data-label={t("assessment.rulaReportSelectedActions")} className="report-table-text"><div className="report-table-stack">{relatedActions.length ? relatedActions.map((action) => <span key={action.id}><strong>{rulaActionText(action, locale, "title")}</strong><small><StatusBadge value={action.priority}/></small></span>) : <span>{t("assessment.rulaReportNoSelectedActions")}</span>}</div></td><td data-label={t("assessment.operations")} className="report-table-number"><div className="report-table-actions" aria-label={t("assessment.operations")}><ReportInlineDetails label={`${t("assessment.viewDetails")}: ${t(item.labelKey)}`} title={t("assessment.viewDetails")}><strong>{t(item.labelKey)}</strong><span>{t("assessment.detectedAngle")}: {formatPostureAngle(row.angle, locale)}</span><span>{t("assessment.suggestedScore")}: {reviewed ? row.score.toLocaleString(numberLocale) : t("assessment.manualReviewRequiredShort")}</span></ReportInlineDetails>{onEdit && <button type="button" className="icon-button" title={t("assessment.editPostureResult")} aria-label={`${t("assessment.editPostureResult")}: ${t(item.labelKey)}`} onClick={() => onEdit(item.key)}><Icon name="edit" size={15}/></button>}</div></td></tr>;
  })}{generalActions.length > 0 && <tr className="rula-general-action-row"><td data-label={t("assessment.row")} className="report-table-number">—</td><td data-label={t("assessment.rulaReportGroup")} className="report-table-number">—</td><td data-label={t("assessment.bodyPart")} className="report-table-text"><strong>{t("assessment.rulaGeneralCorrectiveActions")}</strong></td><td data-label={t("assessment.detectedAngle")} className="report-table-number">—</td><td data-label={t("assessment.detectedStatus")} className="report-table-number">—</td><td data-label={t("assessment.suggestedScore")} className="report-table-number">—</td><td data-label={t("assessment.rulaReportScoreShare")} className="report-table-number">—</td><td data-label={t("assessment.rulaReportSelectedActions")} className="report-table-text"><div className="report-table-stack">{generalActions.map((action) => <span key={action.id}><strong>{rulaActionText(action, locale, "title")}</strong><small><StatusBadge value={action.priority}/></small></span>)}</div></td><td data-label={t("assessment.operations")} className="report-table-number">—</td></tr>}</tbody></table></TableContainer></details></SectionCard>;
}

function RulaCorrectionSuggestionsTable({ suggestions, selectedActions, bodySide, locale, busyActionId, onToggleAction }: { suggestions: RulaCorrectionAction[]; selectedActions: RulaCorrectionAction[]; bodySide: RulaActionBodySide; locale: "fa" | "en"; busyActionId?: string | null; onToggleAction?: (action: RulaCorrectionAction) => void }) {
  const { t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const visibleSuggestions = suggestions.slice(0, RULA_CORRECTIVE_SUGGESTION_MAX);
  if (!visibleSuggestions.length) return <EmptyState title={t("assessment.rulaNoCorrections")} icon="actions"/>;
  return <TableContainer className="report-data-table-wrap rula-correction-table-wrap"><table className="assessment-report-table rula-correction-table"><thead><tr><th>{t("assessment.rulaRelatedFactor")}</th><th>{t("assessment.rulaSuggestedAction")}</th><th>{t("assessment.rulaActionBodySide")}</th><th>{t("assessment.rulaActionPriority")}</th><th>{t("assessment.rulaEstimatedReductionLabel")}</th><th>{t("assessment.operations")}</th></tr></thead><tbody>{visibleSuggestions.map((action) => {
    const suggestedSide = action.bodySide ?? (bodySide === "BOTH" ? "BOTH" : bodySide);
    const selectedAction = { ...action, bodySide: suggestedSide };
    const selected = selectedActions.some((item) => rulaActionIsSame(item, selectedAction));
    const busy = Boolean(busyActionId);
    return <tr className={selected ? "selected" : ""} key={`${action.id}-${suggestedSide}`}><td data-label={t("assessment.rulaRelatedFactor")} className="rula-correction-table-factor"><strong>{rulaActionPartLabel(action, locale, t)}</strong></td><td data-label={t("assessment.rulaSuggestedAction")}><div className="rula-suggestion-content"><strong>{rulaActionText(action, locale, "title")}</strong><span>{rulaActionText(action, locale, "description")}</span></div></td><td data-label={t("assessment.rulaActionBodySide")}><span className="rula-correction-side">{rulaActionBodySideLabel(suggestedSide, t)}</span></td><td data-label={t("assessment.rulaActionPriority")}><span className={`rula-correction-priority priority-${action.priority.toLowerCase()}`}>{t(`status.${action.priority.toLowerCase()}`)}</span></td><td data-label={t("assessment.rulaEstimatedReductionLabel")} className="report-table-number">{action.scoreReduction.toLocaleString(numberLocale)}</td><td data-label={t("assessment.operations")}><button type="button" className={`rula-correction-toggle ${selected ? "selected" : ""}`} aria-pressed={selected} aria-busy={busy && busyActionId === action.id} disabled={!onToggleAction || busy} onClick={() => onToggleAction?.(selectedAction)}>{busy && busyActionId === action.id ? <span className="rula-action-spinner" aria-hidden="true"/> : selected ? <Icon name="check" size={15}/> : <Icon name="plus" size={15}/>}<span>{selected ? t("assessment.rulaSelected") : t("assessment.rulaSelectAction")}</span></button></td></tr>;
  })}</tbody></table></TableContainer>;
}

function RulaManualActionForm({ actionBodySide, actionSideOptions, busyActionId, manualAffectedParts, manualDescription, manualPriority, manualReduction, manualTitle, manualValidationError, onActionBodySideChange, onAdd, onAffectedPartChange, onDescriptionChange, onPriorityChange, onReductionChange, onTitleChange }: { actionBodySide: RulaActionBodySide; actionSideOptions: RulaActionBodySide[]; busyActionId?: string | null; manualAffectedParts: RulaPosturePart[]; manualDescription: string; manualPriority: RulaActionPriority; manualReduction: number; manualTitle: string; manualValidationError: string; onActionBodySideChange?: (side: RulaActionBodySide) => void; onAdd: () => void; onAffectedPartChange: (part: RulaPosturePart, checked: boolean) => void; onDescriptionChange: (value: string) => void; onPriorityChange: (value: RulaActionPriority) => void; onReductionChange: (value: number) => void; onTitleChange: (value: string) => void }) {
  const { t } = useI18n();
  return <div className="rula-manual-action-form rula-report-manual-action-form" role="group" aria-busy={busyActionId === "manual"}>
    <div className="rula-manual-action-heading"><strong>{t("assessment.rulaAddManualAction")}</strong><small>{t("assessment.rulaManualActionHint")}</small></div>
    <div className="rula-manual-action-scope-note" aria-live="polite"><strong>{t("assessment.rulaManualActionBodySide")}</strong><span>{rulaActionBodySideLabel(actionBodySide, t)}</span><small>{t("assessment.rulaManualActionBodySideHint")}</small></div>
    <div className="rula-manual-action-fields">
      <div className="rula-manual-action-text-fields">
        <label className="rula-manual-action-title-field">{t("assessment.rulaManualActionTitle")}<input value={manualTitle} maxLength={180} aria-invalid={manualValidationError ? true : undefined} aria-describedby={manualValidationError ? "rula-manual-action-title-error" : undefined} onChange={(event) => onTitleChange(event.target.value)} placeholder={t("assessment.rulaManualActionTitlePlaceholder")}/>{manualValidationError && <small id="rula-manual-action-title-error" className="field-error" role="alert">{manualValidationError}</small>}</label>
        <label className="rula-manual-action-description-field">{t("assessment.rulaManualActionDescription")}<textarea rows={2} maxLength={500} value={manualDescription} onChange={(event) => onDescriptionChange(event.target.value)} placeholder={t("assessment.rulaManualActionDescriptionPlaceholder")}/></label>
      </div>
      <div className="rula-manual-action-control-fields">
        <fieldset className="rula-manual-factors"><legend>{t("assessment.rulaRelatedFactor")}</legend><div>{rulaReportFactorKeys.map((part) => <label key={part}><input type="checkbox" checked={manualAffectedParts.includes(part)} onChange={(event) => onAffectedPartChange(part, event.target.checked)}/><span>{t(`assessment.${part}`)}</span></label>)}</div></fieldset>
        <label className="rula-manual-action-side-field">{t("assessment.rulaManualActionBodySide")}<StyledSelect value={actionBodySide} onChange={(event) => onActionBodySideChange?.(event.target.value as RulaActionBodySide)} disabled={!onActionBodySideChange || Boolean(busyActionId)}>{actionSideOptions.map((side) => <option key={side} value={side}>{rulaActionBodySideLabel(side, t)}</option>)}</StyledSelect></label>
        <label className="rula-manual-action-priority-field">{t("assessment.rulaActionPriority")}<StyledSelect value={manualPriority} onChange={(event) => onPriorityChange(event.target.value as RulaActionPriority)}><option value="CRITICAL">{t("status.critical")}</option><option value="HIGH">{t("status.high")}</option><option value="MEDIUM">{t("status.medium")}</option><option value="LOW">{t("status.low")}</option></StyledSelect></label>
        <label className="rula-manual-action-reduction-field">{t("assessment.rulaEstimatedReductionLabel")}<input type="number" min="0" max="6" step="1" value={manualReduction} onChange={(event) => { const next = Number(event.target.value); onReductionChange(Number.isFinite(next) ? Math.max(0, Math.min(6, next)) : 0); }}/></label>
      </div>
    </div>
    <div className="rula-manual-action-form-actions"><button type="button" className="primary" onClick={onAdd} disabled={Boolean(busyActionId)}>{busyActionId === "manual" ? <span className="button-spinner" aria-hidden="true"/> : <Icon name="plus"/>} {t("assessment.rulaAddAction")}</button></div>
  </div>;
}

function RulaReportView({ result, analysis, activityInfo, factors, sideResults, sideFactors, suggestions: rawSuggestions, selectedActions, bodySide, actionBodySide, onActionBodySideChange, locale, busyActionId, onToggleAction, onAddAction, onRemoveAction, onEditPosture, suggestionsLoading = false, suggestionsStatus, suggestionsError, onRetrySuggestions, showResultHero = true }: { result: { score: number; actionLevel: number; explanation?: string; status?: string; postureReviewComplete?: boolean }; analysis: RulaPostureAnalysis; activityInfo?: RulaActivityInfo | null; factors: RulaReportFactor[]; sideResults?: Partial<Record<RulaBodySide, RulaSideAssessmentResult>>; sideFactors?: Partial<Record<RulaBodySide, RulaReportFactor[]>>; suggestions: RulaCorrectionAction[]; selectedActions: RulaCorrectionAction[]; bodySide: RulaActionBodySide; actionBodySide: RulaActionBodySide; onActionBodySideChange?: (side: RulaActionBodySide) => void; locale: "fa" | "en"; busyActionId?: string | null; onToggleAction?: (action: RulaCorrectionAction) => void; onAddAction?: (action: RulaCorrectionAction) => void; onRemoveAction?: (action: RulaCorrectionAction) => void; onEditPosture?: (part: RulaPosturePart) => void; suggestionsLoading?: boolean; suggestionsStatus?: ReportActionAiStatus; suggestionsError?: string; onRetrySuggestions?: () => void; showResultHero?: boolean }) {
  const { t } = useI18n();
  const { id: reportId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeReportSide, setActiveReportSide] = useState<RulaBodySide>(bodySide === "LEFT" ? "LEFT" : "RIGHT");
  useEffect(() => { if (bodySide === "LEFT" || bodySide === "RIGHT") setActiveReportSide(bodySide); }, [bodySide]);
  const reportPostureEditHandler = onEditPosture ?? (reportId && canEdit() ? (part: RulaPosturePart) => { const sideQuery = bodySide === "BOTH" ? `&side=${activeReportSide}` : ""; navigate(`/rula?edit=${encodeURIComponent(reportId)}&step=2&part=${encodeURIComponent(part)}${sideQuery}`); } : undefined);
  const [manualTitle, setManualTitle] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [manualPriority, setManualPriority] = useState<RulaActionPriority>("MEDIUM");
  const [manualReduction, setManualReduction] = useState(1);
  const [manualAffectedParts, setManualAffectedParts] = useState<RulaPosturePart[]>([]);
  const [manualValidationError, setManualValidationError] = useState("");
  const showBothSides = bodySide === "BOTH" && Boolean(analysis.sideAnalyses?.LEFT && analysis.sideAnalyses.RIGHT);
  const visibleAnalysis = showBothSides ? analysis.sideAnalyses?.[activeReportSide] ?? analysis : analysis;
  const visibleResult = showBothSides ? sideResults?.[activeReportSide] ?? result : result;
  const visibleFactors = showBothSides ? sideFactors?.[activeReportSide] ?? factors : factors;
  const visibleSelectedActions = showBothSides
    ? selectedActions.filter((action) => !action.bodySide || action.bodySide === "BOTH" || action.bodySide === activeReportSide)
    : selectedActions;
  const suggestions = (showBothSides
    ? rawSuggestions.filter((action) => !action.bodySide || action.bodySide === "BOTH" || action.bodySide === activeReportSide)
    : rawSuggestions).slice(0, RULA_CORRECTIVE_SUGGESTION_MAX);
  const tableSelectedActions = visibleSelectedActions.map((action) => rulaActionForDataTable(action, suggestions));
  const reviewComplete = result.postureReviewComplete !== false;
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const rankedFactors = useMemo(() => rankRulaReportFactors(visibleFactors), [visibleFactors]);
  const predictedScore = reviewComplete ? predictedRulaScoreForSide(visibleResult.score, selectedActions, showBothSides ? activeReportSide : undefined) : 0;
  const mainFactor = rankedFactors[0];
  const actionLevel = reviewComplete ? rulaActionLevelFor(visibleResult.actionLevel) : { labelKey: "assessment.manualReviewRequiredShort", className: "review-required" } as const;
  const predictedActionLevel = rulaActionLevelForScore(predictedScore);
  const manualActions = visibleSelectedActions.filter((action) => !suggestions.some((suggestion) => rulaActionIsSame(action, suggestion)));
  const actionSideOptions: RulaActionBodySide[] = bodySide === "BOTH" ? ["RIGHT", "LEFT", "BOTH"] : [bodySide];
  function addManual() {
    const title = manualTitle.trim();
    if (!title) { setManualValidationError(t("assessment.rulaManualActionTitleRequired")); return; }
    if (!onAddAction || busyActionId) return;
    setManualValidationError("");
    const scoreReduction = Number.isFinite(manualReduction) ? Math.max(0, Math.min(6, Math.trunc(manualReduction))) : 0;
    onAddAction({ id: `manual-${Date.now()}`, titleFa: title, titleEn: title, descriptionFa: manualDescription.trim(), descriptionEn: manualDescription.trim(), priority: manualPriority, scoreReduction, affectedParts: [...manualAffectedParts], bodySide: actionBodySide });
    setManualTitle(""); setManualDescription(""); setManualPriority("MEDIUM"); setManualReduction(1); setManualAffectedParts([]);
  }
  const manualActionForm = onAddAction ? <RulaManualActionForm actionBodySide={actionBodySide} actionSideOptions={actionSideOptions} busyActionId={busyActionId} manualAffectedParts={manualAffectedParts} manualDescription={manualDescription} manualPriority={manualPriority} manualReduction={manualReduction} manualTitle={manualTitle} manualValidationError={manualValidationError} onActionBodySideChange={onActionBodySideChange} onAdd={addManual} onAffectedPartChange={(part, checked) => setManualAffectedParts((current) => checked ? [...current, part] : current.filter((item) => item !== part))} onDescriptionChange={setManualDescription} onPriorityChange={setManualPriority} onReductionChange={setManualReduction} onTitleChange={(value) => { setManualTitle(value); if (manualValidationError) setManualValidationError(""); }}/> : null;
  return <div className="rula-report-view">
    {showResultHero && <header className="rula-result-hero"><div className="rula-result-hero-copy"><span className="rula-result-hero-icon" aria-hidden="true"><Icon name="rula" size={21}/></span><div><h2>{t("assessment.rulaReportTitle")}</h2><p>{t("assessment.rulaReportDescription")}</p></div></div><span className={`rula-result-complete ${reviewComplete ? "" : "pending"}`}><Icon name={reviewComplete ? "check" : "activity"} size={14}/>{reviewComplete ? t("assessment.rulaReportCompleted") : t("assessment.rulaAutomaticAnalysisPending")}</span></header>}
    {showBothSides && <><div className="rula-side-tabs rula-report-side-tabs" role="tablist" aria-label={t("assessment.bodySide")}>{(["RIGHT", "LEFT"] as const).map((side) => <button type="button" role="tab" aria-selected={activeReportSide === side} className={activeReportSide === side ? "active" : ""} onClick={() => setActiveReportSide(side)} key={side}>{side === "RIGHT" ? t("assessment.right") : t("assessment.left")}</button>)}</div>{sideResults?.RIGHT && sideResults.LEFT && <div className="rula-side-score-strip" aria-label={t("assessment.bothSides")}><span><small>{t("assessment.right")}</small><strong>{reviewComplete ? sideResults.RIGHT.score.toLocaleString(numberLocale) : "—"}</strong></span><span><small>{t("assessment.left")}</small><strong>{reviewComplete ? sideResults.LEFT.score.toLocaleString(numberLocale) : "—"}</strong></span><span className="final"><small>{t("assessment.bothSides")}</small><strong>{reviewComplete ? result.score.toLocaleString(numberLocale) : "—"}</strong></span></div>}</>}    <div className={`rula-report-score-card ${actionLevel.className}`}><div className="rula-report-score"><div className="rula-report-score-label"><small>{t("assessment.rulaScoreLabel")}</small><span className="rula-report-score-icon" aria-hidden="true"><Icon name="rula" size={21}/></span></div><strong>{reviewComplete ? visibleResult.score.toLocaleString(numberLocale) : "—"}</strong><span>{reviewComplete ? t("assessment.rulaCurrentScoreDescription") : t("assessment.rulaAutomaticAnalysisPending")}</span></div><div className="rula-report-risk"><div className="rula-report-risk-head"><small>{t("assessment.rulaRiskLevel")}</small><span className={`rula-report-risk-badge ${actionLevel.className}`} role="status">{t(actionLevel.labelKey)}</span></div><div className="rula-report-status-line"><span>{t("assessment.rulaAssessmentStatus")}</span><StatusBadge value={result.status ?? "DRAFT"}/></div><p>{reviewComplete && mainFactor ? t("assessment.rulaMainFactorSummary", { factor: t(`assessment.${mainFactor.key}`) }) : t("assessment.rulaAutomaticAnalysisHint")}</p></div></div>
    <section className="rula-report-section rula-main-factors-section"><div className="rula-report-section-heading"><div><h3>{t("assessment.rulaMainFactors")}</h3><p>{t("assessment.rulaMainFactorsDescription")}</p></div><Icon name="chart" size={21}/></div><div className="rula-factor-grid">{rankedFactors.length ? rankedFactors.map((factor) => { const detected = factor.detected ?? factor.angle !== null; const contribution = Math.max(0, Math.min(100, factor.impactPercent)); return <article className={`rula-factor-card impact-${factor.impactLevel.toLowerCase()}`} key={factor.key}><div className="rula-factor-card-head"><div className="rula-factor-title"><span className="rula-factor-figure" aria-hidden="true"><Icon name="rula" size={17}/></span><div><strong>{t(`assessment.${factor.key}`)}</strong>{factor.source !== "AI" && <small>{t(rulaSourceLabelKey(factor.source))}</small>}</div></div><span className="rula-factor-impact-label">{t(rulaFactorImpactKeys[factor.impactLevel])}</span></div><div className="rula-factor-value"><div><small>{t("assessment.detectedAngle")}</small><b>{formatPostureAngle(factor.angle, locale)}</b></div><div><small>{t("assessment.rulaFactorScore")}</small><strong>{factor.score.toLocaleString(numberLocale)}</strong></div></div><div className="rula-factor-status"><span className={`rula-detection-badge ${detected ? "detected" : "pending"}`}>{detected ? t("assessment.detected") : t("assessment.notDetected")}</span><small>{t("assessment.rulaFactorContribution", { percent: contribution })}</small></div><div className="rula-factor-meter" role="progressbar" aria-label={t("assessment.rulaFactorContribution", { percent: contribution })} aria-valuemin={0} aria-valuemax={100} aria-valuenow={contribution}><span style={{ width: `${contribution}%` }}/></div></article>; }) : <EmptyState title={t("assessment.rulaNoFactors")} icon="chart"/>}</div></section>
    <section className="rula-report-section rula-corrections-section"><div className="rula-report-section-heading"><div><h3>{t("assessment.rulaCorrections")}</h3><p>{t("assessment.rulaCorrectionsDescription")}</p></div><Icon name="actions" size={21}/></div><div className="rula-corrections-layout"><div className="rula-suggested-actions-panel"><div className="rula-suggested-actions-heading"><div><strong>{t("assessment.rulaCorrections")}</strong><small>{t("assessment.rulaCorrectionsDescription")}</small></div><Icon name="actions" size={18}/></div><div className="rula-action-scope"><strong>{t("assessment.rulaActionScope")}</strong><span>{t("assessment.bodySide")}: {rulaActionBodySideLabel(bodySide, t)}</span><small>{t("assessment.rulaActionBodySideHint")}</small></div><div className="rula-ai-suggestions-status" role="status" aria-live="polite">{suggestionsLoading && <span className="ai-status loading"><span className="spinner"/>{t("report.aiActionsWorking")}</span>}{!suggestionsLoading && suggestionsStatus && <span className={"ai-status " + suggestionsStatus}>{t("assessment.aiStatus." + suggestionsStatus)}</span>}{suggestionsError && <div className="report-ai-action-error" role="alert"><span>{suggestionsError}</span>{onRetrySuggestions && <button type="button" className="text-button" onClick={onRetrySuggestions}>{t("common.retry")}</button>}</div>}</div><RulaCorrectionSuggestionsTable suggestions={suggestions} selectedActions={visibleSelectedActions} bodySide={showBothSides ? activeReportSide : bodySide} locale={locale} busyActionId={busyActionId} onToggleAction={onToggleAction}/>{manualActions.length > 0 && <div className="rula-manual-actions">{manualActions.map((action) => <article className="rula-manual-action" key={action.id}><div><div className="rula-manual-action-title-row"><strong>{rulaActionText(action, locale, "title")}</strong><span className="rula-selected-badge">{t("assessment.rulaSelected")}</span></div><small>{rulaActionText(action, locale, "description") || t("assessment.rulaManualAction")}</small><small className="rula-correction-related">{t("assessment.rulaRelatedFactor")}: {rulaActionPartLabel(action, locale, t)}</small><small className="rula-correction-side">{t("assessment.rulaActionScope")}: {rulaActionBodySideLabel(action.bodySide, t)}</small></div><span>{t(`status.${action.priority.toLowerCase()}`)}</span>{onRemoveAction && <button type="button" className="text-button danger-text" disabled={Boolean(busyActionId)} aria-busy={busyActionId === action.id} onClick={() => onRemoveAction(action)}>{busyActionId === action.id ? <span className="rula-action-spinner dark" aria-hidden="true"/> : t("common.delete")}</button>}</article>)}</div>}</div><aside className="rula-report-impact-panel" aria-live="polite"><div className="rula-impact-panel-heading"><div><strong>{t("assessment.rulaPredictedEffect")}</strong><small>{t("assessment.rulaPredictionEstimate")}</small></div><span className="rula-impact-panel-icon" aria-hidden="true"><Icon name="chart" size={18}/></span></div><div className="rula-prediction-score-pair"><div><small>{t("assessment.rulaCurrentScore")}</small><strong>{visibleResult.score.toLocaleString(numberLocale)}</strong></div><span aria-hidden="true">←</span><div><small>{t("assessment.rulaPredictedScore")}</small><strong className="predicted">{predictedScore.toLocaleString(numberLocale)}</strong></div></div><span className={`rula-prediction-badge ${predictedActionLevel.className}`}>{t(predictedActionLevel.labelKey)}</span><p>{t("assessment.rulaPredictedNote")}</p><div className="rula-selected-actions-preview"><strong>{t("assessment.rulaSelectedActionsSummary")}</strong>{visibleSelectedActions.length ? visibleSelectedActions.slice(0, 3).map((action) => <div key={action.id}><span>{rulaActionText(action, locale, "title")}</span><small>{t(`status.${action.priority.toLowerCase()}`)}</small></div>) : <small>{t("assessment.rulaNoSelectedActionsHint")}</small>}{visibleSelectedActions.length > 3 && <small>+ {(visibleSelectedActions.length - 3).toLocaleString(numberLocale)}</small>}</div></aside></div></section>
    <div className="rula-report-secondary-sections">{activityInfo && <RulaReportContext activityInfo={activityInfo} locale={locale}/>}<RulaReportDataTable analysis={visibleAnalysis} factors={visibleFactors} selectedActions={tableSelectedActions} locale={locale} onEdit={reportPostureEditHandler}/>{manualActionForm}</div>
  </div>;
}

function buildLocalRulaReportFactors(analysis: RulaPostureAnalysis): RulaReportFactor[] {
  const total = Math.max(1, rulaReportFactorKeys.reduce((sum, key) => sum + analysis[key].score, 0));
  return rulaReportFactorKeys.map((key) => ({
    key,
    angle: analysis[key].angle,
    detected: analysis[key].detected,
    score: analysis[key].score,
    impactPercent: Math.round((analysis[key].score / total) * 100),
    impactLevel: analysis[key].score >= 4 ? "HIGH" : analysis[key].score >= 3 ? "MEDIUM" : "LOW",
    source: analysis[key].source,
  }));
}
function RulaReportPreview({ result, analysis, force, muscleUse, bodySide, locale, selectedActions, onSelectedActionsChange }: { result: ReturnType<typeof calculateRula>; analysis: RulaPostureAnalysis; force: number; muscleUse: boolean; bodySide: RulaActionBodySide; locale: "fa" | "en"; selectedActions: RulaCorrectionAction[]; onSelectedActionsChange: (actions: RulaCorrectionAction[]) => void }) {
  const [actionBodySide, setActionBodySide] = useState<RulaActionBodySide>(bodySide);
  useEffect(() => setActionBodySide(bodySide), [bodySide]);
  const inputs = useMemo(() => rulaInputsFromAnalysis(analysis, force, muscleUse), [analysis, force, muscleUse]);
  const factors = useMemo<RulaReportFactor[]>(() => buildLocalRulaReportFactors(analysis), [analysis]);
  const sideResults = useMemo(() => {
    if (bodySide !== "BOTH" || !analysis.sideAnalyses?.LEFT || !analysis.sideAnalyses.RIGHT) return undefined;
    return {
      LEFT: calculateRula(rulaInputsFromAnalysis(analysis.sideAnalyses.LEFT, force, muscleUse)),
      RIGHT: calculateRula(rulaInputsFromAnalysis(analysis.sideAnalyses.RIGHT, force, muscleUse)),
    };
  }, [analysis, bodySide, force, muscleUse]);
  const sideFactors = useMemo(() => {
    if (bodySide !== "BOTH" || !analysis.sideAnalyses?.LEFT || !analysis.sideAnalyses.RIGHT) return undefined;
    return {
      LEFT: buildLocalRulaReportFactors(analysis.sideAnalyses.LEFT),
      RIGHT: buildLocalRulaReportFactors(analysis.sideAnalyses.RIGHT),
    };
  }, [analysis, bodySide]);
  const suggestions = useMemo(() => buildLocalRulaSuggestionsForAssessment(analysis, inputs, bodySide), [analysis, inputs, bodySide]);
  return <RulaReportView result={{ ...result, status: "DRAFT" }} analysis={analysis} bodySide={bodySide} actionBodySide={actionBodySide} onActionBodySideChange={setActionBodySide} factors={factors} sideResults={sideResults} sideFactors={sideFactors} suggestions={suggestions} selectedActions={selectedActions} locale={locale} onToggleAction={(action) => onSelectedActionsChange(selectedActions.some((item) => rulaActionIsSame(item, action)) ? selectedActions.filter((item) => !rulaActionIsSame(item, action)) : [...selectedActions, action])} onAddAction={(action) => onSelectedActionsChange([...selectedActions, action])} onRemoveAction={(action) => onSelectedActionsChange(selectedActions.filter((item) => !rulaActionIsSame(item, action)))}/>;
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
  const [aiActionLoading, setAiActionLoading] = useState(false);
  const [aiActionError, setAiActionError] = useState("");
  const [aiActionStatus, setAiActionStatus] = useState<ReportActionAiStatus | null>(null);
  const [aiSuggestedActions, setAiSuggestedActions] = useState<RulaCorrectionAction[] | null>(null);
  const aiActionRequestKeyRef = useRef("");
  const canEditActions = canEdit();
  const report = state.data;
  const suggestions = useMemo(() => {
    const loadedSuggestions = aiSuggestedActions?.length ? aiSuggestedActions : report?.suggestedActions ?? [];
    if (loadedSuggestions.length || !report) return loadedSuggestions.slice(0, RULA_CORRECTIVE_SUGGESTION_MAX);
    return buildLocalRulaSuggestionsForAssessment(report.assessment.postureAnalysis, rulaInputsFromAnalysis(report.assessment.postureAnalysis, 0, false), report.assessment.bodySide).slice(0, RULA_CORRECTIVE_SUGGESTION_MAX);
  }, [aiSuggestedActions, report]);
  async function requestAiActionSuggestions() {
    if (!id || !report || aiActionLoading) return;
    setAiActionLoading(true); setAiActionError("");
    try {
      const result = await api<ReportActionSuggestionsResponse<RulaCorrectionAction>>("/rula/" + id + "/report/action-suggestions", { method: "POST", body: JSON.stringify({ locale }) });
      setAiSuggestedActions(result.data.suggestions.slice(0, RULA_CORRECTIVE_SUGGESTION_MAX));
      setAiActionStatus(result.data.aiStatus);
    } catch (reason) {
      setAiActionStatus("unavailable");
      setAiActionError((reason as Error).message);
      setAiSuggestedActions(report.suggestedActions.slice(0, RULA_CORRECTIVE_SUGGESTION_MAX));
    } finally { setAiActionLoading(false); }
  }

  useEffect(() => {
    if (!report || !id) return;
    const requestKey = id + ":" + locale + ":actions";
    if (aiActionRequestKeyRef.current === requestKey) return;
    aiActionRequestKeyRef.current = requestKey;
    void requestAiActionSuggestions();
  }, [id, locale, report?.assessment.id]);

  useEffect(() => { if (report) { setActionBodySide(report.assessment.bodySide); setSelectedActions(report.actions.filter((action) => action.status !== "CANCELLED" && action.status !== "REJECTED").map((action) => rulaClientActionFromPersisted(action, locale))); } }, [report, locale]);
  if (state.loading) return <section className="page-shell"><div className="state"><div className="spinner"/><p>{t("common.loading")}</p></div></section>;
  if (state.error || !report) return <section className="page-shell"><div className="state error-state"><span className="state-icon"><Icon name="warning" size={27}/></span><h3>{t("common.loadFailed")}</h3><p>{state.error || t("assessment.rulaReportNotFound")}</p><button className="primary" onClick={state.reload}>{t("common.retry")}</button></div></section>;
  async function toggleAction(action: RulaCorrectionAction) {
    if (busyActionId) return;
    const current = report as RulaReportPayload;
    const saved = selectedActions.find((item) => rulaActionIsSame(item, action));
    const actionSide = action.bodySide ?? actionBodySide;
    const scoreSide = actionSide === "LEFT" || actionSide === "RIGHT" ? actionSide : undefined;
    const beforeRisk = scoreSide ? current.sideResults?.[scoreSide]?.score ?? current.assessment.score : current.assessment.score;
    const afterRisk = predictedRulaScoreForSide(beforeRisk, [...selectedActions, action], scoreSide);
    setBusyActionId(action.id); setError("");
    try {
      if (saved?.persistedId) await api(`/actions/${saved.persistedId}`, { method: "PATCH", body: JSON.stringify({ status: "CANCELLED" }) });
      else await api("/actions", { method: "POST", body: JSON.stringify({ projectId: current.assessment.project.id, rulaId: current.assessment.id, bodySide: action.bodySide ?? actionBodySide, title: rulaActionText(action, locale, "title"), description: rulaActionText(action, locale, "description"), priority: action.priority, status: "OPEN", beforeRisk, afterRisk, rulaImpact: { suggestionId: action.id, scoreReduction: action.scoreReduction, affectedParts: action.affectedParts } }) });
      setSelectedActions((items) => saved?.persistedId ? items.filter((item) => !rulaActionIsSame(item, action)) : items.some((item) => rulaActionIsSame(item, action)) ? items : [...items, action]);
      state.reload();
    } catch (reason) { setError((reason as Error).message); }
    finally { setBusyActionId(null); }
  }
  async function addManualAction(action: RulaCorrectionAction) {
    if (busyActionId) return;
    const current = report as RulaReportPayload;
    const actionSide = action.bodySide ?? actionBodySide;
    const scoreSide = actionSide === "LEFT" || actionSide === "RIGHT" ? actionSide : undefined;
    const beforeRisk = scoreSide ? current.sideResults?.[scoreSide]?.score ?? current.assessment.score : current.assessment.score;
    const afterRisk = predictedRulaScoreForSide(beforeRisk, [...selectedActions, action], scoreSide);
    setBusyActionId("manual"); setError("");
    try { await api("/actions", { method: "POST", body: JSON.stringify({ projectId: current.assessment.project.id, rulaId: current.assessment.id, bodySide: action.bodySide ?? actionBodySide, title: rulaActionText(action, locale, "title"), description: rulaActionText(action, locale, "description") || t("assessment.rulaManualAction"), priority: action.priority, status: "OPEN", beforeRisk, afterRisk, rulaImpact: { suggestionId: action.id, scoreReduction: action.scoreReduction, affectedParts: action.affectedParts } }) }); setSelectedActions((items) => items.some((item) => rulaActionIsSame(item, action)) ? items : [...items, action]); state.reload(); } catch (reason) { setError((reason as Error).message); }
    finally { setBusyActionId(null); }
  }
  async function removeAction(action: RulaCorrectionAction) { if (busyActionId) return; if (!action.persistedId) { setSelectedActions((items) => items.filter((item) => !rulaActionIsSame(item, action))); return; } setBusyActionId(action.id); setError(""); try { await api(`/actions/${action.persistedId}`, { method: "PATCH", body: JSON.stringify({ status: "CANCELLED" }) }); setSelectedActions((items) => items.filter((item) => !rulaActionIsSame(item, action))); state.reload(); } catch (reason) { setError((reason as Error).message); } finally { setBusyActionId(null); } }
  function goToPreviousStep() {
    if (id && canEditActions) {
      navigate(`/rula?edit=${encodeURIComponent(id)}&step=2`);
      return;
    }
    navigate("/rula");
  }
  const result = { score: report.assessment.score, actionLevel: report.assessment.actionLevel, explanation: report.assessment.explanation, status: report.assessment.status, postureReviewComplete: report.assessment.postureReviewComplete };
  return <section className="page-shell rula-report-page"><PageHeader eyebrow={t("assessment.rulaReportEyebrow")} title={t("assessment.rulaReportTitle")} description={`${report.assessment.title} · ${report.assessment.project.name}`} actions={<div className="page-actions-inline"><button type="button" className="ghost" onClick={goToPreviousStep}><Icon name="arrow" className="back-arrow"/> {canEditActions ? t("assessment.previousStep") : t("assessment.rulaReportBack")}</button><button type="button" className="ghost" onClick={() => void saveBlob(`/reports/rula/${report.assessment.id}.xlsx?locale=${locale}`, `RULA-${report.assessment.id}.xlsx`).catch((reason) => setError((reason as Error).message))}><Icon name="download"/> {t("assessment.downloadExcel")}</button><button type="button" className="ghost" onClick={() => void saveBlob(`/reports/rula/${report.assessment.id}.docx?locale=${locale}`, `RULA-${report.assessment.id}.docx`).catch((reason) => setError((reason as Error).message))}><Icon name="download"/> {t("assessment.downloadWord")}</button><button type="button" className="ghost" onClick={() => void saveBlob(`/reports/rula/${report.assessment.id}.pdf?locale=${locale}`, `RULA-${report.assessment.id}.pdf`).catch((reason) => setError((reason as Error).message))}><Icon name="download"/> {t("assessment.downloadPdf")}</button></div>}/><RulaReportStepper onStepClick={canEditActions && id ? (step) => navigate(`/rula?edit=${encodeURIComponent(id)}&step=${step}`) : undefined}/><div className="rula-report-page-status"><span className={`rula-result-complete ${result.postureReviewComplete === false ? "pending" : ""}`}><Icon name={result.postureReviewComplete === false ? "activity" : "check"} size={14}/>{result.postureReviewComplete === false ? t("assessment.rulaAutomaticAnalysisPending") : t("assessment.rulaReportCompleted")}</span></div>{error && <div className="alert error" role="alert"><Icon name="warning"/>{error}</div>}<SectionCard className="rula-report-surface"><RulaReportView result={result} analysis={report.assessment.postureAnalysis} activityInfo={report.assessment.activityInfo} bodySide={report.assessment.bodySide} actionBodySide={actionBodySide} onActionBodySideChange={setActionBodySide} factors={report.factors} sideResults={report.sideResults} sideFactors={report.sideFactors} suggestions={suggestions} selectedActions={selectedActions} locale={locale} busyActionId={busyActionId} onToggleAction={canEditActions ? (action) => void toggleAction(action) : undefined} onAddAction={canEditActions ? (action) => void addManualAction(action) : undefined} onRemoveAction={canEditActions ? (action) => void removeAction(action) : undefined} suggestionsLoading={aiActionLoading} suggestionsStatus={aiActionStatus ?? undefined} suggestionsError={aiActionError} onRetrySuggestions={() => { aiActionRequestKeyRef.current = ""; void requestAiActionSuggestions(); }} showResultHero={false}/></SectionCard></section>;
}

function RulaAssessmentTable({ data, locale, editable, onOpenReport, onEdit, onHistory, onDownload, onDelete }: { data: Rula[]; locale: "fa" | "en"; editable: boolean; onOpenReport: (item: Rula) => void; onEdit: (item: Rula) => void; onHistory: (item: Rula) => void; onDownload: (item: Rula, format: "xlsx" | "docx" | "pdf") => void; onDelete: (item: Rula) => void }) {
  const { t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const bodySideLabel = (side?: Rula["bodySide"]) => side === "LEFT" ? t("assessment.left") : side === "BOTH" ? t("assessment.bothSides") : side === "RIGHT" ? t("assessment.right") : "—";
  const normalizedData = data.map((item) => item.postureReviewComplete === true ? item : { ...item, score: 0, actionLevel: 0 });

  return <div className="assessment-list rula-assessment-list">
    {normalizedData.map((item) => {
      const risk = rulaActionLevelForScore(item.score);
      const jobTitle = item.activityInfo?.jobTitle?.trim() || "—";
      const taskDescription = item.activityInfo?.taskDescription?.trim() || "—";
      const updatedAt = formatDate(item.updatedAt ?? item.createdAt, true);
      const displayCode = item.subjectCode?.trim() || item.id.slice(0, 8).toUpperCase();
      const displayTitle = item.title || t("assessment.rulaTitle");

      return <article className="assessment-card rula-assessment-card" key={item.id}>
        <button type="button" className="assessment-card-main" aria-label={t("assessment.openRulaReport") + ": " + displayTitle} onClick={() => onOpenReport(item)}>
          <div className="assessment-card-head"><span className="project-code">{displayCode}</span><StatusBadge value={item.status}/></div>
          <h3>{displayTitle}</h3>
          <p>{projectName(item.project, locale)} · {jobTitle}</p>
          <div className="rula-assessment-context">
            <span><small>{t("assessment.rulaTask")}</small><strong>{taskDescription}</strong></span>
            <span><small>{t("assessment.bodySide")}</small><strong>{bodySideLabel(item.bodySide)}</strong></span>
            <span><small>{t("assessment.rulaUpdatedAt")}</small><strong>{updatedAt}</strong></span>
          </div>
          <div className="assessment-metrics rula-assessment-metrics">
            <span><b className={"rula-card-score level-" + item.actionLevel}>{item.score.toLocaleString(numberLocale)}</b>{t("assessment.rulaScoreLabel")}</span>
            <span><b className={"rula-card-risk " + risk.className}>{t(risk.labelKey)}</b>{t("assessment.rulaRiskLevel")}</span>
            <span><b>{item.version.toLocaleString(numberLocale)}</b>{t("common.version")}</span>
          </div>
        </button>
        {editable && <div className="card-actions rula-card-actions" aria-label={t("assessment.operations")}>
          <button type="button" title={t("assessment.openRulaReport")} aria-label={t("assessment.openRulaReport") + ": " + displayTitle} onClick={() => onOpenReport(item)}><Icon name="chart" size={16}/>{t("assessment.openRulaReport")}</button>
          <button type="button" title={t("assessment.edit")} aria-label={t("assessment.edit") + ": " + displayTitle} onClick={() => onEdit(item)}><Icon name="activity" size={16}/>{t("assessment.edit")}</button>
          <button type="button" title={t("assessment.history")} aria-label={t("assessment.history") + ": " + displayTitle} onClick={() => onHistory(item)}><Icon name="clock" size={16}/>{t("assessment.history")}</button>
          <button type="button" title={t("assessment.downloadExcel")} aria-label={t("assessment.downloadExcel") + ": " + displayTitle} onClick={() => onDownload(item, "xlsx")}><Icon name="download" size={16}/>Excel</button>
          <button type="button" title={t("assessment.downloadWord")} aria-label={t("assessment.downloadWord") + ": " + displayTitle} onClick={() => onDownload(item, "docx")}><Icon name="download" size={16}/>Word</button><button type="button" title={t("assessment.downloadPdf")} aria-label={t("assessment.downloadPdf") + ": " + displayTitle} onClick={() => onDownload(item, "pdf")}><Icon name="download" size={16}/>PDF</button>
          <button type="button" className="danger-link" title={t("common.delete")} aria-label={t("common.delete") + ": " + displayTitle} onClick={() => onDelete(item)}><Icon name="trash" size={16}/>{t("common.delete")}</button>
        </div>}
      </article>;
    })}
  </div>;
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
  const editingAssessmentId = searchParams.get("edit")?.trim() ?? "";
  const requestedWizardStep: RulaWizardStep = searchParams.get("step") === "3" ? 3 : searchParams.get("step") === "2" ? 2 : 1;
  const editingExistingAssessment = Boolean(editingAssessmentId);
  const requestedProjectId = searchParams.get("project")?.trim() ?? "";
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const assessmentLabel = "RULA";
  const draftKey = draftKeyFor("rula");
  const initialDraft = editingExistingAssessment ? null : readLocalDraft(draftKey);
  const state = useLoad<Rula[]>("/rula");
  const projects = useLoad<Project[]>("/projects");
  const [error, setError] = useState(""); const [draftNotice, setDraftNotice] = useState(""); const [draftSyncAvailable, setDraftSyncAvailable] = useState(false); const [history, setHistory] = useState<VersionRow[]>([]); const [historyAssessment, setHistoryAssessment] = useState(""); const [wizardStep, setWizardStep] = useState<RulaWizardStep>(() => editingExistingAssessment ? requestedWizardStep : 1); const [draft, setDraftState] = useState<DraftRecord | null>(initialDraft); const [selectedProjectId, setSelectedProjectId] = useState(() => draftValue(initialDraft, "projectId")); const [lastSaved, setLastSaved] = useState<Date | null>(null); const [autosaveError, setAutosaveError] = useState(false); const [postureImage, setPostureImage] = useState<File | null>(null); const [postureImagePreview, setPostureImagePreview] = useState(""); const [postureImageError, setPostureImageError] = useState(""); const [postureImageAnalysisLoading, setPostureImageAnalysisLoading] = useState(false); const [postureImageAnalysisError, setPostureImageAnalysisError] = useState(""); const [postureImageAttachmentId, setPostureImageAttachmentId] = useState(""); const [postureDescription, setPostureDescription] = useState(() => String(initialDraft?.postureDescription ?? "")); const [rulaTaskDescription, setRulaTaskDescription] = useState(() => String(initialDraft?.taskDescription ?? "")); const [rulaBodySide, setRulaBodySide] = useState<"LEFT" | "RIGHT" | "BOTH">(() => initialDraft?.bodySide === "LEFT" ? "LEFT" : initialDraft?.bodySide === "BOTH" ? "BOTH" : "RIGHT"); const [submitting, setSubmitting] = useState(false); const [postureAnalysis, setPostureAnalysis] = useState<RulaPostureAnalysis>(() => parsePostureAnalysis(initialDraft?.postureAnalysis)); const [rulaForce, setRulaForce] = useState(() => { const value = Number(initialDraft?.force ?? 0); return Number.isInteger(value) && value >= 0 && value <= 3 ? value : 0; }); const [rulaMuscleUse, setRulaMuscleUse] = useState(() => rulaMuscleUseFromValue(initialDraft?.muscleUse)); const [selectedRulaActions, setSelectedRulaActions] = useState<RulaCorrectionAction[]>([]); const dialog = useDialog(); const formRef = useRef<HTMLFormElement>(null); const postureImageInputRef = useRef<HTMLInputElement>(null); const postureImageAnalysisRequestId = useRef(0); const postureImageAnalysisContextKey = useRef(""); const saveTimer = useRef<number | null>(null); const draftWriteQueue = useRef<Promise<void>>(Promise.resolve()); const suppressRulaDraftPersistence = useRef(false);
   const [jobQuery, setJobQuery] = useState(() => draftValue(initialDraft, "jobTitle"));
   const [taskDescriptionAiLoading, setTaskDescriptionAiLoading] = useState(false);
   const [taskDescriptionAiStatus, setTaskDescriptionAiStatus] = useState<ProcessSuggestionResponse["aiStatus"] | null>(null);
   const [taskDescriptionAiError, setTaskDescriptionAiError] = useState("");
   const [taskDescriptionSuggestion, setTaskDescriptionSuggestion] = useState("");
   const [selectedJobId, setSelectedJobId] = useState(() => draftValue(initialDraft, "jobCatalogId"));
   const [selectedJob, setSelectedJob] = useState<JobCatalogEntry | null>(null);
   const [customJobSelected, setCustomJobSelected] = useState(() => draftBoolean(initialDraft, "customJobSelected"));
   const [jobCatalog, setJobCatalog] = useState<JobCatalogEntry[]>([]);
   const [jobCatalogLoaded, setJobCatalogLoaded] = useState(false);
   const [jobCatalogOrganizationId, setJobCatalogOrganizationId] = useState("");
   const [jobLoading, setJobLoading] = useState(false);
   const [jobCatalogSaving, setJobCatalogSaving] = useState(false);
   const [jobCatalogSaveError, setJobCatalogSaveError] = useState(false);
   const [jobSearchError, setJobSearchError] = useState("");
   const [jobSearchOpen, setJobSearchOpen] = useState(false);
   const { orgId } = getSession();
   const rulaJobRequestId = useRef(0);
   const taskDescriptionRequestId = useRef(0);
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
  const editingAssessment = editingAssessmentId ? state.data?.find((item) => item.id === editingAssessmentId) : undefined;
  useEffect(() => {
    if (!editingAssessmentId || !state.data) return;
    const assessment = state.data.find((item) => item.id === editingAssessmentId);
    if (!assessment) return;
    const activityInfo = assessment.activityInfo;
    const nextDraft: DraftRecord = {
      projectId: assessment.project.id,
      title: assessment.title,
      subjectCode: assessment.subjectCode ?? "",
      bodySide: assessment.bodySide ?? "RIGHT",
      jobTitle: activityInfo?.jobTitle ?? "",
      taskDescription: activityInfo?.taskDescription ?? "",
      postureDescription: activityInfo?.postureDescription ?? "",
      durationPerOccurrence: activityInfo?.durationPerOccurrence === undefined ? "" : String(activityInfo.durationPerOccurrence),
      durationUnit: activityInfo?.durationUnit ?? "MINUTE",
      repetitionsPerShift: activityInfo?.repetitionsPerShift === undefined ? "" : String(activityInfo.repetitionsPerShift),
      postureHoldDuration: activityInfo?.postureHoldDuration === undefined ? "" : String(activityInfo.postureHoldDuration),
      postureHoldUnit: activityInfo?.postureHoldUnit ?? "SECOND",
      loadWeight: activityInfo?.loadWeight === undefined || activityInfo.loadWeight === null ? "" : String(activityInfo.loadWeight),
      loadUnit: activityInfo?.loadUnit ?? "KG",
      postureAnalysis: JSON.stringify(assessment.postureAnalysis ?? postureAnalysisFromValue(null)),
      force: String(assessment.inputs?.force ?? 0),
      muscleUse: rulaMuscleUseFromValue(assessment.inputs?.muscleUse),
    };
    setDraftState(nextDraft);
    setDraftNotice("");
    setDraftSyncAvailable(false);
    setSelectedProjectId(assessment.project.id);
    setPostureAnalysis(parsePostureAnalysis(assessment.postureAnalysis));
    setRulaBodySide(assessment.bodySide === "LEFT" ? "LEFT" : assessment.bodySide === "BOTH" ? "BOTH" : "RIGHT");
    setRulaForce(Number.isInteger(assessment.inputs?.force) && Number(assessment.inputs?.force) >= 0 && Number(assessment.inputs?.force) <= 3 ? Number(assessment.inputs?.force) : 0);
    setRulaMuscleUse(rulaMuscleUseFromValue(assessment.inputs?.muscleUse));
    setPostureDescription(activityInfo?.postureDescription ?? "");
    setRulaTaskDescription(activityInfo?.taskDescription ?? "");
    setJobQuery(activityInfo?.jobTitle ?? "");
    setSelectedJob(null);
    setSelectedJobId("");
    setCustomJobSelected(true);
    setPostureImageAttachmentId(activityInfo?.postureImageAttachmentId ?? "");
    setPostureImage(null);
    setPostureImageError("");
    setSelectedRulaActions([]);
    setWizardStep(requestedWizardStep);
  }, [editingAssessmentId, requestedWizardStep, state.data]);
  useEffect(() => { if (editingExistingAssessment) return; let active = true; const localDraft = readLocalDraft(draftKey); if (localDraft) { setDraftState(localDraft); setDraftNotice(t("assessment.draftAvailable", { type: assessmentLabel })); setDraftSyncAvailable(true); } void getDraft<DraftRecord>(draftKey).then((value) => { if (active && !localDraft && value && typeof value === "object" && !Array.isArray(value)) { setDraftState(value); setDraftNotice(t("assessment.draftAvailable", { type: assessmentLabel })); setDraftSyncAvailable(true); } }).catch(() => { if (active && !localDraft) setAutosaveError(true); }); return () => { active = false; cancelDraftTimer(saveTimer); }; }, [assessmentLabel, draftKey, editingExistingAssessment, locale]);
   useEffect(() => { if (!draft || editingExistingAssessment) return; const nestedInputs = draft.inputs && typeof draft.inputs === "object" && !Array.isArray(draft.inputs) ? draft.inputs as Record<string, unknown> : {}; setSelectedProjectId(String(draft.projectId ?? nestedInputs.projectId ?? "")); setPostureAnalysis(parsePostureAnalysis(draft.postureAnalysis)); setRulaBodySide(draft.bodySide === "LEFT" ? "LEFT" : draft.bodySide === "BOTH" ? "BOTH" : "RIGHT"); const force = Number(draft.force ?? nestedInputs.force ?? 0); setRulaForce(Number.isInteger(force) && force >= 0 && force <= 3 ? force : 0); const muscleUse = draft.muscleUse ?? nestedInputs.muscleUse; setRulaMuscleUse(rulaMuscleUseFromValue(muscleUse)); setPostureDescription(String(draft.postureDescription ?? "")); setRulaTaskDescription(String(draft.taskDescription ?? "")); }, [draft, editingExistingAssessment]);
    useEffect(() => {
     if (!draft || editingExistingAssessment) return;
      setJobQuery(draftValue(draft, "jobTitle"));
      setSelectedJobId(draftValue(draft, "jobCatalogId"));
      setCustomJobSelected(draftBoolean(draft, "customJobSelected"));
    }, [draft, editingExistingAssessment]);
   useEffect(() => {
     if (editingExistingAssessment || resultsView || !requestedProjectId || !projects.data) return;
     const project = projects.data.find((candidate) => candidate.id === requestedProjectId);
     if (!project) return;
     setSelectedProjectId(project.id);
     const nextDraft = readStoredDraft(browserStorage(), draftKey) ?? {};
     nextDraft.projectId = project.id;
     writeStoredDraft(browserStorage(), draftKey, nextDraft);
     navigate("/rula", { replace: true });
   }, [draftKey, editingExistingAssessment, navigate, projects.data, requestedProjectId, resultsView]);
  useEffect(() => { if (editingExistingAssessment || suppressRulaDraftPersistence.current || !formRef.current) return; queueDraft(formRef.current, draftKey, saveTimer, draftWriteQueue, (time) => { setAutosaveError(false); setLastSaved(time); }, () => setAutosaveError(true)); }, [draftKey, editingExistingAssessment, postureAnalysis, postureDescription, rulaTaskDescription, rulaForce, rulaMuscleUse]);
  useEffect(() => {
    if (resultsView || editingExistingAssessment || !suppressRulaDraftPersistence.current) return;
    const timer = window.setTimeout(() => { suppressRulaDraftPersistence.current = false; }, 0);
    return () => window.clearTimeout(timer);
  }, [editingExistingAssessment, resultsView]);
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

  useEffect(() => {
    if (wizardStep === 1) {
      postureImageAnalysisRequestId.current += 1;
      postureImageAnalysisContextKey.current = "";
      setPostureImageAnalysisLoading(false);
      return;
    }
    if (wizardStep !== 2) return;
    const jobTitle = jobQuery.trim();
    const taskDescription = rulaTaskDescription.trim();
    if (jobTitle.length < 2 || taskDescription.length < 2) {
      setPostureImageAnalysisLoading(false);
      return;
    }
    const activityInfo = formRef.current ? rulaActivityInfoFromForm(new FormData(formRef.current)) : null;
    const imageKey = postureImage ? `${postureImage.name}:${postureImage.size}:${postureImage.lastModified}` : "text-only";
    const contextKey = `${imageKey}:${rulaBodySide}:${locale}:${jobTitle}:${taskDescription}:${postureDescription.trim()}:${rulaForce}:${rulaMuscleUse}:${JSON.stringify(activityInfo)}`;
    if (postureImageAnalysisContextKey.current === contextKey) return;
    postureImageAnalysisContextKey.current = contextKey;
    postureImageAnalysisRequestId.current += 1;
    const analysisTimer = window.setTimeout(() => { void (postureImage ? requestRulaPostureImageAnalysis(postureImage) : requestRulaPostureTextAnalysis()); }, 450);
    return () => { window.clearTimeout(analysisTimer); };
  }, [jobQuery, locale, postureDescription, postureImage, rulaBodySide, rulaForce, rulaMuscleUse, rulaTaskDescription, wizardStep]);

  function clearRulaPostureImageAnalysis() {
    postureImageAnalysisRequestId.current += 1;
    postureImageAnalysisContextKey.current = "";
    setPostureImageAnalysisLoading(false);
    setPostureImageAnalysisError("");
    setPostureAnalysis(postureAnalysisFromValue(null));
  }

  function applyRulaPostureAnalysisResponse(result: RulaPostureAnalysisResponse) {
    const requestedSides = rulaBodySide === "BOTH" ? (["RIGHT", "LEFT"] as const) : [rulaBodySide] as const;
    const sideResults = requestedSides.map((side) => ({ side, value: rulaAnalysisFromImageSide(result.sides[side]) }));
    if (sideResults.some((item) => !item.value)) throw new Error("Invalid RULA posture-analysis response");
    if (rulaBodySide === "BOTH") {
      const right = sideResults.find((item) => item.side === "RIGHT")!.value!;
      const left = sideResults.find((item) => item.side === "LEFT")!.value!;
      const sideImageOverlays = { RIGHT: right.overlay, LEFT: left.overlay };
      setPostureAnalysis({
        ...right.analysis,
        sideAnalyses: { RIGHT: right.analysis, LEFT: left.analysis },
        ...(right.overlay || left.overlay ? { sideImageOverlays } : {}),
      });
      return;
    }
    const current = sideResults[0].value!;
    setPostureAnalysis({ ...current.analysis, ...(current.overlay ? { imageOverlay: current.overlay } : {}) });
  }

  async function requestRulaPostureImageAnalysis(file = postureImage) {
    if (!file || jobQuery.trim().length < 2 || rulaTaskDescription.trim().length < 2) return;
    const requestId = ++postureImageAnalysisRequestId.current;
    setPostureImageAnalysisLoading(true);
    setPostureImageAnalysisError("");
    setPostureAnalysis((current) => postureAnalysisFromValue({ ...current, imageOverlay: undefined, sideImageOverlays: undefined }));
    const body = new FormData();
    body.append("bodySide", rulaBodySide);
    body.append("jobTitle", jobQuery.trim());
    body.append("taskDescription", rulaTaskDescription.trim());
    body.append("postureDescription", postureDescription.trim());
    body.append("locale", locale);
    body.append("file", file);
    try {
      const result = await api<RulaPostureImageAnalysisResponse>("/rula/posture-image-analysis", { method: "POST", body });
      if (requestId !== postureImageAnalysisRequestId.current) return;
      applyRulaPostureAnalysisResponse(result.data);
    } catch {
      if (requestId === postureImageAnalysisRequestId.current) setPostureImageAnalysisError(t("assessment.rulaImageAnalysisUnavailable"));
    } finally {
      if (requestId === postureImageAnalysisRequestId.current) setPostureImageAnalysisLoading(false);
    }
  }

  async function requestRulaPostureTextAnalysis() {
    if (jobQuery.trim().length < 2 || rulaTaskDescription.trim().length < 2) return;
    const values = formRef.current ? new FormData(formRef.current) : null;
    const activityInfo = values ? rulaActivityInfoFromForm(values) : null;
    if (!activityInfo) return;
    const requestId = ++postureImageAnalysisRequestId.current;
    setPostureImageAnalysisLoading(true);
    setPostureImageAnalysisError("");
    setPostureAnalysis((current) => postureAnalysisFromValue({ ...current, imageOverlay: undefined, sideImageOverlays: undefined }));
    try {
      const result = await api<RulaPostureAnalysisResponse>("/rula/posture-analysis", {
        method: "POST",
        body: JSON.stringify({ ...activityInfo, bodySide: rulaBodySide, force: rulaForce, muscleUse: rulaMuscleUse, locale }),
      });
      if (requestId !== postureImageAnalysisRequestId.current) return;
      applyRulaPostureAnalysisResponse(result.data);
    } catch {
      if (requestId === postureImageAnalysisRequestId.current) setPostureImageAnalysisError(t("assessment.rulaTextAnalysisUnavailable"));
    } finally {
      if (requestId === postureImageAnalysisRequestId.current) setPostureImageAnalysisLoading(false);
    }
  }

  function handlePostureImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setPostureImageError("");
    if (!file) { clearRulaPostureImageAnalysis(); setPostureImage(null); return; }
    if (!RULA_POSTURE_IMAGE_TYPES.has(file.type)) { clearRulaPostureImageAnalysis(); setPostureImage(null); setPostureImageError(t("assessment.postureImageInvalidType")); event.target.value = ""; return; }
    if (file.size > RULA_POSTURE_IMAGE_MAX_BYTES) { clearRulaPostureImageAnalysis(); setPostureImage(null); setPostureImageError(t("assessment.postureImageTooLarge")); event.target.value = ""; return; }
    clearRulaPostureImageAnalysis();
    setPostureImage(file);
  }
  function removePostureImage() { clearRulaPostureImageAnalysis(); setPostureImage(null); setPostureImageAttachmentId(""); setPostureImageError(""); if (postureImageInputRef.current) postureImageInputRef.current.value = ""; }
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
       if (suppressRulaDraftPersistence.current) return;
       if (formRef.current) queueDraft(formRef.current, draftKey, saveTimer, draftWriteQueue, (time) => { setAutosaveError(false); setLastSaved(time); }, () => setAutosaveError(true));
     }, 0);
   }
   function clearRulaTaskDescriptionAssistant() {
     taskDescriptionRequestId.current += 1;
     setTaskDescriptionAiLoading(false);
     setTaskDescriptionSuggestion("");
     setTaskDescriptionAiError("");
     setTaskDescriptionAiStatus(null);
   }
   function selectRulaJob(job: JobCatalogEntry) {
     const title = localizedJobTitle(job, locale);
     setSelectedJob(job);
     setSelectedJobId(job.id);
     setCustomJobSelected(false);
     setJobCatalogSaveError(false);
     setJobQuery(title);
     clearRulaTaskDescriptionAssistant();
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
     if (jobCatalogSaving) return;
     setSelectedJob(null);
     setSelectedJobId("");
     setCustomJobSelected(true);
     setJobCatalogSaveError(false);
     setJobQuery(title);
     clearRulaTaskDescriptionAssistant();
     setJobSearchOpen(false);
     setJobSearchError("");
     setError("");
     setJobCatalogSaving(true);
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
       setJobCatalogSaveError(true);
       setCustomJobSelected(false);
       setSelectedJobId("");
       queueRulaJobDraft();
     } finally {
       setJobCatalogSaving(false);
       setJobLoading(false);
     }
   }
   function changeRulaJobQuery(value: string) {
     setJobQuery(value);
     clearRulaTaskDescriptionAssistant();
     setJobSearchError("");
     if (selectedJob && value.trim() !== localizedJobTitle(selectedJob, locale)) {
       setSelectedJob(null);
       setSelectedJobId("");
       setCustomJobSelected(false);
       setJobCatalogSaveError(false);
     }
     if (customJobSelected && value.trim() !== jobQuery.trim()) {
       setCustomJobSelected(false);
       setJobCatalogSaveError(false);
     }
   }
   function clearRulaJob() {
     setJobQuery("");
     setSelectedJob(null);
     setSelectedJobId("");
     setCustomJobSelected(false);
     setJobCatalogSaveError(false);
     clearRulaTaskDescriptionAssistant();
     setJobSearchError("");
     queueRulaJobDraft();
   }
    function resetRulaEntryForm() {
      suppressRulaDraftPersistence.current = true;
      cancelDraftTimer(saveTimer);
      setError("");
      postureImageAnalysisRequestId.current += 1;
      postureImageAnalysisContextKey.current = "";
      taskDescriptionRequestId.current += 1;
      setSelectedProjectId("");
      setJobQuery("");
      setSelectedJobId("");
      setSelectedJob(null);
      setCustomJobSelected(false);
      setJobCatalogSaveError(false);
      setJobSearchOpen(false);
      setJobSearchError("");
      setPostureImage(null);
      setPostureImageError("");
      setPostureImageAnalysisLoading(false);
      setPostureImageAnalysisError("");
      setPostureImageAttachmentId("");
      setPostureDescription("");
      setRulaTaskDescription("");
      setRulaBodySide("RIGHT");
      setPostureAnalysis(postureAnalysisFromValue(null));
      setRulaForce(0);
      setRulaMuscleUse(false);
      setSelectedRulaActions([]);
      setTaskDescriptionAiLoading(false);
      setTaskDescriptionAiStatus(null);
      setTaskDescriptionAiError("");
      setTaskDescriptionSuggestion("");
      setDraftState(null);
      setWizardStep(1);
      setLastSaved(null);
      setAutosaveError(false);
      clearAssessmentWizardStep(draftKey);
      if (postureImageInputRef.current) postureImageInputRef.current.value = "";
    }
   function changeRulaTaskDescription(value: string) {
     taskDescriptionRequestId.current += 1;
     setTaskDescriptionAiLoading(false);
     setRulaTaskDescription(value);
     setTaskDescriptionSuggestion("");
     setTaskDescriptionAiError("");
     setTaskDescriptionAiStatus(null);
   }
   async function requestRulaTaskDescriptionSuggestion() {
     const title = jobQuery.trim();
     if (title.length < 2) {
       setError(t("assessment.jobActivityRequired"));
       return;
     }
     const requestId = ++taskDescriptionRequestId.current;
     setTaskDescriptionAiLoading(true);
     setTaskDescriptionAiError("");
     setTaskDescriptionSuggestion("");
     try {
       const result = await api<ProcessSuggestionResponse>("/fmea/process-suggestions", {
         method: "POST",
         body: JSON.stringify({ jobCatalogId: selectedJobId || null, jobTitle: title, department: null, activityDescription: rulaTaskDescription.trim() || null, locale, mode: "description" }),
       });
       if (requestId !== taskDescriptionRequestId.current) return;
       setTaskDescriptionAiStatus(result.data.aiStatus);
       const suggestion = result.data.descriptionSuggestion?.trim() ?? "";
       if (suggestion && suggestion.length <= RULA_TASK_DESCRIPTION_MAX && countShortDescriptionSentences(suggestion) <= 2) {
         setTaskDescriptionSuggestion(suggestion);
         setTaskDescriptionAiError("");
       } else setTaskDescriptionAiError(t("assessment.descriptionSuggestionUnavailable"));
     } catch {
       if (requestId === taskDescriptionRequestId.current) {
         setTaskDescriptionAiStatus("unavailable");
         setTaskDescriptionAiError(t("assessment.descriptionSuggestionUnavailable"));
       }
     } finally {
       if (requestId === taskDescriptionRequestId.current) setTaskDescriptionAiLoading(false);
     }
   }
   function acceptRulaTaskDescriptionSuggestion() {
     const suggestion = taskDescriptionSuggestion.trim();
     if (!suggestion) return;
     setRulaTaskDescription(suggestion);
     setTaskDescriptionSuggestion("");
     setTaskDescriptionAiError("");
     setError("");
     window.setTimeout(() => {
       queueRulaJobDraft();
       document.getElementById("rula-task-description")?.focus();
     }, 0);
   }
   function dismissRulaTaskDescriptionSuggestion() {
     setTaskDescriptionSuggestion("");
   }
   function validateRulaProcessInfo() {
    const values = formRef.current ? new FormData(formRef.current) : null;
    if (!values) { setError(t("assessment.validationEnter", { field: t("assessment.rulaJobTitle") })); scrollAssessmentValidationToTop(); return false; }
    if (jobCatalogSaving) { setError(t("assessment.jobCatalogSaveInProgress")); scrollAssessmentValidationToTop(); return false; }
    if (jobCatalogSaveError) { setError(t("assessment.jobCatalogSaveRequired")); scrollAssessmentValidationToTop(); return false; }
    const required: Array<[string, string]> = [["projectId", t("assessment.projectRequired")], ["jobTitle", t("assessment.rulaJobTitle")], ["taskDescription", t("assessment.rulaTask")]];
    const missing = required.find(([name]) => !String(values.get(name) ?? "").trim());
    if (missing) { setError(t("assessment.validationEnter", { field: missing[1] })); scrollAssessmentValidationToTop(); return false; }
    const title = String(values.get("title") ?? "").trim();
    const jobTitle = String(values.get("jobTitle") ?? "").trim();
    const taskDescription = String(values.get("taskDescription") ?? "").trim();
    const shortText = [[jobTitle, t("assessment.rulaJobTitle")], [taskDescription, t("assessment.rulaTask")]] as const;
    const tooShort = shortText.find(([value]) => value.length < 2);
    if (tooShort) { setError(t("assessment.validationMinLength", { field: tooShort[1], min: "۲" })); scrollAssessmentValidationToTop(); return false; }
    if (title && title.length < 2) { setError(t("assessment.validationMinLength", { field: t("assessment.titleRequired"), min: "۲" })); scrollAssessmentValidationToTop(); return false; }
    const numericRules: Array<{ name: string; label: string; min: number; max: number; integer?: boolean }> = [
      { name: "durationPerOccurrence", label: t("assessment.rulaDuration"), min: 0.1, max: 1440 },
      { name: "repetitionsPerShift", label: t("assessment.rulaRepetitions"), min: 1, max: 10000, integer: true },
      { name: "postureHoldDuration", label: t("assessment.rulaPostureHold"), min: 0.1, max: 1440 },
    ];
    const loadWeight = String(values.get("loadWeight") ?? "").trim();
    if (loadWeight) numericRules.push({ name: "loadWeight", label: t("assessment.rulaLoadWeight"), min: 0, max: 10000 });
    const invalidNumber = numericRules.find((rule) => { const raw = String(values.get(rule.name) ?? "").trim(); if (!raw) return false; const value = Number(raw); return !Number.isFinite(value) || value < rule.min || value > rule.max || (rule.integer && !Number.isInteger(value)); });
    if (invalidNumber) { const rule = invalidNumber; if (rule.integer) setError(t("assessment.validationInteger", { field: rule.label })); else setError(t("assessment.validationNumberRange", { field: rule.label, min: rule.min, max: rule.max })); scrollAssessmentValidationToTop(); return false; }
    if (postureDescription.trim().length > 1000) { setError(t("assessment.validationMaxLength", { field: t("assessment.rulaPostureDescription"), max: "۱۰۰۰" })); scrollAssessmentValidationToTop(); return false; }
    if (postureImageError) { setError(postureImageError); scrollAssessmentValidationToTop(); return false; }
    setError("");
    return true;
  }
  function validateWizardStep() {
    if (wizardStep === 1) return validateRulaProcessInfo();
    setError("");
    return true;
  }
  function advanceRulaWizard() {
    if (submitting) return;
    if (!validateWizardStep()) { setWizardStep(1); return; }
    setError("");
    setWizardStep((step) => step === 1 ? 2 : step === 2 ? 3 : 3);
  }
  async function create(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (submitting) return; if (wizardStep < 3) { advanceRulaWizard(); return; } if (!validateRulaProcessInfo()) { setWizardStep(1); return; } setSubmitting(true); try { await (editingAssessmentId ? updateRula(event) : createRula(event)); } finally { setSubmitting(false); } }
  async function createRula(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const payload = rulaPayloadFromForm(element);
    setError("");
    cancelDraftTimer(saveTimer);
    const draftSaved = await persistDraftNow(draftKey, snapshotStoredForm(element), draftWriteQueue);
    if (!draftSaved) {
      setAutosaveError(true);
      setError(t("assessment.autosaveError"));
      return;
    }
    if (!navigator.onLine) {
      setDraftNotice(t("assessment.draftSavedOffline"));
      setDraftSyncAvailable(true);
      if (postureImage) setError(t("assessment.postureImageOffline"));
      return;
    }
    try {
      const created = await api<Rula>("/rula", { method: "POST", body: JSON.stringify(payload) });
      let imageUploadFailed = false;
      let actionPersistFailed = false;
      if (postureImage) {
        try {
          const upload = new FormData();
          upload.append("entityType", "RulaAssessment");
          upload.append("entityId", created.data.id);
          upload.append("file", postureImage);
          const attachment = await api<{ id: string }>("/files", { method: "POST", body: upload });
          await api(`/rula/${created.data.id}`, { method: "PATCH", body: JSON.stringify({ activityInfo: { ...payload.activityInfo, postureImageAttachmentId: attachment.data.id } }) });
        } catch {
          imageUploadFailed = true;
        }
      }
      for (const action of selectedRulaActions) {
        const actionSide = action.bodySide ?? payload.bodySide;
        const scoreSide = actionSide === "LEFT" || actionSide === "RIGHT" ? actionSide : undefined;
        const beforeRisk = scoreSide ? currentRulaSideResults[scoreSide]?.score ?? created.data.score : created.data.score;
        const afterRisk = predictedRulaScoreForSide(beforeRisk, selectedRulaActions, scoreSide);
        try {
          await api("/actions", { method: "POST", body: JSON.stringify({ projectId: payload.projectId, rulaId: created.data.id, bodySide: actionSide, title: rulaActionText(action, locale, "title"), description: rulaActionText(action, locale, "description") || t("assessment.rulaManualAction"), priority: action.priority, status: "OPEN", beforeRisk, afterRisk, rulaImpact: { suggestionId: action.id, scoreReduction: action.scoreReduction, affectedParts: action.affectedParts } }) });
        } catch {
          actionPersistFailed = true;
        }
      }
      suppressRulaDraftPersistence.current = true;
      await clearAutoSaveDraft(draftKey);
      element.reset();
      resetRulaEntryForm();
      state.reload();
      setDraftNotice(t("assessment.created", { type: assessmentLabel }));
      setDraftSyncAvailable(false);
      if (imageUploadFailed) setError(t("assessment.postureImageUploadFailed"));
      if (actionPersistFailed) setError(t("assessment.rulaActionsPersistFailed"));
      navigate(`/rula/${created.data.id}/report`);
    } catch (reason) {
      setError((reason as Error).message);
    }
  }
  async function updateRula(event: FormEvent<HTMLFormElement>) {
    if (!editingAssessmentId) return;
    const element = event.currentTarget;
    const payload = rulaPayloadFromForm(element);
    setError("");
    cancelDraftTimer(saveTimer);
    if (!navigator.onLine) { setError(t("assessment.processSaveFailed")); return; }
    try {
      const updated = await api<{ id: string; score: number }>(`/rula/${editingAssessmentId}`, { method: "PATCH", body: JSON.stringify(payload) });
      let imageUploadFailed = false;
      if (postureImage) {
        try {
          const upload = new FormData();
          upload.append("entityType", "RulaAssessment");
          upload.append("entityId", editingAssessmentId);
          upload.append("file", postureImage);
          const attachment = await api<{ id: string }>("/files", { method: "POST", body: upload });
          await api(`/rula/${editingAssessmentId}`, { method: "PATCH", body: JSON.stringify({ activityInfo: { ...payload.activityInfo, postureImageAttachmentId: attachment.data.id } }) });
        } catch { imageUploadFailed = true; }
      }
      let actionPersistFailed = false;
      for (const action of selectedRulaActions) {
        const actionSide = action.bodySide ?? payload.bodySide;
        const scoreSide = actionSide === "LEFT" || actionSide === "RIGHT" ? actionSide : undefined;
        const beforeRisk = scoreSide ? currentRulaSideResults[scoreSide]?.score ?? updated.data.score : updated.data.score;
        const afterRisk = predictedRulaScoreForSide(beforeRisk, selectedRulaActions, scoreSide);
        try {
          await api("/actions", { method: "POST", body: JSON.stringify({ projectId: payload.projectId, rulaId: editingAssessmentId, bodySide: actionSide, title: rulaActionText(action, locale, "title"), description: rulaActionText(action, locale, "description") || t("assessment.rulaManualAction"), priority: action.priority, status: "OPEN", beforeRisk, afterRisk, rulaImpact: { suggestionId: action.id, scoreReduction: action.scoreReduction, affectedParts: action.affectedParts } }) });
        } catch { actionPersistFailed = true; }
      }
      state.reload();
      if (imageUploadFailed) setError(t("assessment.postureImageUploadFailed"));
      if (actionPersistFailed) setError(t("assessment.rulaActionsPersistFailed"));
      navigate(`/rula/${editingAssessmentId}/report`, { replace: true });
    } catch (reason) { setError((reason as Error).message); }
  }

  async function syncDraft() { cancelDraftTimer(saveTimer); await draftWriteQueue.current.catch(() => undefined); const value = await readAssessmentDraft(draftKey); if (!value) return; try { await api("/rula", { method: "POST", body: JSON.stringify(rulaPayloadFromDraft(value)) }); await clearAutoSaveDraft(draftKey); setDraftState(null); setWizardStep(1); setDraftNotice(t("assessment.synced", { type: assessmentLabel })); setDraftSyncAvailable(false); setAutosaveError(false); state.reload(); } catch (reason) { setError((reason as Error).message); } }
  async function editAssessment(item: Rula) { const title = (await dialog.prompt(t("assessment.editTitle"), item.title))?.trim(); if (!title || title === item.title) return; try { await api(`/rula/${item.id}`, { method: "PATCH", body: JSON.stringify({ title }) }); state.reload(); } catch (reason) { setError((reason as Error).message); } }
  async function deleteAssessment(item: Rula) { if (!(await dialog.confirm(t("assessment.deleteConfirm", { title: item.title })))) return; try { await api(`/rula/${item.id}`, { method: "DELETE" }); state.reload(); } catch (reason) { setError((reason as Error).message); } }
  async function loadHistory(id: string) { try { const result = await api<VersionRow[]>(`/rula/${id}/history`); setHistory(result.data); setHistoryAssessment(id); } catch (reason) { setError((reason as Error).message); } }
  function openRulaResults() { setHistoryAssessment(""); navigate("/rula?view=results"); }
   async function returnToNewRula() { setHistoryAssessment(""); cancelDraftTimer(saveTimer); await clearAutoSaveDraft(draftKey); resetRulaEntryForm(); setDraftNotice(""); setDraftSyncAvailable(false); navigate("/rula", { replace: true }); }
  const postureAnalysisWorkingKey = postureImage ? "assessment.rulaImageAnalysisWorking" : "assessment.rulaTextAnalysisWorking";
  const postureAnalysisUnavailableKey = postureImage ? "assessment.rulaImageAnalysisUnavailable" : "assessment.rulaTextAnalysisUnavailable";
  const postureAnalysisActiveKey = postureImage ? "assessment.rulaAiImageActive" : "assessment.rulaTextAnalysisActive";
  const postureAnalysisActiveHintKey = postureImage ? "assessment.rulaAiImageActiveHint" : "assessment.rulaTextAnalysisActiveHint";

  return <section className="page-shell">
    <PageHeader eyebrow={resultsView ? t("assessment.rulaResults") : t("assessment.rulaEyebrow")} title={resultsView ? t("assessment.rulaResults") : t("assessment.rulaTitle")} description={resultsView ? t("assessment.rulaResultsDescription") : t("assessment.rulaDescription")} actions={<div className="page-actions-inline">{resultsView ? <button type="button" className="ghost" onClick={() => void returnToNewRula()}><Icon name="arrow" className="back-arrow" size={16}/><span className="page-action-label">{t("assessment.backToNewRula")}</span></button> : <><button type="button" className="ghost" onClick={openRulaResults}><Icon name="chart" size={16}/><span className="page-action-label">{t("assessment.rulaRegistered")}</span></button><Link className="ghost button-link" to="/choose-path"><Icon name="arrow" className="back-arrow" size={16}/><span className="page-action-label">{t("assessment.changeAssessmentMethod")}</span></Link></>}</div>}/>
    {error && <div className="alert error assessment-validation-alert" role="alert"><Icon name="warning"/>{error}</div>}
    {!resultsView && draftNotice && <div className="alert info" role="status"><Icon name="files"/>{draftNotice}{navigator.onLine && draftSyncAvailable && <button type="button" className="text-button" onClick={() => void syncDraft()}>{t("common.sync")}</button>}</div>}
    {!resultsView && <div className="mini-stats"><div><Icon name="rula"/><strong>{overview.total.toLocaleString(numberLocale)}</strong><span>{t("assessment.assessmentCount")}</span></div><div><Icon name="warning"/><strong>{overview.high.toLocaleString(numberLocale)}</strong><span>{t("assessment.needsAction")}</span></div><div><Icon name="chart"/><strong>{overview.average.toLocaleString(numberLocale)}</strong><span>{t("assessment.averageScore")}</span></div></div>}
    {!resultsView && canEdit() && <SectionCard title={editingExistingAssessment ? t("assessment.editRula") : t("assessment.evaluateNew", { type: assessmentLabel })} description={t("assessment.threeSteps", { steps: t("assessment.stepRulaProcessScoreReview") })} icon="plus">
       <form ref={formRef} className="rula-form assessment-wizard" key={editingExistingAssessment ? editingAssessment ? `edit-${editingAssessment.id}-${editingAssessment.version}-${draft ? "ready" : "loading"}` : `edit-loading-${editingAssessmentId}` : draft ? "restored-draft" : "new-draft"} noValidate aria-busy={submitting} onInput={(event) => { if (!editingExistingAssessment && !suppressRulaDraftPersistence.current) queueDraft(event.currentTarget, draftKey, saveTimer, draftWriteQueue, (time) => { setAutosaveError(false); setLastSaved(time); }, () => setAutosaveError(true)); }} onChange={(event) => { if (!editingExistingAssessment && !suppressRulaDraftPersistence.current) queueDraft(event.currentTarget, draftKey, saveTimer, draftWriteQueue, (time) => { setAutosaveError(false); setLastSaved(time); }, () => setAutosaveError(true)); }} onSubmit={create}>
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
                  <JobCatalogSearch value={jobQuery} selectedJob={selectedJob} customSelected={customJobSelected} jobs={jobCatalog} loading={jobLoading} error={jobSearchError} open={jobSearchOpen} onOpenChange={setJobSearchOpen} onChange={changeRulaJobQuery} onSelect={selectRulaJob} onUseCustom={(title) => void useCustomRulaJobTitle(title)} onClear={clearRulaJob} inputName="jobTitle" inputId="rula-job-search" listId="rula-job-catalog-options" label={t("assessment.rulaJobTitle")} placeholder={t("assessment.jobActivityPlaceholder")} hint={t("assessment.jobCatalogHint")} className="rula-job-search"/>
                  <input type="hidden" name="jobCatalogId" value={selectedJobId} readOnly/><input type="hidden" name="customJobSelected" value={customJobSelected ? "true" : "false"} readOnly/>
                  <div className="fmea-description-field span-two">
                    <div className="fmea-description-head"><label htmlFor="rula-task-description"><span className="fmea-field-label"><span>{t("assessment.rulaTask")}</span><span className="required-label">{t("common.required")}</span></span></label><button type="button" className="fmea-description-ai" onClick={() => void requestRulaTaskDescriptionSuggestion()} disabled={taskDescriptionAiLoading} aria-busy={taskDescriptionAiLoading}><Icon name="sparkles" size={15}/>{taskDescriptionAiLoading ? t("assessment.aiDescriptionWorking") : t(rulaTaskDescription.trim() ? "assessment.improveDescriptionWithAi" : "assessment.suggestDescriptionWithAi")}</button></div>
                    <textarea id="rula-task-description" name="taskDescription" value={rulaTaskDescription} maxLength={RULA_TASK_DESCRIPTION_MAX} rows={2} required aria-describedby="rula-task-description-hint rula-task-description-error" placeholder={t("assessment.rulaTaskPlaceholder")} onChange={(event) => changeRulaTaskDescription(event.target.value)}/>
                    <div className="fmea-description-meta"><span id="rula-task-description-hint" className="field-counter">{rulaTaskDescription.length.toLocaleString(numberLocale)} / {Number(RULA_TASK_DESCRIPTION_MAX).toLocaleString(numberLocale)}</span>{taskDescriptionAiStatus && !taskDescriptionAiLoading && <span className={`ai-status ${taskDescriptionAiStatus}`}>{t(`assessment.aiStatus.${taskDescriptionAiStatus}`)}</span>}</div>
                    {taskDescriptionSuggestion && <div className="fmea-description-suggestion" role="status" aria-live="polite"><div className="fmea-description-suggestion-head"><div><strong>{t("assessment.descriptionSuggestionTitle")}</strong><small>{t("assessment.descriptionSuggestionHint")}</small></div><span className={`ai-status ${taskDescriptionAiStatus ?? "connected"}`}>{taskDescriptionAiStatus ? t(`assessment.aiStatus.${taskDescriptionAiStatus}`) : "AI"}</span></div><p>{taskDescriptionSuggestion}</p><div className="fmea-description-suggestion-actions"><button type="button" className="primary" onClick={acceptRulaTaskDescriptionSuggestion}>{t("assessment.useDescriptionSuggestion")}</button><button type="button" className="ghost" onClick={dismissRulaTaskDescriptionSuggestion}>{t("assessment.dismissDescriptionSuggestion")}</button></div></div>}
                    {taskDescriptionAiError && <small id="rula-task-description-error" className="field-error fmea-description-assist-error" role="status">{taskDescriptionAiError}</small>}
                  </div>
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
                   <input ref={postureImageInputRef} name="postureImage" type="file" accept="image/jpeg,image/png,image/webp" aria-invalid={postureImageError ? true : undefined} aria-describedby={postureImageError ? "rula-posture-image-error" : undefined} onChange={handlePostureImageChange}/>
                   {postureImagePreview ? <><img src={postureImagePreview} alt={t("assessment.rulaPosturePhoto")}/><span className="rula-posture-change">{t("assessment.changePostureImage")}</span></> : <><Icon name="files" size={34}/><strong>{t("assessment.choosePosturePhoto")}</strong><small>{t("assessment.choosePosturePhotoHint")}</small><span className="ghost fake-button">{t("assessment.choosePhoto")}</span></>}
                 </label>
                 {editingExistingAssessment && <input type="hidden" name="postureImageAttachmentId" value={postureImageAttachmentId} readOnly/>}
                 {postureImage && <div className="rula-posture-file-meta"><span title={postureImage.name}>{postureImage.name}</span><button type="button" className="text-button" onClick={removePostureImage}>{t("assessment.removePostureImage")}</button></div>}
                 {postureImageError && <small id="rula-posture-image-error" className="field-error" role="alert">{postureImageError}</small>}
               </div>
               <label className="rula-posture-description-field"><span className="field-label-line"><span>{t("assessment.rulaPostureDescription")}</span><span className="optional-label">{t("common.optional")}</span></span><textarea name="postureDescription" value={postureDescription} maxLength={1000} rows={4} aria-describedby="rula-posture-description-hint" placeholder={t("assessment.rulaPostureDescriptionPlaceholder")} onChange={(event) => setPostureDescription(event.target.value)}/><small id="rula-posture-description-hint" className="field-hint">{t("assessment.rulaPostureDescriptionHint")} · <span className="rula-posture-description-counter">{postureDescription.length.toLocaleString(numberLocale)} / {Number(1000).toLocaleString(numberLocale)}</span></small></label>
               <div className="rula-photo-guidance"><strong>{t("assessment.rulaPhotoGuidanceTitle")}</strong><ul><li>{t("assessment.rulaPhotoGuidanceOne")}</li><li>{t("assessment.rulaPhotoGuidanceTwo")}</li><li>{t("assessment.rulaPhotoGuidanceThree")}</li></ul></div>
               <div className={`rula-ai-image-note ${postureImageAnalysisLoading ? "is-loading" : postureImageAnalysisError ? "has-error" : "is-active"}`} role="status"><Icon name="sparkles" size={17}/><span><strong>{postureImageAnalysisLoading ? t(postureAnalysisWorkingKey) : postureImageAnalysisError ? t(postureAnalysisUnavailableKey) : t(postureAnalysisActiveKey)}</strong><small>{postureImageAnalysisError || t(postureAnalysisActiveHintKey)}</small></span></div>
             </div>
           </div>
         </fieldset>
         <fieldset hidden={wizardStep !== 2}><legend>{t("assessment.bodyScoring")}</legend><input type="hidden" name="postureAnalysis" value={JSON.stringify(postureAnalysis)} readOnly/>{rulaPostureRows.map(({ key }) => <input key={key} type="hidden" name={key} value={postureAnalysis[key].score} readOnly/>)}<RulaPostureAnalysisStep analysis={postureAnalysis} result={currentRulaResult} sideResults={currentRulaSideResults} bodySide={rulaBodySide} imagePreview={postureImagePreview} postureDescription={postureDescription} locale={locale} onChange={(part, row, side) => setPostureAnalysis((current) => { if (rulaBodySide === "BOTH" && side) { const normalized = withBothSideAnalyses(current); const nextSides = { ...normalized.sideAnalyses!, [side]: { ...normalized.sideAnalyses![side]!, [part]: row } }; return { ...normalized, ...(side === "RIGHT" ? nextSides.RIGHT! : {}), sideAnalyses: nextSides }; } return { ...current, [part]: row }; })}/><div className="rula-extra"><label><span className="field-label-line"><span>{t("assessment.force")}</span><span className="required-label">{t("common.required")}</span></span><StyledSelect name="force" value={rulaForce} onChange={(event) => setRulaForce(Number(event.target.value))}><option value="0">{t("assessment.noSignificantForce")} — {t("assessment.noSignificantForcePoints")} — {t("assessment.noSignificantForceRange")}</option><option value="1">{t("assessment.lowForce")} — {t("assessment.lowForcePoints")} — {t("assessment.lowForceRange")}</option><option value="2">{t("assessment.mediumForce")} — {t("assessment.mediumForcePoints")} — {t("assessment.mediumForceRange")}</option><option value="3">{t("assessment.highForce")} — {t("assessment.highForcePoints")} — {t("assessment.highForceRange")}</option></StyledSelect></label><input type="hidden" name="muscleUse" value={rulaMuscleUse ? "1" : "0"}/><RulaMuscleUseSelector value={rulaMuscleUse} onChange={setRulaMuscleUse}/></div></fieldset>
         <fieldset hidden={wizardStep !== 3}><legend>{t("assessment.rulaAssessmentReporting")}</legend><RulaReportPreview result={currentRulaResult} analysis={postureAnalysis} force={rulaForce} muscleUse={rulaMuscleUse} bodySide={rulaBodySide} locale={locale} selectedActions={selectedRulaActions} onSelectedActionsChange={setSelectedRulaActions}/></fieldset>
        <div className="wizard-actions"><button className="ghost" type="button" disabled={wizardStep === 1 || submitting} onClick={() => { setError(""); setWizardStep((step) => step === 3 ? 2 : 1); }}>{t("assessment.previousStep")}</button>{wizardStep < 3 ? <button className="primary" type="button" disabled={submitting} onClick={advanceRulaWizard}>{t("common.next")} <Icon name="arrow"/></button> : <button className="primary" type="submit" formNoValidate disabled={submitting}>{submitting ? <span className="button-spinner" aria-hidden="true"/> : <Icon name="chart"/>} {submitting ? t("assessment.registeringRula") : t("assessment.calculateRegisterRula")}</button>}</div>{!editingExistingAssessment && <AutoSaveStatus lastSaved={lastSaved} hasError={autosaveError}/>}
      </form>
    </SectionCard>}
    {resultsView && <SectionCard title={t("assessment.rulaResults")} description={t("assessment.rulaResultsDescription")} icon="chart"><LoadState state={state} empty={t("assessment.noRula")}>{(data) => <RulaAssessmentTable data={data} locale={locale} editable={canEdit()} onOpenReport={(item) => navigate(`/rula/${item.id}/report`)} onEdit={(item) => void editAssessment(item)} onHistory={(item) => void loadHistory(item.id)} onDownload={(item, format) => void saveBlob(`/reports/rula/${item.id}.${format}?locale=${locale}`, `${assessmentLabel}-${item.id}.${format}`).catch((reason) => setError((reason as Error).message))} onDelete={(item) => void deleteAssessment(item)}/>}</LoadState></SectionCard>}
    {!resultsView && historyAssessment && <SectionCard title={t("assessment.history")} description={t("assessment.historyDescription")} icon="clock" actions={<button className="text-button" onClick={() => setHistoryAssessment("")}>{t("assessment.historyClose")}</button>}><div className="history-list">{history.length ? history.map((version) => <div className="history-row" key={version.id}><strong>{t("common.version")} {version.version.toLocaleString(numberLocale)}</strong><span>{formatDate(version.createdAt, true)}</span></div>) : <EmptyState title={t("assessment.noHistory")} icon="clock"/>}</div></SectionCard>}
  </section>;
}
