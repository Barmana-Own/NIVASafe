import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon, StatusBadge } from "../../components/UI";
import { useModalFocus } from "../../components/useModalFocus";
import { useI18n } from "../../i18n";
import type { FmeaReportActionSuggestion } from "./fmeaReportCollections";

export function FmeaSuggestedActionCard({ item, onRegister, onDismiss, dismissalBusy }: {
  item: FmeaReportActionSuggestion;
  onRegister?: () => void;
  onDismiss?: () => void;
  dismissalBusy: boolean;
}) {
  const { t, direction } = useI18n();
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLElement>(null);
  const titleId = useId();
  useModalFocus(dialog, open, () => setOpen(false));
  return <>
    <article className="report-action-row fmea-suggestion-card">
      <div className="report-action-icon" aria-hidden="true"><Icon name="sparkles" size={17}/></div>
      <div className="fmea-suggestion-copy" dir={direction}>
        <div className="fmea-corrective-suggestion-heading"><button type="button" className="fmea-suggestion-title" aria-label={`${t("report.readFullSuggestion")}: ${item.title}`} title={item.title} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>{item.title}</button></div>
        <small>{t("report.relatedRisk")}: {item.failureMode}</small>
        <small>{t("actions.assignee")}: {t("common.none")}</small>
      </div>
      <div className="fmea-suggestion-controls" dir={direction}>
        <StatusBadge value={item.priority}/><StatusBadge value="SUGGESTED"/>
        {onRegister && <button type="button" className="text-button" onClick={onRegister}>{t("report.useSuggestion")}</button>}
        {onDismiss && <button type="button" className="text-button danger-text" onClick={onDismiss} disabled={dismissalBusy}><Icon name="trash" size={12}/>{t("report.removeSuggestion")}</button>}
      </div>
    </article>
    {open && createPortal(<div className="fmea-report-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section ref={dialog} className="fmea-report-editor-dialog fmea-suggestion-detail" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} dir={direction}>
        <header><h2 id={titleId}>{t("report.readFullSuggestion")}</h2><button type="button" className="icon-button" aria-label={t("common.close")} onClick={() => setOpen(false)}><Icon name="close"/></button></header>
        <h3>{item.title}</h3><p>{item.description}</p>
        <dl><dt>{t("report.relatedRisk")}</dt><dd>{item.failureMode}</dd><dt>{t("actions.assignee")}</dt><dd>{t("common.none")}</dd></dl>
        <div className="fmea-suggestion-detail-badges"><StatusBadge value={item.priority}/><StatusBadge value="SUGGESTED"/></div>
        <p className="fmea-suggestion-review-hint">{t("report.suggestionReviewHint")}</p>
        <footer><button type="button" className="ghost" onClick={() => setOpen(false)}>{t("common.close")}</button>{onRegister && <button type="button" className="primary" onClick={() => { setOpen(false); onRegister(); }}>{t("report.useSuggestion")}</button>}</footer>
      </section>
    </div>, document.querySelector(".app") ?? document.body)}
  </>;
}
