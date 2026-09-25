import { useRef, useState, type ChangeEvent, type FormEvent, type MouseEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { isStrongPassword, isValidDisplayName, isValidEmail, isValidPhone, isValidUsername, normalizeEmail, normalizePhone, normalizeUsername, PASSWORD_MIN_LENGTH } from "@nivasafe/domain";
import { api, clearSession, getCurrentRole, getSession, isSessionRemembered, saveSession, type ApiError, type Organization, type Session, useLoad } from "../../api/client";
import { EmptyState, Icon, PageHeader, SectionCard, StyledSelect, formatDate, roleLabel, useDialog } from "../../components/UI";
import { AutoSaveForm, clearAutoSaveDraft } from "../../forms/AutoSaveForm";
import { scopedDraftKey } from "../../forms/autoSave";
import { LanguageSwitcher, brandAltForLocale, brandLogoForLocale, useI18n } from "../../i18n";

type Profile = { id: string; email: string; username: string | null; displayName: string; locale: string; phone: string | null; jobTitle: string | null };
type Member = { id: string; role: string; active: boolean; user: { id: string; email: string; username?: string | null; displayName: string; phone?: string | null; jobTitle?: string | null; globalRole?: string } };
type MemberAccessRequest = { id: string; username: string; email: string; displayName: string; phone: string | null; jobTitle: string | null; role: string; status: string; rejectionReason: string | null; createdAt: string; reviewedAt: string | null; requestedBy?: { id: string; displayName: string; email: string; username: string | null } };
const roles = ["ORG_ADMIN", "HSE_MANAGER", "HSE_SPECIALIST", "HSE_OFFICER", "EXTERNAL_AUDITOR", "PERSONNEL", "VIEWER"];
const invitationRoles = ["ORG_ADMIN", "ASSISTANT", "HSE_MANAGER", "HSE_SPECIALIST", "HSE_OFFICER", "EXTERNAL_AUDITOR", "PERSONNEL", "ASSESSOR", "VIEWER"];
const organizationMemberRoles = [...roles, "ASSISTANT", "ASSESSOR"];

function normalizePhoneField(event: ChangeEvent<HTMLInputElement>): void {
  event.currentTarget.value = normalizePhone(event.currentTarget.value);
}

type LoginField = "identifier" | "password";
type LoginFieldErrors = Partial<Record<LoginField, string>>;
const REMEMBERED_LOGIN_EMAIL_KEY = "nivasafe-login-email";

function safeLoginRedirect(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) return null;
  return value;
}

