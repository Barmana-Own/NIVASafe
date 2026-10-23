import { useRef, useState, type ChangeEvent, type FormEvent, type MouseEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { isStrongPassword, isValidDisplayName, isValidEmail, isValidPhone, isValidUsername, normalizeEmail, normalizePhone, normalizeUsername, PASSWORD_MIN_LENGTH } from "@nivasafe/domain";
import { api, clearSession, getCurrentRole, getSession, isSessionRemembered, saveSession, type ApiError, type Organization, type Session, useLoad } from "../../api/client";
import { EmptyState, Icon, PageHeader, SectionCard, StyledSelect, formatDate, roleLabel, useDialog } from "../../components/UI";
import { AutoSaveForm, clearAutoSaveDraft } from "../../forms/AutoSaveForm";
import { scopedDraftKey } from "../../forms/autoSave";
import { brandAltForLocale, brandLogoForLocale, useI18n } from "../../i18n";
import { validateMemberRequestIdentity } from "./memberRequestIdentity";
import { AuthAppearanceControls } from "../../components/AuthAppearanceControls";
import { useAppearance } from "../../AppearanceProvider";
import { AccountImageProcessingConsent } from "./ImageProcessingConsent";
import { WorkspaceTabs } from "../../components/WorkspaceTabs";
import { useModalFocus } from "../../components/useModalFocus";
import { useUnsavedChanges } from "../../components/useUnsavedChanges";

type Profile = { id: string; email: string; username: string | null; displayName: string; locale: string; phone: string | null; jobTitle: string | null };
type Member = { id: string; role: string; active: boolean; user: { id: string; email: string; username?: string | null; displayName: string; phone?: string | null; jobTitle?: string | null; globalRole?: string } };
type MemberAccessRequest = { id: string; username: string | null; email: string | null; displayName: string; phone: string | null; jobTitle: string | null; role: string; status: string; rejectionReason: string | null; createdAt: string; reviewedAt: string | null; requestedBy?: { id: string; displayName: string; email: string; username: string | null } };
const roles = ["HSE_MANAGER", "HSE_SPECIALIST", "HSE_OFFICER", "EXTERNAL_AUDITOR", "PERSONNEL", "VIEWER"];
const invitationRoles = [...roles];
const organizationMemberRoles = roles;

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

function LoginEnamadSeal() {
  const { t } = useI18n();
  const [imageUnavailable, setImageUnavailable] = useState(false);
  return <a className="login-enamad-link" referrerPolicy="origin" target="_blank" rel="noopener" href="https://trustseal.enamad.ir/?id=8224326&Code=OW9nd0gobLnQL3PtjfqODpZcZx4e8EG8" aria-label={t("auth.enamadAlt")} title={imageUnavailable ? t("auth.enamadUnavailable") : t("auth.enamadAlt")}>
    {imageUnavailable ? <span className="login-enamad-fallback">{t("auth.enamadLabel")}</span> : <img className="login-enamad-logo" referrerPolicy="origin" src="https://trustseal.enamad.ir/logo.aspx?id=8224326&Code=OW9nd0gobLnQL3PtjfqODpZcZx4e8EG8" alt={t("auth.enamadAlt")} width={48} height={52} decoding="async" {...{ code: "OW9nd0gobLnQL3PtjfqODpZcZx4e8EG8" }} onError={() => setImageUnavailable(true)}/>}
  </a>;
}

export function LoginPage() {
  const { locale, direction, t } = useI18n();
  const { theme } = useAppearance();
  const typographySrc = theme === "blue"
    ? locale === "en" ? "/brand/login-typography-white-en-43467467.png" : "/brand/login-typography-white-fa-5a75f122.png"
    : locale === "en" ? "/brand/login-typography-en-060c9cae.png" : "/brand/login-typography-fa-7488d145.png";
  const nav = useNavigate(); const location = useLocation(); const [params] = useSearchParams(); const submittingRef = useRef(false); const loginFormRef = useRef<HTMLFormElement>(null); const [error, setError] = useState(""); const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({}); const [loading, setLoading] = useState(false); const [showPassword, setShowPassword] = useState(false); const [rememberMe, setRememberMe] = useState(() => localStorage.getItem("nivasafe-remember-login") !== "false"); const [rememberedLoginEmail] = useState(() => localStorage.getItem(REMEMBERED_LOGIN_EMAIL_KEY) ?? ""); const mobileLoginFormVisible = location.hash === "#login-form";
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
    if (!window.matchMedia("(max-width: 900px)").matches || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    nav({ pathname: "/login", search: location.search, hash: "#login-form" });
    window.requestAnimationFrame(() => loginFormRef.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true }));
  }
  return <main className={`login ${mobileLoginFormVisible ? "mobile-login-form-visible" : ""}`} dir={direction} lang={locale}>
    <nav className="login-toolbar" aria-label={t("auth.links")}>
      <div className="login-toolbar-brand"><picture className="login-toolbar-brand-image"><source media="(min-width: 901px)" srcSet={typographySrc}/><img className="login-toolbar-icon" src="/brand/nivasafe-icon.png" alt={brandAltForLocale(locale)}/></picture></div>
      <div className="login-toolbar-links">
        <span className="login-toolbar-link">{t("auth.features")}</span>
        <span className="login-toolbar-link">{t("auth.licenses")}</span>
        <span className="login-toolbar-link">{t("auth.about")}</span>
        <span className="login-toolbar-link">{t("auth.contact")}</span>
      </div>
      <AuthAppearanceControls/>
    </nav>
    <section className="login-art">
      <div className="login-hero-content" id="login-about">
        <div className="login-mobile-brand" aria-label={brandAltForLocale(locale)}>
          <img className="login-mobile-brand-icon" src="/brand/nivasafe-icon.png" alt="" />
          <img className="login-mobile-typography" src={typographySrc} alt={brandAltForLocale(locale)}/>
          <span>{t("auth.brandSubtitle")}</span>
        </div>
        <div className="login-hero-visual" aria-hidden="true"><div className="visual-orb visual-orb-one"/><div className="visual-orb visual-orb-two"/><div className="visual-shield"><Icon name="shield" size={42}/><span>N</span></div><div className="visual-screen"><div className="visual-screen-head"><span/><span/><span/></div><div className="visual-chart"><i/><i/><i/><i/><b/></div><div className="visual-screen-foot"><span/><span/><span/></div></div><div className="visual-hardhat"><span/><b/></div><span className="visual-spark"><Icon name="sparkles" size={20}/></span></div>
        <h1>{t("auth.heroTitle")}</h1>
        <div className="login-cta-row"><Link className="primary" to={{ pathname: "/login", search: location.search, hash: "#login-form" }} onClick={openMobileLogin}><Icon name="logout"/> {t("auth.login")}</Link><Link className="login-secondary-cta" to="/register"><Icon name="user"/> {t("auth.register")}</Link></div>
        <div className="login-features" id="login-features"><span><Icon name="shield"/> {t("auth.featurePersonal")}</span><span><Icon name="assistant"/> {t("auth.featureAi")}</span><span><Icon name="chart"/> {t("auth.featureReports")}</span><span><Icon name="knowledge"/> {t("auth.featureKnowledge")}</span></div>
      </div>
      <footer id="login-support" className="login-approvals login-support-bar" aria-label={t("auth.supportBar")}>
        <span className="login-support-copy">{t("auth.supportBar")}</span>
        <div className="login-trust-marks">
          <img className="login-support-logo" src="/brand/qazvin-science-technology-park.jpg" alt={t("auth.supportBarLogoAlt")}/>
          <LoginEnamadSeal/>
        </div>
      </footer>
    </section>
    <form ref={loginFormRef} id="login-form" className="login-card" autoComplete="on" noValidate aria-busy={loading} onSubmit={submit}>
      <div className="login-welcome-heading"><img className="login-card-logo" src="/brand/nivasafe-icon.png" alt={brandAltForLocale(locale)}/><h2>{t("auth.welcome")}</h2></div><p className="muted">{t("auth.welcomeMessage")}</p>
      <label htmlFor="login-identifier"><span className="field-label-line">{t("auth.loginIdentifier")}</span><input id="login-identifier" name="identifier" type="text" inputMode="email" dir="ltr" placeholder={t("auth.loginUsernamePlaceholder")} autoComplete="username" defaultValue={rememberedLoginEmail} autoCapitalize="none" spellCheck={false} maxLength={254} disabled={loading} aria-invalid={Boolean(fieldErrors.identifier)} aria-describedby={fieldErrors.identifier ? "login-identifier-error" : undefined} onChange={() => { setFieldErrors((current) => ({ ...current, identifier: undefined })); setError(""); }} required/>{fieldErrors.identifier && <small id="login-identifier-error" className="field-error" role="alert">{fieldErrors.identifier}</small>}</label><label htmlFor="login-password"><span className="field-label-line">{t("auth.password")}</span><div className="password-field"><input id="login-password" name="password" aria-label={t("auth.password")} type={showPassword ? "text" : "password"} dir="ltr" placeholder={t("auth.passwordPlaceholder")} autoComplete="current-password" maxLength={128} disabled={loading} aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? "login-password-error" : undefined} onChange={() => { setFieldErrors((current) => ({ ...current, password: undefined })); setError(""); }} required/><button type="button" className="password-toggle" disabled={loading} onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")} title={showPassword ? t("auth.hidePassword") : t("auth.showPassword")} aria-controls="login-password"><Icon name={showPassword ? "eyeOff" : "eye"} size={19}/></button></div>{fieldErrors.password && <small id="login-password-error" className="field-error" role="alert">{fieldErrors.password}</small>}</label>
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
  return <main className="login simple" dir={direction} lang={locale}><AuthAppearanceControls/><form className="login-card" noValidate aria-busy={loading} onSubmit={submit}><span className="auth-icon"><Icon name="profile" size={28}/></span><div className="eyebrow">{t("auth.forgotEyebrow")}</div><h2>{t("auth.forgotTitle")}</h2><p className="muted">{t("auth.forgotMessage")}</p><label htmlFor="forgot-identifier"><span className="field-label-line">{t("auth.loginIdentifier")}</span><input id="forgot-identifier" name="identifier" type="text" inputMode="email" dir="ltr" placeholder={t("auth.loginIdentifierPlaceholder")} autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={254} disabled={loading} aria-invalid={Boolean(fieldError)} aria-describedby={fieldError ? "forgot-identifier-error" : undefined} onChange={() => { setFieldError(""); setError(""); setMessage(""); }} required/>{fieldError && <small id="forgot-identifier-error" className="field-error" role="alert">{fieldError}</small>}</label>{error && <div className="alert error" role="alert" aria-live="assertive"><Icon name="warning"/>{error}</div>}{message && <div className="alert success" role="status" aria-live="polite"><Icon name="check"/>{message}</div>}<button type="submit" className="primary login-button" disabled={loading} aria-busy={loading}>{loading ? <><span className="button-spinner" aria-hidden="true"/>{t("auth.sendingRequest")}</> : t("auth.sendRequest")}</button><Link className="login-link" to="/login">{t("auth.backToLogin")}</Link></form></main>;
}
export function ResetPasswordPage() {
  const { locale, direction, t } = useI18n();
  const [params] = useSearchParams(); const nav = useNavigate(); const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const password = String(form.get("password") ?? ""); if (!isStrongPassword(password)) { setError(t("auth.passwordRequirements", { min: PASSWORD_MIN_LENGTH })); return; } try { await api("/auth/reset-password", { method: "POST", body: JSON.stringify({ token: params.get("token") || form.get("token"), password }) }); nav("/login"); } catch (reason) { setError((reason as Error).message); } }
  return <main className="login simple" dir={direction} lang={locale}><AuthAppearanceControls/><form className="login-card" onSubmit={submit}><span className="auth-icon"><Icon name="shield" size={28}/></span><h2>{t("auth.resetTitle")}</h2>{!params.get("token") && <label>{t("auth.resetToken")}<input name="token" required/></label>}<label>{t("auth.newPassword")}<input name="password" type="password" minLength={PASSWORD_MIN_LENGTH} maxLength={128} required/></label>{error && <div role="alert" className="alert error">{error}</div>}<button className="primary">{t("auth.saveNewPassword")}</button></form></main>;
}

