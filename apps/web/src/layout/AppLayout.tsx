import type { ReactNode } from "react";
import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { api, getSession } from "../api/client";
import { Icon, roleLabel, type IconName } from "../components/UI";

const nav = [
  { path: "/", label: "داشبورد", icon: "dashboard", scope: "all", group: "main" },
  { path: "/projects", label: "پروژه‌ها و فرایندها", icon: "projects", scope: "all", group: "main" },
  { path: "/fmea", label: "ارزیابی FMEA", icon: "fmea", scope: "all", group: "assessment" },
  { path: "/rula", label: "ارزیابی RULA", icon: "rula", scope: "all", group: "assessment" },
  { path: "/actions", label: "اقدامات اصلاحی", icon: "actions", scope: "all", group: "assessment" },
  { path: "/files", label: "مدیریت فایل‌ها", icon: "files", scope: "all", group: "tools" },
  { path: "/knowledge", label: "پایگاه دانش", icon: "knowledge", scope: "all", group: "tools" },
  { path: "/assistant", label: "دستیار هوشمند", icon: "assistant", scope: "all", group: "tools" },
  { path: "/notifications", label: "اعلان‌ها", icon: "notifications", scope: "all", group: "tools" },
  { path: "/members", label: "اعضا و نقش‌ها", icon: "members", scope: "admin", group: "admin" },
  { path: "/audit", label: "رویدادهای ممیزی", icon: "audit", scope: "manager", group: "admin" },
  { path: "/profile", label: "پروفایل", icon: "profile", scope: "all", group: "account" },
  { path: "/health", label: "سلامت سامانه", icon: "health", scope: "admin", group: "account" },
] as const;

const groupLabels: Record<string, string> = { main: "مدیریت", assessment: "ارزیابی و کنترل", tools: "ابزارها", admin: "مدیریت سازمان", account: "حساب کاربری" };
const allowed = (role: string, scope: string) => scope === "all" || (scope === "admin" && ["SUPER_ADMIN", "ORG_ADMIN"].includes(role)) || (scope === "manager" && ["SUPER_ADMIN", "ORG_ADMIN", "HSE_MANAGER"].includes(role));

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { session, orgId } = getSession();
  if (!session) return null;
  const role = session.organizations.find((org) => org.id === orgId)?.role ?? "VIEWER";
  const current = nav.find((item) => item.path === location.pathname)?.label ?? "NIVASafe";
  const visible = nav.filter((item) => allowed(role, item.scope));
  const groups = [...new Set(visible.map((item) => item.group))];

  async function logout() {
    try { await api("/auth/logout", { method: "POST" }); } catch { /* local logout must still work */ }
    localStorage.removeItem("nivasafe-session");
    localStorage.removeItem("nivasafe-org");
    navigate("/login", { replace: true });
  }

  return <div className="app" dir="rtl">
    <aside className={`app-sidebar ${mobileOpen ? "open" : ""}`}>
      <div className="side-brand">
        <div className="brand-mark small">N</div>
        <div><strong>NIVASafe</strong><small>HSE Workspace</small></div>
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
    </aside>
    {mobileOpen && <button className="sidebar-backdrop" aria-label="بستن منو" onClick={() => setMobileOpen(false)}/>} 
    <section className="content">
      <header className="topbar">
        <div className="topbar-title">
          <button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="باز کردن منو"><Icon name="menu"/></button>
          <div><div className="eyebrow">فضای کاری سازمان</div><strong>{current}</strong></div>
        </div>
        <div className="header-actions">
          <span className={`online ${navigator.onLine ? "yes" : "no"}`}><span className="online-dot"/>{navigator.onLine ? "آنلاین" : "آفلاین"}</span>
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
  const role = session?.organizations.find((org) => org.id === orgId)?.role ?? "VIEWER";
  return roles.includes(role) ? children : <div className="state"><span className="state-icon"><Icon name="shield" size={28}/></span><h2>دسترسی مجاز نیست</h2><p>نقش فعلی شما مجوز مشاهده این صفحه را ندارد.</p></div>;
}