export function LoginPage() {
  const { locale, direction, t } = useI18n();
  const nav = useNavigate(); const [params] = useSearchParams(); const submittingRef = useRef(false); const loginFormRef = useRef<HTMLFormElement>(null); const [error, setError] = useState(""); const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({}); const [loading, setLoading] = useState(false); const [showPassword, setShowPassword] = useState(false); const [rememberMe, setRememberMe] = useState(() => localStorage.getItem("nivasafe-remember-login") !== "false"); const [rememberedLoginEmail] = useState(() => localStorage.getItem(REMEMBERED_LOGIN_EMAIL_KEY) ?? ""); const [mobileLoginFormVisible, setMobileLoginFormVisible] = useState(() => window.location.hash === "#login-form");
  function finishLogin(session: Session, organizationId?: string, identifier?: string) {
    saveSession(session, rememberMe, organizationId);
    localStorage.setItem("nivasafe-locale", session.user.locale === "en" ? "en" : "fa");
    localStorage.setItem("nivasafe-remember-login", String(rememberMe));
    if (rememberMe && identifier) localStorage.setItem(REMEMBERED_LOGIN_EMAIL_KEY, identifier);
    else if (!rememberMe) localStorage.removeItem(REMEMBERED_LOGIN_EMAIL_KEY);
    const next = params.get("next");
    nav(safeLoginRedirect(next) ?? "/", { replace: true });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    const form = new FormData(event.currentTarget);
    const rawIdentifier = String(form.get("identifier") ?? "").trim();
    const identifier = isValidEmail(rawIdentifier) ? normalizeEmail(rawIdentifier) : normalizeUsername(rawIdentifier);
    const password = String(form.get("password") ?? "");
    const nextFieldErrors: LoginFieldErrors = {};
    if (!rawIdentifier) nextFieldErrors.identifier = t("auth.loginIdentifierRequired");
    else if (!isValidEmail(rawIdentifier) && !isValidUsername(rawIdentifier)) nextFieldErrors.identifier = t("auth.invalidLoginIdentifier");
    if (!password) nextFieldErrors.password = t("auth.enterPassword");
    else if (password.length < PASSWORD_MIN_LENGTH) nextFieldErrors.password = t("auth.passwordTooShort", { min: PASSWORD_MIN_LENGTH });
    if (Object.keys(nextFieldErrors).length) { setFieldErrors(nextFieldErrors); setError(t("auth.validation")); return; }
    submittingRef.current = true;
    setLoading(true); setError("");
    setFieldErrors({});
    try {
      const result = await api<Session>("/auth/login", { method: "POST", body: JSON.stringify({ identifier, password }) });
      finishLogin(result.data, result.data.organizations[0]?.id, identifier);
    } catch (reason) {
      const apiError = reason as ApiError;
      if (apiError.code === "INVALID_EMAIL" || apiError.code === "INVALID_USERNAME" || apiError.code === "INVALID_IDENTIFIER") setFieldErrors({ identifier: t("auth.invalidLoginIdentifier") });
      setError(apiError.code === "INVALID_CREDENTIALS" ? t("auth.invalidCredentials") : apiError.code === "INVALID_EMAIL" || apiError.code === "INVALID_USERNAME" || apiError.code === "INVALID_IDENTIFIER" ? t("auth.validation") : t("auth.loginFailed"));
    } finally { submittingRef.current = false; setLoading(false); }
  }
  function openMobileLogin(event: MouseEvent<HTMLAnchorElement>) {
    if (!window.matchMedia("(max-width: 900px)").matches) return;
    event.preventDefault();
    setMobileLoginFormVisible(true);
    window.requestAnimationFrame(() => loginFormRef.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true }));
  }
  return <main className={`login ${mobileLoginFormVisible ? "mobile-login-form-visible" : ""}`} dir={direction} lang={locale}>
    <section className="login-art">
      <nav className="login-toolbar" aria-label={t("auth.links")}>
        <div className="login-toolbar-brand"><div className="login-brand-panel"><div className="login-brand-copy"><img className="login-logo-wordmark" src={brandLogoForLocale(locale)} alt={brandAltForLocale(locale)}/></div></div></div>
        <div className="login-toolbar-links">
          <a href="#login-features">{t("auth.features")}</a>
          <a href="#login-support">{t("auth.licenses")}</a>
          <a href="#login-about">{t("auth.about")}</a>
          <a href="#login-form">{t("auth.contact")}</a>
        </div>
        <LanguageSwitcher className="login-language-switch" />
      </nav>
      <div className="login-hero-content" id="login-about">
        <div className="login-mobile-brand" aria-label={brandAltForLocale(locale)}>
          <img className="login-mobile-brand-icon" src="/brand/nivasafe-icon.png" alt="" />
          <img className="login-mobile-brand-wordmark" src={brandLogoForLocale(locale)} alt={brandAltForLocale(locale)} />
          <span>{t("auth.brandSubtitle")}</span>
        </div>
        <div className="login-hero-visual" aria-hidden="true"><div className="visual-orb visual-orb-one"/><div className="visual-orb visual-orb-two"/><div className="visual-shield"><Icon name="shield" size={42}/><span>N</span></div><div className="visual-screen"><div className="visual-screen-head"><span/><span/><span/></div><div className="visual-chart"><i/><i/><i/><i/><b/></div><div className="visual-screen-foot"><span/><span/><span/></div></div><div className="visual-hardhat"><span/><b/></div><span className="visual-spark"><Icon name="sparkles" size={20}/></span></div>
        <h1>{t("auth.heroTitle")}</h1>
        <div className="login-cta-row"><a className="primary" href="#login-form" onClick={openMobileLogin}><Icon name="logout"/> {t("auth.login")}</a><a className="login-secondary-cta" href="/register"><Icon name="user"/> {t("auth.register")}</a></div>
        <div className="login-features" id="login-features"><span><Icon name="shield"/> {t("auth.featurePersonal")}</span><span><Icon name="assistant"/> {t("auth.featureAi")}</span><span><Icon name="chart"/> {t("auth.featureReports")}</span><span><Icon name="knowledge"/> {t("auth.featureKnowledge")}</span></div>
      </div>
      <footer id="login-support" className="login-approvals login-support-bar" aria-label={t("auth.supportBar")}><span className="login-support-copy">{t("auth.supportBar")}</span><img className="login-support-logo" src="/brand/qazvin-science-technology-park.jpg" alt={t("auth.supportBarLogoAlt")}/></footer>
    </section>
    <form ref={loginFormRef} id="login-form" className="login-card" autoComplete="on" noValidate aria-busy={loading} onSubmit={submit}>
      <img className="login-card-logo" src="/brand/nivasafe-icon.png" alt={brandAltForLocale(locale)}/><h2>{t("auth.welcome")}</h2><p className="muted">{t("auth.welcomeMessage")}</p>
      <label htmlFor="login-identifier"><span className="field-label-line">{t("auth.loginIdentifier")}</span><input id="login-identifier" name="identifier" type="text" inputMode="email" dir="ltr" placeholder={t("auth.loginIdentifierPlaceholder")} autoComplete="username" defaultValue={rememberedLoginEmail} autoCapitalize="none" spellCheck={false} maxLength={254} disabled={loading} aria-invalid={Boolean(fieldErrors.identifier)} aria-describedby={fieldErrors.identifier ? "login-identifier-error" : undefined} onChange={() => { setFieldErrors((current) => ({ ...current, identifier: undefined })); setError(""); }} required/>{fieldErrors.identifier && <small id="login-identifier-error" className="field-error" role="alert">{fieldErrors.identifier}</small>}</label><label htmlFor="login-password"><span className="field-label-line">{t("auth.password")}</span><div className="password-field"><input id="login-password" name="password" aria-label={t("auth.password")} type={showPassword ? "text" : "password"} dir="ltr" placeholder={t("auth.passwordPlaceholder")} autoComplete="current-password" maxLength={128} disabled={loading} aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? "login-password-error" : undefined} onChange={() => { setFieldErrors((current) => ({ ...current, password: undefined })); setError(""); }} required/><button type="button" className="password-toggle" disabled={loading} onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")} title={showPassword ? t("auth.hidePassword") : t("auth.showPassword")} aria-controls="login-password"><Icon name={showPassword ? "eyeOff" : "eye"} size={19}/></button></div>{fieldErrors.password && <small id="login-password-error" className="field-error" role="alert">{fieldErrors.password}</small>}</label>
      <div className="login-options"><label className="remember-me"><input type="checkbox" checked={rememberMe} disabled={loading} onChange={(event) => setRememberMe(event.target.checked)}/><span>{t("auth.rememberMe")}</span></label><Link className="login-link" to="/forgot-password">{t("auth.forgotPassword")}</Link></div>
      {error && <div className="alert error" role="alert" aria-live="assertive"><Icon name="warning"/>{error}</div>}
      <button type="submit" className="primary login-button" disabled={loading} aria-busy={loading}>{loading ? <><span className="button-spinner" aria-hidden="true"/>{t("auth.signingIn")}</> : <><Icon name="shield"/> {t("auth.secureLogin")}</>}</button>
      <Link className="login-link register-link" to="/register">{t("auth.newUser")}</Link>
    </form>
  </main>;
}

