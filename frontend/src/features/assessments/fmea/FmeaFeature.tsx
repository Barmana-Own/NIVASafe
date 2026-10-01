import { calculateRpn, calculateRula, DEFAULT_THRESHOLDS, riskLevel, suggestedRulaPostureScore, type RiskThresholds, type RulaInput } from "@nivasafe/domain";
import { get as getDraft, set as setDraft } from "idb-keyval";
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ChangeEvent, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type MutableRefObject, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, download, getCurrentRole, getSession, useLoad } from "../../../api/client";
import { EmptyState, Icon, LocalizedDateInput, PageHeader, SectionCard, StatusBadge, StyledSelect, TableContainer, formatDate, useDialog } from "../../../components/UI";
import { OverlayPortal, useFloatingPosition, useOverlayDialog } from "../../../components/Overlay";
import { AutoSaveForm, clearAutoSaveDraft } from "../../../forms/AutoSaveForm";
import { assessmentDraftKey, assessmentWizardStepKey, clearAssessmentWizardStep, readStoredDraft, sanitizeDraft, scopedDraftKey, snapshotForm as snapshotStoredForm, writeStoredDraft, type AutoSaveDraft } from "../../../forms/autoSave";
import { useI18n } from "../../../i18n";
import { LoadState } from "../../general/GeneralPages";
import { Project, FmeaItem, FmeaItemDraft, FmeaRiskRowInput, RiskSortField, FmeaRowMoveDirection, ProcessSuggestionCategory, ProcessSuggestions, ProcessSuggestionInputs, FmeaProcessAutofill, FmeaAutofillField, FmeaRiskSuggestionField, FmeaRiskSuggestions, FmeaRiskSuggestionContext, FmeaRiskScoreSuggestion, FmeaImageRiskRow, FmeaProcessRiskRowSuggestion, FmeaImageAnnotation, FmeaProcessImageAnalysis, ExpandedFmeaImage, FmeaRiskSuggestionInputName, FmeaScoreKind, ScoreCriterion, JobCatalogEntry, ProcessSuggestionResponse, Fmea, RulaActivityInfo, RulaPosturePart, RulaPostureSource, RulaPostureRow, RulaOverlayPoint, RulaPostureImagePoint, RulaPostureImageOverlay, RulaPostureImageSide, RulaPostureAnalysisResponse, RulaPostureImageAnalysisResponse, RulaBodySide, RulaActionBodySide, RulaSinglePostureAnalysis, RulaPostureAnalysis, RulaWizardStep, Rula, RulaActionPriority, RulaReportFactor, RulaCorrectionAction, RulaSideAssessmentResult, RulaPersistedAction, RulaReportPayload, ReportActionAiStatus, ReportActionSuggestionsResponse, VersionRow, DraftRecord, FmeaWizardStep, OverlayDialogFrame, ReportInlineDetails, AssessmentImageLightbox, FmeaImageAnnotationOverlay, JobCatalogSearch, processSuggestionCategories, fmeaRiskSuggestionFields, fmeaScoreKinds, FMEA_PROCESS_DESCRIPTION_MAX, FMEA_PROCESS_IMAGE_MAX_BYTES, FMEA_PROCESS_IMAGE_MAX_COUNT, FMEA_PROCESS_IMAGE_TYPES, FMEA_CREATE_PROJECT_OPTION, RULA_CREATE_PROJECT_OPTION, FMEA_RISK_PAGE_SIZE, FMEA_STAGE_TWO_RISK_PAGE_SIZE, FMEA_AI_VISIBLE_SUGGESTION_COUNT, FMEA_AI_SUGGESTION_TOTAL_MAX, FMEA_REPORT_VISIBLE_ITEM_COUNT, FMEA_REPORT_AI_ACTION_MAX, FMEA_PROCESS_SUGGESTION_MAX, FMEA_PROCESS_BOARD_SUGGESTION_MAX, FMEA_PROCESS_AI_SUGGESTION_TOTAL_MAX, FMEA_PROCESS_SELECTION_MAX, FMEA_ASSISTANT_STORAGE_KEY, FMEA_JOB_CATALOG_LIMIT, FMEA_JOB_VISIBLE_COUNT, RULA_TASK_DESCRIPTION_MAX, RULA_POSTURE_IMAGE_MAX_BYTES, RULA_POSTURE_IMAGE_TYPES, RULA_CORRECTIVE_SUGGESTION_MAX, fmeaRiskValues, emptyFmeaRiskRowInput, fmeaScoreCriteria, emptyProcessSuggestions, emptyProcessSuggestionInputs, normaliseProcessSuggestions, normaliseProcessBoardSuggestions, normaliseFmeaAutofill, emptyFmeaRiskSuggestions, normaliseFmeaRiskSuggestions, emptyFmeaRiskSuggestionExpansion, fmeaRiskSuggestionInputName, scoreCriteriaFor, localizedJobTitle, normalizeJobSearchText, filterJobCatalog, hasExactJobCatalogTitle, assessmentProcessName, localizedJobDepartment, generatedFmeaCode, automaticFmeaScope, readFmeaAssistantPreference, scrollAssessmentValidationToTop, readFmeaWizardStep, clearFmeaWizardStep, countShortDescriptionSentences, formTextList, draftKeyFor, canEdit, browserStorage, readLocalDraft, saveBlob, readAssessmentDraft, enqueueIndexedDraft, persistDraftNow, cancelDraftTimer, queueDraft, draftValue, draftNumber, draftBoolean, projectName, AutoSaveStatus, FmeaCreationStepper, FmeaReportStepper, RulaCreationStepper, RulaReportStepper, fmeaItemDraftFromRow, parseFmeaRiskRowDrafts, isRecord } from "../assessmentShared";
import { FmeaFinalTableExportBar, FmeaReportTableContext, FmeaRiskDistributionChart, FmeaScoreGuide, type FmeaReport, type FmeaReportItem } from "./FmeaReportComponents";

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

function FmeaReviewRiskRow({ draft, rows, context, autoEnabled, riskThresholds, onChange, onScoreChange, onAdd, onAccept, onAutoAccept, onAcceptScore, onAutoAcceptScore }: { draft: FmeaRiskRowInput; rows: FmeaRiskRowInput[]; context: Omit<FmeaRiskSuggestionContext, "failureMode" | "effect" | "cause" | "recommendation">; autoEnabled: boolean; riskThresholds: RiskThresholds; onChange: <K extends keyof FmeaRiskRowInput>(key: K, value: FmeaRiskRowInput[K]) => void; onScoreChange: (kind: FmeaScoreKind, value: number) => void; onAdd: () => void; onAccept: (field: FmeaRiskSuggestionField, value: string) => void; onAutoAccept: (field: FmeaRiskSuggestionField, value: string) => boolean; onAcceptScore: (suggestion: FmeaRiskScoreSuggestion) => void; onAutoAcceptScore: (suggestion: FmeaRiskScoreSuggestion) => boolean }) {
  const { locale, t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const preview = fmeaRiskValues(draft.severity, draft.occurrence, draft.detection, riskThresholds);
  const previewRpn = preview.rpn;
  const previewRiskLevel = preview.riskLevel;
  const autoRequestKey = autoEnabled ? [locale, context.jobTitle, context.department ?? "", context.activityDescription ?? "", context.processStep ?? "", rows.length].join("|") : "";
  return <div id="fmea-review-risk-form" className="fmea-review-risk-card fmea-review-risk-card-compact" aria-labelledby="fmea-review-risk-title">
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
    <input type="hidden" name="reviewRiskRows" value={JSON.stringify(rows)}/>
  </div>;
}

function FmeaAssessmentDetailsBar({ jobTitle, department, activityDescription, selectedItems }: { jobTitle: string; department: string; activityDescription: string; selectedItems: ProcessSuggestions }) {
  const { t } = useI18n();
  const selected = processSuggestionCategories.flatMap((category) => selectedItems[category]);
  return <section className="fmea-assessment-details-bar" aria-labelledby="fmea-assessment-details-title">
    <div className="fmea-assessment-details-head"><span className="fmea-assessment-details-icon"><Icon name="fmea" size={16}/></span><div><strong id="fmea-assessment-details-title">{t("assessment.assessmentDetails")}</strong><small>{t("assessment.assessmentDetailsDescription")}</small></div></div>
    <div className="fmea-assessment-details-grid">
      <div><small>{t("assessment.jobActivity")}</small><strong>{jobTitle || "—"}</strong></div>
      <div><small>{t("assessment.department")}</small><strong>{department || "—"}</strong></div>
      <div className="fmea-assessment-details-wide"><small>{t("assessment.activityDescription")}</small><p>{activityDescription || "—"}</p></div>
      <div className="fmea-assessment-details-wide"><small>{t("assessment.selectedItems")}</small><div className="fmea-assessment-details-chips">{selected.length ? selected.map((item, index) => <span key={`${item}-${index}`}>{item}</span>) : <span>—</span>}</div></div>
    </div>
  </section>;
}

function FmeaStageTwoDetailsCard({ items, processName, riskThresholds, loading, error, onRetry, canEdit = false, canDelete = false, canMove = false, onEditItem, onDelete, onMove }: { items: FmeaReportItem[]; processName: string; riskThresholds: RiskThresholds; loading: boolean; error: string; onRetry: () => void; canEdit?: boolean; canDelete?: boolean | ((item: FmeaReportItem) => boolean); canMove?: boolean | ((item: FmeaReportItem, index: number, visibleItems: FmeaReportItem[]) => boolean); onEditItem?: (item: FmeaReportItem, draft: FmeaItemDraft) => Promise<void>; onDelete?: (item: FmeaReportItem) => void; onMove?: (item: FmeaReportItem, direction: FmeaRowMoveDirection) => void }) {
  const { locale, t } = useI18n();
  const [viewingItem, setViewingItem] = useState<FmeaReportItem | null>(null);
  const [editingItem, setEditingItem] = useState<FmeaReportItem | null>(null);
  const [savingItem, setSavingItem] = useState(false);
  async function saveItem(draft: FmeaItemDraft) {
    if (!editingItem || !onEditItem) return;
    setSavingItem(true);
    try {
      await onEditItem(editingItem, draft);
      setEditingItem(null);
    } finally {
      setSavingItem(false);
    }
  }
  return <SectionCard className="report-details-card" title={t("report.fullDetails")} description={t("report.fullDetailsDescription")} icon="fmea">
    <details open>
      <summary>{t("report.expandDetails")}</summary>
      {loading && <div className="fmea-report-ai-seed-status" role="status" aria-live="polite"><span className="spinner"/>{t("report.aiDetailsWorking")}</div>}
      {error && <div className="fmea-report-ai-seed-status error" role="alert"><span>{error}</span><button type="button" className="text-button" onClick={onRetry}>{t("common.retry")}</button></div>}
      {items.length ? <FmeaInteractiveReportRiskTable items={items} processName={processName} riskThresholds={riskThresholds} locale={locale} pageSize={FMEA_STAGE_TWO_RISK_PAGE_SIZE} canEdit={canEdit || Boolean(onEditItem)} canDelete={canDelete} canMove={canMove} onView={setViewingItem} onEdit={setEditingItem} onDelete={onDelete ?? (() => undefined)} onMove={onMove ?? (() => undefined)}/> : !loading && !error ? <EmptyState title={t("assessment.noRiskRows")} description={t("assessment.addFirstRisk")} icon="fmea"/> : null}
      {viewingItem && !editingItem && <FmeaReportItemDetailsDialog item={viewingItem} locale={locale} canEdit={canEdit || Boolean(onEditItem)} onClose={() => setViewingItem(null)} onEdit={() => { setEditingItem(viewingItem); setViewingItem(null); }}/>}
    </details>
     {editingItem && onEditItem && <OverlayDialogFrame onClose={() => { if (!savingItem) setEditingItem(null); }} backdropClassName="dialog-backdrop fmea-report-dialog-backdrop" dialogClassName="fmea-report-editor-dialog" ariaLabel={t("assessment.editRiskRow")}><FmeaItemEditor key={editingItem.id} item={editingItem} riskThresholds={riskThresholds} saving={savingItem} onCancel={() => setEditingItem(null)} onSave={saveItem}/></OverlayDialogFrame>}
  </SectionCard>;
}

function FmeaItemEditor({ item, riskThresholds, saving, onCancel, onSave }: { item: FmeaItem; riskThresholds: RiskThresholds; saving: boolean; onCancel: () => void; onSave: (draft: FmeaItemDraft) => Promise<void> }) {
  const { locale, t } = useI18n();
  const [draft, setDraft] = useState<FmeaItemDraft>(() => fmeaItemDraftFromRow(item));
  const editorValues = [draft.severity, draft.occurrence, draft.detection].every((value) => Number.isInteger(value) && value >= 1 && value <= 10) ? fmeaRiskValues(draft.severity, draft.occurrence, draft.detection, riskThresholds) : { rpn: 0, riskLevel: "VERY_LOW" as const };
  const editorRpn = editorValues.rpn;
  const editorRiskLevel = editorValues.riskLevel;
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


function fmeaProcessImageFileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function normaliseFmeaImageAnnotations(value: unknown): FmeaImageAnnotation[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const label = typeof item.label === "string" ? item.label.trim().slice(0, 160) : "";
    const values = ["x", "y", "width", "height", "confidence"].map((key) => Number(item[key]));
    const [x, y, width, height, confidence] = values;
    if (!label || values.some((candidate) => !Number.isFinite(candidate)) || confidence < 0.5 || x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > 1 || y + height > 1) return [];
    return [{ label, x, y, width, height, confidence }];
  }).slice(0, 8);
}

