import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { isStrongPassword, isValidDisplayName, isValidEmail, isValidPhone, normalizePhone, PASSWORD_MIN_LENGTH } from "@nivasafe/domain";
import { api, clearSession, getCurrentRole, getSession, isSessionRemembered, saveSession, type ApiError, type Organization, type Session, useLoad } from "../../api/client";
import { EmptyState, Icon, PageHeader, SectionCard, roleLabel, useDialog } from "../../components/UI";
import { AutoSaveForm, clearAutoSaveDraft } from "../../forms/AutoSaveForm";
import { scopedDraftKey } from "../../forms/autoSave";
import { LanguageSwitcher, brandAltForLocale, brandLogoForLocale, useI18n } from "../../i18n";

type Profile = { id: string; email: string; displayName: string; locale: string; phone: string | null; jobTitle: string | null };
type Member = { id: string; role: string; active: boolean; user: { id: string; email: string; displayName: string; phone?: string | null; jobTitle?: string | null; globalRole?: string } };
const roles = ["ORG_ADMIN", "HSE_MANAGER", "ASSESSOR", "VIEWER"];

function normalizePhoneField(event: ChangeEvent<HTMLInputElement>): void {
  event.currentTarget.value = normalizePhone(event.currentTarget.value);
}

export function LoginPage() {
  const { locale, direction, t } = useI18n();
  const nav = useNavigate(); const [params] = useSearchParams(); const [error, setError] = useState(""); const [loading, setLoading] = useState(false); const [showPassword, setShowPassword] = useState(false); const [rememberMe, setRememberMe] = useState(() => localStorage.getItem("nivasafe-remember-login") !== "false");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (!isValidEmail(email)) { setError(t("auth.invalidEmail")); return; }
    if (!password) { setError(t("auth.enterPassword")); return; }
    setLoading(true); setError("");
    try {
      const result = await api<Session>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      saveSession(result.data, rememberMe);
      localStorage.setItem("nivasafe-locale", result.data.user.locale === "en" ? "en" : "fa");
      localStorage.setItem("nivasafe-remember-login", String(rememberMe));
      const next = params.get("next");
      const firstRun = !localStorage.getItem("nivasafe-path-selected");
      nav(next?.startsWith("/") ? next : firstRun ? "/choose-path" : "/");
    } catch (reason) {
      const apiError = reason as ApiError;
      setError(apiError.code === "INVALID_CREDENTIALS" ? t("auth.invalidCredentials") : apiError.code === "INVALID_EMAIL" ? t("auth.invalidEmail") : reason instanceof Error ? reason.message : t("auth.loginFailed"));
    } finally { setLoading(false); }
  }
  return <main className="login" dir={direction} lang={locale}>
    <section className="login-art">
      <nav className="login-toolbar" aria-label={t("auth.links")}>
        <a className="login-toolbar-brand" href="https://app.nivasafe.com" target="_blank" rel="noreferrer"><img src="/brand/nivasafe-icon.png" alt=""/><span>{t("brand.name")}</span></a>
        <div className="login-toolbar-links"><a href="https://app.nivasafe.com" target="_blank" rel="noreferrer">{t("auth.website")}</a><a href="#login-form">{t("auth.login")}</a><a href="/register">{t("auth.register")}</a><a href="mailto:support@nivasafe.com">{t("auth.contact")}</a></div>
        <LanguageSwitcher className="login-language-switch" />
        <a className="login-toolbar-menu" href="https://app.nivasafe.com" target="_blank" rel="noreferrer" aria-label={t("auth.goToWebsite")}><Icon name="arrow" size={16}/></a>
      </nav>
      <div className="login-hero-content">
        <div className="login-brand-panel">
          <img className="login-hero-icon" src="/brand/nivasafe-icon.png" alt=""/>
          <div className="login-brand-copy"><img className="login-logo-wordmark" src={brandLogoForLocale(locale)} alt={brandAltForLocale(locale)}/></div>
        </div>
        <h1>NIVASafe</h1>
        <div className="login-cta-row"><a className="primary" href="#login-form"><Icon name="logout"/> {t("auth.login")}</a><a className="login-secondary-cta" href="/register"><Icon name="user"/> {t("auth.register")}</a></div>
        <div className="login-hero-visual" aria-hidden="true"><div className="visual-orb visual-orb-one"/><div className="visual-orb visual-orb-two"/><div className="visual-shield"><Icon name="shield" size={42}/><span>N</span></div><div className="visual-screen"><div className="visual-screen-head"><span/><span/><span/></div><div className="visual-chart"><i/><i/><i/><i/><b/></div><div className="visual-screen-foot"><span/><span/><span/></div></div><div className="visual-hardhat"><span/><b/></div><span className="visual-spark"><Icon name="sparkles" size={20}/></span></div>
        <div className="login-features"><span><Icon name="shield"/> {t("auth.featurePersonal")}</span><span><Icon name="assistant"/> {t("auth.featureAi")}</span><span><Icon name="chart"/> {t("auth.featureReports")}</span><span><Icon name="knowledge"/> {t("auth.featureKnowledge")}</span></div>
      </div>
      <div className="login-approvals"><span className="login-approvals-title">{t("auth.approvals")}</span><div className="approval-list"><span><Icon name="shield" size={16}/> {t("auth.orgSecurity")}</span><span><Icon name="check" size={16}/> {t("auth.hseStandards")}</span><span><Icon name="health" size={16}/> {t("auth.occupationalHealth")}</span></div></div>
    </section>
    <form id="login-form" className="login-card" onSubmit={submit}>
      <img className="login-card-logo" src="/brand/nivasafe-icon.png" alt={brandAltForLocale(locale)}/><div className="eyebrow">{t("auth.loginEyebrow")}</div><h2>{t("auth.welcome")}</h2><p className="muted">{t("auth.welcomeMessage")}</p>
      <label htmlFor="login-email">{t("auth.email")}<input id="login-email" name="email" type="email" inputMode="email" dir="ltr" placeholder={t("auth.emailPlaceholder")} autoComplete="username" required/></label><label htmlFor="login-password">{t("auth.password")}<div className="password-field"><input id="login-password" name="password" aria-label={t("auth.password")} type={showPassword ? "text" : "password"} dir="ltr" autoComplete="current-password" required/><button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")} title={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}><Icon name={showPassword ? "eyeOff" : "eye"} size={19}/></button></div></label>
      <div className="login-options"><label className="remember-me"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)}/><span>{t("auth.rememberMe")}</span></label><Link className="login-link" to="/forgot-password">{t("auth.forgotPassword")}</Link></div>
      {error && <div className="alert error" role="alert"><Icon name="warning"/>{error}</div>}
      <button type="submit" className="primary login-button" disabled={loading}>{loading ? t("auth.signingIn") : <><Icon name="shield"/> {t("auth.secureLogin")}</>}</button>
      <Link className="login-link register-link" to="/register">{t("auth.newUser")}</Link>
      <div className="login-card-footer">{t("auth.secureFooter")}</div>
    </form>
  </main>;
}

