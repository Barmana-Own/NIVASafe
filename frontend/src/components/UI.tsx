import { Children, cloneElement, createContext, forwardRef, isValidElement, useContext, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type HTMLAttributes, type KeyboardEvent as ReactKeyboardEvent, type ReactElement, type ReactNode } from "react";
import { getCurrentLocale } from "../api/client";
import { translate, useI18n } from "../i18n";
import type { AppTheme } from "../theme";
import { OverlayPortal, useFloatingPosition, useOverlayDialog } from "./Overlay";

export type IconName =
  | "dashboard" | "projects" | "fmea" | "rula" | "actions" | "files"
  | "knowledge" | "assistant" | "notifications" | "members" | "audit"
  | "profile" | "health" | "plus" | "search" | "download" | "trash"
  | "arrow" | "shield" | "calendar" | "user" | "check" | "warning"
  | "activity" | "chart" | "clock" | "folder" | "sparkles" | "menu" | "logout" | "eye" | "eyeOff" | "edit" | "restore";

const paths: Record<IconName, ReactNode> = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
  projects: <><path d="M3 7.5h18v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5z"/><path d="M3 8l3.2-4h5.1l2 3.5"/></>,
  fmea: <><path d="M4 4h16v16H4z"/><path d="M8 4v16M4 9h16M4 14h16"/></>,
  rula: <><circle cx="12" cy="5" r="2"/><path d="M12 7v6l-3 7M12 11l4 3M12 13l3 7M12 9L8 12"/></>,
  actions: <><path d="M9 11l2 2 4-5"/><path d="M5 3h11l3 3v15H5z"/><path d="M16 3v4h4"/></>,
  files: <><path d="M5 3h9l5 5v13H5z"/><path d="M14 3v6h6"/></>,
  knowledge: <><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H12v18H7.5A3.5 3.5 0 0 0 4 23z"/><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H12v18h4.5A3.5 3.5 0 0 1 20 23z"/></>,
  assistant: <><path d="M12 3l1.2 3.4L17 8l-3.8 1.6L12 13l-1.2-3.4L7 8l3.8-1.6z"/><path d="M5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8zM18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8z"/></>,
  notifications: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
  members: <><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M17 8h5M19.5 5.5v5"/></>,
  audit: <><path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h6M8 17h4"/></>,
  profile: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  health: <><path d="M12 21s8-4.6 8-11a4.5 4.5 0 0 0-8-2.8A4.5 4.5 0 0 0 4 10c0 6.4 8 11 8 11z"/><path d="M8 12h2l1-3 2 6 1-3h2"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  search: <><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></>,
  download: <><path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 21h16"/></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14"/></>,
  arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
  shield: <><path d="M12 3l8 3v6c0 5-3.3 8.2-8 10-4.7-1.8-8-5-8-10V6z"/><path d="M9 12l2 2 4-5"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></>,
  user: <><circle cx="12" cy="8" r="3"/><path d="M5 21a7 7 0 0 1 14 0"/></>,
  check: <path d="M5 12l4 4L19 6"/>,
  warning: <><path d="M12 3l10 18H2z"/><path d="M12 9v5M12 18h.01"/></>,
  activity: <path d="M3 12h4l2-6 4 12 2-6h6"/>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/></>,
  folder: <><path d="M3 6h7l2 2h9v11H3z"/></>,
  sparkles: <><path d="M12 2l1.4 4.6L18 8l-4.6 1.4L12 14l-1.4-4.6L6 8l4.6-1.4z"/><path d="M19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7z"/></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
  logout: <><path d="M10 5H5v14h5"/><path d="M14 8l4 4-4 4M18 12H8"/></>,
  eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.5"/></>,
  eyeOff: <><path d="M3 3l18 18"/><path d="M10.6 6.2A9.9 9.9 0 0 1 12 6c6 0 9.5 6 9.5 6a16.8 16.8 0 0 1-3.1 3.7M6.2 6.9C3.6 8.5 2.5 12 2.5 12s3.5 6 9.5 6c1.1 0 2.1-.2 3-.5"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></>,
  edit: <><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="M13.5 7.5l3 3"/></>,
  restore: <><path d="M4 5v5h5"/><path d="M4.6 10A8 8 0 1 1 6.8 17"/></>,
};

export function Icon({ name, size = 20, className = "" }: { name: IconName; size?: number; className?: string }) {
  return <svg className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "text";
export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled"> & {
  disabled?: boolean;
  variant?: ButtonVariant;
  loading?: boolean;
  loadingLabel?: ReactNode;
};

