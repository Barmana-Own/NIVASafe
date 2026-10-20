import type { ReactNode } from "react";
import { Icon } from "../../components/UI";
import { useI18n } from "../../i18n";
import type { RulaPhotoReviewStatus } from "./rulaImageReviewFlow";

type Props = {
  index: number;
  selected: boolean;
  status: RulaPhotoReviewStatus;
  preview?: string;
  blocked?: boolean;
  editDisabled?: boolean;
  errorMessage?: string;
  model?: string;
  onSelect: () => void;
  onEdit: () => void;
  onRemove?: () => void;
  onRetry?: () => void;
  children?: ReactNode;
};

const statusKeys: Record<RulaPhotoReviewStatus, string> = {
  queued: "assessment.rulaImageStatusQueued",
  loading: "assessment.rulaImageStatusWorking",
  ready: "assessment.rulaImageStatusReady",
  error: "assessment.rulaImageStatusFailed",
  cancelled: "assessment.rulaImageStatusCancelled",
};

export function RulaPostureImageCard({ index, selected, status, preview, blocked = false, editDisabled = false, errorMessage, model, onSelect, onEdit, onRemove, onRetry, children }: Props) {
  const { t, locale } = useI18n();
  const label = t("assessment.rulaImageNumber", { number: index.toLocaleString(locale === "fa" ? "fa-IR" : "en-US") });
  const pending = status === "queued" || status === "loading";
  return <article className={`rula-posture-image-card rula-compact-image-card${selected ? " is-selected" : ""}`} data-analysis-state={blocked ? "not-sent" : status} aria-busy={pending}>
    <div className="rula-image-card-header"><strong>{label}</strong><small className={`rula-image-review-status ${blocked ? "not-sent" : status}`} role="status">{t(blocked ? "assessment.rulaImageStatusNotSent" : statusKeys[status])}</small></div>
    <button type="button" className="rula-posture-image-select" aria-label={label} aria-pressed={selected} onClick={onSelect}>
      {preview ? <img src={preview} alt=""/> : <Icon name="files" size={32}/>}
    </button>
    <div className="rula-image-card-actions">
      <button type="button" className="secondary rula-image-edit" disabled={editDisabled || pending} onClick={onEdit}><Icon name="edit" size={16}/>{t("assessment.rulaImageEdit")}</button>
      {!blocked && onRetry && <button type="button" className="text-button" onClick={onRetry}>{t("assessment.rulaImageRetryShort")}</button>}
      {onRemove && <button type="button" className="text-button" onClick={onRemove}>{t("assessment.removePostureImage")}</button>}
    </div>
    {!blocked && errorMessage && <small className="rula-image-review-error" role="alert">{errorMessage}</small>}
    {(model || children) && <div className="rula-posture-image-card-meta">{model && <small dir="ltr">{model}</small>}{children}</div>}
  </article>;
}