export function ForgotPasswordPage() {
  const { locale, direction, t } = useI18n();
  const submittingRef = useRef(false); const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [fieldError, setFieldError] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    const form = new FormData(event.currentTarget);
    const rawIdentifier = String(form.get("identifier") ?? "").trim();
    const identifier = isValidEmail(rawIdentifier) ? normalizeEmail(rawIdentifier) : normalizeUsername(rawIdentifier);
    if (!rawIdentifier) { setFieldError(t("auth.loginIdentifierRequired")); setError(t("auth.validation")); setMessage(""); return; }
    if (!isValidEmail(rawIdentifier) && !isValidUsername(rawIdentifier)) { setFieldError(t("auth.invalidLoginIdentifier")); setError(t("auth.validation")); setMessage(""); return; }
    submittingRef.current = true; setLoading(true); setError(""); setFieldError(""); setMessage("");
    try { const result = await api<{ accepted: boolean; developmentToken?: string }>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ identifier }) }); setMessage(result.data.developmentToken ? t("auth.developmentToken", { token: result.data.developmentToken }) : t("auth.forgotAccepted")); }
    catch (reason) { const apiError = reason as ApiError; setError(apiError.code === "INVALID_EMAIL" || apiError.code === "INVALID_USERNAME" || apiError.code === "INVALID_IDENTIFIER" ? t("auth.invalidLoginIdentifier") : t("auth.forgotFailed")); }
    finally { submittingRef.current = false; setLoading(false); }
  }
  return <main className="login simple" dir={direction} lang={locale}><form className="login-card" noValidate aria-busy={loading} onSubmit={submit}><span className="auth-icon"><Icon name="profile" size={28}/></span><div className="eyebrow">{t("auth.forgotEyebrow")}</div><h2>{t("auth.forgotTitle")}</h2><p className="muted">{t("auth.forgotMessage")}</p><label htmlFor="forgot-identifier"><span className="field-label-line">{t("auth.loginIdentifier")}</span><input id="forgot-identifier" name="identifier" type="text" inputMode="email" dir="ltr" placeholder={t("auth.loginIdentifierPlaceholder")} autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={254} disabled={loading} aria-invalid={Boolean(fieldError)} aria-describedby={fieldError ? "forgot-identifier-error" : undefined} onChange={() => { setFieldError(""); setError(""); setMessage(""); }} required/>{fieldError && <small id="forgot-identifier-error" className="field-error" role="alert">{fieldError}</small>}</label>{error && <div className="alert error" role="alert" aria-live="assertive"><Icon name="warning"/>{error}</div>}{message && <div className="alert success" role="status" aria-live="polite"><Icon name="check"/>{message}</div>}<button type="submit" className="primary login-button" disabled={loading} aria-busy={loading}>{loading ? <><span className="button-spinner" aria-hidden="true"/>{t("auth.sendingRequest")}</> : t("auth.sendRequest")}</button><Link className="login-link" to="/login">{t("auth.backToLogin")}</Link></form></main>;
}
export function ResetPasswordPage() {
  const { locale, direction, t } = useI18n();
  const [params] = useSearchParams(); const nav = useNavigate(); const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const password = String(form.get("password") ?? ""); if (!isStrongPassword(password)) { setError(t("auth.passwordRequirements", { min: PASSWORD_MIN_LENGTH })); return; } try { await api("/auth/reset-password", { method: "POST", body: JSON.stringify({ token: params.get("token") || form.get("token"), password }) }); nav("/login"); } catch (reason) { setError((reason as Error).message); } }
  return <main className="login simple" dir={direction} lang={locale}><form className="login-card" onSubmit={submit}><span className="auth-icon"><Icon name="shield" size={28}/></span><h2>{t("auth.resetTitle")}</h2>{!params.get("token") && <label>{t("auth.resetToken")}<input name="token" required/></label>}<label>{t("auth.newPassword")}<input name="password" type="password" minLength={PASSWORD_MIN_LENGTH} maxLength={128} required/></label>{error && <div className="alert error">{error}</div>}<button className="primary">{t("auth.saveNewPassword")}</button></form></main>;
}