export function Button({ variant = "primary", loading = false, loadingLabel, className = "", type = "button", disabled, children, ...props }: ButtonProps) {
  return <button {...props} type={type} className={`ui-button ui-button-${variant} ${className}`.trim()} disabled={disabled || loading} aria-busy={loading || undefined}>
    {loading && <span className="button-spinner" aria-hidden="true"/>}
    {loading && loadingLabel ? loadingLabel : children}
  </button>;
}

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label"> & {
  icon: IconName;
  label: string;
  iconSize?: number;
  tone?: "default" | "accent" | "danger";
  loading?: boolean;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton({ icon, label, iconSize = 20, tone = "default", loading = false, className = "", type = "button", disabled, title, ...props }, ref) {
  return <button ref={ref} {...props} type={type} className={`ui-icon-button icon-button${tone === "default" ? "" : ` ${tone}`}${loading ? " is-loading" : ""} ${className}`.trim()} disabled={disabled || loading} aria-label={label} aria-busy={loading || undefined} title={title ?? label}>
    {loading ? <span className="button-spinner" aria-hidden="true"/> : <Icon name={icon} size={iconSize}/>}
  </button>;
});

export function FormField({ label, htmlFor, hint, error, required = false, className = "", children }: { label: ReactNode; htmlFor?: string; hint?: ReactNode; error?: ReactNode; required?: boolean; className?: string; children: ReactNode }) {
  const hintId = hint && htmlFor ? `${htmlFor}-hint` : undefined;
  const errorId = error && htmlFor ? `${htmlFor}-error` : undefined;
  const child = isValidElement(children) ? children as ReactElement<Record<string, unknown>> : null;
  const childProps = child?.props ?? {};
  const describedBy = [childProps["aria-describedby"], hintId, errorId].filter((value): value is string => typeof value === "string" && value.length > 0).join(" ");
  const control = child ? cloneElement(child, {
    ...(required ? { required: true } : {}),
    ...(error ? { "aria-invalid": true } : {}),
    ...(describedBy ? { "aria-describedby": describedBy } : {}),
  }) : children;
  return <div className={`form-field${error ? " has-error" : ""} ${className}`.trim()}>
    <label className="form-field-label" htmlFor={htmlFor}><span>{label}</span>{required && <span className="required-label" aria-hidden="true">*</span>}</label>
    {control}
    {hint && <small id={hintId} className="field-hint">{hint}</small>}
    {error && <small id={errorId} className="field-error" role="alert">{error}</small>}
  </div>;
}

export type AlertTone = "error" | "success" | "warning" | "info";
const alertIcons: Record<AlertTone, IconName> = { error: "warning", success: "check", warning: "warning", info: "activity" };

export function Alert({ tone = "info", icon, role, className = "", children, ...props }: HTMLAttributes<HTMLDivElement> & { tone?: AlertTone; icon?: IconName }) {
  return <div {...props} className={`ui-alert alert ${tone} ${className}`.trim()} role={role ?? (tone === "error" ? "alert" : "status")}>
    <Icon name={icon ?? alertIcons[tone]}/><span>{children}</span>
  </div>;
}

export function LoadingState({ label, compact = false, className = "" }: { label?: ReactNode; compact?: boolean; className?: string }) {
  const { t } = useI18n();
  return <div className={`loading-state state${compact ? " compact" : ""} ${className}`.trim()} role="status" aria-live="polite"><div className="spinner"/><span>{label ?? t("common.loading")}</span></div>;
}

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger" | "orange";
export function Badge({ tone = "neutral", className = "", children }: { tone?: BadgeTone; className?: string; children: ReactNode }) {
  return <span className={`ui-badge badge-${tone} ${className}`.trim()}>{children}</span>;
}

export function TableContainer({ children, className = "", mobileCards = true }: { children: ReactNode; className?: string; mobileCards?: boolean }) {
  return <div className={`table-wrap responsive-table-container ${className}`.trim()} data-responsive={mobileCards ? "cards" : "scroll"}>{children}</div>;
}

type StyledOptionProps = { value?: string | number; disabled?: boolean; children?: ReactNode };
export type StyledSelectChangeEvent = { target: { value: string }; currentTarget: { value: string } };
export type StyledSelectProps = {
  children?: ReactNode;
  className?: string;
  id?: string;
  name?: string;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (event: StyledSelectChangeEvent) => void;
  required?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
  "data-required-error"?: string;
};

