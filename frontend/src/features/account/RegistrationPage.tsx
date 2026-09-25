import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SUBSCRIPTION_PLANS, USERNAME_MAX_LENGTH, detectContactInput, isForbiddenDisplayName, isStrongPassword, isValidContactInput, isValidDisplayName, isValidUsername, normalizeDigits, normalizeDisplayName, normalizeEmail, normalizePhone, normalizeUsername, PASSWORD_MIN_LENGTH, type ContactInputKind } from "@nivasafe/domain";
import { api, ASSESSMENT_PATH_KEY, getCurrentLocale, getSession, type ApiError } from "../../api/client";
import { Icon, PageHeader, StyledSelect } from "../../components/UI";
import { AutoSaveStatus, clearAutoSaveDraft } from "../../forms/AutoSaveForm";
import { assessmentDraftKey, clearAssessmentWizardStep } from "../../forms/autoSave";
import { LanguageSwitcher, brandAltForLocale, brandLogoForLocale, translate, useI18n } from "../../i18n";

type RegistrationKind = "personal" | "organization";
type RegistrationDraft = {
  kind: RegistrationKind | null;
  firstName: string;
  lastName: string;
  displayName: string;
  username: string;
  email: string;
  activityArea: string;
  companyName: string;
  industry: string;
  employees: string;
  phone: string;
  jobTitle: string;
  subscriptionPlan: string;
  password: string;
  confirmPassword: string;
};

const draftKey = "nivasafe-registration-draft";
type AssessmentPath = "fmea" | "rula";

function readAssessmentPath(): AssessmentPath {
  const stored = sessionStorage.getItem(ASSESSMENT_PATH_KEY) ?? localStorage.getItem(ASSESSMENT_PATH_KEY);
  return stored === "/rula" ? "rula" : "fmea";
}

function rememberAssessmentPath(type: AssessmentPath): string {
  const path = type === "fmea" ? "/fmea" : "/rula";
  sessionStorage.setItem(ASSESSMENT_PATH_KEY, path);
  localStorage.setItem(ASSESSMENT_PATH_KEY, path);
  return path;
}
const planTranslationKeys = {
  STARTER: { title: "registration.planStarter", description: "registration.planStarterDescription" },
  PROFESSIONAL: { title: "registration.planProfessional", description: "registration.planProfessionalDescription" },
  ENTERPRISE: { title: "registration.planEnterprise", description: "registration.planEnterpriseDescription" },
} as const;
const emptyDraft: RegistrationDraft = {
  kind: null,
  firstName: "",
  lastName: "",
  displayName: "",
  username: "",
  email: "",
  activityArea: "",
  companyName: "",
  industry: "",
  employees: "",
  phone: "",
  jobTitle: "",
  subscriptionPlan: "STARTER",
  password: "",
  confirmPassword: "",
};

type RegistrationField = "firstName" | "lastName" | "username" | "email" | "phone" | "password" | "confirmPassword" | "companyName" | "industry" | "employees";
type RegistrationFieldErrors = Partial<Record<RegistrationField, string>>;

function registrationErrorMessage(reason: unknown): string {
  const error = reason as ApiError;
  const locale = getCurrentLocale();
  const messages: Record<string, string> = {
    INVALID_EMAIL: translate("registration.invalidEmail", locale),
    INVALID_PHONE: translate("registration.invalidPhone", locale),
    RESERVED_DISPLAY_NAME: translate("registration.invalidName", locale),
    WEAK_PASSWORD: translate("auth.passwordRequirements", locale, { min: PASSWORD_MIN_LENGTH }),
    EMAIL_IN_USE: translate("registration.emailInUse", locale),
    PHONE_IN_USE: translate("registration.phoneInUse", locale),
    INVALID_USERNAME: translate("registration.invalidUsername", locale),
    USERNAME_IN_USE: translate("registration.usernameInUse", locale),
    INVALID_NAME: translate("registration.invalidName", locale),
    DUPLICATE_VALUE: translate("registration.duplicate", locale),
    VALIDATION_ERROR: translate("registration.validation", locale),
  };
  return messages[error.code ?? ""] ?? translate("registration.failed", locale);
}

function registrationErrorField(reason: unknown): RegistrationField | null {
  const error = reason as ApiError;
  const code = error.code;
  if (code === "INVALID_EMAIL" || code === "EMAIL_IN_USE") return "email";
  if (code === "INVALID_PHONE" || code === "PHONE_IN_USE") return "phone";
  if (code === "INVALID_USERNAME" || code === "USERNAME_IN_USE" || code === "USERNAME_REQUIRED") return "username";
  if (code === "INVALID_NAME" || code === "RESERVED_DISPLAY_NAME") return "firstName";
  if (code === "WEAK_PASSWORD") return "password";
  return null;
}

