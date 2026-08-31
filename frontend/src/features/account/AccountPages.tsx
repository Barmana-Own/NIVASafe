import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { isStrongPassword, isValidDisplayName, isValidEmail, isValidPhone, normalizePhone, PASSWORD_MIN_LENGTH } from "@nivasafe/domain";
import { api, clearSession, directionForLocale, getCurrentRole, getSession, isSessionRemembered, saveSession, type ApiError, type Organization, type Session, useLoad } from "../../api/client";
import { EmptyState, Icon, PageHeader, SectionCard, roleLabel, useDialog } from "../../components/UI";
import { AutoSaveForm, clearAutoSaveDraft } from "../../forms/AutoSaveForm";
import { scopedDraftKey } from "../../forms/autoSave";

type Profile = { id: string; email: string; displayName: string; locale: string; phone: string | null; jobTitle: string | null };
type Member = { id: string; role: string; active: boolean; user: { id: string; email: string; displayName: string; phone?: string | null; jobTitle?: string | null; globalRole?: string } };
const roles = ["ORG_ADMIN", "HSE_MANAGER", "ASSESSOR", "VIEWER"];

function normalizePhoneField(event: ChangeEvent<HTMLInputElement>): void {
  event.currentTarget.value = normalizePhone(event.currentTarget.value);
}

