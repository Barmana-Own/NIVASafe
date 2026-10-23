import {describe,expect,it} from 'vitest';
import {authorizeRulaAutomaticImage,isRulaImageOwnershipValid,rulaImagePolicyErrorKey} from './rulaImageAnalysisPolicy';
import {ACCOUNT_IMAGE_CONSENT_VERSION} from '../account/imageProcessingPolicy';
import type {PostureImageAuthorization} from '../account/postureImageAuthorization';
const current={available:true,provider:'arvancloud',reasonCode:null,consentAccepted:true,consentVersion:ACCOUNT_IMAGE_CONSENT_VERSION};
const self={imageSubject:'SELF'} as const;
const grant:PostureImageAuthorization={id:'76024613-3cbc-4962-a812-fa7616fb2c7c',ownerUserId:'owner',ownerName:'Owner',recipientUserId:'uploader',recipientName:'Uploader',expiresAt:'2099-11-01T00:00:00.000Z',policyVersion:ACCOUNT_IMAGE_CONSENT_VERSION,status:'ACTIVE'};
describe('automatic RULA image authorization',()=>{
 it('uses the current account policy without sending per-image consent fields',()=>{
  const body=new FormData();
  authorizeRulaAutomaticImage(body,current,self);
  expect(body.get('imageSubject')).toBe('SELF');
  expect(body.has('ownerAuthorizationId')).toBe(false);
  expect(body.has('imageAnalysisConsent')).toBe(false);
  expect(body.has('imageAnalysisConsentVersion')).toBe(false);
 });
 it.each([null,{available:false,provider:'arvancloud',reasonCode:'privacy-approval-missing'},{available:true,provider:'another-provider',reasonCode:null}])('does not queue a disallowed automatic upload %#',policy=>{
  const body=new FormData();expect(()=>authorizeRulaAutomaticImage(body,policy,self)).toThrow();expect(body.has('imageAnalysisConsent')).toBe(false);
 });
 it.each(['privacy-approval-missing','vision-capability-unverified'])('omits the removed workspace notice while keeping dispatch blocked for %s',reasonCode=>{
  const policy={available:false,provider:'arvancloud',reasonCode};
  expect(rulaImagePolicyErrorKey(policy)).toBeNull();
  expect(()=>authorizeRulaAutomaticImage(new FormData(),policy,self)).toThrow('RULA_IMAGE_AI_UNAVAILABLE');
 });
 it('preserves account consent guidance and service failure feedback',()=>{
  expect(rulaImagePolicyErrorKey({available:false,provider:'arvancloud',reasonCode:'account-consent-required'})).toBe('assessment.rulaImageConsentRequired');
  expect(rulaImagePolicyErrorKey({available:false,provider:'arvancloud',reasonCode:'provider-unavailable'})).toBe('assessment.rulaImageAnalysisUnavailable');
  expect(rulaImagePolicyErrorKey(null)).toBe('assessment.rulaImageAnalysisUnavailable');
 });
 it.each([{...current,consentAccepted:false},{...current,consentVersion:'image-processing-account-2026-10-19-v1'}])('does not silently upgrade withdrawn or outdated consent %#',policy=>{
  const body=new FormData();expect(()=>authorizeRulaAutomaticImage(body,policy,self)).toThrow('IMAGE_PROCESSING_ACCOUNT_CONSENT_REQUIRED');expect(body.has('imageSubject')).toBe(false);
 });
 it('binds third-party requests to a current owner grant for this uploader',()=>{
  const body=new FormData();authorizeRulaAutomaticImage(body,current,{imageSubject:'THIRD_PARTY',ownerAuthorizationId:grant.id},[grant],'uploader');expect(body.get('imageSubject')).toBe('THIRD_PARTY');expect(body.get('ownerAuthorizationId')).toBe(grant.id);
 });
 it('rejects missing, revoked, expired, wrong-recipient and mixed ownership declarations before transfer',()=>{
  const thirdParty={imageSubject:'THIRD_PARTY',ownerAuthorizationId:grant.id} as const;
  for(const invalid of [{...grant,status:'REVOKED'},{...grant,expiresAt:'2000-01-01T00:00:00.000Z'},{...grant,recipientUserId:'other'}]) expect(()=>authorizeRulaAutomaticImage(new FormData(),current,thirdParty,[invalid],'uploader')).toThrow('RULA_IMAGE_OWNER_AUTHORIZATION_REQUIRED');
  expect(()=>authorizeRulaAutomaticImage(new FormData(),current,thirdParty,[],'uploader')).toThrow('RULA_IMAGE_OWNER_AUTHORIZATION_REQUIRED');
  expect(isRulaImageOwnershipValid({imageSubject:'SELF',ownerAuthorizationId:grant.id},[grant],'uploader')).toBe(false);expect(isRulaImageOwnershipValid({imageSubject:'THIRD_PARTY'},[grant],'uploader')).toBe(false);
 });
});
