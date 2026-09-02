import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SUBSCRIPTION_PLANS, isForbiddenDisplayName, isStrongPassword, isValidDisplayName, isValidEmail, isValidPhone, normalizeDigits, normalizeDisplayName, normalizeEmail, normalizePhone, PASSWORD_MIN_LENGTH } from "@nivasafe/domain";
import { api, getCurrentLocale, saveSession, type ApiError, type Session } from "../../api/client";
import { Icon, PageHeader } from "../../components/UI";
import { AutoSaveStatus } from "../../forms/AutoSaveForm";
import { LanguageSwitcher, brandAltForLocale, brandLogoForLocale, translate, useI18n } from "../../i18n";

type RegistrationKind = "personal" | "organization";
type RegistrationDraft = {
  kind: RegistrationKind | null;
  displayName: string;
  email: string;
  activityArea: string;
  companyName: string;
  industry: string;
  employees: string;
  nationalId: string;
  phone: string;
  jobTitle: string;
  subscriptionPlan: string;
  password: string;
  confirmPassword: string;
};

const draftKey = "nivasafe-registration-draft";
const planTranslationKeys = {
  STARTER: { title: "registration.planStarter", description: "registration.planStarterDescription" },
  PROFESSIONAL: { title: "registration.planProfessional", description: "registration.planProfessionalDescription" },
  ENTERPRISE: { title: "registration.planEnterprise", description: "registration.planEnterpriseDescription" },
} as const;
const emptyDraft: RegistrationDraft = {
  kind: null,
  displayName: "",
  email: "",
  activityArea: "",
  companyName: "",
  industry: "",
  employees: "",
  nationalId: "",
  phone: "",
  jobTitle: "",
  subscriptionPlan: "STARTER",
  password: "",
  confirmPassword: "",
};

function registrationErrorMessage(reason: unknown): string {
  const error = reason as ApiError;
  const locale = getCurrentLocale();
  const messages: Record<string, string> = {
    INVALID_EMAIL: translate("registration.invalidEmail", locale),
    INVALID_PHONE: translate("registration.invalidPhone", locale),
    RESERVED_DISPLAY_NAME: translate("registration.invalidManager", locale),
    WEAK_PASSWORD: translate("auth.passwordRequirements", locale, { min: PASSWORD_MIN_LENGTH }),
    EMAIL_IN_USE: translate("registration.emailInUse", locale),
    PHONE_IN_USE: translate("registration.phoneInUse", locale),
    DUPLICATE_VALUE: translate("registration.duplicate", locale),
    VALIDATION_ERROR: translate("registration.validation", locale),
  };
  return messages[error.code ?? ""] ?? (error instanceof Error ? error.message : translate("registration.failed", locale));
}

function readDraft(): RegistrationDraft {
  try {
    const value = localStorage.getItem(draftKey);
    if (!value) return emptyDraft;
    const draft = { ...emptyDraft, ...(JSON.parse(value) as Partial<RegistrationDraft>) };
    return { ...draft, phone: typeof draft.phone === "string" ? normalizePhone(draft.phone) : "" };
  } catch {
    return emptyDraft;
  }
}