export function LoginPage() {
  const nav = useNavigate(); const [params] = useSearchParams(); const [error, setError] = useState(""); const [loading, setLoading] = useState(false); const [showPassword, setShowPassword] = useState(false); const [rememberMe, setRememberMe] = useState(() => localStorage.getItem("nivasafe-remember-login") !== "false");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (!isValidEmail(email)) { setError("ایمیل معتبر وارد کنید."); return; }
    if (!password) { setError("رمز عبور را وارد کنید."); return; }
    setLoading(true); setError("");
    try {
      const result = await api<Session>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      saveSession(result.data, rememberMe);
      localStorage.setItem("nivasafe-remember-login", String(rememberMe));
      const next = params.get("next");
      const firstRun = !localStorage.getItem("nivasafe-path-selected");
      nav(next?.startsWith("/") ? next : firstRun ? "/choose-path" : "/");
    } catch (reason) {
      const apiError = reason as ApiError;
      setError(apiError.code === "INVALID_CREDENTIALS" ? "ایمیل یا رمز عبور نادرست است." : apiError.code === "INVALID_EMAIL" ? "ایمیل معتبر وارد کنید." : reason instanceof Error ? reason.message : "ورود ناموفق بود.");
    } finally { setLoading(false); }
  }
  return <main className="login" dir={directionForLocale()} lang={directionForLocale() === "ltr" ? "en" : "fa"}>
    <section className="login-art">
      <nav className="login-toolbar" aria-label="پیوندهای NIVASafe">
        <a className="login-toolbar-brand" href="https://app.nivasafe.com" target="_blank" rel="noreferrer"><img src="/brand/nivasafe-icon.png" alt=""/><span>NIVASafe</span></a>
        <div className="login-toolbar-links"><a href="https://app.nivasafe.com" target="_blank" rel="noreferrer">وب‌سایت</a><a href="#login-form">ورود</a><a href="/register">ثبت‌نام</a><a href="mailto:support@nivasafe.com">تماس با ما</a></div>
        <a className="login-toolbar-menu" href="https://app.nivasafe.com" target="_blank" rel="noreferrer" aria-label="رفتن به وب‌سایت"><Icon name="arrow" size={16}/></a>
      </nav>
      <div className="login-hero-content">
        <div className="login-brand-panel">
          <img className="login-hero-icon" src="/brand/nivasafe-icon.png" alt=""/>
          <div className="login-brand-copy"><img className="login-logo-en" src="/brand/nivasafe-en.png" alt="NIVASafe"/><span>پلتفرم هوشمند ارزیابی ریسک</span></div>
        </div>
        <h1>پلتفرم هوشمند ایمنی و بهداشت حرفه‌ای</h1>
        <p>سامانه یکپارچه مدیریت ارزیابی ریسک، ارگونومی و اقدامات اصلاحی سازمان</p>
        <div className="login-cta-row"><a className="primary" href="#login-form"><Icon name="logout"/> ورود</a><a className="login-secondary-cta" href="/register"><Icon name="user"/> ثبت‌نام</a></div>
        <div className="login-hero-visual" aria-hidden="true"><div className="visual-orb visual-orb-one"/><div className="visual-orb visual-orb-two"/><div className="visual-shield"><Icon name="shield" size={42}/><span>N</span></div><div className="visual-screen"><div className="visual-screen-head"><span/><span/><span/></div><div className="visual-chart"><i/><i/><i/><i/><b/></div><div className="visual-screen-foot"><span/><span/><span/></div></div><div className="visual-hardhat"><span/><b/></div><span className="visual-spark"><Icon name="sparkles" size={20}/></span></div>
        <div className="login-features"><span><Icon name="shield"/> مناسب برای کاربری شخصی و سازمانی</span><span><Icon name="assistant"/> یکپارچه با هوش مصنوعی</span><span><Icon name="chart"/> تحلیل و گزارش‌گیری پیشرفته</span><span><Icon name="knowledge"/> ارزیابی‌های استاندارد مبتنی بر پایگاه دانش</span></div>
      </div>
      <div className="login-approvals"><span className="login-approvals-title">مجوزها و تأییدیه‌های سازمانی</span><div className="approval-list"><span><Icon name="shield" size={16}/> امنیت سازمانی</span><span><Icon name="check" size={16}/> استانداردهای HSE</span><span><Icon name="health" size={16}/> سلامت حرفه‌ای</span></div></div>
    </section>
    <form id="login-form" className="login-card" onSubmit={submit}>
      <img className="login-card-logo" src="/brand/nivasafe-icon.png" alt="NIVASafe"/><div className="eyebrow">سامانه مدیریت HSE</div><h2>خوش آمدید</h2><p className="muted">خوش آمدید! جهت ورود، لطفا اطلاعات خود را وارد کنید.</p>
      <label htmlFor="login-email">ایمیل حساب کاربری<input id="login-email" name="email" type="email" inputMode="email" dir="ltr" placeholder="your@email.com" autoComplete="username" required/></label><label htmlFor="login-password">رمز عبور<div className="password-field"><input id="login-password" name="password" aria-label="رمز عبور" type={showPassword ? "text" : "password"} dir="ltr" autoComplete="current-password" required/><button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "مخفی کردن رمز عبور" : "نمایش رمز عبور"} title={showPassword ? "مخفی کردن رمز عبور" : "نمایش رمز عبور"}><Icon name={showPassword ? "eyeOff" : "eye"} size={19}/></button></div></label>
      <div className="login-options"><label className="remember-me"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)}/><span>مرا به خاطر بسپار</span></label><Link className="login-link" to="/forgot-password">رمز عبور را فراموش کرده‌ام</Link></div>
      {error && <div className="alert error" role="alert"><Icon name="warning"/>{error}</div>}
      <button type="submit" className="primary login-button" disabled={loading}>{loading ? "در حال ورود…" : <><Icon name="shield"/> ورود امن</>}</button>
      <Link className="login-link register-link" to="/register">کاربر جدید هستید؟ ثبت‌نام کنید</Link>
      <div className="login-card-footer">ورود امن با احراز هویت و کنترل دسترسی سازمانی</div>
    </form>
  </main>;
}

