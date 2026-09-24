export type AutoSaveValue = string | boolean | string[];
export type AutoSaveDraft = Record<string, AutoSaveValue>;
export type AutoSaveStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function isExcluded(name: string, excludedFields: readonly string[]) {
  return excludedFields.includes(name);
}

/** Read a browser draft without allowing malformed or unexpected values to break a form. */
export function readStoredDraft(storage: AutoSaveStorage | undefined, key: string): AutoSaveDraft | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const draft: AutoSaveDraft = {};
    for (const [name, fieldValue] of Object.entries(value)) {
      if (typeof fieldValue === "string" || typeof fieldValue === "boolean" || (Array.isArray(fieldValue) && fieldValue.every((item) => typeof item === "string"))) {
        draft[name] = fieldValue as AutoSaveValue;
      }
    }
    return draft;
  } catch {
    return null;
  }
}

/** Persist a draft synchronously so a page close immediately after typing does not lose the last character. */
export function writeStoredDraft(storage: AutoSaveStorage | undefined, key: string, draft: AutoSaveDraft): boolean {
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function clearStoredDraft(storage: AutoSaveStorage | undefined, key: string): void {
  try { storage?.removeItem(key); } catch { /* Storage can be unavailable in private browsing. */ }
}

export function sanitizeDraft(draft: AutoSaveDraft, excludedFields: readonly string[] = []): AutoSaveDraft {
  return Object.fromEntries(Object.entries(draft).filter(([name]) => !isExcluded(name, excludedFields))) as AutoSaveDraft;
}

/** Snapshot uncontrolled form fields while deliberately excluding credentials and file objects. */
export function snapshotForm(form: HTMLFormElement, excludedFields: readonly string[] = ["password", "currentPassword", "newPassword", "confirmPassword", "token", "file"]): AutoSaveDraft {
  const snapshot: AutoSaveDraft = {};
  for (const field of Array.from(form.elements)) {
    if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) continue;
    const name = field.name;
    if (!name || isExcluded(name, excludedFields)) continue;
    if (field instanceof HTMLInputElement) {
      if (["file", "password"].includes(field.type)) continue;
      if (field.type === "checkbox") { snapshot[name] = field.checked; continue; }
      if (field.type === "radio") { if (field.checked) snapshot[name] = field.value; continue; }
    }
    if (field instanceof HTMLSelectElement && field.multiple) {
      snapshot[name] = Array.from(field.selectedOptions, (option) => option.value);
      continue;
    }
    snapshot[name] = field.value;
  }
  return sanitizeDraft(snapshot, excludedFields);
}

/** Restore a draft into uncontrolled inputs. React-controlled fields remain authoritative. */
export function restoreForm(form: HTMLFormElement, draft: AutoSaveDraft): void {
  for (const field of Array.from(form.elements)) {
    if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) continue;
    const value = draft[field.name];
    if (value === undefined) continue;
    if (field instanceof HTMLInputElement && field.type === "checkbox") { field.checked = typeof value === "boolean" ? value : Array.isArray(value) && value.includes(field.value); continue; }
    if (field instanceof HTMLInputElement && field.type === "radio") { field.checked = value === field.value; continue; }
    if (field instanceof HTMLSelectElement && field.multiple) {
      const selected = Array.isArray(value) ? value : [String(value)];
      Array.from(field.options).forEach((option) => { option.selected = selected.includes(option.value); });
      continue;
    }
    field.value = Array.isArray(value) ? value[0] ?? "" : String(value);
    if (field instanceof HTMLSelectElement) field.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

export function scopedDraftKey(scope: string, userId?: string | null, organizationId?: string | null): string {
  return `nivasafe-form-draft:v1:${scope}:${userId ?? "guest"}:${organizationId || "none"}`;
}