export function StyledSelect({ children, className = "", id, name, value, defaultValue, onChange, required, disabled, ...ariaProps }: StyledSelectProps) {
  const options = Children.toArray(children).flatMap((child) => {
    if (!isValidElement<StyledOptionProps>(child)) return [];
    return [{ value: String(child.props.value ?? ""), label: child.props.children, disabled: Boolean(child.props.disabled) }];
  });
  const initialValue = String(value ?? defaultValue ?? options.find((option) => !option.disabled)?.value ?? "");
  const [internalValue, setInternalValue] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(() => Math.max(0, options.findIndex((option) => option.value === initialValue)));
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const nativeSelectRef = useRef<HTMLSelectElement>(null);
  const menuId = `styled-select-menu-${useId().replace(/:/g, "")}`;
  const menuPosition = useFloatingPosition(triggerRef, open, { minWidth: 180, maxHeight: 320 });
  const selectedValue = String(value ?? internalValue);
  const selectedIndex = options.findIndex((option) => option.value === selectedValue);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  useEffect(() => {
    if (value !== undefined) setInternalValue(String(value));
  }, [value]);

  useEffect(() => {
    const select = nativeSelectRef.current;
    if (!select) return undefined;
    const syncNativeValue = () => {
      const nextValue = String(select.value);
      const effectiveValue = value === undefined ? nextValue : String(value);
      if (value === undefined) setInternalValue(nextValue);
      const nextIndex = options.findIndex((option) => option.value === effectiveValue);
      setHighlightedIndex(Math.max(0, nextIndex));
    };
    select.addEventListener("change", syncNativeValue);
    syncNativeValue();
    return () => select.removeEventListener("change", syncNativeValue);
  }, [options, value]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function nextEnabledIndex(start: number, step: 1 | -1) {
    let index = start;
    while (index >= 0 && index < options.length) {
      if (!options[index].disabled) return index;
      index += step;
    }
    return Math.max(0, Math.min(options.length - 1, start));
  }

  function moveHighlight(step: 1 | -1) {
    if (!options.length) return;
    const start = highlightedIndex < 0 ? (step === 1 ? -1 : options.length) : highlightedIndex;
    setHighlightedIndex(nextEnabledIndex(start + step, step));
  }

  function choose(nextIndex: number) {
    const option = options[nextIndex];
    if (!option || option.disabled) return;
    setInternalValue(option.value);
    if (nativeSelectRef.current) {
      nativeSelectRef.current.value = option.value;
      nativeSelectRef.current.dispatchEvent(new Event("change", { bubbles: true }));
    }
    onChange?.({ target: { value: option.value }, currentTarget: { value: option.value } });
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (disabled || !options.length) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setHighlightedIndex(nextEnabledIndex(selectedIndex >= 0 ? selectedIndex : 0, event.key === "ArrowDown" ? 1 : -1));
        setOpen(true);
      } else moveHighlight(event.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const index = event.key === "Home" ? options.findIndex((option) => !option.disabled) : [...options].map((option, index) => ({ option, index })).reverse().find(({ option }) => !option.disabled)?.index ?? 0;
      setHighlightedIndex(Math.max(0, index));
      setOpen(true);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) choose(highlightedIndex); else { setHighlightedIndex(Math.max(0, selectedIndex)); setOpen(true); }
    }
  }

  const wrapperClass = `styled-select${open ? " is-open" : ""}${disabled ? " is-disabled" : ""} ${className}`.trim();
  const menuStyle = {
    top: menuPosition?.top ?? -10000,
    left: menuPosition?.left ?? -10000,
    width: menuPosition?.width ?? 180,
    maxHeight: menuPosition?.maxHeight ?? 320,
    direction: menuPosition?.direction,
    visibility: menuPosition ? "visible" : "hidden",
  } as const;
  return <div ref={rootRef} className={wrapperClass} onBlur={(event) => { const nextTarget = event.relatedTarget as Node | null; if (!rootRef.current?.contains(nextTarget) && !menuRef.current?.contains(nextTarget)) setOpen(false); }}>
    <select ref={nativeSelectRef} className="styled-select-native" name={name} value={selectedValue} onChange={() => undefined} required={required} disabled={disabled} tabIndex={-1} aria-hidden="true" {...ariaProps}>
      {children}
    </select>
    <button ref={triggerRef} id={id} type="button" role="combobox" className="styled-select-trigger" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-controls={menuId} aria-activedescendant={open && highlightedIndex >= 0 ? `${menuId}-option-${highlightedIndex}` : undefined} aria-autocomplete="none" aria-required={required} {...ariaProps} onClick={() => { setHighlightedIndex(nextEnabledIndex(selectedIndex >= 0 ? selectedIndex : 0, 1)); setOpen((current) => !current); }} onKeyDown={handleTriggerKeyDown}>
      <span className={`styled-select-value${selectedOption ? "" : " is-placeholder"}`}>{selectedOption?.label ?? "—"}</span>
      <span className={`styled-select-chevron${open ? " is-open" : ""}`} aria-hidden="true">⌄</span>
    </button>
    {open && <OverlayPortal><div ref={menuRef} id={menuId} className="styled-select-menu" role="listbox" aria-label={ariaProps["aria-label"]} style={menuStyle}>
      {options.map((option, index) => <button id={`${menuId}-option-${index}`} key={`${option.value}-${index}`} type="button" role="option" aria-selected={option.value === selectedValue} className={`styled-select-option${option.value === selectedValue ? " is-selected" : ""}${index === highlightedIndex ? " is-highlighted" : ""}`} disabled={option.disabled} onMouseEnter={() => setHighlightedIndex(index)} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(index)}><span>{option.label}</span>{option.value === selectedValue && <span className="styled-select-check" aria-hidden="true">✓</span>}</button>)}
    </div></OverlayPortal>}
  </div>;
}

