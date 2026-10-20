import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {Icon} from '../../components/UI';
import './rula-mobile-table.css';
export type CompactAssessmentRow={id:string;label:string;side?:string;preview:string;meta:string;score:ReactNode;level:ReactNode;onOpen:()=>void};
export function CompactMobileAssessmentRows({rows,scoreLabel,levelLabel,label}:{rows:CompactAssessmentRow[];scoreLabel:string;levelLabel:string;label:string}){
 const[mobile,setMobile]=useState(false);useEffect(()=>{const media=matchMedia('(max-width:768px)');const update=()=>setMobile(media.matches);update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update)},[]);
 if(!mobile)return null;
 return <div className="rula-mobile-ui compact-assessment-mobile"><div className="rm-table"><div className="rm-table-head"><span>{label}</span><span>{scoreLabel}</span><span>{levelLabel}</span><span/></div>{rows.map(row=><button type="button" key={row.id} className="rm-row" data-mobile-row-id={row.id} aria-label={label+': '+row.label} onClick={row.onOpen}><span className="rm-row-copy"><span className="rm-part"><span><strong>{row.label}</strong>{row.side&&<small className="rm-body-side">{row.side}</small>}</span></span><span className="rm-preview">{row.preview}</span><small>{row.meta}</small></span><strong className="rm-score">{row.score}</strong><span className="rm-share compact-level">{row.level}</span><Icon name="arrow" size={16}/></button>)}</div></div>
}
export function useMobileAssessment() {
 const [mobile, setMobile] = useState(false);
 useEffect(() => { const media = matchMedia('(max-width:768px)'); const update = () => setMobile(media.matches); update(); media.addEventListener('change', update); return () => media.removeEventListener('change', update); }, []);
 return mobile;
}
export function MobileAssessmentDetails({title,closeLabel,onClose,children,footer,rowLabel,subtitle,navigation}:{title:string;closeLabel:string;onClose:()=>void;children:ReactNode;footer?:ReactNode;rowLabel?:string;subtitle?:string;navigation?:ReactNode}) {
 const ref=useRef<HTMLDialogElement>(null);const id=useId();const closeRef=useRef(onClose);closeRef.current=onClose;
 useEffect(()=>{const dialog=ref.current;const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog?.showModal();const media=matchMedia('(max-width:768px)');const resize=()=>{if(!media.matches)closeRef.current()};media.addEventListener('change',resize);return()=>{media.removeEventListener('change',resize);dialog?.close();document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus()}},[]);
 useEffect(()=>{const body=ref.current?.querySelector(".rm-detail-body");if(body)body.scrollTop=0},[rowLabel]);
 return <dialog ref={ref} className="rula-mobile-ui rm-detail compact-assessment-dialog" aria-labelledby={id} onKeyDown={event=>{if(event.key !== "Tab")return;const buttons=[...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not([disabled])')];const first=buttons[0],last=buttons.at(-1);if(event.shiftKey && document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first?.focus()}}} onCancel={event=>{event.preventDefault();onClose()}}><header className="rm-header"><button type="button" className="rm-icon" aria-label={closeLabel} onClick={onClose}><Icon name="arrow"/></button><div><h3 id={id}>{title}</h3>{subtitle&&<small>{subtitle}</small>}</div>{rowLabel&&<span className="rm-pill">{rowLabel}</span>}</header><div className="rm-detail-body">{children}</div>{footer&&<footer className="rm-detail-footer">{footer}{navigation}</footer>}</dialog>
}

export function MobileDetailNavigation({previous,next,label,locale}:{previous?:()=>void;next?:()=>void;label:string;locale:"fa"|"en"}) { return <nav className="rm-navigation"><button type="button" className="rm-icon" disabled={!previous} aria-label={locale === "fa" ? "ردیف قبلی" : "Previous row"} onClick={previous}><Icon name="arrow"/></button><span>{label}</span><button type="button" className="rm-icon" disabled={!next} aria-label={locale === "fa" ? "ردیف بعدی" : "Next row"} onClick={next}><Icon name="arrow"/></button></nav>; }