export function ForgotPasswordPage() {
  const { locale, direction, t } = useI18n();
  const [message, setMessage] = useState(""); const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); try { const result = await api<{ accepted: boolean; developmentToken?: string }>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email: form.get("email") }) }); setMessage(result.data.developmentToken ? t("auth.developmentToken", { token: result.data.developmentToken }) : t("auth.forgotAccepted")); } catch (reason) { setError((reason as Error).message); } }
  return <main className="login simple" dir={direction} lang={locale}><form className="login-card" onSubmit={submit}><span className="auth-icon"><Icon name="profile" size={28}/></span><div className="eyebrow">{t("auth.forgotEyebrow")}</div><h2>{t("auth.forgotTitle")}</h2><p className="muted">{t("auth.forgotMessage")}</p><label>{t("auth.email")}<input name="email" type="email" required/></label>{error && <div className="alert error">{error}</div>}{message && <div className="alert success">{message}</div>}<button className="primary">{t("auth.sendRequest")}</button><Link className="login-link" to="/login">{t("auth.backToLogin")}</Link></form></main>;
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
    <div className="profile-hero"><div className="profile-avatar">{state.data.displayName[0]}</div><div><h3>{state.data.displayName}</h3><p>{state.data.jobTitle || t("profile.jobTitleUnset")}</p><span>{state.data.email}</span></div></div>
    <div className="form-panels"><SectionCard title={t("profile.personalInfo")} description={t("profile.displayInfo")} icon="profile"><AutoSaveForm storageKey={profileDraftKey} className="form-grid" onSubmit={save}><label>{t("profile.displayName")}<input name="displayName" defaultValue={state.data.displayName} required/></label><label>{t("auth.email")}<input name="email" type="email" inputMode="email" dir="ltr" defaultValue={state.data.email} required/></label><label>{t("profile.phone")}<input name="phone" defaultValue={state.data.phone ?? ""} onChange={normalizePhoneField} inputMode="numeric" autoComplete="tel" dir="ltr" maxLength={11} pattern="09[0-9]{9}" placeholder={t("registration.phonePlaceholder")}/></label><label>{t("profile.jobTitle")}<input name="jobTitle" defaultValue={state.data.jobTitle ?? ""} placeholder={t("profile.jobTitlePlaceholder")}/></label><label className="full">{t("profile.interfaceLanguage")}<select name="locale" defaultValue={state.data.locale}><option value="fa">{t("language.persian")}</option><option value="en">{t("language.english")}</option></select></label><button className="primary full"><Icon name="check"/> {t("profile.saveChanges")}</button></AutoSaveForm></SectionCard>
    <SectionCard title={t("profile.changePassword")} description={t("profile.passwordDescription", { min: PASSWORD_MIN_LENGTH })} icon="shield"><form className="form-grid" onSubmit={changePassword}><label className="full">{t("profile.currentPassword")}<input name="currentPassword" type="password" autoComplete="current-password" required/></label><label className="full">{t("profile.newPassword")}<input name="newPassword" type="password" minLength={PASSWORD_MIN_LENGTH} maxLength={128} autoComplete="new-password" required/></label><div className="password-note full"><Icon name="shield"/><span>{t("profile.passwordSecurityNote")}</span></div><button className="primary full">{t("profile.changePasswordButton")}</button></form></SectionCard></div>
  </section>;
}