export function ThemeSwitcher({ theme, onChange, className = "" }: { theme: AppTheme; onChange: (theme: AppTheme) => void; className?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = `theme-menu-${useId().replace(/:/g, "")}`;
  const menuPosition = useFloatingPosition(pickerRef, open, { minWidth: 174, maxHeight: 320 });
  const options: Array<{ value: AppTheme; labelKey: string }> = [
    { value: "blue", labelKey: "shell.themeBlue" },
    { value: "white", labelKey: "shell.themeWhite" },
  ];
  const selectedOption = options.find((option) => option.value === theme) ?? options[0];
  const alternateOption = options.find((option) => option.value !== selectedOption.value) ?? options[1];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (pickerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function chooseTheme(next: AppTheme) {
    onChange(next);
    setOpen(false);
    triggerRef.current?.focus();
  }

  const selectedLabel = t(selectedOption.labelKey);
  const alternateLabel = t(alternateOption.labelKey);
  const menuStyle = {
    top: menuPosition?.top ?? -10000,
    left: menuPosition?.left ?? -10000,
    width: menuPosition?.width ?? 174,
    maxHeight: menuPosition?.maxHeight ?? 320,
    direction: menuPosition?.direction,
    visibility: menuPosition ? "visible" : "hidden",
  } as const;
  return <div ref={pickerRef} className={`theme-switcher ${open ? "open" : ""} ${className}`.trim()} role="group" aria-label={t("shell.chooseTheme")} data-testid="theme-switcher">
    <button ref={triggerRef} type="button" className="theme-option theme-trigger selected" data-theme-option={selectedOption.value} aria-pressed="true" aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} aria-label={`${selectedLabel}، ${t("shell.chooseTheme")}`} title={t("shell.chooseTheme")} onClick={() => setOpen((value) => !value)}>
      <span className="theme-swatch" aria-hidden="true"/><span className="theme-option-label">{selectedLabel}</span><span className={`theme-switch-chevron ${open ? "open" : ""}`} aria-hidden="true">⌄</span>
    </button>
    {open && <OverlayPortal><div ref={menuRef} id={menuId} className="theme-options-menu" role="menu" aria-label={t("shell.chooseTheme")} style={menuStyle}>
      <button type="button" className="theme-option theme-menu-option" data-theme-option={alternateOption.value} role="menuitem" aria-label={alternateLabel} title={alternateLabel} onClick={() => chooseTheme(alternateOption.value)}>
        <span className="theme-swatch" aria-hidden="true"/><span className="theme-option-label">{alternateLabel}</span>
      </button>
    </div></OverlayPortal>}
  </div>;
}

export function PageActions({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`page-actions ${className}`.trim()}>{children}</div>;
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <div className="page-header">
    <div className="page-title-block">{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h2>{title}</h2>{description && <p>{description}</p>}</div>
    {actions && <PageActions>{actions}</PageActions>}
  </div>;
}

export type SectionCardProps = { title?: string; description?: string; icon?: IconName; actions?: ReactNode; className?: string; children: ReactNode };
export function SectionCard({ title, description, icon, actions, className = "", children }: SectionCardProps) {
  return <section className={`surface ${className}`.trim()}>
    {(title || actions) && <div className="surface-head"><div className="surface-title">{icon && <span className="surface-icon"><Icon name={icon}/></span>}<div>{title && <h3>{title}</h3>}{description && <p>{description}</p>}</div></div>{actions && <div className="surface-actions">{actions}</div>}</div>}
    <div className="surface-body">{children}</div>
  </section>;
}

export function Surface(props: SectionCardProps) {
  return <SectionCard {...props}/>;
}

export function EmptyState({ icon = "folder", title, description, action }: { icon?: IconName; title: string; description?: string; action?: ReactNode }) {
  return <div className="empty-state"><span className="empty-icon"><Icon name={icon} size={28}/></span><h3>{title}</h3>{description && <p>{description}</p>}{action}</div>;
}

const formNavigationSelector = [
  'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="file"])',
  "textarea",
  "select",
  '[role="combobox"]',
].join(",");

function isVisibleInteractionField(field: HTMLElement) {
  if (field.hidden || field.getAttribute("aria-hidden") === "true") return false;
  if (field.closest("[hidden], [aria-hidden=\"true\"]")) return false;
  return field.getClientRects().length > 0;
}

export function FormInteractionEnhancer() {
  useEffect(() => {
    let firstScrollFrame = 0;
    let secondScrollFrame = 0;

    function moveToNextField(event: globalThis.KeyboardEvent) {
      if (event.defaultPrevented || event.key !== "Enter" || event.isComposing) return;
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      const inputType = target.type.toLowerCase();
      if (["hidden", "checkbox", "radio", "button", "submit", "reset", "file"].includes(inputType)) return;
      if (target.dataset.enterNext === "false") return;
      const form = target.form;
      if (!form || (target.getAttribute("role") === "combobox" && target.getAttribute("aria-expanded") === "true")) return;
      const fields = Array.from(form.querySelectorAll<HTMLElement>(formNavigationSelector)).filter((field) => {
        if (!isVisibleInteractionField(field)) return false;
        if (field.getAttribute("aria-disabled") === "true" || field.getAttribute("tabindex") === "-1") return false;
        if (field instanceof HTMLInputElement && ["hidden", "checkbox", "radio", "button", "submit", "reset", "file"].includes(field.type.toLowerCase())) return false;
        return !field.hasAttribute("disabled");
      });
      const currentIndex = fields.indexOf(target);
      const nextField = currentIndex >= 0 ? fields[currentIndex + 1] : undefined;
      if (!nextField) return;
      event.preventDefault();
      nextField.focus({ preventScroll: true });
      nextField.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest", inline: "nearest" });
    }

    function scrollToOpenedPanel(event: MouseEvent) {
      const eventTarget = event.target;
      if (!(eventTarget instanceof Element)) return;
      const trigger = eventTarget.closest<HTMLElement>("[data-scroll-target]");
      if (!trigger || trigger.dataset.scrollOnOpen === "false") return;
      if (trigger.getAttribute("aria-expanded") === "true" && trigger.dataset.scrollOnOpen !== "always") return;
      const selector = trigger.dataset.scrollTarget;
      if (!selector) return;
      const focusSelector = trigger.dataset.scrollFocus;
      firstScrollFrame = window.requestAnimationFrame(() => {
        secondScrollFrame = window.requestAnimationFrame(() => {
          const panel = document.querySelector<HTMLElement>(selector);
          if (!panel || panel.hidden) return;
          panel.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start", inline: "nearest" });
          if (focusSelector) panel.querySelector<HTMLElement>(focusSelector)?.focus({ preventScroll: true });
        });
      });
    }

    document.addEventListener("keydown", moveToNextField);
    document.addEventListener("click", scrollToOpenedPanel);
    return () => {
      document.removeEventListener("keydown", moveToNextField);
      document.removeEventListener("click", scrollToOpenedPanel);
      window.cancelAnimationFrame(firstScrollFrame);
      window.cancelAnimationFrame(secondScrollFrame);
    };
  }, []);
  return null;
}

export function PageLoadingScreen() {
  const { direction, locale, t } = useI18n();
  const loadingLabel = t("common.pageLoading");
  return <div className="page-loading-screen" dir={direction} lang={locale} role="status" aria-live="polite" aria-label={loadingLabel}>
    <div className="page-loading-card">
      <span className="page-loading-mark" aria-hidden="true">
        <span className="page-loading-ring page-loading-ring-one" />
        <span className="page-loading-ring page-loading-ring-two" />
        <img src="/brand/nivasafe-icon.png" alt="" />
      </span>
      <span className="page-loading-copy"><strong>{t("brand.name")}</strong><span>{loadingLabel}</span><span className="page-loading-dots" aria-hidden="true"><i /><i /><i /></span></span>
    </div>
  </div>;
}

export function Modal({ open, title, children, actions, onClose, closeLabel = "Close", describedBy, size = "medium", className = "" }: { open: boolean; title: ReactNode; children?: ReactNode; actions?: ReactNode; onClose?: () => void; closeLabel?: string; describedBy?: string; size?: "small" | "medium" | "large"; className?: string }) {
  const titleId = useId().replace(/:/g, "");
  const dialogRef = useRef<HTMLElement>(null);
  useOverlayDialog(open, onClose, dialogRef);

  if (!open) return null;
  return <OverlayPortal><div className="modal-backdrop dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}>
    <section ref={dialogRef} className={`modal app-dialog modal-${size} ${className}`.trim()} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={describedBy} tabIndex={-1}>
      <div className="modal-head"><h2 id={titleId}>{title}</h2>{onClose && <button type="button" className="modal-close" aria-label={closeLabel} title={closeLabel} onClick={onClose}>×</button>}</div>
      {children && <div className="modal-body">{children}</div>}
      {actions && <div className="modal-actions dialog-actions">{actions}</div>}
    </section>
  </div></OverlayPortal>;
}

type DialogState = { kind: "confirm"; message: string; resolve: (value: boolean) => void } | { kind: "prompt"; message: string; resolve: (value: string | null) => void } | null;
type DialogApi = { confirm: (message: string) => Promise<boolean>; prompt: (message: string, initialValue?: string) => Promise<string | null>; view: ReactNode };
const DialogContext = createContext<DialogApi | null>(null);

export function DialogProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [state, setState] = useState<DialogState>(null);
  const [inputValue, setInputValue] = useState("");
  const stateRef = useRef<DialogState>(null);
  function settleCurrent(value: boolean | string | null, clearView = true) {
    const current = stateRef.current;
    if (!current) return;
    if (current.kind === "confirm") current.resolve(value === true);
    else current.resolve(typeof value === "string" ? value : null);
    stateRef.current = null;
    if (clearView) setState(null);
  }
  function confirm(message: string) { return new Promise<boolean>((resolve) => { settleCurrent(false); setInputValue(""); const next: DialogState = { kind: "confirm", message, resolve }; stateRef.current = next; setState(next); }); }
  function prompt(message: string, initialValue = "") { return new Promise<string | null>((resolve) => { settleCurrent(null); setInputValue(initialValue); const next: DialogState = { kind: "prompt", message, resolve }; stateRef.current = next; setState(next); }); }
  function close(value: boolean | string | null) { settleCurrent(value); }
  useEffect(() => () => { settleCurrent(null, false); }, []);
  const view = <Modal open={Boolean(state)} title={t("dialog.confirmOperation")} closeLabel={t("common.close")} describedBy="dialog-message" onClose={() => close(false)}>
    {state && <><p id="dialog-message">{state.message}</p>{state.kind === "prompt" && <input className="dialog-input" autoFocus value={inputValue} aria-label={t("dialog.newValue")} onChange={(event) => setInputValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); close(inputValue.trim()); } if (event.key === "Escape") { event.preventDefault(); close(null); } }}/>}<div className="dialog-actions"><Button variant="ghost" onClick={() => close(state.kind === "confirm" ? false : null)}>{t("dialog.cancel")}</Button><Button onClick={() => close(state.kind === "prompt" ? inputValue.trim() : true)}>{state.kind === "prompt" ? t("dialog.save") : t("dialog.confirm")}</Button></div></>}
  </Modal>;
  return <DialogContext.Provider value={{ confirm, prompt, view }}>{children}{view}</DialogContext.Provider>;
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) throw new Error("DialogProvider is required");
  return context;
}