export function AcceptInvitationPage() {
  const { locale, direction, t } = useI18n();
  const [params] = useSearchParams(); const nav = useNavigate(); const token = params.get("token") ?? ""; const { session } = getSession(); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function accept() { if (!session || !token) return; setLoading(true); setError(""); try { const result = await api<{ organization: Organization }>("/invitations/accept", { method: "POST", body: JSON.stringify({ token }) }); const organizations = [...session.organizations.filter((item) => item.id !== result.data.organization.id), result.data.organization]; saveSession({ ...session, organizations }, isSessionRemembered()); localStorage.setItem("nivasafe-org", result.data.organization.id); nav("/", { replace: true }); } catch (reason) { setError((reason as Error).message); } finally { setLoading(false); } }
  if (!token) return <main className="login simple" dir={direction} lang={locale}><section className="login-card"><div className="alert error">{t("auth.invitationMissing")}</div><Link className="login-link" to="/login">{t("auth.backToLogin")}</Link></section></main>;
  if (!session) { const next = `/accept-invitation?token=${encodeURIComponent(token)}`; return <main className="login simple" dir={direction} lang={locale}><section className="login-card"><span className="auth-icon"><Icon name="members" size={28}/></span><h2>{t("auth.invitationTitle")}</h2><p className="muted">{t("auth.invitationLoginMessage")}</p><Link className="primary button-link" to={`/login?next=${encodeURIComponent(next)}`}>{t("auth.loginAndContinue")}</Link></section></main>; }
  return <main className="login simple" dir={direction} lang={locale}><section className="login-card"><span className="auth-icon"><Icon name="members" size={28}/></span><h2>{t("auth.invitationTitle")}</h2><p className="muted">{t("auth.invitationConfirmMessage")}</p>{error && <div className="alert error">{error}</div>}<button className="primary" onClick={accept} disabled={loading}>{loading ? t("auth.acceptingInvitation") : t("auth.acceptInvitation")}</button></section></main>;
}

