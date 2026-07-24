import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { api, getCurrentRole, useLoad } from "../../api/client";
import { EmptyState, Icon, PageHeader, SectionCard, StatusBadge, formatDate, type IconName } from "../../components/UI";

export function LoadState<T>({ state, children, empty = "داده‌ای ثبت نشده است." }: { state: ReturnType<typeof useLoad<T>>; children: (data: T) => ReactNode; empty?: string }) {
  if (state.loading) return <div className="state"><div className="spinner"/><p>در حال دریافت اطلاعات…</p></div>;
  if (state.error) return <div className="state error-state"><span className="state-icon"><Icon name="warning" size={27}/></span><h3>دریافت اطلاعات ناموفق بود</h3><p>{state.error}</p><button className="primary" onClick={state.reload}>تلاش دوباره</button></div>;
  if (!state.data || (Array.isArray(state.data) && !state.data.length)) return <EmptyState title={empty} icon="folder"/>;
  return <>{children(state.data)}</>;
}

type DashboardData = {
  counters: Record<string, number>;
  riskDistribution: Array<{ riskLevel: string; _count: number }>;
  actionDistribution: Array<{ status: string; _count: number }>;
  recent: { fmeas: Array<{ id: string; title: string; code: string; status: string; updatedAt?: string }>; rulas: Array<{ id: string; title: string; score: number; actionLevel: number; updatedAt?: string }> };
};

const kpis: Record<string, { label: string; caption: string; icon: IconName; tone: string; href: string }> = {
  projects: { label: "پروژه‌های فعال", caption: "پروژه‌های ثبت‌شده", icon: "projects", tone: "teal", href: "/projects" },
  fmeas: { label: "ارزیابی FMEA", caption: "ارزیابی‌های ریسک", icon: "fmea", tone: "blue", href: "/fmea" },
  rulas: { label: "ارزیابی RULA", caption: "ارزیابی‌های ارگونومی", icon: "rula", tone: "violet", href: "/rula" },
  openActions: { label: "اقدامات باز", caption: "نیازمند پیگیری", icon: "actions", tone: "amber", href: "/actions" },
  overdueActions: { label: "اقدامات معوق", caption: "عبور از موعد", icon: "clock", tone: "orange", href: "/actions" },
  criticalItems: { label: "ریسک بحرانی", caption: "نیازمند اقدام فوری", icon: "warning", tone: "red", href: "/fmea" },
};
const riskLabels: Record<string, string> = { LOW: "کم", MEDIUM: "متوسط", HIGH: "زیاد", CRITICAL: "بحرانی" };
const riskColors: Record<string, string> = { LOW: "#2b9a6f", MEDIUM: "#e0a129", HIGH: "#e4772c", CRITICAL: "#d94f4f" };