const statusMap: Record<string, { key: string; tone: string }> = {
  ACTIVE: { key: "status.active", tone: "success" }, TRIALING: { key: "status.trialing", tone: "info" }, PENDING_PAYMENT: { key: "status.pendingPayment", tone: "warning" }, PAST_DUE: { key: "status.pastDue", tone: "danger" }, EXPIRED: { key: "status.expired", tone: "danger" }, CANCELED: { key: "status.canceled", tone: "neutral" }, DRAFT: { key: "status.draft", tone: "neutral" }, ON_HOLD: { key: "status.onHold", tone: "warning" }, COMPLETED: { key: "status.completed", tone: "success" }, ARCHIVED: { key: "status.archived", tone: "neutral" },
  OPEN: { key: "status.open", tone: "danger" }, ASSIGNED: { key: "status.assigned", tone: "info" }, IN_PROGRESS: { key: "status.inProgress", tone: "info" }, WAITING_FOR_REVIEW: { key: "status.waitingForReview", tone: "warning" }, REJECTED: { key: "status.rejected", tone: "danger" }, OVERDUE: { key: "status.overdue", tone: "danger" }, CANCELLED: { key: "status.cancelled", tone: "neutral" }, APPROVED: { key: "status.approved", tone: "success" },
  VERY_LOW: { key: "status.veryLow", tone: "success" }, LOW: { key: "status.low", tone: "success" }, MEDIUM: { key: "status.medium", tone: "warning" }, HIGH: { key: "status.high", tone: "orange" }, CRITICAL: { key: "status.critical", tone: "danger" }, SUGGESTED: { key: "status.suggested", tone: "info" },
  PENDING: { key: "status.pending", tone: "warning" }, PROCESSING: { key: "status.processing", tone: "info" }, SUCCEEDED: { key: "status.succeeded", tone: "success" }, FAILED: { key: "status.failed", tone: "danger" }, WAITING_FOR_PROVIDER: { key: "status.waitingForProvider", tone: "warning" },
};

