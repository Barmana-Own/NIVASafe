import { Fragment, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { SUBSCRIPTION_PLANS, isSubscriptionActive } from "@nivasafe/domain";
import { api, clearSession, download, getCurrentRole, getSession, isSessionRemembered, saveSession, selectOrganization, useLoad } from "../../api/client";
import { EmptyState, Icon, LocalizedDateInput, PageHeader, SectionCard, StatusBadge, StyledSelect, formatDate, type IconName, useDialog } from "../../components/UI";
import { AutoSaveForm, clearAutoSaveDraft } from "../../forms/AutoSaveForm";
import { scopedDraftKey } from "../../forms/autoSave";
import { useI18n } from "../../i18n";

export function LoadState<T>({ state, children, empty }: { state: ReturnType<typeof useLoad<T>>; children: (data: T) => ReactNode; empty?: string }) {
  const { t } = useI18n();
  if (state.loading) return <div className="state"><div className="spinner"/><p>{t("common.loading")}</p></div>;
  if (state.error) return <div className="state error-state"><span className="state-icon"><Icon name="warning" size={27}/></span><h3>{t("common.loadFailed")}</h3><p>{state.error}</p><button className="primary" onClick={state.reload}>{t("common.retry")}</button></div>;
  if (!state.data || (Array.isArray(state.data) && !state.data.length)) return <EmptyState title={empty ?? t("common.dataNotRegistered")} icon="folder"/>;
  return <>{children(state.data)}</>;
}

export function ComingSoonPage({ titleKey, descriptionKey, icon }: { titleKey: string; descriptionKey: string; icon: IconName }) {
  const { t } = useI18n();
  return <section className="page-shell">
    <PageHeader eyebrow={t("comingSoon.eyebrow")} title={t(titleKey)} description={t(descriptionKey)}/>
    <SectionCard title={t("comingSoon.title")} description={t("comingSoon.description")} icon={icon}>
      <div className="state compact coming-soon-state">
        <span className="state-icon"><Icon name={icon} size={27}/></span>
        <h3>{t("comingSoon.status")}</h3>
        <p>{t("comingSoon.message")}</p>
        <Link className="ghost button-link" to="/"><Icon name="arrow" className="back-arrow"/> {t("shell.backToDashboard")}</Link>
      </div>
    </SectionCard>
  </section>;
}

type DashboardData = {
  counters: Record<string, number>;
  riskDistribution: Array<{ riskLevel: string; _count: number }>;
  actionDistribution: Array<{ status: string; _count: number }>;
  recent: { fmeas: Array<{ id: string; title: string; code: string; status: string; updatedAt?: string }>; rulas: Array<{ id: string; title: string; score: number; actionLevel: number; updatedAt?: string }> };
};

function dashboardAssessmentReportPath(type: "FMEA" | "RULA", id: string) {
  return `/${type.toLowerCase()}/${encodeURIComponent(id)}/report`;
}

const kpis: Record<string, { labelKey: string; captionKey: string; icon: IconName; tone: string; href: string }> = {
  projects: { labelKey: "dashboard.kpiProjects", captionKey: "dashboard.kpiProjectsCaption", icon: "projects", tone: "teal", href: "/projects" },
  fmeas: { labelKey: "dashboard.kpiFmea", captionKey: "dashboard.kpiFmeaCaption", icon: "fmea", tone: "blue", href: "/fmea" },
  rulas: { labelKey: "dashboard.kpiRula", captionKey: "dashboard.kpiRulaCaption", icon: "rula", tone: "violet", href: "/rula" },
  openActions: { labelKey: "dashboard.kpiOpenActions", captionKey: "dashboard.kpiOpenActionsCaption", icon: "actions", tone: "amber", href: "/actions" },
  overdueActions: { labelKey: "dashboard.kpiOverdueActions", captionKey: "dashboard.kpiOverdueActionsCaption", icon: "clock", tone: "orange", href: "/actions" },
  criticalItems: { labelKey: "dashboard.kpiCriticalItems", captionKey: "dashboard.kpiCriticalItemsCaption", icon: "warning", tone: "red", href: "/fmea" },
  members: { labelKey: "dashboard.kpiMembers", captionKey: "dashboard.kpiMembersCaption", icon: "members", tone: "teal", href: "/members" },
  knowledgeDocs: { labelKey: "dashboard.kpiKnowledge", captionKey: "dashboard.kpiKnowledgeCaption", icon: "knowledge", tone: "violet", href: "/knowledge" },
  pendingAI: { labelKey: "dashboard.kpiPendingAi", captionKey: "dashboard.kpiPendingAiCaption", icon: "assistant", tone: "blue", href: "/assistant" },
};
const subscriptionPlanKeys: Record<string, { title: string; description: string }> = {
  STARTER: { title: "registration.planStarter", description: "registration.planStarterDescription" },
  PROFESSIONAL: { title: "registration.planProfessional", description: "registration.planProfessionalDescription" },
  ENTERPRISE: { title: "registration.planEnterprise", description: "registration.planEnterpriseDescription" },
};
const riskColors: Record<string, string> = { VERY_LOW: "#75bfa0", LOW: "#2b9a6f", MEDIUM: "#e0a129", HIGH: "#e4772c", CRITICAL: "#d94f4f" };
const dashboardWidgetLabels: Record<string, string> = { "section:risk": "dashboard.riskDistribution", "section:actions": "dashboard.actionStatus", "section:recent": "dashboard.recent", "section:quick": "dashboard.quick", "kpi:projects": "dashboard.kpiProjects", "kpi:fmeas": "dashboard.kpiFmea", "kpi:rulas": "dashboard.kpiRula", "kpi:openActions": "dashboard.kpiOpenActions", "kpi:overdueActions": "dashboard.kpiOverdueActions", "kpi:criticalItems": "dashboard.kpiCriticalItems", "kpi:members": "dashboard.kpiMembers", "kpi:knowledgeDocs": "dashboard.kpiKnowledge", "kpi:pendingAI": "dashboard.kpiPendingAi" };
const defaultDashboardWidgetOrder = Object.keys(dashboardWidgetLabels);

function loadDashboardList(key: string, fallback: string[]) {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "null") as unknown;
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : fallback;
  } catch { return fallback; }
}

function saveDashboardList(key: string, value: string[]) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage may be unavailable in private browsing */ }
}

function normalizeDashboardOrder(value: string[]) {
  const known = value.filter((item, index) => (dashboardWidgetLabels[item] || item.startsWith("kpi:")) && value.indexOf(item) === index);
  return [...known, ...defaultDashboardWidgetOrder.filter((item) => !known.includes(item))];
}