export function RegisterPage() {
  const { locale, direction, t } = useI18n();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<RegistrationDraft>(() => readDraft());
  const [step, setStep] = useState(() => (readDraft().kind ? 2 : 1));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    // Never persist credentials in a browser draft; all other registration fields remain recoverable.
    try { localStorage.setItem(draftKey, JSON.stringify({ ...draft, password: "", confirmPassword: "" })); setLastSaved(new Date()); } catch { setLastSaved(null); }
  }, [draft]);

  const progress = useMemo(() => `${Math.round((step / 4) * 100)}%`, [step]);
  const stepLabels = draft.kind === "organization" ? [t("registration.accountType"), t("registration.companyDetails"), t("registration.managerDetails"), t("registration.complete")] : [t("registration.accountType"), t("registration.personalDetails"), t("registration.review"), t("registration.complete")];
  const update = (key: keyof RegistrationDraft, value: string) => setDraft((current) => ({ ...current, [key]: value }));

  function chooseKind(kind: RegistrationKind) {
    setDraft((current) => ({ ...current, kind }));
    setError("");
  }

  function validateCompanyDetails() {
    if (!draft.companyName.trim()) return t("registration.companyRequired");
    if (!draft.industry.trim()) return t("registration.industryRequired");
    if (draft.employees.trim() && (!/^\d+$/.test(draft.employees.trim()) || Number(draft.employees) > 10_000_000)) return t("registration.employeeCountInvalid");
    return "";
  }

  function validateIdentityDetails() {
    if (!draft.displayName.trim()) return t("registration.nameRequired");
    if (!isValidDisplayName(draft.displayName) || isForbiddenDisplayName(draft.displayName)) return t("registration.invalidManager");
    if (!draft.email.trim()) return t("registration.emailRequired");
    if (!isValidEmail(draft.email)) return t("registration.invalidEmail");
    if (draft.kind === "organization" && !draft.phone.trim()) return t("registration.phoneRequired");
    if (draft.kind === "organization" && !isValidPhone(draft.phone)) return t("registration.invalidPhone");
    if (!draft.password) return t("registration.passwordRequired");
    if (!isStrongPassword(draft.password, { email: draft.email, displayName: draft.displayName })) return t("auth.passwordRequirements", { min: PASSWORD_MIN_LENGTH });
    if (!draft.confirmPassword) return t("registration.confirmRequired");
    if (draft.password !== draft.confirmPassword) return t("registration.passwordMismatch");
    return "";
  }

  function validateDetails() {
    return draft.kind === "organization" ? validateCompanyDetails() || validateIdentityDetails() : validateIdentityDetails();
  }

  function validateCurrentStep() {
    return step === 2 && draft.kind === "organization" ? validateCompanyDetails() : validateDetails();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateDetails();
    if (validation) {
      setError(validation);
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: normalizeEmail(draft.email),
          password: draft.password,
          displayName: normalizeDisplayName(draft.displayName),
          registrationKind: draft.kind,
          phone: draft.kind === "organization" && draft.phone.trim() ? normalizePhone(draft.phone) : null,
          jobTitle: draft.jobTitle.trim() || null,
          locale,
        }),
      });
      const loggedIn = await api<Session>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: draft.email.trim(), password: draft.password }),
      });
      saveSession(loggedIn.data);
      const organization = await api<{ id: string; nameFa: string; nameEn: string; subscriptionPlan?: string; subscriptionStatus?: string; subscriptionExpiresAt?: string | null }>("/organizations", {
        method: "POST",
        body: JSON.stringify({
          nameFa: draft.kind === "organization" ? draft.companyName.trim() : `فضای شخصی ${draft.displayName.trim()}`,
          nameEn: draft.kind === "organization" ? draft.companyName.trim() : `Personal workspace - ${draft.displayName.trim()}`,
          nationalId: draft.kind === "organization" ? draft.nationalId.trim() || null : null,
          industry: draft.kind === "organization" ? draft.industry.trim() : draft.activityArea.trim() || "Personal",
          employeeCount: draft.kind === "organization" && draft.employees.trim() ? Number(draft.employees) : null,
          subscriptionPlan: draft.subscriptionPlan,
           defaultLocale: locale,
        }),
      });
      const sessionWithOrg: Session = { ...loggedIn.data, organizations: [...loggedIn.data.organizations, { id: organization.data.id, nameFa: organization.data.nameFa, nameEn: organization.data.nameEn, role: "ORG_ADMIN", subscriptionPlan: organization.data.subscriptionPlan, subscriptionStatus: organization.data.subscriptionStatus, subscriptionExpiresAt: organization.data.subscriptionExpiresAt }] };
      saveSession(sessionWithOrg);
      localStorage.setItem("nivasafe-org", organization.data.id);
      try {
        await api("/projects", {
          method: "POST",
           body: JSON.stringify({ name: t("registration.defaultProject"), code: "DEFAULT", description: t("registration.defaultProjectDescription"), status: "ACTIVE" }),
        });
      } catch {
        // A default project is a convenience; registration remains successful if it already exists.
      }
      localStorage.removeItem(draftKey);
      navigate(organization.data.subscriptionStatus === "PENDING_PAYMENT" ? "/organizations" : "/choose-path", { replace: true });
    } catch (reason) {
      setError(registrationErrorMessage(reason));
    } finally {
      setLoading(false);
    }
  }

  return <main className="login simple register-page" dir={direction} lang={locale}>
    <section className="login-card register-card">
      <div className="auth-header-row"><div className="auth-brand-lockup"><img className="login-card-logo" src="/brand/nivasafe-icon.png" alt=""/><img className="auth-brand-wordmark" src={brandLogoForLocale(locale)} alt={brandAltForLocale(locale)}/></div><div className="auth-header-actions"><LanguageSwitcher className="auth-language-switch"/><Link className="text-button" to="/login">{t("auth.login")}</Link></div></div>
      <div className="eyebrow">{t("registration.secureStart")}</div>
      <h2>{step === 1 ? t("registration.title") : t("registration.createAccount")}</h2>
      <p className="muted">{step === 1 ? t("registration.chooseType") : t("registration.enterDetails")}</p>
      <div className="wizard-progress" aria-label={t("registration.step", { step })}><span style={{ width: progress }}/></div>
      <div className="wizard-steps">{stepLabels.map((label, index) => <span className={step >= index + 1 ? "active" : ""} key={label}>{label}</span>)}</div>
      <AutoSaveStatus lastSaved={lastSaved}/>
      {error && <div className="alert error"><Icon name="warning"/>{error}</div>}
      {step === 1 && <>
        <div className="choice-grid">
        <button className={`choice-card ${draft.kind === "organization" ? "selected" : ""}`} onClick={() => chooseKind("organization")} aria-pressed={draft.kind === "organization"} type="button"><span className="choice-card-top"><span className="choice-icon"><Icon name="projects"/></span><span className="choice-radio" aria-hidden="true">{draft.kind === "organization" ? "●" : "○"}</span></span><strong>{t("registration.organization")}</strong><small>{t("registration.organizationDescription")}</small></button>
        <button className={`choice-card ${draft.kind === "personal" ? "selected" : ""}`} onClick={() => chooseKind("personal")} aria-pressed={draft.kind === "personal"} type="button"><span className="choice-card-top"><span className="choice-icon"><Icon name="profile"/></span><span className="choice-radio" aria-hidden="true">{draft.kind === "personal" ? "●" : "○"}</span></span><strong>{t("registration.personal")}</strong><small>{t("registration.personalDescription")}</small></button>
        </div>
        <div className="wizard-actions choice-actions"><span/><button className="primary" type="button" disabled={!draft.kind} onClick={() => { if (!draft.kind) { setError(t("registration.chooseTypeError")); return; } setStep(2); setError(""); }}>{t("registration.continue")}</button></div>
      </>}
      {step === 2 && <form className="register-form" onSubmit={(event) => { event.preventDefault(); const validation = validateCurrentStep(); if (validation) setError(validation); else setStep(3); }}>
        <div className="form-grid">
          {draft.kind === "organization" ? <>
            <label className="full">{t("registration.companyName")}<input value={draft.companyName} onChange={(event) => update("companyName", event.target.value)} autoComplete="organization" maxLength={191} required/></label>
            <label>{t("registration.industry")}<input value={draft.industry} onChange={(event) => update("industry", event.target.value)} placeholder={t("registration.industryPlaceholder")} maxLength={120} required/></label>
            <label>{t("registration.employees")}<input value={draft.employees} onChange={(event) => update("employees", normalizeDigits(event.target.value).replace(/\D/g, ""))} inputMode="numeric" placeholder={t("registration.optional")}/></label>
            <label>{t("registration.nationalId")}<input value={draft.nationalId} onChange={(event) => update("nationalId", event.target.value)} inputMode="numeric" maxLength={50} placeholder={t("registration.optional")}/></label>
            <label className="full">{t("registration.subscription")}<select value={draft.subscriptionPlan} onChange={(event) => update("subscriptionPlan", event.target.value)}>{SUBSCRIPTION_PLANS.map((plan) => <option key={plan.id} value={plan.id}>{t(planTranslationKeys[plan.id].title)} — {t(planTranslationKeys[plan.id].description)}</option>)}</select><small className="field-hint">{t("registration.subscriptionNote")}</small></label>
          </> : <>
            <label>{t("registration.fullName")}<input value={draft.displayName} onChange={(event) => update("displayName", event.target.value)} onBlur={() => update("displayName", normalizeDisplayName(draft.displayName))} autoComplete="name" maxLength={80} aria-invalid={draft.displayName.trim().length > 0 && !isValidDisplayName(draft.displayName)} required/>{draft.displayName.trim().length > 0 && !isValidDisplayName(draft.displayName) && <small className="field-error">{t("registration.invalidName")}</small>}</label>
            <label>{t("auth.email")}<input value={draft.email} onChange={(event) => update("email", event.target.value)} onBlur={() => update("email", normalizeEmail(draft.email))} type="email" inputMode="email" autoComplete="email" maxLength={254} aria-invalid={draft.email.trim().length > 0 && !isValidEmail(draft.email)} required/>{draft.email.trim().length > 0 && !isValidEmail(draft.email) && <small className="field-error">{t("registration.invalidEmail")}</small>}</label>
            <label className="full">{t("registration.activityArea")}<input value={draft.activityArea} onChange={(event) => update("activityArea", event.target.value)} placeholder={t("registration.activityPlaceholder")} maxLength={120}/></label>
            <label>{t("auth.password")}<input value={draft.password} onChange={(event) => update("password", event.target.value)} type="password" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} maxLength={128} aria-describedby="registration-password-hint" required/><small id="registration-password-hint" className="field-hint">{t("registration.passwordHint", { min: PASSWORD_MIN_LENGTH })}</small></label>
            <label>{t("registration.confirmPassword")}<input value={draft.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)} type="password" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} maxLength={128} required/></label>
          </>}
        </div>
        <div className="wizard-actions"><button className="ghost" type="button" onClick={() => setStep(1)}>{t("registration.back")}</button><button className="primary" type="submit">{t("registration.continue")}</button></div>
      </form>}
      {step === 3 && draft.kind === "organization" && <form className="register-form" onSubmit={(event) => { event.preventDefault(); const validation = validateIdentityDetails(); if (validation) setError(validation); else setStep(4); }}>
        <div className="form-grid">
          <label>{t("registration.managerDetails")}<input value={draft.displayName} onChange={(event) => update("displayName", event.target.value)} onBlur={() => update("displayName", normalizeDisplayName(draft.displayName))} autoComplete="name" maxLength={80} aria-invalid={draft.displayName.trim().length > 0 && !isValidDisplayName(draft.displayName)} required/>{draft.displayName.trim().length > 0 && !isValidDisplayName(draft.displayName) && <small className="field-error">{t("registration.invalidManager")}</small>}</label>
          <label>{t("auth.email")}<input value={draft.email} onChange={(event) => update("email", event.target.value)} onBlur={() => update("email", normalizeEmail(draft.email))} type="email" inputMode="email" autoComplete="email" maxLength={254} aria-invalid={draft.email.trim().length > 0 && !isValidEmail(draft.email)} required/>{draft.email.trim().length > 0 && !isValidEmail(draft.email) && <small className="field-error">{t("registration.invalidEmail")}</small>}</label>
          <label>{t("registration.phone")}<input value={draft.phone} onChange={(event) => update("phone", normalizePhone(event.target.value))} onBlur={() => update("phone", draft.phone.trim() ? normalizePhone(draft.phone) : "")} inputMode="numeric" autoComplete="tel" dir="ltr" maxLength={11} pattern="09[0-9]{9}" placeholder="09121234567" aria-invalid={draft.phone.trim().length > 0 && !isValidPhone(draft.phone)} required/>{draft.phone.trim().length > 0 && !isValidPhone(draft.phone) && <small className="field-error">{t("registration.invalidPhone")}</small>}</label>
          <label><span className="field-label-line">{t("registration.jobTitle")} <span className="muted">({t("registration.optional")})</span></span><input value={draft.jobTitle} onChange={(event) => update("jobTitle", event.target.value)} placeholder={t("registration.jobTitlePlaceholder")} maxLength={120}/></label>
          <label>{t("auth.password")}<input value={draft.password} onChange={(event) => update("password", event.target.value)} type="password" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} maxLength={128} aria-describedby="registration-password-hint" required/><small id="registration-password-hint" className="field-hint">{t("registration.passwordHint", { min: PASSWORD_MIN_LENGTH })}</small></label>
          <label>{t("registration.confirmPassword")}<input value={draft.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)} type="password" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} maxLength={128} required/></label>
        </div>
        <div className="wizard-actions"><button className="ghost" type="button" onClick={() => setStep(2)}>{t("registration.back")}</button><button className="primary" type="submit">{t("registration.checkDetails")}</button></div>
      </form>}
      {step === 3 && draft.kind === "personal" && <div className="register-review">
        <div className="review-card"><span className="choice-icon"><Icon name="check"/></span><div><strong>{t("registration.ready")}</strong><p>{t("registration.personalAccount")}</p><small>{draft.email}</small></div></div>
        <div className="review-note"><Icon name="shield" size={18}/><span>{t("registration.reviewBeforeCreate")}</span></div>
        <div className="wizard-actions"><button className="ghost" type="button" onClick={() => setStep(2)}>{t("registration.editDetails")}</button><button className="primary" type="button" onClick={() => setStep(4)}>{t("registration.confirmContinue")}</button></div>
      </div>}
      {step === 4 && <form className="register-review" onSubmit={submit}>
        <div className="review-card"><span className="choice-icon"><Icon name="check"/></span><div><strong>{t("registration.finalConfirmation")}</strong><p>{draft.kind === "organization" ? t("registration.companyAndManager", { company: draft.companyName }) : t("registration.personalAccount")}</p><small>{draft.email}</small></div></div>
        <div className="review-note"><Icon name="shield" size={18}/><span>{draft.kind === "organization" ? t("registration.companyConfirmation") : t("registration.personalWorkspace")}</span></div>
        <div className="wizard-actions"><button className="ghost" type="button" onClick={() => setStep(3)}>{t("registration.back")}</button><button className="primary" disabled={loading}>{loading ? t("registration.creatingAccount") : t("registration.createSecureAccount")}</button></div>
      </form>}
      <small className="login-hint">{t("registration.haveAccount")} <Link to="/login">{t("registration.signIn")}</Link><br/>{t("registration.privacyNote")}</small>
    </section>
  </main>;
}

