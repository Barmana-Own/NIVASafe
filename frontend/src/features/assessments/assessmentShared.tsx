import { calculateRpn, calculateRula, DEFAULT_THRESHOLDS, riskLevel, suggestedRulaPostureScore, type RiskThresholds, type RulaInput } from "@nivasafe/domain";
import { get as getDraft, set as setDraft } from "idb-keyval";
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ChangeEvent, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type MutableRefObject, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, download, getCurrentRole, getSession, useLoad } from "../../api/client";
import { EmptyState, Icon, LocalizedDateInput, PageHeader, SectionCard, StatusBadge, StyledSelect, TableContainer, formatDate, useDialog } from "../../components/UI";
import { OverlayPortal, useFloatingPosition, useOverlayDialog } from "../../components/Overlay";
import { AutoSaveForm, clearAutoSaveDraft } from "../../forms/AutoSaveForm";
import { assessmentDraftKey, assessmentWizardStepKey, clearAssessmentWizardStep, readStoredDraft, sanitizeDraft, scopedDraftKey, snapshotForm as snapshotStoredForm, writeStoredDraft, type AutoSaveDraft } from "../../forms/autoSave";
import { useI18n } from "../../i18n";
import { LoadState } from "../general/GeneralPages";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function OverlayDialogFrame({ children, onClose, backdropClassName = "dialog-backdrop", dialogClassName = "app-dialog", ariaLabel, ariaLabelledBy, ariaDescribedBy }: { children: ReactNode; onClose: () => void; backdropClassName?: string; dialogClassName?: string; ariaLabel?: string; ariaLabelledBy?: string; ariaDescribedBy?: string }) {
  const dialogRef = useRef<HTMLElement>(null);
  useOverlayDialog(true, onClose, dialogRef);
  return <OverlayPortal><div className={backdropClassName} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialogRef} className={dialogClassName} role="dialog" aria-modal="true" aria-label={ariaLabel} aria-labelledby={ariaLabelledBy} aria-describedby={ariaDescribedBy} tabIndex={-1}>
      {children}
    </section>
  </div></OverlayPortal>;
}

function ReportInlineDetails({ label, title, children }: { label: string; title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverId = `report-inline-details-${useId().replace(/:/g, "")}`;
  const position = useFloatingPosition(triggerRef, open, { minWidth: 260, maxHeight: 240 });
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);
  const popoverStyle = {
    top: position?.top ?? -10000,
    left: position?.left ?? -10000,
    width: position?.width ?? 260,
    maxHeight: position?.maxHeight ?? 240,
    direction: position?.direction,
    visibility: position ? "visible" : "hidden",
  } as const;
  return <span className={`report-inline-details${open ? " is-open" : ""}`}>
    <button ref={triggerRef} type="button" className="icon-button report-inline-trigger" title={title} aria-label={label} aria-haspopup="dialog" aria-expanded={open} aria-controls={popoverId} onClick={() => setOpen((current) => !current)}><Icon name="eye" size={15}/></button>
    {open && <OverlayPortal><div ref={popoverRef} id={popoverId} className="report-inline-details-popover" role="dialog" aria-label={title} style={popoverStyle}>{children}</div></OverlayPortal>}
  </span>;
}

const RULA_OVERLAY_MIN_CONFIDENCE = 0.6;
const rulaOverlaySegments: Array<[RulaOverlayPoint, RulaOverlayPoint]> = [["head", "neck"], ["neck", "shoulder"], ["shoulder", "elbow"], ["elbow", "wrist"], ["shoulder", "hip"], ["hip", "knee"], ["knee", "ankle"]];

