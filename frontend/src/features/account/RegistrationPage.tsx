import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SUBSCRIPTION_PLANS, isForbiddenDisplayName, isStrongPassword, isValidDisplayName, isValidEmail, isValidPhone, normalizeDigits, normalizeDisplayName, normalizeEmail, normalizePhone, PASSWORD_MIN_LENGTH } from "@nivasafe/domain";
import { api, directionForLocale, getCurrentLocale, saveSession, type ApiError, type Session } from "../../api/client";
import { Icon, PageHeader } from "../../components/UI";
import { AutoSaveStatus } from "../../forms/AutoSaveForm";

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
  const messages: Record<string, string> = {
    INVALID_EMAIL: "ایمیل معتبر وارد کنید.",
    INVALID_PHONE: "شماره تلفن معتبر نیست.",
    RESERVED_DISPLAY_NAME: "نام مسئول معتبر نیست.",
    WEAK_PASSWORD: `رمز عبور حداقل ${PASSWORD_MIN_LENGTH} نویسه و شامل حرف، عدد و نشانه باشد.`,
    EMAIL_IN_USE: "این ایمیل قبلاً ثبت شده است.",
    PHONE_IN_USE: "این شماره تلفن قبلاً ثبت شده است.",
    DUPLICATE_VALUE: "این اطلاعات قبلاً ثبت شده است.",
    VALIDATION_ERROR: "اطلاعات واردشده را بررسی کنید.",
  };
  return messages[error.code ?? ""] ?? (error instanceof Error ? error.message : "ثبت‌نام انجام نشد.");
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
  const stepLabels = draft.kind === "organization" ? ["نوع حساب", "اطلاعات شرکت", "اطلاعات مسئول", "تکمیل"] : ["نوع حساب", "اطلاعات شخصی", "بررسی", "تکمیل"];
  const update = (key: keyof RegistrationDraft, value: string) => setDraft((current) => ({ ...current, [key]: value }));

  function chooseKind(kind: RegistrationKind) {
    setDraft((current) => ({ ...current, kind }));
    setError("");
  }

  function validateCompanyDetails() {
    if (!draft.companyName.trim()) return "نام شرکت را وارد کنید.";
    if (!draft.industry.trim()) return "نوع صنعت را وارد کنید.";
    if (draft.employees.trim() && (!/^\d+$/.test(draft.employees.trim()) || Number(draft.employees) > 10_000_000)) return "تعداد کارکنان معتبر نیست.";
    return "";
  }

  function validateIdentityDetails() {
    if (!draft.displayName.trim()) return "نام و نام خانوادگی را وارد کنید.";
    if (!isValidDisplayName(draft.displayName) || isForbiddenDisplayName(draft.displayName)) return "نام مسئول معتبر نیست.";
    if (!draft.email.trim()) return "ایمیل را وارد کنید.";
    if (!isValidEmail(draft.email)) return "ایمیل معتبر وارد کنید.";
    if (draft.kind === "organization" && !draft.phone.trim()) return "تلفن همراه را وارد کنید.";
    if (draft.kind === "organization" && !isValidPhone(draft.phone)) return "شماره تلفن معتبر نیست.";
    if (!draft.password) return "رمز عبور را وارد کنید.";
    if (!isStrongPassword(draft.password, { email: draft.email, displayName: draft.displayName })) return `رمز عبور باید حداقل ${PASSWORD_MIN_LENGTH} نویسه و شامل حرف، عدد و نشانه باشد.`;
    if (!draft.confirmPassword) return "تأیید رمز عبور را وارد کنید.";
    if (draft.password !== draft.confirmPassword) return "تأیید رمز عبور یکسان نیست.";
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
          locale: getCurrentLocale(),
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
          defaultLocale: getCurrentLocale(),
        }),
      });
      const sessionWithOrg: Session = { ...loggedIn.data, organizations: [...loggedIn.data.organizations, { id: organization.data.id, nameFa: organization.data.nameFa, nameEn: organization.data.nameEn, role: "ORG_ADMIN", subscriptionPlan: organization.data.subscriptionPlan, subscriptionStatus: organization.data.subscriptionStatus, subscriptionExpiresAt: organization.data.subscriptionExpiresAt }] };
      saveSession(sessionWithOrg);
      localStorage.setItem("nivasafe-org", organization.data.id);
      try {
        await api("/projects", {
          method: "POST",
          body: JSON.stringify({ name: "پروژه پیش‌فرض", code: "DEFAULT", description: "پروژه اولیه برای شروع کار با NIVASafe", status: "ACTIVE" }),
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

  return <main className="login simple register-page" dir={directionForLocale()} lang={directionForLocale() === "ltr" ? "en" : "fa"}>
    <section className="login-card register-card">
      <div className="auth-header-row"><img className="login-card-logo" src="/brand/nivasafe-icon.png" alt="NIVASafe"/><Link className="text-button" to="/login">ورود</Link></div>
      <div className="eyebrow">شروع امن با NIVASafe</div>
      <h2>{step === 1 ? "ثبت‌نام در NIVASafe" : "ساخت حساب کاربری"}</h2>
      <p className="muted">{step === 1 ? "لطفاً نوع ثبت‌نام خود را انتخاب کنید." : "اطلاعات را مرحله‌به‌مرحله وارد کنید؛ پیش‌نویس فرم به‌صورت خودکار ذخیره می‌شود."}</p>
      <div className="wizard-progress" aria-label={`مرحله ${step} از ۴`}><span style={{ width: progress }}/></div>
      <div className="wizard-steps">{stepLabels.map((label, index) => <span className={step >= index + 1 ? "active" : ""} key={label}>{label}</span>)}</div>
      <AutoSaveStatus lastSaved={lastSaved}/>
      {error && <div className="alert error"><Icon name="warning"/>{error}</div>}
      {step === 1 && <>
        <div className="choice-grid">
        <button className={`choice-card ${draft.kind === "organization" ? "selected" : ""}`} onClick={() => chooseKind("organization")} aria-pressed={draft.kind === "organization"} type="button"><span className="choice-card-top"><span className="choice-icon"><Icon name="projects"/></span><span className="choice-radio" aria-hidden="true">{draft.kind === "organization" ? "●" : "○"}</span></span><strong>ثبت‌نام سازمانی</strong><small>مناسب برای شرکت‌ها و سازمان‌ها؛ مدیریت کاربران و ارزیابی‌ها</small></button>
        <button className={`choice-card ${draft.kind === "personal" ? "selected" : ""}`} onClick={() => chooseKind("personal")} aria-pressed={draft.kind === "personal"} type="button"><span className="choice-card-top"><span className="choice-icon"><Icon name="profile"/></span><span className="choice-radio" aria-hidden="true">{draft.kind === "personal" ? "●" : "○"}</span></span><strong>ثبت‌نام شخصی</strong><small>مناسب برای کاربران فردی و مدیریت محدود در تعداد پروژه‌ها</small></button>
        </div>
        <div className="wizard-actions choice-actions"><span/><button className="primary" type="button" disabled={!draft.kind} onClick={() => { if (!draft.kind) { setError("نوع ثبت‌نام را انتخاب کنید."); return; } setStep(2); setError(""); }}>ادامه</button></div>
      </>}
      {step === 2 && <form className="register-form" onSubmit={(event) => { event.preventDefault(); const validation = validateCurrentStep(); if (validation) setError(validation); else setStep(3); }}>
        <div className="form-grid">
          {draft.kind === "organization" ? <>
            <label className="full">نام شرکت<input value={draft.companyName} onChange={(event) => update("companyName", event.target.value)} autoComplete="organization" maxLength={191} required/></label>
            <label>نوع صنعت<input value={draft.industry} onChange={(event) => update("industry", event.target.value)} placeholder="مثلاً تولید، ساخت‌وساز" maxLength={120} required/></label>
            <label>تعداد کارکنان<input value={draft.employees} onChange={(event) => update("employees", normalizeDigits(event.target.value).replace(/\D/g, ""))} inputMode="numeric" placeholder="اختیاری"/></label>
            <label>شناسه ملی شرکت<input value={draft.nationalId} onChange={(event) => update("nationalId", event.target.value)} inputMode="numeric" maxLength={50} placeholder="اختیاری"/></label>
            <label className="full">طرح اشتراک شرکت<select value={draft.subscriptionPlan} onChange={(event) => update("subscriptionPlan", event.target.value)}>{SUBSCRIPTION_PLANS.map((plan) => <option key={plan.id} value={plan.id}>{plan.titleFa} — {plan.descriptionFa}</option>)}</select><small className="field-hint">هر شرکت پس از ایجاد، اشتراک و وضعیت پرداخت مستقل دارد.</small></label>
          </> : <>
            <label>نام و نام خانوادگی<input value={draft.displayName} onChange={(event) => update("displayName", event.target.value)} onBlur={() => update("displayName", normalizeDisplayName(draft.displayName))} autoComplete="name" maxLength={80} aria-invalid={draft.displayName.trim().length > 0 && !isValidDisplayName(draft.displayName)} required/>{draft.displayName.trim().length > 0 && !isValidDisplayName(draft.displayName) && <small className="field-error">نام معتبر وارد کنید.</small>}</label>
            <label>ایمیل<input value={draft.email} onChange={(event) => update("email", event.target.value)} onBlur={() => update("email", normalizeEmail(draft.email))} type="email" inputMode="email" autoComplete="email" maxLength={254} aria-invalid={draft.email.trim().length > 0 && !isValidEmail(draft.email)} required/>{draft.email.trim().length > 0 && !isValidEmail(draft.email) && <small className="field-error">فرمت ایمیل معتبر نیست.</small>}</label>
            <label className="full">حوزه فعالیت<input value={draft.activityArea} onChange={(event) => update("activityArea", event.target.value)} placeholder="مثلاً HSE، تولید، مشاوره" maxLength={120}/></label>
            <label>رمز عبور<input value={draft.password} onChange={(event) => update("password", event.target.value)} type="password" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} maxLength={128} aria-describedby="registration-password-hint" required/><small id="registration-password-hint" className="field-hint">حداقل {PASSWORD_MIN_LENGTH} نویسه، شامل حرف، عدد و نشانه.</small></label>
            <label>تأیید رمز عبور<input value={draft.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)} type="password" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} maxLength={128} required/></label>
          </>}
        </div>
        <div className="wizard-actions"><button className="ghost" type="button" onClick={() => setStep(1)}>بازگشت</button><button className="primary" type="submit">ادامه</button></div>
      </form>}
      {step === 3 && draft.kind === "organization" && <form className="register-form" onSubmit={(event) => { event.preventDefault(); const validation = validateIdentityDetails(); if (validation) setError(validation); else setStep(4); }}>
        <div className="form-grid">
          <label>نام مسئول<input value={draft.displayName} onChange={(event) => update("displayName", event.target.value)} onBlur={() => update("displayName", normalizeDisplayName(draft.displayName))} autoComplete="name" maxLength={80} aria-invalid={draft.displayName.trim().length > 0 && !isValidDisplayName(draft.displayName)} required/>{draft.displayName.trim().length > 0 && !isValidDisplayName(draft.displayName) && <small className="field-error">نام مسئول معتبر نیست.</small>}</label>
          <label>ایمیل<input value={draft.email} onChange={(event) => update("email", event.target.value)} onBlur={() => update("email", normalizeEmail(draft.email))} type="email" inputMode="email" autoComplete="email" maxLength={254} aria-invalid={draft.email.trim().length > 0 && !isValidEmail(draft.email)} required/>{draft.email.trim().length > 0 && !isValidEmail(draft.email) && <small className="field-error">فرمت ایمیل معتبر نیست.</small>}</label>
          <label>تلفن همراه<input value={draft.phone} onChange={(event) => update("phone", normalizePhone(event.target.value))} onBlur={() => update("phone", draft.phone.trim() ? normalizePhone(draft.phone) : "")} inputMode="numeric" autoComplete="tel" dir="ltr" maxLength={11} pattern="09[0-9]{9}" placeholder="مثال ۰۹۱۲۱۲۳۴۵۶۷" aria-invalid={draft.phone.trim().length > 0 && !isValidPhone(draft.phone)} required/>{draft.phone.trim().length > 0 && !isValidPhone(draft.phone) && <small className="field-error">شماره تلفن معتبر نیست.</small>}</label>
          <label><span className="field-label-line">سمت <span className="muted">(اختیاری)</span></span><input value={draft.jobTitle} onChange={(event) => update("jobTitle", event.target.value)} placeholder="مثلاً مدیر HSE" maxLength={120}/></label>
          <label>رمز عبور<input value={draft.password} onChange={(event) => update("password", event.target.value)} type="password" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} maxLength={128} aria-describedby="registration-password-hint" required/><small id="registration-password-hint" className="field-hint">حداقل {PASSWORD_MIN_LENGTH} نویسه، شامل حرف، عدد و نشانه.</small></label>
          <label>تأیید رمز عبور<input value={draft.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)} type="password" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} maxLength={128} required/></label>
        </div>
        <div className="wizard-actions"><button className="ghost" type="button" onClick={() => setStep(2)}>بازگشت</button><button className="primary" type="submit">بررسی اطلاعات</button></div>
      </form>}
      {step === 3 && draft.kind === "personal" && <div className="register-review">
        <div className="review-card"><span className="choice-icon"><Icon name="check"/></span><div><strong>اطلاعات آماده ثبت است</strong><p>حساب شخصی NIVASafe</p><small>{draft.email}</small></div></div>
        <div className="review-note"><Icon name="shield" size={18}/><span>اطلاعات ثبت‌نام را بررسی کنید؛ در صورت تأیید حساب امن شما ساخته می‌شود.</span></div>
        <div className="wizard-actions"><button className="ghost" type="button" onClick={() => setStep(2)}>ویرایش اطلاعات</button><button className="primary" type="button" onClick={() => setStep(4)}>تأیید و ادامه</button></div>
      </div>}
      {step === 4 && <form className="register-review" onSubmit={submit}>
        <div className="review-card"><span className="choice-icon"><Icon name="check"/></span><div><strong>تأیید نهایی ثبت‌نام</strong><p>{draft.kind === "organization" ? `شرکت «${draft.companyName}» و حساب مسئول آن` : "حساب شخصی NIVASafe"}</p><small>{draft.email}</small></div></div>
        <div className="review-note"><Icon name="shield" size={18}/><span>{draft.kind === "organization" ? "اطلاعات شرکت و مسئول را تأیید کنید؛ اشتراک این شرکت مستقل مدیریت می‌شود." : "پس از تأیید، فضای کاری شخصی شما ساخته می‌شود."}</span></div>
        <div className="wizard-actions"><button className="ghost" type="button" onClick={() => setStep(3)}>بازگشت</button><button className="primary" disabled={loading}>{loading ? "در حال ساخت حساب…" : "ساخت حساب امن"}</button></div>
      </form>}
      <small className="login-hint">قبلاً حساب کاربری دارید؟ <Link to="/login">وارد شوید</Link><br/>اطلاعات شما فقط برای مدیریت فضای کاری NIVASafe استفاده می‌شود.</small>
    </section>
  </main>;
}