export function DashboardPage() {
  const state = useLoad<DashboardData>("/dashboard");
  return <section className="page-shell">
    <PageHeader eyebrow="مرکز کنترل HSE" title="داشبورد مدیریتی" description="تصویر لحظه‌ای از ریسک‌ها، ارزیابی‌ها و اقدامات اصلاحی سازمان" actions={<Link className="primary button-link" to="/fmea"><Icon name="plus"/> ارزیابی جدید</Link>}/>
    <LoadState state={state}>{(data) => {
      const totalRisk = data.riskDistribution.reduce((sum, item) => sum + Number(item._count), 0) || 1;
      const recent = [
        ...data.recent.fmeas.map((item) => ({ type: "FMEA", title: item.title, meta: item.code, value: item.status, date: item.updatedAt, href: "/fmea" })),
        ...data.recent.rulas.map((item) => ({ type: "RULA", title: item.title, meta: `سطح اقدام ${item.actionLevel}`, value: `امتیاز ${item.score}`, date: item.updatedAt, href: "/rula" })),
      ].slice(0, 6);
      return <>
        <div className="kpi-grid">
          {Object.entries(data.counters).map(([key, value]) => { const item = kpis[key] ?? { label: key, caption: "", icon: "chart" as IconName, tone: "teal", href: "/" }; return <Link to={item.href} className={`kpi-card ${item.tone}`} key={key}>
            <span className="kpi-icon"><Icon name={item.icon}/></span><div className="kpi-copy"><small>{item.label}</small><strong>{value.toLocaleString("fa-IR")}</strong><span>{item.caption}</span></div><Icon name="arrow" size={18} className="kpi-arrow"/>
          </Link>; })}
        </div>
        <div className="dashboard-grid">
          <SectionCard title="توزیع سطح ریسک" description="ترکیب ریسک‌های ثبت‌شده در FMEA" icon="chart" className="risk-panel">
            {!data.riskDistribution.length ? <EmptyState title="هنوز ریسکی ثبت نشده است" description="پس از ثبت ردیف‌های FMEA نمودار در این بخش نمایش داده می‌شود." icon="chart"/> : <div className="risk-bars">
              {data.riskDistribution.map((item) => <div className="risk-row" key={item.riskLevel}>
                <div className="risk-row-head"><span><i style={{ background: riskColors[item.riskLevel] }}/>{riskLabels[item.riskLevel] ?? item.riskLevel}</span><strong>{item._count.toLocaleString("fa-IR")}</strong></div>
                <div className="progress-track"><span style={{ width: `${Math.max(6, (item._count / totalRisk) * 100)}%`, background: riskColors[item.riskLevel] }}/></div>
              </div>)}
            </div>}
          </SectionCard>
          <SectionCard title="وضعیت اقدامات اصلاحی" description="نمایش جریان اقدامات تا مرحله تکمیل" icon="actions">
            {!data.actionDistribution.length ? <EmptyState title="اقدامی ثبت نشده است" icon="actions"/> : <div className="action-summary">
              {data.actionDistribution.map((item) => <div className="summary-row" key={item.status}><StatusBadge value={item.status}/><strong>{item._count.toLocaleString("fa-IR")}</strong></div>)}
            </div>}
            <Link className="text-link" to="/actions">مشاهده همه اقدامات <Icon name="arrow" size={16}/></Link>
          </SectionCard>
          <SectionCard title="آخرین ارزیابی‌ها" description="آخرین تغییرات در ارزیابی‌های سازمان" icon="activity" className="recent-panel">
            {!recent.length ? <EmptyState title="ارزیابی تازه‌ای وجود ندارد" icon="activity"/> : <div className="recent-list">{recent.map((item, index) => <Link to={item.href} className="recent-item" key={`${item.type}-${index}`}>
              <span className={`recent-type ${item.type.toLowerCase()}`}>{item.type}</span><div><strong>{item.title}</strong><small>{item.meta}{item.date ? ` · ${formatDate(item.date)}` : ""}</small></div><span className="recent-value">{item.type === "FMEA" ? <StatusBadge value={item.value}/> : item.value}</span>
            </Link>)}</div>}
          </SectionCard>
          <SectionCard title="دسترسی سریع" description="عملیات پرکاربرد سامانه" icon="sparkles">
            <div className="quick-actions">
              <Link to="/fmea"><Icon name="fmea"/><span><strong>FMEA جدید</strong><small>ارزیابی ریسک فرایند</small></span></Link>
              <Link to="/rula"><Icon name="rula"/><span><strong>RULA جدید</strong><small>ارزیابی ارگونومی</small></span></Link>
              <Link to="/actions"><Icon name="actions"/><span><strong>اقدام اصلاحی</strong><small>ثبت و پیگیری اقدام</small></span></Link>
              <Link to="/assistant"><Icon name="assistant"/><span><strong>دستیار هوشمند</strong><small>راهنمای تخصصی HSE</small></span></Link>
            </div>
          </SectionCard>
        </div>
      </>;
    }}</LoadState>
  </section>;
}

type Project = { id: string; name: string; code: string; status: string; description?: string; updatedAt?: string };
type Process = { id: string; projectId: string; name: string };
type Activity = { id: string; projectId: string; processId?: string; title: string; location?: string };