function RulaPostureOverlayLayer({ overlay }: { overlay?: RulaPostureImageOverlay }) {
  if (!overlay) return null;
  const visiblePoint = (key: RulaOverlayPoint) => {
    const point = overlay.points[key];
    return point && Number.isFinite(point.x) && Number.isFinite(point.y) && typeof point.confidence === "number" && Number.isFinite(point.confidence) && point.confidence >= RULA_OVERLAY_MIN_CONFIDENCE ? point : null;
  };
  const points = Object.fromEntries((Object.keys(overlay.points) as RulaOverlayPoint[]).flatMap((key) => {
    const point = visiblePoint(key);
    return point ? [[key, point]] : [];
  })) as Partial<Record<RulaOverlayPoint, RulaPostureImagePoint>>;
  const segments = rulaOverlaySegments.flatMap(([start, end]) => {
    const startPoint = points[start];
    const endPoint = points[end];
    return startPoint && endPoint ? [{ start, end, startPoint, endPoint }] : [];
  });
  return <svg className="rula-skeleton-overlay" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">{segments.map(({ start, end, startPoint, endPoint }) => <line key={`${start}-${end}`} x1={startPoint.x} y1={startPoint.y} x2={endPoint.x} y2={endPoint.y}/>)}{(Object.keys(points) as RulaOverlayPoint[]).map((key) => { const point = points[key]!; return <circle key={key} cx={point.x} cy={point.y} r=".012"><title>{key}</title></circle>; })}</svg>;
}

function FmeaImageAnnotationOverlay({ annotations, alt }: { annotations: FmeaImageAnnotation[]; alt: string }) {
  if (!annotations.length) return null;
  return <><svg className="fmea-image-annotation-layer" viewBox="0 0 1 1" preserveAspectRatio="none" role="img" aria-label={alt}><title>{alt}</title>{annotations.map((annotation, index) => <rect className="fmea-image-annotation" key={`${annotation.label}-${index}`} x={annotation.x} y={annotation.y} width={annotation.width} height={annotation.height} role="img" aria-label={annotation.label}><title>{annotation.label}</title></rect>)}</svg><span className="fmea-image-annotation-labels" aria-hidden="true">{annotations.map((annotation, index) => <span className="fmea-image-annotation-label" key={`${annotation.label}-label-${index}`} style={{ left: `${annotation.x * 100}%`, top: `${Math.max(2, annotation.y * 100)}%` }}>{annotation.label}</span>)}</span></>;
}

function AssessmentImageLightbox({ title, alt, preview, annotations = [], overlay, details, onClose }: { title: string; alt: string; preview: string; annotations?: FmeaImageAnnotation[]; overlay?: RulaPostureImageOverlay; details?: ReactNode; onClose: () => void }) {
  const { t } = useI18n();
  return <OverlayDialogFrame onClose={onClose} backdropClassName="dialog-backdrop assessment-image-lightbox-backdrop" dialogClassName="assessment-image-lightbox" ariaLabel={title}>
      <div className="assessment-image-lightbox-head"><div><strong>{title}</strong><small>{t("assessment.expandImage")}</small></div><button type="button" className="icon-button" onClick={onClose} aria-label={t("assessment.closeImage")}><span aria-hidden="true">×</span></button></div>
      <div className="assessment-image-lightbox-body"><div className="assessment-image-lightbox-canvas"><img src={preview} alt={alt}/><FmeaImageAnnotationOverlay annotations={annotations} alt={alt}/><RulaPostureOverlayLayer overlay={overlay}/></div>{details && <div className="assessment-image-lightbox-details">{details}</div>}</div>
  </OverlayDialogFrame>;
}