export function ForgotPasswordPage() {
  const [message, setMessage] = useState(""); const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); try { const result = await api<{ accepted: boolean; developmentToken?: string }>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email: form.get("email") }) }); setMessage(result.data.developmentToken ? `درخواست ثبت شد. توکن توسعه: ${result.data.developmentToken}` : "در صورت وجود حساب، لینک بازیابی ارسال می‌شود."); } catch (reason) { setError((reason as Error).message); } }
  return <main className="login simple" dir={directionForLocale()} lang={directionForLocale() === "ltr" ? "en" : "fa"}><form className="login-card" onSubmit={submit}><span className="auth-icon"><Icon name="profile" size={28}/></span><div className="eyebrow">بازیابی حساب</div><h2>فراموشی رمز عبور</h2><p className="muted">ایمیل حساب را وارد کنید تا فرایند بازیابی آغاز شود.</p><label>ایمیل<input name="email" type="email" required/></label>{error && <div className="alert error">{error}</div>}{message && <div className="alert success">{message}</div>}<button className="primary">ارسال درخواست</button><Link className="login-link" to="/login">بازگشت به ورود</Link></form></main>;
}
export function ResetPasswordPage() {
  const [params] = useSearchParams(); const nav = useNavigate(); const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const password = String(form.get("password") ?? ""); if (!isStrongPassword(password)) { setError(`رمز عبور باید حداقل ${PASSWORD_MIN_LENGTH} نویسه و شامل حرف، عدد و نشانه باشد.`); return; } try { await api("/auth/reset-password", { method: "POST", body: JSON.stringify({ token: params.get("token") || form.get("token"), password }) }); nav("/login"); } catch (reason) { setError((reason as Error).message); } }
  return <main className="login simple" dir={directionForLocale()} lang={directionForLocale() === "ltr" ? "en" : "fa"}><form className="login-card" onSubmit={submit}><span className="auth-icon"><Icon name="shield" size={28}/></span><h2>تنظیم رمز جدید</h2>{!params.get("token") && <label>توکن بازیابی<input name="token" required/></label>}<label>رمز جدید<input name="password" type="password" minLength={PASSWORD_MIN_LENGTH} maxLength={128} required/></label>{error && <div className="alert error">{error}</div>}<button className="primary">ثبت رمز جدید</button></form></main>;
}

export function AcceptInvitationPage() {
  const [params] = useSearchParams(); const nav = useNavigate(); const token = params.get("token") ?? ""; const { session } = getSession(); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function accept() { if (!session || !token) return; setLoading(true); setError(""); try { const result = await api<{ organization: Organization }>("/invitations/accept", { method: "POST", body: JSON.stringify({ token }) }); const organizations = [...session.organizations.filter((item) => item.id !== result.data.organization.id), result.data.organization]; saveSession({ ...session, organizations }, isSessionRemembered()); localStorage.setItem("nivasafe-org", result.data.organization.id); nav("/", { replace: true }); } catch (reason) { setError((reason as Error).message); } finally { setLoading(false); } }
  if (!token) return <main className="login simple" dir={directionForLocale()} lang={directionForLocale() === "ltr" ? "en" : "fa"}><section className="login-card"><div className="alert error">توکن دعوت در لینک وجود ندارد.</div><Link className="login-link" to="/login">بازگشت به ورود</Link></section></main>;
  if (!session) { const next = `/accept-invitation?token=${encodeURIComponent(token)}`; return <main className="login simple" dir={directionForLocale()} lang={directionForLocale() === "ltr" ? "en" : "fa"}><section className="login-card"><span className="auth-icon"><Icon name="members" size={28}/></span><h2>پذیرش دعوت سازمان</h2><p className="muted">برای پذیرش دعوت ابتدا با همان ایمیلی که دعوت شده وارد شوید.</p><Link className="primary button-link" to={`/login?next=${encodeURIComponent(next)}`}>ورود و ادامه</Link></section></main>; }
  return <main className="login simple" dir={directionForLocale()} lang={directionForLocale() === "ltr" ? "en" : "fa"}><section className="login-card"><span className="auth-icon"><Icon name="members" size={28}/></span><h2>پذیرش دعوت سازمان</h2><p className="muted">با تأیید، سازمان جدید به فضای کاری شما اضافه می‌شود.</p>{error && <div className="alert error">{error}</div>}<button className="primary" onClick={accept} disabled={loading}>{loading ? "در حال ثبت…" : "پذیرش دعوت"}</button></section></main>;
}