export function ProjectsPage() {
  const projects = useLoad<Project[]>("/projects");
  const processes = useLoad<Process[]>("/processes");
  const activities = useLoad<Activity[]>("/activities");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canManage = ["SUPER_ADMIN", "ORG_ADMIN", "HSE_MANAGER"].includes(getCurrentRole());
  async function create(path: string, event: FormEvent<HTMLFormElement>, reload: () => void, message: string) {
    event.preventDefault(); setError(""); setSuccess("");
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form));
    for (const [key, value] of Object.entries(payload)) if (value === "") delete payload[key];
    try { await api(path, { method: "POST", body: JSON.stringify(payload) }); form.reset(); reload(); setSuccess(message); }
    catch (reason) { setError((reason as Error).message); }
  }
  const counts = { projects: projects.data?.length ?? 0, processes: processes.data?.length ?? 0, activities: activities.data?.length ?? 0 };
  return <section className="page-shell">
    <PageHeader eyebrow="ساختار عملیاتی" title="پروژه‌ها و فرایندها" description="پروژه‌ها، فرایندها و فعالیت‌های شغلی را در یک ساختار یکپارچه مدیریت کنید."/>
    {error && <div className="alert error"><Icon name="warning"/>{error}</div>}{success && <div className="alert success"><Icon name="check"/>{success}</div>}
    <div className="mini-stats"><div><Icon name="projects"/><strong>{counts.projects.toLocaleString("fa-IR")}</strong><span>پروژه</span></div><div><Icon name="activity"/><strong>{counts.processes.toLocaleString("fa-IR")}</strong><span>فرایند</span></div><div><Icon name="folder"/><strong>{counts.activities.toLocaleString("fa-IR")}</strong><span>فعالیت</span></div></div>
    {canManage && <div className="form-panels">
      <SectionCard title="پروژه جدید" description="تعریف دامنه اصلی فعالیت سازمان" icon="projects">
        <form className="form-grid" onSubmit={(event) => create("/projects", event, projects.reload, "پروژه با موفقیت ایجاد شد.")}>
          <label>نام پروژه<input name="name" placeholder="مثلاً توسعه خط تولید" required/></label><label>کد یکتا<input name="code" placeholder="مثلاً PRJ-001" required/></label><label className="full">شرح پروژه<textarea name="description" rows={3} placeholder="هدف و محدوده پروژه را بنویسید"/></label><button className="primary full"><Icon name="plus"/> ایجاد پروژه</button>
        </form>
      </SectionCard>
      <SectionCard title="فرایند جدید" description="فرایند را به پروژه مربوط متصل کنید" icon="activity">
        <form className="form-grid" onSubmit={(event) => create("/processes", event, processes.reload, "فرایند با موفقیت ایجاد شد.")}>
          <label className="full">پروژه<select name="projectId" required><option value="">انتخاب پروژه</option>{projects.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label className="full">نام فرایند<input name="name" placeholder="مثلاً مونتاژ قطعات" required/></label><label className="full">شرح<textarea name="description" rows={3} placeholder="شرح کوتاه فرایند"/></label><button className="primary full"><Icon name="plus"/> ایجاد فرایند</button>
        </form>
      </SectionCard>
    </div>}
    {canManage && <SectionCard title="ثبت فعالیت شغلی" description="فعالیت را به پروژه و در صورت نیاز به فرایند متصل کنید" icon="plus">
      <form className="inline-form" onSubmit={(event) => create("/activities", event, activities.reload, "فعالیت با موفقیت ثبت شد.")}>
        <label>پروژه<select name="projectId" required><option value="">انتخاب پروژه</option>{projects.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>فرایند<select name="processId"><option value="">بدون فرایند</option>{processes.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>عنوان فعالیت<input name="title" placeholder="عنوان فعالیت" required/></label><label>محل انجام<input name="location" placeholder="کارگاه، سالن، سایت…"/></label><button className="primary"><Icon name="plus"/> ثبت فعالیت</button>
      </form>
    </SectionCard>}
    <SectionCard title="فهرست پروژه‌ها" description="خلاصه ساختار و وضعیت پروژه‌های سازمان" icon="folder">
      <LoadState state={projects} empty="هنوز پروژه‌ای ایجاد نشده است.">{(data) => <div className="project-cards">{data.map((project) => {
        const processCount = processes.data?.filter((x) => x.projectId === project.id).length ?? 0;
        const activityCount = activities.data?.filter((x) => x.projectId === project.id).length ?? 0;
        return <article className="project-card" key={project.id}><div className="project-top"><span className="project-code">{project.code}</span><StatusBadge value={project.status}/></div><h3>{project.name}</h3><p>{project.description || "برای این پروژه توضیحی ثبت نشده است."}</p><div className="project-meta"><span><Icon name="activity" size={16}/>{processCount.toLocaleString("fa-IR")} فرایند</span><span><Icon name="folder" size={16}/>{activityCount.toLocaleString("fa-IR")} فعالیت</span></div></article>;
      })}</div>}</LoadState>
    </SectionCard>
  </section>;
}

type Action = { id: string; title: string; description?: string; priority: string; status: string; progress: number; dueDate?: string; assigneeName?: string };
export function ActionsPage() {
  const state = useLoad<Action[]>("/actions");
  const projects = useLoad<Project[]>("/projects");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const canEditActions = ["SUPER_ADMIN", "ORG_ADMIN", "HSE_MANAGER", "ASSESSOR"].includes(getCurrentRole());
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); setError("");
    try { await api("/actions", { method: "POST", body: JSON.stringify({ projectId: form.get("projectId"), title: form.get("title"), description: form.get("description"), priority: form.get("priority"), assigneeName: form.get("assigneeName") || null, dueDate: form.get("dueDate") || null }) }); formElement.reset(); state.reload(); setMessage("اقدام اصلاحی ثبت شد."); }
    catch (reason) { setError((reason as Error).message); }
  }
  const openCount = state.data?.filter((x) => !["COMPLETED", "CANCELLED"].includes(x.status)).length ?? 0;
  const doneCount = state.data?.filter((x) => x.status === "COMPLETED").length ?? 0;
  return <section className="page-shell">
    <PageHeader eyebrow="چرخه بهبود" title="اقدامات اصلاحی" description="اقدامات را ثبت، مسئول مشخص و پیشرفت آن‌ها را تا تکمیل پیگیری کنید."/>
    {error && <div className="alert error"><Icon name="warning"/>{error}</div>}{message && <div className="alert success"><Icon name="check"/>{message}</div>}
    <div className="mini-stats"><div><Icon name="actions"/><strong>{openCount.toLocaleString("fa-IR")}</strong><span>اقدام باز</span></div><div><Icon name="check"/><strong>{doneCount.toLocaleString("fa-IR")}</strong><span>تکمیل‌شده</span></div><div><Icon name="chart"/><strong>{state.data?.length ? Math.round(state.data.reduce((s, x) => s + x.progress, 0) / state.data.length).toLocaleString("fa-IR") : "۰"}%</strong><span>میانگین پیشرفت</span></div></div>
    {canEditActions && <SectionCard title="ثبت اقدام جدید" description="برای هر اقدام، پروژه، اولویت، مسئول و موعد را مشخص کنید." icon="plus">
      <form className="action-form" onSubmit={create}><label>پروژه<select name="projectId" required><option value="">انتخاب پروژه</option>{projects.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>عنوان اقدام<input name="title" placeholder="مثلاً نصب حفاظ دستگاه" required/></label><label className="wide">شرح اقدام<input name="description" placeholder="شرح دقیق اقدام موردنیاز" required/></label><label>اولویت<select name="priority"><option value="MEDIUM">متوسط</option><option value="HIGH">زیاد</option><option value="CRITICAL">بحرانی</option><option value="LOW">کم</option></select></label><label>مسئول<input name="assigneeName" placeholder="نام مسئول"/></label><label>موعد انجام<input name="dueDate" type="date"/></label><button className="primary"><Icon name="plus"/> ثبت اقدام</button></form>
    </SectionCard>}
    <SectionCard title="فهرست اقدامات" description="وضعیت هر اقدام را مستقیماً از جدول به‌روزرسانی کنید." icon="actions">
      <LoadState state={state} empty="اقدام اصلاحی ثبت نشده است.">{(data) => <div className="table-wrap"><table><thead><tr><th>اقدام</th><th>اولویت</th><th>وضعیت</th><th>پیشرفت</th><th>مسئول</th><th>موعد</th></tr></thead><tbody>{data.map((item) => <tr key={item.id}><td><strong>{item.title}</strong><small>{item.description}</small></td><td><StatusBadge value={item.priority}/></td><td>{canEditActions ? <select className="compact-select" value={item.status} onChange={async (event) => { try { setError(""); await api(`/actions/${item.id}`, { method: "PATCH", body: JSON.stringify({ status: event.target.value }) }); state.reload(); } catch (reason) { setError((reason as Error).message); } }}><option value="OPEN">باز</option><option value="IN_PROGRESS">در حال انجام</option><option value="WAITING_FOR_REVIEW">در انتظار بازبینی</option><option value="COMPLETED">تکمیل‌شده</option><option value="REJECTED">ردشده</option></select> : <StatusBadge value={item.status}/>}</td><td><div className="table-progress"><div><span style={{ width: `${item.progress}%` }}/></div><b>{item.progress.toLocaleString("fa-IR")}%</b></div></td><td>{item.assigneeName ?? "—"}</td><td>{formatDate(item.dueDate)}</td></tr>)}</tbody></table></div>}</LoadState>
    </SectionCard>
  </section>;
}

type Knowledge = { id: string; title: string; content: string; tags: string[]; updatedAt?: string };
export function KnowledgePage() {
  const state = useLoad<Knowledge[]>("/knowledge");
  const [query, setQuery] = useState(""); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const canManageKnowledge = ["SUPER_ADMIN", "ORG_ADMIN", "HSE_MANAGER"].includes(getCurrentRole());
  const filtered = useMemo(() => (state.data ?? []).filter((item) => `${item.title} ${item.content} ${item.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase())), [state.data, query]);
  async function create(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const element = event.currentTarget; const form = new FormData(element); setError(""); try { await api("/knowledge", { method: "POST", body: JSON.stringify({ title: form.get("title"), content: form.get("content"), tags: String(form.get("tags") || "").split(",").map((x) => x.trim()).filter(Boolean) }) }); element.reset(); state.reload(); setMessage("سند دانش منتشر شد."); } catch (reason) { setError((reason as Error).message); } }
  return <section className="page-shell">
    <PageHeader eyebrow="دانش سازمانی" title="پایگاه دانش" description="رویه‌ها، راهنماها و تجربه‌های HSE را برای استفاده کاربران و دستیار هوشمند ثبت کنید." actions={<div className="search-box"><Icon name="search"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جستجو در اسناد…"/></div>}/>
    {error && <div className="alert error"><Icon name="warning"/>{error}</div>}{message && <div className="alert success"><Icon name="check"/>{message}</div>}
    {canManageKnowledge && <SectionCard title="سند دانش جدید" description="محتوا پس از انتشار در پاسخ‌های دستیار هوشمند قابل استفاده است." icon="plus">
      <form className="knowledge-form" onSubmit={create}>
        <div className="knowledge-form-top">
          <label>عنوان سند<input name="title" placeholder="مثلاً راهنمای کنترل ریسک سقوط" required/></label>
          <label>برچسب‌ها<input name="tags" placeholder="مثلاً HSE، ریسک، ارگونومی"/></label>
        </div>
        <label className="knowledge-content-field">محتوای سند<textarea name="content" rows={7} placeholder="متن راهنما، روش اجرایی یا دانش تخصصی را اینجا وارد کنید…" required/></label>
        <div className="knowledge-form-footer">
          <span className="knowledge-form-note"><Icon name="assistant" size={17}/> این محتوا در جستجو و پاسخ‌های دستیار هوشمند استفاده می‌شود.</span>
          <button className="primary knowledge-submit"><Icon name="plus"/> انتشار سند</button>
        </div>
      </form>
    </SectionCard>}
    <SectionCard title="اسناد منتشرشده" description={`${filtered.length.toLocaleString("fa-IR")} سند قابل مشاهده`} icon="knowledge">
      {!filtered.length ? <EmptyState title="سندی مطابق جستجو پیدا نشد" description="عبارت دیگری را امتحان کنید یا سند تازه‌ای منتشر کنید." icon="search"/> : <div className="knowledge-grid">{filtered.map((item) => <article className="knowledge-card" key={item.id}><div className="doc-icon"><Icon name="knowledge"/></div><div><h3>{item.title}</h3><p>{item.content}</p><div className="tag-row">{item.tags.map((tag) => <span className="tag" key={tag}>#{tag}</span>)}</div>{item.updatedAt && <small>به‌روزرسانی: {formatDate(item.updatedAt)}</small>}</div></article>)}</div>}
    </SectionCard>
  </section>;
}

type Notification = { id: string; title: string; message: string; readAt?: string; createdAt: string };
export function NotificationsPage() {
  const state = useLoad<Notification[]>("/notifications"); const unread = state.data?.filter((x) => !x.readAt).length ?? 0; const [error, setError] = useState("");
  async function markOne(id: string) { try { setError(""); await api(`/notifications/${id}/read`, { method: "PATCH" }); state.reload(); } catch (reason) { setError((reason as Error).message); } }
  async function markAll() { try { setError(""); await api("/notifications/read-all", { method: "POST" }); state.reload(); } catch (reason) { setError((reason as Error).message); } }
  return <section className="page-shell"><PageHeader eyebrow="مرکز پیام" title="اعلان‌ها" description={`${unread.toLocaleString("fa-IR")} اعلان خوانده‌نشده`} actions={<button className="ghost" disabled={!unread} onClick={() => void markAll()}><Icon name="check"/> خواندن همه</button>}/>
    {error && <div className="alert error"><Icon name="warning"/>{error}</div>}
    <LoadState state={state} empty="اعلان جدیدی ندارید.">{(data) => <div className="notification-list">{data.map((item) => <article className={`notification-card ${item.readAt ? "read" : "unread"}`} key={item.id}><span className="notification-icon"><Icon name={item.title.includes("بحرانی") ? "warning" : "notifications"}/></span><div><div className="notification-title"><h3>{item.title}</h3>{!item.readAt && <span>جدید</span>}</div><p>{item.message}</p><small>{formatDate(item.createdAt, true)}</small></div>{!item.readAt && <button className="icon-button" title="علامت‌گذاری به‌عنوان خوانده‌شده" onClick={() => void markOne(item.id)}><Icon name="check"/></button>}</article>)}</div>}</LoadState>
  </section>;
}

type Audit = { id: string; action: string; entityType?: string; entityId?: string; createdAt: string; user?: { displayName: string; email?: string } };
export function AuditPage() {
  const state = useLoad<Audit[]>("/audit");
  return <section className="page-shell"><PageHeader eyebrow="ردیابی تغییرات" title="رویدادهای ممیزی" description="گزارش زمان‌مند عملیات کاربران و تغییرات مهم سامانه"/>
    <SectionCard title="گزارش رویدادها" icon="audit"><LoadState state={state} empty="رویدادی ثبت نشده است.">{(data) => <div className="table-wrap"><table><thead><tr><th>زمان</th><th>کاربر</th><th>رویداد</th><th>موجودیت</th></tr></thead><tbody>{data.map((item) => <tr key={item.id}><td>{formatDate(item.createdAt, true)}</td><td><strong>{item.user?.displayName ?? "سامانه"}</strong><small>{item.user?.email}</small></td><td><code className="event-code">{item.action}</code></td><td>{item.entityType ? `${item.entityType} · ${item.entityId ?? "—"}` : "—"}</td></tr>)}</tbody></table></div>}</LoadState></SectionCard>
  </section>;
}

export function HealthPage() {
  const state = useLoad<Record<string, string>>("/health");
  const label: Record<string, string> = { status: "وضعیت کلی", database: "پایگاه داده", redis: "صف و کش Redis", storage: "فضای ذخیره‌سازی", ai: "زیرساخت هوش مصنوعی" };
  const description: Record<string, string> = { status: "آمادگی سرویس Backend", database: "اتصال مستقیم به MySQL/MariaDB", redis: "در محیط محلی اختیاری است", storage: "محل نگهداری فایل‌های بارگذاری‌شده", ai: "آمادگی حالت Fallback و سرویس‌های خارجی" };
  return <section className="page-shell"><PageHeader eyebrow="پایش فنی" title="سلامت سامانه" description="وضعیت اتصال اجزای اصلی Backend و زیرساخت محلی" actions={<button className="ghost" onClick={state.reload}><Icon name="activity"/> بررسی مجدد</button>}/>
    <LoadState state={state}>{(data) => <div className="health-grid">{Object.entries(data).map(([key, value]) => { const good = !["down", "unhealthy", "failed"].includes(value.toLowerCase()); return <article className="health-card" key={key}><span className={`health-icon ${good ? "good" : "bad"}`}><Icon name={key === "database" ? "folder" : key === "ai" ? "assistant" : key === "storage" ? "files" : "health"}/></span><div><small>{label[key] ?? key}</small><strong>{value}</strong><p>{description[key]}</p></div><span className={`health-state ${good ? "good" : "bad"}`}>{good ? "آماده" : "خطا"}</span></article>; })}</div>}</LoadState>
  </section>;
}