export function PathSelectionPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<"fmea" | "rula">(() => localStorage.getItem("nivasafe-path-selected") === "/rula" ? "rula" : "fmea");
  function continueToAssessment() {
    const path = selected === "fmea" ? "/fmea" : "/rula";
    localStorage.setItem("nivasafe-path-selected", path);
    navigate(path);
  }
  function skipToDashboard() {
    localStorage.setItem("nivasafe-path-selected", "/");
    navigate("/");
  }
  return <section className="page-shell path-flow">
    <PageHeader eyebrow={t("path.eyebrow")} title={t("path.title")} description={t("path.description")}/>
    <div className="path-stepper" aria-label={t("path.stepsLabel")}><div className="path-step done"><b>✓</b><span>{t("path.basicInfo")}</span></div><i/><div className="path-step current"><b>۲</b><span>{t("path.assessmentType")}</span></div><i/><div className="path-step"><b>۳</b><span>{t("path.assessmentInfo")}</span></div><i/><div className="path-step"><b>۴</b><span>{t("path.reviewConfirm")}</span></div></div>
    <div className="path-notice" role="status"><Icon name="shield" size={17}/><span>{t("path.notice")}</span></div>
    <div className="path-title"><div><span className="eyebrow">{t("path.stepTwoOfFour")}</span><h2>{t("path.selectType")}</h2><p>{t("path.selectDescription")}</p></div><span className="path-required">{t("path.required")}</span></div>
    <div className="path-choice-grid">
      <button type="button" className={`path-choice-card fmea ${selected === "fmea" ? "selected" : ""}`} aria-pressed={selected === "fmea"} onClick={() => setSelected("fmea")}><div className="path-choice-head"><span className="path-choice-icon"><Icon name="fmea" size={25}/></span><span className="path-radio" aria-hidden="true">{selected === "fmea" ? "●" : "○"}</span></div><strong>{t("path.fmeaTitle")} <em>FMEA</em></strong><p>{t("path.fmeaDescription")}</p><ul><li>{t("path.fmeaSuitable")}</li><li>{t("path.fmeaRpn")}</li></ul><span className="path-choice-label">{t("path.selectFmea")}</span></button>
      <button type="button" className={`path-choice-card rula ${selected === "rula" ? "selected" : ""}`} aria-pressed={selected === "rula"} onClick={() => setSelected("rula")}><div className="path-choice-head"><span className="path-choice-icon"><Icon name="rula" size={25}/></span><span className="path-radio" aria-hidden="true">{selected === "rula" ? "●" : "○"}</span></div><strong>{t("path.rulaTitle")} <em>RULA</em></strong><p>{t("path.rulaDescription")}</p><ul><li>{t("path.rulaSuitable")}</li><li>{t("path.rulaScore")}</li></ul><span className="path-choice-label">{t("path.selectRula")}</span></button>
    </div>
    <div className="path-actions"><button type="button" className="ghost" onClick={skipToDashboard}>{t("path.dashboard")}</button><button type="button" className="primary" onClick={continueToAssessment}><Icon name="arrow"/> {t("path.continue")}</button></div>
  </section>;
}
