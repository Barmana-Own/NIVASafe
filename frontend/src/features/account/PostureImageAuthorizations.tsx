import { useId, useState, type FormEvent } from "react";
import { isValidEmail } from "@nivasafe/domain";
import { api, getSession, useLoad } from "../../api/client";
import { useI18n } from "../../i18n";
import { ACCOUNT_IMAGE_CONSENT_VERSION } from "./imageProcessingPolicy";
import { isPostureImageAuthorizationId, isUsablePostureImageAuthorization, type PostureImageAuthorization, type PostureImageAuthorizationsResponse } from "./postureImageAuthorization";
import "./posture-image-authorizations.css";

export type PostureImageAuthorizationInput = { recipientEmail: string; expiresInDays: number };

export function postureImageAuthorizationInputError(input: PostureImageAuthorizationInput): "recipient" | "expiry" | null {
  if (!isValidEmail(input.recipientEmail.trim())) return "recipient";
  if (!Number.isInteger(input.expiresInDays) || input.expiresInDays < 1 || input.expiresInDays > 90) return "expiry";
  return null;
}

export async function issuePostureImageAuthorization(input: PostureImageAuthorizationInput, consentAccepted: boolean): Promise<PostureImageAuthorization> {
  if (!consentAccepted) throw new Error("IMAGE_PROCESSING_ACCOUNT_CONSENT_REQUIRED");
  if (postureImageAuthorizationInputError(input)) throw new Error("INVALID_POSTURE_IMAGE_AUTHORIZATION");
  const result = await api<PostureImageAuthorization>("/profile/posture-image-authorizations", {
    method: "POST",
    body: JSON.stringify({ recipientEmail: input.recipientEmail.trim(), policyVersion: ACCOUNT_IMAGE_CONSENT_VERSION, expiresInDays: input.expiresInDays }),
  });
  return result.data;
}

export async function revokePostureImageAuthorization(id: string): Promise<void> {
  if (!isPostureImageAuthorizationId(id)) throw new Error("INVALID_POSTURE_IMAGE_AUTHORIZATION");
  await api(`/profile/posture-image-authorizations/${encodeURIComponent(id)}`, { method: "DELETE" });
}

const copy = {
  fa: {
    title: "مجوز استفاده از تصاویر من",
    description: "به یک عضو سازمان فعلی اجازه دهید تصاویر پوسچر شما را برای تحلیل بارگذاری کند. این مجوز را هر زمان می‌توانید لغو کنید.",
    consentRequired: "برای ثبت مجوز، ابتدا رضایت پردازش تصویر خود را ذخیره کنید.",
    organizationRequired: "برای مدیریت مجوز تصاویر، یک سازمان فعال انتخاب کنید.",
    recipient: "ایمیل دقیق دریافت‌کنندهٔ مجوز", expiry: "اعتبار مجوز (روز)", create: "ثبت مجوز برای تصاویر خودم", revoke: "لغو مجوز",
    invalidRecipient: "ایمیل معتبر دریافت‌کننده را وارد کنید.", invalidExpiry: "اعتبار مجوز باید بین ۱ تا ۹۰ روز باشد.",
    loading: "در حال دریافت مجوزها…", empty: "مجوزی برای این سازمان ثبت نشده است.", created: "مجوز ثبت شد.", revoked: "مجوز لغو شد.",
    active: "فعال", inactive: "غیرفعال", revokedStatus: "لغوشده", expires: "انقضا", unknownDate: "نامشخص", failed: "ثبت تغییرات انجام نشد. دوباره تلاش کنید.",
  },
  en: {
    title: "Permission to use my images",
    description: "Allow a member of the current organization to upload your posture photos for analysis. You can revoke this permission at any time.",
    consentRequired: "Save your image-processing consent before creating permission.",
    organizationRequired: "Select an active organization to manage image permissions.",
    recipient: "Recipient's exact email", expiry: "Permission duration (days)", create: "Grant permission for my photos", revoke: "Revoke permission",
    invalidRecipient: "Enter the recipient's valid email.", invalidExpiry: "Permission duration must be between 1 and 90 days.",
    loading: "Loading permissions…", empty: "No permission has been recorded in this organization.", created: "Permission recorded.", revoked: "Permission revoked.",
    active: "Active", inactive: "Inactive", revokedStatus: "Revoked", expires: "Expires", unknownDate: "Unknown", failed: "Changes could not be saved. Please try again.",
  },
};

