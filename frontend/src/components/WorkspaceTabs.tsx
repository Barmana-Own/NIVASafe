import type { KeyboardEvent } from "react";
import { useI18n } from "../i18n";

export function WorkspaceTabs<T extends string>({ prefix, value, tabs, onChange }: { prefix: string; value: T; tabs: Array<{ id: T; label: string; count?: number }>; onChange: (value: T) => void }) {
  const { locale, direction, t } = useI18n();
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const forwardKey = direction === "rtl" ? "ArrowLeft" : "ArrowRight";
    const backwardKey = direction === "rtl" ? "ArrowRight" : "ArrowLeft";
    let nextIndex = index;
    if (event.key === forwardKey) nextIndex = (index + 1) % tabs.length;
    else if (event.key === backwardKey) nextIndex = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;
    else return;
    event.preventDefault();
    onChange(tabs[nextIndex].id);
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
  }
  return <div className="admin-workspace-tablist" role="tablist" aria-label={t("admin.workspaceNavigation")}>
    {tabs.map((tab, index) => <button key={tab.id} id={`${prefix}-tab-${tab.id}`} className="admin-workspace-tab" type="button" role="tab" aria-selected={value === tab.id} aria-controls={`${prefix}-panel-${tab.id}`} tabIndex={value === tab.id ? 0 : -1} onClick={() => onChange(tab.id)} onKeyDown={(event) => handleKeyDown(event, index)}>
      <span>{tab.label}</span>{tab.count !== undefined && <span className="admin-tab-count">{tab.count.toLocaleString(locale === "en" ? "en-US" : "fa-IR")}</span>}
    </button>)}
  </div>;
}
