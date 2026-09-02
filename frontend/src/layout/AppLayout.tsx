import type { ReactNode } from "react";
import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { isSubscriptionActive } from "@nivasafe/domain";
import { api, clearSession, getCurrentRole, getSession, isSessionRemembered, saveSession, type Locale } from "../api/client";
import { Icon, roleLabel, type IconName } from "../components/UI";
import { LanguageSwitcher, brandAltForLocale, brandLogoForLocale, useI18n } from "../i18n";

const nav = [
  { path: "/", labelKey: "nav.dashboard", icon: "dashboard", scope: "all", group: "main" },
  { path: "/projects", labelKey: "nav.projects", icon: "projects", scope: "all", group: "main" },
  { path: "/choose-path", labelKey: "nav.newAssessment", icon: "plus", scope: "all", group: "assessment" },
  { path: "/fmea", labelKey: "nav.fmea", icon: "fmea", scope: "all", group: "assessment" },
  { path: "/rula", labelKey: "nav.rula", icon: "rula", scope: "all", group: "assessment" },
  { path: "/actions", labelKey: "nav.actions", icon: "actions", scope: "all", group: "assessment" },
  { path: "/files", labelKey: "nav.files", icon: "files", scope: "all", group: "tools" },
  { path: "/knowledge", labelKey: "nav.knowledge", icon: "knowledge", scope: "all", group: "tools" },
  { path: "/assistant", labelKey: "nav.assistant", icon: "assistant", scope: "all", group: "tools" },
  { path: "/notifications", labelKey: "nav.notifications", icon: "notifications", scope: "all", group: "tools" },
  { path: "/members", labelKey: "nav.members", icon: "members", scope: "admin", group: "admin" },
  { path: "/organizations", labelKey: "nav.organizations", icon: "dashboard", scope: "admin", group: "admin" },
  { path: "/audit", labelKey: "nav.audit", icon: "audit", scope: "manager", group: "admin" },
  { path: "/profile", labelKey: "nav.profile", icon: "profile", scope: "all", group: "account" },
  { path: "/health", labelKey: "nav.health", icon: "health", scope: "admin", group: "account" },
] as const;

const groupLabels: Record<string, string> = { main: "group.management", assessment: "group.assessment", tools: "group.tools", admin: "group.admin", account: "group.account" };
const allowed = (role: string, scope: string) => scope === "all" || (scope === "admin" && ["SUPER_ADMIN", "ORG_ADMIN"].includes(role)) || (scope === "manager" && ["SUPER_ADMIN", "ORG_ADMIN", "HSE_MANAGER"].includes(role));

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("nivasafe-sidebar-collapsed") === "true");
  const { locale, direction, t } = useI18n();
  const { session, orgId } = getSession();
  if (!session) return null;
  const role = getCurrentRole();
  const activeOrganization = session.organizations.find((org) => org.id === orgId);
  const organizationInactive = Boolean(activeOrganization?.active === false && role !== "SUPER_ADMIN");
  const subscriptionBlocked = Boolean(activeOrganization && !isSubscriptionActive(activeOrganization.subscriptionStatus ?? "ACTIVE", activeOrganization.subscriptionExpiresAt));
  const current = nav.find((item) => item.path === location.pathname)?.labelKey ?? "brand.name";
  const visible = nav.filter((item) => allowed(role, item.scope));
  const groups = [...new Set(visible.map((item) => item.group))];

  async function logout() {
    try { await api("/auth/logout", { method: "POST" }); } catch { /* local logout must still work */ }
    clearSession();
    navigate("/login", { replace: true });
  }

  function toggleSidebar() { setSidebarCollapsed((value) => { const next = !value; localStorage.setItem("nivasafe-sidebar-collapsed", String(next)); return next; }); }

  function persistLocale(next: Locale) {
    const currentSession = getSession().session;
    if (currentSession) saveSession({ ...currentSession, user: { ...currentSession.user, locale: next } }, isSessionRemembered());
    void api("/profile", { method: "PATCH", body: JSON.stringify({ locale: next }) }).catch(() => undefined);
  }

  return <div className={`app ${sidebarCollapsed ? "sidebar-collapsed" : ""}`} dir={direction} lang={locale}>
    <aside className={`app-sidebar ${mobileOpen ? "open" : ""}`}>
      <div className="side-brand">
        <img className="side-brand-icon" src="/brand/nivasafe-icon.png" alt="" aria-hidden="true"/>
        <div className="side-brand-copy">
          <img className="side-brand-wordmark" src={brandLogoForLocale(locale)} alt={brandAltForLocale(locale)}/>
          <small>{t("brand.hseWorkspace")}</small>
        </div>
        <button type="button" className="sidebar-toggle" onClick={toggleSidebar} aria-label={sidebarCollapsed ? t("shell.openSidebar") : t("shell.collapseSidebar")} title={sidebarCollapsed ? t("shell.openSidebar") : t("shell.collapseSidebar")}><Icon name="arrow" size={16}/></button>
      </div>
      <nav className="side-nav" aria-label={t("shell.mainMenu")}>
        {groups.map((group) => <div className="nav-group" key={group}>
          <div className="nav-label">{t(groupLabels[group])}</div>
          {visible.filter((item) => item.group === group).map((item) => <NavLink key={item.path} to={item.path} end={item.path === "/"} onClick={() => setMobileOpen(false)}>
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
          <button type="button" className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label={t("shell.openSidebar")}><Icon name="menu"/></button>
          <div><div className="eyebrow">{t("brand.workspace")}</div><strong>{t(current)}</strong></div>
        </div>
        <div className="header-actions">
          <span className={`online ${navigator.onLine ? "yes" : "no"}`}><span className="online-dot"/>{navigator.onLine ? t("shell.online") : t("shell.offline")}</span>
          {organizationInactive && <Link className="subscription-pill" to="/organizations"><Icon name="warning" size={15}/> {t("shell.inactiveOrganization")}</Link>}
          {!organizationInactive && subscriptionBlocked && <Link className="subscription-pill" to="/organizations"><Icon name="warning" size={15}/> {t("shell.activateSubscription")}</Link>}
          <LanguageSwitcher className="topbar-language-switch" onChange={persistLocale}/>
          <select aria-label={t("shell.chooseOrganization")} value={orgId} onChange={(event) => { localStorage.setItem("nivasafe-org", event.target.value); window.location.assign("/"); }}>{session.organizations.map((org) => <option key={org.id} value={org.id}>{locale === "en" ? org.nameEn : org.nameFa}</option>)}</select>
          <button className="ghost logout" onClick={logout}>{t("shell.logout")}</button>
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
