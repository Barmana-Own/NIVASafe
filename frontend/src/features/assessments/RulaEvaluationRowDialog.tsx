import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { suggestedRulaPostureScore, RULA_POSTURE_SCORE_LIMITS } from "@nivasafe/domain";
import { Icon, StyledSelect } from "../../components/UI";
import { useI18n } from "../../i18n";
import type { RulaRegisterAction } from "./RulaActionRegister";
import type { RulaPosturePart, RulaPostureRow, RulaEvaluationDetails } from "./AssessmentPages";

export function RulaEvaluationRowDialog<T extends RulaRegisterAction>({ rowNumber, part, partLabel, posture, action, onSavePosture, onUpdateAction, details, onSaveDetails, onClose }: {
  details?: RulaEvaluationDetails; onSaveDetails?: (details: RulaEvaluationDetails, part?: RulaPosturePart, row?: RulaPostureRow) => Promise<void>;
  rowNumber: number; part?: RulaPosturePart; partLabel: string; posture?: RulaPostureRow; action?: T;
  onSavePosture?: (part: RulaPosturePart, row: RulaPostureRow) => Promise<void>;
  onUpdateAction?: (action: T) => Promise<void>; onClose: () => void;
}) {
  const { locale, t } = useI18n();
  const titleId = useId();
  const dialog = useRef<HTMLElement>(null);
  const savingRef = useRef(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const actionSaved = useRef(false);
  const [draftDetails, setDraftDetails] = useState<RulaEvaluationDetails>({ priority: "LOW", status: "UNSELECTED", ...details, id: details?.id ?? "" });
  const [draftAction, setDraftAction] = useState(action);
  const [angle, setAngle] = useState(posture?.angle == null ? "" : String(posture.angle));
  const [score, setScore] = useState(String(posture?.score ?? 1));
  const [detected, setDetected] = useState(posture?.detected ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const titleKey = locale === "fa" ? "titleFa" : "titleEn";
  const descriptionKey = locale === "fa" ? "descriptionFa" : "descriptionEn";
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector<HTMLElement>("input:not([disabled]),button")?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") { if (dialog.current?.querySelector('[role="combobox"][aria-expanded="true"]')) return; event.preventDefault(); if (!savingRef.current) closeRef.current(); }
      if (event.key !== "Tab") return;
      const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),[tabindex="0"]') ?? []).filter(element => element.getClientRects().length > 0);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keyboard);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", keyboard); previousFocus?.focus(); };
  }, []);
  function changeAngle(value: string) {
    setAngle(value); setError("");
    if (part && value.trim() && Number.isFinite(Number(value)) && Math.abs(Number(value)) <= 180) setScore(String(suggestedRulaPostureScore(part, Number(value), detected, posture?.score ?? 1)));
  }
  async function save() {
    if (savingRef.current) return;
    const nextAngle = angle.trim() ? Number(angle) : null;
    const nextScore = Number(score);
    if (posture && onSavePosture && (nextAngle !== null && (!Number.isFinite(nextAngle) || Math.abs(nextAngle) > 180))) { setError(t("assessment.invalidPostureAngle")); return; }
    if (posture && onSavePosture && (!Number.isInteger(nextScore) || nextScore < 1 || nextScore > (part ? RULA_POSTURE_SCORE_LIMITS[part] : 6))) { setError(t("assessment.invalidPostureScore")); return; }
    if (draftAction && onUpdateAction && (draftAction[titleKey].trim().length < 2 || draftAction[descriptionKey].trim().length < 2)) { setError(t("assessment.rulaActionEditRequired")); return; }
    if (onSaveDetails && (!draftDetails.bodyPart?.trim() || (draftDetails.scoreShare !== undefined && (!Number.isFinite(draftDetails.scoreShare) || draftDetails.scoreShare < 0 || draftDetails.scoreShare > 100)))) { setError(locale === "fa" ? "عضو بدن و سهم امتیاز باید معتبر باشند." : "Enter a valid body part and score share."); return; }
    savingRef.current = true; setSaving(true); setError("");
    try {
      if (draftAction && action && onUpdateAction && !actionSaved.current && (draftAction[titleKey] !== action[titleKey] || draftAction[descriptionKey] !== action[descriptionKey] || draftAction.priority !== action.priority || draftAction.status !== action.status)) {
        await onUpdateAction({ ...draftAction, [titleKey]: draftAction[titleKey].trim(), [descriptionKey]: draftAction[descriptionKey].trim() });
        actionSaved.current = true;
      }
      if (onSaveDetails) await onSaveDetails(draftDetails, part, posture ? { ...posture, angle: nextAngle, score: part === "wristTwist" && !detected ? 1 : nextScore, detected, source: "USER", confirmedByUser: true } : undefined);
      else if (part && posture && onSavePosture && (nextAngle !== posture.angle || nextScore !== posture.score || detected !== posture.detected)) {
        await onSavePosture(part, { ...posture, angle: nextAngle, score: part === "wristTwist" && !detected ? 1 : nextScore, detected, source: "USER", confirmedByUser: true });
      }
      onClose();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : t("assessment.processSaveFailed");
      setError(actionSaved.current ? `${locale === "fa" ? "اقدام ذخیره شد؛ ویرایش پوسچر هنوز ذخیره نشده است." : "The action was saved; the posture change has not been saved."} ${message}` : message);
    } finally { savingRef.current = false; setSaving(false); }
  }
  return createPortal(<div className="fmea-report-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !savingRef.current) onClose(); }}>
    <section ref={dialog} className="fmea-report-editor-dialog rula-evaluation-row-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} dir={locale === "fa" ? "rtl" : "ltr"}>
      <form className="risk-item-editor-form" onSubmit={event => { event.preventDefault(); event.stopPropagation(); void save(); }}>
        <div className="risk-item-editor-head"><div><strong id={titleId}>{t("assessment.editRiskRow")}</strong><small>{t("assessment.editRiskRowDescription")}</small></div><button type="button" className="icon-button" disabled={saving} onClick={onClose} aria-label={t("assessment.cancelEdit")}>×</button></div>
        <div className="form-grid three"><label>{t("assessment.rowNumber")}<input readOnly value={rowNumber}/></label><label>{t("assessment.rulaReportGroup")}<input maxLength={16} value={draftDetails.group ?? ""} disabled={saving || !onSaveDetails} onChange={event => setDraftDetails({ ...draftDetails, group: event.target.value })}/></label><label>{t("assessment.bodyPart")}<input maxLength={160} value={draftDetails.bodyPart ?? partLabel} disabled={saving || !onSaveDetails} onChange={event => setDraftDetails({ ...draftDetails, bodyPart: event.target.value })}/></label>
          {posture && <><label>{t("assessment.detectedAngle")}<input type="number" min="-180" max="180" step="any" value={angle} disabled={saving || !(onSavePosture || onSaveDetails)} onChange={event => changeAngle(event.target.value)}/></label><label>{t("assessment.suggestedScore")}<input type="number" min="1" max={part ? RULA_POSTURE_SCORE_LIMITS[part] : 6} step="1" value={score} disabled={saving || !onSavePosture || part === "wristTwist" && !detected} onChange={event => setScore(event.target.value)} required/></label><label className="rula-detection-toggle"><input type="checkbox" checked={detected} disabled={saving || !onSavePosture} onChange={event => { const value = event.target.checked; setDetected(value); if (part && angle.trim()) setScore(String(suggestedRulaPostureScore(part, Number(angle), value, posture.score))); else if (part === "wristTwist") setScore(value ? "2" : "1"); }}/><span>{t(part === "wristTwist" ? "assessment.wristTwistPresent" : "assessment.rulaDetectedFromInfo")}</span></label></>}
          {draftAction && <><label className="rula-row-action-title">{t("actions.action")}<input maxLength={240} required disabled={saving || actionSaved.current || !onUpdateAction} value={draftAction[titleKey]} onChange={event => setDraftAction({ ...draftAction, [titleKey]: event.target.value })}/></label><label>{t("actions.priority")}<StyledSelect aria-label={t("actions.priority")} disabled={saving || actionSaved.current || !onUpdateAction} value={draftAction.priority} onChange={event => setDraftAction({ ...draftAction, priority: event.target.value as T["priority"] })}>{(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).map(priority => <option key={priority} value={priority}>{t(`status.${priority.toLowerCase()}`)}</option>)}</StyledSelect></label><label className="span-all">{t("assessment.rulaActionDetails")}<textarea rows={4} maxLength={1200} required disabled={saving || actionSaved.current || !onUpdateAction} value={draftAction[descriptionKey]} onChange={event => setDraftAction({ ...draftAction, [descriptionKey]: event.target.value })}/></label></>}
          {onSaveDetails && <><label>{t("assessment.rulaReportScoreShare")}<input type="number" min="0" max="100" step="any" value={draftDetails.scoreShare ?? ""} disabled={saving} onChange={event => setDraftDetails({ ...draftDetails, scoreShare: event.target.value === "" ? undefined : Number(event.target.value) })}/></label><label>{t("assessment.rulaActionState")}<StyledSelect aria-label={t("assessment.rulaActionState")} disabled={saving || actionSaved.current} value={draftAction?.status === "COMPLETED" ? "COMPLETED" : (draftAction?.status === "UNSELECTED" || draftAction?.status === "OPEN") ? "UNSELECTED" : draftAction ? "IN_PROGRESS" : draftDetails.status ?? "UNSELECTED"} onChange={event => { const status = event.target.value as RulaEvaluationDetails["status"]; setDraftDetails({ ...draftDetails, status }); if (draftAction) setDraftAction({ ...draftAction, status }); }}><option value="UNSELECTED">{t("report.remaining")}</option><option value="IN_PROGRESS">{t("report.inProgress")}</option><option value="COMPLETED">{t("report.completed")}</option></StyledSelect></label>{!draftAction && <><label className="rula-row-action-title">{t("actions.action")}<input maxLength={240} value={draftDetails.title ?? ""} disabled={saving} onChange={event => setDraftDetails({ ...draftDetails, title: event.target.value })}/></label><label>{t("actions.priority")}<StyledSelect aria-label={t("actions.priority")} disabled={saving} value={draftDetails.priority ?? "LOW"} onChange={event => setDraftDetails({ ...draftDetails, priority: event.target.value as RulaEvaluationDetails["priority"] })}>{(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).map(priority => <option key={priority} value={priority}>{t(`status.${priority.toLowerCase()}`)}</option>)}</StyledSelect></label><label className="span-all">{t("assessment.rulaActionDetails")}<textarea rows={3} maxLength={1200} value={draftDetails.description ?? ""} disabled={saving} onChange={event => setDraftDetails({ ...draftDetails, description: event.target.value })}/></label></>}</>}
        </div>
        {error && <div className="alert error" role="alert">{error}</div>}
        <div className="rula-row-editor-actions"><button type="submit" className="primary" disabled={saving} aria-busy={saving}><Icon name="check"/>{saving ? t("report.saving") : t("dialog.save")}</button><button type="button" className="ghost" disabled={saving} onClick={onClose}>{t("common.cancel")}</button></div>
      </form>
    </section>
  </div>, document.querySelector(".app") ?? document.body);
}
