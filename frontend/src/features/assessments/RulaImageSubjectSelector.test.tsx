import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../i18n";
import { ACCOUNT_IMAGE_CONSENT_VERSION } from "../account/imageProcessingPolicy";
import type { PostureImageAuthorization } from "../account/postureImageAuthorization";
import { RulaImageSubjectSelector, rulaImageOwnershipCopy } from "./RulaImageSubjectSelector";

const grant: PostureImageAuthorization = { id: "76024613-3cbc-4962-a812-fa7616fb2c7c", ownerUserId: "owner", ownerName: "Synthetic owner", recipientUserId: "uploader", recipientName: "Member", expiresAt: "2099-11-01T00:00:00.000Z", policyVersion: ACCOUNT_IMAGE_CONSENT_VERSION, status: "ACTIVE" };
afterEach(() => vi.unstubAllGlobals());
function render(props: Partial<Parameters<typeof RulaImageSubjectSelector>[0]> = {}, locale: "fa" | "en" = "fa") {
  vi.stubGlobal("localStorage", { getItem: () => locale });
  return renderToStaticMarkup(<LocaleProvider><RulaImageSubjectSelector value={{ imageSubject: "SELF" }} onChange={() => undefined} grants={[]} recipientUserId="uploader" loading={false} error="" {...props}/></LocaleProvider>);
}
it.each(["fa", "en"] as const)("defaults to own photos without a repeated processing checkbox in %s", locale => {
  const html = render({}, locale);
  expect(html).toContain('value="SELF" selected=""');
  expect(html).not.toContain('type="checkbox"');
  expect(html).not.toContain('name="ownerAuthorizationId"');
  expect(html).toContain(rulaImageOwnershipCopy[locale].batch);
});
it("offers only current grants belonging to the actual uploader", () => {
  const html = render({ value: { imageSubject: "THIRD_PARTY", ownerAuthorizationId: grant.id }, grants: [grant, { ...grant, id: "72d13442-84d2-4401-a7c7-93235fa00a39", ownerName: "Revoked owner", status: "REVOKED" }, { ...grant, id: "3b90ba47-e922-4614-8d4c-98030d0aa59a", ownerName: "Other recipient", recipientUserId: "other" }] });
  expect(html).toContain(grant.ownerName);
  expect(html).not.toContain("Revoked owner");
  expect(html).not.toContain("Other recipient");
  expect(html).toContain(`value="${grant.id}" selected=""`);
});
it("shows missing permission and safely displays a failed list load", () => {
  const empty = render({ value: { imageSubject: "THIRD_PARTY" } });
  expect(empty).toContain(rulaImageOwnershipCopy.fa.required);
  expect(empty).toContain('aria-invalid="true"');
  const failed = render({ value: { imageSubject: "THIRD_PARTY" }, error: "<unsafe>" });
  expect(failed).toContain('&lt;unsafe&gt;');
  expect(failed).not.toContain('<unsafe>');
  expect(failed).toContain('role="alert"');
});
