import {
  draftNumber,
  draftValue,
  generatedFmeaCode,
  parseFmeaRiskRowDrafts,
  type DraftRecord,
  type FmeaRiskRowInput,
} from "../assessmentShared";

export function fmeaPayloadFromDraft(value: unknown) {
  const draft = (value && typeof value === "object" ? value : {}) as DraftRecord;
  const list = (key: string) => Array.isArray(draft[key]) ? draft[key]!.filter((item): item is string => typeof item === "string").slice(0, 20) : [];
  const title = String(draft.title ?? "").trim();
  return { projectId: draft.projectId ?? "", activityId: draft.activityId || null, jobCatalogId: draft.jobCatalogId || null, title, code: String(draft.code ?? "").trim() || generatedFmeaCode(), scope: String(draft.scope ?? "").trim() || title || null, department: draft.department || null, activityDescription: draft.activityDescription ?? "", equipment: list("equipment"), materials: list("materials"), existingControls: list("existingControls"), specialConditions: draft.specialConditions || null };
}

export function fmeaRiskRowsFromDraft(draft: DraftRecord): FmeaRiskRowInput[] | null {
  const rows = parseFmeaRiskRowDrafts(draft.reviewRiskRows);
  const text = (key: keyof Pick<FmeaRiskRowInput, "failureMode" | "effect" | "cause" | "preventiveControls" | "detectionControls" | "recommendation">) => draftValue(draft, `review${key.charAt(0).toUpperCase()}${key.slice(1)}`).trim().slice(0, 1_200);
  const current: FmeaRiskRowInput = { failureMode: text("failureMode"), effect: text("effect"), cause: text("cause"), preventiveControls: text("preventiveControls"), detectionControls: text("detectionControls"), severity: draftNumber(draft, "reviewSeverity", 1), occurrence: draftNumber(draft, "reviewOccurrence", 1), detection: draftNumber(draft, "reviewDetection", 1), recommendation: text("recommendation") };
  const hasCurrentRow = Object.entries(current).some(([key, value]) => !["severity", "occurrence", "detection"].includes(key) && typeof value === "string" && value.length > 0);
  if (!hasCurrentRow) return rows;
  if (!current.failureMode || !current.effect || !current.cause) return null;
  return rows.length < 20 ? [...rows, current] : rows;
}