export function ProfilePage() {
  const { t } = useI18n();
  const nav = useNavigate();
  const state = useLoad<Profile>("/profile"); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  if (state.error) return <div className="alert error">{state.error}</div>; if (!state.data) return <div className="state"><div className="spinner"/></div>;
  const profile = state.data;
  const initialLocale = profile.locale;
  const { session, orgId } = getSession();
  const profileDraftKey = scopedDraftKey("profile-edit", session?.user.id, orgId);
  async function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const email = String(form.get("email") ?? "").trim(); const displayName = String(form.get("displayName") ?? "").trim(); const rawPhone = String(form.get("phone") ?? "").trim(); setError(""); if (!isValidEmail(email)) { setError(t("profile.invalidEmail")); return; } if (!isValidDisplayName(displayName)) { setError(t("profile.invalidDisplayName")); return; } if (rawPhone && !isValidPhone(rawPhone)) { setError(t("profile.invalidPhone")); return; } try { const result = await api<Profile>("/profile", { method: "PATCH", body: JSON.stringify({ email, displayName, phone: rawPhone ? normalizePhone(rawPhone) : null, jobTitle: form.get("jobTitle") || null, locale: form.get("locale") }) }); const nextLocale = result.data.locale === "en" ? "en" : "fa"; localStorage.setItem("nivasafe-locale", nextLocale); await clearAutoSaveDraft(profileDraftKey); const current = getSession().session; if (current) saveSession({ ...current, user: { ...current.user, ...result.data } }, isSessionRemembered()); setMessage(t("profile.saved")); state.reload(); if (nextLocale !== initialLocale) window.location.reload(); } catch (reason) { setError((reason as Error).message); } }
  async function changePassword(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); const newPassword = String(form.get("newPassword") ?? ""); setError(""); if (!isStrongPassword(newPassword, { email: profile.email, displayName: profile.displayName })) { setError(t("profile.passwordRequirements", { min: PASSWORD_MIN_LENGTH })); return; } try { await api("/profile/change-password", { method: "POST", body: JSON.stringify({ currentPassword: form.get("currentPassword"), newPassword }) }); formElement.reset(); clearSession(); nav("/login", { replace: true }); } catch (reason) { setError((reason as Error).message); } }
  return <section className="page-shell"><PageHeader eyebrow={t("profile.account")} title={t("profile.title")} description={t("profile.description")}/>{error && <div className="alert error"><Icon name="warning"/>{error}</div>}{message && <div className="alert success"><Icon name="check"/>{message}</div>}
    <div className="profile-hero"><div className="profile-avatar">{state.data.displayName[0]}</div><div><h3>{state.data.displayName}</h3><p>{state.data.jobTitle || t("profile.jobTitleUnset")}</p><span>{state.data.username ? `@${state.data.username} · ` : ""}{state.data.email}</span></div></div>
    <div className="form-panels"><SectionCard title={t("profile.personalInfo")} description={t("profile.displayInfo")} icon="profile"><AutoSaveForm storageKey={profileDraftKey} className="form-grid" onSubmit={save}><label>{t("profile.displayName")}<input name="displayName" defaultValue={state.data.displayName} required/></label><label>{t("profile.username")}<input value={state.data.username ?? ""} dir="ltr" readOnly autoComplete="username" placeholder={t("registration.notProvided")}/></label><label>{t("auth.email")}<input name="email" type="email" inputMode="email" dir="ltr" defaultValue={state.data.email} required/></label><label>{t("profile.phone")}<input name="phone" defaultValue={state.data.phone ?? ""} onChange={normalizePhoneField} inputMode="numeric" autoComplete="tel" dir="ltr" maxLength={11} pattern="09[0-9]{9}" placeholder={t("registration.phonePlaceholder")}/></label><label>{t("profile.jobTitle")}<input name="jobTitle" defaultValue={state.data.jobTitle ?? ""} placeholder={t("profile.jobTitlePlaceholder")}/></label><label className="full">{t("profile.interfaceLanguage")}<StyledSelect name="locale" defaultValue={state.data.locale}><option value="fa">{t("language.persian")}</option><option value="en">{t("language.english")}</option></StyledSelect></label><button className="primary full"><Icon name="check"/> {t("profile.saveChanges")}</button></AutoSaveForm></SectionCard>
    <SectionCard title={t("profile.changePassword")} description={t("profile.passwordDescription", { min: PASSWORD_MIN_LENGTH })} icon="shield"><form className="form-grid" onSubmit={changePassword}><label className="full">{t("profile.currentPassword")}<input name="currentPassword" type="password" autoComplete="current-password" required/></label><label className="full">{t("profile.newPassword")}<input name="newPassword" type="password" minLength={PASSWORD_MIN_LENGTH} maxLength={128} autoComplete="new-password" required/></label><div className="password-note full"><Icon name="shield"/><span>{t("profile.passwordSecurityNote")}</span></div><button className="primary full">{t("profile.changePasswordButton")}</button></form></SectionCard></div>
  </section>;
}

