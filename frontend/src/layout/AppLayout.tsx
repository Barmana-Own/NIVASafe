import type { ReactNode } from "react";
import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { isSubscriptionActive } from "@nivasafe/domain";
import { api, clearSession, directionForLocale, getCurrentRole, getSession } from "../api/client";
import { Icon, roleLabel, type IconName } from "../components/UI";

const nav = [
  { path: "/", label: "داشبورد", icon: "dashboard", scope: "all", group: "main" },
  { path: "/projects", label: "پروژه‌ها و فرایندها", icon: "projects", scope: "all", group: "main" },
  { path: "/choose-path", label: "ایجاد ارزیابی جدید", icon: "plus", scope: "all", group: "assessment" },
  { path: "/fmea", label: "ارزیابی‌های ثبت‌شده FMEA", icon: "fmea", scope: "all", group: "assessment" },
  { path: "/rula", label: "ارزیابی‌های ارگونومی RULA", icon: "rula", scope: "all", group: "assessment" },
  { path: "/actions", label: "اقدامات اصلاحی", icon: "actions", scope: "all", group: "assessment" },
  { path: "/files", label: "گزارش‌ها و فایل‌ها", icon: "files", scope: "all", group: "tools" },
  { path: "/knowledge", label: "پایگاه دانش", icon: "knowledge", scope: "all", group: "tools" },
  { path: "/assistant", label: "راهنما و آموزش", icon: "assistant", scope: "all", group: "tools" },
  { path: "/notifications", label: "اعلان‌ها", icon: "notifications", scope: "all", group: "tools" },
  { path: "/members", label: "کاربران و نقش‌ها", icon: "members", scope: "admin", group: "admin" },
  { path: "/organizations", label: "شرکت‌ها", icon: "dashboard", scope: "admin", group: "admin" },
  { path: "/audit", label: "رویدادهای ممیزی", icon: "audit", scope: "manager", group: "admin" },
  { path: "/profile", label: "تنظیمات حساب", icon: "profile", scope: "all", group: "account" },
  { path: "/health", label: "سلامت سامانه", icon: "health", scope: "admin", group: "account" },
] as const;

const groupLabels: Record<string, string> = { main: "مدیریت", assessment: "ارزیابی ریسک", tools: "گزارش‌ها و راهنما", admin: "شرکت و کاربران", account: "تنظیمات" };
const allowed = (role: string, scope: string) => scope === "all" || (scope === "admin" && ["SUPER_ADMIN", "ORG_ADMIN"].includes(role)) || (scope === "manager" && ["SUPER_ADMIN", "ORG_ADMIN", "HSE_MANAGER"].includes(role));

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("nivasafe-sidebar-collapsed") === "true");
  const { session, orgId } = getSession();
  if (!session) return null;
  const direction = directionForLocale(session.user.locale);
  const role = getCurrentRole();
  const activeOrganization = session.organizations.find((org) => org.id === orgId);
  const organizationInactive = Boolean(activeOrganization?.active === false && role !== "SUPER_ADMIN");
  const subscriptionBlocked = Boolean(activeOrganization && !isSubscriptionActive(activeOrganization.subscriptionStatus ?? "ACTIVE", activeOrganization.subscriptionExpiresAt));
  const current = nav.find((item) => item.path === location.pathname)?.label ?? "NIVASafe";
  const visible = nav.filter((item) => allowed(role, item.scope));
  const groups = [...new Set(visible.map((item) => item.group))];

  async function logout() {
    try { await api("/auth/logout", { method: "POST" }); } catch { /* local logout must still work */ }
    clearSession();
    navigate("/login", { replace: true });
  }

  function toggleSidebar() { setSidebarCollapsed((value) => { const next = !value; localStorage.setItem("nivasafe-sidebar-collapsed", String(next)); return next; }); }

  return <div className={`app ${sidebarCollapsed ? "sidebar-collapsed" : ""}`} dir={direction} lang={direction === "ltr" ? "en" : "fa"}>
    <aside className={`app-sidebar ${mobileOpen ? "open" : ""}`}>
      <div className="side-brand">
        <img className="side-brand-icon" src="/brand/nivasafe-icon.png" alt="" aria-hidden="true"/>
        <div className="side-brand-copy">
          <img className="side-brand-wordmark" src="/brand/nivasafe-en.png" alt="NIVASafe"/>
          <small>HSE Workspace</small>
        </div>
        <button type="button" className="sidebar-toggle" onClick={toggleSidebar} aria-label={sidebarCollapsed ? "باز کردن نوار کناری" : "جمع کردن نوار کناری"} title={sidebarCollapsed ? "باز کردن نوار کناری" : "جمع کردن نوار کناری"}><Icon name="arrow" size={16}/></button>
      </div>
      <nav className="side-nav" aria-label="منوی اصلی">
        {groups.map((group) => <div className="nav-group" key={group}>
          <div className="nav-label">{groupLabels[group]}</div>
          {visible.filter((item) => item.group === group).map((item) => <NavLink key={item.path} to={item.path} end={item.path === "/"} onClick={() => setMobileOpen(false)}>
            <Icon name={item.icon as IconName} size={19}/><span>{item.label}</span>
          </NavLink>)}
        </div>)}
      </nav>
      <div className="side-user">
        <div className="avatar">{session.user.displayName[0]}</div>
        <div><strong>{session.user.displayName}</strong><small>{roleLabel(role)}</small></div>
      </div>
      <button className="side-logout" onClick={logout}><Icon name="logout" size={18}/> خروج از حساب</button>
    </aside>
    {mobileOpen && <button className="sidebar-backdrop" aria-label="بستن منو" onClick={() => setMobileOpen(false)}/>} 
    <section className="content">
      <header className="topbar">
        <div className="topbar-title">
          <button type="button" className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="باز کردن منو"><Icon name="menu"/></button>
          <div><div className="eyebrow">فضای کاری سازمان</div><strong>{current}</strong></div>
        </div>
        <div className="header-actions">
          <span className={`online ${navigator.onLine ? "yes" : "no"}`}><span className="online-dot"/>{navigator.onLine ? "آنلاین" : "آفلاین"}</span>
          {organizationInactive && <Link className="subscription-pill" to="/organizations"><Icon name="warning" size={15}/> شرکت غیرفعال است</Link>}
          {!organizationInactive && subscriptionBlocked && <Link className="subscription-pill" to="/organizations"><Icon name="warning" size={15}/> فعال‌سازی اشتراک</Link>}
          <select aria-label="انتخاب سازمان" value={orgId} onChange={(event) => { localStorage.setItem("nivasafe-org", event.target.value); window.location.assign("/"); }}>{session.organizations.map((org) => <option key={org.id} value={org.id}>{org.nameFa}</option>)}</select>
          <button className="ghost logout" onClick={logout}>خروج</button>
        </div>
      </header>
      <main className="workspace"><Outlet /></main>
    </section>
  </div>;
}

export function AccessGuard({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { session, orgId } = getSession();
  const role = getCurrentRole();
  return roles.includes(role) ? children : <div className="state"><span className="state-icon"><Icon name="shield" size={28}/></span><h2>دسترسی مجاز نیست</h2><p>نقش فعلی شما مجوز مشاهده این صفحه را ندارد.</p></div>;
}
