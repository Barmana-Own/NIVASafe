import { Fragment, useState } from "react";
import { Icon, SectionCard, StatusBadge } from "../../components/UI";
import { useI18n } from "../../i18n";

export type RulaRegisterAction = {
  id: string; titleFa: string; titleEn: string; descriptionFa: string; descriptionEn: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; status?: string;
};

export function RulaActionRegister<T extends RulaRegisterAction>({
  actions, busy, onUpdate, onComplete,
}: { actions: T[]; busy?: boolean; onUpdate?: (action: T) => Promise<void>;
  onComplete?: (action: T) => void }) {
  const { t, locale } = useI18n();
  const [editing, setEditing] = useState<T | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const text = (action: T, field: "title" | "description") =>
    locale === "fa" ? action[field === "title" ? "titleFa" : "descriptionFa"] : action[field === "title" ? "titleEn" : "descriptionEn"];
  async function save() {
    if (!editing || !onUpdate || saving) return;
    if (text(editing, "title").trim().length < 2 || text(editing, "description").trim().length < 2) {
      setError(t("assessment.rulaActionEditRequired")); return;
    }
    setSaving(true); setError("");
    try { await onUpdate(editing); setEditing(null); }
    catch (reason) { setError((reason as Error).message); }
    finally { setSaving(false); }
  }
  return <SectionCard title={t("assessment.rulaActionRegister")} description={t("assessment.rulaActionRegisterHint")} icon="actions">
    {error && <div className="alert error" role="alert">{error}</div>}
    <div className="table-wrap report-data-table-wrap"><table className="assessment-report-table rula-action-register-table assessment-mobile-table">
      <thead><tr><th>{t("assessment.row")}</th><th>{t("actions.action")}</th><th>{t("actions.priority")}</th><th>{t("assessment.rulaActionState")}</th><th>{t("assessment.operations")}</th></tr></thead>
      <tbody>{actions.map((action, index) => <Fragment key={action.id}>
        <tr>
          <td data-label={t("assessment.row")}>{(index + 1).toLocaleString(locale === "fa" ? "fa-IR" : "en-US")}</td>
          <td data-label={t("actions.action")}><div className="report-table-stack"><strong>{text(action, "title")}</strong><span>{text(action, "description")}</span></div></td>
          <td data-label={t("actions.priority")}><StatusBadge value={action.priority}/></td>
          <td data-label={t("assessment.rulaActionState")}>{t(action.status === "COMPLETED" ? "report.completed" : action.status === "UNSELECTED" ? "report.remaining" : "report.inProgress")}</td>
          <td data-label={t("assessment.operations")}><div className="report-table-actions">
            {onUpdate && <button type="button" className="icon-button" disabled={busy || saving} aria-label={`${t("assessment.editRiskRow")}: ${text(action, "title")}`} onClick={() => { setEditing(action); setError(""); }}><Icon name="edit" size={16}/></button>}
            {onComplete && <button type="button" className="icon-button" disabled={busy || saving || action.status === "COMPLETED"} aria-label={`${t("assessment.rulaConfirmActionCompletion")}: ${text(action, "title")}`} onClick={() => onComplete(action)}><Icon name="check" size={16}/></button>}
          </div></td>
        </tr>
        {editing?.id === action.id && <tr className="rula-action-editor-row"><td colSpan={5} data-label={t("assessment.editRiskRow")}>
          <div className="rula-inline-action-editor" onKeyDown={(event) => { if (event.key === "Enter" && event.target instanceof HTMLInputElement) { event.preventDefault(); void save(); } }}>
            <label>{t("actions.action")}<input maxLength={240} value={text(editing, "title")} onChange={(event) => setEditing({ ...editing, [locale === "fa" ? "titleFa" : "titleEn"]: event.target.value })}/></label>
            <label>{t("assessment.rulaActionDetails")}<textarea maxLength={1200} rows={3} value={text(editing, "description")} onChange={(event) => setEditing({ ...editing, [locale === "fa" ? "descriptionFa" : "descriptionEn"]: event.target.value })}/></label>
            <label>{t("actions.priority")}<select value={editing.priority} onChange={(event) => setEditing({ ...editing, priority: event.target.value as T["priority"] })}>{(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).map(priority => <option key={priority} value={priority}>{t(`status.${priority.toLowerCase()}`)}</option>)}</select></label>
            <div className="page-actions-inline"><button type="button" className="primary" disabled={busy || saving} onClick={() => void save()}>{t("common.save")}</button><button type="button" className="ghost" disabled={saving} onClick={() => setEditing(null)}>{t("common.cancel")}</button></div>
          </div>
        </td></tr>}
      </Fragment>)}</tbody>
    </table></div>
  </SectionCard>;
}