export function MembersPage() {
  const { locale, t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const state = useLoad<Member[]>("/members");
  const requests = useLoad<MemberAccessRequest[]>("/member-requests?status=PENDING");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<{ id: string; displayName: string; username: string; email: string; phone: string; jobTitle: string; globalRole: string } | null>(null);
  const dialog = useDialog();
  const currentRole = getCurrentRole();
  const canManageMembers = currentRole === "SUPER_ADMIN" || currentRole === "ORG_ADMIN";
  const canRequestMembers = canManageMembers || currentRole === "HSE_MANAGER";
  const memberRoles = currentRole === "SUPER_ADMIN" ? ["SUPER_ADMIN", ...organizationMemberRoles] : organizationMemberRoles;
  const { session, orgId } = getSession();
  const requestDraftKey = scopedDraftKey("member-access-request", session?.user.id, orgId);
  const inviteDraftKey = scopedDraftKey("member-invite", session?.user.id, orgId);
  const memberDraftKey = (memberId: string) => scopedDraftKey(`member-edit:${memberId}`, session?.user.id, orgId);
  async function update(id: string, role: string, active: boolean) { try { await api(`/members/${id}`, { method: "PATCH", body: JSON.stringify({ role, active }) }); state.reload(); setMessage(t("members.accessUpdated")); } catch (reason) { setError((reason as Error).message); } }
  function beginEdit(member: Member) { setEditing({ id: member.id, displayName: member.user.displayName, username: member.user.username ?? "", email: member.user.email, phone: member.user.phone ?? "", jobTitle: member.user.jobTitle ?? "", globalRole: member.user.globalRole ?? "USER" }); setError(""); }
  async function saveMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    const member = state.data?.find((item) => item.id === editing.id);
    if (!member) return;
    const username = String(form.get("username") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const rawPhone = String(form.get("phone") ?? "").trim();
    setError("");
    if (username && !isValidUsername(username)) { setError(t("admin.invalidUsername")); return; }
    if (!isValidEmail(email)) { setError(t("profile.invalidEmail")); return; }
    if (rawPhone && !isValidPhone(rawPhone)) { setError(t("profile.invalidPhone")); return; }
    try {
      await api(`/members/${editing.id}`, { method: "PATCH", body: JSON.stringify({ displayName: form.get("displayName"), username: username ? normalizeUsername(username) : null, email: normalizeEmail(email), phone: rawPhone ? normalizePhone(rawPhone) : null, jobTitle: form.get("jobTitle") || null, globalRole: getCurrentRole() === "SUPER_ADMIN" ? form.get("globalRole") : undefined, role: member.role, active: member.active }) });
      await clearAutoSaveDraft(memberDraftKey(editing.id));
      setEditing(null);
      state.reload();
      setMessage(t("members.edited"));
    } catch (reason) { setError((reason as Error).message); }
  }
  async function removeMember(member: Member) { if (!(await dialog.confirm(t("members.deleteConfirm", { name: member.user.displayName })))) return; if (!(await dialog.confirm(t("members.deleteWarning")))) return; try { await api(`/members/${member.id}`, { method: "DELETE" }); state.reload(); setMessage(t("members.removed")); } catch (reason) { setError((reason as Error).message); } }
  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    const username = normalizeUsername(String(form.get("username") ?? ""));
    const email = normalizeEmail(String(form.get("email") ?? ""));
    const displayName = String(form.get("displayName") ?? "").trim();
    const rawPhone = String(form.get("phone") ?? "").trim();
    setError("");
    if (!isValidUsername(username)) { setError(t("registration.invalidUsername")); return; }
    if (!isValidEmail(email)) { setError(t("profile.invalidEmail")); return; }
    if (!isValidDisplayName(displayName)) { setError(t("profile.invalidDisplayName")); return; }
    if (rawPhone && !isValidPhone(rawPhone)) { setError(t("profile.invalidPhone")); return; }
    try {
      await api("/member-requests", { method: "POST", body: JSON.stringify({ username, email, displayName, phone: rawPhone ? normalizePhone(rawPhone) : null, jobTitle: String(form.get("jobTitle") ?? "").trim() || null, role: form.get("role") }) });
      await clearAutoSaveDraft(requestDraftKey);
      element.reset();
      requests.reload();
      setMessage(t("members.requestCreated"));
    } catch (reason) { setError((reason as Error).message); }
  }
  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    setError("");
    try {
      const result = await api<{ developmentToken?: string }>("/invitations", { method: "POST", body: JSON.stringify({ email: normalizeEmail(String(form.get("email") ?? "")), role: form.get("role") }) });
      await clearAutoSaveDraft(inviteDraftKey);
      setMessage(result.data.developmentToken ? t("members.invitationCreated", { token: result.data.developmentToken }) : t("members.invited"));
      element.reset();
    } catch (reason) { setError((reason as Error).message); }
  }
  return <section className="page-shell"><PageHeader eyebrow={t("members.control")} title={t("members.title")} description={t("members.description")}/>{error && <div className="alert error"><Icon name="warning"/>{error}</div>}{message && <div className="alert success"><Icon name="check"/>{message}</div>}
    {canRequestMembers && <SectionCard title={t("members.requestTitle")} description={t("members.requestDescription")} icon="plus"><AutoSaveForm storageKey={requestDraftKey} className="form-grid" onSubmit={submitRequest}><label>{t("members.requestUsername")}<input name="username" type="text" dir="ltr" autoComplete="username" maxLength={64} placeholder={t("members.requestUsernamePlaceholder")} required/></label><label>{t("members.requestDisplayName")}<input name="displayName" required/></label><label>{t("members.requestEmail")}<input name="email" type="email" dir="ltr" autoComplete="email" placeholder={t("members.requestEmailPlaceholder")} required/></label><label>{t("members.role")}<StyledSelect name="role">{memberRoles.filter((role) => role !== "SUPER_ADMIN").map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</StyledSelect></label><label>{t("members.requestPhone")}<input name="phone" inputMode="numeric" dir="ltr" autoComplete="tel" maxLength={11} placeholder={t("members.phonePlaceholder")}/></label><label>{t("members.requestJobTitle")}<input name="jobTitle"/></label><button className="primary full"><Icon name="plus"/> {t("members.requestSubmit")}</button></AutoSaveForm></SectionCard>}
    {canRequestMembers && <SectionCard title={t("members.pendingRequests")} description={t("members.pendingRequestsDescription")} icon="clock">{requests.loading && !requests.data ? <div className="state"><div className="spinner"/></div> : requests.error ? <div className="alert error"><Icon name="warning"/>{requests.error}</div> : requests.data?.length ? <div className="member-request-list">{requests.data.map((request) => <article className="member-request-card" key={request.id}><div><strong>{request.displayName}</strong><small dir="ltr">@{request.username} · {request.email}</small><small>{roleLabel(request.role)} · {formatDate(request.createdAt, true)}</small></div><span className="status-badge warning">{t("members.requestPending")}</span></article>)}</div> : <EmptyState icon="clock" title={t("members.noRequests")}/>}</SectionCard>}
    {canManageMembers && <SectionCard title={t("members.legacyInviteTitle")} description={t("members.legacyInviteDescription")} icon="members"><AutoSaveForm storageKey={inviteDraftKey} className="invite-form" onSubmit={invite}><label>{t("members.memberEmail")}<input name="email" type="email" dir="ltr" autoComplete="email" placeholder="name@company.com" required/></label><label>{t("members.role")}<StyledSelect name="role">{invitationRoles.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</StyledSelect></label><button className="ghost"><Icon name="members"/> {t("members.sendInvite")}</button></AutoSaveForm></SectionCard>}
        <SectionCard title={t("members.organizationMembers")} description={`${(state.data?.length ?? 0).toLocaleString(numberLocale)} ${t("common.member")}`} icon="members">{state.loading ? <div className="state"><div className="spinner"/></div> : !state.data?.length ? <EmptyState title={t("members.noMembers")} icon="members"/> : <div className="member-list">{state.data.map((member) => { const availableRoles = memberRoles.includes(member.role) ? memberRoles : [member.role, ...memberRoles]; return <article className="member-card" key={member.id}><div className="member-avatar">{member.user.displayName[0]}</div><div className="member-copy"><strong>{member.user.displayName}</strong>{member.user.username && <small dir="ltr">@{member.user.username}</small>}<small>{member.user.email}{member.user.jobTitle ? ` · ${member.user.jobTitle}` : ""}</small>{member.user.globalRole === "SUPER_ADMIN" && <span className="tag">{t("members.superAdmin")}</span>}</div>{canManageMembers && <><StyledSelect value={member.role} onChange={(event) => update(member.id, event.target.value, member.active)}>{availableRoles.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</StyledSelect><button className={`status-toggle ${member.active ? "active" : "inactive"}`} onClick={() => update(member.id, member.role, !member.active)}><span/>{member.active ? t("members.active") : t("members.inactive")}</button><div className="member-actions"><button className="text-button" type="button" aria-expanded={editing?.id === member.id} aria-controls={`member-edit-${member.id}`} data-scroll-target={`#member-edit-${member.id}`} data-scroll-focus="input" onClick={() => beginEdit(member)}>{t("members.edit")}</button><button className="text-button danger-link" type="button" onClick={() => void removeMember(member)}>{t("common.delete")}</button></div>{editing?.id === member.id && <AutoSaveForm id={`member-edit-${member.id}`} storageKey={memberDraftKey(member.id)} className="member-edit-form form-grid" onSubmit={saveMember}><label>{t("profile.displayName")}<input name="displayName" defaultValue={editing.displayName} required/></label><label>{t("profile.username")}<input name="username" defaultValue={editing.username} onChange={(event) => { event.currentTarget.value = normalizeUsername(event.currentTarget.value); }} dir="ltr" autoComplete="username" maxLength={64}/></label><label>{t("auth.email")}<input name="email" type="email" dir="ltr" defaultValue={editing.email} required/></label><label>{t("profile.phone")}<input name="phone" defaultValue={editing.phone} onChange={normalizePhoneField} inputMode="numeric" autoComplete="tel" dir="ltr" maxLength={11} pattern="09[0-9]{9}" placeholder={t("members.phonePlaceholder")}/></label><label>{t("profile.jobTitle")}<input name="jobTitle" defaultValue={editing.jobTitle}/></label>{currentRole === "SUPER_ADMIN" && <label>{t("members.accountLevel")}<StyledSelect name="globalRole" defaultValue={editing.globalRole}><option value="USER">{t("members.normalUser")}</option><option value="SUPER_ADMIN">{t("members.superAdmin")}</option></StyledSelect></label>}<div className="member-edit-actions"><button className="primary" type="submit">{t("members.save")}</button><button className="ghost" type="button" onClick={() => setEditing(null)}>{t("common.cancel")}</button></div></AutoSaveForm>}</>}</article>; })}</div>}
    </SectionCard>
  </section>;
}