export function ProfilePage() {
  const nav = useNavigate();
  const state = useLoad<Profile>("/profile"); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  if (state.error) return <div className="alert error">{state.error}</div>; if (!state.data) return <div className="state"><div className="spinner"/></div>;
  const profile = state.data;
  const initialLocale = profile.locale;
  const { session, orgId } = getSession();
  const profileDraftKey = scopedDraftKey("profile-edit", session?.user.id, orgId);
    async function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const email = String(form.get("email") ?? "").trim(); const displayName = String(form.get("displayName") ?? "").trim(); const rawPhone = String(form.get("phone") ?? "").trim(); setError(""); if (!isValidEmail(email)) { setError("ایمیل معتبر وارد کنید."); return; } if (!isValidDisplayName(displayName)) { setError("نام نمایشی واردشده مجاز نیست."); return; } if (rawPhone && !isValidPhone(rawPhone)) { setError("شماره تلفن معتبر وارد کنید."); return; } try { const result = await api<Profile>("/profile", { method: "PATCH", body: JSON.stringify({ email, displayName, phone: rawPhone ? normalizePhone(rawPhone) : null, jobTitle: form.get("jobTitle") || null, locale: form.get("locale") }) }); await clearAutoSaveDraft(profileDraftKey); const current = getSession().session; if (current) saveSession({ ...current, user: { ...current.user, ...result.data } }, isSessionRemembered()); setMessage("پروفایل ذخیره شد."); state.reload(); if (result.data.locale !== initialLocale) window.location.reload(); } catch (reason) { setError((reason as Error).message); } }
  async function changePassword(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); const newPassword = String(form.get("newPassword") ?? ""); setError(""); if (!isStrongPassword(newPassword, { email: profile.email, displayName: profile.displayName })) { setError(`رمز عبور باید حداقل ${PASSWORD_MIN_LENGTH} نویسه و شامل حرف، عدد و نشانه باشد و قابل حدس نباشد.`); return; } try { await api("/profile/change-password", { method: "POST", body: JSON.stringify({ currentPassword: form.get("currentPassword"), newPassword }) }); formElement.reset(); clearSession(); nav("/login", { replace: true }); } catch (reason) { setError((reason as Error).message); } }
  return <section className="page-shell"><PageHeader eyebrow="حساب کاربری" title="پروفایل من" description="اطلاعات فردی، زبان رابط و رمز عبور حساب را مدیریت کنید."/>{error && <div className="alert error"><Icon name="warning"/>{error}</div>}{message && <div className="alert success"><Icon name="check"/>{message}</div>}
    <div className="profile-hero"><div className="profile-avatar">{state.data.displayName[0]}</div><div><h3>{state.data.displayName}</h3><p>{state.data.jobTitle || "عنوان شغلی ثبت نشده"}</p><span>{state.data.email}</span></div></div>
    <div className="form-panels"><SectionCard title="اطلاعات فردی" description="مشخصات نمایشی حساب شما" icon="profile"><AutoSaveForm storageKey={profileDraftKey} className="form-grid" onSubmit={save}><label>نام نمایشی<input name="displayName" defaultValue={state.data.displayName} required/></label><label>ایمیل<input name="email" type="email" inputMode="email" dir="ltr" defaultValue={state.data.email} required/></label><label>تلفن<input name="phone" defaultValue={state.data.phone ?? ""} onChange={normalizePhoneField} inputMode="numeric" autoComplete="tel" dir="ltr" maxLength={11} pattern="09[0-9]{9}" placeholder="مثال ۰۹۱۲۱۲۳۴۵۶۷"/></label><label>عنوان شغلی<input name="jobTitle" defaultValue={state.data.jobTitle ?? ""} placeholder="مثلاً مدیر HSE"/></label><label className="full">زبان رابط<select name="locale" defaultValue={state.data.locale}><option value="fa">فارسی</option><option value="en">English</option></select></label><button className="primary full"><Icon name="check"/> ذخیره تغییرات</button></AutoSaveForm></SectionCard>
    <SectionCard title="تغییر رمز عبور" description={`رمز جدید باید حداقل ${PASSWORD_MIN_LENGTH} نویسه، حرف، عدد و نشانه داشته باشد.`} icon="shield"><form className="form-grid" onSubmit={changePassword}><label className="full">رمز فعلی<input name="currentPassword" type="password" autoComplete="current-password" required/></label><label className="full">رمز جدید<input name="newPassword" type="password" minLength={PASSWORD_MIN_LENGTH} maxLength={128} autoComplete="new-password" required/></label><div className="password-note full"><Icon name="shield"/><span>پس از تغییر رمز، نشست‌های قبلی برای حفظ امنیت باطل می‌شوند.</span></div><button className="primary full">تغییر رمز عبور</button></form></SectionCard></div>
  </section>;
}

