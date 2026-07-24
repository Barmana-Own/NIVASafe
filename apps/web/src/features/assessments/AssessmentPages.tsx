import { calculateRpn } from "@nivasafe/domain";
import { del as deleteDraft, get as getDraft, set as setDraft } from "idb-keyval";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api, download, getSession, useLoad } from "../../api/client";
import { EmptyState, Icon, PageHeader, SectionCard, StatusBadge } from "../../components/UI";
import { LoadState } from "../general/GeneralPages";

type Project = { id: string; name: string };
type FmeaItem = { id: string; rowNumber: number; processStep: string; failureMode: string; effect: string; cause: string; severity: number; occurrence: number; detection: number; rpn: number; riskLevel: string; recommendation?: string };
type Fmea = { id: string; title: string; code: string; scope?: string; status: string; version: number; project: Project; items: FmeaItem[] };
type Rula = { id: string; title: string; subjectCode?: string; score: number; actionLevel: number; explanation: string; status: string; version: number; project: Project };

const canEdit = () => { const { session, orgId } = getSession(); return ["SUPER_ADMIN", "ORG_ADMIN", "HSE_MANAGER", "ASSESSOR"].includes(session?.organizations.find((org) => org.id === orgId)?.role ?? "VIEWER"); };
async function saveBlob(path: string, filename: string) { const blob = await download(path); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url); }