export function StatusBadge({ value }: { value: string }) { const { t } = useI18n(); const item = statusMap[value]; return <Badge className="status-badge" tone={(item?.tone as BadgeTone | undefined) ?? "neutral"}>{item ? t(item.key) : value}</Badge>; }
export function roleLabel(role: string) { const key = ({ SUPER_ADMIN: "role.superAdmin", ORG_ADMIN: "role.orgAdmin", HSE_MANAGER: "role.hseManager", HSE_SPECIALIST: "role.hseSpecialist", HSE_OFFICER: "role.hseOfficer", EXTERNAL_AUDITOR: "role.externalAuditor", PERSONNEL: "role.personnel", ASSISTANT: "role.assistant", ASSESSOR: "role.assessor", VIEWER: "role.viewer" } as Record<string, string>)[role]; return key ? translate(key) : role; }
export function priorityLabel(value: string) { const item = statusMap[value]; return item ? translate(item.key) : value; }
export function formatDate(value?: string, withTime = false) { if (!value) return "—"; const date = new Date(value); const locale = getCurrentLocale() === "en" ? "en-US" : "fa-IR-u-ca-persian"; return Number.isNaN(date.getTime()) ? "—" : withTime ? date.toLocaleString(locale) : date.toLocaleDateString(locale); }