export function DashboardPage() {
  const state = useLoad<DashboardData>("/dashboard");
  const { locale, t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const [customizing, setCustomizing] = useState(false);
  const { session, orgId } = getSession();
  const widgetStorageKey = `nivasafe-dashboard-widgets:${session?.user.id ?? "guest"}:${orgId || "default"}`;
  const orderStorageKey = `${widgetStorageKey}:order`;
  const removedStorageKey = `${widgetStorageKey}:removed`;
  const [hiddenWidgets, setHiddenWidgets] = useState<string[]>(() => loadDashboardList(widgetStorageKey, []));
  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => normalizeDashboardOrder(loadDashboardList(orderStorageKey, defaultDashboardWidgetOrder)));
  const [removedWidgets, setRemovedWidgets] = useState<string[]>(() => loadDashboardList(removedStorageKey, []));
  const visibleWidget = (id: string) => !hiddenWidgets.includes(id) && !removedWidgets.includes(id);
  function toggleWidgetVisibility(id: string) {
    if (removedWidgets.includes(id)) return;
    setHiddenWidgets((current) => { const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id]; saveDashboardList(widgetStorageKey, next); return next; });
  }
  function removeWidget(id: string) {
    setRemovedWidgets((current) => { const next = current.includes(id) ? current : [...current, id]; saveDashboardList(removedStorageKey, next); return next; });
    setHiddenWidgets((current) => { const next = current.filter((item) => item !== id); saveDashboardList(widgetStorageKey, next); return next; });
  }
  function restoreWidget(id: string) {
    setRemovedWidgets((current) => { const next = current.filter((item) => item !== id); saveDashboardList(removedStorageKey, next); return next; });
    setHiddenWidgets((current) => { const next = current.filter((item) => item !== id); saveDashboardList(widgetStorageKey, next); return next; });
  }
  function moveWidgetTo(source: string, target: string) { if (!dashboardWidgetLabels[source] || !dashboardWidgetLabels[target]) return; setWidgetOrder((current) => { const next = [...current]; if (!next.includes(source)) next.push(source); if (!next.includes(target)) next.push(target); const from = next.indexOf(source); const to = next.indexOf(target); if (from < 0 || to < 0 || from === to) return current; next.splice(from, 1); next.splice(to, 0, source); saveDashboardList(orderStorageKey, next); return next; }); }
  function moveWidget(id: string, delta: -1 | 1, order = widgetOrder) { const index = order.indexOf(id); const target = order[index + delta]; if (target) moveWidgetTo(id, target); }
  function resetWidgets() { setHiddenWidgets([]); setRemovedWidgets([]); setWidgetOrder(defaultDashboardWidgetOrder); try { localStorage.removeItem(widgetStorageKey); localStorage.removeItem(orderStorageKey); localStorage.removeItem(removedStorageKey); } catch { /* storage may be unavailable in private browsing */ } }
  return <section className="page-shell">
     <PageHeader eyebrow={t("dashboard.eyebrow")} title={t("dashboard.title")} description={t("dashboard.description")} actions={<><button className="ghost" type="button" aria-expanded={customizing} aria-controls="dashboard-layout-controls" data-scroll-target="#dashboard-layout-controls" data-scroll-focus=".widget-visibility-toggle" onClick={() => setCustomizing((value) => !value)}><Icon name="dashboard"/><span className="page-action-label">{customizing ? t("dashboard.closeSettings") : t("dashboard.customize")}</span></button><Link className="primary button-link" to="/choose-path"><Icon name="plus"/><span className="page-action-label">{t("dashboard.newAssessment")}</span></Link></>}/>
    <LoadState state={state}>{(data) => {
      const totalRisk = data.riskDistribution.reduce((sum, item) => sum + Number(item._count), 0) || 1;
      const recent = [
        ...data.recent.fmeas.map((item) => ({ type: "FMEA", title: item.title, meta: item.code, value: item.status, date: item.updatedAt, href: dashboardAssessmentReportPath("FMEA", item.id) })),
        ...data.recent.rulas.map((item) => ({ type: "RULA", title: item.title, meta: t("assessment.actionLevel", { level: item.actionLevel }), value: `${t("assessment.score")} ${item.score}`, date: item.updatedAt, href: dashboardAssessmentReportPath("RULA", item.id) })),
      ].slice(0, 6);
      const liveOrder = [...widgetOrder.filter((id) => Boolean(dashboardWidgetLabels[id]) && (!id.startsWith("kpi:") || data.counters[id.slice(4)] !== undefined)), ...Object.keys(data.counters).map((key) => `kpi:${key}`).filter((id) => !widgetOrder.includes(id) && Boolean(dashboardWidgetLabels[id]))];
      function renderWidget(id: string): ReactNode {
        if (id.startsWith("kpi:")) {
          const key = id.slice(4); const value = data.counters[key]; if (value === undefined) return null;
          const item = kpis[key] ?? { labelKey: key, captionKey: "", icon: "chart" as IconName, tone: "teal", href: "/" };
          return <Link to={item.href} className={`kpi-card dashboard-widget dashboard-kpi-widget ${item.tone}`} key={id} data-widget-id={id}><span className="kpi-icon"><Icon name={item.icon}/></span><div className="kpi-copy"><small>{t(item.labelKey)}</small><strong>{value.toLocaleString(numberLocale)}</strong><span>{item.captionKey ? t(item.captionKey) : ""}</span></div><Icon name="arrow" size={18} className="kpi-arrow"/></Link>;
        }
        if (id === "section:risk") return <SectionCard key={id} title={t("dashboard.riskDistribution")} description={t("dashboard.riskDescription")} icon="chart" className="dashboard-widget dashboard-section-widget risk-panel">{!data.riskDistribution.length ? <EmptyState title={t("dashboard.noRisk")} description={t("dashboard.noRiskDescription")} icon="chart"/> : <div className="risk-bars">{data.riskDistribution.map((item) => <div className="risk-row" key={item.riskLevel}><div className="risk-row-head"><span><i style={{ background: riskColors[item.riskLevel] }}/><StatusBadge value={item.riskLevel}/></span><strong>{item._count.toLocaleString(numberLocale)}</strong></div><div className="progress-track"><span style={{ width: `${Math.max(6, (item._count / totalRisk) * 100)}%`, background: riskColors[item.riskLevel] }}/></div></div>)}</div>}</SectionCard>;
        if (id === "section:actions") return <SectionCard key={id} title={t("dashboard.actionStatus")} description={t("dashboard.actionDescription")} icon="actions" className="dashboard-widget dashboard-section-widget actions-panel">{!data.actionDistribution.length ? <EmptyState title={t("dashboard.noAction")} icon="actions"/> : <div className="action-summary">{data.actionDistribution.map((item) => <div className="summary-row" key={item.status}><StatusBadge value={item.status}/><strong>{item._count.toLocaleString(numberLocale)}</strong></div>)}</div>}<Link className="text-link" to="/actions">{t("dashboard.viewAllActions")} <Icon name="arrow" size={16}/></Link></SectionCard>;
        if (id === "section:recent") return <SectionCard key={id} title={t("dashboard.recent")} description={t("dashboard.recentDescription")} icon="activity" className="dashboard-widget dashboard-section-widget recent-panel">{!recent.length ? <EmptyState title={t("dashboard.noRecent")} icon="activity"/> : <div className="recent-list">{recent.map((item, index) => <Link to={item.href} className="recent-item" key={`${item.type}-${index}`}><span className={`recent-type ${item.type.toLowerCase()}`}>{item.type}</span><div><strong>{item.title}</strong><small>{item.meta}{item.date ? ` · ${formatDate(item.date)}` : ""}</small></div><span className="recent-value">{item.type === "FMEA" ? <StatusBadge value={item.value}/> : item.value}</span></Link>)}</div>}</SectionCard>;
        if (id === "section:quick") return <SectionCard key={id} title={t("dashboard.quick")} description={t("dashboard.quickDescription")} icon="sparkles" className="dashboard-widget dashboard-section-widget quick-panel"><div className="quick-actions"><Link to="/fmea"><Icon name="fmea"/><span><strong>{t("dashboard.newFmea")}</strong><small>{t("dashboard.processRisk")}</small></span></Link><Link to="/rula"><Icon name="rula"/><span><strong>{t("dashboard.newRula")}</strong><small>{t("dashboard.ergonomics")}</small></span></Link><Link to="/actions"><Icon name="actions"/><span><strong>{t("dashboard.correctiveAction")}</strong><small>{t("dashboard.actionTracking")}</small></span></Link><Link to="/assistant"><Icon name="assistant"/><span><strong>{t("dashboard.smartAssistant")}</strong><small>{t("dashboard.specialistGuide")}</small></span></Link></div></SectionCard>;
        return null;
      }
      const visibleOrder = liveOrder.filter(visibleWidget);
      const removedCount = liveOrder.filter((id) => removedWidgets.includes(id)).length;
      return <>
         {customizing && <section id="dashboard-layout-controls" className="dashboard-customizer" aria-labelledby="dashboard-layout-title"><div className="dashboard-customizer-head"><div><strong id="dashboard-layout-title">{t("dashboard.layout")}</strong><small>{t("dashboard.layoutDescription")}</small></div><div className="dashboard-customizer-summary" role="status"><span>{visibleOrder.length} {t("dashboard.visibleWidgets")}</span>{removedCount > 0 && <span>{removedCount} {t("dashboard.removedWidgets")}</span>}</div></div><div className="widget-checks">{liveOrder.map((id, index) => { const label = t(dashboardWidgetLabels[id] ?? id); const removed = removedWidgets.includes(id); const visible = visibleWidget(id); const visibilityLabelKey = visible ? "dashboard.hideWidgetLabel" : "dashboard.showWidgetLabel"; return <div className={`widget-control${removed ? " is-removed" : visible ? "" : " is-hidden"}`} data-widget-state={removed ? "removed" : visible ? "visible" : "hidden"} key={id} draggable={!removed} onDragStart={(event) => event.dataTransfer.setData("text/plain", id)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const source = event.dataTransfer.getData("text/plain"); if (source) moveWidgetTo(source, id); }}><div className="widget-control-name"><Icon name={removed ? "trash" : visible ? "eye" : "eyeOff"} size={15}/><span>{label}</span></div><div className="widget-control-actions">{removed ? <button type="button" className="widget-restore-toggle" aria-label={t("dashboard.restoreWidgetLabel", { label })} title={t("dashboard.restoreWidgetLabel", { label })} onClick={() => restoreWidget(id)}><Icon name="restore" size={14}/>{t("dashboard.restoreWidget")}</button> : <button type="button" className={`widget-visibility-toggle icon-only${visible ? "" : " is-hidden"}`} aria-pressed={!visible} aria-label={t(visibilityLabelKey, { label })} title={t(visibilityLabelKey, { label })} onClick={() => toggleWidgetVisibility(id)}><Icon name={visible ? "eyeOff" : "eye"} size={14}/></button>} {!removed && <button type="button" className="widget-remove-toggle icon-only" aria-label={t("dashboard.removeWidgetLabel", { label })} title={t("dashboard.removeWidgetLabel", { label })} onClick={() => removeWidget(id)}><Icon name="trash" size={14}/></button>}<div className="widget-order-actions"><button type="button" className="icon-button" aria-label={t("dashboard.moveUp", { label })} title={t("dashboard.up")} disabled={index === 0} onClick={() => moveWidget(id, -1, liveOrder)}><Icon name="arrow" size={14} className="widget-arrow-up"/></button><button type="button" className="icon-button" aria-label={t("dashboard.moveDown", { label })} title={t("dashboard.down")} disabled={index === liveOrder.length - 1} onClick={() => moveWidget(id, 1, liveOrder)}><Icon name="arrow" size={14} className="widget-arrow-down"/></button></div></div></div>; })}</div><div className="dashboard-customizer-footer"><small>{t("dashboard.customizerHint")}</small><button type="button" className="text-button" onClick={resetWidgets}>{t("dashboard.resetWidgets")}</button></div></section>}
         <div className="dashboard-widgets">{visibleOrder.length ? visibleOrder.map(renderWidget) : <div className="dashboard-empty-state"><Icon name="dashboard" size={28}/><strong>{t("dashboard.noVisibleWidgets")}</strong><p>{t("dashboard.noVisibleWidgetsDescription")}</p><button type="button" className="ghost" aria-controls="dashboard-layout-controls" data-scroll-target="#dashboard-layout-controls" data-scroll-focus=".widget-visibility-toggle" onClick={() => { setCustomizing(true); }}>{t("dashboard.openLayout")}</button></div>}</div>
      </>;
    }}</LoadState>
  </section>;
}

