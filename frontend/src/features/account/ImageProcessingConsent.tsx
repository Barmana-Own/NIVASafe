import "../../styles/account-consent.css";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, useLoad } from "../../api/client";
import { SectionCard } from "../../components/UI";
import { useI18n } from "../../i18n";
import { ACCOUNT_IMAGE_CONSENT_VERSION, TERMS_VERSION, imageProcessingCopy, type AccountImageConsent } from "./imageProcessingPolicy";

export function PolicyAcceptanceFields({ termsAccepted, onTermsChange, imageAccepted, onImageChange }: { termsAccepted?: boolean; onTermsChange?: (value: boolean) => void; imageAccepted: boolean; onImageChange: (value: boolean) => void }) {
  const { locale } = useI18n(), copy = imageProcessingCopy[locale];
  return <div className="policy-acceptance-fields">
    {onTermsChange && <label className="policy-acceptance"><input type="checkbox" name="termsAccepted" checked={termsAccepted === true} onChange={e => onTermsChange(e.target.checked)} required/><span>{copy.terms} <Link to="/terms" target="_blank" rel="noopener">{copy.termsLink}</Link> · <Link to="/privacy" target="_blank" rel="noopener">{copy.privacyLink}</Link></span></label>}
    <label className="policy-acceptance"><input type="checkbox" name="imageProcessingConsent" checked={imageAccepted} onChange={e => onImageChange(e.target.checked)}/><span>{copy.imageAgreement} <Link to="/privacy#assessment-images" target="_blank" rel="noopener">{copy.privacyLink}</Link></span></label>
  </div>;
}

export function AccountImageProcessingConsent() {
  const { locale } = useI18n(), copy = imageProcessingCopy[locale], state = useLoad<AccountImageConsent>("/profile/image-processing-consent");
  const [accepted, setAccepted] = useState(false), [saving, setSaving] = useState(false), [message, setMessage] = useState("");
  useEffect(() => { if (state.data) setAccepted(state.data.accepted); }, [state.data]);
  async function save() {
    if (saving || !state.data) return;
    setSaving(true);setMessage("");
    try { await api<AccountImageConsent>("/profile/image-processing-consent", { method: "PUT", body: JSON.stringify({ accepted, policyVersion: ACCOUNT_IMAGE_CONSENT_VERSION }) });state.reload();setMessage(copy.saved);window.dispatchEvent(new Event("nivasafe-image-consent-changed")); }
    catch (error) { setMessage((error as Error).message); }
    finally { setSaving(false); }
  }
  return <section id="image-processing-consent" className="account-image-processing"><SectionCard title={copy.title} icon="shield">
    {state.error ? <p role="alert">{state.error}</p> : !state.data ? <p role="status">{copy.loading}</p> : <><PolicyAcceptanceFields imageAccepted={accepted} onImageChange={setAccepted}/><p className="muted">{state.data.accepted ? copy.statusAccepted : copy.statusNotAccepted}</p><button type="button" className="primary" disabled={saving || accepted === state.data.accepted} onClick={() => void save()}>{copy.save}</button></>}
    {message && <p role="status">{message}</p>}
  </SectionCard></section>;
}

export function LegalPolicyPage({ kind }: { kind: "terms" | "privacy" }) {
  const { locale, direction } = useI18n(), copy = imageProcessingCopy[locale];
  return <main className="legal-policy-page" dir={direction} lang={locale}><article className="legal-policy-card"><h1>{kind === "terms" ? copy.termsTitle : copy.privacyTitle}</h1><small dir="ltr">{kind === "terms" ? TERMS_VERSION : ACCOUNT_IMAGE_CONSENT_VERSION}</small><div id="assessment-images">{(kind === "terms" ? copy.termsParagraphs : copy.paragraphs).map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div><nav><Link to="/terms">{copy.termsLink}</Link><Link to="/privacy">{copy.privacyLink}</Link><Link to="/register">{copy.back}</Link></nav></article></main>;
}
