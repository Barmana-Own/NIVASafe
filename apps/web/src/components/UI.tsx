import type { ReactNode } from "react";

export type IconName =
  | "dashboard" | "projects" | "fmea" | "rula" | "actions" | "files"
  | "knowledge" | "assistant" | "notifications" | "members" | "audit"
  | "profile" | "health" | "plus" | "search" | "download" | "trash"
  | "arrow" | "shield" | "calendar" | "user" | "check" | "warning"
  | "activity" | "chart" | "clock" | "folder" | "sparkles" | "menu";

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
};

export function Icon({ name, size = 20, className = "" }: { name: IconName; size?: number; className?: string }) {
  return <svg className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <div className="page-header">
    <div className="page-title-block">{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h2>{title}</h2>{description && <p>{description}</p>}</div>
    {actions && <div className="page-actions">{actions}</div>}
  </div>;
}

export function SectionCard({ title, description, icon, actions, className = "", children }: { title?: string; description?: string; icon?: IconName; actions?: ReactNode; className?: string; children: ReactNode }) {
  return <section className={`surface ${className}`}>
    {(title || actions) && <div className="surface-head"><div className="surface-title">{icon && <span className="surface-icon"><Icon name={icon}/></span>}<div>{title && <h3>{title}</h3>}{description && <p>{description}</p>}</div></div>{actions && <div className="surface-actions">{actions}</div>}</div>}
    <div className="surface-body">{children}</div>
  </section>;
}

export function EmptyState({ icon = "folder", title, description, action }: { icon?: IconName; title: string; description?: string; action?: ReactNode }) {
  return <div className="empty-state"><span className="empty-icon"><Icon name={icon} size={28}/></span><h3>{title}</h3>{description && <p>{description}</p>}{action}</div>;
}

const statusMap: Record<string, { label: string; tone: string }> = {
  ACTIVE: { label: "فعال", tone: "success" }, DRAFT: { label: "پیش‌نویس", tone: "neutral" }, ON_HOLD: { label: "متوقف", tone: "warning" }, COMPLETED: { label: "تکمیل‌شده", tone: "success" }, ARCHIVED: { label: "بایگانی", tone: "neutral" },
  OPEN: { label: "باز", tone: "danger" }, IN_PROGRESS: { label: "در حال انجام", tone: "info" }, WAITING_FOR_REVIEW: { label: "در انتظار بازبینی", tone: "warning" }, REJECTED: { label: "ردشده", tone: "danger" }, CANCELLED: { label: "لغوشده", tone: "neutral" }, APPROVED: { label: "تأییدشده", tone: "success" },
  LOW: { label: "کم", tone: "success" }, MEDIUM: { label: "متوسط", tone: "warning" }, HIGH: { label: "زیاد", tone: "orange" }, CRITICAL: { label: "بحرانی", tone: "danger" },
  PENDING: { label: "در صف", tone: "warning" }, PROCESSING: { label: "در حال پردازش", tone: "info" }, SUCCEEDED: { label: "موفق", tone: "success" }, FAILED: { label: "ناموفق", tone: "danger" }, WAITING_FOR_PROVIDER: { label: "در انتظار سرویس", tone: "warning" },
};

export function StatusBadge({ value }: { value: string }) { const item = statusMap[value] ?? { label: value, tone: "neutral" }; return <span className={`status-badge ${item.tone}`}>{item.label}</span>; }
export function roleLabel(role: string) { return ({ SUPER_ADMIN: "مدیر کل", ORG_ADMIN: "مدیر سازمان", HSE_MANAGER: "مدیر HSE", ASSESSOR: "ارزیاب", VIEWER: "مشاهده‌گر" } as Record<string, string>)[role] ?? role; }
export function priorityLabel(value: string) { return statusMap[value]?.label ?? value; }
export function formatDate(value?: string, withTime = false) { if (!value) return "—"; const date = new Date(value); return Number.isNaN(date.getTime()) ? "—" : withTime ? date.toLocaleString("fa-IR") : date.toLocaleDateString("fa-IR"); }