export function FmeaPage() {
  const state = useLoad<Fmea[]>("/fmea");
  const projects = useLoad<Project[]>("/projects");
  const [selected, setSelected] = useState<string>("");
  const [draftNotice, setDraftNotice] = useState("");
  const [error, setError] = useState("");
  const [scores, setScores] = useState({ severity: 1, occurrence: 1, detection: 1 });
  const selectedAssessment = state.data?.find((item) => item.id === selected);
  const previewRpn = calculateRpn(scores.severity, scores.occurrence, scores.detection);

  useEffect(() => { getDraft("nivasafe-fmea-draft").then((draft) => draft && setDraftNotice("یک پیش‌نویس آفلاین ذخیره‌شده دارید.")); }, []);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); const formElement = event.currentTarget; const form = new FormData(formElement);
    const payload = { projectId: form.get("projectId"), title: form.get("title"), code: form.get("code"), scope: form.get("scope") || null };
    if (!navigator.onLine) { await setDraft("nivasafe-fmea-draft", payload); setDraftNotice("پیش‌نویس روی دستگاه ذخیره شد و پس از اتصال قابل ارسال است."); return; }
    try { await api("/fmea", { method: "POST", body: JSON.stringify(payload) }); await deleteDraft("nivasafe-fmea-draft"); formElement.reset(); state.reload(); setDraftNotice("ارزیابی FMEA ایجاد شد."); } catch (reason) { setError((reason as Error).message); }
  }
  async function syncDraft() { const payload = await getDraft("nivasafe-fmea-draft"); if (!payload) return; try { await api("/fmea", { method: "POST", body: JSON.stringify(payload) }); await deleteDraft("nivasafe-fmea-draft"); setDraftNotice("پیش‌نویس با موفقیت همگام شد."); state.reload(); } catch (reason) { setError((reason as Error).message); } }
  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return; setError(""); const formElement = event.currentTarget; const form = new FormData(formElement); const numeric = (name: string) => Number(form.get(name));
    try { await api(`/fmea/${selected}/items`, { method: "POST", body: JSON.stringify({ rowNumber: numeric("rowNumber"), processStep: form.get("processStep"), failureMode: form.get("failureMode"), effect: form.get("effect"), cause: form.get("cause"), preventiveControls: form.get("preventiveControls") || null, detectionControls: form.get("detectionControls") || null, severity: numeric("severity"), occurrence: numeric("occurrence"), detection: numeric("detection"), recommendation: form.get("recommendation") || null }) }); formElement.reset(); setScores({ severity: 1, occurrence: 1, detection: 1 }); state.reload(); } catch (reason) { setError((reason as Error).message); }
  }

  return <section className="page-shell">
    <PageHeader eyebrow="ارزیابی ریسک فرایند" title="ارزیابی FMEA" description="حالت‌های خرابی، اثرات و علل را ثبت کنید و عدد اولویت ریسک (RPN) را به‌صورت خودکار محاسبه کنید."/>
    {error && <div className="alert error"><Icon name="warning"/>{error}</div>}
    {draftNotice && <div className="alert info"><Icon name="files"/>{draftNotice}{navigator.onLine && draftNotice.includes("پیش‌نویس") && <button className="text-button" onClick={syncDraft}>همگام‌سازی</button>}</div>}
    {canEdit() && <SectionCard title="ایجاد ارزیابی جدید" description="اطلاعات پایه ارزیابی را وارد کنید؛ سپس ردیف‌های ریسک را اضافه کنید." icon="plus">
      <form className="assessment-create" onSubmit={create}><label>پروژه<select name="projectId" required><option value="">انتخاب پروژه</option>{projects.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>عنوان ارزیابی<input name="title" placeholder="مثلاً ارزیابی ریسک خط مونتاژ" required/></label><label>کد ارزیابی<input name="code" placeholder="FMEA-001" required/></label><label>دامنه<input name="scope" placeholder="بخش یا محدوده ارزیابی"/></label><button className="primary"><Icon name="plus"/> ایجاد FMEA</button></form>
    </SectionCard>}
    <SectionCard title="ارزیابی‌های ثبت‌شده" description="برای مشاهده ردیف‌ها و افزودن خطر، یک ارزیابی را انتخاب کنید." icon="fmea">
      <LoadState state={state} empty="هنوز ارزیابی FMEA ثبت نشده است.">{(data) => <div className="assessment-list">{data.map((item) => {
        const maxRpn = Math.max(0, ...item.items.map((row) => row.rpn));
        return <button type="button" className={`assessment-card ${selected === item.id ? "selected" : ""}`} key={item.id} onClick={() => setSelected(item.id)}><div className="assessment-card-head"><span className="project-code">{item.code}</span><StatusBadge value={item.status}/></div><h3>{item.title}</h3><p>{item.project.name}{item.scope ? ` · ${item.scope}` : ""}</p><div className="assessment-metrics"><span><b>{item.items.length.toLocaleString("fa-IR")}</b> ردیف ریسک</span><span><b>{maxRpn.toLocaleString("fa-IR")}</b> بیشترین RPN</span><span><b>{item.version.toLocaleString("fa-IR")}</b> نسخه</span></div>{canEdit() && <div className="card-actions"><span onClick={(event) => { event.stopPropagation(); void saveBlob(`/reports/fmea/${item.id}.pdf`, `${item.code}.pdf`).catch((reason) => setError((reason as Error).message)); }}><Icon name="download" size={16}/> PDF</span><span onClick={(event) => { event.stopPropagation(); void saveBlob(`/reports/fmea/${item.id}.xlsx`, `${item.code}.xlsx`).catch((reason) => setError((reason as Error).message)); }}><Icon name="download" size={16}/> Excel</span></div>}</button>;
      })}</div>}</LoadState>
    </SectionCard>
    {selectedAssessment && <SectionCard title={`ردیف‌های ریسک: ${selectedAssessment.title}`} description="جزئیات خطرهای ثبت‌شده در ارزیابی انتخابی" icon="chart">
      {!selectedAssessment.items.length ? <EmptyState title="هنوز ردیف ریسکی ثبت نشده است" description="از فرم پایین اولین ردیف خطر را اضافه کنید." icon="fmea"/> : <div className="table-wrap"><table><thead><tr><th>ردیف</th><th>مرحله فرایند</th><th>خطر / حالت خرابی</th><th>اثر</th><th>S</th><th>O</th><th>D</th><th>RPN</th><th>سطح ریسک</th></tr></thead><tbody>{selectedAssessment.items.map((row) => <tr key={row.id}><td>{row.rowNumber.toLocaleString("fa-IR")}</td><td>{row.processStep}</td><td><strong>{row.failureMode}</strong><small>{row.cause}</small></td><td>{row.effect}</td><td>{row.severity}</td><td>{row.occurrence}</td><td>{row.detection}</td><td><strong className="rpn-number">{row.rpn.toLocaleString("fa-IR")}</strong></td><td><StatusBadge value={row.riskLevel}/></td></tr>)}</tbody></table></div>}
    </SectionCard>}
    {selectedAssessment && canEdit() && <SectionCard title="افزودن ردیف خطر" description="امتیازهای شدت، وقوع و کشف بین ۱ تا ۱۰ هستند و RPN به‌صورت زنده محاسبه می‌شود." icon="plus">
      <form className="fmea-item-form" onSubmit={addItem}>
        <div className="form-grid three"><label>شماره ردیف<input name="rowNumber" type="number" min="1" placeholder="۱" required/></label><label>مرحله فرایند<input name="processStep" placeholder="مثلاً بلند کردن قطعه" required/></label><label>حالت خرابی / خطر<input name="failureMode" placeholder="مثلاً سقوط قطعه" required/></label><label>اثر خطر<input name="effect" placeholder="پیامد احتمالی" required/></label><label>علت<input name="cause" placeholder="علت بروز خطر" required/></label><label>کنترل پیشگیرانه<input name="preventiveControls" placeholder="کنترل‌های موجود"/></label><label>کنترل کشف<input name="detectionControls" placeholder="روش شناسایی یا بازرسی"/></label><label className="span-two">پیشنهاد کنترلی<textarea name="recommendation" rows={2} placeholder="اقدام پیشنهادی برای کاهش ریسک"/></label></div>
        <div className="score-panel"><label>شدت (S)<input name="severity" type="number" min="1" max="10" value={scores.severity} onChange={(e) => setScores((s) => ({ ...s, severity: Number(e.target.value) }))} required/></label><span>×</span><label>وقوع (O)<input name="occurrence" type="number" min="1" max="10" value={scores.occurrence} onChange={(e) => setScores((s) => ({ ...s, occurrence: Number(e.target.value) }))} required/></label><span>×</span><label>کشف (D)<input name="detection" type="number" min="1" max="10" value={scores.detection} onChange={(e) => setScores((s) => ({ ...s, detection: Number(e.target.value) }))} required/></label><div className="rpn-preview"><small>RPN محاسبه‌شده</small><strong>{previewRpn.toLocaleString("fa-IR")}</strong></div><button className="primary"><Icon name="plus"/> محاسبه و ثبت</button></div>
      </form>
    </SectionCard>}
  </section>;
}