function isRegistrationKind(value: unknown): value is RegistrationKind {
  return value === "personal" || value === "organization";
}

function splitDisplayName(value: string): { firstName: string; lastName: string } {
  const normalized = normalizeDisplayName(value);
  const parts = normalized.split(" ").filter(Boolean);
  if (parts.length < 2) return { firstName: normalized, lastName: "" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1]! };
}

function composeDisplayName(firstName: string, lastName: string): string {
  return normalizeDisplayName(`${firstName} ${lastName}`);
}

type ContactField = "email" | "phone";
type ContactFeedback = { kind: ContactInputKind; valid: boolean; message: string };

function contactFeedback(value: string, expected: ContactField, t: (key: string) => string): ContactFeedback | null {
  const kind = detectContactInput(value);
  if (kind === "empty") return null;
  if (kind === expected) {
    const valid = isValidContactInput(value, expected);
    return {
      kind,
      valid,
      message: valid ? t(expected === "email" ? "registration.emailDetected" : "registration.phoneDetected") : t(expected === "email" ? "registration.invalidEmail" : "registration.invalidPhone"),
    };
  }
  if (kind === "phone" && expected === "email") return { kind, valid: false, message: t("registration.phoneInEmail") };
  if (kind === "email" && expected === "phone") return { kind, valid: false, message: t("registration.emailInPhone") };
  return { kind, valid: false, message: t(expected === "email" ? "registration.invalidEmail" : "registration.invalidPhone") };
}

function readDraft(): RegistrationDraft {
  try {
    const value = localStorage.getItem(draftKey);
    if (!value) return emptyDraft;
    const draft = { ...emptyDraft, ...(JSON.parse(value) as Partial<RegistrationDraft>) };
    const legacyName = !draft.firstName && !draft.lastName ? splitDisplayName(typeof draft.displayName === "string" ? draft.displayName : "") : { firstName: draft.firstName ?? "", lastName: draft.lastName ?? "" };
    return { ...draft, ...legacyName, displayName: composeDisplayName(legacyName.firstName, legacyName.lastName), kind: isRegistrationKind(draft.kind) ? draft.kind : null, phone: typeof draft.phone === "string" ? normalizePhone(draft.phone) : "" };
  } catch {
    return emptyDraft;
  }
}