type DateLocale = "fa" | "en";
type CalendarDateParts = { year: number; month: number; day: number };

function toEnglishDigits(value: string) {
  return value.replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function calendarLocale(locale: DateLocale) {
  return locale === "en" ? "en-US-u-ca-gregory" : "fa-IR-u-ca-persian";
}

function calendarParts(date: Date, locale: DateLocale): CalendarDateParts {
  const parts = new Intl.DateTimeFormat(calendarLocale(locale), { year: "numeric", month: "numeric", day: "numeric", timeZone: "UTC" }).formatToParts(date);
  const getPart = (type: "year" | "month" | "day") => Number(toEnglishDigits(parts.find((part) => part.type === type)?.value ?? "0"));
  return { year: getPart("year"), month: getPart("month"), day: getPart("day") };
}

function addUtcDays(date: Date, amount: number) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function todayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function parseIsoDate(value?: string) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
}

function isoDate(date: Date) {
  return `${date.getUTCFullYear().toString().padStart(4, "0")}-${(date.getUTCMonth() + 1).toString().padStart(2, "0")}-${date.getUTCDate().toString().padStart(2, "0")}`;
}

function findCalendarDate(target: CalendarDateParts, seed: Date, locale: DateLocale) {
  for (let offset = -450; offset <= 450; offset += 1) {
    const candidate = addUtcDays(seed, offset);
    const parts = calendarParts(candidate, locale);
    if (parts.year === target.year && parts.month === target.month && parts.day === target.day) return candidate;
  }
  return seed;
}

function shiftCalendarMonth(date: Date, amount: number, locale: DateLocale) {
  const current = calendarParts(date, locale);
  const monthIndex = current.month - 1 + amount;
  const year = current.year + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12 + 1;
  return findCalendarDate({ year, month, day: 1 }, addUtcDays(date, amount * 31), locale);
}

