import {describe,expect,it} from 'vitest';
import {authorizeRulaAutomaticImage,rulaImagePolicyErrorKey} from './rulaImageAnalysisPolicy';
describe('automatic RULA image authorization',()=>{
 it('uses the current account policy without sending per-image consent fields',()=>{
  const body=new FormData();
  authorizeRulaAutomaticImage(body,{available:true,provider:'arvancloud',reasonCode:null});
  expect(body.has('imageAnalysisConsent')).toBe(false);
  expect(body.has('imageAnalysisConsentVersion')).toBe(false);
 });
 it.each([null,{available:false,provider:'arvancloud',reasonCode:'privacy-approval-missing'},{available:true,provider:'another-provider',reasonCode:null}])('does not queue a disallowed automatic upload %#',policy=>{
  const body=new FormData();expect(()=>authorizeRulaAutomaticImage(body,policy)).toThrow();expect(body.has('imageAnalysisConsent')).toBe(false);
 });
 it('identifies the actual server gate instead of mislabelling it as a provider transport outage',()=>{
  expect(rulaImagePolicyErrorKey({available:false,provider:'arvancloud',reasonCode:'privacy-approval-missing'})).toBe('assessment.rulaImagePlatformNotApproved');
 });
});
