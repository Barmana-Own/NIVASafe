import { useEffect, useRef, useState, type FormEventHandler, type FormHTMLAttributes, type ReactNode } from "react";
import { del as deleteIndexedDraft, get as getIndexedDraft, set as setIndexedDraft } from "idb-keyval";
import { Icon } from "../components/UI";
import { useI18n } from "../i18n";
import { clearStoredDraft, readStoredDraft, restoreForm, snapshotForm, writeStoredDraft, type AutoSaveDraft } from "./autoSave";

type AutoSaveFormProps = Omit<FormHTMLAttributes<HTMLFormElement>, "children" | "onSubmit"> & {
  storageKey: string;
  children: ReactNode;
  className?: string;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  excludeFields?: readonly string[];
};

type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Form-level autosave for uncontrolled forms. It persists on every input event,
 * restores the last draft on mount, and keeps credentials/files out of storage.
 */
export function AutoSaveForm({ storageKey, children, className, onSubmit, excludeFields, ...rest }: AutoSaveFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const draftRef = useRef<AutoSaveDraft | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  useEffect(() => {
    let active = true;
    const form = formRef.current;
    if (!form) return undefined;
    const storage = browserStorage();
    const stored = readStoredDraft(storage, storageKey);
    if (stored) { draftRef.current = stored; restoreForm(form, stored); }
    if (!stored) {
      void getIndexedDraft<AutoSaveDraft>(storageKey).then((draft) => {
        if (active && draft && typeof draft === "object" && !Array.isArray(draft) && formRef.current) { draftRef.current = draft; restoreForm(formRef.current, draft); }
      }).catch(() => { if (active) setSaveState("error"); });
    }
    const observer = typeof MutationObserver === "undefined" ? null : new MutationObserver(() => { if (draftRef.current) restoreForm(form, draftRef.current); });
    observer?.observe(form, { childList: true, subtree: true });
    const persist = () => {
      const draft = snapshotForm(form, excludeFields);
      draftRef.current = draft;
      setSaveState("saving");
      const written = writeStoredDraft(storage, storageKey, draft);
      if (written) { setSaveState("saved"); setLastSaved(new Date()); return; }
      void setIndexedDraft(storageKey, draft).then(() => { if (active) { setSaveState("saved"); setLastSaved(new Date()); } }).catch(() => { if (active) setSaveState("error"); });
    };
    form.addEventListener("input", persist);
    form.addEventListener("change", persist);
    return () => { active = false; observer?.disconnect(); form.removeEventListener("input", persist); form.removeEventListener("change", persist); };
  }, [excludeFields, storageKey]);

  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => { draftRef.current = null; setSaveState("idle"); setLastSaved(null); onSubmit?.(event); };
  return <form {...rest} ref={formRef} className={className} onSubmit={handleSubmit}>
    {children}
    <AutoSaveStatus state={saveState} lastSaved={lastSaved}/>
  </form>;
}

export function AutoSaveStatus({ state = "saved", lastSaved }: { state?: SaveState; lastSaved: Date | null }) {
  const { locale, t } = useI18n();
  const timeLocale = locale === "en" ? "en-US" : "fa-IR";
  const label = state === "saving" ? t("assessment.autosaveSaving") : state === "error" ? t("assessment.autosaveError") : lastSaved ? `${t("assessment.autosaveActive")} · ${t("assessment.lastSaved", { time: lastSaved.toLocaleTimeString(timeLocale, { hour: "2-digit", minute: "2-digit" }) })}` : t("assessment.autosaveActive");
  return <small className={`autosave-status ${state === "error" ? "autosave-error" : ""}`} role="status"><Icon name={state === "error" ? "warning" : "check"} size={14}/>{label}</small>;
}

export async function clearAutoSaveDraft(storageKey: string): Promise<void> {
  clearStoredDraft(browserStorage(), storageKey);
  await deleteIndexedDraft(storageKey).catch(() => undefined);
}

function browserStorage(): Storage | undefined {
  try { return window.localStorage; } catch { return undefined; }
}
