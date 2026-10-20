import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api, useLoad } from "../../api/client";
import { Icon, formatDate } from "../../components/UI";
import { useMenuPlacement } from "../../components/useMenuPlacement";
import { useI18n } from "../../i18n";
import { NOTIFICATIONS_CHANGED, notificationLink, notifyNotificationsChanged, type NotificationSummary } from "./notificationModel";

export function HeaderNotifications() {
  const { locale, t } = useI18n();
  const location = useLocation();
  const state = useLoad<NotificationSummary>("/notifications/summary");
  const reload = useRef(state.reload);
  reload.current = state.reload;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const busyRef = useRef(false);
  const [error, setError] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();
  const placement = useMenuPlacement(open, root, menu, 520, 8);
  const unread = state.error ? 0 : state.data?.unreadCount ?? 0;
  const count = unread.toLocaleString(locale === "en" ? "en-US" : "fa-IR");

  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") reload.current(); };
    const changed = () => reload.current();
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener(NOTIFICATIONS_CHANGED, changed);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener(NOTIFICATIONS_CHANGED, changed); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  useEffect(() => setOpen(false), [location.pathname, location.search]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus({ preventScroll: true }); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);

  async function markRead(notificationId?: string) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(notificationId ?? "all"); setError("");
    try {
      await api(notificationId ? `/notifications/${encodeURIComponent(notificationId)}/read` : "/notifications/read-all", { method: notificationId ? "PATCH" : "POST" });
      notifyNotificationsChanged();
    } catch (reason) { setError((reason as Error).message); }
    finally { busyRef.current = false; setBusy(null); }
  }

  return <div className="header-notifications-root" ref={root} onBlur={(event) => { if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button type="button" ref={trigger} className="header-notifications" aria-label={`${t("nav.notifications")}${unread ? `، ${count} ${t("notifications.unread")}` : ""}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined} title={t("nav.notifications")} data-testid="header-notifications" onClick={() => { setOpen(!open); if (!open) reload.current(); }}>
      <Icon name="notifications" size={19}/>{unread > 0 && <span className="notification-badge" aria-hidden="true">{unread > 99 ? "99+" : count}</span>}
    </button>
    {open && <div ref={menu} id={id} role="dialog" aria-labelledby={`${id}-title`} className="header-notifications-menu" {...placement}>
      <div className="notification-popover-heading"><div><strong id={`${id}-title`}>{t("notifications.title")}</strong><small>{state.error ? t("common.loadFailed") : state.loading ? t("common.loading") : `${count} ${t("notifications.unread")}`}</small></div><button type="button" className="icon-button" aria-label={t("common.close")} onClick={() => { setOpen(false); trigger.current?.focus({ preventScroll: true }); }}><span aria-hidden="true">×</span></button></div>
      {error && <p className="notification-popover-error" role="alert">{error}</p>}
      <div className="notification-popover-list" aria-busy={state.loading}>
        {state.loading ? <div className="notification-popover-state" role="status"><div className="spinner"/>{t("common.loading")}</div> : state.error ? <div className="notification-popover-state" role="alert"><Icon name="warning"/>{t("common.loadFailed")}<button type="button" className="ghost" onClick={state.reload}>{t("common.retry")}</button></div> : !state.data?.items.length ? <div className="notification-popover-state"><Icon name="notifications" size={30}/>{t("notifications.none")}</div> : state.data.items.map((item) => {
          const link = notificationLink(item.link);
          return <article className={`notification-popover-item ${item.readAt ? "read" : "unread"}`} key={item.id}>
            <span className="notification-popover-symbol"><Icon name="notifications" size={18}/></span>
            <div className="notification-popover-copy"><strong>{item.title}{!item.readAt && <span className="notification-unread-dot" aria-label={t("notifications.new")}/>}</strong><p>{item.message}</p><time dateTime={item.createdAt}>{formatDate(item.createdAt, true)}</time><div className="notification-popover-actions">{link && <Link to={link}>{t("notifications.openDetails")}</Link>}{!item.readAt && <button type="button" disabled={busy !== null} onClick={() => void markRead(item.id)}>{busy === item.id ? t("common.loading") : t("notifications.markRead")}</button>}</div></div>
          </article>;
        })}
      </div>
      <div className="notification-popover-footer"><Link to="/notifications">{t("notifications.viewAll")}</Link><button type="button" disabled={!unread || busy !== null || state.loading || Boolean(state.error)} onClick={() => void markRead()}>{busy === "all" ? t("common.loading") : t("notifications.readAll")}</button></div>
    </div>}
  </div>;
}