export function MembersPage() {
  const { locale, t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const state = useLoad<Member[]>("/members"); const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [editing, setEditing] = useState<{ id: string; displayName: string; email: string; phone: string; jobTitle: string; globalRole: string } | null>(null); const dialog = useDialog(); const memberRoles = getCurrentRole() === "SUPER_ADMIN" ? ["SUPER_ADMIN", ...roles] : roles;
  const { session, orgId } = getSession();
  const inviteDraftKey = scopedDraftKey("member-invite", session?.user.id, orgId);
  const memberDraftKey = (memberId: string) => scopedDraftKey(`member-edit:${memberId}`, session?.user.id, orgId);
  async function update(id: string, role: string, active: boolean) { try { await api(`/members/${id}`, { method: "PATCH", body: JSON.stringify({ role, active }) }); state.reload(); setMessage(t("members.accessUpdated")); } catch (reason) { setError((reason as Error).message); } }
  function beginEdit(member: Member) { setEditing({ id: member.id, displayName: member.user.displayName, email: member.user.email, phone: member.user.phone ?? "", jobTitle: member.user.jobTitle ?? "", globalRole: member.user.globalRole ?? "USER" }); setError(""); }
  async function saveMember(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!editing) return; const form = new FormData(event.currentTarget); const member = state.data?.find((item) => item.id === editing.id); if (!member) return; const rawPhone = String(form.get("phone") ?? "").trim(); setError(""); if (rawPhone && !isValidPhone(rawPhone)) { setError(t("profile.invalidPhone")); return; } try { await api(`/members/${editing.id}`, { method: "PATCH", body: JSON.stringify({ displayName: form.get("displayName"), email: form.get("email"), phone: rawPhone ? normalizePhone(rawPhone) : null, jobTitle: form.get("jobTitle") || null, globalRole: getCurrentRole() === "SUPER_ADMIN" ? form.get("globalRole") : undefined, role: member.role, active: member.active }) }); await clearAutoSaveDraft(memberDraftKey(editing.id)); setEditing(null); state.reload(); setMessage(t("members.edited")); } catch (reason) { setError((reason as Error).message); } }
  async function removeMember(member: Member) { if (!(await dialog.confirm(t("members.deleteConfirm", { name: member.user.displayName })))) return; if (!(await dialog.confirm(t("members.deleteWarning")))) return; try { await api(`/members/${member.id}`, { method: "DELETE" }); state.reload(); setMessage(t("members.removed")); } catch (reason) { setError((reason as Error).message); } }
  async function invite(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const element = event.currentTarget; const form = new FormData(element); try { const result = await api<{ developmentToken?: string }>("/invitations", { method: "POST", body: JSON.stringify({ email: form.get("email"), role: form.get("role") }) }); await clearAutoSaveDraft(inviteDraftKey); setMessage(result.data.developmentToken ? t("members.invitationCreated", { token: result.data.developmentToken }) : t("members.invited")); element.reset(); } catch (reason) { setError((reason as Error).message); } }
  return <section className="page-shell"><PageHeader eyebrow={t("members.control")} title={t("members.title")} description={t("members.description")}/>{error && <div className="alert error"><Icon name="warning"/>{error}</div>}{message && <div className="alert success"><Icon name="check"/>{message}</div>}
    <SectionCard title={t("members.invite")} description={t("members.inviteDescription")} icon="plus"><AutoSaveForm storageKey={inviteDraftKey} className="invite-form" onSubmit={invite}><label>{t("members.memberEmail")}<input name="email" type="email" placeholder="name@company.com" required/></label><label>{t("members.role")}<select name="role">{memberRoles.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</select></label><button className="primary"><Icon name="plus"/> {t("members.sendInvite")}</button></AutoSaveForm></SectionCard>
    <SectionCard title={t("members.organizationMembers")} description={`${(state.data?.length ?? 0).toLocaleString(numberLocale)} ${t("common.member")}`} icon="members">{state.loading ? <div className="state"><div className="spinner"/></div> : !state.data?.length ? <EmptyState title={t("members.noMembers")} icon="members"/> : <div className="member-list">{state.data.map((member) => { const availableRoles = memberRoles.includes(member.role) ? memberRoles : [member.role, ...memberRoles]; return <article className="member-card" key={member.id}><div className="member-avatar">{member.user.displayName[0]}</div><div className="member-copy"><strong>{member.user.displayName}</strong><small>{member.user.email}{member.user.jobTitle ? ` · ${member.user.jobTitle}` : ""}</small>{member.user.globalRole === "SUPER_ADMIN" && <span className="tag">{t("members.superAdmin")}</span>}</div><select value={member.role} onChange={(event) => update(member.id, event.target.value, member.active)}>{availableRoles.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</select><button className={`status-toggle ${member.active ? "active" : "inactive"}`} onClick={() => update(member.id, member.role, !member.active)}><span/>{member.active ? t("members.active") : t("members.inactive")}</button><div className="member-actions"><button className="text-button" type="button" onClick={() => beginEdit(member)}>{t("members.edit")}</button><button className="text-button danger-link" type="button" onClick={() => void removeMember(member)}>{t("common.delete")}</button></div>{editing?.id === member.id && <AutoSaveForm storageKey={memberDraftKey(member.id)} className="member-edit-form form-grid" onSubmit={saveMember}><label>{t("profile.displayName")}<input name="displayName" defaultValue={editing.displayName} required/></label><label>{t("auth.email")}<input name="email" type="email" dir="ltr" defaultValue={editing.email} required/></label><label>{t("profile.phone")}<input name="phone" defaultValue={editing.phone} onChange={normalizePhoneField} inputMode="numeric" autoComplete="tel" dir="ltr" maxLength={11} pattern="09[0-9]{9}" placeholder={t("members.phonePlaceholder")}/></label><label>{t("profile.jobTitle")}<input name="jobTitle" defaultValue={editing.jobTitle}/></label>{getCurrentRole() === "SUPER_ADMIN" && <label>{t("members.accountLevel")}<select name="globalRole" defaultValue={editing.globalRole}><option value="USER">{t("members.normalUser")}</option><option value="SUPER_ADMIN">{t("members.superAdmin")}</option></select></label>}<div className="member-edit-actions"><button className="primary" type="submit">{t("members.save")}</button><button className="ghost" type="button" onClick={() => setEditing(null)}>{t("common.cancel")}</button></div></AutoSaveForm>}</article>; })}</div>}
    </SectionCard>
  </section>;
}