type OrganizationDetails = { id: string; nameFa: string; nameEn: string; active?: boolean; nationalId?: string | null; industry?: string | null; employeeCount?: number | null; timezone?: string; defaultLocale?: string; riskMedium?: number; riskHigh?: number; riskCritical?: number; subscriptionPlan?: string; subscriptionStatus?: string; subscriptionProvider?: string; subscriptionStartedAt?: string; subscriptionExpiresAt?: string | null; subscriptionPaymentRequired?: boolean };
export function OrganizationsPage() {
  const current = useLoad<OrganizationDetails>("/organizations/current"); const organizations = useLoad<OrganizationDetails[]>("/organizations");
  const dashboardPath = current.data && current.data.active !== false && isSubscriptionActive(current.data.subscriptionStatus ?? "ACTIVE", current.data.subscriptionExpiresAt) ? "/dashboard" : null;
  const dashboard = useLoad<DashboardData>(dashboardPath, [current.data?.id, current.data?.active, current.data?.subscriptionStatus, current.data?.subscriptionExpiresAt]);
  const { locale, t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [creating, setCreating] = useState(false); const dialog = useDialog(); const role = getCurrentRole(); const canManage = ["SUPER_ADMIN", "ORG_ADMIN"].includes(role); const isSuperAdmin = role === "SUPER_ADMIN";
  const { session, orgId } = getSession(); const canCreate = Boolean(session);
  const editDraftKey = scopedDraftKey("organization-edit", session?.user.id, orgId);
  const createDraftKey = scopedDraftKey("organization-create", session?.user.id, orgId);
  const subscriptionDraftKey = scopedDraftKey("subscription-change", session?.user.id, orgId);
  async function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); setError(""); try { await api("/organizations/current", { method: "PATCH", body: JSON.stringify({ nameFa: form.get("nameFa"), nameEn: form.get("nameEn"), nationalId: form.get("nationalId") || null, industry: form.get("industry") || null, employeeCount: form.get("employeeCount") ? Number(form.get("employeeCount")) : null }) }); await clearAutoSaveDraft(editDraftKey); current.reload(); organizations.reload(); setMessage(t("organization.infoSaved")); } catch (reason) { setError((reason as Error).message); } }
  async function create(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (creating) return; const form = event.currentTarget; const values = new FormData(form); setError(""); setMessage(""); setCreating(true); try { const result = await api<OrganizationDetails>("/organizations", { method: "POST", body: JSON.stringify({ nameFa: values.get("nameFa"), nameEn: values.get("nameEn"), industry: values.get("industry") || null, employeeCount: values.get("employeeCount") ? Number(values.get("employeeCount")) : null, subscriptionPlan: values.get("subscriptionPlan") || "STARTER", defaultLocale: locale }) }); await clearAutoSaveDraft(createDraftKey); const currentSession = getSession().session; if (currentSession) { const organizations = [...currentSession.organizations.filter((item) => item.id !== result.data.id), { id: result.data.id, nameFa: result.data.nameFa, nameEn: result.data.nameEn, role: "ORG_ADMIN", active: result.data.active, subscriptionPlan: result.data.subscriptionPlan, subscriptionStatus: result.data.subscriptionStatus, subscriptionExpiresAt: result.data.subscriptionExpiresAt, subscriptionPaymentRequired: result.data.subscriptionPaymentRequired }]; saveSession({ ...currentSession, organizations }, isSessionRemembered()); selectOrganization(result.data.id); } form.reset(); window.location.assign("/organizations"); } catch (reason) { setError((reason as Error).message); } finally { setCreating(false); } }
  async function activateSubscription(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); setError(""); try { const result = await api<OrganizationDetails>("/organizations/current/subscription/checkout", { method: "POST", body: JSON.stringify({ subscriptionPlan: form.get("subscriptionPlan") || "STARTER" }) }); await clearAutoSaveDraft(subscriptionDraftKey); const session = getSession().session; if (session) saveSession({ ...session, organizations: session.organizations.map((item) => item.id === result.data.id ? { ...item, subscriptionPlan: result.data.subscriptionPlan, subscriptionStatus: result.data.subscriptionStatus, subscriptionExpiresAt: result.data.subscriptionExpiresAt } : item) }, isSessionRemembered()); current.reload(); organizations.reload(); setMessage(t("organization.subscriptionUpdated")); } catch (reason) { setError((reason as Error).message); } }
  async function cancelSubscription() { if (!(await dialog.confirm(t("organization.cancelConfirm")))) return; setError(""); try { const result = await api<OrganizationDetails>("/organizations/current/subscription/cancel", { method: "POST" }); const session = getSession().session; if (session) saveSession({ ...session, organizations: session.organizations.map((item) => item.id === result.data.id ? { ...item, subscriptionStatus: result.data.subscriptionStatus, subscriptionExpiresAt: result.data.subscriptionExpiresAt } : item) }, isSessionRemembered()); current.reload(); organizations.reload(); setMessage(t("organization.subscriptionCanceled")); } catch (reason) { setError((reason as Error).message); } }
  async function setOrganizationActive(organization: OrganizationDetails) { const next = organization.active === false; const name = locale === "en" ? organization.nameEn : organization.nameFa; if (!(await dialog.confirm(t(next ? "organization.activateConfirm" : "organization.deactivateConfirm", { name })))) return; if (!(await dialog.confirm(t(next ? "organization.activateWarning" : "organization.deactivateWarning")))) return; try { await api(`/organizations/${organization.id}/status`, { method: "PATCH", body: JSON.stringify({ active: next, confirmation: next ? "ACTIVATE" : "DEACTIVATE" }) }); const session = getSession().session; if (session) saveSession({ ...session, organizations: session.organizations.map((item) => item.id === organization.id ? { ...item, active: next } : item) }, isSessionRemembered()); organizations.reload(); current.reload(); setMessage(next ? t("organization.activated") : t("organization.deactivated")); } catch (reason) { setError((reason as Error).message); } }
  async function deactivate() { if (!(await dialog.confirm(t("organization.deactivateRequest")))) return; if (!(await dialog.confirm(t("organization.deactivateRequestWarning")))) return; try { await api("/organizations/current/deactivate", { method: "POST" }); clearSession(); window.location.assign("/login"); } catch (reason) { setError((reason as Error).message); } }
  return <section className="page-shell"><PageHeader eyebrow={t("organization.management")} title={t("organization.title")} description={t("organization.description")}/>{error && <div className="alert error"><Icon name="warning"/>{error}</div>}{message && <div className="alert success"><Icon name="check"/>{message}</div>}
    {dashboardPath && <LoadState state={dashboard}>{(data) => <div className="kpi-grid crm-kpis">{Object.entries(data.counters).map(([key, value]) => { const item = kpis[key] ?? { labelKey: key, captionKey: "", icon: (key === "members" ? "members" : key === "knowledgeDocs" ? "knowledge" : "assistant") as IconName, tone: "teal", href: "/" }; return <div className={`kpi-card ${item.tone}`} key={key}><span className="kpi-icon"><Icon name={item.icon}/></span><div className="kpi-copy"><small>{t(item.labelKey)}</small><strong>{value.toLocaleString(numberLocale)}</strong><span>{item.captionKey ? t(item.captionKey) : ""}</span></div></div>; })}</div>}</LoadState>}
    <LoadState state={current} empty={t("organization.noOther")}>{(organization) => { const planKeys = subscriptionPlanKeys[organization.subscriptionPlan ?? "STARTER"] ?? subscriptionPlanKeys.STARTER; const plan = t(planKeys.title); const planDescription = t(planKeys.description); const provider = organization.subscriptionProvider === "local" ? t("organization.localTrial") : organization.subscriptionProvider === "legacy" ? t("organization.existing") : organization.subscriptionProvider ?? t("organization.unregistered"); return <SectionCard title={t("organization.activeSubscription")} description={t("organization.subscriptionDescription")} icon="shield"><div className="subscription-panel"><div className="subscription-summary"><div><strong>{plan}</strong><small>{t("organization.provider")}: {provider}</small></div><StatusBadge value={organization.subscriptionStatus ?? "ACTIVE"}/><span className="subscription-expiry">{organization.subscriptionExpiresAt ? t("organization.until", { date: new Date(organization.subscriptionExpiresAt).toLocaleDateString(numberLocale) }) : t("organization.noExpiry")}</span></div>{canManage && <AutoSaveForm storageKey={subscriptionDraftKey} className="inline-form subscription-form" onSubmit={activateSubscription}><label>{t("organization.subscriptionPlan")}<StyledSelect name="subscriptionPlan" defaultValue={organization.subscriptionPlan ?? "STARTER"}>{SUBSCRIPTION_PLANS.map((subscription) => { const keys = subscriptionPlanKeys[subscription.id] ?? subscriptionPlanKeys.STARTER; return <option key={subscription.id} value={subscription.id}>{t(keys.title)} — {t(keys.description)}</option>; })}</StyledSelect></label><button className="primary"><Icon name="check"/> {t("organization.activateRenew")}</button>{isSubscriptionActive(organization.subscriptionStatus ?? "ACTIVE", organization.subscriptionExpiresAt) && <button className="ghost danger-button" type="button" onClick={() => void cancelSubscription()}>{t("organization.cancelSubscription")}</button>}</AutoSaveForm>}<small className="field-hint">{t("organization.paymentNote")}</small></div></SectionCard>; }}</LoadState>
    <div className="form-panels">{canManage && <SectionCard title={t("organization.activeInfo")} description={t("organization.editDescription")} icon="projects"><LoadState state={current} empty={t("organization.noOther")}>{(organization) => <AutoSaveForm storageKey={editDraftKey} className="form-grid" onSubmit={save}><label>{t("organization.namePersian")}<input name="nameFa" defaultValue={organization.nameFa} required/></label><label>{t("organization.nameEnglish")}<input name="nameEn" defaultValue={organization.nameEn} required dir="ltr"/></label><label>{t("organization.nationalId")}<input name="nationalId" defaultValue={organization.nationalId ?? ""}/></label><label>{t("organization.industry")}<input name="industry" defaultValue={organization.industry ?? ""}/></label><label>{t("organization.employees")}<input name="employeeCount" type="number" min="0" defaultValue={organization.employeeCount ?? ""}/></label><button className="primary full"><Icon name="check"/> {t("organization.saveInfo")}</button></AutoSaveForm>}</LoadState></SectionCard>}{canCreate && <SectionCard title={t("organization.createNew")} description={t("organization.createDescription")} icon="plus"><AutoSaveForm storageKey={createDraftKey} className="form-grid" onSubmit={create}><label>{t("organization.namePersian")}<input name="nameFa" required/></label><label>{t("organization.nameEnglish")}<input name="nameEn" required dir="ltr"/></label><label>{t("organization.industry")}<input name="industry"/></label><label>{t("organization.employees")}<input name="employeeCount" type="number" min="0"/></label><label className="full">{t("organization.subscriptionPlan")}<StyledSelect name="subscriptionPlan" defaultValue="STARTER">{SUBSCRIPTION_PLANS.map((subscription) => { const keys = subscriptionPlanKeys[subscription.id] ?? subscriptionPlanKeys.STARTER; return <option key={subscription.id} value={subscription.id}>{t(keys.title)} — {t(keys.description)}</option>; })}</StyledSelect></label><button className="primary full" type="submit" disabled={creating}><Icon name="plus"/> {creating ? t("organization.creating") : t("organization.createSeparate")}</button></AutoSaveForm></SectionCard>}</div>
    <SectionCard title={t("organization.available")} description={`${(organizations.data?.length ?? 0).toLocaleString(numberLocale)} ${t("organization.availableDescription")}`} icon="members"><LoadState state={organizations} empty={t("organization.noOther")}>{(data) => <div className="simple-list">{data.map((organization) => { const name = locale === "en" ? organization.nameEn : organization.nameFa; const operational = organization.active !== false && isSubscriptionActive(organization.subscriptionStatus ?? "ACTIVE", organization.subscriptionExpiresAt); return <div className="simple-list-row" key={organization.id}><div><strong>{name}</strong><small>{organization.industry || t("organization.unregisteredIndustry")} · {organization.employeeCount ? `${organization.employeeCount.toLocaleString(numberLocale)} ${t("common.people")}` : t("organization.unregisteredEmployees")}</small></div><div className="organization-row-actions"><StatusBadge value={organization.subscriptionStatus ?? "ACTIVE"}/><span className={`organization-status ${organization.active === false ? "inactive" : "active"}`}>{organization.active === false ? t("members.inactive") : t("members.active")}</span><button className="text-button" type="button" onClick={() => { if (selectOrganization(organization.id)) window.location.assign(operational ? "/" : "/organizations"); }}>{organization.id === current.data?.id ? t("organization.enterCompany") : t("organization.enter")}</button>{isSuperAdmin && <button className="text-button" type="button" onClick={() => void setOrganizationActive(organization)}>{organization.active === false ? t("organization.activate") : t("organization.deactivate")}</button>}</div></div>; })}</div>}</LoadState></SectionCard>
    {canManage && !isSuperAdmin && <button className="ghost danger-button" onClick={() => void deactivate()}>{t("organization.deactivateActive")}</button>}
  </section>;
}

