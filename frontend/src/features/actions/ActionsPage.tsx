import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { api, getCurrentRole, getSession, useLoad, type ApiEnvelope } from "../../api/client";
import { EmptyState, Icon, LocalizedDateInput, PageHeader, SectionCard, StatusBadge, StyledSelect, formatDate } from "../../components/UI";
import { LoadState } from "../../components/LoadState";
import { AutoSaveForm, clearAutoSaveDraft } from "../../forms/AutoSaveForm";
import { scopedDraftKey } from "../../forms/autoSave";
import { useI18n } from "../../i18n";
import { ActionCreateIdempotency } from "./actionCreateIdempotency";
import {
  allowedRulaActionSides,
  actionListQueryString,
  actionPriorityForRiskLevel,
  buildFmeaActionPayload,
  buildRulaActionPayload,
  filterActionList,
  type ActionBodySide,
  type ActionRecord,
  type ActionRegisterType,
} from "./actionViewModel";

type AssessmentProject = { id: string; name: string; code?: string };
type FmeaProjectSummary = { name: string; code?: string };
type FmeaRiskRow = { id: string; rowNumber: number; failureMode: string; effect?: string | null; cause?: string | null; severity: number; occurrence: number; detection: number; rpn: number; riskLevel: string; recommendation?: string | null };
type FmeaAssessment = { id: string; projectId: string; title: string; code: string; status: string; project: FmeaProjectSummary; items: FmeaRiskRow[] };
type RulaEvaluationRow = { bodyPart?: string | null; title?: string | null; scoreShare?: number | null };
type RulaAssessment = { id: string; projectId: string; title: string; status: string; score: number; actionLevel: number; bodySide: ActionBodySide; project: AssessmentProject; activityInfo?: { jobTitle?: string | null; taskDescription?: string | null; postureDescription?: string | null } | null; postureAnalysis?: { evaluationRows?: RulaEvaluationRow[]; sideAnalyses?: Partial<Record<"LEFT" | "RIGHT", { evaluationRows?: RulaEvaluationRow[] }>> } | null };
type ActionListItem = ActionRecord & {
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  progress: number;
  dueDate?: string | null;
  assigneeName?: string | null;
  bodySide?: ActionBodySide | null;
  rulaImpact?: { scoreReduction?: number; affectedParts?: string[] } | null;
};

const editableRoles = ["SUPER_ADMIN", "ORG_ADMIN", "HSE_MANAGER", "HSE_SPECIALIST", "HSE_OFFICER", "ASSISTANT", "ASSESSOR"];
const statusOptions = ["OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING_FOR_REVIEW", "COMPLETED", "REJECTED", "CANCELLED"];
const statusLabelKeys: Record<string, string> = { OPEN: "status.open", ASSIGNED: "status.assigned", IN_PROGRESS: "status.inProgress", WAITING_FOR_REVIEW: "status.waitingForReview", COMPLETED: "status.completed", REJECTED: "status.rejected", CANCELLED: "status.cancelled" };
const priorityOptions = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const limit = 50;
const projectActionPageLimit = 100;

function validType(value: string | null): "FMEA" | "RULA" {
  const upper = value?.toUpperCase();
  return upper === "FMEA" || upper === "RULA" ? upper : "FMEA";
}

function projectsForAssessments(assessments: readonly { projectId: string; project?: { name?: string; code?: string } | null }[] | null | undefined): AssessmentProject[] {
  const projects = new Map<string, AssessmentProject>();
  for (const assessment of assessments ?? []) {
    if (!assessment.projectId || projects.has(assessment.projectId)) continue;
    projects.set(assessment.projectId, { id: assessment.projectId, name: assessment.project?.name ?? "", code: assessment.project?.code });
  }
  return [...projects.values()];
}

const rulaPartKeys = new Set(["upperArm", "lowerArm", "wrist", "wristTwist", "neck", "trunk", "legs"]);

function rulaAssessmentBodyParts(assessment: RulaAssessment): string[] {
  const analysis = assessment.postureAnalysis;
  const sideRows = assessment.bodySide === "BOTH"
    ? [analysis?.sideAnalyses?.LEFT?.evaluationRows, analysis?.sideAnalyses?.RIGHT?.evaluationRows]
    : [analysis?.sideAnalyses?.[assessment.bodySide]?.evaluationRows];
  const rows = [...(analysis?.evaluationRows ?? []), ...sideRows.flatMap((items) => items ?? [])];
  return [...new Set(rows.map((row) => row.bodyPart?.trim()).filter((part): part is string => Boolean(part && rulaPartKeys.has(part))))];
}

function localizedRulaPart(part: string, t: (key: string, values?: Record<string, string | number>) => string) {
  return rulaPartKeys.has(part) ? t(`assessment.${part}`) : part;
}

