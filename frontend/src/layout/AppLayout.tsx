import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { isSubscriptionActive } from "@nivasafe/domain";
import { api, clearSession, getCurrentRole, getSession, isSessionRemembered, saveSession, useLoad, type Locale } from "../api/client";
import { Icon, roleLabel, ThemeSwitcher, type IconName } from "../components/UI";
import { LanguageSwitcher, useI18n } from "../i18n";
import { persistAppTheme, readAppTheme, type AppTheme } from "../theme";

const nav = [
  { path: "/", labelKey: "nav.dashboard", icon: "dashboard", scope: "all", group: "main" },
  { path: "/projects", labelKey: "nav.projects", icon: "projects", scope: "all", group: "main" },
  { path: "/choose-path", labelKey: "nav.newAssessment", icon: "plus", scope: "all", group: "assessment" },
  { path: "/fmea", labelKey: "nav.fmea", icon: "fmea", scope: "all", group: "assessment" },
  { path: "/rula", labelKey: "nav.rula", icon: "rula", scope: "all", group: "assessment" },
  { path: "/actions", labelKey: "nav.actions", icon: "actions", scope: "all", group: "actions" },
  { path: "/checklists", labelKey: "nav.checklists", icon: "audit", scope: "all", group: "safety" },
  { path: "/incidents", labelKey: "nav.incidents", icon: "warning", scope: "all", group: "safety" },
  { path: "/files", labelKey: "nav.files", icon: "files", scope: "all", group: "reports" },
  { path: "/knowledge", labelKey: "nav.knowledge", icon: "knowledge", scope: "all", group: "guidance" },
  { path: "/assistant", labelKey: "nav.assistant", icon: "assistant", scope: "all", group: "guidance" },
  { path: "/notifications", labelKey: "nav.notifications", icon: "notifications", scope: "all", group: "guidance" },
  { path: "/members", labelKey: "nav.members", icon: "members", scope: "members", group: "organization" },
  { path: "/admin", labelKey: "nav.adminPanel", icon: "shield", scope: "superadmin", group: "organization" },
  { path: "/organizations", labelKey: "nav.organizations", icon: "dashboard", scope: "all", group: "organization" },
  { path: "/activity-log", labelKey: "nav.activityLog", icon: "audit", scope: "all", group: "organization" },
  { path: "/profile", labelKey: "nav.profile", icon: "profile", scope: "all", group: "settings" },
  { path: "/health", labelKey: "nav.health", icon: "health", scope: "admin", group: "settings" },
] as const;

const groupLabels: Record<string, string> = { main: "group.management", assessment: "group.assessment", actions: "group.actions", safety: "group.safety", reports: "group.reports", guidance: "group.guidance", organization: "group.organization", settings: "group.settings", tools: "group.tools", admin: "group.admin", account: "group.account" };
const allowed = (role: string, scope: string) => scope === "all" || (scope === "admin" && ["SUPER_ADMIN", "ORG_ADMIN"].includes(role)) || (scope === "members" && ["SUPER_ADMIN", "ORG_ADMIN", "HSE_MANAGER"].includes(role)) || (scope === "manager" && ["SUPER_ADMIN", "ORG_ADMIN", "HSE_MANAGER"].includes(role)) || (scope === "superadmin" && ["SUPER_ADMIN", "ORG_ADMIN"].includes(role));
type HeaderNotification = { readAt?: string | null };