export function RegisterPage() {
  const { locale, direction, t } = useI18n();
  const [draft, setDraft] = useState<RegistrationDraft>(() => readDraft());
  // Keep the account-type selector visible on every fresh registration entry.
  // Saved fields remain available, but a stale draft must not skip the selector.
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<RegistrationFieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registrationPending, setRegistrationPending] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const emailFeedback = contactFeedback(draft.email, "email", t);
  const phoneFeedback = contactFeedback(draft.phone, "phone", t);

  useEffect(() => {
    // Never persist credentials in a browser draft; all other registration fields remain recoverable.
    if (registrationPending) return;
    try { localStorage.setItem(draftKey, JSON.stringify({ ...draft, password: "", confirmPassword: "" })); setLastSaved(new Date()); } catch { setLastSaved(null); }
  }, [draft, registrationPending]);

  const progress = useMemo(() => `${Math.round((step / 4) * 100)}%`, [step]);
  const stepLabels = draft.kind === "organization" ? [t("registration.accountType"), t("registration.managerDetails"), t("registration.companyDetails"), t("registration.review")] : [t("registration.accountType"), t("registration.personalDetails"), t("registration.review"), t("registration.complete")];
  const update = (key: keyof RegistrationDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  };

  function updateNamePart(key: "firstName" | "lastName", value: string) {
    setDraft((current) => {
      const next = { ...current, [key]: value };
      return { ...next, displayName: composeDisplayName(next.firstName, next.lastName) };
    });
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  }

  function chooseKind(kind: RegistrationKind) {
    setDraft((current) => ({ ...current, kind }));
    setError("");
    setFieldErrors({});
  }

  function validateNameFields(): RegistrationFieldErrors {
    const issues: RegistrationFieldErrors = {};
    if (!draft.firstName.trim()) issues.firstName = t("registration.firstNameRequired");
    else if (!isValidDisplayName(draft.firstName) || isForbiddenDisplayName(draft.firstName)) issues.firstName = t("registration.invalidName");
    if (!draft.lastName.trim()) issues.lastName = t("registration.lastNameRequired");
    else if (!isValidDisplayName(draft.lastName) || isForbiddenDisplayName(draft.lastName)) issues.lastName = t("registration.invalidName");
    const fullName = composeDisplayName(draft.firstName, draft.lastName);
    if (draft.firstName.trim() && draft.lastName.trim() && !isValidDisplayName(fullName)) issues.firstName ??= t("registration.invalidName");
    return issues;
  }

  function validateContactDetails(requirePhone: boolean): RegistrationFieldErrors {
    const issues: RegistrationFieldErrors = { ...validateNameFields() };
    if (draft.username.trim() && !isValidUsername(draft.username)) issues.username = t("registration.invalidUsername");
    if (!draft.email.trim()) issues.email = t("registration.emailRequired");
    else if (!isValidContactInput(draft.email, "email")) issues.email = t("registration.invalidEmail");
    if (requirePhone && !draft.phone.trim()) issues.phone = t("registration.phoneRequired");
    if (draft.phone.trim() && !isValidContactInput(draft.phone, "phone")) issues.phone = t("registration.invalidPhone");
    return issues;
  }

  function validatePasswordDetails(): RegistrationFieldErrors {
    const issues: RegistrationFieldErrors = {};
    const displayName = composeDisplayName(draft.firstName, draft.lastName);
    if (!draft.password) issues.password = t("registration.passwordRequired");
    else if (!isStrongPassword(draft.password, { email: draft.email, displayName })) issues.password = t("auth.passwordRequirements", { min: PASSWORD_MIN_LENGTH });
    if (!draft.confirmPassword) issues.confirmPassword = t("registration.confirmRequired");
    else if (draft.password !== draft.confirmPassword) issues.confirmPassword = t("registration.passwordMismatch");
    return issues;
  }

  function validateCompanyDetails(): RegistrationFieldErrors {
    const issues: RegistrationFieldErrors = {};
    if (!draft.companyName.trim()) issues.companyName = t("registration.companyRequired");
    if (!draft.industry.trim()) issues.industry = t("registration.industryRequired");
    if (draft.employees.trim() && (!/^\d+$/.test(draft.employees.trim()) || Number(draft.employees) > 10_000_000)) issues.employees = t("registration.employeeCountInvalid");
    return issues;
  }

  function validatePersonalDetails(): RegistrationFieldErrors {
    return { ...validateContactDetails(false), ...validatePasswordDetails() };
  }

  function validateManagerDetails(): RegistrationFieldErrors {
    return validateContactDetails(true);
  }

  function validateOrganizationAccountDetails(): RegistrationFieldErrors {
    return { ...validateCompanyDetails(), ...validatePasswordDetails() };
  }

  function validateAllDetails(): RegistrationFieldErrors {
    if (draft.kind === "organization") return { ...validateManagerDetails(), ...validateOrganizationAccountDetails() };
    return validatePersonalDetails();
  }

  function validateField(field: RegistrationField): string {
    if (field === "firstName" || field === "lastName") return validateNameFields()[field] ?? "";
    if (field === "username") return draft.username.trim() && !isValidUsername(draft.username) ? t("registration.invalidUsername") : "";
    if (field === "email") return validateContactDetails(draft.kind === "organization").email ?? "";
    if (field === "phone") return validateContactDetails(draft.kind === "organization").phone ?? "";
    if (field === "password" || field === "confirmPassword") return validatePasswordDetails()[field] ?? "";
    if (field === "companyName" || field === "industry" || field === "employees") return validateCompanyDetails()[field] ?? "";
    return "";
  }

  function validateCurrentStep(): RegistrationFieldErrors {
    if (step === 2) return draft.kind === "organization" ? validateManagerDetails() : validatePersonalDetails();
    if (step === 3 && draft.kind === "organization") return validateOrganizationAccountDetails();
    return {};
  }

  function showValidationErrors(issues: RegistrationFieldErrors): boolean {
    const entries = Object.entries(issues).filter(([, message]) => Boolean(message));
    if (!entries.length) {
      setFieldErrors({});
      setError("");
      return true;
    }
    const [firstField] = entries[0] as [RegistrationField, string];
    setFieldErrors(issues);
    setError(t("registration.validation"));
    window.setTimeout(() => {
      const target = document.getElementById(`registration-${firstField}-error`)?.closest("label")?.querySelector("input,select");
      if (target instanceof HTMLElement) target.focus();
    }, 0);
    return false;
  }

  function onFieldBlur(field: RegistrationField) {
    const message = validateField(field);
    setFieldErrors((current) => ({ ...current, [field]: message || undefined }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    if (!showValidationErrors(validateAllDetails())) return;
    setLoading(true);
    setError("");
    try {
      await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: normalizeEmail(draft.email),
          password: draft.password,
          displayName: normalizeDisplayName(draft.displayName),
          username: draft.username.trim() ? normalizeUsername(draft.username) : null,
          firstName: normalizeDisplayName(draft.firstName),
          lastName: normalizeDisplayName(draft.lastName),
          registrationKind: draft.kind,
          phone: draft.phone.trim() ? normalizePhone(draft.phone) : null,
          jobTitle: draft.jobTitle.trim() || null,
          companyName: draft.kind === "organization" ? draft.companyName.trim() : null,
          activityArea: draft.kind === "personal" ? draft.activityArea.trim() || null : null,
          industry: draft.kind === "organization" ? draft.industry.trim() : null,
          employeeCount: draft.kind === "organization" && draft.employees.trim() ? Number(draft.employees) : null,
          subscriptionPlan: draft.subscriptionPlan,
          locale,
        }),
      });
      localStorage.removeItem(draftKey);
      setDraft((current) => ({ ...current, password: "", confirmPassword: "" }));
      setRegistrationPending(true);
    } catch (reason) {
      const message = registrationErrorMessage(reason);
      const field = registrationErrorField(reason);
      if (field) {
        setFieldErrors((current) => ({ ...current, [field]: message }));
        setError(t("registration.validation"));
      } else setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (registrationPending) return <main className="login simple register-page" dir={direction} lang={locale}>
    <section className="login-card register-card registration-success-card" role="status" aria-live="polite">
      <div className="registration-success-icon"><Icon name="check" size={30}/></div>
      <div className="eyebrow">{t("registration.secureStart")}</div>
      <h2>{t("registration.pendingTitle")}</h2>
      <p className="muted">{t("registration.pendingMessage")}</p>
      <Link className="login-link" to="/login">{t("registration.signIn")}</Link>
    </section>
  </main>;

  const errorFor = (field: RegistrationField) => fieldErrors[field] ? <small id={`registration-${field}-error`} className="field-error">{fieldErrors[field]}</small> : null;
  const renderEmailField = (label: string, id: string) => <label htmlFor={id}><span className="field-label-line">{label}</span><input id={id} value={draft.email} onChange={(event) => update("email", event.target.value)} onBlur={() => { update("email", normalizeEmail(draft.email)); onFieldBlur("email"); }} type="text" inputMode="email" autoComplete="email" dir="ltr" maxLength={254} data-contact-kind={emailFeedback?.kind ?? "empty"} data-validation-state={emailFeedback?.valid && !fieldErrors.email ? "success" : undefined} aria-invalid={Boolean(fieldErrors.email || (emailFeedback && !emailFeedback.valid))} aria-describedby={fieldErrors.email ? `registration-email-error` : emailFeedback ? `registration-email-hint-${id}` : undefined} required/>{errorFor("email")}{!fieldErrors.email && emailFeedback && <small id={`registration-email-hint-${id}`} className={emailFeedback.valid ? "field-hint contact-detection valid" : "field-error contact-detection"}>{emailFeedback.message}</small>}</label>;
  const renderUsernameField = (id: string) => <label htmlFor={id}><span className="field-label-line">{t("registration.username")} <span className="muted">({t("registration.optional")})</span></span><input id={id} value={draft.username} onChange={(event) => update("username", event.target.value)} onBlur={() => { update("username", normalizeUsername(draft.username)); onFieldBlur("username"); }} type="text" inputMode="text" autoComplete="username" dir="ltr" maxLength={USERNAME_MAX_LENGTH} placeholder={t("registration.usernamePlaceholder")} aria-invalid={Boolean(fieldErrors.username)} aria-describedby={fieldErrors.username ? `registration-username-error` : "registration-username-hint"}/>{errorFor("username")} {!fieldErrors.username && <small id="registration-username-hint" className="field-hint">{t("registration.usernameHint")}</small>}</label>;
  const renderPhoneField = (label: string, id: string, required = false) => <label htmlFor={id}><span className="field-label-line">{label}{!required && <span className="muted">({t("registration.optional")})</span>}</span><input id={id} value={draft.phone} onChange={(event) => update("phone", normalizePhone(event.target.value))} onBlur={() => { update("phone", draft.phone.trim() ? normalizePhone(draft.phone) : ""); onFieldBlur("phone"); }} inputMode="numeric" autoComplete="tel" dir="ltr" maxLength={11} pattern="09[0-9]{9}" placeholder={t("registration.phonePlaceholder")} data-contact-kind={phoneFeedback?.kind ?? "empty"} data-validation-state={phoneFeedback?.valid && !fieldErrors.phone ? "success" : undefined} aria-invalid={Boolean(fieldErrors.phone || (phoneFeedback && !phoneFeedback.valid))} aria-describedby={fieldErrors.phone ? "registration-phone-error" : undefined} required={required}/>{errorFor("phone")}{!fieldErrors.phone && phoneFeedback && <small className={phoneFeedback.valid ? "field-hint contact-detection valid" : "field-error contact-detection"}>{phoneFeedback.message}</small>}</label>;
  const renderNameFields = () => <>
    <label htmlFor="registration-first-name"><span className="field-label-line">{t("registration.firstName")}</span><input id="registration-first-name" value={draft.firstName} onChange={(event) => updateNamePart("firstName", event.target.value)} onBlur={() => { updateNamePart("firstName", normalizeDisplayName(draft.firstName)); onFieldBlur("firstName"); }} autoComplete="given-name" maxLength={40} aria-invalid={Boolean(fieldErrors.firstName)} aria-describedby={fieldErrors.firstName ? "registration-firstName-error" : undefined} required/>{errorFor("firstName")}</label>
    <label htmlFor="registration-last-name"><span className="field-label-line">{t("registration.lastName")}</span><input id="registration-last-name" value={draft.lastName} onChange={(event) => updateNamePart("lastName", event.target.value)} onBlur={() => { updateNamePart("lastName", normalizeDisplayName(draft.lastName)); onFieldBlur("lastName"); }} autoComplete="family-name" maxLength={40} aria-invalid={Boolean(fieldErrors.lastName)} aria-describedby={fieldErrors.lastName ? "registration-lastName-error" : undefined} required/>{errorFor("lastName")}</label>
  </>;
  const renderPasswordFields = () => <>
    <label htmlFor="registration-password"><span className="field-label-line">{t("auth.password")}</span><div className="password-field"><input id="registration-password" value={draft.password} onChange={(event) => update("password", event.target.value)} onBlur={() => onFieldBlur("password")} type={showPassword ? "text" : "password"} dir="ltr" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} maxLength={128} aria-describedby={fieldErrors.password ? "registration-password-error" : "registration-password-hint"} aria-invalid={Boolean(fieldErrors.password)} required/><button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")} title={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}><Icon name={showPassword ? "eyeOff" : "eye"} size={19}/></button></div>{errorFor("password")}{!fieldErrors.password && <small id="registration-password-hint" className="field-hint">{t("registration.passwordHint", { min: PASSWORD_MIN_LENGTH })}</small>}</label>
    <label htmlFor="registration-confirm-password"><span className="field-label-line">{t("registration.confirmPassword")}</span><div className="password-field"><input id="registration-confirm-password" value={draft.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)} onBlur={() => onFieldBlur("confirmPassword")} type={showConfirmPassword ? "text" : "password"} dir="ltr" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} maxLength={128} aria-describedby={fieldErrors.confirmPassword ? "registration-confirmPassword-error" : undefined} aria-invalid={Boolean(fieldErrors.confirmPassword)} required/><button type="button" className="password-toggle" onClick={() => setShowConfirmPassword((value) => !value)} aria-label={showConfirmPassword ? t("auth.hidePassword") : t("auth.showPassword")} title={showConfirmPassword ? t("auth.hidePassword") : t("auth.showPassword")}><Icon name={showConfirmPassword ? "eyeOff" : "eye"} size={19}/></button></div>{errorFor("confirmPassword")}</label>
  </>;

  return <main className="login simple register-page" dir={direction} lang={locale}>
    <section className="login-card register-card">
      <div className="auth-header-row"><div className="auth-brand-lockup"><img className="login-card-logo" src="/brand/nivasafe-icon.png" alt=""/><img className="auth-brand-wordmark" src={brandLogoForLocale(locale)} alt={brandAltForLocale(locale)}/></div><div className="auth-header-actions"><LanguageSwitcher className="auth-language-switch"/><Link className="text-button" to="/login">{t("auth.login")}</Link></div></div>
      <div className="eyebrow">{t("registration.secureStart")}</div>
      {step === 1 && <h2>{t("registration.title")}</h2>}
      {step === 1 && <p className="muted">{t("registration.chooseType")}</p>}
      <div className="wizard-progress" aria-label={t("registration.step", { step })}><span style={{ width: progress }}/></div>
      <div className="wizard-steps">{stepLabels.map((label, index) => <span className={step >= index + 1 ? "active" : ""} key={label}>{label}</span>)}</div>
      {step > 1 && <button type="button" className="text-button registration-type-change" onClick={() => { setStep(1); setError(""); }}>{t("registration.changeType")}</button>}
      <AutoSaveStatus lastSaved={lastSaved}/>
      {error && <div className="alert error"><Icon name="warning"/>{error}</div>}
      {step === 1 && <>
        <div className="choice-grid" role="radiogroup" aria-label={t("registration.accountType")}>
        <button className={`choice-card ${draft.kind === "organization" ? "selected" : ""}`} onClick={() => chooseKind("organization")} role="radio" aria-checked={draft.kind === "organization"} type="button"><span className="choice-card-top"><span className="choice-icon"><Icon name="projects"/></span><span className="choice-radio" aria-hidden="true">{draft.kind === "organization" ? "●" : "○"}</span></span><strong>{t("registration.organization")}</strong><small>{t("registration.organizationDescription")}</small></button>
        <button className={`choice-card ${draft.kind === "personal" ? "selected" : ""}`} onClick={() => chooseKind("personal")} role="radio" aria-checked={draft.kind === "personal"} type="button"><span className="choice-card-top"><span className="choice-icon"><Icon name="profile"/></span><span className="choice-radio" aria-hidden="true">{draft.kind === "personal" ? "●" : "○"}</span></span><strong>{t("registration.personal")}</strong><small>{t("registration.personalDescription")}</small></button>
        </div>
        <div className="wizard-actions choice-actions"><span/><button className="primary" type="button" disabled={!draft.kind} onClick={() => { if (!draft.kind) { setError(t("registration.chooseTypeError")); return; } setStep(2); setError(""); }}>{t("registration.continue")}</button></div>
      </>}
      {step === 2 && <form className="register-form" noValidate onSubmit={(event) => { event.preventDefault(); if (showValidationErrors(validateCurrentStep())) setStep(3); }}>
        <div className="form-grid">
          {draft.kind === "organization" ? <>
             {renderNameFields()}
            {renderUsernameField("registration-manager-username")}
            {renderEmailField(t("registration.managerEmail"), "registration-manager-email")}
            {renderPhoneField(t("registration.phone"), "registration-manager-phone", true)}
            <label htmlFor="registration-job-title"><span className="field-label-line">{t("registration.jobTitle")} <span className="muted">({t("registration.optional")})</span></span><input id="registration-job-title" value={draft.jobTitle} onChange={(event) => update("jobTitle", event.target.value)} placeholder={t("registration.jobTitlePlaceholder")} maxLength={120}/></label>
          </> : <>
             {renderNameFields()}
            {renderUsernameField("registration-personal-username")}
            {renderEmailField(t("auth.email"), "registration-personal-email")}
            {renderPhoneField(t("registration.phone"), "registration-personal-phone")}
            <label className="full" htmlFor="registration-activity-area"><span className="field-label-line">{t("registration.activityArea")} <span className="muted">({t("registration.optional")})</span></span><input id="registration-activity-area" value={draft.activityArea} onChange={(event) => update("activityArea", event.target.value)} placeholder={t("registration.activityPlaceholder")} maxLength={120}/></label>
            {renderPasswordFields()}
          </>}
        </div>
        <div className="wizard-actions"><button className="ghost" type="button" onClick={() => { setStep(1); setError(""); }}>{t("registration.back")}</button><button className="primary" type="submit" disabled={loading}>{t("registration.continue")}</button></div>
      </form>}
      {step === 3 && draft.kind === "organization" && <form className="register-form" noValidate onSubmit={(event) => { event.preventDefault(); if (showValidationErrors(validateCurrentStep())) setStep(4); }}>
        <div className="form-grid">
          <label className="full" htmlFor="registration-company-name"><span className="field-label-line">{t("registration.companyName")}</span><input id="registration-company-name" value={draft.companyName} onChange={(event) => update("companyName", event.target.value)} onBlur={() => onFieldBlur("companyName")} autoComplete="organization" maxLength={191} aria-invalid={Boolean(fieldErrors.companyName)} required/>{errorFor("companyName")}</label>
          <label htmlFor="registration-industry"><span className="field-label-line">{t("registration.industry")}</span><input id="registration-industry" value={draft.industry} onChange={(event) => update("industry", event.target.value)} onBlur={() => onFieldBlur("industry")} placeholder={t("registration.industryPlaceholder")} maxLength={120} aria-invalid={Boolean(fieldErrors.industry)} required/>{errorFor("industry")}</label>
          <label htmlFor="registration-employees"><span className="field-label-line">{t("registration.employees")} <span className="muted">({t("registration.optional")})</span></span><input id="registration-employees" value={draft.employees} onChange={(event) => update("employees", normalizeDigits(event.target.value).replace(/\D/g, ""))} onBlur={() => onFieldBlur("employees")} inputMode="numeric" placeholder={t("registration.optional")} aria-invalid={Boolean(fieldErrors.employees)}/>{errorFor("employees")}</label>
          <label className="full" htmlFor="registration-subscription"><span className="field-label-line">{t("registration.subscription")}</span><StyledSelect id="registration-subscription" value={draft.subscriptionPlan} onChange={(event) => update("subscriptionPlan", event.target.value)}>{SUBSCRIPTION_PLANS.map((plan) => <option key={plan.id} value={plan.id}>{t(planTranslationKeys[plan.id].title)} — {t(planTranslationKeys[plan.id].description)}</option>)}</StyledSelect><small className="field-hint">{t("registration.subscriptionNote")}</small></label>
          <label className="full" htmlFor="registration-account-email"><span className="field-label-line">{t("registration.accountEmail")}</span><input id="registration-account-email" value={draft.email} type="text" dir="ltr" readOnly aria-describedby="registration-account-email-hint"/><small id="registration-account-email-hint" className="field-hint">{t("registration.accountEmailNote")}</small></label>
          {renderPasswordFields()}
        </div>
        <div className="wizard-actions"><button className="ghost" type="button" onClick={() => { setStep(2); setError(""); }}>{t("registration.back")}</button><button className="primary" type="submit" disabled={loading}>{t("registration.continue")}</button></div>
      </form>}
      {step === 3 && draft.kind === "personal" && <div className="register-review">
        <div className="review-card"><span className="choice-icon"><Icon name="check"/></span><div><strong>{t("registration.ready")}</strong><p>{t("registration.personalAccount")}</p><small>{draft.email}</small></div></div>
        <div className="review-note"><Icon name="shield" size={18}/><span>{t("registration.reviewBeforeCreate")}</span></div>
        <div className="wizard-actions"><button className="ghost" type="button" onClick={() => setStep(2)}>{t("registration.editDetails")}</button><button className="primary" type="button" onClick={() => setStep(4)}>{t("registration.confirmContinue")}</button></div>
      </div>}
      {step === 4 && <form className="register-review" noValidate onSubmit={submit}>
        <div className="review-card"><span className="choice-icon"><Icon name="check"/></span><div><strong>{t("registration.finalConfirmation")}</strong><p>{draft.kind === "organization" ? t("registration.companyAndManager", { company: draft.companyName }) : t("registration.personalAccount")}</p><small>{draft.email}</small></div></div>
        <div className="registration-review-summary" aria-label={t("registration.review")}>
          <div><small>{t("registration.fullName")}</small><strong>{draft.displayName}</strong></div><div><small>{t("registration.username")}</small><strong dir="ltr">{draft.username || t("registration.notProvided")}</strong></div>
          {draft.kind === "organization" ? <><div><small>{t("registration.accountEmail")}</small><strong dir="ltr">{draft.email}</strong></div><div><small>{t("registration.companyName")}</small><strong>{draft.companyName}</strong></div><div><small>{t("registration.industry")}</small><strong>{draft.industry}</strong></div><div><small>{t("registration.phone")}</small><strong dir="ltr">{draft.phone}</strong></div><div><small>{t("registration.jobTitle")}</small><strong>{draft.jobTitle || t("registration.notProvided")}</strong></div><div><small>{t("registration.employees")}</small><strong>{draft.employees || t("registration.notProvided")}</strong></div><div><small>{t("registration.subscription")}</small><strong>{draft.subscriptionPlan}</strong></div></> : <div><small>{t("registration.activityArea")}</small><strong>{draft.activityArea || t("registration.notProvided")}</strong></div>}
        </div>
        <div className="review-note"><Icon name="shield" size={18}/><span>{draft.kind === "organization" ? t("registration.companyConfirmation") : t("registration.personalWorkspace")}</span></div>
        <div className="wizard-actions"><button className="ghost" type="button" onClick={() => setStep(3)}>{t("registration.back")}</button><button className="primary" disabled={loading}>{loading ? t("registration.creatingAccount") : t("registration.createSecureAccount")}</button></div>
      </form>}
      <small className="login-hint">{t("registration.haveAccount")} <Link to="/login">{t("registration.signIn")}</Link></small>
    </section>
  </main>;
}

