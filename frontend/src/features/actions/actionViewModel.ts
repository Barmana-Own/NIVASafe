export type ActionBodySide = "LEFT" | "RIGHT" | "BOTH";
export type ActionRegisterType = "FMEA" | "RULA" | "UNCLASSIFIED";

export type ActionRecord = {
  id: string;
  projectId?: string | null;
  fmeaId?: string | null;
  fmeaItemId?: string | null;
  rulaId?: string | null;
  bodySide?: ActionBodySide | null;
  priority?: string | null;
  status?: string | null;
  [key: string]: unknown;
};

/** Mirrors the current backend report adapter's display mapping from stored FMEA risk level to AP. */
export function actionPriorityForRiskLevel(riskLevel: string): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" {
  const normalized = riskLevel.trim().toUpperCase();
  if (normalized === "CRITICAL" || normalized === "HIGH" || normalized === "MEDIUM") return normalized;
  return normalized === "VERY_LOW" ? "LOW" : "MEDIUM";
}

export type ActionFilters = {
  type: ActionRegisterType;
  projectId?: string;
  assessmentId?: string;
  assessmentItemIds?: ReadonlySet<string>;
  status?: string;
  priority?: string;
};

export function actionListQueryString(input: { type: ActionRegisterType; projectId?: string | null; assessmentId?: string | null; page?: number; limit?: number }) {
  const params = new URLSearchParams();
  params.set("page", String(input.page ?? 1));
  params.set("limit", String(input.limit ?? 50));
  params.set("type", input.type);
  if (input.projectId) params.set("projectId", input.projectId);
  if (input.assessmentId && input.type === "FMEA") params.set("fmeaId", input.assessmentId);
  if (input.assessmentId && input.type === "RULA") params.set("rulaId", input.assessmentId);
  return params.toString();
}

export function allowedRulaActionSides(assessmentSide?: ActionBodySide | null): ActionBodySide[] {
  if (assessmentSide === "LEFT" || assessmentSide === "RIGHT") return [assessmentSide];
  return ["RIGHT", "LEFT", "BOTH"];
}

export function classifyAction(action: Pick<ActionRecord, "fmeaId" | "fmeaItemId" | "rulaId">): ActionRegisterType {
  const hasFmea = Boolean(action.fmeaId || action.fmeaItemId);
  const hasRula = Boolean(action.rulaId);
  if (hasFmea === hasRula) return "UNCLASSIFIED";
  return hasFmea ? "FMEA" : "RULA";
}

function clean(value: FormDataEntryValue | string | null | undefined): string {
  return String(value ?? "").trim();
}

export function buildFmeaActionPayload(input: {
  projectId: string;
  fmeaId: string;
  fmeaItemId?: string | null;
  title: string;
  description: string;
  priority: string;
  assigneeName?: string;
  dueDate?: string;
}) {
  return {
    projectId: clean(input.projectId),
    fmeaId: clean(input.fmeaId),
    fmeaItemId: clean(input.fmeaItemId) || null,
    rulaId: null,
    bodySide: null,
    rulaImpact: null,
    title: clean(input.title),
    description: clean(input.description),
    priority: clean(input.priority) || "MEDIUM",
    assigneeName: clean(input.assigneeName) || null,
    dueDate: clean(input.dueDate) || null,
    status: "OPEN" as const,
  };
}

export function buildRulaActionPayload(input: {
  projectId: string;
  rulaId: string;
  bodySide: ActionBodySide;
  title: string;
  description: string;
  priority: string;
  assigneeName?: string;
  dueDate?: string;
}) {
  return {
    projectId: clean(input.projectId),
    fmeaId: null,
    fmeaItemId: null,
    rulaId: clean(input.rulaId),
    bodySide: input.bodySide,
    rulaImpact: null,
    title: clean(input.title),
    description: clean(input.description),
    priority: clean(input.priority) || "MEDIUM",
    assigneeName: clean(input.assigneeName) || null,
    dueDate: clean(input.dueDate) || null,
    status: "OPEN" as const,
  };
}

export function filterActionList<T extends ActionRecord>(items: T[], filters: ActionFilters): T[] {
  return items.filter((item) => {
    if (classifyAction(item) !== filters.type) return false;
    if (filters.projectId && item.projectId !== filters.projectId) return false;
    if (filters.assessmentId) {
      const linkedAssessmentId = filters.type === "FMEA" ? item.fmeaId : filters.type === "RULA" ? item.rulaId : null;
      const linkedFmeaItem = filters.type === "FMEA" && Boolean(item.fmeaItemId && filters.assessmentItemIds?.has(item.fmeaItemId));
      if (linkedAssessmentId !== filters.assessmentId && !linkedFmeaItem) return false;
    }
    if (filters.status && item.status !== filters.status) return false;
    if (filters.priority && item.priority !== filters.priority) return false;
    return true;
  });
}
