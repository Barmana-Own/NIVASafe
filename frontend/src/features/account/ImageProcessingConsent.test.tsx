import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../i18n";
import { PolicyAcceptanceFields } from "./ImageProcessingConsent";
import { ACCOUNT_IMAGE_CONSENT_VERSION, TERMS_VERSION, hasCurrentAccountImageConsent, imageProcessingCopy } from "./imageProcessingPolicy";
afterEach(()=>vi.unstubAllGlobals());
it.each(['fa','en'] as const)('keeps terms and optional identified-provider image consent separate, unchecked and linked in %s',locale=>{vi.stubGlobal('localStorage',{getItem:()=>locale});const html=renderToStaticMarkup(<LocaleProvider><MemoryRouter><PolicyAcceptanceFields termsAccepted={false} onTermsChange={()=>undefined} imageAccepted={false} onImageChange={()=>undefined}/></MemoryRouter></LocaleProvider>).replaceAll("&#x27;", "'");expect(html.match(/type="checkbox"/gu)).toHaveLength(2);expect(html).not.toContain('checked=""');expect(html).toContain('href="/terms"');expect(html).toContain('href="/privacy#assessment-images"');expect(html).toContain(imageProcessingCopy[locale].imageAgreement);expect(html).toMatch(/ArvanCloud|آروان/iu);expect(html.indexOf('id="image-processing-summary"')).toBeLessThan(html.indexOf('name="imageProcessingConsent"'));expect(html).toContain(imageProcessingCopy[locale].summary[1]);expect(html).not.toMatch(/name="imageProcessingConsent"[^>]*required/);});
it('does not silently renew an old or withdrawn consent receipt',()=>{expect(hasCurrentAccountImageConsent({accepted:true,policyVersion:ACCOUNT_IMAGE_CONSENT_VERSION})).toBe(true);expect(hasCurrentAccountImageConsent({accepted:true,policyVersion:'image-processing-account-2026-10-19-v1'})).toBe(false);expect(hasCurrentAccountImageConsent({accepted:true,policyVersion:'image-processing-account-2026-10-22-v2'})).toBe(false);expect(hasCurrentAccountImageConsent({accepted:false,policyVersion:ACCOUNT_IMAGE_CONSENT_VERSION})).toBe(false);expect(hasCurrentAccountImageConsent(null)).toBe(false);});
it('keeps account and terms versions aligned with the server contract without inferring registration consent',()=>{const source=readFileSync(new URL('../../../../backend/src/image-processing-consent.ts',import.meta.url),'utf8');expect(source).toContain(ACCOUNT_IMAGE_CONSENT_VERSION);expect(source).toContain(TERMS_VERSION);expect(imageProcessingCopy.en.termsParagraphs.join(' ')).toContain('does not grant');});
it.each(['fa','en'] as const)('identifies both assessment purposes and their recipient before optional consent in %s',locale=>{
  const copy=imageProcessingCopy[locale];
  for(const notice of [copy.imageAgreement,copy.summary[0],copy.paragraphs[0]]){
    expect(notice).toContain('RULA');expect(notice).toContain('FMEA');expect(notice).toContain('GPT-5-Mini');expect(notice).toMatch(/ArvanCloud|آروان/u);
  }
  const details=copy.summary[0]+' '+copy.paragraphs[0];
  expect(details).toMatch(/selected body side|سمت انتخابی بدن/u);expect(details).toMatch(/job title|عنوان شغل/u);expect(details).toMatch(/department|واحد/u);expect(details).toMatch(/activity description|شرح فعالیت/u);
});
it.each(['fa','en'] as const)('discloses unverified processing terms and keeps withdrawal and image ownership rights in %s',locale=>{
  const copy=imageProcessingCopy[locale],notice=copy.summary.join(' ')+' '+copy.paragraphs.join(' ');
  expect(copy.summary[1]).toMatch(/not yet verified|هنوز تأیید نشده/u);
  for(const condition of [/retention|نگهداری/u,/deletion|حذف/u,/training.use|استفادهٔ آموزشی/u,/processing.location|محل پردازش/u])expect(copy.summary[1]).toMatch(condition);
  expect(copy.paragraphs[3]).toMatch(/not yet verified|هنوز تأیید نشده/u);expect(copy.paragraphs[3]).toMatch(/not guaranteed|تضمین نشده/u);
  expect(notice).not.toMatch(/public transfer remains closed|ارسال عمومی انجام نمی‌شود|ارسال عمومی بسته است/u);
  expect(copy.summary[2]).toMatch(/withdraw|لغو/u);expect(copy.summary[2]).toMatch(/subsequent transfers|ارسال‌های بعدی/u);expect(copy.summary[2]).toMatch(/person's valid permission|مجوز معتبر همان فرد/u);
  expect(copy.paragraphs[4]).toMatch(/Manual assessment remains available|ارزیابی دستی.*در دسترس/u);
});
