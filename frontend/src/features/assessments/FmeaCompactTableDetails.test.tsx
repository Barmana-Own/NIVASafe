import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect,vi,afterEach} from 'vitest';
import {LocaleProvider} from '../../i18n';
import {FmeaReportItemDetailsDialog} from './AssessmentPages';
afterEach(()=>vi.unstubAllGlobals());
describe('FMEA compact table details preservation',()=>{
 it('preserves full risk fields, scores and linked action states in read-only details',()=>{
 vi.stubGlobal('localStorage',{getItem:()=> 'en'});
 const item={id:'risk',rowNumber:1,processStep:'Process step',failureMode:'Failure mode',effect:'Full effect',cause:'Full cause',preventiveControls:'Prevention',detectionControls:'Detection',severity:6,occurrence:4,detection:5,rpn:120,riskLevel:'MEDIUM',recommendation:'Full recommendation',actionPriority:'HIGH',correctiveActions:[{id:'action',title:'<script>linked</script>',status:'COMPLETED',priority:'HIGH'}]};
 const html=renderToStaticMarkup(<LocaleProvider><FmeaReportItemDetailsDialog item={item} locale="en" canEdit={false} onComplete={()=>{}} onDelete={()=>{}} onClose={()=>{}} onEdit={()=>{}}/></LocaleProvider>);
 for(const value of ['Process step','Failure mode','Full effect','Full cause','Prevention','Detection','Full recommendation','120','Completed','High'])expect(html).toContain(value);
 expect(html).not.toContain('<script>');expect(html).toContain('&lt;script&gt;linked&lt;/script&gt;');expect(html).not.toContain('Edit risk row');expect(html).not.toContain('class="ghost"><svg');
 });
});