export function AcceptInvitationPage() {
  const { locale, direction, t } = useI18n();
  const [params] = useSearchParams(); const nav = useNavigate(); const token = params.get("token") ?? ""; const { session } = getSession(); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function accept() { if (!session || !token) return; setLoading(true); setError(""); try { const result = await api<{ organization: Organization }>("/invitations/accept", { method: "POST", body: JSON.stringify({ token }) }); const organizations = [...session.organizations.filter((item) => item.id !== result.data.organization.id), result.data.organization]; saveSession({ ...session, organizations }, isSessionRemembered()); localStorage.setItem("nivasafe-org", result.data.organization.id); nav("/", { replace: true }); } catch (reason) { setError((reason as Error).message); } finally { setLoading(false); } }
  if (!token) return <main className="login simple" dir={direction} lang={locale}><AuthAppearanceControls/><section className="login-card"><div role="alert" className="alert error">{t("auth.invitationMissing")}</div><Link className="login-link" to="/login">{t("auth.backToLogin")}</Link></section></main>;
  if (!session) { const next = `/accept-invitation?token=${encodeURIComponent(token)}`; return <main className="login simple" dir={direction} lang={locale}><AuthAppearanceControls/><section className="login-card"><span className="auth-icon"><Icon name="members" size={28}/></span><h2>{t("auth.invitationTitle")}</h2><p className="muted">{t("auth.invitationLoginMessage")}</p><Link className="primary button-link" to={`/login?next=${encodeURIComponent(next)}`}>{t("auth.loginAndContinue")}</Link></section></main>; }
  return <main className="login simple" dir={direction} lang={locale}><AuthAppearanceControls/><section className="login-card"><span className="auth-icon"><Icon name="members" size={28}/></span><h2>{t("auth.invitationTitle")}</h2><p className="muted">{t("auth.invitationConfirmMessage")}</p>{error && <div role="alert" className="alert error">{error}</div>}<button className="primary" onClick={accept} disabled={loading}>{loading ? t("auth.acceptingInvitation") : t("auth.acceptInvitation")}</button></section></main>;
}

