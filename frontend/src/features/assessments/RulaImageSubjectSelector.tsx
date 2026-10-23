import { useId } from "react";
import "../../styles/account-consent.css";
import { StyledSelect } from "../../components/UI";
import { useI18n } from "../../i18n";
import { isUsablePostureImageAuthorization, type PostureImageAuthorization } from "../account/postureImageAuthorization";
import type { RulaImageOwnership } from "./rulaImageAnalysisPolicy";

export const rulaImageOwnershipCopy = {
  fa: { subject: "صاحب تصاویر", self: "تصاویر خودم", thirdParty: "تصاویر فرد دیگر با مجوز او", grant: "مجوز صاحب تصویر", choose: "انتخاب مجوز معتبر", loading: "در حال دریافت مجوزهای تصاویر…", required: "مجوز معتبر صاحب تصویر برای شما در سازمان فعلی لازم است. صاحب تصویر می‌تواند آن را از تنظیمات حساب خود ثبت کند.", batch: "تصاویر این ارزیابی باید متعلق به همین فرد باشند." },
  en: { subject: "Image subject", self: "My own photos", thirdParty: "Someone else's photos with their permission", grant: "Photo owner's permission", choose: "Select valid permission", loading: "Loading image permissions…", required: "A valid permission from the photo owner to you in the current organization is required. The owner can grant it in their account settings.", batch: "All photos in this assessment must belong to the selected person." },
};

type Props = {
  value: RulaImageOwnership;
  onChange: (value: RulaImageOwnership) => void;
  grants: readonly PostureImageAuthorization[];
  recipientUserId: string;
  loading: boolean;
  error: string;
};

export function RulaImageSubjectSelector({ value, onChange, grants, recipientUserId, loading, error }: Props) {
  const { locale } = useI18n(), text = rulaImageOwnershipCopy[locale], descriptionId = useId();
  const available = grants.filter(grant => isUsablePostureImageAuthorization(grant, recipientUserId));
  const selected = available.some(grant => grant.id === value.ownerAuthorizationId);
  return <div className="rula-image-subject-selector">
    <label>{text.subject}<StyledSelect name="imageSubject" value={value.imageSubject} aria-describedby={descriptionId} onChange={event => onChange({ imageSubject: event.target.value === "THIRD_PARTY" ? "THIRD_PARTY" : "SELF" })}><option value="SELF">{text.self}</option><option value="THIRD_PARTY">{text.thirdParty}</option></StyledSelect></label>
    {value.imageSubject === "THIRD_PARTY" && <>
      <label>{text.grant}<StyledSelect name="ownerAuthorizationId" value={selected ? value.ownerAuthorizationId : ""} disabled={loading || Boolean(error)} aria-invalid={!loading && !selected ? true : undefined} aria-describedby={descriptionId} onChange={event => onChange({ imageSubject: "THIRD_PARTY", ownerAuthorizationId: event.target.value })}><option value="">{text.choose}</option>{available.map(grant => <option key={grant.id} value={grant.id}>{grant.ownerName} · {new Date(grant.expiresAt).toLocaleDateString(locale === "fa" ? "fa-IR" : "en-US")}</option>)}</StyledSelect></label>
      {error ? <p role="alert">{error}</p> : loading ? <p role="status">{text.loading}</p> : !selected && <p role="status">{text.required}</p>}
    </>}
    <small id={descriptionId}>{text.batch}</small>
  </div>;
}