function FmeaImageAnalysisPreview({ preview, analysis, alt, expandLabel, onExpand }: { preview: string; analysis?: FmeaProcessImageAnalysis; alt: string; expandLabel: string; onExpand: () => void }) {
  const annotations = normaliseFmeaImageAnnotations(analysis?.annotations);
  function activate(event: ReactMouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    onExpand();
  }
  return <span className="fmea-process-image-preview"><button type="button" className="fmea-process-image-preview-button" aria-label={expandLabel} onClick={activate}><span className="fmea-process-image-frame"><img src={preview} alt={alt}/><FmeaImageAnnotationOverlay annotations={annotations} alt={alt}/><span className="fmea-image-expand-hint">{expandLabel}</span></span></button></span>;
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
  const fmeaRiskThresholds = DEFAULT_THRESHOLDS;
  const [selected, setSelected] = useState(editingAssessmentId ?? "");
  const [draftNotice, setDraftNotice] = useState("");
  const [draftSyncAvailable, setDraftSyncAvailable] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<VersionRow[]>([]);
  const [historyAssessment, setHistoryAssessment] = useState("");
  const [scores, setScores] = useState({ severity: 1, occurrence: 1, detection: 1 });
  const [reviewRiskDraft, setReviewRiskDraft] = useState<FmeaRiskRowInput>(emptyFmeaRiskRowInput);
  const [reviewRiskRows, setReviewRiskRows] = useState<FmeaRiskRowInput[]>([]);
  const [reviewRiskFormOpen, setReviewRiskFormOpen] = useState(false);
  const [stageTwoEditedItems, setStageTwoEditedItems] = useState<Record<string, FmeaReportItem>>({});
  const [stageTwoDeletedItemIds, setStageTwoDeletedItemIds] = useState<string[]>([]);
  const [stageTwoSavedOrder, setStageTwoSavedOrder] = useState<string[]>([]);
  const [reviewDetailSeedLoading, setReviewDetailSeedLoading] = useState(false);
  const [reviewDetailSeedError, setReviewDetailSeedError] = useState("");
  const [reviewDetailSeedRetry, setReviewDetailSeedRetry] = useState(0);
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
  const [processImageAnalyses, setProcessImageAnalyses] = useState<Array<{ fileKey: string; analysis: FmeaProcessImageAnalysis }>>([]);
  const [expandedFmeaImage, setExpandedFmeaImage] = useState<ExpandedFmeaImage | null>(null);
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
  const [jobCatalogSaving, setJobCatalogSaving] = useState(false);
  const [jobCatalogSaveError, setJobCatalogSaveError] = useState(false);
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
  const reviewDetailSeedRequestKeyRef = useRef("");
  const creatingRef = useRef(false);
  const { session, orgId } = getSession();
  const itemDraftKey = scopedDraftKey(`fmea-item:${selected || "new"}`, session?.user.id, orgId);
  const selectedAssessment = state.data?.find((item) => item.id === (editingAssessmentId ?? selected));
  const editingAssessment = editingAssessmentId ? selectedAssessment : undefined;
  const selectedProject = projects.data?.find((project) => project.id === selectedProjectId);
  const stageTwoProcessName = editingExistingAssessment && selectedAssessment
    ? (selectedAssessment.jobCatalog ? localizedJobTitle(selectedAssessment.jobCatalog, locale) : selectedAssessment.title)
    : jobQuery.trim() || activityDescription.trim() || "—";
  const stageTwoDetailsItems = useMemo<FmeaReportItem[]>(() => {
    const savedItems = !editingExistingAssessment || !selectedAssessment ? [] : selectedAssessment.items
      .filter((item) => !stageTwoDeletedItemIds.includes(item.id))
      .sort((left, right) => {
        const leftIndex = stageTwoSavedOrder.indexOf(left.id);
        const rightIndex = stageTwoSavedOrder.indexOf(right.id);
        return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex) || left.rowNumber - right.rowNumber;
      })
      .map((item, index) => {
        const mergedItem = { ...item, ...(stageTwoEditedItems[item.id] ?? {}) };
        const calculated = fmeaRiskValues(mergedItem.severity, mergedItem.occurrence, mergedItem.detection, fmeaRiskThresholds);
        return {
          ...mergedItem,
          rowNumber: index + 1,
          ...calculated,
          actionPriority: calculated.riskLevel,
          correctiveActions: stageTwoEditedItems[item.id]?.correctiveActions ?? [],
        };
      });
    const draftItems = reviewRiskRows.map((row, index) => {
      const calculated = fmeaRiskValues(row.severity, row.occurrence, row.detection, fmeaRiskThresholds);
      const rpn = calculated.rpn;
      const riskLevelValue = calculated.riskLevel;
      return {
        id: "stage-two-draft-" + (index + 1),
        rowNumber: savedItems.length + index + 1,
        processStep: stageTwoProcessName,
        failureMode: row.failureMode,
        effect: row.effect,
        cause: row.cause,
        preventiveControls: row.preventiveControls.trim() || null,
        detectionControls: row.detectionControls.trim() || null,
        severity: row.severity,
        occurrence: row.occurrence,
        detection: row.detection,
        rpn,
        riskLevel: riskLevelValue,
        recommendation: row.recommendation.trim() || null,
        actionPriority: riskLevelValue,
        correctiveActions: [],
      };
    });
    return [...savedItems, ...draftItems];
  }, [editingExistingAssessment, fmeaRiskThresholds, reviewRiskRows, selectedAssessment, stageTwoDeletedItemIds, stageTwoEditedItems, stageTwoProcessName, stageTwoSavedOrder]);
  const storedFmeaScope = (editingAssessment?.scope ?? draftValue(draft, "scope")).trim();
  const assessmentScope = storedFmeaScope || automaticFmeaScope(selectedProject ? projectName(selectedProject, locale) : "", jobQuery) || jobQuery.trim() || null;
  const preview = fmeaRiskValues(scores.severity, scores.occurrence, scores.detection, fmeaRiskThresholds);
  const previewRpn = preview.rpn;
  const previewRiskLevel = preview.riskLevel;
  const selectedAssessmentItems = useMemo(() => (selectedAssessment?.items ?? []).map((item) => ({ ...item, ...fmeaRiskValues(item.severity, item.occurrence, item.detection, fmeaRiskThresholds) })), [fmeaRiskThresholds, selectedAssessment]);
  const filteredRiskRows = useMemo(() => {
    const query = riskSearch.trim().toLocaleLowerCase(locale === "fa" ? "fa-IR" : "en-US");
    const rows = selectedAssessmentItems.filter((row) => {
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
  }, [locale, riskFilter, riskSearch, riskSort, riskSortDirection, selectedAssessmentItems]);
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
    setReviewRiskFormOpen(false);
    setStageTwoEditedItems({});
    setStageTwoDeletedItemIds([]);
    setStageTwoSavedOrder(assessment.items.map((item) => item.id));
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
    if (!processImages.length) return;
    const imageKey = processImages.map((file) => `${file.name}:${file.size}:${file.lastModified}`).join("|");
    const contextKey = `${imageKey}\u0000${locale}\u0000${jobQuery.trim()}\u0000${department.trim()}\u0000${activityDescription.trim()}`;
    if (processImageAnalysisContextKey.current === contextKey) return;
    if (jobQuery.trim().length < 2) {
      setProcessImageAnalysisError(t("assessment.fmeaProcessImageNeedsJob"));
      return;
    }
    processImageAnalysisContextKey.current = contextKey;
    const analysisTimer = window.setTimeout(() => { void requestFmeaProcessImageAnalysis(processImages); }, 450);
    return () => { window.clearTimeout(analysisTimer); processImageAnalysisRequestId.current += 1; };
  }, [activityDescription, department, jobQuery, locale, processImages]);

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
    setJobCatalogSaveError(false);
    setDepartment("");
    setActivityDescription("");
    processImageAnalysisRequestId.current += 1;
    processImageGeneratedRiskKeys.current.clear();
    setProcessImages([]);
    setProcessImagePreviews([]);
    setProcessImageAnalyses([]);
    setExpandedFmeaImage(null);
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
    setReviewRiskFormOpen(false);
    setStageTwoEditedItems({});
    setStageTwoDeletedItemIds([]);
    setStageTwoSavedOrder([]);
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
    setJobCatalogSaveError(false);
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
    setJobCatalogSaveError(false);
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

  function applyCustomJobTitle(title: string) {
    cancelAssistantRequests();
    autofillContextKey.current = "";
    autofilledFields.current.clear();
    setSelectedJob(null);
    setSelectedJobId("");
    setCustomJobSelected(true);
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
    queueCurrentDraft();
  }

  async function useCustomJobTitle(titleOverride?: string) {
    const title = (titleOverride ?? jobQuery).trim();
    if (title.length < 2) {
      setError(t("assessment.jobActivityRequired"));
      return;
    }
    if (jobCatalogSaving) return;
    applyCustomJobTitle(title);
    setJobCatalogSaveError(false);
    setJobCatalogSaving(true);
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
      setJobSearchError(t("assessment.jobCatalogSaveFailed"));
      setJobCatalogSaveError(true);
      setCustomJobSelected(false);
      setSelectedJobId("");
      queueCurrentDraft();
    } finally {
      setJobCatalogSaving(false);
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
      setJobCatalogSaveError(false);
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
      setJobCatalogSaveError(false);
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
    setProcessImageAnalyses([]);
    setProcessImageAnalysisError("");
  }

  function handleFmeaProcessImageChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (!selectedFiles.length) return;
    setExpandedFmeaImage(null);
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
    setExpandedFmeaImage(null);
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
    const previousGeneratedKeys = processImageGeneratedRiskKeys.current;
    if (previousGeneratedKeys.size) setReviewRiskRows((current) => current.filter((row) => !previousGeneratedKeys.has(fmeaImageRiskRowKey(row))));
    previousGeneratedKeys.clear();
    setProcessImageAnalyses([]);
    setProcessImageAnalysis(null);
    setProcessImageAnalysisLoading(true);
    setProcessImageAnalysisError("");
    setError("");
    const imageAnalyses: Array<{ fileKey: string; analysis: FmeaProcessImageAnalysis }> = [];
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
          const analysis: FmeaProcessImageAnalysis = { ...result.data, annotations: normaliseFmeaImageAnnotations(result.data.annotations) };
          imageAnalyses.push({ fileKey: fmeaProcessImageFileKey(file), analysis });
        } catch {
          failedCount += 1;
        }
      }
      if (requestId !== processImageAnalysisRequestId.current) return;
      const analyses = imageAnalyses.map((item) => item.analysis);
      const riskRows = Array.from(new Map(analyses.flatMap((analysis) => analysis.riskRows).map((row) => [fmeaImageRiskRowKey(row), row])).values()).slice(0, FMEA_AI_SUGGESTION_TOTAL_MAX);
      const summary = analyses.map((analysis) => analysis.summary.trim()).filter(Boolean).join("\n");
      if (!analyses.length) {
        setProcessImageAnalyses([]);
        setProcessImageAnalysisError(t("assessment.fmeaProcessImageUnavailable"));
        return;
      }
      const merged: FmeaProcessImageAnalysis = {
        summary,
        riskRows,
        annotations: [],
        provider: analyses[analyses.length - 1]?.provider ?? "",
        aiStatus: analyses.some((analysis) => analysis.aiStatus === "fallback") ? "fallback" : "connected",
      };
      const generatedKeys = new Set(riskRows.map((row) => fmeaImageRiskRowKey(row)));
      const previousGeneratedKeys = processImageGeneratedRiskKeys.current;
      processImageGeneratedRiskKeys.current = generatedKeys;
      setReviewRiskRows((current) => [...current.filter((row) => !previousGeneratedKeys.has(fmeaImageRiskRowKey(row))), ...riskRows].slice(0, 20));
      window.setTimeout(queueCurrentDraft, 0);
      setProcessImageAnalyses(imageAnalyses);
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
    if (step === 1 && jobCatalogSaving) {
      setError(t("assessment.jobCatalogSaveInProgress"));
      scrollAssessmentValidationToTop();
      return false;
    }
    if (step === 1 && jobCatalogSaveError) {
      setError(t("assessment.jobCatalogSaveRequired"));
      scrollAssessmentValidationToTop();
      return false;
    }
    const required = step === 1 ? [["projectId", t("assessment.projectRequired")], ["title", t("assessment.jobActivity")], ["activityDescription", t("assessment.activityDescription")]] : [];
    const missing = required.find(([name]) => !String(values?.get(name) ?? "").trim() || (name === "title" && String(values?.get(name) ?? "").trim().length < 2) || (name === "activityDescription" && String(values?.get(name) ?? "").trim().length < 2));
    if (missing) {
      setError(t("assessment.validationEnter", { field: missing[1] }));
      scrollAssessmentValidationToTop();
      return false;
    }
    const description = String(values?.get("activityDescription") ?? "").trim();
    if (step === 1 && countShortDescriptionSentences(description) > 2) {
      setError(t("assessment.activityDescriptionSentenceLimit"));
      scrollAssessmentValidationToTop();
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

  async function persistStageTwoExistingRows(assessmentId: string) {
    const existingRows = stageTwoDetailsItems.filter((item) => !item.id.startsWith("stage-two-draft-"));
    for (const item of existingRows) {
      const draftValue = fmeaItemDraftFromRow(item);
      await api(`/fmea/${assessmentId}/items/${item.id}`, { method: "PATCH", body: JSON.stringify({ ...draftValue, preventiveControls: draftValue.preventiveControls || null, detectionControls: draftValue.detectionControls || null, recommendation: draftValue.recommendation || null }) });
    }
    return existingRows.length;
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
      scrollAssessmentValidationToTop();
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
        const existingRowCount = await persistStageTwoExistingRows(editingAssessmentId);
        for (const [index, row] of reviewRows.entries()) {
          await api(`/fmea/${editingAssessmentId}/items`, { method: "POST", body: JSON.stringify({ rowNumber: existingRowCount + index + 1, failureMode: row.failureMode, effect: row.effect, cause: row.cause, preventiveControls: row.preventiveControls || null, detectionControls: row.detectionControls || null, severity: row.severity, occurrence: row.occurrence, detection: row.detection, recommendation: row.recommendation || null }) });
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
      for (const [index, row] of reviewRows.entries()) {
        await api(`/fmea/${created.data.id}/items`, { method: "POST", body: JSON.stringify({ rowNumber: index + 1, failureMode: row.failureMode, effect: row.effect, cause: row.cause, preventiveControls: row.preventiveControls || null, detectionControls: row.detectionControls || null, severity: row.severity, occurrence: row.occurrence, detection: row.detection, recommendation: row.recommendation || null }) });
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
  function stageTwoDraftIndex(item: FmeaReportItem) {
    if (!item.id.startsWith("stage-two-draft-")) return -1;
    const index = Number(item.id.slice("stage-two-draft-".length)) - 1;
    return Number.isInteger(index) && index >= 0 ? index : -1;
  }
  function stageTwoItemFromDraft(item: FmeaReportItem, draftValue: FmeaItemDraft): FmeaReportItem {
    const severity = draftValue.severity;
    const occurrence = draftValue.occurrence;
    const detection = draftValue.detection;
    const calculated = fmeaRiskValues(severity, occurrence, detection, fmeaRiskThresholds);
    const rpn = calculated.rpn;
    const level = calculated.riskLevel;
    return {
      ...item,
      rowNumber: draftValue.rowNumber,
      processStep: draftValue.processStep.trim() || stageTwoProcessName,
      failureMode: draftValue.failureMode.trim(),
      effect: draftValue.effect.trim(),
      cause: draftValue.cause.trim(),
      preventiveControls: draftValue.preventiveControls.trim() || null,
      detectionControls: draftValue.detectionControls.trim() || null,
      severity,
      occurrence,
      detection,
      rpn,
      riskLevel: level,
      recommendation: draftValue.recommendation.trim() || null,
      actionPriority: level,
    };
  }
  async function editStageTwoItem(item: FmeaReportItem, draftValue: FmeaItemDraft) {
    const draftIndex = stageTwoDraftIndex(item);
    const normalizedRow: FmeaRiskRowInput = {
      failureMode: draftValue.failureMode.trim(),
      effect: draftValue.effect.trim(),
      cause: draftValue.cause.trim(),
      preventiveControls: draftValue.preventiveControls.trim(),
      detectionControls: draftValue.detectionControls.trim(),
      severity: draftValue.severity,
      occurrence: draftValue.occurrence,
      detection: draftValue.detection,
      recommendation: draftValue.recommendation.trim(),
    };
    if (draftIndex >= 0) {
      setReviewRiskRows((current) => current.map((row, index) => index === draftIndex ? normalizedRow : row));
      window.setTimeout(queueCurrentDraft, 0);
      return;
    }
    setStageTwoEditedItems((current) => ({ ...current, [item.id]: stageTwoItemFromDraft(item, draftValue) }));
  }
  function removeReviewRiskRow(index: number) {
    setReviewRiskRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
    window.setTimeout(queueCurrentDraft, 0);
  }
  function removeStageTwoDraftRow(item: FmeaReportItem) {
    const draftIndex = stageTwoDraftIndex(item);
    if (draftIndex >= 0) removeReviewRiskRow(draftIndex);
  }
  async function removeStageTwoRow(item: FmeaReportItem) {
    if (!(await dialog.confirm(t("assessment.deleteRowConfirm")))) return;
    const draftIndex = stageTwoDraftIndex(item);
    if (draftIndex >= 0) {
      removeStageTwoDraftRow(item);
      return;
    }
    if (!editingAssessmentId) return;
    setError("");
    try {
      await api(`/fmea/${editingAssessmentId}/items/${item.id}`, { method: "DELETE" });
      setStageTwoDeletedItemIds((current) => current.includes(item.id) ? current : [...current, item.id]);
      setStageTwoEditedItems((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      state.reload();
    } catch (reason) {
      setError((reason as Error).message);
    }
  }
  function moveStageTwoRow(item: FmeaReportItem, direction: FmeaRowMoveDirection) {
    const draftIndex = stageTwoDraftIndex(item);
    if (draftIndex >= 0) {
      const targetIndex = direction === "up" ? draftIndex - 1 : draftIndex + 1;
      if (targetIndex < 0 || targetIndex >= reviewRiskRows.length) return;
      setReviewRiskRows((current) => current.map((row, index) => index === draftIndex ? current[targetIndex] : index === targetIndex ? current[draftIndex] : row));
      window.setTimeout(queueCurrentDraft, 0);
      return;
    }
    setStageTwoSavedOrder((current) => {
      const order = current.length ? [...current] : (selectedAssessment?.items ?? []).map((savedItem) => savedItem.id);
      const currentIndex = order.indexOf(item.id);
      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= order.length) return order;
      [order[currentIndex], order[targetIndex]] = [order[targetIndex], order[currentIndex]];
      return order;
    });
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
    void saveBlob(`/reports/fmea/${selectedAssessment.id}.${format}?locale=${locale}`, filename).catch((reason) => setError((reason as Error).message));
  }

  function retryReviewDetailSeed() {
    reviewDetailSeedRequestKeyRef.current = "";
    setReviewDetailSeedError("");
    setReviewDetailSeedRetry((attempt) => attempt + 1);
  }

  useEffect(() => {
    if (wizardStep !== 2 || !canEdit()) return;
    if (editingAssessmentId && !selectedAssessment) return;
    if (!editingAssessmentId && reviewRiskRows.length > 0) return;
    if (!editingAssessmentId && jobQuery.trim().length < 2) return;
    const requestKey = editingAssessmentId
      ? "existing:" + editingAssessmentId + ":" + locale
      : "new:" + [locale, selectedProjectId, selectedJobId, jobQuery.trim(), department.trim(), activityDescription.trim(), specialConditions.trim()].join(":");
    if (reviewDetailSeedRequestKeyRef.current === requestKey) return;
    reviewDetailSeedRequestKeyRef.current = requestKey;
    let active = true;
    let completed = false;
    setReviewDetailSeedLoading(true);
    setReviewDetailSeedError("");
    const requestTimer = window.setTimeout(() => {
      void (async () => {
        try {
          if (editingAssessmentId) {
            await api<FmeaReportDetailSuggestionsResponse>("/fmea/" + encodeURIComponent(editingAssessmentId) + "/report/detail-suggestions", {
              method: "POST",
              body: JSON.stringify({ locale, autoCreate: true }),
            });
            if (!active) return;
            completed = true;
            state.reload();
          } else {
            const result = await api<ProcessSuggestionResponse>("/fmea/process-suggestions", {
              method: "POST",
              body: JSON.stringify({
                projectId: selectedProjectId || null,
                jobCatalogId: selectedJobId || null,
                jobTitle: jobQuery.trim(),
                department: department.trim() || null,
                activityDescription: activityDescription.trim() || null,
                specialConditions: specialConditions.trim() || null,
                locale,
                mode: "risk-rows",
              }),
            });
            const generatedRows = (result.data.riskRows?.slice(0, 5) ?? []).map((row) => ({
              failureMode: row.failureMode.trim(),
              effect: row.effect.trim(),
              cause: row.cause.trim(),
              preventiveControls: row.preventiveControls.trim(),
              detectionControls: row.detectionControls.trim(),
              severity: row.severity,
              occurrence: row.occurrence,
              detection: row.detection,
              recommendation: row.recommendation.trim(),
            })).filter((row) => row.failureMode && row.effect && row.cause);
            if (!generatedRows.length) throw new Error(t("assessment.suggestionLoadFailed"));
            if (!active) return;
            setReviewRiskRows((current) => current.length ? current : generatedRows);
            window.setTimeout(queueCurrentDraft, 0);
            completed = true;
          }
        } catch (reason) {
          if (!active) return;
          completed = true;
          reviewDetailSeedRequestKeyRef.current = "";
          setReviewDetailSeedError(reason instanceof Error ? reason.message : t("assessment.suggestionLoadFailed"));
        } finally {
          if (active) setReviewDetailSeedLoading(false);
        }
      })();
    }, 350);
    return () => {
      active = false;
      window.clearTimeout(requestTimer);
      if (!completed && reviewDetailSeedRequestKeyRef.current === requestKey) reviewDetailSeedRequestKeyRef.current = "";
    };
  }, [activityDescription, department, editingAssessmentId, jobQuery, locale, reviewDetailSeedRetry, reviewRiskRows.length, selectedAssessment, selectedJobId, selectedProjectId, specialConditions, wizardStep]);
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
    {error && <div className="alert error assessment-validation-alert" role="alert"><Icon name="warning"/>{error}</div>}
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
                  {processImagePreviews.map((preview, index) => { const analysis = processImages[index] ? processImageAnalyses.find((item) => item.fileKey === fmeaProcessImageFileKey(processImages[index]))?.analysis : undefined; const alt = `${t("assessment.fmeaProcessImage")} ${(index + 1).toLocaleString(numberLocale)}`; return <FmeaImageAnalysisPreview key={`${processImages[index]?.name ?? "image"}-${index}`} preview={preview} analysis={analysis} alt={alt} expandLabel={t("assessment.expandImage")} onExpand={() => setExpandedFmeaImage({ preview, analysis, alt })}/>; })}
                </div><span className="fmea-process-image-change">{t("assessment.fmeaProcessImageChange")}</span></> : <><Icon name="files" size={20}/><strong>{t("assessment.fmeaProcessImageChoose")}</strong><small>{t("assessment.fmeaProcessImageChooseHint")}</small><span className="ghost fake-button">{t("assessment.choosePhoto")}</span></>}
              </label>
              {processImages.length > 0 && <div className="fmea-process-image-meta"><span>{t("assessment.fmeaProcessImageCount", { count: processImages.length.toLocaleString(numberLocale), max: FMEA_PROCESS_IMAGE_MAX_COUNT.toLocaleString(numberLocale) })}</span><button type="button" className="text-button" onClick={() => removeFmeaProcessImage()}>{t("assessment.fmeaProcessImageRemove")}</button></div>}
              {processImageError && <small id="fmea-process-image-error" className="field-error" role="alert">{processImageError}</small>}
              {processImageAnalysisError && <small className="field-error" role="status">{processImageAnalysisError}</small>}
            </div>
            <div className="fmea-suggestion-board"><div className="fmea-suggestion-board-head"><div><strong>{t("assessment.processSuggestions")}</strong><small>{t("assessment.processSuggestionsHint")}</small></div><div className="fmea-suggestion-board-actions"><button type="button" className="primary fmea-suggestion-ai-button" onClick={() => void requestProcessAssistant()} disabled={suggestionLoading || jobQuery.trim().length < 2} aria-busy={suggestionLoading}><Icon name="sparkles" size={15}/>{suggestionLoading ? t("assessment.aiWorking") : processAiSuggestionsRequested ? t("assessment.getNewProcessAiSuggestions") : t("assessment.getProcessAiSuggestions")}</button>{aiStatus && !suggestionLoading && <span className={`ai-status ${aiStatus}`}>{t(`assessment.aiStatus.${aiStatus}`)}</span>}</div>{suggestionError && <small className="field-error" role="status">{suggestionError}</small>}</div><div className="fmea-suggestion-grid">{processSuggestionCategories.map((category) => <ProcessSuggestionPicker key={category} category={category} suggestions={suggestions[category].slice(0, FMEA_PROCESS_BOARD_SUGGESTION_MAX)} selected={selectedItems[category]} newValue={newItemInputs[category]} onToggle={(item) => toggleItem(category, item)} onNewValueChange={(value) => setNewItemInputs((current) => ({ ...current, [category]: value }))} onAdd={() => addNewItem(category)}/>)}</div></div>
            <label className="fmea-special-conditions"><span className="fmea-field-label"><span>{t("assessment.specialConditions")}</span><span className="optional-label">{t("common.optional")}</span></span><textarea name="specialConditions" value={specialConditions} maxLength={1200} rows={2} placeholder={t("assessment.specialConditionsPlaceholder")} onChange={(event) => { autofilledFields.current.delete("specialConditions"); setSpecialConditions(event.target.value); }}/></label>
          </div>
          <input type="hidden" name="activityId" value={editingAssessment?.activityId ?? ""}/><input type="hidden" name="jobCatalogId" value={selectedJobId}/><input type="hidden" name="customJobSelected" value={customJobSelected ? "true" : "false"}/><input type="hidden" name="equipment" value={JSON.stringify(selectedItems.equipment)}/><input type="hidden" name="materials" value={JSON.stringify(selectedItems.materials)}/><input type="hidden" name="existingControls" value={JSON.stringify(selectedItems.controls)}/>
        </fieldset>
        <fieldset ref={fmeaReviewStepRef} id="fmea-review-step" data-step="2" hidden={wizardStep !== 2}><legend>{t("assessment.review")}</legend><input type="hidden" data-fmea-auto-metadata="true" name="code" value={assessmentCode}/><input type="hidden" data-fmea-auto-metadata="true" name="scope" value={assessmentScope ?? ""}/><div className="fmea-process-review"><div className="wizard-review"><Icon name="check" size={25}/><div><strong>{t("assessment.reviewReadyFmea")}</strong><p>{t("assessment.reviewFmeaDescription")}</p></div></div><FmeaAssessmentDetailsBar jobTitle={jobQuery} department={department} activityDescription={activityDescription} selectedItems={selectedItems}/></div></fieldset>
        <fieldset ref={fmeaReportStepRef} id="fmea-report-step" data-step="3" hidden={wizardStep !== 3}><legend>{t("assessment.reportResults")}</legend><div className="fmea-process-review fmea-report-preview"><div className="wizard-review"><Icon name="chart" size={25}/><div><strong>{t("assessment.fmeaReportPreviewTitle")}</strong><p>{t(editingAssessmentId ? "assessment.fmeaReportPreviewSavedDescription" : "assessment.fmeaReportPreviewDraftDescription")}</p></div></div><div className="fmea-review-grid"><div><small>{t("assessment.projectRequired")}</small><strong>{selectedProject ? projectName(selectedProject, locale) : "—"}</strong></div><div><small>{t("assessment.jobActivity")}</small><strong>{jobQuery || "—"}</strong></div><div><small>{t("assessment.codeRequired")}</small><strong>{assessmentCode}</strong></div><div><small>{t("assessment.riskRowCount")}</small><strong>{reviewRiskRows.length.toLocaleString(numberLocale)}</strong></div><div className="fmea-review-wide"><small>{t("assessment.activityDescription")}</small><p>{activityDescription || "—"}</p></div></div>{editingAssessmentId && <div className="wizard-actions"><span/><button type="button" className="primary" onClick={() => navigate(`/fmea/${editingAssessmentId}/report`)}>{t("assessment.openReport")} <Icon name="arrow"/></button></div>}</div></fieldset>
        {wizardStep === 2 && <div className="fmea-stage-two-review">
          <FmeaStageTwoDetailsCard items={stageTwoDetailsItems} processName={stageTwoProcessName} riskThresholds={fmeaRiskThresholds} loading={reviewDetailSeedLoading} error={reviewDetailSeedError} onRetry={retryReviewDetailSeed} canEdit={canEdit()} canDelete={canEdit()} canMove={canEdit()} onEditItem={canEdit() ? editStageTwoItem : undefined} onDelete={removeStageTwoRow} onMove={moveStageTwoRow}/>
          <button type="button" className="fmea-add-risk-row-trigger" aria-expanded={reviewRiskFormOpen} aria-controls={reviewRiskFormOpen ? "fmea-review-risk-form" : undefined} onClick={() => setReviewRiskFormOpen((open) => !open)} disabled={reviewRiskRows.length >= 20 && !reviewRiskFormOpen}><span className="fmea-add-risk-row-trigger-mark" aria-hidden="true">{reviewRiskFormOpen ? "−" : "+"}</span><span>{reviewRiskFormOpen ? t("assessment.closeRiskRowForm") : t("assessment.addRiskRow")}</span></button>
          {reviewRiskFormOpen && <FmeaReviewRiskRow draft={reviewRiskDraft} rows={reviewRiskRows} context={{ projectName: projects.data?.find((project) => project.id === selectedProjectId)?.name ?? null, jobTitle: jobQuery, department, activityDescription, processStep: activityDescription }} autoEnabled={fmeaAssistantEnabled} riskThresholds={fmeaRiskThresholds} onChange={updateReviewRiskDraft} onScoreChange={(kind, value) => updateReviewRiskDraft(kind, value)} onAdd={addReviewRiskRow} onAccept={(field, value) => applyReviewRiskSuggestion(field, value)} onAutoAccept={(field, value) => applyReviewRiskSuggestion(field, value, true)} onAcceptScore={(suggestion) => applyReviewRiskScoreSuggestion(suggestion)} onAutoAcceptScore={(suggestion) => applyReviewRiskScoreSuggestion(suggestion, true)} />}
        </div>}
        <div className="wizard-actions"><button className="ghost" type="button" disabled={wizardStep === 1 || creating} onClick={goToPreviousWizardStep}>{t("assessment.previousStep")}</button>{wizardStep === 1 ? <button className="primary" type="button" onClick={continueToFmeaReview}>{t("common.next")} <Icon name="arrow"/></button> : wizardStep === 2 ? <button className="primary" type="submit" disabled={creating}><Icon name={creating ? "clock" : "plus"}/> {creating ? t("assessment.registeringFmea") : t(editingExistingAssessment ? "assessment.saveFmeaAndOpenReport" : "assessment.createFmeaAndOpenReport")}</button> : <button className="primary" type="button" onClick={() => editingAssessmentId ? navigate(`/fmea/${editingAssessmentId}/report`) : setWizardStep(2)}>{t(editingAssessmentId ? "assessment.openReport" : "assessment.returnToReview")} <Icon name="arrow"/></button>}</div>{!editingExistingAssessment && <AutoSaveStatus lastSaved={lastSaved} hasError={autosaveError}/>}
      </form>
    </SectionCard>}
    {registeredAssessmentsView && <div id="fmea-registered-assessments" className="fmea-registered-assessments"><SectionCard title={t("assessment.registered")} description={t("assessment.registeredDescription")} icon="fmea"><LoadState state={state} empty={t("assessment.noFmea")}>{(data) => <div className="assessment-list">{data.map((item) => { const maxRpn = Math.max(0, ...item.items.map((row) => fmeaRiskValues(row.severity, row.occurrence, row.detection, fmeaRiskThresholds).rpn)); return <article className="assessment-card" key={item.id}><button type="button" className="assessment-card-main" aria-label={`${t("assessment.openReport")}: ${item.title}`} onClick={() => navigate(`/fmea/${item.id}/report`)}><div className="assessment-card-head"><span className="project-code">{item.code}</span><StatusBadge value={item.status}/></div><h3>{item.title}</h3><p>{projectName(item.project, locale)}{item.scope ? ` · ${item.scope}` : ""}</p><div className="assessment-metrics"><span><b>{item.items.length.toLocaleString(numberLocale)}</b> {t("assessment.riskRowCount")}</span><span><b>{maxRpn.toLocaleString(numberLocale)}</b> {t("assessment.maxRpn")}</span><span><b>{item.version.toLocaleString(numberLocale)}</b> {t("common.version")}</span></div></button>{canEdit() && <div className="card-actions" aria-label={`${t("assessment.operations")}: ${item.title}`}><button type="button" aria-label={`${t("assessment.edit")}: ${item.title}`} onClick={() => void editAssessment(item)}><Icon name="activity" size={16}/> {t("assessment.edit")}</button><button type="button" aria-label={`${t("assessment.history")}: ${item.title}`} onClick={() => void loadHistory(item.id)}><Icon name="clock" size={16}/> {t("assessment.history")}</button><button type="button" aria-label={`${t("assessment.downloadExcel")}: ${item.title}`} title={t("assessment.downloadExcel")} onClick={() => void saveBlob(`/reports/fmea/${item.id}.xlsx?locale=${locale}`, `${item.code}.xlsx`).catch((reason) => setError((reason as Error).message))}><Icon name="download" size={16}/> Excel</button><button type="button" aria-label={`${t("assessment.downloadPdf")}: ${item.title}`} title={t("assessment.downloadPdf")} onClick={() => void saveBlob(`/reports/fmea/${item.id}.pdf?locale=${locale}`, `${item.code}.pdf`).catch((reason) => setError((reason as Error).message))}><Icon name="download" size={16}/> PDF</button><button type="button" aria-label={`${t("assessment.downloadWord")}: ${item.title}`} title={t("assessment.downloadWord")} onClick={() => void saveBlob(`/reports/fmea/${item.id}.docx?locale=${locale}`, `${item.code}.docx`).catch((reason) => setError((reason as Error).message))}><Icon name="download" size={16}/> Word</button><button type="button" className="danger-link" aria-label={`${t("common.delete")}: ${item.title}`} onClick={() => void deleteAssessment(item)}><Icon name="trash" size={16}/> {t("common.delete")}</button></div>}</article>; })}</div>}</LoadState></SectionCard></div>}
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
         <details className="risk-score-guide"><summary><Icon name="chart" size={16}/>{t("assessment.scoreGuide")}</summary><p>{t("assessment.scoreGuideDescription")}</p><TableContainer className="score-guide-container"><table className="score-guide-table"><thead><tr><th>{t("assessment.scoreRange")}</th><th>{t("assessment.severity")}</th><th>{t("assessment.occurrence")}</th><th>{t("assessment.detection")}</th></tr></thead><tbody>{fmeaScoreCriteria[locale].severity.map((criterion, index) => <tr key={criterion.score}><td data-label={t("assessment.scoreRange")}><strong>{criterion.score.toLocaleString(numberLocale)}</strong></td><td data-label={t("assessment.severity")}><strong>{criterion.label}</strong><small>{criterion.description}</small></td><td data-label={t("assessment.occurrence")}><strong>{fmeaScoreCriteria[locale].occurrence[index].label}</strong><small>{fmeaScoreCriteria[locale].occurrence[index].description}</small></td><td data-label={t("assessment.detection")}><strong>{fmeaScoreCriteria[locale].detection[index].label}</strong><small>{fmeaScoreCriteria[locale].detection[index].description}</small></td></tr>)}</tbody></table></TableContainer></details>
         {viewingItem && <div className="risk-detail-panel" role="region" aria-label={t("assessment.riskDetails")}><div className="risk-detail-head"><div><strong>{t("assessment.riskDetails")}</strong><small>{viewingItem.failureMode}</small></div><button type="button" className="text-button" onClick={() => setViewingItem(null)}>{t("assessment.closeDetails")}</button></div><div className="risk-detail-grid"><div><span>{t("assessment.processActivity")}</span><strong>{viewingItem.processStep}</strong></div><div><span>{t("assessment.effect")}</span><strong>{viewingItem.effect}</strong></div><div><span>{t("assessment.cause")}</span><strong>{viewingItem.cause}</strong></div><div><span>{t("assessment.recommendation")}</span><strong>{viewingItem.recommendation || "—"}</strong></div><div className="risk-detail-wide"><span>{t("assessment.existingControls")}</span><strong>{[viewingItem.preventiveControls, viewingItem.detectionControls].filter(Boolean).join(" · ") || "—"}</strong></div><div className="risk-detail-scores"><span>S <b>{viewingItem.severity}</b></span><span>O <b>{viewingItem.occurrence}</b></span><span>D <b>{viewingItem.detection}</b></span><span>RPN <b>{viewingItem.rpn.toLocaleString(numberLocale)}</b></span><StatusBadge value={viewingItem.riskLevel}/></div></div></div>}
         {editingItem && <FmeaItemEditor key={editingItem.id} item={editingItem} riskThresholds={fmeaRiskThresholds} saving={itemSaving} onCancel={() => setEditingItem(null)} onSave={saveEditedItem}/>}
         {filteredRiskRows.length ? <><TableContainer className="risk-table-wrap"><table className="assessment-report-table fmea-risk-table"><thead><tr><th>{t("assessment.row")}</th><th>{t("assessment.processActivity")}</th><th>{t("assessment.failureMode")}</th><th>{t("assessment.effect")}</th><th>{t("assessment.cause")}</th><th>{t("assessment.existingControls")}</th><th title={t("assessment.severity")}>S</th><th title={t("assessment.occurrence")}>O</th><th title={t("assessment.detection")}>D</th><th>RPN</th><th>{t("assessment.riskLevel")}</th><th>{t("assessment.recommendation")}</th><th>{t("assessment.operations")}</th></tr></thead><tbody>{paginatedRiskRows.map((row) => <tr key={row.id}><td data-label={t("assessment.row")}>{row.rowNumber.toLocaleString(numberLocale)}</td><td data-label={t("assessment.processActivity")} className="risk-text-cell">{assessmentProcessName(selectedAssessment, locale)}</td><td data-label={t("assessment.failureMode")} className="risk-text-cell"><strong>{row.failureMode}</strong></td><td data-label={t("assessment.effect")} className="risk-text-cell">{row.effect}</td><td data-label={t("assessment.cause")} className="risk-text-cell">{row.cause}</td><td data-label={t("assessment.existingControls")} className="risk-controls-cell">{row.preventiveControls && <span><b>{t("assessment.preventiveControls")}:</b> {row.preventiveControls}</span>}{row.detectionControls && <span><b>{t("assessment.detectionControls")}:</b> {row.detectionControls}</span>}{!row.preventiveControls && !row.detectionControls && <span>—</span>}</td><td data-label="S">{row.severity}</td><td data-label="O">{row.occurrence}</td><td data-label="D">{row.detection}</td><td data-label="RPN"><strong className="rpn-number">{row.rpn.toLocaleString(numberLocale)}</strong></td><td data-label={t("assessment.riskLevel")}><StatusBadge value={row.riskLevel}/></td><td data-label={t("assessment.recommendation")} className="risk-text-cell">{row.recommendation || "—"}</td><td data-label={t("assessment.operations")}><div className="risk-row-actions"><button type="button" className="icon-button" title={t("assessment.viewDetails")} aria-label={`${t("assessment.viewDetails")}: ${row.failureMode}`} onClick={() => { setViewingItem(row); setEditingItem(null); }}><Icon name="eye" size={16}/></button>{canEdit() && <><button type="button" className="icon-button" title={t("assessment.editRiskRow")} aria-label={`${t("assessment.editRiskRow")}: ${row.failureMode}`} onClick={() => { setEditingItem(row); setViewingItem(null); }}><Icon name="activity" size={16}/></button><button type="button" className="icon-button danger" title={t("assessment.deleteRow")} aria-label={`${t("assessment.deleteRow")}: ${row.failureMode}`} onClick={() => void deleteItem(row)}><Icon name="trash" size={16}/></button></>}</div></td></tr>)}</tbody></table></TableContainer>{riskPageCount > 1 && <nav className="risk-table-pagination" aria-label={t("assessment.riskPagination")}><span>{t("assessment.riskPageOf", { current: riskPage, total: riskPageCount })}</span><div><button type="button" className="ghost" onClick={() => setRiskPage((page) => Math.max(1, page - 1))} disabled={riskPage === 1}>{t("assessment.previousPage")}</button><button type="button" className="ghost" onClick={() => setRiskPage((page) => Math.min(riskPageCount, page + 1))} disabled={riskPage === riskPageCount}>{t("assessment.nextPage")}</button></div></nav>}</> : <EmptyState title={t("assessment.noRiskMatches")} icon="search"/>}
       </>}
     </SectionCard>}
    {registeredAssessmentsView && selectedAssessment && canEdit() && wizardStep === 2 && <SectionCard title={t("assessment.addRiskRow")} description={t("assessment.scoreDescription")} icon="plus"><AutoSaveForm id="fmea-risk-row-form" storageKey={itemDraftKey} className="fmea-item-form" onSubmit={addItem}><div className="form-grid three"><label><span className="field-label-line"><span>{t("assessment.failureMode")}</span><span className="required-label">{t("common.required")}</span></span><input name="failureMode" placeholder={t("assessment.failureModePlaceholder")} required/></label><label><span className="field-label-line"><span>{t("assessment.effect")}</span><span className="required-label">{t("common.required")}</span></span><input name="effect" placeholder={t("assessment.effectPlaceholder")} required/></label><label><span className="field-label-line"><span>{t("assessment.cause")}</span><span className="required-label">{t("common.required")}</span></span><input name="cause" placeholder={t("assessment.causePlaceholder")} required/></label><label><span className="field-label-line"><span>{t("assessment.preventiveControls")}</span><span className="optional-label">{t("common.optional")}</span></span><input name="preventiveControls" placeholder={t("assessment.existingControls")}/></label><label><span className="field-label-line"><span>{t("assessment.detectionControls")}</span><span className="optional-label">{t("common.optional")}</span></span><input name="detectionControls" placeholder={t("assessment.detectionPlaceholder")}/></label><label className="span-two"><span className="field-label-line"><span>{t("assessment.recommendation")}</span><span className="optional-label">{t("common.optional")}</span></span><textarea name="recommendation" rows={2} placeholder={t("assessment.recommendationPlaceholder")}/></label></div><div className="score-panel"><div className="score-panel-fields"><FmeaScoreField kind="severity" name="severity" value={scores.severity} onChange={(value) => { scoreTouchedRef.current = true; setScores((current) => ({ ...current, severity: value })); }}/><span aria-hidden="true">×</span><FmeaScoreField kind="occurrence" name="occurrence" value={scores.occurrence} onChange={(value) => { scoreTouchedRef.current = true; setScores((current) => ({ ...current, occurrence: value })); }}/><span aria-hidden="true">×</span><FmeaScoreField kind="detection" name="detection" value={scores.detection} onChange={(value) => { scoreTouchedRef.current = true; setScores((current) => ({ ...current, detection: value })); }}/></div><div className="score-panel-actions"><div className="rpn-preview" aria-live="polite"><div className="rpn-preview-copy"><small>{t("assessment.calculatedRpn")}</small><strong>{previewRpn.toLocaleString(numberLocale)}</strong></div><StatusBadge value={previewRiskLevel}/></div><button className="primary" type="submit" disabled={itemCreating}><Icon name="plus"/> {itemCreating ? t("assessment.savingChanges") : t("assessment.calculateRegister")}</button></div></div><FmeaRiskAiAssist autoRequestKey={fmeaAssistantEnabled ? [locale, selectedAssessment.id, selectedAssessment.items.length, selectedAssessment.title, selectedAssessment.department ?? "", selectedAssessment.activityDescription ?? ""].join("|") : ""} getContext={riskRowFormContext} onAccept={applyRiskSuggestionToForm} onAutoAccept={(field, value) => applyRiskSuggestionToForm(field, value, true)} onAcceptScore={(suggestion) => { scoreTouchedRef.current = true; setScores({ severity: suggestion.severity, occurrence: suggestion.occurrence, detection: suggestion.detection }); }} onAutoAcceptScore={(suggestion) => { if (scoreTouchedRef.current) return false; scoreTouchedRef.current = true; setScores({ severity: suggestion.severity, occurrence: suggestion.occurrence, detection: suggestion.detection }); return true; }}/></AutoSaveForm></SectionCard>}
    {expandedFmeaImage && <AssessmentImageLightbox title={t("assessment.fmeaProcessImage")} alt={expandedFmeaImage.alt} preview={expandedFmeaImage.preview} annotations={normaliseFmeaImageAnnotations(expandedFmeaImage.analysis?.annotations)} details={<div className="assessment-image-analysis-details"><strong>{t("assessment.imageAnalysisDetails")}</strong>{expandedFmeaImage.analysis?.summary.trim() && <p>{expandedFmeaImage.analysis.summary}</p>}{expandedFmeaImage.analysis?.riskRows.length ? <ul>{expandedFmeaImage.analysis.riskRows.map((row, index) => <li key={`${row.failureMode}-${index}`}><strong>{row.failureMode}</strong><span>{row.effect}</span></li>)}</ul> : <p className="empty">{t("assessment.imageAnalysisNoDetails")}</p>}</div>} onClose={() => setExpandedFmeaImage(null)}/>}
  </section>;
}