export function ProfilePage() {
  const { t } = useI18n();
  const nav = useNavigate();
  const state = useLoad<Profile>("/profile"); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  if (state.error) return <div role="alert" className="alert error">{state.error}</div>; if (!state.data) return <div className="state"><div className="spinner"/></div>;
  const profile = state.data;
  const initialLocale = profile.locale;
  const { session, orgId } = getSession();
  const profileDraftKey = scopedDraftKey("profile-edit", session?.user.id, orgId);
  async function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const email = String(form.get("email") ?? "").trim(); const displayName = String(form.get("displayName") ?? "").trim(); const rawPhone = String(form.get("phone") ?? "").trim(); setError(""); if (!isValidEmail(email)) { setError(t("profile.invalidEmail")); return; } if (!isValidDisplayName(displayName)) { setError(t("profile.invalidDisplayName")); return; } if (rawPhone && !isValidPhone(rawPhone)) { setError(t("profile.invalidPhone")); return; } try { const result = await api<Profile>("/profile", { method: "PATCH", body: JSON.stringify({ email, displayName, phone: rawPhone ? normalizePhone(rawPhone) : null, jobTitle: form.get("jobTitle") || null, locale: form.get("locale") }) }); const nextLocale = result.data.locale === "en" ? "en" : "fa"; localStorage.setItem("nivasafe-locale", nextLocale); await clearAutoSaveDraft(profileDraftKey); const current = getSession().session; if (current) saveSession({ ...current, user: { ...current.user, ...result.data } }, isSessionRemembered()); setMessage(t("profile.saved")); state.reload(); if (nextLocale !== initialLocale) window.location.reload(); } catch (reason) { setError((reason as Error).message); } }
  async function changePassword(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); const newPassword = String(form.get("newPassword") ?? ""); setError(""); if (!isStrongPassword(newPassword, { email: profile.email, displayName: profile.displayName })) { setError(t("profile.passwordRequirements", { min: PASSWORD_MIN_LENGTH })); return; } try { await api("/profile/change-password", { method: "POST", body: JSON.stringify({ currentPassword: form.get("currentPassword"), newPassword }) }); formElement.reset(); clearSession(); nav("/login", { replace: true }); } catch (reason) { setError((reason as Error).message); } }
  return <section className="page-shell"><PageHeader eyebrow={t("profile.account")} title={t("profile.title")} description={t("profile.description")}/>{error && <div role="alert" className="alert error"><Icon name="warning"/>{error}</div>}{message && <div role="status" className="alert success"><Icon name="check"/>{message}</div>}
    <div className="profile-hero"><div className="profile-avatar">{state.data.displayName[0]}</div><div><h3>{state.data.displayName}</h3><p>{state.data.jobTitle || t("profile.jobTitleUnset")}</p><span>{state.data.username ? `@${state.data.username} · ` : ""}{state.data.email}</span></div></div>
    <div className="form-panels"><SectionCard title={t("profile.personalInfo")} description={t("profile.displayInfo")} icon="profile"><AutoSaveForm storageKey={profileDraftKey} className="form-grid" onSubmit={save}><label>{t("profile.displayName")}<input name="displayName" defaultValue={state.data.displayName} required/></label><label>{t("profile.username")}<input value={state.data.username ?? ""} dir="ltr" readOnly autoComplete="username" placeholder={t("registration.notProvided")}/></label><label>{t("auth.email")}<input name="email" type="email" inputMode="email" dir="ltr" defaultValue={state.data.email} required/></label><label>{t("profile.phone")}<input name="phone" defaultValue={state.data.phone ?? ""} onChange={normalizePhoneField} inputMode="numeric" autoComplete="tel" dir="ltr" maxLength={11} pattern="09[0-9]{9}" placeholder={t("registration.phonePlaceholder")}/></label><label>{t("profile.jobTitle")}<input name="jobTitle" defaultValue={state.data.jobTitle ?? ""} placeholder={t("profile.jobTitlePlaceholder")}/></label><label className="full">{t("profile.interfaceLanguage")}<StyledSelect aria-label={t("profile.interfaceLanguage")} name="locale" defaultValue={state.data.locale}><option value="fa">{t("language.persian")}</option><option value="en">{t("language.english")}</option></StyledSelect></label><button className="primary full"><Icon name="check"/> {t("profile.saveChanges")}</button></AutoSaveForm></SectionCard>
    <SectionCard title={t("profile.changePassword")} description={t("profile.passwordDescription", { min: PASSWORD_MIN_LENGTH })} icon="shield"><form className="form-grid" onSubmit={changePassword}><label className="full">{t("profile.currentPassword")}<input name="currentPassword" type="password" autoComplete="current-password" required/></label><label className="full">{t("profile.newPassword")}<input name="newPassword" type="password" minLength={PASSWORD_MIN_LENGTH} maxLength={128} autoComplete="new-password" required/></label><div className="password-note full"><Icon name="shield"/><span>{t("profile.passwordSecurityNote")}</span></div><button className="primary full">{t("profile.changePasswordButton")}</button></form></SectionCard></div>
    <AccountImageProcessingConsent/>
  </section>;
}

