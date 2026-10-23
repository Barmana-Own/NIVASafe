import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { isSubscriptionActive } from "@nivasafe/domain";
import { api, clearSession, getCurrentRole, getSession, isSessionRemembered, saveSession, type Locale } from "../api/client";
import { HeaderNotifications } from "../features/notifications/HeaderNotifications";
import { AIQuotaBanner } from "../features/notifications/AIQuotaBanner";
import { Icon, ThemeSwitcher } from "../components/UI";
import { LanguageSwitcher, useI18n } from "../i18n";
import { useAppearance } from "../AppearanceProvider";
import { useModalFocus } from "../components/useModalFocus";
import { ProfileMenu } from "./ProfileMenu";
import { getActiveNavigationTrail, getNavigationForRole } from "./navigation";
import { SidebarNavigation } from "./SidebarNavigation";

function readCollapsedSidebar() {
  try { return localStorage.getItem("nivasafe-sidebar-collapsed") === "true"; } catch { return false; }
}

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readCollapsedSidebar);
  const { theme, changeTheme } = useAppearance();
  const sidebar = useRef<HTMLElement>(null);
  const [mobileViewport, setMobileViewport] = useState(() => window.matchMedia("(max-width: 760px)").matches);
  useModalFocus(sidebar, mobileViewport && mobileOpen, () => setMobileOpen(false));
  const { locale, direction, t } = useI18n();
  const { session, orgId } = getSession();
  const role = getCurrentRole();
  const navigation = getNavigationForRole(role, session?.user.globalRole ?? "USER");
  const activeTrail = getActiveNavigationTrail(location, role, session?.user.globalRole ?? "USER");
  const current = activeTrail.at(-1)?.labelKey ?? "brand.name";
  const activeNavigationIds = new Set(activeTrail.map((item) => item.id));

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    const closeOnDesktopResize = () => {
      setMobileViewport(window.innerWidth <= 760);
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
  const activeOrganization = session.organizations.find((org) => org.id === orgId);
  const organizationInactive = Boolean(activeOrganization?.active === false && role !== "SUPER_ADMIN");
  const subscriptionBlocked = Boolean(activeOrganization && !isSubscriptionActive(activeOrganization.subscriptionStatus ?? "ACTIVE", activeOrganization.subscriptionExpiresAt));

  async function logout() {
    try { await api("/auth/logout", { method: "POST" }); } catch { /* local logout must still work */ }
    clearSession();
    navigate("/login", { replace: true });
  }

  function setSidebarCollapsedPreference(next: boolean) {
    setSidebarCollapsed(next);
    try { localStorage.setItem("nivasafe-sidebar-collapsed", String(next)); } catch { /* Keep the current view usable when preference storage is blocked. */ }
  }

  function toggleSidebar() { setSidebarCollapsedPreference(!sidebarCollapsed); }

  function persistLocale(next: Locale) {
    const currentSession = getSession().session;
    if (currentSession) saveSession({ ...currentSession, user: { ...currentSession.user, locale: next } }, isSessionRemembered());
    void api("/profile", { method: "PATCH", body: JSON.stringify({ locale: next }) }).catch(() => undefined);
  }

  const isAdministrator = role === "SUPER_ADMIN" || role === "ORG_ADMIN";
  const adminVariant = role === "SUPER_ADMIN" ? "global-admin-shell" : role === "ORG_ADMIN" ? "organization-admin-shell" : "";
  return <div className={`app ${sidebarCollapsed ? "sidebar-collapsed" : ""} ${isAdministrator ? "admin-shell" : ""} ${adminVariant}`} data-design="enterprise" data-theme={theme} dir={direction} lang={locale}>
    <a className="skip-link" href="#main-content">{t("redesign.skipToContent")}</a>
    <aside ref={sidebar} id="app-sidebar" className={`app-sidebar ${mobileOpen ? "open" : ""}`} inert={mobileViewport && !mobileOpen} role={mobileViewport && mobileOpen ? "dialog" : undefined} aria-modal={mobileViewport && mobileOpen ? true : undefined} aria-label={t("shell.mainMenu")} tabIndex={-1}>
      <div className="side-brand">
        <img className="side-brand-icon" src="/brand/nivasafe-icon.png" alt="" aria-hidden="true"/>
        <div className="side-brand-copy">
          <strong dir="ltr">NIVASafe</strong>
          <small>{t(role === "SUPER_ADMIN" ? "brand.adminWorkspace" : role === "ORG_ADMIN" ? "brand.organizationAdminWorkspace" : "brand.hseWorkspace")}</small>
        </div>
        <button type="button" className="sidebar-toggle" onClick={toggleSidebar} aria-expanded={!sidebarCollapsed} aria-controls="app-sidebar" aria-label={sidebarCollapsed ? t("shell.openSidebar") : t("shell.collapseSidebar")} title={sidebarCollapsed ? t("shell.openSidebar") : t("shell.collapseSidebar")}><Icon name="arrow" size={16}/></button>
        <button type="button" className="sidebar-mobile-close" onClick={() => setMobileOpen(false)} aria-label={t("shell.closeMenu")}><Icon name="close" size={18}/></button>
      </div>
      <nav className="side-nav" aria-label={t("shell.mainMenu")}>
        <SidebarNavigation groups={navigation} location={location} collapsed={sidebarCollapsed && !mobileViewport} activeIds={activeNavigationIds} onNavigate={() => setMobileOpen(false)} t={t}/>
      </nav>
      <ProfileMenu />
      <button type="button" className="side-logout" onClick={logout} aria-label={t("shell.logoutAccount")} title={sidebarCollapsed ? t("shell.logoutAccount") : undefined}><Icon name="logout" size={18}/><span className="side-logout-label">{t("shell.logoutAccount")}</span></button>
    </aside>
    {mobileOpen && <button className="sidebar-backdrop" aria-label={t("shell.closeMenu")} onClick={() => setMobileOpen(false)}/>}
    <section className="content" inert={mobileViewport && mobileOpen}>
      <header className="topbar">
        <div className="topbar-title">
          <button type="button" className="mobile-menu" onClick={() => setMobileOpen(true)} aria-expanded={mobileOpen} aria-controls="app-sidebar" aria-label={t("shell.openSidebar")}><Icon name="menu"/></button>
          <div className="workspace-context"><div className="eyebrow">{activeOrganization ? (locale === "en" ? activeOrganization.nameEn || activeOrganization.nameFa : activeOrganization.nameFa || activeOrganization.nameEn) : t(role === "SUPER_ADMIN" ? "brand.adminWorkspace" : role === "ORG_ADMIN" ? "brand.organizationAdminWorkspace" : "brand.workspace")}</div><nav className="breadcrumbs" aria-label={t("redesign.breadcrumbs")}>{location.pathname !== "/" && <><Link to="/">{t("nav.dashboard")}</Link><Icon name="chevron" size={13}/>{activeTrail.slice(0, -1).map((item, index) => <Fragment key={`${item.id}-${index}`}><span>{t(item.labelKey)}</span><Icon name="chevron" size={13}/></Fragment>)}</>}<strong aria-current="page">{t(current)}</strong></nav></div>
        </div>
        <div className="header-actions">
          {isAdministrator && organizationInactive && <Link className="subscription-pill" to="/organizations"><Icon name="warning" size={15}/> {t("shell.inactiveOrganization")}</Link>}
          {isAdministrator && !organizationInactive && subscriptionBlocked && <Link className="subscription-pill" to="/organizations"><Icon name="warning" size={15}/> {t("shell.activateSubscription")}</Link>}
          <ThemeSwitcher theme={theme} onChange={changeTheme}/>
          <LanguageSwitcher className="topbar-language-switch" onChange={persistLocale}/>
          <HeaderNotifications key={`${session.user.id}:${orgId}`}/>
        </div>
      </header>
      <main id="main-content" className="workspace" tabIndex={-1} data-page={`${location.pathname.split("/")[1] || "dashboard"}${location.pathname.endsWith("/report") ? "-report" : ""}`}><AIQuotaBanner key={`${session.user.id}:${orgId}`}/><Outlet /></main>
    </section>
  </div>;
}

export function AccessGuard({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { session, orgId } = getSession();
  const role = getCurrentRole();
  const { t } = useI18n();
  return roles.includes(role) ? children : <div className="state"><span className="state-icon"><Icon name="shield" size={28}/></span><h2>{t("shell.accessDenied")}</h2><p>{t("shell.accessDeniedMessage")}</p></div>;
}