export function MembersPage() {
  const state = useLoad<Member[]>("/members"); const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [editing, setEditing] = useState<{ id: string; displayName: string; email: string; phone: string; jobTitle: string; globalRole: string } | null>(null); const dialog = useDialog(); const memberRoles = getCurrentRole() === "SUPER_ADMIN" ? ["SUPER_ADMIN", ...roles] : roles;
  const { session, orgId } = getSession();
  const inviteDraftKey = scopedDraftKey("member-invite", session?.user.id, orgId);
  const memberDraftKey = (memberId: string) => scopedDraftKey(`member-edit:${memberId}`, session?.user.id, orgId);
  async function update(id: string, role: string, active: boolean) { try { await api(`/members/${id}`, { method: "PATCH", body: JSON.stringify({ role, active }) }); state.reload(); setMessage("دسترسی عضو به‌روزرسانی شد."); } catch (reason) { setError((reason as Error).message); } }
  function beginEdit(member: Member) { setEditing({ id: member.id, displayName: member.user.displayName, email: member.user.email, phone: member.user.phone ?? "", jobTitle: member.user.jobTitle ?? "", globalRole: member.user.globalRole ?? "USER" }); setError(""); }
  async function saveMember(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!editing) return; const form = new FormData(event.currentTarget); const member = state.data?.find((item) => item.id === editing.id); if (!member) return; const rawPhone = String(form.get("phone") ?? "").trim(); setError(""); if (rawPhone && !isValidPhone(rawPhone)) { setError("شماره تلفن معتبر وارد کنید."); return; } try { await api(`/members/${editing.id}`, { method: "PATCH", body: JSON.stringify({ displayName: form.get("displayName"), email: form.get("email"), phone: rawPhone ? normalizePhone(rawPhone) : null, jobTitle: form.get("jobTitle") || null, globalRole: getCurrentRole() === "SUPER_ADMIN" ? form.get("globalRole") : undefined, role: member.role, active: member.active }) }); await clearAutoSaveDraft(memberDraftKey(editing.id)); setEditing(null); state.reload(); setMessage("اطلاعات عضو ویرایش شد."); } catch (reason) { setError((reason as Error).message); } }
  async function removeMember(member: Member) { if (!(await dialog.confirm(`عضو «${member.user.displayName}» حذف شود؟`))) return; if (!(await dialog.confirm("این عملیات عضویت را از این شرکت حذف می‌کند. ادامه می‌دهید؟"))) return; try { await api(`/members/${member.id}`, { method: "DELETE" }); state.reload(); setMessage("عضو از شرکت حذف شد."); } catch (reason) { setError((reason as Error).message); } }
  async function invite(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const element = event.currentTarget; const form = new FormData(element); try { const result = await api<{ developmentToken?: string }>("/invitations", { method: "POST", body: JSON.stringify({ email: form.get("email"), role: form.get("role") }) }); await clearAutoSaveDraft(inviteDraftKey); setMessage(result.data.developmentToken ? `دعوت ایجاد شد. توکن توسعه: ${result.data.developmentToken}` : "دعوت ارسال شد."); element.reset(); } catch (reason) { setError((reason as Error).message); } }
  return <section className="page-shell"><PageHeader eyebrow="کنترل دسترسی" title="اعضا و نقش‌ها" description="اعضای سازمان را دعوت کنید و سطح دسترسی هر کاربر را مدیریت کنید."/>{error && <div className="alert error"><Icon name="warning"/>{error}</div>}{message && <div className="alert success"><Icon name="check"/>{message}</div>}
    <SectionCard title="دعوت عضو جدید" description="یک نقش اولیه برای عضو انتخاب کنید؛ پس از عضویت قابل تغییر است." icon="plus"><AutoSaveForm storageKey={inviteDraftKey} className="invite-form" onSubmit={invite}><label>ایمیل عضو<input name="email" type="email" placeholder="name@company.com" required/></label><label>نقش<select name="role">{memberRoles.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</select></label><button className="primary"><Icon name="plus"/> ارسال دعوت</button></AutoSaveForm></SectionCard>
    <SectionCard title="اعضای سازمان" description={`${(state.data?.length ?? 0).toLocaleString("fa-IR")} عضو`} icon="members">{state.loading ? <div className="state"><div className="spinner"/></div> : !state.data?.length ? <EmptyState title="هنوز عضوی ثبت نشده است" icon="members"/> : <div className="member-list">{state.data.map((member) => { const availableRoles = memberRoles.includes(member.role) ? memberRoles : [member.role, ...memberRoles]; return <article className="member-card" key={member.id}><div className="member-avatar">{member.user.displayName[0]}</div><div className="member-copy"><strong>{member.user.displayName}</strong><small>{member.user.email}{member.user.jobTitle ? ` · ${member.user.jobTitle}` : ""}</small>{member.user.globalRole === "SUPER_ADMIN" && <span className="tag">سوپر ادمین</span>}</div><select value={member.role} onChange={(event) => update(member.id, event.target.value, member.active)}>{availableRoles.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</select><button className={`status-toggle ${member.active ? "active" : "inactive"}`} onClick={() => update(member.id, member.role, !member.active)}><span/>{member.active ? "فعال" : "غیرفعال"}</button><div className="member-actions"><button className="text-button" type="button" onClick={() => beginEdit(member)}>ویرایش</button><button className="text-button danger-link" type="button" onClick={() => void removeMember(member)}>حذف</button></div>{editing?.id === member.id && <AutoSaveForm storageKey={memberDraftKey(member.id)} className="member-edit-form form-grid" onSubmit={saveMember}><label>نام نمایشی<input name="displayName" defaultValue={editing.displayName} required/></label><label>ایمیل<input name="email" type="email" dir="ltr" defaultValue={editing.email} required/></label><label>تلفن<input name="phone" defaultValue={editing.phone} onChange={normalizePhoneField} inputMode="numeric" autoComplete="tel" dir="ltr" maxLength={11} pattern="09[0-9]{9}" placeholder="مثال ۰۹۱۲۱۲۳۴۵۶۷"/></label><label>عنوان شغلی<input name="jobTitle" defaultValue={editing.jobTitle}/></label>{getCurrentRole() === "SUPER_ADMIN" && <label>سطح حساب<select name="globalRole" defaultValue={editing.globalRole}><option value="USER">کاربر عادی</option><option value="SUPER_ADMIN">سوپر ادمین</option></select></label>}<div className="member-edit-actions"><button className="primary" type="submit">ذخیره</button><button className="ghost" type="button" onClick={() => setEditing(null)}>انصراف</button></div></AutoSaveForm>}</article>; })}</div>}
    </SectionCard>
  </section>;
}
