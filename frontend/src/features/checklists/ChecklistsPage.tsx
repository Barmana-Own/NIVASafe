import { useEffect, useState, type FormEvent } from "react";
import { api, getCurrentRole, useLoad } from "../../api/client";
import { Icon, PageHeader, SectionCard, StatusBadge, StyledSelect, formatDate } from "../../components/UI";
import { LoadState } from "../../components/LoadState";
import { useI18n } from "../../i18n";

type ChecklistItem = { id: string; label: string; required: boolean };
type ChecklistTemplate = { id: string; familyId: string; version: number; title: string; description?: string | null; items: ChecklistItem[]; status: "DRAFT" | "PUBLISHED" | "SUPERSEDED"; publishedAt?: string | null };
type ChecklistAnswer = { itemId: string; result: "PASS" | "FAIL" | "NOT_APPLICABLE"; note?: string };
type ChecklistSnapshot = { templateId: string; version: number; title: string; items: ChecklistItem[] };
type ChecklistInspection = { id: string; templateId: string; templateVersion: number; status: "IN_PROGRESS" | "SUBMITTED" | "APPROVED" | "NEEDS_REVISION"; templateSnapshot: ChecklistSnapshot; answers: ChecklistAnswer[]; reviewDecision?: string | null; reviewNote?: string | null; createdAt: string; submittedAt?: string | null; reviewedAt?: string | null };
type ItemDraft = { label: string; required: boolean };

const managerRoles = new Set(["SUPER_ADMIN", "ORG_ADMIN", "HSE_MANAGER"]);
const inspectionStatusLabel: Record<ChecklistInspection["status"], string> = {
  IN_PROGRESS: "checklists.statusInProgress",
  SUBMITTED: "checklists.statusSubmitted",
  APPROVED: "checklists.statusApproved",
  NEEDS_REVISION: "checklists.statusNeedsRevision",
};

function normalizeTemplateItems(value: unknown): ChecklistItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Partial<ChecklistItem>;
    return typeof candidate.id === "string" && typeof candidate.label === "string"
      ? [{ id: candidate.id, label: candidate.label, required: candidate.required !== false }]
      : [];
  });
}

function normalizeAnswers(value: unknown): ChecklistAnswer[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Partial<ChecklistAnswer>;
    return typeof candidate.itemId === "string" && ["PASS", "FAIL", "NOT_APPLICABLE"].includes(candidate.result ?? "")
      ? [{ itemId: candidate.itemId, result: candidate.result as ChecklistAnswer["result"], ...(typeof candidate.note === "string" ? { note: candidate.note } : {}) }]
      : [];
  });
}

