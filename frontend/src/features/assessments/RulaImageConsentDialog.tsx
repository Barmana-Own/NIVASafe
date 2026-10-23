import { useId, useRef, useState } from "react";
import { useModalFocus } from "../../components/useModalFocus";
import { useI18n } from "../../i18n";
import { RULA_IMAGE_CONSENT_VERSION, rulaImageConsentNotice } from "./rulaImageConsent";

export function RulaImageConsentDialog({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  const { locale } = useI18n();
  const notice = rulaImageConsentNotice[locale];
  const [agreed, setAgreed] = useState(false);
  const id = useId();
  const ref = useRef<HTMLElement>(null);
  useModalFocus(ref, true, onDecline);
  return <div className="rula-image-review-backdrop rula-image-consent-backdrop" role="presentation">
    <section ref={ref} className="rula-image-review-dialog rula-image-consent-dialog" role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1} data-consent-version={RULA_IMAGE_CONSENT_VERSION}>
      <header><h2 id={id}>{notice.title}</h2></header>
      <div className="rula-image-review-content"><div className="rula-consent-details">{notice.paragraphs.map(text => <p key={text}>{text}</p>)}</div>
        <label className="rula-consent-agreement"><input type="checkbox" checked={agreed} onChange={event => setAgreed(event.target.checked)}/><span>{notice.agreement}</span></label>
      </div>
      <footer><button type="button" className="ghost" onClick={onDecline}>{notice.decline}</button><button type="button" className="primary" disabled={!agreed} onClick={() => { if (agreed) onAccept(); }}>{notice.accept}</button></footer>
    </section>
  </div>;
}