const rulaFields = [
  ["upperArm", "بازوی بالا", "وضعیت و زاویه بازوی بالا"], ["lowerArm", "ساعد", "وضعیت و زاویه ساعد"], ["wrist", "مچ دست", "زاویه خم‌شدن مچ"], ["wristTwist", "چرخش مچ", "میزان چرخش مچ دست"], ["neck", "گردن", "وضعیت گردن"], ["trunk", "تنه", "وضعیت تنه و کمر"], ["legs", "پاها", "پایداری و وضعیت پاها"],
] as const;

export function RulaPage() {
  const state = useLoad<Rula[]>("/rula"); const projects = useLoad<Project[]>("/projects"); const [error, setError] = useState("");
  const overview = useMemo(() => ({ total: state.data?.length ?? 0, high: state.data?.filter((x) => x.actionLevel >= 3).length ?? 0, average: state.data?.length ? Math.round(state.data.reduce((s, x) => s + x.score, 0) / state.data.length) : 0 }), [state.data]);
  async function create(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const element = event.currentTarget; const form = new FormData(element); const inputs = Object.fromEntries(rulaFields.map(([key]) => [key, Number(form.get(key))])); setError(""); try { await api("/rula", { method: "POST", body: JSON.stringify({ projectId: form.get("projectId"), title: form.get("title"), subjectCode: form.get("subjectCode") || null, bodySide: form.get("bodySide"), inputs: { ...inputs, muscleUse: form.get("muscleUse") === "on", force: Number(form.get("force")) } }) }); element.reset(); state.reload(); } catch (reason) { setError((reason as Error).message); } }
  return <section className="page-shell">
    <PageHeader eyebrow="ارزیابی ارگونومی" title="ارزیابی RULA" description="وضعیت اندام‌های فوقانی، گردن و تنه را امتیازدهی کنید و سطح اقدام ارگونومیک را دریافت کنید."/>
    {error && <div className="alert error"><Icon name="warning"/>{error}</div>}
    <div className="mini-stats"><div><Icon name="rula"/><strong>{overview.total.toLocaleString("fa-IR")}</strong><span>ارزیابی ثبت‌شده</span></div><div><Icon name="warning"/><strong>{overview.high.toLocaleString("fa-IR")}</strong><span>نیازمند اقدام</span></div><div><Icon name="chart"/><strong>{overview.average.toLocaleString("fa-IR")}</strong><span>میانگین امتیاز</span></div></div>
    {canEdit() && <SectionCard title="ارزیابی جدید RULA" description="برای هر بخش بدن عدد ۱ تا ۶ را بر اساس وضعیت مشاهده‌شده وارد کنید." icon="plus">
      <form className="rula-form" onSubmit={create}>
        <div className="rula-basic"><label>پروژه<select name="projectId" required><option value="">انتخاب پروژه</option>{projects.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>عنوان ارزیابی<input name="title" placeholder="مثلاً ارزیابی اپراتور مونتاژ" required/></label><label>کد فرد / ایستگاه<input name="subjectCode" placeholder="OP-01"/></label><label>سمت بدن<select name="bodySide"><option value="RIGHT">سمت راست</option><option value="LEFT">سمت چپ</option></select></label></div>
        <div className="body-score-grid">{rulaFields.map(([field, label, hint]) => <label className="body-score" key={field}><span><strong>{label}</strong><small>{hint}</small></span><input name={field} type="number" min="1" max="6" defaultValue="2" required/></label>)}</div>
        <div className="rula-extra"><label><span>نیروی واردشده</span><select name="force" defaultValue="0"><option value="0">بدون نیروی قابل‌توجه</option><option value="1">نیروی کم</option><option value="2">نیروی متوسط</option><option value="3">نیروی زیاد</option></select></label><label className="checkbox-card"><input name="muscleUse" type="checkbox"/><span><strong>استفاده تکراری از عضله</strong><small>حرکت تکراری یا نگه‌داشتن وضعیت برای مدت طولانی</small></span></label><button className="primary"><Icon name="chart"/> محاسبه و ثبت ارزیابی</button></div>
      </form>
    </SectionCard>}
    <SectionCard title="نتایج ارزیابی‌ها" description="امتیاز نهایی و سطح اقدام هر ارزیابی" icon="chart">
      <LoadState state={state} empty="هنوز ارزیابی RULA ثبت نشده است.">{(data) => <div className="rula-results">{data.map((item) => <article className="rula-result" key={item.id}><div className={`rula-score level-${item.actionLevel}`}>{item.score.toLocaleString("fa-IR")}</div><div className="rula-result-copy"><div><h3>{item.title}</h3><p>{item.project.name}{item.subjectCode ? ` · ${item.subjectCode}` : ""}</p></div><div className="result-badges"><StatusBadge value={item.status}/><span className="action-level">سطح اقدام {item.actionLevel.toLocaleString("fa-IR")}</span></div><small>{item.explanation}</small></div>{canEdit() && <div className="download-actions"><button className="ghost" onClick={() => void saveBlob(`/reports/rula/${item.id}.pdf`, `RULA-${item.id}.pdf`).catch((reason) => setError((reason as Error).message))}><Icon name="download"/> PDF</button><button className="ghost" onClick={() => void saveBlob(`/reports/rula/${item.id}.xlsx`, `RULA-${item.id}.xlsx`).catch((reason) => setError((reason as Error).message))}><Icon name="download"/> Excel</button></div>}</article>)}</div>}</LoadState>
    </SectionCard>
  </section>;
}