export function PathSelectionPage() {
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
    <PageHeader eyebrow="ایجاد ارزیابی جدید" title="انتخاب مسیر ارزیابی" description="روش استاندارد ارزیابی را انتخاب کنید و اطلاعات را مرحله‌به‌مرحله ثبت کنید."/>
    <div className="path-stepper" aria-label="مراحل ایجاد ارزیابی"><div className="path-step done"><b>✓</b><span>اطلاعات پایه</span></div><i/><div className="path-step current"><b>۲</b><span>انتخاب نوع ارزیابی</span></div><i/><div className="path-step"><b>۳</b><span>اطلاعات ارزیابی</span></div><i/><div className="path-step"><b>۴</b><span>مرور و تأیید</span></div></div>
    <div className="path-notice" role="status"><Icon name="shield" size={17}/><span>نوع ارزیابی را بر اساس هدف بررسی انتخاب کنید؛ در مرحله بعد اطلاعات پروژه و جزئیات ارزیابی ثبت می‌شود.</span></div>
    <div className="path-title"><div><span className="eyebrow">مرحله دوم از چهار</span><h2>انتخاب نوع ارزیابی</h2><p>یکی از روش‌های استاندارد زیر را برای شروع ارزیابی انتخاب کنید.</p></div><span className="path-required">انتخاب یک گزینه الزامی است</span></div>
    <div className="path-choice-grid">
      <button type="button" className={`path-choice-card fmea ${selected === "fmea" ? "selected" : ""}`} aria-pressed={selected === "fmea"} onClick={() => setSelected("fmea")}><div className="path-choice-head"><span className="path-choice-icon"><Icon name="fmea" size={25}/></span><span className="path-radio" aria-hidden="true">{selected === "fmea" ? "●" : "○"}</span></div><strong>ارزیابی ریسک فرایند <em>FMEA</em></strong><p>شناسایی حالت‌های خرابی، علل و پیامدها و اولویت‌بندی ریسک‌های فرایند.</p><ul><li>مناسب برای فرایندها و فعالیت‌های سازمانی</li><li>محاسبه خودکار عدد اولویت ریسک</li></ul><span className="path-choice-label">انتخاب FMEA</span></button>
      <button type="button" className={`path-choice-card rula ${selected === "rula" ? "selected" : ""}`} aria-pressed={selected === "rula"} onClick={() => setSelected("rula")}><div className="path-choice-head"><span className="path-choice-icon"><Icon name="rula" size={25}/></span><span className="path-radio" aria-hidden="true">{selected === "rula" ? "●" : "○"}</span></div><strong>ارزیابی ارگونومی <em>RULA</em></strong><p>بررسی سریع وضعیت بدن و شناسایی سطح اقدام اصلاحی برای فعالیت‌های کاری.</p><ul><li>مناسب برای وضعیت‌های بدنی و ایستگاه‌های کاری</li><li>امتیازدهی استاندارد و قابل پیگیری</li></ul><span className="path-choice-label">انتخاب RULA</span></button>
    </div>
    <div className="path-actions"><button type="button" className="ghost" onClick={skipToDashboard}>ورود به داشبورد</button><button type="button" className="primary" onClick={continueToAssessment}><Icon name="arrow"/> ادامه و ثبت اطلاعات</button></div>
  </section>;
}