export function FmeaPage() { return <FmeaProcessPage/>; }

type FmeaReportDetailSuggestion = Omit<FmeaItemDraft, "rowNumber">;
type FmeaReportDetailSuggestionsResponse = { suggestions: FmeaReportDetailSuggestion[]; provider: string; aiStatus: "connected" | "fallback" | "unavailable"; minimum: number; createdCount?: number };
type FmeaReportActionSuggestion = { id: string; title: string; description: string; fmeaItemId: string; failureMode: string; priority: string; status: string; source?: "AI" | "FALLBACK" };
type FmeaReportAction = { id: string; title: string; description: string; priority: string; status: string; progress: number; assigneeName: string | null; dueDate: string | null; fmeaItemId: string | null; fmeaItem: { rowNumber: number; failureMode: string } | null };
function FmeaInteractiveReportRiskTable({ items, processName, evaluationDate, locale, riskThresholds = DEFAULT_THRESHOLDS, pageSize = FMEA_RISK_PAGE_SIZE, canEdit, canDelete = canEdit, canMove = false, showOperations = true, tableActions, onView, onEdit, onDelete, onMove }: { items: FmeaReportItem[]; processName: string; evaluationDate?: string; locale: "fa" | "en"; riskThresholds?: RiskThresholds; pageSize?: number; canEdit: boolean; canDelete?: boolean | ((item: FmeaReportItem) => boolean); canMove?: boolean | ((item: FmeaReportItem, index: number, visibleItems: FmeaReportItem[]) => boolean); showOperations?: boolean; tableActions?: ReactNode; onView: (item: FmeaReportItem) => void; onEdit: (item: FmeaReportItem) => void; onDelete: (item: FmeaReportItem) => void; onMove?: (item: FmeaReportItem, direction: FmeaRowMoveDirection) => void }) {
  const { t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const effectivePageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : FMEA_RISK_PAGE_SIZE;
  const [riskSearch, setRiskSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [riskSort, setRiskSort] = useState<RiskSortField>("rowNumber");
  const [riskSortDirection, setRiskSortDirection] = useState<"asc" | "desc">("asc");
  const [riskPage, setRiskPage] = useState(1);
  const calculatedItems = useMemo(() => items.map((item) => ({ ...item, ...fmeaRiskValues(item.severity, item.occurrence, item.detection, riskThresholds) })), [items, riskThresholds]);
  const filteredItems = useMemo(() => {
    const query = riskSearch.trim().toLocaleLowerCase(locale === "fa" ? "fa-IR" : "en-US");
    const rows = calculatedItems.filter((item) => {
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
  }, [calculatedItems, locale, processName, riskFilter, riskSearch, riskSort, riskSortDirection]);
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / effectivePageSize));
  const pageItems = useMemo(() => filteredItems.slice((riskPage - 1) * effectivePageSize, riskPage * effectivePageSize), [effectivePageSize, filteredItems, riskPage]);

  useEffect(() => setRiskPage(1), [calculatedItems, riskFilter, riskSearch, riskSort, riskSortDirection]);
  useEffect(() => setRiskPage((page) => Math.min(page, pageCount)), [pageCount]);

  return <>
    {evaluationDate && <FmeaReportTableContext processName={processName} evaluationDate={evaluationDate}/>}
    {tableActions}
    <div className="risk-table-toolbar fmea-report-table-toolbar"><label className="search-box risk-table-search"><Icon name="search" size={17}/><span className="sr-only">{t("assessment.riskSearch")}</span><input value={riskSearch} onChange={(event) => setRiskSearch(event.target.value)} placeholder={t("assessment.riskSearchPlaceholder")} aria-label={t("assessment.riskSearch")}/></label><div className="risk-table-controls"><label><span>{t("assessment.riskFilter")}</span><StyledSelect value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)}><option value="ALL">{t("assessment.allRiskLevels")}</option><option value="VERY_LOW">{t("status.veryLow")}</option><option value="LOW">{t("status.low")}</option><option value="MEDIUM">{t("status.medium")}</option><option value="HIGH">{t("status.high")}</option><option value="CRITICAL">{t("status.critical")}</option></StyledSelect></label><label><span>{t("assessment.riskSort")}</span><StyledSelect value={riskSort} onChange={(event) => setRiskSort(event.target.value as RiskSortField)}><option value="rowNumber">{t("assessment.sortRow")}</option><option value="rpn">{t("assessment.sortRpn")}</option><option value="severity">{t("assessment.sortSeverity")}</option><option value="occurrence">{t("assessment.sortOccurrence")}</option><option value="detection">{t("assessment.sortDetection")}</option></StyledSelect></label><button type="button" className="ghost risk-sort-direction" onClick={() => setRiskSortDirection((direction) => direction === "asc" ? "desc" : "asc")} aria-label={t("assessment.toggleSortDirection")}>{riskSortDirection === "asc" ? "↑" : "↓"}</button></div></div>
    <FmeaScoreGuide locale={locale}/>
    {pageItems.length ? <TableContainer className="report-data-table-wrap fmea-report-table-wrap"><table className="assessment-report-table fmea-report-data-table"><thead><tr><th>{t("assessment.row")}</th><th>{t("assessment.failureMode")}</th><th>{t("assessment.effect")}</th><th>{t("assessment.cause")}</th><th>{t("assessment.existingControls")}</th><th title={t("assessment.severity")}>S</th><th title={t("assessment.occurrence")}>O</th><th title={t("assessment.detection")}>D</th><th>RPN</th><th>{t("assessment.riskLevel")}</th><th>{t("assessment.recommendation")}</th>{showOperations && <th>{t("assessment.operations")}</th>}</tr></thead><tbody>{pageItems.map((item) => {
      const controls = [item.preventiveControls, item.detectionControls].filter((value): value is string => Boolean(value?.trim()));
      const linkedActions = item.correctiveActions;
      const deletable = typeof canDelete === "function" ? canDelete(item) : canDelete;
      const itemIndex = filteredItems.findIndex((candidate) => candidate.id === item.id);
      const movable = Boolean(onMove) && (typeof canMove === "function" ? canMove(item, itemIndex, filteredItems) : canMove);
      return <tr key={item.id}><td data-label={t("assessment.row")} className="report-table-number">{item.rowNumber.toLocaleString(numberLocale)}</td><td data-label={t("assessment.failureMode")} className="report-table-text"><strong>{item.failureMode}</strong></td><td data-label={t("assessment.effect")} className="report-table-text">{item.effect}</td><td data-label={t("assessment.cause")} className="report-table-text">{item.cause}</td><td data-label={t("assessment.existingControls")} className="report-table-text"><div className="report-table-stack">{controls.length ? controls.map((control, index) => <span key={`${item.id}-control-${index}`}>{control}</span>) : <span>—</span>}</div></td><td data-label="S" className="report-table-number">{item.severity.toLocaleString(numberLocale)}</td><td data-label="O" className="report-table-number">{item.occurrence.toLocaleString(numberLocale)}</td><td data-label="D" className="report-table-number">{item.detection.toLocaleString(numberLocale)}</td><td data-label="RPN" className="report-table-number"><strong className="rpn-number">{item.rpn.toLocaleString(numberLocale)}</strong></td><td data-label={t("assessment.riskLevel")} className="report-table-number"><StatusBadge value={item.riskLevel}/></td><td data-label={t("assessment.recommendation")} className="report-table-text"><div className="report-table-stack">{item.recommendation?.trim() && <span><strong>{item.recommendation.trim()}</strong><small><StatusBadge value="SUGGESTED"/></small></span>}{linkedActions.map((action) => <span key={action.id}><strong>{action.title}</strong><small><StatusBadge value={action.status}/> <StatusBadge value={action.priority}/></small></span>)}{!item.recommendation?.trim() && !linkedActions.length && <span>—</span>}</div></td>{showOperations && <td data-label={t("assessment.operations")} className="report-table-number"><div className="report-table-actions" aria-label={t("assessment.operations")}><button type="button" className="icon-button" title={t("assessment.viewDetails")} aria-label={`${t("assessment.viewDetails")}: ${item.failureMode}`} onClick={() => onView(item)}><Icon name="eye" size={15}/></button>{canEdit && <button type="button" className="icon-button" title={t("assessment.editRiskRow")} aria-label={`${t("assessment.editRiskRow")}: ${item.failureMode}`} onClick={() => onEdit(item)}><Icon name="edit" size={15}/></button>}{deletable && <button type="button" className="icon-button danger" title={t("assessment.deleteRow")} aria-label={`${t("assessment.deleteRow")}: ${item.failureMode}`} onClick={() => onDelete(item)}><Icon name="trash" size={15}/></button>}{movable && <><button type="button" className="icon-button fmea-row-move-button" title={t("assessment.moveRowUp")} aria-label={`${t("assessment.moveRowUp")}: ${item.failureMode}`} onClick={() => onMove?.(item, "up")} disabled={itemIndex <= 0}>↑</button><button type="button" className="icon-button fmea-row-move-button" title={t("assessment.moveRowDown")} aria-label={`${t("assessment.moveRowDown")}: ${item.failureMode}`} onClick={() => onMove?.(item, "down")} disabled={itemIndex < 0 || itemIndex >= filteredItems.length - 1}>↓</button></>}</div></td>}</tr>;
    })}</tbody></table></TableContainer> : <EmptyState title={t("assessment.noRiskMatches")} icon="search"/>}
    {pageCount > 1 && <nav className="risk-table-pagination" aria-label={t("assessment.riskPagination")}><span>{t("assessment.riskPageOf", { current: riskPage, total: pageCount })}</span><div><button type="button" className="ghost" onClick={() => setRiskPage((page) => Math.max(1, page - 1))} disabled={riskPage === 1}>{t("assessment.previousPage")}</button><button type="button" className="ghost" onClick={() => setRiskPage((page) => Math.min(pageCount, page + 1))} disabled={riskPage === pageCount}>{t("assessment.nextPage")}</button></div></nav>}
  </>;
}