type Project = { id: string; name: string; code: string; status: string; description?: string | null; updatedAt?: string };
type Process = { id: string; projectId: string; name: string };
type Activity = { id: string; projectId: string; processId?: string; title: string; location?: string };
type ProjectEditDraft = { name: string; code: string; description: string; status: string };

export function ProjectsPage() {
  const projects = useLoad<Project[]>("/projects");
  const processes = useLoad<Process[]>("/processes");
  const activities = useLoad<Activity[]>("/activities");
  const { locale, t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [creating, setCreating] = useState(false);
  const [targetProjectId, setTargetProjectId] = useState("");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectEditDraft, setProjectEditDraft] = useState<ProjectEditDraft>({ name: "", code: "", description: "", status: "ACTIVE" });
  const [savingProjectId, setSavingProjectId] = useState<string | null>(null);
  const dialog = useDialog();
  const canManage = ["SUPER_ADMIN", "ORG_ADMIN", "HSE_MANAGER", "HSE_OFFICER"].includes(getCurrentRole());
  const { session, orgId } = getSession();
  const projectDraftKey = scopedDraftKey("project-create", session?.user.id, orgId);
  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) return;
    setError(""); setSuccess(""); setCreating(true);
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form));
    for (const [key, value] of Object.entries(payload)) if (value === "") delete payload[key];
    try {
      const created = await api<Project>("/projects", { method: "POST", body: JSON.stringify(payload) });
      await clearAutoSaveDraft(projectDraftKey); form.reset(); projects.reload(); processes.reload(); activities.reload();
      const returnToAssessment = new URLSearchParams(location.search).get("from");
      if (returnToAssessment === "fmea") {
        navigate(`/fmea?project=${encodeURIComponent(created.data.id)}`, { replace: true });
        return;
      }
      if (returnToAssessment === "rula") {
        navigate(`/rula?project=${encodeURIComponent(created.data.id)}`, { replace: true });
        return;
      }
      setSuccess(t("projects.projectCreated"));
    }
    catch (reason) { setError((reason as Error).message); }
    finally { setCreating(false); }
  }
  function openProjectEditor(project: Project) {
    setEditingProjectId(project.id);
    setProjectEditDraft({ name: project.name, code: project.code, description: project.description ?? "", status: project.status });
    setError("");
    setSuccess("");
    window.setTimeout(() => document.getElementById(`project-edit-${project.id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 0);
  }
  function closeProjectEditor() {
    if (savingProjectId) return;
    setEditingProjectId(null);
  }
  async function saveProjectEdit(event: FormEvent<HTMLFormElement>, project: Project) {
    event.preventDefault();
    if (savingProjectId) return;
    const name = projectEditDraft.name.trim();
    if (name.length < 2) return;
    setSavingProjectId(project.id);
    setError("");
    setSuccess("");
    try {
      await api(`/projects/${project.id}`, { method: "PATCH", body: JSON.stringify({ name, code: projectEditDraft.code.trim() || undefined, description: projectEditDraft.description.trim() || null, status: projectEditDraft.status }) });
      projects.reload();
      setEditingProjectId(null);
      setSuccess(t("projects.changesSaved"));
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setSavingProjectId(null);
    }
  }
  async function removeProject(id: string, label: string) { if (!(await dialog.confirm(t("projects.deleteConfirm", { name: label })))) return; try { await api(`/projects/${id}`, { method: "DELETE" }); projects.reload(); setSuccess(t("projects.itemDeleted")); } catch (reason) { setError((reason as Error).message); } }
  const counts = { projects: projects.data?.length ?? 0, processes: processes.data?.length ?? 0, activities: activities.data?.length ?? 0 };
  const targetProjectCode = new URLSearchParams(location.search).get("project")?.trim().toUpperCase() ?? "";
  useEffect(() => {
    if (!targetProjectCode || !projects.data) return;
    const target = projects.data.find((project) => project.code.trim().toUpperCase() === targetProjectCode);
    if (!target) return;
    setTargetProjectId(target.id);
    const scrollTimer = window.setTimeout(() => document.getElementById(`project-${target.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
    const clearTimer = window.setTimeout(() => setTargetProjectId(""), 3500);
    return () => { window.clearTimeout(scrollTimer); window.clearTimeout(clearTimer); };
  }, [projects.data, targetProjectCode]);
  return <section className="page-shell">
    <PageHeader eyebrow={t("projects.eyebrow")} title={t("projects.title")} description={t("projects.description")}/>
    {error && <div className="alert error"><Icon name="warning"/>{error}</div>}{success && <div className="alert success"><Icon name="check"/>{success}</div>}
    <div className="mini-stats"><div><Icon name="projects"/><strong>{counts.projects.toLocaleString(numberLocale)}</strong><span>{t("projects.project")}</span></div><div><Icon name="activity"/><strong>{counts.processes.toLocaleString(numberLocale)}</strong><span>{t("projects.process")}</span></div><div><Icon name="folder"/><strong>{counts.activities.toLocaleString(numberLocale)}</strong><span>{t("projects.activity")}</span></div></div>
    {canManage &&
      <SectionCard title={t("projects.newProject")} description={t("projects.projectDescription")} icon="projects">
          <AutoSaveForm storageKey={projectDraftKey} className="form-grid" onSubmit={createProject}>
          <label><span className="field-label-line"><span>{t("projects.projectName")}</span><span className="required-label">{t("common.required")}</span></span><input name="name" maxLength={180} placeholder={t("projects.projectNamePlaceholder")} required/></label><label>{t("projects.uniqueCode")}<input name="code" maxLength={40} placeholder={t("projects.codePlaceholder")}/><small className="field-hint">{t("projects.codeAutoGenerated")}</small></label><label><span className="field-label-line"><span>{t("projects.processName")}</span><span className="optional-label">{t("common.optional")}</span></span><input name="initialProcessName" maxLength={180} placeholder={t("projects.processNamePlaceholder")}/></label><label><span className="field-label-line"><span>{t("projects.location")}</span><span className="optional-label">{t("common.optional")}</span></span><input name="initialActivityLocation" maxLength={180} placeholder={t("projects.locationPlaceholder")}/></label><label className="full">{t("common.description")}<textarea name="description" maxLength={2000} rows={3} placeholder={t("projects.projectDetailsPlaceholder")}/></label><button className="primary full" type="submit" disabled={creating}><Icon name="plus"/> {creating ? t("projects.creatingProject") : t("projects.createProject")}</button>
        </AutoSaveForm>
      </SectionCard>
    }
    <SectionCard title={t("projects.projectList")} description={t("projects.listDescription")} icon="folder">
      <LoadState state={projects} empty={t("projects.noProject")}>{(data) => <div className="project-cards">{data.map((project) => {
        const processCount = processes.data?.filter((x) => x.projectId === project.id).length ?? 0;
        const activityCount = activities.data?.filter((x) => x.projectId === project.id).length ?? 0;
        return <article id={`project-${project.id}`} className={`project-card ${targetProjectId === project.id ? "project-card-target" : ""}`} tabIndex={targetProjectId === project.id ? -1 : undefined} key={project.id}>
          <div className="project-top"><span className="project-code">{project.code}</span><StatusBadge value={project.status}/></div>
          <h3>{project.name}</h3>
          <p>{project.description || t("projects.noDescription")}</p>
          <div className="project-meta"><span><Icon name="activity" size={16}/>{processCount.toLocaleString(numberLocale)} {t("projects.processCount")}</span><span><Icon name="folder" size={16}/>{activityCount.toLocaleString(numberLocale)} {t("projects.activityCount")}</span></div>
          {canManage && <div className="card-actions">
            <button className="card-action" type="button" aria-expanded={editingProjectId === project.id} onMouseEnter={() => openProjectEditor(project)} onFocus={() => openProjectEditor(project)} onClick={() => openProjectEditor(project)}><Icon name="activity" size={15}/> {t("common.edit")}</button>
            <button className="card-action danger-link" type="button" onClick={() => void removeProject(project.id, `${t("projects.project")} «${project.name}»`)}><Icon name="trash" size={15}/> {t("common.delete")}</button>
          </div>}
          {editingProjectId === project.id && <form id={`project-edit-${project.id}`} className="project-edit-box" onSubmit={(event) => void saveProjectEdit(event, project)}>
            <div className="project-edit-head"><div><strong>{t("common.edit")} {t("projects.project")}</strong><small>{project.code}</small></div><button className="icon-button" type="button" aria-label={t("common.close")} onClick={closeProjectEditor} disabled={savingProjectId === project.id}><span aria-hidden="true">×</span></button></div>
            <div className="form-grid project-edit-form-grid">
              <label><span className="field-label-line"><span>{t("projects.projectName")}</span><span className="required-label">{t("common.required")}</span></span><input value={projectEditDraft.name} onChange={(event) => setProjectEditDraft((current) => ({ ...current, name: event.target.value }))} maxLength={180} required/></label>
              <label>{t("projects.uniqueCode")}<input value={projectEditDraft.code} onChange={(event) => setProjectEditDraft((current) => ({ ...current, code: event.target.value }))} maxLength={40}/></label>
              <label>{t("projects.status")}<StyledSelect value={projectEditDraft.status} onChange={(event) => setProjectEditDraft((current) => ({ ...current, status: event.target.value }))}><option value="DRAFT">{t("status.draft")}</option><option value="ACTIVE">{t("status.active")}</option><option value="ON_HOLD">{t("status.onHold")}</option><option value="COMPLETED">{t("status.completed")}</option><option value="ARCHIVED">{t("status.archived")}</option></StyledSelect></label>
              <label className="full">{t("common.description")}<textarea value={projectEditDraft.description} onChange={(event) => setProjectEditDraft((current) => ({ ...current, description: event.target.value }))} maxLength={2000} rows={3}/></label>
            </div>
            <div className="project-edit-actions"><button className="ghost" type="button" onClick={closeProjectEditor} disabled={savingProjectId === project.id}>{t("common.cancel")}</button><button className="primary" type="submit" disabled={savingProjectId === project.id}><Icon name="check"/> {t("common.save")}</button></div>
          </form>}
        </article>;
      })}</div>}</LoadState>
    </SectionCard>
  </section>;
}

type ActionBodySide = "LEFT" | "RIGHT" | "BOTH";
type ActionRulaAssessment = { id: string; title: string; bodySide?: ActionBodySide; score: number; project?: { name: string } };
type Action = { id: string; title: string; description?: string; priority: string; status: string; progress: number; dueDate?: string; assigneeName?: string; bodySide?: ActionBodySide | null; rulaId?: string | null };
export function ActionsPage() {
  const state = useLoad<Action[]>("/actions");
  const projects = useLoad<Project[]>("/projects");
  const rulaAssessments = useLoad<ActionRulaAssessment[]>("/rula");
  const { locale, t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const canEditActions = ["SUPER_ADMIN", "ORG_ADMIN", "HSE_MANAGER", "HSE_SPECIALIST", "HSE_OFFICER", "ASSISTANT", "ASSESSOR"].includes(getCurrentRole());
  const { session, orgId } = getSession();
  const actionDraftKey = scopedDraftKey("action-create", session?.user.id, orgId);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); setError("");
    try { await api("/actions", { method: "POST", body: JSON.stringify({ projectId: form.get("projectId"), rulaId: form.get("rulaId") || null, bodySide: form.get("bodySide"), title: form.get("title"), description: form.get("description"), priority: form.get("priority"), assigneeName: form.get("assigneeName") || null, dueDate: form.get("dueDate") || null }) }); await clearAutoSaveDraft(actionDraftKey); formElement.reset(); state.reload(); setMessage(t("actions.created")); }
    catch (reason) { setError((reason as Error).message); }
  }
  const openCount = state.data?.filter((x) => !["COMPLETED", "CANCELLED"].includes(x.status)).length ?? 0;
  const doneCount = state.data?.filter((x) => x.status === "COMPLETED").length ?? 0;
  return <section className="page-shell">
    <PageHeader eyebrow={t("actions.eyebrow")} title={t("actions.title")} description={t("actions.description")}/>
    {error && <div className="alert error"><Icon name="warning"/>{error}</div>}{message && <div className="alert success"><Icon name="check"/>{message}</div>}
    <div className="mini-stats"><div><Icon name="actions"/><strong>{openCount.toLocaleString(numberLocale)}</strong><span>{t("actions.open")}</span></div><div><Icon name="check"/><strong>{doneCount.toLocaleString(numberLocale)}</strong><span>{t("actions.completed")}</span></div><div><Icon name="chart"/><strong>{state.data?.length ? Math.round(state.data.reduce((s, x) => s + x.progress, 0) / state.data.length).toLocaleString(numberLocale) : (0).toLocaleString(numberLocale)}%</strong><span>{t("actions.averageProgress")}</span></div></div>
    {canEditActions && <SectionCard title={t("actions.new")} description={t("actions.newDescription")} icon="plus">
      <AutoSaveForm storageKey={actionDraftKey} className="action-form" onSubmit={create}><label>{t("projects.project")}<StyledSelect name="projectId" required><option value="">{t("assessment.projectSelect")}</option>{projects.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</StyledSelect></label><label>{t("actions.rulaAssessment")}<StyledSelect name="rulaId"><option value="">{t("actions.noRulaAssessment")}</option>{rulaAssessments.data?.map((assessment) => <option key={assessment.id} value={assessment.id}>{assessment.title} · {assessment.project?.name ?? ""}</option>)}</StyledSelect></label><label>{t("actions.bodySideLabel")}<StyledSelect name="bodySide" required><option value="">{t("actions.selectBodySide")}</option><option value="RIGHT">{t("assessment.right")}</option><option value="LEFT">{t("assessment.left")}</option><option value="BOTH">{t("assessment.bothSides")}</option></StyledSelect><small className="field-hint">{t("actions.bodySideHint")}</small></label><label>{t("actions.titleLabel")}<input name="title" placeholder={t("actions.titlePlaceholder")} required/></label><label className="wide">{t("actions.detailsLabel")}<input name="description" placeholder={t("actions.detailsPlaceholder")} required/></label><label>{t("actions.priority")}<StyledSelect name="priority"><option value="MEDIUM">{t("status.medium")}</option><option value="HIGH">{t("status.high")}</option><option value="CRITICAL">{t("status.critical")}</option><option value="LOW">{t("status.low")}</option></StyledSelect></label><label>{t("actions.assignee")}<input name="assigneeName" placeholder={t("actions.assigneePlaceholder")}/></label><label>{t("actions.dueDate")}<LocalizedDateInput name="dueDate" ariaLabel={t("actions.dueDate")}/></label><button className="primary"><Icon name="plus"/> {t("actions.register")}</button></AutoSaveForm>
    </SectionCard>}
    <SectionCard title={t("actions.list")} description={t("actions.listDescription")} icon="actions">
      <LoadState state={state} empty={t("actions.noAction")}>{(data) => <div className="table-wrap"><table><thead><tr><th>{t("actions.action")}</th><th>{t("actions.bodySideColumn")}</th><th>{t("actions.priorityColumn")}</th><th>{t("actions.statusColumn")}</th><th>{t("actions.progress")}</th><th>{t("actions.assigneeColumn")}</th><th>{t("actions.dueDateColumn")}</th></tr></thead><tbody>{data.map((item) => <tr key={item.id}><td><strong>{item.title}</strong><small>{item.description}</small></td><td>{item.bodySide === "LEFT" ? t("assessment.left") : item.bodySide === "BOTH" ? t("assessment.bothSides") : item.bodySide === "RIGHT" ? t("assessment.right") : t("common.none")}</td><td><StatusBadge value={item.priority}/></td><td>{canEditActions ? <StyledSelect className="compact-select" value={item.status} onChange={async (event) => { try { setError(""); await api(`/actions/${item.id}`, { method: "PATCH", body: JSON.stringify({ status: event.target.value }) }); state.reload(); } catch (reason) { setError((reason as Error).message); } }}><option value="OPEN">{t("status.open")}</option><option value="IN_PROGRESS">{t("status.inProgress")}</option><option value="WAITING_FOR_REVIEW">{t("status.waitingForReview")}</option><option value="COMPLETED">{t("status.completed")}</option><option value="REJECTED">{t("status.rejected")}</option></StyledSelect> : <StatusBadge value={item.status}/>}</td><td><div className="table-progress"><div><span style={{ width: `${item.progress}%` }}/></div><b>{item.progress.toLocaleString(numberLocale)}%</b></div></td><td>{item.assigneeName ?? t("common.none")}</td><td>{formatDate(item.dueDate)}</td></tr>)}</tbody></table></div>}</LoadState>
    </SectionCard>
  </section>;
}

type KnowledgeAttachment = { id: string; originalName: string; mimeType: string; size: number; kind: string; createdAt: string; downloadPath: string };
type Knowledge = { id: string; title: string; content: string; tags: string[]; published?: boolean; aiReadable?: boolean; aiOnly?: boolean; isGlobal?: boolean; visibility?: string; visibleUserIds?: string[] | null; visibleOrganizationIds?: string[] | null; version?: number; updatedAt?: string; attachments?: KnowledgeAttachment[] };
type KnowledgeMember = { user: { id: string; displayName: string; email: string }; role: string; active: boolean };
type KnowledgeOrganization = { id: string; nameFa: string; nameEn: string; subscriptionPlan?: string; subscriptionStatus?: string };
type KnowledgeQuota = { plan: string; tokenLimit: number; usedTokens: number; remainingTokens: number; maxFileBytes: number; maxFileSizeLabel: string; canUpload: boolean };
const knowledgeFileSize = (size: number) => size > 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.ceil(size / 1024))} KB`;
export function KnowledgePage() {
  const state = useLoad<Knowledge[]>("/knowledge");
  const quota = useLoad<KnowledgeQuota>("/knowledge/quota");
  const { locale, t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const [query, setQuery] = useState(""); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const dialog = useDialog();
  const role = getCurrentRole(); const canManageKnowledge = ["SUPER_ADMIN", "ORG_ADMIN", "HSE_MANAGER"].includes(role); const canManageGlobal = role === "SUPER_ADMIN";
  const { session, orgId } = getSession();
  const knowledgeDraftKey = scopedDraftKey("knowledge-create", session?.user.id, orgId);
  const members = useLoad<KnowledgeMember[]>(canManageKnowledge ? "/members" : null);
  const organizations = useLoad<KnowledgeOrganization[]>(canManageGlobal ? "/organizations" : null);
  const filtered = useMemo(() => (state.data ?? []).filter((item) => `${item.title} ${item.content} ${item.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase())), [state.data, query]);
  async function create(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const element = event.currentTarget; const form = new FormData(element); let created: Knowledge | null = null; setError(""); setMessage(""); try { const visibility = String(form.get("visibility") || "ALL"); const aiOnly = form.get("aiOnly") === "on"; const isGlobal = canManageGlobal && form.get("isGlobal") === "on"; created = (await api<Knowledge>("/knowledge", { method: "POST", body: JSON.stringify({ title: form.get("title"), content: form.get("content"), tags: String(form.get("tags") || "").split(",").map((x) => x.trim()).filter(Boolean), published: !aiOnly && form.get("published") === "on", aiReadable: form.get("aiReadable") === "on", aiOnly, isGlobal, visibility, visibleUserIds: visibility === "SELECTED" ? form.getAll("visibleUserIds").map(String) : [], visibleOrganizationIds: isGlobal ? form.getAll("visibleOrganizationIds").map(String) : [] }) })).data; const file = form.get("file"); if (file instanceof File && file.size > 0) { const upload = new FormData(); upload.append("file", file); await api(`/knowledge/${created.id}/attachments`, { method: "POST", body: upload }); } await clearAutoSaveDraft(knowledgeDraftKey); element.reset(); state.reload(); quota.reload(); setMessage(t("knowledge.created")); } catch (reason) { if (created) await api(`/knowledge/${created.id}`, { method: "DELETE" }).catch(() => undefined); setError((reason as Error).message); } }
  async function edit(item: Knowledge) { const title = (await dialog.prompt(t("assessment.editTitle"), item.title))?.trim(); if (!title || title === item.title) return; try { await api(`/knowledge/${item.id}`, { method: "PATCH", body: JSON.stringify({ title }) }); state.reload(); setMessage(t("knowledge.documentEdited")); } catch (reason) { setError((reason as Error).message); } }
  async function togglePublished(item: Knowledge) { try { await api(`/knowledge/${item.id}`, { method: "PATCH", body: JSON.stringify({ published: item.published === false }) }); state.reload(); } catch (reason) { setError((reason as Error).message); } }
  async function toggleAiOnly(item: Knowledge) { try { await api(`/knowledge/${item.id}`, { method: "PATCH", body: JSON.stringify({ aiOnly: !item.aiOnly, published: item.aiOnly ? true : false }) }); state.reload(); setMessage(item.aiOnly ? t("knowledge.documentPublished") : t("knowledge.documentAiOnly")); } catch (reason) { setError((reason as Error).message); } }
  async function toggleAiReadable(item: Knowledge) { if (item.aiOnly && item.aiReadable !== false) return; try { await api(`/knowledge/${item.id}`, { method: "PATCH", body: JSON.stringify({ aiReadable: item.aiReadable === false }) }); state.reload(); } catch (reason) { setError((reason as Error).message); } }
  async function remove(item: Knowledge) { if (!(await dialog.confirm(`${t("common.delete")} «${item.title}»؟`))) return; try { await api(`/knowledge/${item.id}`, { method: "DELETE" }); state.reload(); quota.reload(); setMessage(t("common.delete")); } catch (reason) { setError((reason as Error).message); } }
  async function removeAttachment(item: KnowledgeAttachment) { if (!(await dialog.confirm(`${t("common.delete")} «${item.originalName}»؟`))) return; try { await api(`/knowledge/attachments/${item.id}`, { method: "DELETE" }); state.reload(); quota.reload(); setMessage(t("knowledge.attachmentDeleted")); } catch (reason) { setError((reason as Error).message); } }
  async function downloadAttachment(item: KnowledgeAttachment) { try { const blob = await download(item.downloadPath); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = item.originalName; anchor.click(); URL.revokeObjectURL(url); } catch (reason) { setError((reason as Error).message); } }
  return <section className="page-shell">
    <PageHeader eyebrow={t("knowledge.eyebrow")} title={t("knowledge.title")} description={t("knowledge.description")} actions={<div className="search-box"><Icon name="search"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("knowledge.searchPlaceholder")}/></div>}/>
    {error && <div className="alert error"><Icon name="warning"/>{error}</div>}{message && <div className="alert success"><Icon name="check"/>{message}</div>}
    {quota.data && <div className="knowledge-quota"><span><Icon name="assistant"/> {t("knowledge.tokenUsage")}: <strong>{quota.data.usedTokens.toLocaleString(numberLocale)}</strong> {t("common.of")} {quota.data.tokenLimit.toLocaleString(numberLocale)}</span><span>{t("knowledge.remaining")}: <strong>{quota.data.remainingTokens.toLocaleString(numberLocale)}</strong> · {t("knowledge.maxFile")} {quota.data.maxFileSizeLabel}</span></div>}
    {canManageKnowledge && <SectionCard title={t("knowledge.new")} description={t("knowledge.newDescription")} icon="plus">
      <AutoSaveForm storageKey={knowledgeDraftKey} className="knowledge-form" onSubmit={create}>
        <div className="knowledge-form-top"><label>{t("knowledge.documentTitle")}<input name="title" placeholder={t("knowledge.documentTitlePlaceholder")} required/></label><label>{t("knowledge.tags")}<input name="tags" placeholder={t("knowledge.tagsPlaceholder")}/></label></div>
        <label className="knowledge-content-field">{t("knowledge.content")}<textarea name="content" rows={7} placeholder={t("knowledge.contentPlaceholder")}/></label>
        <div className="knowledge-options"><label>{t("knowledge.visibility")}<StyledSelect name="visibility" defaultValue="ALL"><option value="ALL">{t("knowledge.allUsers")}</option><option value="SELECTED">{t("knowledge.selectedUsers")}</option><option value="HIDDEN">{t("knowledge.hiddenUsers")}</option></StyledSelect></label><label className="knowledge-user-select">{t("knowledge.selectedUsersLabel")}<select name="visibleUserIds" multiple size={Math.min(4, Math.max(2, members.data?.length ?? 2))}>{members.data?.filter((member) => member.active).map((member) => <option key={member.user.id} value={member.user.id}>{member.user.displayName} · {member.user.email}</option>)}</select><small>{t("knowledge.multiSelectHint")}</small></label>{canManageGlobal && <label className="knowledge-user-select">{t("knowledge.globalOrganizations")}<select name="visibleOrganizationIds" multiple size={Math.min(4, Math.max(2, organizations.data?.length ?? 2))}>{organizations.data?.map((organization) => <option key={organization.id} value={organization.id}>{locale === "en" ? organization.nameEn : organization.nameFa}</option>)}</select><small>{t("knowledge.emptyAllHint")}</small></label>}<label className="checkbox-card"><input name="published" type="checkbox" defaultChecked/><span><strong>{t("knowledge.visibleToUsers")}</strong><small>{t("knowledge.visibleToUsersHint")}</small></span></label><label className="checkbox-card"><input name="aiReadable" type="checkbox" defaultChecked/><span><strong>{t("knowledge.aiReadable")}</strong><small>{t("knowledge.aiReadableHint")}</small></span></label><label className="checkbox-card"><input name="aiOnly" type="checkbox"/><span><strong>{t("knowledge.aiOnly")}</strong><small>{t("knowledge.aiOnlyHint")}</small></span></label>{canManageGlobal && <label className="checkbox-card"><input name="isGlobal" type="checkbox"/><span><strong>{t("knowledge.globalDefault")}</strong><small>{t("knowledge.globalDefaultHint")}</small></span></label>}<label className="knowledge-file"><span>{t("knowledge.attachment")}</span><input name="file" type="file" disabled={quota.data?.canUpload === false} accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx,.xlsx,.csv,.txt"/><small>{t("knowledge.quotaHint", { size: quota.data?.maxFileSizeLabel ?? (locale === "en" ? "5 MB" : "۵ MB") })}</small></label></div>
        <div className="knowledge-form-footer"><span className="knowledge-form-note"><Icon name="assistant" size={17}/> {t("knowledge.registerNote")}</span><button className="primary knowledge-submit"><Icon name="plus"/> {t("knowledge.register")}</button></div>
      </AutoSaveForm>
    </SectionCard>}
    <SectionCard title={t("knowledge.visibleDocuments")} description={`${filtered.length.toLocaleString(numberLocale)} ${t("knowledge.visibleCount")}`} icon="knowledge">
      {!filtered.length ? <EmptyState title={t("knowledge.noSearchResult")} description={t("knowledge.noSearchResultDescription")} icon="search"/> : <div className="knowledge-grid">{filtered.map((item) => { const canEdit = canManageKnowledge && (!item.isGlobal || canManageGlobal); return <article className="knowledge-card" key={item.id}><div className="doc-icon"><Icon name="knowledge"/></div><div><div className="knowledge-title-row"><h3>{item.title}</h3><div className="knowledge-badges">{item.isGlobal && <span className="tag">{item.visibleOrganizationIds?.length ? t("common.selectedCompanies") : t("common.defaultAllCompanies")}</span>}{item.aiOnly && <span className="tag">{t("common.aiOnly")}</span>}{item.published === false && <StatusBadge value="DRAFT"/>}{item.aiReadable === false && <span className="tag">{t("common.humanOnly")}</span>}</div></div><p>{item.content || t("knowledge.fileOnly")}</p><div className="tag-row">{item.tags.map((tag) => <span className="tag" key={tag}>#{tag}</span>)}{item.visibility && item.visibility !== "ALL" && <span className="tag">{item.visibility === "SELECTED" ? t("common.selected") : t("common.hidden")}</span>}</div>{item.attachments?.length ? <div className="knowledge-attachments">{item.attachments.map((file) => <div className="knowledge-attachment" key={file.id}><Icon name="files" size={15}/><span title={file.originalName}>{file.originalName} · {knowledgeFileSize(file.size)}</span><button className="icon-button" title={t("common.download")} onClick={() => void downloadAttachment(file)}><Icon name="download" size={14}/></button>{canEdit && <button className="icon-button danger" title={t("common.delete")} onClick={() => void removeAttachment(file)}><Icon name="trash" size={14}/></button>}</div>)}</div> : null}{item.updatedAt && <small>{t("knowledge.updated")}: {formatDate(item.updatedAt)} · {t("common.version")} {item.version ?? 1}</small>}{canEdit && <div className="knowledge-actions"><button className="text-button" onClick={() => void edit(item)}>{t("common.edit")}</button>{!item.aiOnly && <button className="text-button" onClick={() => void togglePublished(item)}>{item.published === false ? t("knowledge.published") : t("knowledge.hide")}</button>}{(!item.aiOnly || item.aiReadable === false) && <button className="text-button" onClick={() => void toggleAiReadable(item)}>{item.aiReadable === false ? t("knowledge.enableAi") : t("knowledge.disableAi")}</button>}{canManageGlobal && <button className="text-button" onClick={() => void toggleAiOnly(item)}>{item.aiOnly ? t("knowledge.humanView") : t("common.aiOnly")}</button>}<button className="text-button danger-link" onClick={() => void remove(item)}>{t("common.delete")}</button></div>}</div></article>; })}</div>}
    </SectionCard>
  </section>;
}

type Notification = { id: string; title: string; message: string; readAt?: string; createdAt: string };
type NotificationPreferences = { emailEnabled: boolean; pushEnabled: boolean; riskAlerts: boolean; dueReminders: boolean };
export function NotificationsPage() {
  const state = useLoad<Notification[]>("/notifications"); const preferences = useLoad<NotificationPreferences>("/notifications/preferences"); const unread = state.data?.filter((x) => !x.readAt).length ?? 0; const [error, setError] = useState("");
  const { locale, t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  async function markOne(id: string) { try { setError(""); await api(`/notifications/${id}/read`, { method: "PATCH" }); state.reload(); } catch (reason) { setError((reason as Error).message); } }
  async function markAll() { try { setError(""); await api("/notifications/read-all", { method: "POST" }); state.reload(); } catch (reason) { setError((reason as Error).message); } }
  async function togglePreference(key: keyof NotificationPreferences, value: boolean) { try { setError(""); await api("/notifications/preferences", { method: "PATCH", body: JSON.stringify({ [key]: value }) }); preferences.reload(); } catch (reason) { setError((reason as Error).message); } }
  const preferenceData = preferences.data;
  return <section className="page-shell"><PageHeader eyebrow={t("notifications.eyebrow")} title={t("notifications.title")} description={`${unread.toLocaleString(numberLocale)} ${t("notifications.unread")}`} actions={<button className="ghost" disabled={!unread} onClick={() => void markAll()}><Icon name="check"/> {t("notifications.readAll")}</button>}/>
     {error && <div className="alert error"><Icon name="warning"/>{error}</div>}
     {preferenceData && <SectionCard title={t("notifications.settings")} description={t("notifications.settingsDescription")} icon="notifications"><div className="preference-grid">{([ ["emailEnabled", "notifications.email", "notifications.emailDescription"], ["pushEnabled", "notifications.browser", "notifications.browserDescription"], ["riskAlerts", "notifications.risk", "notifications.riskDescription"], ["dueReminders", "notifications.due", "notifications.dueDescription"] ] as const).map(([key, labelKey, descriptionKey]) => <label className="checkbox-card" key={key}><input type="checkbox" checked={preferenceData[key]} onChange={(event) => void togglePreference(key, event.target.checked)}/><span><strong>{t(labelKey)}</strong><small>{t(descriptionKey)}</small></span></label>)}</div></SectionCard>}
     <LoadState state={state} empty={t("notifications.none")}>{(data) => <div className="notification-list">{data.map((item) => <article className={`notification-card ${item.readAt ? "read" : "unread"}`} key={item.id}><span className="notification-icon"><Icon name={item.title.includes("بحرانی") || item.title.toLowerCase().includes("critical") ? "warning" : "notifications"}/></span><div><div className="notification-title"><h3>{item.title}</h3>{!item.readAt && <span>{t("notifications.new")}</span>}</div><p>{item.message}</p><small>{formatDate(item.createdAt, true)}</small></div>{!item.readAt && <button className="icon-button" title={t("notifications.markRead")} onClick={() => void markOne(item.id)}><Icon name="check"/></button>}</article>)}</div>}</LoadState>
  </section>;
}

type ActivityLogEntry = {
  id: string;
  action: string;
  category: "AUTH" | "ASSESSMENT" | "AI" | "OTHER";
  entityType?: string | null;
  entityId?: string | null;
  metadata?: unknown;
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  assessment?: { type: "FMEA" | "RULA"; id: string; title: string; code: string | null } | null;
  tokenUsage?: { useCase: string; provider: string; model: string | null; inputTokens: number; outputTokens: number; totalTokens: number; sourceType: string; createdAt: string } | null;
  user?: { id: string; displayName: string; email?: string | null } | null;
};

const activityActionKeys: Record<string, string> = {
  LOGIN: "activityLog.actions.login",
  LOGOUT: "activityLog.actions.logout",
  FAILED_LOGIN: "activityLog.actions.failedLogin",
  FMEA_CREATE: "activityLog.actions.assessmentCreated",
  RULA_CREATE: "activityLog.actions.assessmentCreated",
  FMEA_UPDATE: "activityLog.actions.assessmentUpdated",
  RULA_UPDATE: "activityLog.actions.assessmentUpdated",
  FMEA_DELETE: "activityLog.actions.assessmentArchived",
  RULA_DELETE: "activityLog.actions.assessmentArchived",
  FMEA_DUPLICATE: "activityLog.actions.assessmentDuplicated",
  RULA_DUPLICATE: "activityLog.actions.assessmentDuplicated",
  FMEA_REPORT_SAVED: "activityLog.actions.reportSaved",
  AI_REQUEST_CREATE: "activityLog.actions.aiRequest",
  AI_REQUEST_RETRY: "activityLog.actions.aiRetry",
  CHAT_MESSAGE: "activityLog.actions.chatMessage",
};

function activityActionLabel(action: string, t: (key: string) => string): string {
  const key = activityActionKeys[action];
  if (key) return t(key);
  if (action.startsWith("FMEA_") || action.startsWith("RULA_")) return t("activityLog.actions.assessmentActivity");
  if (action.startsWith("AI_") || action.startsWith("CHAT_") || action.includes("IMAGE_ANALYSIS") || action.includes("SUGGESTION")) return t("activityLog.actions.aiActivity");
  return t("activityLog.actions.systemActivity");
}

function activityCategoryLabel(category: ActivityLogEntry["category"], t: (key: string) => string): string {
  return t({ AUTH: "activityLog.categories.auth", ASSESSMENT: "activityLog.categories.assessment", AI: "activityLog.categories.ai", OTHER: "activityLog.categories.other" }[category]);
}

export function ActivityLogPage() {
  const { locale, t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const role = getCurrentRole();
  const canViewTeam = ["SUPER_ADMIN", "ORG_ADMIN", "HSE_MANAGER"].includes(role);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const activityLogPath = useMemo(() => {
    const params = new URLSearchParams({ limit: "100" });
    if (search.trim()) params.set("search", search.trim());
    if (action.trim()) params.set("action", action.trim());
    if (entityType.trim()) params.set("entityType", entityType.trim());
    return `/activity-log?${params.toString()}`;
  }, [search, action, entityType]);
  const state = useLoad<ActivityLogEntry[]>(activityLogPath);
  const [searchInput, setSearchInput] = useState("");
  const [actionInput, setActionInput] = useState("");
  const [entityInput, setEntityInput] = useState("");

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(searchInput);
    setAction(actionInput);
    setEntityType(entityInput);
    setExpandedId(null);
  }

  function clearFilters() {
    setSearchInput(""); setActionInput(""); setEntityInput(""); setSearch(""); setAction(""); setEntityType(""); setExpandedId(null);
  }

  return <section className="page-shell"><PageHeader eyebrow={t("activityLog.eyebrow")} title={t("activityLog.title")} description={t(canViewTeam ? "activityLog.teamDescription" : "activityLog.selfDescription")} actions={<button className="ghost" type="button" onClick={state.reload}><Icon name="activity"/> {t("common.retry")}</button>}/>
    <SectionCard title={t("activityLog.report")} icon="audit">
      <form className="activity-log-filters" onSubmit={submitFilters}>
        <label><span>{t("activityLog.search")}</span><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={t("activityLog.searchPlaceholder")} /></label>
        <label><span>{t("activityLog.actionFilter")}</span><input value={actionInput} onChange={(event) => setActionInput(event.target.value)} placeholder="LOGIN" dir="ltr" /></label>
        <label><span>{t("activityLog.entityFilter")}</span><input value={entityInput} onChange={(event) => setEntityInput(event.target.value)} placeholder="User" dir="ltr" /></label>
        <div className="activity-log-filter-actions"><button className="primary" type="submit"><Icon name="search"/> {t("activityLog.search")}</button>{(search || action || entityType) && <button className="ghost" type="button" onClick={clearFilters}>{t("admin.reset")}</button>}</div>
      </form>
      <LoadState state={state} empty={t("activityLog.none")}>{(data) => <div className="table-wrap activity-log-table"><table><thead><tr><th>{t("activityLog.time")}</th><th>{t("activityLog.user")}</th><th>{t("activityLog.activity")}</th><th>{t("activityLog.assessment")}</th><th>{t("activityLog.tokenUsage")}</th><th>{t("activityLog.details")}</th></tr></thead><tbody>{data.map((item) => <Fragment key={item.id}><tr><td>{formatDate(item.createdAt, true)}</td><td><strong>{item.user?.displayName ?? t("common.system")}</strong><small dir="ltr">{item.user?.email ?? ""}</small></td><td><span className={`activity-category ${item.category.toLowerCase()}`}>{activityCategoryLabel(item.category, t)}</span><strong>{activityActionLabel(item.action, t)}</strong><small><code className="event-code" dir="ltr">{item.action}</code></small></td><td>{item.assessment ? <div className="activity-log-assessment"><strong>{item.assessment.type === "FMEA" ? t("activityLog.fmea") : t("activityLog.rula")}</strong><small>{item.assessment.title}{item.assessment.code ? ` · ${item.assessment.code}` : ""}</small></div> : item.entityType ? <span dir="ltr">{item.entityType}{item.entityId ? ` · ${item.entityId}` : ""}</span> : t("common.none")}</td><td>{item.tokenUsage ? <div className="activity-log-token"><strong>{item.tokenUsage.totalTokens.toLocaleString(numberLocale)}</strong><small>{t("activityLog.tokens")}</small></div> : t("common.none")}</td><td><button type="button" className="text-button" onClick={() => setExpandedId((current) => current === item.id ? null : item.id)}>{expandedId === item.id ? t("activityLog.hideDetails") : t("activityLog.details")}</button></td></tr>{expandedId === item.id && <tr className="activity-log-detail-row"><td colSpan={6}><div className="activity-log-detail"><div className="activity-log-detail-summary"><div><strong>{t("activityLog.event")}</strong><code dir="ltr">{item.action}</code></div><div><strong>{t("activityLog.entity")}</strong><span dir="ltr">{item.entityType ? `${item.entityType}${item.entityId ? ` · ${item.entityId}` : ""}` : t("common.none")}</span></div><div><strong>{t("activityLog.request")}</strong><code dir="ltr">{item.requestId ?? t("common.none")}</code></div><div><strong>{t("activityLog.ip")}</strong><code dir="ltr">{item.ipAddress ?? t("common.none")}</code></div>{item.tokenUsage && <div><strong>{t("activityLog.tokenUsage")}</strong><span dir="ltr">{t("activityLog.tokenBreakdown", { input: item.tokenUsage.inputTokens, output: item.tokenUsage.outputTokens, total: item.tokenUsage.totalTokens })}</span><small dir="ltr">{item.tokenUsage.provider}{item.tokenUsage.model ? ` · ${item.tokenUsage.model}` : ""}</small></div>}</div><div><strong>{t("activityLog.metadata")}</strong><pre dir="ltr">{item.metadata ? JSON.stringify(item.metadata, null, 2) : t("common.none")}</pre></div><div><strong>{t("activityLog.userAgent")}</strong><pre dir="ltr">{item.userAgent ?? t("common.none")}</pre></div></div></td></tr>}</Fragment>)}</tbody></table></div>}</LoadState>
    </SectionCard>
  </section>;
}

// Compatibility export for older imports; the user-facing route is Activity Log.
export const AuditPage = ActivityLogPage;

export function HealthPage() {
  const state = useLoad<Record<string, string>>("/health");
  const { t } = useI18n();
  const label: Record<string, string> = { status: "health.status", database: "health.database", redis: "health.redis", storage: "health.storage", ai: "health.ai" };
  const description: Record<string, string> = { status: "health.statusDescription", database: "health.databaseDescription", redis: "health.redisDescription", storage: "health.storageDescription", ai: "health.aiDescription" };
  return <section className="page-shell"><PageHeader eyebrow={t("health.eyebrow")} title={t("health.title")} description={t("health.description")} actions={<button className="ghost" onClick={state.reload}><Icon name="activity"/> {t("health.refresh")}</button>}/>
    <LoadState state={state}>{(data) => <div className="health-grid">{Object.entries(data).map(([key, value]) => { const good = !["down", "unhealthy", "failed"].includes(value.toLowerCase()); return <article className="health-card" key={key}><span className={`health-icon ${good ? "good" : "bad"}`}><Icon name={key === "database" ? "folder" : key === "ai" ? "assistant" : key === "storage" ? "files" : "health"}/></span><div><small>{label[key] ? t(label[key]) : key}</small><strong>{value}</strong><p>{description[key] ? t(description[key]) : ""}</p></div><span className={`health-state ${good ? "good" : "bad"}`}>{good ? t("health.ready") : t("health.error")}</span></article>; })}</div>}</LoadState>
  </section>;
}