type Project = { id: string; name: string; nameFa?: string; nameEn?: string };
type FmeaItem = { id: string; rowNumber: number; processStep: string; failureMode: string; effect: string; cause: string; preventiveControls?: string | null; detectionControls?: string | null; severity: number; occurrence: number; detection: number; rpn: number; riskLevel: string; recommendation?: string | null };
type FmeaItemDraft = { rowNumber: number; processStep: string; failureMode: string; effect: string; cause: string; preventiveControls: string; detectionControls: string; severity: number; occurrence: number; detection: number; recommendation: string };
type FmeaRiskRowInput = Omit<FmeaItemDraft, "rowNumber" | "processStep">;
type RiskSortField = "rowNumber" | "rpn" | "severity" | "occurrence" | "detection";
type FmeaRowMoveDirection = "up" | "down";
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
type FmeaProcessRiskRowSuggestion = FmeaImageRiskRow & { processStep: string };
type FmeaImageAnnotation = { label: string; x: number; y: number; width: number; height: number; confidence: number };
type FmeaProcessImageAnalysis = { summary: string; riskRows: FmeaImageRiskRow[]; annotations: FmeaImageAnnotation[]; provider: string; aiStatus: "connected" | "fallback" };
type ExpandedFmeaImage = { preview: string; analysis?: FmeaProcessImageAnalysis; alt: string };
type FmeaRiskSuggestionInputName = "failureMode" | "effect" | "cause" | "preventiveControls" | "detectionControls" | "recommendation";
type FmeaScoreKind = "severity" | "occurrence" | "detection";
type ScoreCriterion = { score: number; label: string; description: string };
type JobCatalogEntry = { id: string; organizationId: string | null; titleFa: string; titleEn: string; source?: string; sourceLocale?: string | null; keywords: string[]; departmentFa: string | null; departmentEn: string | null; descriptionFa: string | null; descriptionEn: string | null; equipment: string[]; materials: string[]; controls: string[] };
type ProcessSuggestionResponse = { job: JobCatalogEntry | null; databaseSuggestions: ProcessSuggestions; aiSuggestions: ProcessSuggestions; provider: string; aiStatus: "connected" | "fallback" | "unavailable"; descriptionSuggestion?: string | null; riskSuggestions?: FmeaRiskSuggestions; riskRows?: FmeaProcessRiskRowSuggestion[]; scoreSuggestion?: FmeaRiskScoreSuggestion | null; jobTitleSuggestions?: string[]; aiJobCatalogSuggestions?: JobCatalogEntry[]; autofill?: FmeaProcessAutofill | null };
type Fmea = { id: string; title: string; code: string; scope?: string; activityId?: string | null; department?: string; activityDescription?: string; equipment?: string[]; materials?: string[]; existingControls?: string[]; specialConditions?: string; status: string; version: number; project: Project; items: FmeaItem[]; jobCatalog?: JobCatalogEntry | null };
type RulaActivityInfo = { jobTitle: string; taskDescription: string; postureDescription?: string | null; durationPerOccurrence?: number; durationUnit?: "SECOND" | "MINUTE" | "HOUR"; repetitionsPerShift?: number; postureHoldDuration?: number; postureHoldUnit?: "SECOND" | "MINUTE" | "HOUR"; loadWeight?: number | null; loadUnit?: "KG" | "LB"; postureImageAttachmentId?: string | null };
type RulaPosturePart = "upperArm" | "lowerArm" | "wrist" | "wristTwist" | "neck" | "trunk" | "legs";
type RulaPostureSource = "AI" | "USER" | "DEFAULT";
type RulaPostureRow = { angle: number | null; score: number; detected: boolean; source: RulaPostureSource; confirmedByUser: boolean; confidence?: number | null };
type RulaOverlayPoint = "head" | "neck" | "shoulder" | "elbow" | "wrist" | "hip" | "knee" | "ankle";
type RulaPostureImagePoint = { x: number; y: number; confidence?: number | null };
type RulaPostureImageOverlay = { points: Partial<Record<RulaOverlayPoint, RulaPostureImagePoint>> };
type RulaPostureImageSide = Record<RulaPosturePart, { angle: number | null; score: number; detected: boolean; confidence: number | null }> & { overlay: RulaPostureImageOverlay };
type RulaPostureAnalysisResponse = { sides: Partial<Record<"LEFT" | "RIGHT", RulaPostureImageSide>>; notes: string; provider: string; aiStatus: "connected" | "fallback" };
type RulaPostureImageAnalysisResponse = RulaPostureAnalysisResponse;
type RulaBodySide = "LEFT" | "RIGHT";
type RulaActionBodySide = "LEFT" | "RIGHT" | "BOTH";
type RulaSinglePostureAnalysis = Record<RulaPosturePart, RulaPostureRow>;
type RulaPostureAnalysis = RulaSinglePostureAnalysis & { sideAnalyses?: Partial<Record<RulaBodySide, RulaSinglePostureAnalysis>>; imageOverlay?: RulaPostureImageOverlay; sideImageOverlays?: Partial<Record<RulaBodySide, RulaPostureImageOverlay>> };
type RulaWizardStep = 1 | 2 | 3;
type Rula = { id: string; title: string; subjectCode?: string; bodySide?: "RIGHT" | "LEFT" | "BOTH"; inputs?: { force?: number; muscleUse?: boolean | number | string } | null; score: number; actionLevel: number; explanation: string; status: string; version: number; createdAt?: string; updatedAt?: string; project: Project; postureReviewComplete?: boolean; activityInfo?: RulaActivityInfo | null; postureAnalysis?: RulaPostureAnalysis | null; postureImage?: { id: string; originalName: string; mimeType: string; size: number; createdAt: string } | null };
type RulaActionPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type RulaReportFactor = { key: "neck" | "upperArm" | "trunk"; angle: number | null; detected?: boolean; score: number; impactPercent: number; impactLevel: "LOW" | "MEDIUM" | "HIGH"; source: RulaPostureSource; reviewed?: boolean };
type RulaCorrectionAction = { id: string; titleFa: string; titleEn: string; descriptionFa: string; descriptionEn: string; priority: RulaActionPriority; scoreReduction: number; affectedParts: RulaPosturePart[]; bodySide?: RulaActionBodySide; source?: "AI" | "FALLBACK"; persistedId?: string; suggestionId?: string };
type RulaSideAssessmentResult = Pick<ReturnType<typeof calculateRula>, "score" | "actionLevel" | "explanation" | "trace" | "groupA" | "groupB" | "adjustment">;
type RulaPersistedAction = { id: string; title: string; description: string; priority: RulaActionPriority; status: string; progress: number; assigneeName?: string | null; dueDate?: string | null; beforeRisk?: number | null; afterRisk?: number | null; bodySide?: RulaActionBodySide | null; rulaImpact?: { suggestionId?: string; scoreReduction: number; affectedParts: RulaPosturePart[] } | null };
type RulaReportPayload = { assessment: { id: string; title: string; project: Project; score: number; actionLevel: number; explanation: string; status: string; updatedAt: string; bodySide: RulaActionBodySide; postureReviewComplete?: boolean; activityInfo?: RulaActivityInfo | null; postureAnalysis: RulaPostureAnalysis }; factors: RulaReportFactor[]; sideResults?: Partial<Record<RulaBodySide, RulaSideAssessmentResult>>; sideFactors?: Partial<Record<RulaBodySide, RulaReportFactor[]>>; suggestedActions: RulaCorrectionAction[]; actions: RulaPersistedAction[]; predictedScore: number; predictedSideScores?: Partial<Record<RulaBodySide, number>> };
type ReportActionAiStatus = "connected" | "fallback" | "unavailable";
type ReportActionSuggestionsResponse<T> = { suggestions: T[]; provider: string; model?: string | null; aiStatus: ReportActionAiStatus; minimum: number };
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
const FMEA_STAGE_TWO_RISK_PAGE_SIZE = 6;
const FMEA_AI_VISIBLE_SUGGESTION_COUNT = 3;
const FMEA_AI_SUGGESTION_TOTAL_MAX = 15;
const FMEA_REPORT_VISIBLE_ITEM_COUNT = 5;
const FMEA_REPORT_AI_ACTION_MAX = 8;
const FMEA_PROCESS_SUGGESTION_MAX = 10;
const FMEA_PROCESS_BOARD_SUGGESTION_MAX = 5;
const FMEA_PROCESS_AI_SUGGESTION_TOTAL_MAX = 15;
const FMEA_PROCESS_SELECTION_MAX = 5;
const FMEA_ASSISTANT_STORAGE_KEY = "nivasafe-fmea-assistant-enabled-v2";
const FMEA_JOB_CATALOG_LIMIT = 200;
const FMEA_JOB_VISIBLE_COUNT = 12;
const RULA_TASK_DESCRIPTION_MAX = 500;
const RULA_POSTURE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const RULA_POSTURE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const RULA_CORRECTIVE_SUGGESTION_MAX = 6;