export function ChecklistsPage() {
  const { t } = useI18n();
  const canManage = managerRoles.has(getCurrentRole());
  const templates = useLoad<ChecklistTemplate[]>("/checklists/templates?limit=100");
  const inspections = useLoad<ChecklistInspection[]>("/checklists/inspections?limit=100");
  const [selectedInspectionId, setSelectedInspectionId] = useState("");
  const inspection = useLoad<ChecklistInspection>(selectedInspectionId ? `/checklists/inspections/${encodeURIComponent(selectedInspectionId)}` : null);
  const [editingTemplateId, setEditingTemplateId] = useState("");
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [itemDrafts, setItemDrafts] = useState<ItemDraft[]>([{ label: "", required: true }]);
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, ChecklistAnswer[]>>({});
  const [reviewNote, setReviewNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const current = inspection.data;
    if (current && !answerDrafts[current.id]) setAnswerDrafts((drafts) => ({ ...drafts, [current.id]: normalizeAnswers(current.answers) }));
  }, [inspection.data, answerDrafts]);

  function resetTemplateEditor() {
    setEditingTemplateId(""); setTemplateTitle(""); setTemplateDescription(""); setItemDrafts([{ label: "", required: true }]);
  }

  function editTemplate(template: ChecklistTemplate) {
    const items = normalizeTemplateItems(template.items);
    setEditingTemplateId(template.id); setTemplateTitle(template.title); setTemplateDescription(template.description ?? "");
    setItemDrafts(items.length ? items.map(({ label, required }) => ({ label, required })) : [{ label: "", required: true }]);
  }

  async function saveTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const items = itemDrafts.map((item) => ({ label: item.label.trim(), required: item.required })).filter((item) => item.label);
    setBusy(true); setError(""); setMessage("");
    try {
      const body = { title: templateTitle.trim(), description: templateDescription.trim() || null, items };
      const saved = await api<ChecklistTemplate>(editingTemplateId ? `/checklists/templates/${encodeURIComponent(editingTemplateId)}` : "/checklists/templates", { method: editingTemplateId ? "PATCH" : "POST", body: JSON.stringify(body) });
      setEditingTemplateId(saved.data.id);
      setItemDrafts(normalizeTemplateItems(saved.data.items).map(({ label, required }) => ({ label, required })));
      setTemplateTitle(saved.data.title); setTemplateDescription(saved.data.description ?? "");
      setMessage(t(editingTemplateId ? "checklists.templateUpdated" : "checklists.templateCreated"));
      templates.reload();
    } catch (reason) { setError(reason instanceof Error ? reason.message : t("common.saveFailed")); }
    finally { setBusy(false); }
  }

  async function createVersion(template: ChecklistTemplate) {
    if (busyId) return;
    setBusyId(template.id); setError(""); setMessage("");
    try {
      const created = await api<ChecklistTemplate>(`/checklists/templates/${encodeURIComponent(template.id)}/versions`, { method: "POST", body: JSON.stringify({ title: template.title }) });
      editTemplate(created.data);
      setMessage(t("checklists.templateCreated"));
      templates.reload();
    } catch (reason) { setError(reason instanceof Error ? reason.message : t("common.saveFailed")); }
    finally { setBusyId(""); }
  }

  async function publishTemplate(template: ChecklistTemplate) {
    if (busyId) return;
    setBusyId(template.id); setError(""); setMessage("");
    try {
      await api<ChecklistTemplate>(`/checklists/templates/${encodeURIComponent(template.id)}/publish`, { method: "POST", body: JSON.stringify({}) });
      setMessage(t("checklists.templatePublished"));
      templates.reload();
    } catch (reason) { setError(reason instanceof Error ? reason.message : t("common.saveFailed")); }
    finally { setBusyId(""); }
  }

  async function startInspection(template: ChecklistTemplate) {
    if (busyId) return;
    setBusyId(template.id); setError(""); setMessage("");
    try {
      const created = await api<ChecklistInspection>("/checklists/inspections", { method: "POST", body: JSON.stringify({ templateId: template.id }) });
      setSelectedInspectionId(created.data.id);
      setAnswerDrafts((drafts) => ({ ...drafts, [created.data.id]: [] }));
      setMessage(t("checklists.inspectionStarted"));
      inspections.reload();
    } catch (reason) { setError(reason instanceof Error ? reason.message : t("common.saveFailed")); }
    finally { setBusyId(""); }
  }

  function updateAnswer(current: ChecklistInspection, item: ChecklistItem, patch: Partial<ChecklistAnswer>) {
    const base = answerDrafts[current.id] ?? normalizeAnswers(current.answers);
    const existing = base.find((answer) => answer.itemId === item.id);
    if (!patch.result && !existing) return;
    const next: ChecklistAnswer[] = existing
      ? base.map((answer) => answer.itemId === item.id ? { ...answer, ...patch } : answer)
      : [...base, { itemId: item.id, result: patch.result ?? "PASS", ...patch }];
    setAnswerDrafts((drafts) => ({ ...drafts, [current.id]: next }));
  }

  async function saveAnswers(current: ChecklistInspection, submit: boolean) {
    if (busyId) return;
    setBusyId(current.id); setError(""); setMessage("");
    const answers = answerDrafts[current.id] ?? normalizeAnswers(current.answers);
    try {
      await api<ChecklistInspection>(`/checklists/inspections/${encodeURIComponent(current.id)}`, { method: "PATCH", body: JSON.stringify({ answers }) });
      if (submit) await api<ChecklistInspection>(`/checklists/inspections/${encodeURIComponent(current.id)}/submit`, { method: "POST", body: JSON.stringify({}) });
      setMessage(t(submit ? "checklists.inspectionSubmitted" : "checklists.answersSaved"));
      inspection.reload(); inspections.reload();
    } catch (reason) { setError(reason instanceof Error ? reason.message : t("common.saveFailed")); }
    finally { setBusyId(""); }
  }

  async function reviewInspection(current: ChecklistInspection, decision: "APPROVED" | "NEEDS_REVISION") {
    if (busyId) return;
    setBusyId(current.id); setError(""); setMessage("");
    try {
      await api<ChecklistInspection>(`/checklists/inspections/${encodeURIComponent(current.id)}/review`, { method: "POST", body: JSON.stringify({ decision, note: reviewNote.trim() || undefined }) });
      setMessage(t("checklists.reviewSaved"));
      setReviewNote(""); inspection.reload(); inspections.reload();
    } catch (reason) { setError(reason instanceof Error ? reason.message : t("common.saveFailed")); }
    finally { setBusyId(""); }
  }

  return <section className="page-shell workflow-page checklists-page">
    <PageHeader eyebrow={t("checklists.eyebrow")} title={t("checklists.title")} description={t("checklists.description")}/>
    {error && <div className="alert error" role="alert"><Icon name="warning"/>{error}</div>}
    {message && <div className="alert success" role="status"><Icon name="check"/>{message}</div>}
    <div className="workflow-scope-note" role="note"><Icon name="shield"/><p>{t("checklists.scopeNote")}</p></div>

    {canManage && <SectionCard title={editingTemplateId ? t("checklists.editTemplate") : t("checklists.newTemplate")} icon="actions" actions={editingTemplateId ? <button className="secondary" type="button" onClick={resetTemplateEditor}>{t("checklists.cancelEdit")}</button> : undefined}>
      <form className="workflow-form" onSubmit={(event) => void saveTemplate(event)}>
        <label>{t("checklists.templateTitle")}<input value={templateTitle} minLength={3} maxLength={191} required onChange={(event) => setTemplateTitle(event.target.value)}/></label>
        <label>{t("checklists.templateDescription")}<input value={templateDescription} maxLength={4000} onChange={(event) => setTemplateDescription(event.target.value)}/></label>
        <fieldset className="checklist-item-editor workflow-form-wide"><legend>{t("checklists.templateItems")}</legend>
          {itemDrafts.map((item, index) => <div className="checklist-item-draft" key={index}>
            <label><span className="sr-only">{t("checklists.itemLabel", { number: index + 1 })}</span><input value={item.label} minLength={2} maxLength={191} required placeholder={t("checklists.itemLabel", { number: index + 1 })} onChange={(event) => setItemDrafts((current) => current.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, label: event.target.value } : candidate))}/></label>
            <label className="checklist-required-toggle"><input type="checkbox" checked={item.required} onChange={(event) => setItemDrafts((current) => current.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, required: event.target.checked } : candidate))}/>{t("checklists.requiredItem")}</label>
            <button className="icon-button" type="button" aria-label={t("checklists.removeItem")} disabled={itemDrafts.length <= 1} onClick={() => setItemDrafts((current) => current.filter((_, candidateIndex) => candidateIndex !== index))}><Icon name="trash" size={18}/></button>
          </div>)}
          <button className="secondary" type="button" onClick={() => setItemDrafts((current) => [...current, { label: "", required: true }])}><Icon name="plus"/>{t("checklists.addItem")}</button>
        </fieldset>
        <button className="primary" type="submit" disabled={busy}>{busy ? t("common.loading") : <><Icon name="check"/>{editingTemplateId ? t("checklists.saveTemplate") : t("checklists.createTemplate")}</>}</button>
      </form>
    </SectionCard>}

    <SectionCard title={t("checklists.templates")} icon="files">
      <LoadState state={templates} empty={t("checklists.noTemplates")}>
        {(items) => <div className="workflow-list">{items.map((template) => {
          const normalizedItems = normalizeTemplateItems(template.items);
          return <article className="workflow-record-card" key={template.id}>
            <header className="workflow-record-heading"><div><span className="workflow-record-kind">{t("checklists.templateVersion", { version: template.version })}</span><h3>{template.title}</h3></div><StatusBadge value={template.status}/></header>
            {template.description && <p className="workflow-record-description">{template.description}</p>}
            <ul className="checklist-template-items">{normalizedItems.map((item) => <li key={item.id}>{item.label}{item.required && <span>{t("checklists.requiredItem")}</span>}</li>)}</ul>
            <div className="workflow-record-actions">
              {canManage && template.status === "DRAFT" && <><button className="secondary" type="button" onClick={() => editTemplate(template)}><Icon name="edit"/>{t("checklists.editTemplate")}</button><button className="primary" type="button" disabled={busyId === template.id} onClick={() => void publishTemplate(template)}>{busyId === template.id ? t("common.loading") : <><Icon name="check"/>{t("checklists.publishTemplate")}</>}</button></>}
              {canManage && template.status === "PUBLISHED" && <button className="secondary" type="button" disabled={busyId === template.id} onClick={() => void createVersion(template)}>{busyId === template.id ? t("common.loading") : <><Icon name="plus"/>{t("checklists.newVersion")}</>}</button>}
              {template.status === "PUBLISHED" && <button className="primary" type="button" disabled={busyId === template.id} onClick={() => void startInspection(template)}>{busyId === template.id ? t("common.loading") : <><Icon name="activity"/>{t("checklists.startInspection")}</>}</button>}
            </div>
          </article>;
        })}</div>}
      </LoadState>
    </SectionCard>

    <SectionCard title={t("checklists.inspections")} icon="audit">
      <LoadState state={inspections} empty={t("checklists.noInspections")}>
        {(items) => <div className="workflow-list">{items.map((item) => <article className="workflow-list-row" key={item.id}>
          <div><strong>{item.templateSnapshot.title}</strong><small>{t("checklists.templateVersion", { version: item.templateVersion })} · {formatDate(item.createdAt, true)}</small></div>
          <span className={`workflow-status workflow-status-${item.status.toLowerCase()}`}>{t(inspectionStatusLabel[item.status])}</span>
          <button className="secondary" type="button" onClick={() => setSelectedInspectionId(item.id)}>{t("checklists.openInspection")}</button>
        </article>)}</div>}
      </LoadState>
    </SectionCard>

    {selectedInspectionId && <SectionCard title={t("checklists.openInspection")} icon="activity" actions={<button type="button" className="secondary" onClick={() => setSelectedInspectionId("")}>{t("checklists.closeInspection")}</button>}>
      <LoadState state={inspection}>
        {(current) => {
          const snapshotItems = normalizeTemplateItems(current.templateSnapshot.items);
          const answers = answerDrafts[current.id] ?? normalizeAnswers(current.answers);
          const editable = ["IN_PROGRESS", "NEEDS_REVISION"].includes(current.status);
          return <div className="checklist-inspection-detail">
            <div className="workflow-record-heading"><div><span className="workflow-record-kind">{t("checklists.templateVersion", { version: current.templateVersion })}</span><h3>{current.templateSnapshot.title}</h3></div><span className={`workflow-status workflow-status-${current.status.toLowerCase()}`}>{t(inspectionStatusLabel[current.status])}</span></div>
            {snapshotItems.map((item) => {
              const answer = answers.find((candidate) => candidate.itemId === item.id);
              return <article className="checklist-question" key={item.id}>
                <h4>{item.label}{item.required && <span aria-label={t("checklists.requiredItem")}> *</span>}</h4>
                {editable ? <div className="checklist-answer-fields"><label>{t("checklists.questionResult")}<StyledSelect value={answer?.result ?? ""} onChange={(event) => event.target.value ? updateAnswer(current, item, { result: event.target.value as ChecklistAnswer["result"] }) : undefined}><option value="">{t("checklists.chooseResult")}</option><option value="PASS">{t("checklists.pass")}</option><option value="FAIL">{t("checklists.fail")}</option><option value="NOT_APPLICABLE">{t("checklists.notApplicable")}</option></StyledSelect></label><label>{t("checklists.findingNote")}<textarea rows={2} maxLength={4000} value={answer?.note ?? ""} onChange={(event) => updateAnswer(current, item, { note: event.target.value })} required={answer?.result === "FAIL"}/></label></div> : <p>{answer ? t(answer.result === "PASS" ? "checklists.pass" : answer.result === "FAIL" ? "checklists.fail" : "checklists.notApplicable") : "—"}{answer?.note && <span className="checklist-answer-note">{answer.note}</span>}</p>}
              </article>;
            })}
            {editable && <div className="workflow-record-actions"><button className="secondary" type="button" disabled={busyId === current.id} onClick={() => void saveAnswers(current, false)}>{t("checklists.saveAnswers")}</button><button className="primary" type="button" disabled={busyId === current.id} onClick={() => void saveAnswers(current, true)}>{t("checklists.submitInspection")}</button></div>}
            {canManage && current.status === "SUBMITTED" && <div className="checklist-review"><h4>{t("checklists.review")}</h4><label>{t("checklists.reviewNote")}<textarea rows={3} maxLength={4000} value={reviewNote} onChange={(event) => setReviewNote(event.target.value)}/></label><div className="workflow-record-actions"><button className="primary" type="button" disabled={busyId === current.id} onClick={() => void reviewInspection(current, "APPROVED")}>{t("checklists.approve")}</button><button className="secondary" type="button" disabled={busyId === current.id} onClick={() => void reviewInspection(current, "NEEDS_REVISION")}>{t("checklists.requestRevision")}</button></div></div>}
            {current.reviewNote && <div className="workflow-review-note"><strong>{t("checklists.reviewNote")}</strong><p>{current.reviewNote}</p></div>}
          </div>;
        }}
      </LoadState>
    </SectionCard>}
  </section>;
}
