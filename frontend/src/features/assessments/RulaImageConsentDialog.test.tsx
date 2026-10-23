import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../i18n";
import { RulaImageConsentDialog } from "./RulaImageConsentDialog";
import { RULA_IMAGE_CONSENT_VERSION, rulaImageConsentNotice } from "./rulaImageConsent";

afterEach(() => vi.unstubAllGlobals());

it.each(["fa", "en"] as const)("requires an unchecked explicit agreement before transfer in %s", locale => {
  vi.stubGlobal("localStorage", { getItem: () => locale });
  const html = renderToStaticMarkup(<LocaleProvider><RulaImageConsentDialog onAccept={() => undefined} onDecline={() => undefined}/></LocaleProvider>);
  expect(html).toContain('role="dialog"');
  expect(html).toContain('type="checkbox"');
  expect(html).not.toContain('checked=""');
  expect(html).toMatch(/class="primary" disabled=""/);
  expect(html).toContain(rulaImageConsentNotice[locale].decline);
  expect(html).toContain(RULA_IMAGE_CONSENT_VERSION);
  expect(html).toContain("ArvanCloud");
  expect(html).toContain("GPT-5-Mini");
});

it("keeps the account authorization version synchronized across the active transfer contract", () => {
  const policy = readFileSync(new URL("../../../../backend/src/image-processing-consent.ts", import.meta.url), "utf8");
  const client = readFileSync(new URL("../account/imageProcessingPolicy.ts", import.meta.url), "utf8");
  const routes = readFileSync(new URL("../../../../backend/src/modules/assessments.ts", import.meta.url), "utf8");
  const version = policy.match(/ACCOUNT_IMAGE_CONSENT_VERSION = "([^"]+)"/u)?.[1];
  expect(version).toBeTruthy();
  expect(client).toContain(`ACCOUNT_IMAGE_CONSENT_VERSION = "${version}"`);
  expect(routes).toContain('const currentConsent = await assertAccountImageConsent(userId)');
  expect(routes).toContain('accountConsentVersion: currentConsent.policyVersion, consentRecordId: currentConsent.recordId!');
  expect(routes).toContain('beforeImageTransfer: () => authorizeTransfer(true)');
  expect(routes).toContain('transferAuthorization.consentRecordId !== auditedAuthorization.consentRecordId');
});

it("does not promise unverified provider retention, deletion or training terms", () => {
  expect(rulaImageConsentNotice.fa.paragraphs.join(" ")).toContain("هنوز برای این سامانه تأیید نشده");
  expect(rulaImageConsentNotice.en.paragraphs.join(" ")).toContain("have not yet been verified");
  expect(rulaImageConsentNotice.en.paragraphs.join(" ")).toContain("anatomical accuracy is not independently validated");
});