function fmeaRiskValues(severity: number, occurrence: number, detection: number, thresholds: RiskThresholds = DEFAULT_THRESHOLDS) {
  const rpn = calculateRpn(severity, occurrence, detection);
  return { rpn, riskLevel: riskLevel(rpn, thresholds) };
}

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
  const limited = Object.fromEntries(processSuggestionCategories.map((category) => [category, normalized[category].slice(0, FMEA_PROCESS_BOARD_SUGGESTION_MAX)])) as ProcessSuggestions;
  const total = processSuggestionCategories.reduce((count, category) => count + limited[category].length, 0);
  if (total <= FMEA_PROCESS_AI_SUGGESTION_TOTAL_MAX) return limited;
  let remaining = FMEA_PROCESS_AI_SUGGESTION_TOTAL_MAX;
  return Object.fromEntries(processSuggestionCategories.map((category) => {
    const items = limited[category].slice(0, remaining);
    remaining -= items.length;
    return [category, items];
  })) as ProcessSuggestions;
}

function normaliseFmeaAutofill(value: FmeaProcessAutofill | null | undefined): FmeaProcessAutofill | null {
  if (!value || typeof value !== "object") return null;
  const text = (candidate: unknown, maxLength: number) => typeof candidate === "string" ? candidate.trim().slice(0, maxLength) : "";
  return {
    department: text(value.department, 160),
    activityDescription: text(value.activityDescription, FMEA_PROCESS_DESCRIPTION_MAX),
    specialConditions: text(value.specialConditions, FMEA_PROCESS_DESCRIPTION_MAX),
    suggestions: normaliseProcessBoardSuggestions(value.suggestions),
  };
}