function useActionsByProject(projectId: string | null, type: "FMEA" | "RULA", assessmentId: string | null) {
  const [data, setData] = useState<ActionListItem[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(projectId));
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!projectId || !assessmentId) {
      setData(null);
      setError("");
      setLoading(false);
      return undefined;
    }
    let active = true;
    setLoading(true);
    setData(null);
    setError("");
    async function loadProjectActions() {
      try {
        const firstPage = await api<ActionListItem[]>(`/actions?${actionListQueryString({ type, projectId, assessmentId, page: 1, limit: projectActionPageLimit })}`);
        const items = [...firstPage.data];
        const total = firstPage.meta?.total ?? firstPage.data.length;
        const pageSize = firstPage.meta?.limit ?? projectActionPageLimit;
        const pageCount = Math.ceil(total / pageSize);
        for (let page = 2; active && page <= pageCount; page += 1) {
          const response = await api<ActionListItem[]>(`/actions?${actionListQueryString({ type, projectId, assessmentId, page, limit: projectActionPageLimit })}`);
          items.push(...response.data);
          if (!response.data.length) break;
        }
        if (active) setData(items);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : String(reason));
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadProjectActions();
    return () => { active = false; };
  }, [projectId, type, assessmentId, refresh]);

  return { data, error, loading, reload: () => setRefresh((current) => current + 1) };
}