function FmeaReportItemDetailsDialog({ item, locale, canEdit, onClose, onEdit }: { item: FmeaReportItem; locale: "fa" | "en"; canEdit: boolean; onClose: () => void; onEdit: () => void }) {
  const { t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const controls = [item.preventiveControls, item.detectionControls].filter((value): value is string => Boolean(value?.trim()));
  return <OverlayDialogFrame onClose={onClose} backdropClassName="dialog-backdrop fmea-report-dialog-backdrop" dialogClassName="fmea-report-dialog" ariaLabelledBy="fmea-report-detail-title">
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
  </OverlayDialogFrame>;
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
  const report = state.data;
  const fmeaRiskThresholds = DEFAULT_THRESHOLDS;
  const { locale, t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionSaving, setActionSaving] = useState(false);
  const [updatingActionId, setUpdatingActionId] = useState("");
  const [showActionForm, setShowActionForm] = useState(false);
  const [showActionRegister, setShowActionRegister] = useState(false);
  const [actionFormScrollRequest, setActionFormScrollRequest] = useState(0);
  const [viewingReportItem, setViewingReportItem] = useState<FmeaReportItem | null>(null);
  const [editingReportItem, setEditingReportItem] = useState<FmeaReportItem | null>(null);
  const [reportItemSaving, setReportItemSaving] = useState(false);
  const [aiDetailLoading, setAiDetailLoading] = useState(false);
  const [aiDetailError, setAiDetailError] = useState("");
  const aiDetailRequestKeyRef = useRef("");
  const [aiActionLoading, setAiActionLoading] = useState(false);
  const [aiActionError, setAiActionError] = useState("");
  const [aiActionStatus, setAiActionStatus] = useState<ReportActionAiStatus | null>(null);
  const [aiSuggestedActions, setAiSuggestedActions] = useState<FmeaReportActionSuggestion[] | null>(null);
  const [showAllTopFailureModes, setShowAllTopFailureModes] = useState(false);
  const [showAllSuggestedActions, setShowAllSuggestedActions] = useState(false);
  const actionFormRef = useRef<HTMLDivElement>(null);
  const [actionDraft, setActionDraft] = useState<{ title: string; description: string; fmeaItemId: string; priority: string }>({ title: "", description: "", fmeaItemId: "", priority: "MEDIUM" });
  const dialog = useDialog();
  const canEditActions = ["SUPER_ADMIN", "ORG_ADMIN", "HSE_MANAGER", "HSE_SPECIALIST", "HSE_OFFICER", "ASSISTANT", "ASSESSOR"].includes(getCurrentRole());
  const processName = report ? (locale === "en" ? report.assessment.processName.en : report.assessment.processName.fa) : "";
  const companyName = report ? (locale === "en" ? report.assessment.companyName.en : report.assessment.companyName.fa) : "";
  const completedActionCount = report?.actions.filter((action) => action.status === "COMPLETED").length ?? 0;
  const inProgressActionCount = report?.actions.filter((action) => ["ASSIGNED", "IN_PROGRESS", "WAITING_FOR_REVIEW"].includes(action.status)).length ?? 0;
  const remainingActionCount = report ? Math.max(0, report.actions.length - completedActionCount - inProgressActionCount) : 0;
  const actionCompletionPercent = report?.actions.length ? Math.round(report.actions.reduce((sum, action) => sum + Math.min(100, Math.max(0, Number(action.progress) || 0)), 0) / report.actions.length) : 0;
  const topFailureModeItems = report?.topFailureModes ?? [];
  const visibleTopFailureModes = showAllTopFailureModes ? topFailureModeItems : topFailureModeItems.slice(0, FMEA_REPORT_VISIBLE_ITEM_COUNT);
  const hiddenTopFailureModeCount = Math.max(0, topFailureModeItems.length - FMEA_REPORT_VISIBLE_ITEM_COUNT);
  const suggestedActionItems = report ? (aiSuggestedActions ?? report.suggestedActions).filter((suggestion) => !report.actions.some((action) => action.fmeaItemId === suggestion.fmeaItemId && action.title.trim().toLocaleLowerCase() === suggestion.title.trim().toLocaleLowerCase())).slice(0, FMEA_REPORT_AI_ACTION_MAX) : [];
  const visibleSuggestedActions = showAllSuggestedActions ? suggestedActionItems : suggestedActionItems.slice(0, FMEA_REPORT_VISIBLE_ITEM_COUNT);
  const hiddenSuggestedActionCount = Math.max(0, suggestedActionItems.length - FMEA_REPORT_VISIBLE_ITEM_COUNT);

  useEffect(() => {
    setAiSuggestedActions(null);
    setAiActionError("");
    setAiActionStatus(null);
    setShowAllTopFailureModes(false);
    setShowAllSuggestedActions(false);
    setShowActionForm(false);
    setShowActionRegister(false);
  }, [id, locale]);

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

  function downloadFmeaFinalTable(format: "xlsx" | "pdf" | "docx") {
    if (!id || !report) return;
    void saveBlob(`/reports/fmea/${id}.${format}?view=final-table&locale=${locale}`, `${report.assessment.code}-final-table.${format}`).catch((reason) => setError((reason as Error).message));
  }

  function downloadFmeaFullReport(format: "pdf" | "docx") {
    if (!id || !report) return;
    void saveBlob(`/reports/fmea/${id}.${format}?locale=${locale}`, `${report.assessment.code}-report.${format}`).catch((reason) => setError((reason as Error).message));
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

  function toggleManualActionForm() {
    if (showActionForm) {
      setShowActionForm(false);
      return;
    }
    openManualActionForm();
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
    const autoCreate = report.items.length === 0 && !report.assessment.fmeaDetailSeeded && canEditActions;
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

  async function requestAiActionSuggestions() {
    if (!id || !report || aiActionLoading) return;
    const currentSuggestions = (aiSuggestedActions ?? report.suggestedActions).filter((suggestion) => !report.actions.some((action) => action.fmeaItemId === suggestion.fmeaItemId && action.title.trim().toLocaleLowerCase() === suggestion.title.trim().toLocaleLowerCase())).slice(0, FMEA_REPORT_AI_ACTION_MAX);
    if (currentSuggestions.length >= FMEA_REPORT_AI_ACTION_MAX) {
      setShowAllSuggestedActions(true);
      return;
    }
    setAiActionLoading(true); setAiActionError(""); setMessage("");
    try {
      const result = await api<ReportActionSuggestionsResponse<FmeaReportActionSuggestion>>("/fmea/" + id + "/report/action-suggestions", { method: "POST", body: JSON.stringify({ locale, excludeTitles: currentSuggestions.map((suggestion) => suggestion.title) }) });
      const currentKeys = new Set(currentSuggestions.map((suggestion) => `${suggestion.fmeaItemId}\u0000${suggestion.title.trim().toLocaleLowerCase()}`));
      const nextSuggestion = result.data.suggestions.find((suggestion) => !currentKeys.has(`${suggestion.fmeaItemId}\u0000${suggestion.title.trim().toLocaleLowerCase()}`) && !report.actions.some((action) => action.fmeaItemId === suggestion.fmeaItemId && action.title.trim().toLocaleLowerCase() === suggestion.title.trim().toLocaleLowerCase()));
      setAiSuggestedActions(nextSuggestion ? [...currentSuggestions, nextSuggestion].slice(0, FMEA_REPORT_AI_ACTION_MAX) : currentSuggestions);
      setAiActionStatus(result.data.aiStatus);
      if (nextSuggestion) setMessage(t("report.aiActionSuggestionAdded"));
      else setAiActionError(t("report.noNewAiActionSuggestion"));
    } catch (reason) {
      setAiActionStatus("unavailable");
      setAiActionError((reason as Error).message);
    } finally { setAiActionLoading(false); }
  }

  useEffect(() => {
    if (!report || !id || report.assessment.fmeaDetailSeeded || report.items.length > 0 || !canEditActions) return;
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
     <PageHeader eyebrow={t("report.eyebrow")} title={t("report.title")} description={`${report.assessment.title} · ${report.assessment.code}`} actions={<div className="page-actions-inline"><button type="button" className="ghost" onClick={() => downloadFmeaFullReport("pdf")}><Icon name="download"/> {t("assessment.downloadPdf")}</button><button type="button" className="ghost" onClick={() => downloadFmeaFullReport("docx")}><Icon name="download"/> {t("assessment.downloadWord")}</button><button type="button" className="ghost" onClick={goToPreviousStep}><Icon name="arrow" className="back-arrow"/> {canEditActions ? t("assessment.previousStep") : t("report.back")}</button>{canEditActions && report.assessment.status !== "APPROVED" && <button type="button" className="primary" onClick={() => void approveReport()} disabled={saving}><Icon name="check"/> {t("assessment.approve")}</button>}{canEditActions && <button type="button" className="ghost danger-button" onClick={() => void deleteReport()} disabled={saving}><Icon name="trash"/> {t("common.delete")}</button>}<button type="button" className="ghost" onClick={() => void saveReport()} disabled={saving}><Icon name="check"/> {saving ? t("report.saving") : t("report.save")}</button></div>}/>
     <FmeaReportStepper onStepClick={canEditActions && id ? (step) => navigate(`/fmea?edit=${encodeURIComponent(id)}&step=${step}`) : undefined}/>
     {error && <div className="alert error" role="alert"><Icon name="warning"/>{error}</div>}{message && <div className="alert success" role="status"><Icon name="check"/>{message}</div>}
    <div className="fmea-report-status-row"><span className="fmea-report-completion-badge"><Icon name="check" size={14}/>{report.assessment.status === "APPROVED" ? t("report.assessmentCompleted") : <StatusBadge value={report.assessment.status}/>}</span><span className="fmea-report-code">{report.assessment.code}</span></div>
    <SectionCard className="fmea-report-header" title={t("report.header")} icon="fmea">
      <div className="report-meta-grid"><div><small>{t("report.process")}</small><strong>{processName}</strong></div><div><small>{t("report.company")}</small><strong>{companyName}</strong></div><div><small>{t("report.date")}</small><strong>{formatDate(report.assessment.approvedAt ?? report.assessment.updatedAt)}</strong></div><div><small>{t("report.method")}</small><strong>{report.assessment.method}</strong></div><div><small>{t("report.team")}</small><strong>{report.assessment.evaluationTeam.length.toLocaleString(numberLocale)} {t("report.teamMembers")}</strong></div></div>
      <div className="report-team-list">{report.assessment.evaluationTeam.map((member) => <span className="report-team-member" key={member.id}><span className="report-team-avatar">{member.displayName.slice(0, 1)}</span><span><b>{member.displayName}</b><small>{member.email}</small></span></span>)}</div>
    </SectionCard>
    <div className="fmea-report-dashboard-grid">
      <SectionCard className="fmea-report-dashboard-panel fmea-report-summary-panel" title={t("report.summary")} icon="warning"><div className="report-summary-grid"><div className="report-stat"><span>{t("report.totalFailureModes")}</span><strong>{report.summary.totalFailureModes.toLocaleString(numberLocale)}</strong><Icon name="fmea"/></div><div className="report-stat danger"><span>{t("report.highPriorityRisks")}</span><strong>{report.summary.highPriorityRisks.toLocaleString(numberLocale)}</strong><Icon name="warning"/></div><div className="report-stat warning"><span>{t("report.correctiveActionsNeeded")}</span><strong>{report.summary.correctiveActionsNeeded.toLocaleString(numberLocale)}</strong><Icon name="actions"/></div><div className="report-stat critical"><span>{t("report.immediateActions")}</span><strong>{report.summary.immediateActions.toLocaleString(numberLocale)}</strong><Icon name="shield"/></div></div></SectionCard>
      <SectionCard className="fmea-report-dashboard-panel fmea-report-distribution-panel" title={t("report.riskDistribution")} description={t("report.riskDistributionDescription")} icon="chart"><FmeaRiskDistributionChart distribution={report.summary.distribution} totalFailureModes={report.summary.totalFailureModes} locale={locale}/></SectionCard>
      <SectionCard className="fmea-report-dashboard-panel fmea-report-progress-panel" title={t("report.actionCompletion")} icon="actions"><div className="fmea-action-progress-layout"><div className="fmea-action-progress-ring" style={{ background: `conic-gradient(#138a61 ${actionCompletionPercent}%, #e6eef2 0)` }} role="img" aria-label={`${actionCompletionPercent}%`}><div><strong>{actionCompletionPercent.toLocaleString(numberLocale)}%</strong><small>{t("report.completed")}</small></div></div><div className="fmea-action-progress-list"><div><span className="completed-dot"/>{t("report.completed")}<strong>{completedActionCount.toLocaleString(numberLocale)}</strong></div><div><span className="in-progress-dot"/>{t("report.inProgress")}<strong>{inProgressActionCount.toLocaleString(numberLocale)}</strong></div><div><span className="remaining-dot"/>{t("report.remaining")}<strong>{remainingActionCount.toLocaleString(numberLocale)}</strong></div></div></div></SectionCard>
    </div>
     <div className="report-two-column fmea-report-primary-grid"><SectionCard title={t("report.topFailureModes")} description={t("report.topFailureModesDescription")} icon="warning"><div id="fmea-top-failure-modes" className="report-top-list">{topFailureModeItems.length ? visibleTopFailureModes.map((item) => <article className="report-top-item" key={item.id}><div className="report-top-index">{item.rowNumber.toLocaleString(numberLocale)}</div><div className="report-top-copy"><strong>{item.failureMode}</strong><small>{item.effect}</small></div><div className="report-score-trio"><span><b>S</b>{item.severity}</span><span><b>O</b>{item.occurrence}</span><span><b>D</b>{item.detection}</span><span><b>AP</b><StatusBadge value={item.actionPriority}/></span><span><b>RPN</b>{item.rpn.toLocaleString(numberLocale)}</span></div></article>) : <EmptyState title={t("report.noFailureModes")} icon="fmea"/>}</div>{hiddenTopFailureModeCount > 0 && <button type="button" className="report-list-toggle" aria-expanded={showAllTopFailureModes} aria-controls="fmea-top-failure-modes" onClick={() => setShowAllTopFailureModes((expanded) => !expanded)}><span aria-hidden="true">{showAllTopFailureModes ? "−" : "+"}</span>{showAllTopFailureModes ? t("report.hideMoreFailureModes") : t("report.showMoreFailureModes", { count: hiddenTopFailureModeCount })}</button>}</SectionCard><SectionCard title={t("report.proposedActions")} description={t("report.proposedActionsDescription")} icon="actions" actions={canEditActions ? <><button type="button" className="ghost" onClick={() => void requestAiActionSuggestions()} disabled={aiActionLoading || suggestedActionItems.length >= FMEA_REPORT_AI_ACTION_MAX}><Icon name="sparkles"/> {aiActionLoading ? t("report.aiActionsWorking") : t("report.getAiActionSuggestion")}</button><button type="button" className="primary" onClick={openManualActionForm}><Icon name="plus"/> {t("report.addManualAction")}</button></> : undefined}><div className="report-ai-action-status" role="status" aria-live="polite">{aiActionLoading && <span className="ai-status loading"><span className="spinner"/>{t("report.aiActionsWorking")}</span>}{!aiActionLoading && aiActionStatus && <span className={"ai-status " + aiActionStatus}>{t("assessment.aiStatus." + aiActionStatus)}</span>}{aiActionError && <div className="report-ai-action-error" role="alert"><span>{aiActionError}</span><button type="button" className="text-button" onClick={() => void requestAiActionSuggestions()}>{t("common.retry")}</button></div>}</div>{suggestedActionItems.length ? <div id="fmea-suggested-actions" className="report-action-list">{visibleSuggestedActions.map((item) => <article className="report-action-row" key={`${item.id}-${item.fmeaItemId}-${item.title}`}><div className="report-action-icon"><Icon name="sparkles" size={17}/></div><div><strong>{item.title}</strong><small>{t("report.relatedRisk")}: {item.failureMode}</small><small>{t("actions.assignee")}: {t("common.none")}</small></div><StatusBadge value={item.priority}/><StatusBadge value="SUGGESTED"/>{canEditActions && <button className="text-button" type="button" onClick={() => chooseSuggestion(item)}>{t("report.useSuggestion")}</button>}</article>)}</div> : <EmptyState title={t("report.noSuggestedActions")} icon="actions"/>}{hiddenSuggestedActionCount > 0 && <button type="button" className="report-list-toggle" aria-expanded={showAllSuggestedActions} aria-controls="fmea-suggested-actions" onClick={() => setShowAllSuggestedActions((expanded) => !expanded)}><span aria-hidden="true">{showAllSuggestedActions ? "−" : "+"}</span>{showAllSuggestedActions ? t("report.hideMoreActions") : t("report.showMoreActions", { count: hiddenSuggestedActionCount })}</button>}</SectionCard></div>
      {canEditActions && <div ref={actionFormRef} className="report-action-form-anchor">
        <SectionCard className={`report-action-form-card ${showActionForm ? "is-expanded" : "is-collapsed"}`} title={t("report.manualActionTitle")} description={t("report.manualActionDescription")} icon="plus" actions={<button type="button" className="ghost report-collapse-toggle" aria-expanded={showActionForm} aria-controls="fmea-manual-action-form" onClick={toggleManualActionForm}><span aria-hidden="true">{showActionForm ? "−" : "+"}</span>{showActionForm ? t("report.collapseManualAction") : t("report.expandManualAction")}</button>}>
          <div id="fmea-manual-action-form">{showActionForm && <form className="report-action-form" onSubmit={createAction}><label>{t("actions.titleLabel")}<input name="title" value={actionDraft.title} onChange={(event) => setActionDraft((draft) => ({ ...draft, title: event.target.value }))} placeholder={t("actions.titlePlaceholder")} required/></label><label>{t("actions.priority")}<StyledSelect name="priority" value={actionDraft.priority} onChange={(event) => setActionDraft((draft) => ({ ...draft, priority: event.target.value }))}><option value="CRITICAL">{t("status.critical")}</option><option value="HIGH">{t("status.high")}</option><option value="MEDIUM">{t("status.medium")}</option><option value="LOW">{t("status.low")}</option></StyledSelect></label><label>{t("report.relatedRisk")}<StyledSelect name="fmeaItemId" value={actionDraft.fmeaItemId} onChange={(event) => setActionDraft((draft) => ({ ...draft, fmeaItemId: event.target.value }))}><option value="">{t("report.noRelatedRisk")}</option>{report.items.map((item) => <option key={item.id} value={item.id}>#{item.rowNumber} · {item.failureMode}</option>)}</StyledSelect></label><label>{t("actions.statusColumn")}<StyledSelect name="status" defaultValue="OPEN"><option value="OPEN">{t("report.actionStatusNew")}</option><option value="ASSIGNED">{t("report.actionStatusWaiting")}</option><option value="IN_PROGRESS">{t("status.inProgress")}</option><option value="WAITING_FOR_REVIEW">{t("status.waitingForReview")}</option></StyledSelect></label><label>{t("actions.assignee")}<StyledSelect name="assigneeName" defaultValue=""><option value="">{t("common.none")}</option>{report.assessment.evaluationTeam.map((member) => <option key={member.id} value={member.displayName}>{member.displayName}</option>)}</StyledSelect></label><label>{t("actions.dueDate")}<LocalizedDateInput name="dueDate" ariaLabel={t("actions.dueDate")}/></label><label className="report-action-description">{t("actions.detailsLabel")}<textarea name="description" rows={3} value={actionDraft.description} onChange={(event) => setActionDraft((draft) => ({ ...draft, description: event.target.value }))} placeholder={t("actions.detailsPlaceholder")} required/></label><div className="report-action-form-actions"><button className="ghost" type="button" onClick={() => setShowActionForm(false)} disabled={actionSaving}>{t("common.cancel")}</button><button className="primary" type="submit" disabled={actionSaving}><Icon name="check"/> {actionSaving ? t("report.registeringAction") : t("report.registerAction")}</button></div></form>}</div>
        </SectionCard>
      </div>}
     <SectionCard className={`report-action-register-card ${showActionRegister ? "is-expanded" : "is-collapsed"}`} title={t("report.actionRegister")} description={t("report.actionRegisterDescription")} icon="actions" actions={<button type="button" className="ghost report-collapse-toggle" aria-expanded={showActionRegister} aria-controls="fmea-action-register-content" onClick={() => setShowActionRegister((expanded) => !expanded)}><span aria-hidden="true">{showActionRegister ? "−" : "+"}</span>{showActionRegister ? t("report.collapseActionRegister") : t("report.expandActionRegister")}</button>}>
       <div id="fmea-action-register-content">{showActionRegister && <>{report.actions.length ? <TableContainer className="report-action-table-container"><table className="report-action-table"><thead><tr><th>{t("actions.action")}</th><th>{t("report.relatedRisk")}</th><th>{t("actions.priorityColumn")}</th><th>{t("actions.assigneeColumn")}</th><th>{t("actions.statusColumn")}</th><th>{t("actions.progress")}</th></tr></thead><tbody>{report.actions.map((item) => <tr key={item.id}><td data-label={t("actions.action")}><strong>{item.title}</strong><small>{item.description}</small></td><td data-label={t("report.relatedRisk")}>{item.fmeaItem ? `#${item.fmeaItem.rowNumber} · ${item.fmeaItem.failureMode}` : t("common.none")}</td><td data-label={t("actions.priorityColumn")}><StatusBadge value={item.priority}/></td><td data-label={t("actions.assigneeColumn")}>{item.assigneeName ?? t("common.none")}</td><td data-label={t("actions.statusColumn")}>{canEditActions ? <StyledSelect className="compact-select" value={item.status} disabled={updatingActionId === item.id} onChange={(event) => void updateActionStatus(item.id, event.target.value)}><option value="OPEN">{t("report.actionStatusNew")}</option><option value="ASSIGNED">{t("report.actionStatusWaiting")}</option><option value="IN_PROGRESS">{t("status.inProgress")}</option><option value="WAITING_FOR_REVIEW">{t("status.waitingForReview")}</option><option value="COMPLETED">{t("status.completed")}</option><option value="REJECTED">{t("status.rejected")}</option><option value="OVERDUE">{t("status.overdue")}</option><option value="CANCELLED">{t("status.cancelled")}</option></StyledSelect> : <StatusBadge value={item.status}/>}</td><td data-label={t("actions.progress")}><div className="table-progress"><div><span style={{ width: `${item.progress}%` }}/></div><b>{item.progress.toLocaleString(numberLocale)}%</b></div></td></tr>)}</tbody></table></TableContainer> : <EmptyState title={t("report.noActions")} icon="actions"/>}</>}</div>
     </SectionCard>
     <SectionCard className="report-details-card" title={t("report.fullDetails")} description={t("report.fullDetailsDescription")} icon="fmea"><details open><summary>{t("report.expandDetails")}</summary>{aiDetailLoading && <div className="fmea-report-ai-seed-status" role="status" aria-live="polite"><span className="spinner"/>{t("report.aiDetailsWorking")}</div>}{aiDetailError && <div className="fmea-report-ai-seed-status error" role="alert"><span>{aiDetailError}</span><button type="button" className="text-button" onClick={() => { aiDetailRequestKeyRef.current = ""; void requestAiDetailSuggestions(); }}>{t("common.retry")}</button></div>}<FmeaInteractiveReportRiskTable items={report.items} processName={processName} riskThresholds={fmeaRiskThresholds} evaluationDate={report.assessment.approvedAt ?? report.assessment.updatedAt} locale={locale} canEdit={canEditActions} tableActions={<FmeaFinalTableExportBar onDownload={downloadFmeaFinalTable}/>} onView={setViewingReportItem} onEdit={setEditingReportItem} onDelete={(item) => void deleteReportItem(item)}/></details></SectionCard>
     <div className="report-bottom-actions"><button type="button" className="ghost" onClick={() => navigate("/fmea")}><Icon name="arrow" className="back-arrow"/> {t("report.back")}</button><div><button type="button" className="ghost" onClick={() => void saveReport()} disabled={saving}><Icon name="check"/> {saving ? t("report.saving") : t("report.save")}</button>{canEditActions && report.assessment.status !== "APPROVED" && <button type="button" className="primary" onClick={() => void approveReport()} disabled={saving}><Icon name="check"/> {t("assessment.approve")}</button>}</div></div>
    {viewingReportItem && !editingReportItem && <FmeaReportItemDetailsDialog item={viewingReportItem} locale={locale} canEdit={canEditActions} onClose={() => setViewingReportItem(null)} onEdit={() => { setEditingReportItem(viewingReportItem); setViewingReportItem(null); }}/>}
     {editingReportItem && <OverlayDialogFrame onClose={() => { if (!reportItemSaving) setEditingReportItem(null); }} backdropClassName="dialog-backdrop fmea-report-dialog-backdrop" dialogClassName="fmea-report-editor-dialog" ariaLabel={t("assessment.editRiskRow")}><FmeaItemEditor key={editingReportItem.id} item={editingReportItem} riskThresholds={fmeaRiskThresholds} saving={reportItemSaving} onCancel={() => setEditingReportItem(null)} onSave={saveReportItem}/></OverlayDialogFrame>}
  </section>;
}