function emptyFmeaRiskSuggestions(): FmeaRiskSuggestions {
  return { failureModes: [], effects: [], causes: [], preventiveControls: [], detectionControls: [], recommendations: [] };
}

function normaliseFmeaRiskSuggestions(value: Partial<FmeaRiskSuggestions> | null | undefined): FmeaRiskSuggestions {
  const candidates = Object.fromEntries(fmeaRiskSuggestionFields.map((field) => [field, Array.isArray(value?.[field]) ? value[field]!.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()).filter((item, index, list) => list.indexOf(item) === index).slice(0, 6) : []])) as FmeaRiskSuggestions;
  const normalized = emptyFmeaRiskSuggestions();
  let remaining = FMEA_AI_SUGGESTION_TOTAL_MAX;
  while (remaining > 0) {
    let added = false;
    for (const field of fmeaRiskSuggestionFields) {
      const next = candidates[field].shift();
      if (!next) continue;
      normalized[field].push(next);
      remaining -= 1;
      added = true;
      if (remaining === 0) break;
    }
    if (!added) break;
  }
  return normalized;
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

function JobCatalogSearch({ value, selectedJob, customSelected, jobs, loading, error, open, onOpenChange, onChange, onSelect, onUseCustom, onClear, inputName = "title", inputId = "fmea-job-search", listId = "fmea-job-catalog-options", label, placeholder, hint, className = "" }: { value: string; selectedJob: JobCatalogEntry | null; customSelected: boolean; jobs: JobCatalogEntry[]; loading: boolean; error: string; open: boolean; onOpenChange: (open: boolean) => void; onChange: (value: string) => void; onSelect: (job: JobCatalogEntry) => void; onUseCustom: (title: string) => void; onClear: () => void; inputName?: string; inputId?: string; listId?: string; label?: string; placeholder?: string; hint?: string; className?: string }) {
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
    if (event.key === "Enter" && open && customOption && highlighted === catalogOptions.length) { event.preventDefault(); onUseCustom(value.trim()); }
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
        {customOption && <button id={`${listId}-custom`} type="button" role="option" aria-selected={customSelected} className={`fmea-job-option custom ${highlighted === catalogOptions.length ? "highlighted" : ""}`} onMouseDown={(event) => event.preventDefault()} onClick={() => onUseCustom(value.trim())} disabled={loading}><span><strong>{t("assessment.addNewJob")}</strong><small>{t("assessment.addNewJobHint")}</small></span><Icon name="plus" size={16}/></button>}
        {!loading && !catalogOptions.length && <div className="fmea-job-option empty">{value.trim().length >= 2 ? t("assessment.noMatchingJobs") : t("assessment.typeToSearchJobs")}</div>}
      </div>}
    </div>
    {selectedJob && <small className="fmea-selected-job"><Icon name="check" size={14}/>{t("assessment.selectedFromCatalog")}: {localizedJobTitle(selectedJob, locale)}</small>}
    {customSelected && !selectedJob && <small className="fmea-selected-job custom"><Icon name="check" size={14}/>{t("assessment.customJobSelected")}: {value.trim()}</small>}
    {error && <small className="field-error" role="status">{error}</small>}
    <small className="field-hint">{fieldHint}</small>
  </div>;
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