function NotificationBell() {
  const { locale, t } = useI18n();
  const state = useLoad<HeaderNotification[]>("/notifications");
  const unread = state.data?.filter((item) => !item.readAt).length ?? 0;
  const countLabel = unread > 99 ? "99+" : unread.toLocaleString(locale === "en" ? "en-US" : "fa-IR");

  useEffect(() => {
    const timer = window.setInterval(() => state.reload(), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return <Link className="header-notifications" to="/notifications" aria-label={`${t("nav.notifications")}${unread ? `، ${countLabel} ${t("notifications.unread")}` : ""}`} title={t("nav.notifications")} data-testid="header-notifications">
    <Icon name="notifications" size={19}/>{unread > 0 && <span className="notification-badge" aria-hidden="true">{countLabel}</span>}
  </Link>;
}

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("nivasafe-sidebar-collapsed") === "true");
  const [theme, setTheme] = useState<AppTheme>(() => readAppTheme());
  const { locale, direction, t } = useI18n();
  const { session, orgId } = getSession();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    const closeOnDesktopResize = () => {
      if (window.innerWidth > 760) setMobileOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeOnDesktopResize);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeOnDesktopResize);
    };
  }, []);

  if (!session) return null;
  const role = getCurrentRole();
  const activeOrganization = session.organizations.find((org) => org.id === orgId);
  const organizationInactive = Boolean(activeOrganization?.active === false && role !== "SUPER_ADMIN");
  const subscriptionBlocked = Boolean(activeOrganization && !isSubscriptionActive(activeOrganization.subscriptionStatus ?? "ACTIVE", activeOrganization.subscriptionExpiresAt));
  const current = [...nav].sort((a, b) => b.path.length - a.path.length).find((item) => item.path === "/" ? location.pathname === "/" : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`))?.labelKey ?? "brand.name";
  const visible = nav.filter((item) => allowed(role, item.scope));
  const groups = [...new Set(visible.map((item) => item.group))];

  async function logout() {
    try { await api("/auth/logout", { method: "POST" }); } catch { /* local logout must still work */ }
    clearSession();
    navigate("/login", { replace: true });
  }

  function toggleSidebar() { setSidebarCollapsed((value) => { const next = !value; localStorage.setItem("nivasafe-sidebar-collapsed", String(next)); return next; }); }

  function changeTheme(next: AppTheme) { setTheme(next); persistAppTheme(next); }

  function persistLocale(next: Locale) {
    const currentSession = getSession().session;
    if (currentSession) saveSession({ ...currentSession, user: { ...currentSession.user, locale: next } }, isSessionRemembered());
    void api("/profile", { method: "PATCH", body: JSON.stringify({ locale: next }) }).catch(() => undefined);
  }

  const isAdministrator = role === "SUPER_ADMIN" || role === "ORG_ADMIN";
  const adminVariant = role === "SUPER_ADMIN" ? "global-admin-shell" : role === "ORG_ADMIN" ? "organization-admin-shell" : "";
  return <div className={`app ${sidebarCollapsed ? "sidebar-collapsed" : ""} ${isAdministrator ? "admin-shell" : ""} ${adminVariant}`} data-theme={theme} dir={direction} lang={locale}>
    <aside id="app-sidebar" className={`app-sidebar ${mobileOpen ? "open" : ""}`}>
      <div className="side-brand">
        <img className="side-brand-icon" src="/brand/nivasafe-icon.png" alt="" aria-hidden="true"/>
        <div className="side-brand-copy">
          <small>{t(role === "SUPER_ADMIN" ? "brand.adminWorkspace" : role === "ORG_ADMIN" ? "brand.organizationAdminWorkspace" : "brand.hseWorkspace")}</small>
        </div>
        <button type="button" className="sidebar-toggle" onClick={toggleSidebar} aria-expanded={!sidebarCollapsed} aria-controls="app-sidebar" aria-label={sidebarCollapsed ? t("shell.openSidebar") : t("shell.collapseSidebar")} title={sidebarCollapsed ? t("shell.openSidebar") : t("shell.collapseSidebar")}><Icon name="arrow" size={16}/></button>
      </div>
      <nav className="side-nav" aria-label={t("shell.mainMenu")}>
        {groups.map((group) => <div className="nav-group" key={group}>
          <div className="nav-label">{t(groupLabels[group])}</div>
          {visible.filter((item) => item.group === group).map((item) => <NavLink key={item.path} to={item.path} end={item.path === "/"} title={sidebarCollapsed ? t(item.labelKey) : undefined} aria-label={t(item.labelKey)} onClick={() => setMobileOpen(false)}>
            <Icon name={item.icon as IconName} size={19}/><span>{t(item.labelKey)}</span>
          </NavLink>)}
        </div>)}
      </nav>
      <div className="side-user">
        <div className="avatar">{session.user.displayName[0]}</div>
        <div><strong>{session.user.displayName}</strong><small>{roleLabel(role)}</small></div>
      </div>
      <button className="side-logout" onClick={logout}><Icon name="logout" size={18}/> {t("shell.logoutAccount")}</button>
    </aside>
    {mobileOpen && <button className="sidebar-backdrop" aria-label={t("shell.closeMenu")} onClick={() => setMobileOpen(false)}/>}
    <section className="content">
      <header className="topbar">
        <div className="topbar-title">
          <button type="button" className="mobile-menu" onClick={() => setMobileOpen(true)} aria-expanded={mobileOpen} aria-controls="app-sidebar" aria-label={t("shell.openSidebar")}><Icon name="menu"/></button>
          <div><div className="eyebrow">{t(role === "SUPER_ADMIN" ? "brand.adminWorkspace" : role === "ORG_ADMIN" ? "brand.organizationAdminWorkspace" : "brand.workspace")}</div><strong>{t(current)}</strong></div>
        </div>
        <div className="header-actions">
          {organizationInactive && <Link className="subscription-pill" to="/organizations"><Icon name="warning" size={15}/> {t("shell.inactiveOrganization")}</Link>}
          {!organizationInactive && subscriptionBlocked && <Link className="subscription-pill" to="/organizations"><Icon name="warning" size={15}/> {t("shell.activateSubscription")}</Link>}
          <ThemeSwitcher theme={theme} onChange={changeTheme}/>
          <LanguageSwitcher className="topbar-language-switch" onChange={persistLocale}/>
          <NotificationBell/>
        </div>
      </header>
      <main className="workspace"><Outlet /></main>
    </section>
  </div>;
}

export function AccessGuard({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { session, orgId } = getSession();
  const role = getCurrentRole();
  const { t } = useI18n();
  return roles.includes(role) ? children : <div className="state"><span className="state-icon"><Icon name="shield" size={28}/></span><h2>{t("shell.accessDenied")}</h2><p>{t("shell.accessDeniedMessage")}</p></div>;
}
