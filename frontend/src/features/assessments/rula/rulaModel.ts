import { suggestedRulaPostureScore, type RulaInput } from "@nivasafe/domain";
import {
  isRecord,
  type DraftRecord,
  type RulaActivityInfo,
  type RulaActionBodySide,
  type RulaBodySide,
  type RulaCorrectionAction,
  type RulaOverlayPoint,
  type RulaPostureAnalysis,
  type RulaPostureImageOverlay,
  type RulaPostureImagePoint,
  type RulaPosturePart,
  type RulaPostureRow,
  type RulaPostureSource,
  type RulaReportFactor,
  type RulaSinglePostureAnalysis,
} from "../assessmentShared";

export const rulaPostureRows: Array<{ key: RulaPosturePart; labelKey: string; group: "A" | "B" }> = [
  { key: "upperArm", labelKey: "assessment.upperArm", group: "A" },
  { key: "lowerArm", labelKey: "assessment.lowerArm", group: "A" },
  { key: "wrist", labelKey: "assessment.wrist", group: "A" },
  { key: "wristTwist", labelKey: "assessment.wristTwist", group: "A" },
  { key: "neck", labelKey: "assessment.neck", group: "B" },
  { key: "trunk", labelKey: "assessment.trunk", group: "B" },
  { key: "legs", labelKey: "assessment.legs", group: "B" },
];

export const rulaGroupARows = rulaPostureRows.filter((row) => row.group === "A");
export const rulaGroupBRows = rulaPostureRows.filter((row) => row.group === "B");

function postureScore(value: unknown, fallback: number) {
  const score = Number(value);
  return Number.isInteger(score) && score >= 1 && score <= 6 ? score : fallback;
}

function hasPostureScore(value: unknown) {
  const score = Number(value);
  return Number.isInteger(score) && score >= 1 && score <= 6;
}