function scrollAssessmentValidationToTop() {
  window.requestAnimationFrame(() => {
    const alert = document.querySelector<HTMLElement>(".assessment-validation-alert");
    if (alert) {
      alert.scrollIntoView({ block: "start", behavior: "smooth" });
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

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
    return indexedDraft && typeof indexedDraft === "object" && !Array.isArray(indexedDraft) ? sanitizeDraft(indexedDraft) : null;
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

function RulaCreationStepper({ currentStep, onStepClick }: { currentStep: RulaWizardStep; onStepClick?: (step: RulaWizardStep) => void }) {
  const { t } = useI18n();
  const labels = [t("assessment.processInformation"), t("assessment.rulaReviewScoring"), t("assessment.rulaAssessmentReporting")];
  return <div className="wizard-stepper" aria-label={t("assessment.stepsLabel", { type: "RULA" })}>{labels.map((label, index) => { const step = (index + 1) as RulaWizardStep; const onClick = onStepClick && currentStep !== step ? () => onStepClick(step) : undefined; const clickable = Boolean(onClick); return <button type="button" aria-current={currentStep === step ? "step" : undefined} className={currentStep === step ? "current" : currentStep > step ? "done" : ""} onClick={onClick} disabled={!clickable} key={label}><b>{currentStep > step ? "✓" : step}</b>{label}</button>; })}</div>;
}

function RulaReportStepper({ onStepClick }: { onStepClick?: (step: RulaWizardStep) => void }) {
  return <RulaCreationStepper currentStep={3} onStepClick={onStepClick}/>;
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

export type { Project, FmeaItem, FmeaItemDraft, FmeaRiskRowInput, RiskSortField, FmeaRowMoveDirection, ProcessSuggestionCategory, ProcessSuggestions, ProcessSuggestionInputs, FmeaProcessAutofill, FmeaAutofillField, FmeaRiskSuggestionField, FmeaRiskSuggestions, FmeaRiskSuggestionContext, FmeaRiskScoreSuggestion, FmeaImageRiskRow, FmeaProcessRiskRowSuggestion, FmeaImageAnnotation, FmeaProcessImageAnalysis, ExpandedFmeaImage, FmeaRiskSuggestionInputName, FmeaScoreKind, ScoreCriterion, JobCatalogEntry, ProcessSuggestionResponse, Fmea, RulaActivityInfo, RulaPosturePart, RulaPostureSource, RulaPostureRow, RulaOverlayPoint, RulaPostureImagePoint, RulaPostureImageOverlay, RulaPostureImageSide, RulaPostureAnalysisResponse, RulaPostureImageAnalysisResponse, RulaBodySide, RulaActionBodySide, RulaSinglePostureAnalysis, RulaPostureAnalysis, RulaWizardStep, Rula, RulaActionPriority, RulaReportFactor, RulaCorrectionAction, RulaSideAssessmentResult, RulaPersistedAction, RulaReportPayload, ReportActionAiStatus, ReportActionSuggestionsResponse, VersionRow, DraftRecord, FmeaWizardStep };
export { OverlayDialogFrame, ReportInlineDetails, AssessmentImageLightbox, FmeaImageAnnotationOverlay, RulaPostureOverlayLayer, JobCatalogSearch, processSuggestionCategories, fmeaRiskSuggestionFields, fmeaScoreKinds, FMEA_PROCESS_DESCRIPTION_MAX, FMEA_PROCESS_IMAGE_MAX_BYTES, FMEA_PROCESS_IMAGE_MAX_COUNT, FMEA_PROCESS_IMAGE_TYPES, FMEA_CREATE_PROJECT_OPTION, RULA_CREATE_PROJECT_OPTION, FMEA_RISK_PAGE_SIZE, FMEA_STAGE_TWO_RISK_PAGE_SIZE, FMEA_AI_VISIBLE_SUGGESTION_COUNT, FMEA_AI_SUGGESTION_TOTAL_MAX, FMEA_REPORT_VISIBLE_ITEM_COUNT, FMEA_REPORT_AI_ACTION_MAX, FMEA_PROCESS_SUGGESTION_MAX, FMEA_PROCESS_BOARD_SUGGESTION_MAX, FMEA_PROCESS_AI_SUGGESTION_TOTAL_MAX, FMEA_PROCESS_SELECTION_MAX, FMEA_ASSISTANT_STORAGE_KEY, FMEA_JOB_CATALOG_LIMIT, FMEA_JOB_VISIBLE_COUNT, RULA_TASK_DESCRIPTION_MAX, RULA_POSTURE_IMAGE_MAX_BYTES, RULA_POSTURE_IMAGE_TYPES, RULA_CORRECTIVE_SUGGESTION_MAX, fmeaRiskValues, emptyFmeaRiskRowInput, fmeaScoreCriteria, emptyProcessSuggestions, emptyProcessSuggestionInputs, normaliseProcessSuggestions, normaliseProcessBoardSuggestions, normaliseFmeaAutofill, emptyFmeaRiskSuggestions, normaliseFmeaRiskSuggestions, emptyFmeaRiskSuggestionExpansion, fmeaRiskSuggestionInputName, scoreCriteriaFor, localizedJobTitle, normalizeJobSearchText, filterJobCatalog, hasExactJobCatalogTitle, assessmentProcessName, localizedJobDepartment, generatedFmeaCode, automaticFmeaScope, readFmeaAssistantPreference, scrollAssessmentValidationToTop, readFmeaWizardStep, clearFmeaWizardStep, countShortDescriptionSentences, formTextList, draftKeyFor, canEdit, browserStorage, readLocalDraft, saveBlob, readAssessmentDraft, enqueueIndexedDraft, persistDraftNow, cancelDraftTimer, queueDraft, draftValue, draftNumber, draftBoolean, projectName, AutoSaveStatus, FmeaCreationStepper, FmeaReportStepper, RulaCreationStepper, RulaReportStepper, fmeaItemDraftFromRow, parseFmeaRiskRowDrafts, isRecord };