export function ActionsPage() {
  const [searchParams] = useSearchParams();
  const { locale, t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const fmeas = useLoad<FmeaAssessment[]>("/fmea");
  const rulas = useLoad<RulaAssessment[]>("/rula");
  const fmeaProjects = useMemo(() => projectsForAssessments(fmeas.data), [fmeas.data]);
  const rulaProjects = useMemo(() => projectsForAssessments(rulas.data), [rulas.data]);
  const initialType = validType(searchParams.get("type"));
  const initialFmeaId = searchParams.get("fmeaId") ?? "";
  const initialFmeaItemId = searchParams.get("fmeaItemId") ?? "";
  const initialRulaId = searchParams.get("rulaId") ?? "";
  const [createType, setCreateType] = useState<"FMEA" | "RULA">(initialType);
  const [registerType, setRegisterType] = useState<ActionRegisterType>(initialType);
  const [createFmeaId, setCreateFmeaId] = useState(initialFmeaId);
  const [createRulaId, setCreateRulaId] = useState(initialRulaId);
  const [createFmeaProjectId, setCreateFmeaProjectId] = useState("");
  const [createRulaProjectId, setCreateRulaProjectId] = useState("");
  const [createFmeaItemId, setCreateFmeaItemId] = useState(initialFmeaItemId);
  const [listFmeaId, setListFmeaId] = useState(initialFmeaId);
  const [listRulaId, setListRulaId] = useState(initialRulaId);
  const [listFmeaProjectId, setListFmeaProjectId] = useState("");
  const [listRulaProjectId, setListRulaProjectId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [savingActionId, setSavingActionId] = useState("");
  const [creatingAction, setCreatingAction] = useState(false);
  const [legacyPage, setLegacyPage] = useState(1);
  const [legacyRefresh, setLegacyRefresh] = useState(0);
  const fmeaDefaultsApplied = useRef(false);
  const rulaDefaultsApplied = useRef(false);
  const actionCreateKeys = useRef(new ActionCreateIdempotency());
  const actionCreatePending = useRef(false);
  const canEditActions = editableRoles.includes(getCurrentRole());
  const { session, orgId } = getSession();

  useEffect(() => {
    if (fmeaDefaultsApplied.current || !fmeas.data) return;
    fmeaDefaultsApplied.current = true;
    const assessment = fmeas.data.find((item) => item.id === initialFmeaId) ?? fmeas.data[0];
    setCreateFmeaId(assessment?.id ?? "");
    setListFmeaId(assessment?.id ?? "");
    setCreateFmeaProjectId(assessment?.projectId ?? "");
    setListFmeaProjectId(assessment?.projectId ?? "");
    setCreateFmeaItemId(assessment?.items.some((item) => item.id === initialFmeaItemId) ? initialFmeaItemId : "");
  }, [fmeas.data, initialFmeaId, initialFmeaItemId]);

  useEffect(() => {
    if (rulaDefaultsApplied.current || !rulas.data) return;
    rulaDefaultsApplied.current = true;
    const assessment = rulas.data.find((item) => item.id === initialRulaId) ?? rulas.data[0];
    setCreateRulaId(assessment?.id ?? "");
    setListRulaId(assessment?.id ?? "");
    setCreateRulaProjectId(assessment?.projectId ?? "");
    setListRulaProjectId(assessment?.projectId ?? "");
  }, [rulas.data, initialRulaId]);

  const createFmeaAssessment = fmeas.data?.find((assessment) => assessment.id === createFmeaId && assessment.projectId === createFmeaProjectId) ?? null;
  const createRulaAssessment = rulas.data?.find((assessment) => assessment.id === createRulaId && assessment.projectId === createRulaProjectId) ?? null;
  const listFmeaAssessment = fmeas.data?.find((assessment) => assessment.id === listFmeaId && assessment.projectId === listFmeaProjectId) ?? null;
  const listRulaAssessment = rulas.data?.find((assessment) => assessment.id === listRulaId && assessment.projectId === listRulaProjectId) ?? null;
  const fmeaRegister = useActionsByProject(registerType === "FMEA" ? listFmeaProjectId || null : null, "FMEA", registerType === "FMEA" ? listFmeaId || null : null);
  const rulaRegister = useActionsByProject(registerType === "RULA" ? listRulaProjectId || null : null, "RULA", registerType === "RULA" ? listRulaId || null : null);
  const [legacyActions, setLegacyActions] = useState<ActionListItem[]>([]);
  const [legacyMeta, setLegacyMeta] = useState<ApiEnvelope<ActionListItem[]>["meta"]>();
  const [legacyLoading, setLegacyLoading] = useState(false);
  const [legacyError, setLegacyError] = useState("");

  useEffect(() => {
    if (registerType !== "UNCLASSIFIED") return;
    let active = true;
    setLegacyLoading(true);
    setLegacyError("");
    void api<ActionListItem[]>(`/actions?${actionListQueryString({ type: "UNCLASSIFIED", page: legacyPage, limit })}`).then((response) => {
      if (!active) return;
      setLegacyActions(response.data);
      setLegacyMeta(response.meta);
    }).catch((reason) => {
      if (active) setLegacyError(reason instanceof Error ? reason.message : String(reason));
    }).finally(() => active && setLegacyLoading(false));
    return () => { active = false; };
  }, [registerType, legacyPage, legacyRefresh]);

  const draftScope = createType === "FMEA" ? `${createType}:${createFmeaId || "unselected"}` : `${createType}:${createRulaId || "unselected"}`;
  const actionDraftKey = scopedDraftKey(`action-create-${draftScope}`, session?.user.id, orgId);

  const displayedActions = useMemo(() => {
    let items: ActionListItem[];
    if (registerType === "FMEA") items = filterActionList(fmeaRegister.data ?? [], {
      type: "FMEA",
      projectId: listFmeaProjectId || undefined,
      assessmentId: listFmeaId || undefined,
      assessmentItemIds: new Set(listFmeaAssessment?.items.map((item) => item.id) ?? []),
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
    });
    else if (registerType === "RULA") items = filterActionList(rulaRegister.data ?? [], {
      type: "RULA",
      projectId: listRulaProjectId || undefined,
      assessmentId: listRulaId || undefined,
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
    });
    else items = filterActionList(legacyActions, { type: "UNCLASSIFIED", status: statusFilter || undefined, priority: priorityFilter || undefined });
    return items;
  }, [registerType, fmeaRegister.data, rulaRegister.data, listFmeaId, listRulaId, listFmeaProjectId, listRulaProjectId, listFmeaAssessment, listRulaAssessment, legacyActions, statusFilter, priorityFilter]);

  function selectCreateFmeaProject(projectId: string) {
    setCreateFmeaProjectId(projectId);
    const assessment = fmeas.data?.find((item) => item.projectId === projectId);
    setCreateFmeaId(assessment?.id ?? "");
    setCreateFmeaItemId("");
  }

  function selectCreateRulaProject(projectId: string) {
    setCreateRulaProjectId(projectId);
    setCreateRulaId(rulas.data?.find((item) => item.projectId === projectId)?.id ?? "");
  }

  function selectListFmeaProject(projectId: string) {
    setListFmeaProjectId(projectId);
    setListFmeaId(fmeas.data?.find((item) => item.projectId === projectId)?.id ?? "");
  }

  function selectListRulaProject(projectId: string) {
    setListRulaProjectId(projectId);
    setListRulaId(rulas.data?.find((item) => item.projectId === projectId)?.id ?? "");
  }

  function refreshRegister() {
    if (registerType === "FMEA") fmeaRegister.reload();
    else if (registerType === "RULA") rulaRegister.reload();
    else setLegacyRefresh((current) => current + 1);
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (actionCreatePending.current) return;
    actionCreatePending.current = true;
    setCreatingAction(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setError("");
    setMessage("");
    try {
      let payload: Record<string, unknown>;
      let scope: string;
      if (createType === "FMEA") {
        if (!createFmeaAssessment) throw new Error(t("actions.selectFmeaFirst"));
        payload = buildFmeaActionPayload({
          projectId: createFmeaAssessment.projectId,
          fmeaId: createFmeaAssessment.id,
          fmeaItemId: String(form.get("fmeaItemId") ?? "") || null,
          title: String(form.get("title") ?? ""),
          description: String(form.get("description") ?? ""),
          priority: String(form.get("priority") ?? "MEDIUM"),
          assigneeName: String(form.get("assigneeName") ?? ""),
          dueDate: String(form.get("dueDate") ?? ""),
        });
        scope = `actions:${createType}:${createFmeaAssessment.id}`;
      } else {
        if (!createRulaAssessment) throw new Error(t("actions.selectRulaFirst"));
        const requestedSide = String(form.get("bodySide") ?? "") as ActionBodySide;
        if (!allowedRulaActionSides(createRulaAssessment.bodySide).includes(requestedSide)) throw new Error(t("actions.invalidRulaSide"));
        payload = buildRulaActionPayload({
          projectId: createRulaAssessment.projectId,
          rulaId: createRulaAssessment.id,
          bodySide: requestedSide,
          title: String(form.get("title") ?? ""),
          description: String(form.get("description") ?? ""),
          priority: String(form.get("priority") ?? "MEDIUM"),
          assigneeName: String(form.get("assigneeName") ?? ""),
          dueDate: String(form.get("dueDate") ?? ""),
        });
        scope = `actions:${createType}:${createRulaAssessment.id}`;
      }
      const idempotencyKey = actionCreateKeys.current.keyFor(scope, payload);
      await api("/actions", { method: "POST", headers: { "idempotency-key": idempotencyKey }, body: JSON.stringify(payload) });
      actionCreateKeys.current.complete(scope, payload);
      await clearAutoSaveDraft(actionDraftKey);
      formElement.reset();
      setMessage(t("actions.created"));
      if (createType === registerType && ((createType === "FMEA" && createFmeaId === listFmeaId) || (createType === "RULA" && createRulaId === listRulaId))) refreshRegister();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      actionCreatePending.current = false;
      setCreatingAction(false);
    }
  }

  async function updateStatus(item: ActionListItem, status: string) {
    setError("");
    setSavingActionId(item.id);
    try {
      await api(`/actions/${encodeURIComponent(item.id)}`, { method: "PATCH", body: JSON.stringify({ status }) });
      refreshRegister();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setSavingActionId("");
    }
  }

  const pageCount = Math.max(1, Math.ceil((legacyMeta?.total ?? 0) / (legacyMeta?.limit ?? limit)));

  return <section className="page-shell actions-workspace">
    <PageHeader eyebrow={t("actions.eyebrow")} title={t("actions.title")} description={t("actions.description")}/>
    {error && <div role="alert" className="alert error"><Icon name="warning"/>{error}</div>}
    {message && <div role="status" className="alert success"><Icon name="check"/>{message}</div>}

    {canEditActions && <SectionCard title={t("actions.new")} description={t("actions.newDescription")} icon="plus">
      <div className="action-type-tabs" role="tablist" aria-label={t("actions.createType")} onKeyDown={handleActionTabKeyDown}>
        {(["FMEA", "RULA"] as const).map((type) => <button key={type} id={`action-create-tab-${type.toLowerCase()}`} type="button" role="tab" tabIndex={createType === type ? 0 : -1} aria-selected={createType === type} aria-controls={`action-create-${type.toLowerCase()}`} className={createType === type ? "active" : ""} onClick={() => { setCreateType(type); setError(""); setMessage(""); }}><Icon name={type === "FMEA" ? "fmea" : "rula"}/>{t(type === "FMEA" ? "actions.fmeaType" : "actions.rulaType")}</button>)}
      </div>
      <div id="action-create-fmea" role="tabpanel" aria-labelledby="action-create-tab-fmea" tabIndex={0} hidden={createType !== "FMEA"} className="action-create-panel">
        <div className="action-project-assessment-selectors">
          <label>{t("projects.project")}<StyledSelect aria-label={t("projects.project")} value={createFmeaProjectId} onChange={(event) => selectCreateFmeaProject(event.target.value)} required><option value="">{t("actions.selectProject")}</option>{fmeaProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</StyledSelect></label>
          <label>{t("actions.fmeaAssessment")}<StyledSelect aria-label={t("actions.fmeaAssessment")} value={createFmeaId} onChange={(event) => { setCreateFmeaId(event.target.value); setCreateFmeaItemId(""); }} required><option value="">{t("actions.selectAssessment")}</option>{fmeas.data?.filter((assessment) => assessment.projectId === createFmeaProjectId).map((assessment) => <option key={assessment.id} value={assessment.id}>{assessment.title} · {assessment.code}</option>)}</StyledSelect></label>
        </div>
        <LoadState state={fmeas} empty={t("actions.noFmeaAssessment")}>{(assessments) => {
          const assessment = assessments.find((item) => item.id === createFmeaId && item.projectId === createFmeaProjectId);
          if (!assessment) return <EmptyState title={t("actions.selectAssessment")} description={t("actions.selectAssessmentHint")} icon="fmea"/>;
          const selectedRiskItem = assessment.items.find((item) => item.id === createFmeaItemId);
          return <>
          <div className="action-assessment-context"><span>{t("projects.project")}: <strong>{assessment.project.name}</strong></span><span>{assessment.code}</span></div>
          <AutoSaveForm key={actionDraftKey} storageKey={actionDraftKey} className="action-create-form" onSubmit={create}>
            <label className="action-create-wide">{t("actions.fmeaRiskRow")}<StyledSelect aria-label={t("actions.fmeaRiskRow")} name="fmeaItemId" value={createFmeaItemId} onChange={(event) => setCreateFmeaItemId(event.target.value)}><option value="">{t("actions.noFmeaRiskRow")}</option>{assessment.items.map((item) => <option key={item.id} value={item.id}>{`#${item.rowNumber} · ${item.failureMode} · S${item.severity}/O${item.occurrence}/D${item.detection} · RPN ${item.rpn} · AP ${t(`status.${actionPriorityForRiskLevel(item.riskLevel).toLowerCase()}`)} · ${t(riskLevelLabelKey(item.riskLevel))}`}</option>)}</StyledSelect><small className="field-hint">{t("actions.fmeaRiskContextHint")}</small></label>
            {selectedRiskItem && <section className="action-fmea-risk-context" aria-live="polite"><div className="action-fmea-risk-heading"><div><small>{t("actions.fmeaRiskRow")} · #{selectedRiskItem.rowNumber.toLocaleString(numberLocale)}</small><h3>{selectedRiskItem.failureMode}</h3></div><div><StatusBadge value={selectedRiskItem.riskLevel}/><span className="action-ap-badge">AP <StatusBadge value={actionPriorityForRiskLevel(selectedRiskItem.riskLevel)}/></span></div></div><div className="action-fmea-risk-metrics"><span><small>{t("assessment.severity")} (S)</small><strong>{selectedRiskItem.severity.toLocaleString(numberLocale)}</strong></span><span><small>{t("assessment.occurrence")} (O)</small><strong>{selectedRiskItem.occurrence.toLocaleString(numberLocale)}</strong></span><span><small>{t("assessment.detection")} (D)</small><strong>{selectedRiskItem.detection.toLocaleString(numberLocale)}</strong></span><span><small>RPN</small><strong>{selectedRiskItem.rpn.toLocaleString(numberLocale)}</strong></span></div><div className="action-fmea-risk-copy">{selectedRiskItem.effect && <p><strong>{t("assessment.effect")}:</strong> {selectedRiskItem.effect}</p>}{selectedRiskItem.cause && <p><strong>{t("assessment.cause")}:</strong> {selectedRiskItem.cause}</p>}</div><small className="field-hint">{t("actions.fmeaRiskClassificationNote")}</small></section>}
            <label>{t("actions.titleLabel")}<input name="title" maxLength={191} placeholder={t("actions.titlePlaceholder")} required minLength={2}/></label>
            <label>{t("actions.detailsLabel")}<textarea name="description" rows={3} maxLength={20000} placeholder={t("actions.detailsPlaceholder")} required minLength={2}/></label>
            <label>{t("actions.priority")}<StyledSelect aria-label={t("actions.priority")} name="priority" defaultValue="MEDIUM">{priorityOptions.map((value) => <option key={value} value={value}>{t(`status.${value.toLowerCase()}`)}</option>)}</StyledSelect></label>
            <label>{t("actions.assignee")}<input name="assigneeName" maxLength={191} placeholder={t("actions.assigneePlaceholder")}/></label>
            <label>{t("actions.dueDate")}<LocalizedDateInput name="dueDate" ariaLabel={t("actions.dueDate")}/></label>
            <button className="primary action-create-submit" type="submit" disabled={creatingAction}><Icon name="plus"/>{t("actions.registerFmea")}</button>
          </AutoSaveForm>
          </>;
        }}</LoadState>
      </div>
      <div id="action-create-rula" role="tabpanel" aria-labelledby="action-create-tab-rula" tabIndex={0} hidden={createType !== "RULA"} className="action-create-panel">
        <div className="action-project-assessment-selectors">
          <label>{t("projects.project")}<StyledSelect aria-label={t("projects.project")} value={createRulaProjectId} onChange={(event) => selectCreateRulaProject(event.target.value)} required><option value="">{t("actions.selectProject")}</option>{rulaProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</StyledSelect></label>
          <label>{t("actions.rulaAssessment")}<StyledSelect aria-label={t("actions.rulaAssessment")} value={createRulaId} onChange={(event) => setCreateRulaId(event.target.value)} required><option value="">{t("actions.selectAssessment")}</option>{rulas.data?.filter((assessment) => assessment.projectId === createRulaProjectId).map((assessment) => <option key={assessment.id} value={assessment.id}>{assessment.title}</option>)}</StyledSelect></label>
        </div>
        <LoadState state={rulas} empty={t("actions.noRulaAvailable")}>{(assessments) => {
          const assessment = assessments.find((item) => item.id === createRulaId && item.projectId === createRulaProjectId);
          if (!assessment) return <EmptyState title={t("actions.selectAssessment")} description={t("actions.selectAssessmentHint")} icon="rula"/>;
          return <>
          <div className="action-assessment-context"><span>{t("projects.project")}: <strong>{assessment.project.name}</strong></span><span>{t("assessment.rulaScoreLabel")}: {assessment.score} · {t("assessment.actionLevel", { level: assessment.actionLevel })}</span></div>
          {(assessment.activityInfo?.jobTitle || assessment.activityInfo?.taskDescription || rulaAssessmentBodyParts(assessment).length > 0) && <div className="action-rula-assessment-context"><strong>{t("actions.rulaErgonomicContext")}</strong>{assessment.activityInfo?.jobTitle && <span>{t("assessment.rulaJobTitle")}: {assessment.activityInfo.jobTitle}</span>}{assessment.activityInfo?.taskDescription && <span>{t("assessment.rulaTask")}: {assessment.activityInfo.taskDescription}</span>}{rulaAssessmentBodyParts(assessment).length > 0 && <span>{t("actions.rulaAffectedParts")}: {rulaAssessmentBodyParts(assessment).map((part) => localizedRulaPart(part, t)).join(locale === "fa" ? "، " : ", ")}</span>}</div>}
          <AutoSaveForm key={actionDraftKey} storageKey={actionDraftKey} className="action-create-form" onSubmit={create}>
            <label>{t("actions.bodySideLabel")}<StyledSelect aria-label={t("actions.bodySideLabel")} name="bodySide" defaultValue={allowedRulaActionSides(assessment.bodySide).includes(searchParams.get("bodySide") as ActionBodySide) ? searchParams.get("bodySide") as ActionBodySide : allowedRulaActionSides(assessment.bodySide)[0]} required>{allowedRulaActionSides(assessment.bodySide).map((side) => <option key={side} value={side}>{t(side === "RIGHT" ? "assessment.right" : side === "LEFT" ? "assessment.left" : "assessment.bothSides")}</option>)}</StyledSelect><small className="field-hint">{t("actions.bodySideHint")}</small></label>
            <label>{t("actions.titleLabel")}<input name="title" maxLength={191} placeholder={t("actions.titlePlaceholder")} required minLength={2}/></label>
            <label className="action-create-wide">{t("actions.detailsLabel")}<textarea name="description" rows={3} maxLength={20000} placeholder={t("actions.detailsPlaceholder")} required minLength={2}/></label>
            <label>{t("actions.priority")}<StyledSelect aria-label={t("actions.priority")} name="priority" defaultValue="MEDIUM">{priorityOptions.map((value) => <option key={value} value={value}>{t(`status.${value.toLowerCase()}`)}</option>)}</StyledSelect></label>
            <label>{t("actions.assignee")}<input name="assigneeName" maxLength={191} placeholder={t("actions.assigneePlaceholder")}/></label>
            <label>{t("actions.dueDate")}<LocalizedDateInput name="dueDate" ariaLabel={t("actions.dueDate")}/></label>
            <button className="primary action-create-submit" type="submit" disabled={creatingAction}><Icon name="plus"/>{t("actions.registerRula")}</button>
          </AutoSaveForm>
          </>;
        }}</LoadState>
      </div>
    </SectionCard>}

    <SectionCard title={t("actions.list")} description={t("actions.separateListDescription")} icon="actions">
      <div className="action-type-tabs action-register-tabs" role="tablist" aria-label={t("actions.registerType")} onKeyDown={handleActionTabKeyDown}>
        {(["FMEA", "RULA", "UNCLASSIFIED"] as const).map((type) => <button key={type} id={`action-list-tab-${type.toLowerCase()}`} type="button" role="tab" tabIndex={registerType === type ? 0 : -1} aria-selected={registerType === type} aria-controls="action-list-panel" className={registerType === type ? "active" : ""} onClick={() => { setRegisterType(type); setLegacyPage(1); setError(""); }}><Icon name={type === "FMEA" ? "fmea" : type === "RULA" ? "rula" : "actions"}/>{t(type === "FMEA" ? "actions.fmeaRegister" : type === "RULA" ? "actions.rulaRegister" : "actions.legacyRegister")}</button>)}
      </div>
      <div id="action-list-panel" role="tabpanel" aria-labelledby={`action-list-tab-${registerType.toLowerCase()}`} tabIndex={0} className="action-register-panel">
        {registerType === "FMEA" ? <div className="action-project-assessment-selectors"><label>{t("projects.project")}<StyledSelect aria-label={t("projects.project")} value={listFmeaProjectId} onChange={(event) => selectListFmeaProject(event.target.value)}><option value="">{t("actions.selectProject")}</option>{fmeaProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</StyledSelect></label><label>{t("actions.fmeaAssessment")}<StyledSelect aria-label={t("actions.fmeaAssessment")} value={listFmeaId} onChange={(event) => setListFmeaId(event.target.value)}><option value="">{t("actions.selectAssessment")}</option>{fmeas.data?.filter((assessment) => assessment.projectId === listFmeaProjectId).map((assessment) => <option key={assessment.id} value={assessment.id}>{assessment.title} · {assessment.code}</option>)}</StyledSelect></label></div> : registerType === "RULA" ? <div className="action-project-assessment-selectors"><label>{t("projects.project")}<StyledSelect aria-label={t("projects.project")} value={listRulaProjectId} onChange={(event) => selectListRulaProject(event.target.value)}><option value="">{t("actions.selectProject")}</option>{rulaProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</StyledSelect></label><label>{t("actions.rulaAssessment")}<StyledSelect aria-label={t("actions.rulaAssessment")} value={listRulaId} onChange={(event) => setListRulaId(event.target.value)}><option value="">{t("actions.selectAssessment")}</option>{rulas.data?.filter((assessment) => assessment.projectId === listRulaProjectId).map((assessment) => <option key={assessment.id} value={assessment.id}>{assessment.title}</option>)}</StyledSelect></label></div> : <p className="action-pagination-note">{t("actions.legacyPageHint", { limit, page: legacyPage })}</p>}
        <div className="action-list-filters">
          <label>{t("actions.statusColumn")}<StyledSelect aria-label={t("actions.statusColumn")} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">{t("actions.allStatuses")}</option>{statusOptions.map((status) => <option key={status} value={status}>{t(statusLabelKeys[status])}</option>)}</StyledSelect></label>
          <label>{t("actions.priorityColumn")}<StyledSelect aria-label={t("actions.priorityColumn")} value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option value="">{t("actions.allPriorities")}</option>{priorityOptions.map((priority) => <option key={priority} value={priority}>{t(`status.${priority.toLowerCase()}`)}</option>)}</StyledSelect></label>
          <span className="action-list-count">{displayedActions.length.toLocaleString(numberLocale)} {t("actions.visibleActions")}</span>
        </div>

        {registerType === "FMEA" && <LoadState state={fmeas} empty={t("actions.noFmeaAssessment")}>{(assessments) => {
          if (!listFmeaId || !listFmeaProjectId) return <EmptyState title={t("actions.selectAssessment")} description={t("actions.selectAssessmentHint")} icon="fmea"/>;
          if (!assessments.some((item) => item.id === listFmeaId && item.projectId === listFmeaProjectId)) return <EmptyState title={t("actions.noFmeaAssessment")} icon="fmea"/>;
          return <LoadState state={fmeaRegister} empty={t("actions.noAction")}>
            {() => <ActionCards items={displayedActions} canEdit={canEditActions} savingId={savingActionId} numberLocale={numberLocale} onStatusChange={updateStatus} fmeaItems={listFmeaAssessment?.items} t={t}/>}
          </LoadState>;
        }}</LoadState>}
        {registerType === "RULA" && <LoadState state={rulas} empty={t("actions.noRulaAvailable")}>{(assessments) => {
          if (!listRulaId || !listRulaProjectId) return <EmptyState title={t("actions.selectAssessment")} description={t("actions.selectAssessmentHint")} icon="rula"/>;
          if (!assessments.some((item) => item.id === listRulaId && item.projectId === listRulaProjectId)) return <EmptyState title={t("actions.noRulaAvailable")} icon="rula"/>;
          return <LoadState state={rulaRegister} empty={t("actions.noAction")}>
            {() => <ActionCards items={displayedActions} canEdit={canEditActions} savingId={savingActionId} numberLocale={numberLocale} onStatusChange={updateStatus} rulaAssessment={listRulaAssessment ?? undefined} t={t}/>}
          </LoadState>;
        }}</LoadState>}
        {registerType === "UNCLASSIFIED" && (legacyLoading ? <div className="action-loading" role="status">{t("common.loading")}</div> : legacyError ? <div className="alert error" role="alert">{legacyError}</div> : displayedActions.length ? <ActionCards items={displayedActions} canEdit={canEditActions} savingId={savingActionId} numberLocale={numberLocale} onStatusChange={updateStatus} t={t}/> : <EmptyState title={t("actions.noLegacyOnPage")} description={t("actions.legacyPageHint", { limit, page: legacyPage })} icon="actions"/>)}
        {registerType === "UNCLASSIFIED" && pageCount > 1 && <nav className="action-pagination" aria-label={t("actions.legacyPagination")}><button type="button" className="ghost" disabled={legacyPage <= 1 || legacyLoading} onClick={() => setLegacyPage((page) => Math.max(1, page - 1))}>{t("common.previous")}</button><span>{t("actions.pageOf", { page: legacyPage, total: pageCount })}</span><button type="button" className="ghost" disabled={legacyPage >= pageCount || legacyLoading} onClick={() => setLegacyPage((page) => Math.min(pageCount, page + 1))}>{t("common.next")}</button></nav>}
      </div>
    </SectionCard>
  </section>;
}

function ActionCards({ items, canEdit, savingId, numberLocale, onStatusChange, fmeaItems, rulaAssessment, t }: {
  items: ActionListItem[];
  canEdit: boolean;
  savingId: string;
  numberLocale: string;
  onStatusChange: (item: ActionListItem, status: string) => void;
  fmeaItems?: FmeaRiskRow[];
  rulaAssessment?: RulaAssessment;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  if (!items.length) return <EmptyState title={t("actions.noAction")} description={t("actions.noActionFilterMatch")} icon="actions"/>;
  return <div className="action-register-cards">{items.map((item) => {
    const fmeaItem = item.fmeaItemId ? fmeaItems?.find((risk) => risk.id === item.fmeaItemId) : undefined;
    const affectedParts = item.rulaImpact?.affectedParts ?? [];
    return <article className="action-register-card" key={item.id}>
      <div className="action-register-card-main">
        <div className="action-register-card-heading"><h3>{item.title}</h3><StatusBadge value={item.priority}/><StatusBadge value={item.status}/></div>
        {item.description && <p>{item.description}</p>}
        {fmeaItem && <div className="action-register-fmea-context"><div><small>{t("actions.fmeaRiskRow")} · #{fmeaItem.rowNumber.toLocaleString(numberLocale)}</small><strong>{fmeaItem.failureMode}</strong><span>{t("assessment.riskLevel")}: <StatusBadge value={fmeaItem.riskLevel}/></span><span>AP: <StatusBadge value={actionPriorityForRiskLevel(fmeaItem.riskLevel)}/></span></div><div className="action-fmea-risk-metrics"><span><small>S</small><strong>{fmeaItem.severity.toLocaleString(numberLocale)}</strong></span><span><small>O</small><strong>{fmeaItem.occurrence.toLocaleString(numberLocale)}</strong></span><span><small>D</small><strong>{fmeaItem.detection.toLocaleString(numberLocale)}</strong></span><span><small>RPN</small><strong>{fmeaItem.rpn.toLocaleString(numberLocale)}</strong></span></div></div>}
        {rulaAssessment && <div className="action-register-rula-context"><span>{t("actions.rulaErgonomicContext")}: {t("assessment.actionLevel", { level: rulaAssessment.actionLevel })}</span>{affectedParts.length > 0 && <span>{t("actions.rulaAffectedParts")}: {affectedParts.map((part) => localizedRulaPart(part, t)).join(" · ")}</span>}{item.rulaImpact?.scoreReduction !== undefined && <span>{t("actions.expectedRulaReduction", { score: item.rulaImpact.scoreReduction.toLocaleString(numberLocale) })}</span>}</div>}
        <div className="action-register-meta">{item.bodySide && <span>{t("actions.bodySideColumn")}: {t(item.bodySide === "RIGHT" ? "assessment.right" : item.bodySide === "LEFT" ? "assessment.left" : "assessment.bothSides")}</span>}<span>{t("actions.assigneeColumn")}: {item.assigneeName || t("common.none")}</span><span>{t("actions.dueDateColumn")}: {formatDate(item.dueDate ?? undefined)}</span></div>
      </div>
      <div className="action-register-card-controls">{canEdit ? <label>{t("actions.statusColumn")}<StyledSelect aria-label={`${t("actions.statusColumn")}: ${item.title}`} className="compact-select" value={item.status} disabled={savingId === item.id} onChange={(event) => onStatusChange(item, event.target.value)}>{statusOptions.map((status) => <option key={status} value={status}>{t(statusLabelKeys[status])}</option>)}</StyledSelect></label> : <StatusBadge value={item.status}/>}<div className="action-register-progress" aria-label={`${t("actions.progress")}: ${item.progress.toLocaleString(numberLocale)}%`}><span><i style={{ width: `${Math.max(0, Math.min(100, item.progress))}%` }}/></span><strong>{item.progress.toLocaleString(numberLocale)}%</strong></div></div>
    </article>;
  })}</div>;
}

function riskLevelLabelKey(level: string) {
  const camel = level.toLowerCase().split("_").map((part, index) => index ? part[0].toUpperCase() + part.slice(1) : part).join("");
  return `status.${camel}`;
}

function handleActionTabKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
  const tabs = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const currentIndex = tabs.indexOf(document.activeElement as HTMLButtonElement);
  if (currentIndex < 0) return;
  if (event.key === "Home" || event.key === "End") {
    event.preventDefault();
    const next = event.key === "Home" ? tabs[0] : tabs[tabs.length - 1];
    next?.focus();
    next?.click();
    return;
  }
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  const direction = getComputedStyle(event.currentTarget).direction === "rtl" ? -1 : 1;
  const delta = (event.key === "ArrowRight" ? 1 : -1) * direction;
  const nextIndex = (currentIndex + delta + tabs.length) % tabs.length;
  tabs[nextIndex]?.focus();
  tabs[nextIndex]?.click();
}
