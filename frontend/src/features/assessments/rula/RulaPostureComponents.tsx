import { calculateRula, suggestedRulaPostureScore } from "@nivasafe/domain";
import { useEffect, useState, type CSSProperties } from "react";
import { Icon, StyledSelect, TableContainer } from "../../../components/UI";
import { useI18n } from "../../../i18n";
import { AssessmentImageLightbox, OverlayDialogFrame, RulaPostureOverlayLayer, type RulaBodySide, type RulaPostureAnalysis, type RulaPostureImageOverlay, type RulaPosturePart, type RulaPostureRow, type RulaSinglePostureAnalysis } from "../assessmentShared";
import { formatPostureAngle, isRulaPostureResultReviewed, isRulaSingleAnalysisReviewed, postureAngle, rulaActionLevelFor, rulaGroupARows, rulaGroupBRows, rulaMainFactorKey, rulaPostureRows, rulaSourceLabelKey } from "./rulaModel";

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

export function RulaMuscleUseSelector({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {

  const { t } = useI18n();
  return <label className="rula-muscle-use-field"><span className="field-label-line"><span>{t("assessment.repetitiveMuscle")}</span><span className="required-label">{t("common.required")}</span></span><StyledSelect name="muscleUseOption" value={value ? "1" : "0"} required aria-label={t("assessment.repetitiveMuscle")} onChange={(event) => onChange(event.target.value === "1")}><option value="1">{t("assessment.repetitiveMuscleCriterionOne")} — {t("assessment.repetitiveMuscleCriterionOneScore")}</option><option value="0">{t("assessment.repetitiveMuscleCriterionZero")} — {t("assessment.repetitiveMuscleCriterionZeroScore")}</option></StyledSelect></label>;
}

export function RulaPostureAnalysisStep({ analysis, result, sideResults, bodySide, imagePreview, postureDescription, locale, initialEditPart, initialSide, onChange }: { analysis: RulaPostureAnalysis; result: ReturnType<typeof calculateRula>; sideResults?: Partial<Record<RulaBodySide, ReturnType<typeof calculateRula>>>; bodySide: "LEFT" | "RIGHT" | "BOTH"; imagePreview: string; postureDescription: string; locale: "fa" | "en"; initialEditPart?: RulaPosturePart; initialSide?: RulaBodySide; onChange: (part: RulaPosturePart, row: RulaPostureRow, side?: RulaBodySide) => void }) {
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