export function MembersPage() {
  const { locale, t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const state = useLoad<Member[]>("/members");
  const requests = useLoad<MemberAccessRequest[]>("/member-requests?status=PENDING");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"members" | "requests" | "invitations">("members");
  const [busy, setBusy] = useState(false);
  const [editingDirty, setEditingDirty] = useState(false);
  const memberEditorRef = useRef<HTMLElement>(null);
  const [editing, setEditing] = useState<{ id: string; displayName: string; username: string; email: string; phone: string; jobTitle: string; globalRole: string } | null>(null);
  const dialog = useDialog();
  const currentRole = getCurrentRole();
  const canManageMembers = currentRole === "SUPER_ADMIN" || currentRole === "ORG_ADMIN";
  const canRequestMembers = canManageMembers || currentRole === "HSE_MANAGER";
  const memberRoles = organizationMemberRoles;
  const { session, orgId } = getSession();
  const requestDraftKey = scopedDraftKey("member-access-request", session?.user.id, orgId);
  const inviteDraftKey = scopedDraftKey("member-invite", session?.user.id, orgId);
  const memberDraftKey = (memberId: string) => scopedDraftKey(`member-edit:${memberId}`, session?.user.id, orgId);
  const editingMember = state.data?.find((member) => member.id === editing?.id);
  async function closeEditor() {
    if (busy || !editing) return;
    if (editingDirty && !(await dialog.confirm(t("redesign.unsavedChanges")))) return;
    if (editingDirty) await clearAutoSaveDraft(memberDraftKey(editing.id));
    setEditing(null); setEditingDirty(false);
  }
  useModalFocus(memberEditorRef, Boolean(editing), () => void closeEditor());
  useUnsavedChanges(Boolean(editing && editingDirty), t("redesign.unsavedChanges"));
  async function update(id: string, role: string, active: boolean) { if (busy) return; setBusy(true); setError(""); try { await api(`/members/${id}`, { method: "PATCH", body: JSON.stringify({ role, active }) }); state.reload(); setMessage(t("members.accessUpdated")); } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); } }
  function beginEdit(member: Member) { setEditingDirty(false); setEditing({ id: member.id, displayName: member.user.displayName, username: member.user.username ?? "", email: member.user.email, phone: member.user.phone ?? "", jobTitle: member.user.jobTitle ?? "", globalRole: member.user.globalRole ?? "USER" }); setError(""); }
  async function saveMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || busy) return;
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
    setBusy(true);
    try {
      await api(`/members/${editing.id}`, { method: "PATCH", body: JSON.stringify({ displayName: form.get("displayName"), username: username ? normalizeUsername(username) : null, email: normalizeEmail(email), phone: rawPhone ? normalizePhone(rawPhone) : null, jobTitle: form.get("jobTitle") || null, globalRole: getCurrentRole() === "SUPER_ADMIN" ? form.get("globalRole") : undefined, role: member.role, active: member.active }) });
      await clearAutoSaveDraft(memberDraftKey(editing.id));
      setEditing(null);
      setEditingDirty(false);
      state.reload();
      setMessage(t("members.edited"));
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }
  async function removeMember(member: Member) { if (busy) return; if (!(await dialog.confirm(t("members.deleteConfirm", { name: member.user.displayName })))) return; if (!(await dialog.confirm(t("members.deleteWarning")))) return; setBusy(true); try { await api(`/members/${member.id}`, { method: "DELETE" }); setEditing(null); state.reload(); setMessage(t("members.removed")); } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); } }
  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const element = event.currentTarget;
    const form = new FormData(element);
    const identityResult = validateMemberRequestIdentity({
      username: String(form.get("username") ?? ""),
      email: String(form.get("email") ?? ""),
    });
    const displayName = String(form.get("displayName") ?? "").trim();
    const rawPhone = String(form.get("phone") ?? "").trim();
    setError("");
    if (identityResult.identity === null) {
      setError(identityResult.error === "required" ? t("members.requestIdentityRequired") : identityResult.error === "invalidUsername" ? t("registration.invalidUsername") : t("profile.invalidEmail"));
      return;
    }
    if (!isValidDisplayName(displayName)) { setError(t("profile.invalidDisplayName")); return; }
    if (rawPhone && !isValidPhone(rawPhone)) { setError(t("profile.invalidPhone")); return; }
    setBusy(true);
    try {
      await api("/member-requests", { method: "POST", body: JSON.stringify({ ...identityResult.identity, displayName, phone: rawPhone ? normalizePhone(rawPhone) : null, jobTitle: String(form.get("jobTitle") ?? "").trim() || null, role: form.get("role") }) });
      await clearAutoSaveDraft(requestDraftKey);
      element.reset();
      requests.reload();
      setMessage(t("members.requestCreated"));
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }
  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const element = event.currentTarget;
    const form = new FormData(element);
    setError("");
    setBusy(true);
    try {
      const result = await api<{ developmentToken?: string }>("/invitations", { method: "POST", body: JSON.stringify({ email: normalizeEmail(String(form.get("email") ?? "")), role: form.get("role") }) });
      await clearAutoSaveDraft(inviteDraftKey);
      setMessage(result.data.developmentToken ? t("members.invitationCreated", { token: result.data.developmentToken }) : t("members.invited"));
      element.reset();
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }
  return <section className="page-shell members-workspace"><PageHeader eyebrow={t("members.control")} title={t("members.title")} description={t("members.description")}/>{error && !editing && <div role="alert" className="alert error"><Icon name="warning"/>{error}</div>}{message && <div role="status" className="alert success"><Icon name="check"/>{message}</div>}
    <WorkspaceTabs prefix="members" value={activeTab} onChange={setActiveTab} tabs={[
      { id: "members", label: t("members.workspaceMembers") },
      ...(canRequestMembers ? [{ id: "requests" as const, label: t("members.workspaceRequests"), count: requests.data?.length }] : []),
      ...(canManageMembers ? [{ id: "invitations" as const, label: t("members.workspaceInvitations") }] : []),
    ]}/>
    <div role="tabpanel" tabIndex={0} id="members-panel-members" aria-labelledby="members-tab-members" hidden={activeTab !== "members"}>
      <SectionCard title={t("members.organizationMembers")} description={(state.data?.length ?? 0).toLocaleString(numberLocale) + " " + t("common.member")} icon="members">
        {state.loading ? <div className="state"><div className="spinner"/></div> : state.error ? <div className="alert error" role="alert">{state.error}</div> : !state.data?.length ? <EmptyState title={t("members.noMembers")} icon="members"/> : <div className="admin-user-list">{state.data.map((member) => <article className="admin-user-card organization-member-card" key={member.id}>
          <div className="admin-user-card-heading"><div className="admin-user-avatar" aria-hidden="true">{member.user.displayName[0]}</div><div className="admin-user-card-identity"><strong>{member.user.displayName}</strong>{member.user.username && <small dir="ltr">@{member.user.username}</small>}<small dir="ltr">{member.user.email}</small>{member.user.jobTitle && <small>{member.user.jobTitle}</small>}</div></div>
          <div className="admin-user-card-badges"><span className="status-badge neutral">{roleLabel(member.role)}</span><span className={"status-badge " + (member.active ? "success" : "neutral")}>{member.active ? t("members.active") : t("members.inactive")}</span>{member.user.globalRole === "SUPER_ADMIN" && <span className="status-badge neutral">{t("members.superAdmin")}</span>}</div>
          {canManageMembers && <div className="admin-user-card-actions"><button className="ghost" type="button" disabled={busy} onClick={() => beginEdit(member)}><Icon name="edit" size={16}/>{t("members.edit")}</button></div>}
        </article>)}</div>}
      </SectionCard>
    </div>
    <div className="admin-workspace-panel" role="tabpanel" tabIndex={0} id="members-panel-requests" aria-labelledby="members-tab-requests" hidden={activeTab !== "requests"}>
      {canRequestMembers && <SectionCard title={t("members.requestTitle")} description={t("members.requestDescription")} icon="plus"><AutoSaveForm storageKey={requestDraftKey} className="form-grid" onSubmit={submitRequest}><label>{t("members.requestUsername")}<input name="username" type="text" dir="ltr" autoComplete="username" maxLength={64} placeholder={t("members.requestUsernamePlaceholder")}/></label><label>{t("members.requestDisplayName")}<input name="displayName" required/></label><label>{t("members.requestEmail")}<input name="email" type="email" dir="ltr" autoComplete="email" placeholder={t("members.requestEmailPlaceholder")}/></label><label>{t("members.role")}<StyledSelect aria-label={t("members.role")} name="role">{memberRoles.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</StyledSelect></label><label>{t("members.requestPhone")}<input name="phone" inputMode="numeric" dir="ltr" autoComplete="tel" maxLength={11} placeholder={t("members.phonePlaceholder")}/></label><label>{t("members.requestJobTitle")}<input name="jobTitle"/></label><button className="primary full"><Icon name="plus"/> {t("members.requestSubmit")}</button></AutoSaveForm></SectionCard>}
{canRequestMembers && <SectionCard title={t("members.pendingRequests")} description={t("members.pendingRequestsDescription")} icon="clock">{requests.loading && !requests.data ? <div className="state"><div className="spinner"/></div> : requests.error ? <div role="alert" className="alert error"><Icon name="warning"/>{requests.error}</div> : requests.data?.length ? <div className="member-request-list">{requests.data.map((request) => <article className="member-request-card" key={request.id}>
      <div className="member-request-identity">
        <span className="member-request-avatar" aria-hidden="true">{request.displayName.trim().slice(0, 1)}</span>
        <div className="member-request-copy">
          <strong>{request.displayName}</strong>
          <div className="member-request-identifiers" dir="ltr">
            {request.username && <span>@{request.username}</span>}
            {request.email && <span>{request.email}</span>}
          </div>
          <div className="member-request-meta">
            <span className="member-request-role">{roleLabel(request.role)}</span>
            <time className="member-request-date" dateTime={request.createdAt}>{formatDate(request.createdAt, true)}</time>
          </div>
        </div>
      </div>
      <span className="status-badge warning member-request-status">{t("members.requestPending")}</span>
    </article>)}</div> : <EmptyState icon="clock" title={t("members.noRequests")}/>}</SectionCard>}
    </div>
    <div className="admin-workspace-panel" role="tabpanel" tabIndex={0} id="members-panel-invitations" aria-labelledby="members-tab-invitations" hidden={activeTab !== "invitations"}>
      {canManageMembers && <SectionCard title={t("members.legacyInviteTitle")} description={t("members.legacyInviteDescription")} icon="members"><AutoSaveForm storageKey={inviteDraftKey} className="invite-form" onSubmit={invite}><label>{t("members.memberEmail")}<input name="email" type="email" dir="ltr" autoComplete="email" placeholder="name@company.com" required/></label><label>{t("members.role")}<StyledSelect aria-label={t("members.role")} name="role">{invitationRoles.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</StyledSelect></label><button className="ghost"><Icon name="members"/> {t("members.sendInvite")}</button></AutoSaveForm></SectionCard>}
    </div>
    {editing && editingMember && canManageMembers && <div className="admin-user-editor-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) void closeEditor(); }}>
      <section ref={memberEditorRef} className="admin-user-editor" role="dialog" tabIndex={-1} aria-modal="true" aria-busy={busy} aria-labelledby="member-editor-title">
        <header className="admin-user-editor-heading"><div><h2 id="member-editor-title">{editingMember.user.displayName}</h2><p dir="ltr">{editingMember.user.email}</p></div><button className="icon-button" type="button" disabled={busy} aria-label={t("common.cancel")} onClick={() => void closeEditor()}>×</button></header>
        {error && <div role="alert" className="alert error"><Icon name="warning"/>{error}</div>}
        <div className="admin-user-access">
          {memberRoles.includes(editingMember.role) ? <label>{t("members.role")}<StyledSelect aria-label={t("members.role")} value={editingMember.role} disabled={busy} onChange={(event) => void update(editingMember.id, event.target.value, editingMember.active)}>{memberRoles.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</StyledSelect></label> : <span className="status-badge neutral member-legacy-role">{roleLabel(editingMember.role)}</span>}
          <button className={"status-toggle " + (editingMember.active ? "active" : "inactive")} disabled={busy} onClick={() => void update(editingMember.id, editingMember.role, !editingMember.active)}><span/>{editingMember.active ? t("members.active") : t("members.inactive")}</button>
        </div>
        <AutoSaveForm id={`member-edit-${editingMember.id}`} storageKey={memberDraftKey(editingMember.id)} className="member-edit-form form-grid" onInputCapture={() => setEditingDirty(true)} onChangeCapture={() => setEditingDirty(true)} onSubmit={saveMember}><label>{t("profile.displayName")}<input name="displayName" defaultValue={editing.displayName} required/></label><label>{t("profile.username")}<input name="username" defaultValue={editing.username} onChange={(event) => { event.currentTarget.value = normalizeUsername(event.target.value); }} dir="ltr" autoComplete="username" maxLength={64}/></label><label>{t("auth.email")}<input name="email" type="email" dir="ltr" defaultValue={editing.email} required/></label><label>{t("profile.phone")}<input name="phone" defaultValue={editing.phone} onChange={normalizePhoneField} inputMode="numeric" autoComplete="tel" dir="ltr" maxLength={11} pattern="09[0-9]{9}" placeholder={t("members.phonePlaceholder")}/></label><label>{t("profile.jobTitle")}<input name="jobTitle" defaultValue={editing.jobTitle}/></label>{currentRole === "SUPER_ADMIN" && <label>{t("members.accountLevel")}<StyledSelect aria-label={t("members.accountLevel")} name="globalRole" defaultValue={editing.globalRole}><option value="USER">{t("members.normalUser")}</option><option value="SUPER_ADMIN">{t("members.superAdmin")}</option></StyledSelect></label>}<div className="member-edit-actions"><button className="primary" type="submit" disabled={busy}>{t("members.save")}</button><button className="ghost" type="button" onClick={() => void closeEditor()}>{t("common.cancel")}</button></div></AutoSaveForm>
        <div className="admin-edit-actions"><button className="ghost danger-link" type="button" disabled={busy} onClick={() => void removeMember(editingMember)}>{t("common.delete")}</button></div>
      </section>
    </div>}
  </section>;
}