function PostureImageAuthorizationsWorkspace({ accepted, userId, organizationId }: { accepted: boolean; userId: string; organizationId: string }) {
  const { locale } = useI18n(), text = copy[locale], titleId = useId();
  const state = useLoad<PostureImageAuthorizationsResponse>(organizationId ? "/profile/posture-image-authorizations?direction=issued" : null, [accepted, organizationId, userId]);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("30");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const grants = (Array.isArray(state.data?.grants) ? state.data.grants : []).filter(grant => grant.ownerUserId === userId).slice(0, 50);
  const currentContext = () => {
    const current = getSession();
    return current.orgId === organizationId && current.session?.user.id === userId;
  };
  function notifyChange() {
    state.reload();
    window.dispatchEvent(new Event("nivasafe-posture-authorizations-changed"));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !accepted || !organizationId || !currentContext()) return;
    setMessage("");setError("");
    const input = { recipientEmail, expiresInDays: Number(expiresInDays) };
    const invalid = postureImageAuthorizationInputError(input);
    if (invalid) { setError(invalid === "recipient" ? text.invalidRecipient : text.invalidExpiry); return; }
    setBusy("create");
    try {
      await issuePostureImageAuthorization(input, accepted);
      if (!currentContext()) return;
      setRecipientEmail("");setExpiresInDays("30");setMessage(text.created);notifyChange();
    } catch (reason) { if (currentContext()) setError(reason instanceof Error ? reason.message : text.failed); }
    finally { if (currentContext()) setBusy(""); }
  }
  async function revoke(grant: PostureImageAuthorization) {
    if (busy || grant.ownerUserId !== userId || !currentContext()) return;
    setBusy(grant.id);setMessage("");setError("");
    try {
      await revokePostureImageAuthorization(grant.id);
      if (!currentContext()) return;
      setMessage(text.revoked);notifyChange();
    } catch (reason) { if (currentContext()) setError(reason instanceof Error ? reason.message : text.failed); }
    finally { if (currentContext()) setBusy(""); }
  }
  return <section className="posture-image-authorizations" aria-labelledby={titleId}>
    <h4 id={titleId}>{text.title}</h4><p className="muted">{text.description}</p>
    {!organizationId ? <p role="status">{text.organizationRequired}</p> : <>
      {!accepted && <p role="status">{text.consentRequired}</p>}
      <form onSubmit={event => void submit(event)} aria-busy={busy === "create"}>
        <fieldset disabled={!accepted || Boolean(busy)} className="posture-authorization-fields">
          <label>{text.recipient}<input type="email" name="recipientEmail" dir="ltr" inputMode="email" autoComplete="off" maxLength={254} value={recipientEmail} onChange={event => setRecipientEmail(event.target.value)} required/></label>
          <label>{text.expiry}<input type="number" name="expiresInDays" dir="ltr" min={1} max={90} step={1} value={expiresInDays} onChange={event => setExpiresInDays(event.target.value)} required/></label>
          <button type="submit" className="secondary">{text.create}</button>
        </fieldset>
      </form>
      {state.error ? <p role="alert">{state.error}</p> : state.loading ? <p role="status">{text.loading}</p> : grants.length ? <ul className="posture-authorization-list">
        {grants.map(grant => {
          const expiry = new Date(grant.expiresAt);
          const expires = Number.isFinite(expiry.getTime()) ? expiry.toLocaleDateString(locale === "fa" ? "fa-IR" : "en-US") : text.unknownDate;
          const active = accepted && isUsablePostureImageAuthorization(grant, grant.recipientUserId);
          return <li key={grant.id}><div><strong>{grant.recipientName}</strong><small>{active ? text.active : grant.status === "REVOKED" ? text.revokedStatus : text.inactive} · {text.expires}: <time dateTime={Number.isFinite(expiry.getTime()) ? grant.expiresAt : undefined}>{expires}</time></small></div>{grant.status !== "REVOKED" && <button type="button" className="text-button" disabled={Boolean(busy)} onClick={() => void revoke(grant)} aria-label={`${text.revoke} — ${grant.recipientName}`}>{text.revoke}</button>}</li>;
        })}
      </ul> : <p className="muted">{text.empty}</p>}
    </>}
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
  </section>;
}

export function PostureImageAuthorizations({ accepted }: { accepted: boolean }) {
  const { session, orgId } = getSession();
  const userId = session?.user.id ?? "";
  return <PostureImageAuthorizationsWorkspace key={`${userId}:${orgId}`} accepted={accepted} userId={userId} organizationId={userId ? orgId : ""}/>;
}