export function postureAngle(value: unknown) {
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

export function rulaAnalysisFromImageSide(value: unknown): { analysis: RulaSinglePostureAnalysis; overlay?: RulaPostureImageOverlay } | null {
  if (!isRecord(value)) return null;
  const analysis: Partial<RulaSinglePostureAnalysis> = {};
  for (const { key } of rulaPostureRows) {
    const candidate = value[key];
    if (!isRecord(candidate) || !hasPostureScore(candidate.score) || typeof candidate.detected !== "boolean") return null;
    const confidence = candidate.confidence === null || candidate.confidence === undefined ? null : Number(candidate.confidence);
    if (confidence !== null && (!Number.isFinite(confidence) || confidence < 0 || confidence > 1)) return null;
    const angle = candidate.detected ? postureAngle(candidate.angle) : null;
    const score = !candidate.detected ? 1 : angle === null ? postureScore(candidate.score, 1) : suggestedRulaPostureScore(key, angle, candidate.detected, postureScore(candidate.score, 1));
    analysis[key] = { angle, score, detected: candidate.detected, source: "AI", confirmedByUser: false, confidence };
  }
  return { analysis: analysis as RulaSinglePostureAnalysis, overlay: postureOverlayFromValue(value.overlay) };
}

export function postureAnalysisFromValue(value: unknown): RulaPostureAnalysis {
  const source = isRecord(value) ? value : {};
  const direct = postureAnalysisRowsFromValue(source);
  const rawSides = isRecord(source.sideAnalyses) ? source.sideAnalyses : {};
  const sideAnalyses = Object.fromEntries(([
    "LEFT", "RIGHT",
  ] as const).filter((side) => isRecord(rawSides[side])).map((side) => [side, postureAnalysisRowsFromValue(rawSides[side])])) as Partial<Record<RulaBodySide, RulaSinglePostureAnalysis>>;
  const imageOverlay = postureOverlayFromValue(source.imageOverlay);
  const rawSideOverlays = isRecord(source.sideImageOverlays) ? source.sideImageOverlays : {};
  const sideImageOverlays = Object.fromEntries(([
    "LEFT", "RIGHT",
  ] as const).flatMap((side) => {
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

export function parsePostureAnalysis(value: unknown) {
  if (typeof value === "string") {
    try { return postureAnalysisFromValue(JSON.parse(value)); } catch { return postureAnalysisFromValue(null); }
  }
  return postureAnalysisFromValue(value);
}

export function rulaInputsFromAnalysis(analysis: RulaPostureAnalysis, force: number, muscleUse: boolean): RulaInput {
  return { upperArm: analysis.upperArm.score, lowerArm: analysis.lowerArm.score, wrist: analysis.wrist.score, wristTwist: analysis.wristTwist.score, neck: analysis.neck.score, trunk: analysis.trunk.score, legs: analysis.legs.score, muscleUse, force };
}

export function rulaMuscleUseFromValue(value: unknown) {
  return value === true || value === 1 || value === "1" || value === "true" || value === "on";
}

export function withBothSideAnalyses(analysis: RulaPostureAnalysis): RulaPostureAnalysis {
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

export function isRulaPostureResultReviewed(row: RulaPostureRow) {
  return row.source !== "DEFAULT";
}

export function isRulaSingleAnalysisReviewed(analysis: RulaSinglePostureAnalysis | undefined) {
  return Boolean(analysis && rulaPostureRows.every(({ key }) => isRulaPostureResultReviewed(analysis[key])));
}

export function rulaActivityInfoFromForm(values: FormData): RulaActivityInfo {
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

export function rulaPayloadFromForm(form: HTMLFormElement) {
  const values = new FormData(form);
  const rawPostureAnalysis = parsePostureAnalysis(values.get("postureAnalysis"));
  const bodySide = values.get("bodySide") === "LEFT" ? "LEFT" : values.get("bodySide") === "BOTH" ? "BOTH" : "RIGHT";
  const postureAnalysis = bodySide === "BOTH" ? withBothSideAnalyses(rawPostureAnalysis) : rawPostureAnalysis;
  const inputs = rulaInputsFromAnalysis(postureAnalysis, Number(values.get("force")), rulaMuscleUseFromValue(values.get("muscleUse")));
  return { projectId: String(values.get("projectId") ?? ""), title: String(values.get("title") ?? ""), subjectCode: values.get("subjectCode") ? String(values.get("subjectCode")) : null, bodySide, activityInfo: rulaActivityInfoFromForm(values), postureAnalysis, inputs };
}

export function rulaPayloadFromDraft(value: unknown) {
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

export function formatPostureAngle(angle: number | null, locale: "fa" | "en") {
  return angle === null ? "—" : `${angle.toLocaleString(locale === "en" ? "en-US" : "fa-IR")}°`;
}

const rulaActionLevelMeta = {
  1: { labelKey: "assessment.rulaAcceptable", className: "acceptable" },
  2: { labelKey: "assessment.rulaRiskInvestigation", className: "investigation" },
  3: { labelKey: "assessment.rulaNeedsReview", className: "review" },
  4: { labelKey: "assessment.rulaRiskImmediate", className: "immediate" },
} as const;
export const rulaReportFactorKeys = ["neck", "upperArm", "trunk"] as const;

export function rulaActionLevelFor(value: number) {
  const safeValue = Number.isFinite(value) ? value : 1;
  const level = Math.max(1, Math.min(4, Math.trunc(safeValue))) as keyof typeof rulaActionLevelMeta;
  return rulaActionLevelMeta[level];
}

export function rulaActionLevelForScore(score: number) {
  if (score < 1) return { labelKey: "assessment.manualReviewRequiredShort", className: "review-required" } as const;
  const level = score <= 2 ? 1 : score <= 4 ? 2 : score <= 6 ? 3 : 4;
  return rulaActionLevelFor(level);
}

export function rankRulaReportFactors(factors: RulaReportFactor[]) {
  return [...factors].sort((left, right) => right.impactPercent - left.impactPercent || right.score - left.score || rulaReportFactorKeys.indexOf(left.key) - rulaReportFactorKeys.indexOf(right.key));
}

export function rulaActionIsSame(left: RulaCorrectionAction, right: RulaCorrectionAction) {
  const sameBodySide = !left.bodySide || !right.bodySide || left.bodySide === right.bodySide;
  return sameBodySide && (left.id === right.id || Boolean(left.suggestionId && left.suggestionId === right.id) || Boolean(right.suggestionId && right.suggestionId === left.id));
}

function rulaActionTitleKey(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/gu, " ");
}

export function rulaActionMatchesSuggestion(action: RulaCorrectionAction, suggestion: RulaCorrectionAction) {
  return rulaActionIsSame(action, suggestion) || [action.titleFa, action.titleEn].some((title) => title && [suggestion.titleFa, suggestion.titleEn].some((suggestionTitle) => rulaActionTitleKey(title) === rulaActionTitleKey(suggestionTitle)));
}

export function rulaActionForDataTable(action: RulaCorrectionAction, suggestions: RulaCorrectionAction[]) {
  if (action.affectedParts.length) return action;
  const suggestion = suggestions.find((item) => rulaActionMatchesSuggestion(action, item));
  return suggestion ? { ...action, affectedParts: suggestion.affectedParts } : action;
}

export function rulaActionBodySideLabel(side: RulaActionBodySide | null | undefined, t: (key: string, values?: Record<string, string | number>) => string) {
  return side === "LEFT" ? t("assessment.left") : side === "BOTH" ? t("assessment.bothSides") : t("assessment.right");
}

export function rulaActionPartLabel(action: RulaCorrectionAction, locale: "fa" | "en", t: (key: string, values?: Record<string, string | number>) => string) {
  if (!action.affectedParts.length) return t("assessment.rulaNoRelatedFactor");
  const separator = locale === "fa" ? "، " : ", ";
  return action.affectedParts.map((part) => t(`assessment.${part}`)).join(separator);
}

export function rulaMainFactorKey(analysis: RulaPostureAnalysis): RulaReportFactor["key"] {
  const keys = ["neck", "upperArm", "trunk"] as const;
  return keys.reduce((highest, key) => analysis[key].score > analysis[highest].score ? key : highest, keys[0]);
}

export function rulaSourceLabelKey(source: RulaPostureSource) {
  return source === "AI" ? "assessment.aiSuggested" : source === "USER" ? "assessment.userEdited" : "assessment.defaultValue";
}