function calendarMonthLabel(date: Date, locale: DateLocale) {
  return new Intl.DateTimeFormat(calendarLocale(locale), { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

function localizedDateLabel(date: Date, locale: DateLocale) {
  return new Intl.DateTimeFormat(calendarLocale(locale), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

export function LocalizedDateInput({ name, defaultValue = "", disabled = false, required = false, ariaLabel }: { name: string; defaultValue?: string; disabled?: boolean; required?: boolean; ariaLabel?: string }) {
  const { locale, t } = useI18n();
  const dateLocale: DateLocale = locale === "en" ? "en" : "fa";
  const initialDate = parseIsoDate(defaultValue) ?? todayUtc();
  const [selectedIso, setSelectedIso] = useState(defaultValue.slice(0, 10));
  const [viewDate, setViewDate] = useState(initialDate);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const pickerId = `localized-date-picker-${useId().replace(/:/g, "")}`;
  const pickerPosition = useFloatingPosition(triggerRef, open, { minWidth: 318, maxHeight: 480 });

  useEffect(() => {
    const syncFromHiddenInput = () => {
      const next = hiddenInputRef.current?.value ?? "";
      setSelectedIso(next);
      const nextDate = parseIsoDate(next);
      if (nextDate) setViewDate(nextDate);
    };
    const timer = window.setTimeout(syncFromHiddenInput, 0);
    const form = hiddenInputRef.current?.form;
    if (!form) return () => window.clearTimeout(timer);
    const onReset = () => window.setTimeout(syncFromHiddenInput, 0);
    form.addEventListener("reset", onReset);
    return () => { window.clearTimeout(timer); form.removeEventListener("reset", onReset); };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || pickerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); triggerRef.current?.focus(); }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("pointerdown", onPointerDown); document.removeEventListener("keydown", onKeyDown); };
  }, [open]);

  function writeValue(next: string) {
    setSelectedIso(next);
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = next;
      hiddenInputRef.current.dispatchEvent(new Event("input", { bubbles: true }));
      hiddenInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function chooseDate(date: Date) {
    writeValue(isoDate(date));
    setViewDate(date);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function clearDate() {
    writeValue("");
    setViewDate(todayUtc());
    setOpen(false);
    triggerRef.current?.focus();
  }

  const currentParts = calendarParts(viewDate, dateLocale);
  const firstDay = findCalendarDate({ year: currentParts.year, month: currentParts.month, day: 1 }, viewDate, dateLocale);
  const firstDayOffset = dateLocale === "en" ? firstDay.getUTCDay() : (firstDay.getUTCDay() + 1) % 7;
  const today = isoDate(todayUtc());
  const selectedDate = parseIsoDate(selectedIso);
  const weekdays = dateLocale === "en" ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] : ["ش", "ی", "د", "س", "چ", "پ", "ج"];
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = addUtcDays(firstDay, index - firstDayOffset);
    const parts = calendarParts(date, dateLocale);
    return { date, inMonth: parts.year === currentParts.year && parts.month === currentParts.month };
  });
  const pickerStyle = {
    top: pickerPosition?.top ?? -10000,
    left: pickerPosition?.left ?? -10000,
    width: pickerPosition?.width ?? 318,
    maxHeight: pickerPosition?.maxHeight ?? 480,
    direction: pickerPosition?.direction,
    visibility: pickerPosition ? "visible" : "hidden",
  } as const;

  return <div ref={rootRef} className={`localized-date-input${open ? " is-open" : ""}`}>
    <input ref={hiddenInputRef} type="hidden" name={name} defaultValue={defaultValue.slice(0, 10)} disabled={disabled} required={required}/>
    <button ref={triggerRef} type="button" className={`localized-date-trigger${selectedDate ? " has-value" : ""}`} disabled={disabled} aria-label={ariaLabel ?? t("actions.dueDate")} aria-haspopup="dialog" aria-expanded={open} aria-controls={pickerId} onClick={() => setOpen((value) => !value)}>
      <span className={selectedDate ? "" : "is-placeholder"}>{selectedDate ? localizedDateLabel(selectedDate, dateLocale) : t("actions.chooseDate")}</span>
      <Icon name="calendar" size={17}/>
    </button>
    {open && <OverlayPortal><div ref={pickerRef} id={pickerId} className="localized-date-popover" role="dialog" aria-label={t("actions.dueDate")} style={pickerStyle}>
      <div className="localized-date-header"><button type="button" className="localized-date-nav" aria-label={t("actions.previousMonth")} onClick={() => setViewDate((date) => shiftCalendarMonth(date, -1, dateLocale))}>‹</button><strong>{calendarMonthLabel(viewDate, dateLocale)}</strong><button type="button" className="localized-date-nav" aria-label={t("actions.nextMonth")} onClick={() => setViewDate((date) => shiftCalendarMonth(date, 1, dateLocale))}>›</button></div>
      <div className="localized-date-weekdays" aria-hidden="true">{weekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}</div>
      <div className="localized-date-grid">{cells.map(({ date, inMonth }) => { const value = isoDate(date); const isSelected = value === selectedIso; const isToday = value === today; return <button key={value} type="button" className={`localized-date-day${inMonth ? "" : " is-outside"}${isSelected ? " is-selected" : ""}${isToday ? " is-today" : ""}`} disabled={!inMonth} aria-current={isToday ? "date" : undefined} aria-pressed={isSelected} aria-label={localizedDateLabel(date, dateLocale)} onClick={() => chooseDate(date)}>{new Intl.DateTimeFormat(calendarLocale(dateLocale), { day: "numeric", timeZone: "UTC" }).format(date)}</button>; })}</div>
      {selectedDate && <button type="button" className="localized-date-clear" onClick={clearDate}>{t("actions.clearDate")}</button>}
    </div></OverlayPortal>}
  </div>;
}
