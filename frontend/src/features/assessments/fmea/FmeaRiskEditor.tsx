import { type RiskThresholds } from "@nivasafe/domain";
import { useEffect, useRef, useState } from "react";
import { api } from "../../../api/client";
import { Icon, StatusBadge, StyledSelect } from "../../../components/UI";
import { useI18n } from "../../../i18n";
import {
  FMEA_AI_VISIBLE_SUGGESTION_COUNT,
  emptyFmeaRiskSuggestionExpansion,
  emptyFmeaRiskSuggestions,
  fmeaItemDraftFromRow,
  fmeaRiskSuggestionFields,
  fmeaRiskSuggestionInputName,
  fmeaRiskValues,
  normaliseFmeaRiskSuggestions,
  scoreCriteriaFor,
  type FmeaItem,
  type FmeaItemDraft,
  type FmeaRiskRowInput,
  type FmeaRiskScoreSuggestion,
  type FmeaRiskSuggestionContext,
  type FmeaRiskSuggestionField,
  type FmeaRiskSuggestionInputName,
  type FmeaRiskSuggestions,
  type FmeaScoreKind,
  type ProcessSuggestionResponse,
} from "../assessmentShared";

export function FmeaScoreField({ kind, value, name = kind, idPrefix = "fmea-score", disabled = false, onChange }: { kind: FmeaScoreKind; value: number; name?: string; idPrefix?: string; disabled?: boolean; onChange: (value: number) => void }) {
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

export function FmeaRiskAiAssist({ getContext, autoRequestKey, onAccept, onAutoAccept, onAcceptScore, onAutoAcceptScore }: FmeaRiskAiAssistProps) {
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

export function FmeaReviewRiskRow({ draft, rows, context, autoEnabled, riskThresholds, onChange, onScoreChange, onAdd, onAccept, onAutoAccept, onAcceptScore, onAutoAcceptScore }: { draft: FmeaRiskRowInput; rows: FmeaRiskRowInput[]; context: Omit<FmeaRiskSuggestionContext, "failureMode" | "effect" | "cause" | "recommendation">; autoEnabled: boolean; riskThresholds: RiskThresholds; onChange: <K extends keyof FmeaRiskRowInput>(key: K, value: FmeaRiskRowInput[K]) => void; onScoreChange: (kind: FmeaScoreKind, value: number) => void; onAdd: () => void; onAccept: (field: FmeaRiskSuggestionField, value: string) => void; onAutoAccept: (field: FmeaRiskSuggestionField, value: string) => boolean; onAcceptScore: (suggestion: FmeaRiskScoreSuggestion) => void; onAutoAcceptScore: (suggestion: FmeaRiskScoreSuggestion) => boolean }) {
  const { locale, t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const preview = fmeaRiskValues(draft.severity, draft.occurrence, draft.detection, riskThresholds);
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
    <div className="score-panel fmea-review-score-panel"><div className="score-panel-fields"><FmeaScoreField kind="severity" name="reviewSeverity" value={draft.severity} idPrefix="fmea-review-score" onChange={(value) => onScoreChange("severity", value)}/><span aria-hidden="true">×</span><FmeaScoreField kind="occurrence" name="reviewOccurrence" value={draft.occurrence} idPrefix="fmea-review-score" onChange={(value) => onScoreChange("occurrence", value)}/><span aria-hidden="true">×</span><FmeaScoreField kind="detection" name="reviewDetection" value={draft.detection} idPrefix="fmea-review-score" onChange={(value) => onScoreChange("detection", value)}/></div><div className="score-panel-actions"><div className="rpn-preview" aria-live="polite"><div className="rpn-preview-copy"><small>{t("assessment.calculatedRpn")}</small><strong>{preview.rpn.toLocaleString(numberLocale)}</strong></div><StatusBadge value={preview.riskLevel}/></div><button className="primary" type="button" onClick={onAdd} disabled={rows.length >= 20}><Icon name="plus"/> {t("assessment.calculateRegister")}</button></div></div>
    <FmeaRiskAiAssist autoRequestKey={autoRequestKey} getContext={() => ({ ...context, failureMode: draft.failureMode, effect: draft.effect, cause: draft.cause, preventiveControls: draft.preventiveControls, detectionControls: draft.detectionControls, recommendation: draft.recommendation })} onAccept={onAccept} onAutoAccept={onAutoAccept} onAcceptScore={onAcceptScore} onAutoAcceptScore={onAutoAcceptScore}/>
    <input type="hidden" name="reviewRiskRows" value={JSON.stringify(rows)}/>
  </div>;
}

export function FmeaItemEditor({ item, riskThresholds, saving, onCancel, onSave }: { item: FmeaItem; riskThresholds: RiskThresholds; saving: boolean; onCancel: () => void; onSave: (draft: FmeaItemDraft) => Promise<void> }) {
  const { locale, t } = useI18n();
  const [draft, setDraft] = useState<FmeaItemDraft>(() => fmeaItemDraftFromRow(item));
  const editorValues = [draft.severity, draft.occurrence, draft.detection].every((value) => Number.isInteger(value) && value >= 1 && value <= 10) ? fmeaRiskValues(draft.severity, draft.occurrence, draft.detection, riskThresholds) : { rpn: 0, riskLevel: "VERY_LOW" as const };
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
    <div className="score-panel risk-editor-score-panel"><div className="score-panel-fields"><FmeaScoreField kind="severity" value={draft.severity} idPrefix={`fmea-edit-${item.id}`} onChange={(value) => update("severity", value)}/><span aria-hidden="true">×</span><FmeaScoreField kind="occurrence" value={draft.occurrence} idPrefix={`fmea-edit-${item.id}`} onChange={(value) => update("occurrence", value)}/><span aria-hidden="true">×</span><FmeaScoreField kind="detection" value={draft.detection} idPrefix={`fmea-edit-${item.id}`} onChange={(value) => update("detection", value)}/></div><div className="score-panel-actions"><div className="rpn-preview" aria-live="polite"><div className="rpn-preview-copy"><small>{t("assessment.calculatedRpn")}</small><strong>{editorValues.rpn.toLocaleString(locale === "en" ? "en-US" : "fa-IR")}</strong></div><StatusBadge value={editorValues.riskLevel}/></div><div className="risk-item-editor-actions"><button type="button" className="ghost" onClick={onCancel}>{t("assessment.cancelEdit")}</button><button type="submit" className="primary" disabled={saving}><Icon name="check"/> {saving ? t("assessment.savingChanges") : t("assessment.saveChanges")}</button></div></div></div>
    <FmeaRiskAiAssist getContext={() => ({ jobTitle: draft.processStep || item.processStep, processStep: draft.processStep, failureMode: draft.failureMode, effect: draft.effect, cause: draft.cause, preventiveControls: draft.preventiveControls, detectionControls: draft.detectionControls, recommendation: draft.recommendation })} onAccept={(field, value) => updateText(fmeaRiskSuggestionInputName[field], value)} onAcceptScore={(suggestion) => { update("severity", suggestion.severity); update("occurrence", suggestion.occurrence); update("detection", suggestion.detection); }}/>
  </form>;
}