export function PathSelectionPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<AssessmentPath>(readAssessmentPath);
  function selectedAssessmentDraftKey(type: AssessmentPath) {
    const { session, orgId } = getSession();
    return assessmentDraftKey(type, session?.user.id, orgId);
  }
  async function clearSelectedAssessmentDraft(type: AssessmentPath) {
    const draftKey = selectedAssessmentDraftKey(type);
    await clearAutoSaveDraft(draftKey);
    clearAssessmentWizardStep(draftKey);
  }
  function selectAssessment(type: AssessmentPath) {
    rememberAssessmentPath(type);
    setSelected(type);
    void clearSelectedAssessmentDraft(type);
  }
  async function continueToAssessment(type: AssessmentPath = selected) {
    await clearSelectedAssessmentDraft(type);
    navigate(rememberAssessmentPath(type));
  }
  return <section className="page-shell path-flow">
    <PageHeader eyebrow={t("path.eyebrow")} title={t("path.title")} description={t("path.description")}/>
    <div className="path-stepper" aria-label={t("path.stepsLabel")}><div className="path-step current"><b>۱</b><span>{t("path.assessmentType")}</span></div><i/><div className="path-step"><b>۲</b><span>{t("path.assessmentInfo")}</span></div><i/><div className="path-step"><b>۳</b><span>{t("path.reviewConfirm")}</span></div></div>
    <div className="path-notice" role="status"><Icon name="shield" size={17}/><span>{t("path.notice")}</span></div>
    <div className="path-title"><div><span className="eyebrow">{t("path.stepOneOfThree")}</span><h2>{t("path.selectType")}</h2><p>{t("path.selectDescription")}</p></div><span className="path-required">{t("path.required")}</span></div>
    <div className="path-choice-grid" role="group" aria-label={t("path.choiceGroupLabel")}>
      <article className={`path-choice-card fmea ${selected === "fmea" ? "selected" : ""}`}>
        <button type="button" className="path-choice-select" aria-pressed={selected === "fmea"} aria-describedby="fmea-choice-description" onClick={() => selectAssessment("fmea")} onDoubleClick={() => continueToAssessment("fmea")}>
          <span className="path-choice-head"><span className="path-choice-icon"><Icon name="fmea" size={25}/></span><span className="path-choice-status">{selected === "fmea" ? <><Icon name="check" size={14}/> {t("path.selected")}</> : t("path.choose")}</span></span>
          <div className="path-choice-title-row"><h3>{t("path.fmeaTitle")} <em>FMEA</em></h3><span className="path-choice-tag">{t("path.fmeaTag")}</span></div>
          <div id="fmea-choice-description" className="path-choice-copy"><p>{t("path.fmeaDescription")}</p><ul><li>{t("path.fmeaSuitable")}</li><li>{t("path.fmeaRpn")}</li></ul></div>
        </button>
        <button type="button" className="primary path-choice-enter" onClick={() => continueToAssessment("fmea")}><Icon name="arrow"/> {t("path.enterFmea")}</button>
      </article>
      <article className={`path-choice-card rula ${selected === "rula" ? "selected" : ""}`}>
        <button type="button" className="path-choice-select" aria-pressed={selected === "rula"} aria-describedby="rula-choice-description" onClick={() => selectAssessment("rula")} onDoubleClick={() => continueToAssessment("rula")}>
          <span className="path-choice-head"><span className="path-choice-icon"><Icon name="rula" size={25}/></span><span className="path-choice-status">{selected === "rula" ? <><Icon name="check" size={14}/> {t("path.selected")}</> : t("path.choose")}</span></span>
          <div className="path-choice-title-row"><h3>{t("path.rulaTitle")} <em>RULA</em></h3><span className="path-choice-tag">{t("path.rulaTag")}</span></div>
          <div id="rula-choice-description" className="path-choice-copy"><p>{t("path.rulaDescription")}</p><ul><li>{t("path.rulaSuitable")}</li><li>{t("path.rulaScore")}</li></ul></div>
        </button>
        <button type="button" className="primary path-choice-enter" onClick={() => continueToAssessment("rula")}><Icon name="arrow"/> {t("path.enterRula")}</button>
      </article>
    </div>
    <div className="path-actions"><div className="path-session-note" role="status"><Icon name="check" size={15}/><span>{t("path.sessionNote")}</span></div><button type="button" className="primary" onClick={() => continueToAssessment()}><Icon name="arrow"/> {t("path.continue")}</button></div>
  </section>;
}
