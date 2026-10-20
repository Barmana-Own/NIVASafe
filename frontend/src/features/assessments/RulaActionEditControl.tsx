import { useRef, useState } from "react";
import { Icon } from "../../components/UI";
import { useI18n } from "../../i18n";
import type { RulaRegisterAction } from "./RulaActionRegister";

export function RulaActionEditControl<T extends RulaRegisterAction>({ action, busy, onUpdate }: {
  action: T; busy?: boolean; onUpdate: (action: T) => Promise<void>;
}) {
  const { t, locale } = useI18n();
  const details = useRef<HTMLDetailsElement>(null);
  const [draft, setDraft] = useState(action);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const titleKey = locale === "fa" ? "titleFa" : "titleEn";
  const descriptionKey = locale === "fa" ? "descriptionFa" : "descriptionEn";
  async function save() {
    if (saving || busy) return;
    if (draft[titleKey].trim().length < 2 || draft[descriptionKey].trim().length < 2) {
      setError(t("assessment.rulaActionEditRequired")); return;
    }
    setSaving(true); setError("");
    try { await onUpdate(draft); if (details.current) details.current.open = false; }
    catch (reason) { setError(reason instanceof Error ? reason.message : t("assessment.rulaActionEditRequired")); }
    finally { setSaving(false); }
  }
  return <details ref={details} className="rula-evaluation-action-editor">
    <summary className="icon-button" aria-label={`${t("assessment.editRiskRow")}: ${action[titleKey]}`} onClick={event => {
      if (busy || saving) { event.preventDefault(); return; }
      if (!details.current?.open) { setDraft(action); setError(""); }
    }}><Icon name="edit" size={15}/></summary>
    <div className="rula-inline-action-editor" aria-busy={saving}>
      {error && <div className="alert error" role="alert">{error}</div>}
      <label>{t("actions.action")}<input maxLength={240} disabled={busy || saving} value={draft[titleKey]} onChange={event => setDraft({ ...draft, [titleKey]: event.target.value })}/></label>
      <label>{t("assessment.rulaActionDetails")}<textarea maxLength={1200} rows={3} disabled={busy || saving} value={draft[descriptionKey]} onChange={event => setDraft({ ...draft, [descriptionKey]: event.target.value })}/></label>
      <label>{t("actions.priority")}<select disabled={busy || saving} value={draft.priority} onChange={event => setDraft({ ...draft, priority: event.target.value as T["priority"] })}>{(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).map(priority => <option key={priority} value={priority}>{t(`status.${priority.toLowerCase()}`)}</option>)}</select></label>
      <div className="page-actions-inline"><button type="button" className="primary" disabled={busy || saving} onClick={() => void save()}>{t("common.save")}</button><button type="button" className="ghost" disabled={saving} onClick={() => { if (details.current) details.current.open = false; }}>{t("common.cancel")}</button></div>
    </div>
  </details>;
}
