import {useId,useRef,type ReactNode} from 'react';
import {Icon} from '../../components/UI';
import {useModalFocus} from '../../components/useModalFocus';
import {useI18n} from '../../i18n';

export function RulaImageReviewDialog({fileName,onClose,children}:{fileName:string;onClose:()=>void;children:ReactNode}){
 const {t}=useI18n(),id=useId(),ref=useRef<HTMLElement>(null);
 useModalFocus(ref,true,onClose);
 return <div className="rula-image-review-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}><section ref={ref} className="rula-image-review-dialog" role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1}><header><div><h2 id={id}>{t('assessment.rulaImageEdit')}</h2><p>{fileName}</p></div><button className="icon-button" type="button" aria-label={t('common.close')} onClick={onClose}><Icon name="close"/></button></header><div className="rula-image-review-content">{children}</div><footer><button className="primary" type="button" onClick={onClose}>{t('common.close')}</button></footer></section></div>;
}
