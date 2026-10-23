import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../i18n";
import { ACCOUNT_IMAGE_CONSENT_VERSION } from "./imageProcessingPolicy";
import { api, getSession, useLoad } from "../../api/client";
import { PostureImageAuthorizations, issuePostureImageAuthorization, postureImageAuthorizationInputError, revokePostureImageAuthorization } from "./PostureImageAuthorizations";
import { isUsablePostureImageAuthorization, type PostureImageAuthorization } from "./postureImageAuthorization";

vi.mock("../../api/client", () => ({ api: vi.fn(), getSession: vi.fn(), useLoad: vi.fn(), getCurrentLocale: () => localStorage.getItem("nivasafe-locale") === "fa" ? "fa" : "en", directionForLocale: (locale: string) => locale === "fa" ? "rtl" : "ltr" }));

const id = "e10745a2-bcba-4a2e-8969-45210381309c";
const now = Date.parse("2026-10-22T10:00:00.000Z");
const grant: PostureImageAuthorization = { id, ownerUserId: "owner", ownerName: "Image owner", recipientUserId: "recipient", recipientName: "Member", expiresAt: "2026-11-21T10:00:00.000Z", policyVersion: ACCOUNT_IMAGE_CONSENT_VERSION, status: "ACTIVE" };

beforeEach(() => {
  vi.mocked(api).mockReset();
  vi.mocked(getSession).mockReturnValue({ orgId: "synthetic-org", session: { user: { id: "owner", email: "owner@example.test", displayName: "Owner" }, accessToken: "synthetic", refreshToken: "synthetic", organizations: [] } });
  vi.mocked(useLoad).mockReturnValue({ data: { grants: [grant] }, error: "", loading: false, reload: vi.fn() });
  vi.stubGlobal("localStorage", { getItem: () => "en" });
});
afterEach(() => vi.unstubAllGlobals());

describe("received posture-image authorization filter", () => {
  it("accepts only a current active owner grant for the actual recipient", () => {
    expect(isUsablePostureImageAuthorization(grant, "recipient", now)).toBe(true);
    expect(isUsablePostureImageAuthorization(grant, "another-user", now)).toBe(false);
    expect(isUsablePostureImageAuthorization({ ...grant, ownerUserId: "recipient" }, "recipient", now)).toBe(false);
  });
  it.each(["REVOKED", "EXPIRED", "CONSENT_REQUIRED", "POLICY_OUTDATED", "MEMBERSHIP_INACTIVE", "UNKNOWN"])("rejects %s", status => {
    expect(isUsablePostureImageAuthorization({ ...grant, status }, "recipient", now)).toBe(false);
  });
  it("rejects expired, malformed and outdated declarations", () => {
    expect(isUsablePostureImageAuthorization({ ...grant, expiresAt: new Date(now).toISOString() }, "recipient", now)).toBe(false);
    expect(isUsablePostureImageAuthorization({ ...grant, expiresAt: "invalid" }, "recipient", now)).toBe(false);
    expect(isUsablePostureImageAuthorization({ ...grant, id: "../some-other-object" }, "recipient", now)).toBe(false);
    expect(isUsablePostureImageAuthorization({ ...grant, policyVersion: "image-processing-account-2026-10-19-v1" }, "recipient", now)).toBe(false);
  });
});

describe("owner grant mutations", () => {
  it("keeps invalid email and expiry values away from the API", async () => {
    expect(postureImageAuthorizationInputError({ recipientEmail: "member", expiresInDays: 30 })).toBe("recipient");
    for (const days of [0, 91, 1.5, NaN]) {
      expect(postureImageAuthorizationInputError({ recipientEmail: "member@example.test", expiresInDays: days })).toBe("expiry");
      await expect(issuePostureImageAuthorization({ recipientEmail: "member@example.test", expiresInDays: days }, true)).rejects.toThrow("INVALID_POSTURE_IMAGE_AUTHORIZATION");
    }
    expect(api).not.toHaveBeenCalled();
  });
  it("requires saved current consent before creating a grant", async () => {
    await expect(issuePostureImageAuthorization({ recipientEmail: "member@example.test", expiresInDays: 30 }, false)).rejects.toThrow("IMAGE_PROCESSING_ACCOUNT_CONSENT_REQUIRED");
    expect(api).not.toHaveBeenCalled();
  });
  it("creates a grant with the exact email and current policy, without an arbitrary actor or organization", async () => {
    vi.mocked(api).mockResolvedValue({ data: grant });
    expect(await issuePostureImageAuthorization({ recipientEmail: "  Member@example.test  ", expiresInDays: 30 }, true)).toEqual(grant);
    expect(api).toHaveBeenCalledWith("/profile/posture-image-authorizations", { method: "POST", body: JSON.stringify({ recipientEmail: "Member@example.test", policyVersion: ACCOUNT_IMAGE_CONSENT_VERSION, expiresInDays: 30 }) });
  });
  it("revokes the selected UUID and rejects path-like client references", async () => {
    vi.mocked(api).mockResolvedValue({ data: null });
    await revokePostureImageAuthorization(id);
    expect(api).toHaveBeenCalledWith(`/profile/posture-image-authorizations/${id}`, { method: "DELETE" });
    await expect(revokePostureImageAuthorization("../../another-resource")).rejects.toThrow("INVALID_POSTURE_IMAGE_AUTHORIZATION");
    expect(api).toHaveBeenCalledTimes(1);
  });
});

describe("account owner grant controls", () => {
  it("uses the current organization endpoint and a bounded 30-day default", () => {
    const html = renderToStaticMarkup(<LocaleProvider><PostureImageAuthorizations accepted/></LocaleProvider>);
    expect(useLoad).toHaveBeenCalledWith("/profile/posture-image-authorizations?direction=issued", [true, "synthetic-org", "owner"]);
    expect(html).toContain('name="recipientEmail"');
    expect(html).toContain('name="expiresInDays"');
    expect(html).toContain('min="1" max="90" step="1"');
    expect(html).toContain('value="30"');
    expect(html).toContain("Grant permission for my photos");
    expect(html).not.toContain('type="checkbox"');
  });
  it("blocks creation without consent while preserving revocation of issued grants", () => {
    const html = renderToStaticMarkup(<LocaleProvider><PostureImageAuthorizations accepted={false}/></LocaleProvider>);
    expect(html).toMatch(/<fieldset[^>]*disabled/);
    expect(html).toContain("Save your image-processing consent");
    expect(html).toContain("Revoke permission");
    expect(html).not.toContain("analysis is active");
  });
  it("escapes recipient text and does not expose grants belonging to another owner", () => {
    vi.mocked(useLoad).mockReturnValue({ data: { grants: [{ ...grant, recipientName: '<img src="x" onerror="attack()">' }, { ...grant, id: "4bfe1447-e4b1-459a-a897-b478012dfb03", ownerUserId: "another-owner", recipientName: "Hidden member" }] }, error: "", loading: false, reload: vi.fn() });
    const html = renderToStaticMarkup(<LocaleProvider><PostureImageAuthorizations accepted/></LocaleProvider>);
    expect(html).toContain("&lt;img");
    expect(html).not.toContain('<img src="x"');
    expect(html).not.toContain("Hidden member");
  });
  it("does not offer organization-scoped grants without an active workspace", () => {
    vi.mocked(getSession).mockReturnValue({ orgId: "", session: null });
    const html = renderToStaticMarkup(<LocaleProvider><PostureImageAuthorizations accepted={false}/></LocaleProvider>);
    expect(useLoad).toHaveBeenCalledWith(null, [false, "", ""]);
    expect(html).toContain("Select an active organization");
    expect(html).not.toContain('name="recipientEmail"');
  });
  it("keeps unavailable list data explicit instead of presenting a successful or active permission", () => {
    vi.mocked(useLoad).mockReturnValue({ data: null, error: "The permission list is unavailable.", loading: false, reload: vi.fn() });
    const html = renderToStaticMarkup(<LocaleProvider><PostureImageAuthorizations accepted/></LocaleProvider>);
    expect(html).toContain('role="alert"');
    expect(html).toContain("The permission list is unavailable.");
    expect(html).not.toContain("Permission recorded.");
    expect(html).not.toContain("Revoke permission");
  });
  it("renders the consent guidance and form labels in Persian without another consent checkbox", () => {
    vi.stubGlobal("localStorage", { getItem: () => "fa" });
    const html = renderToStaticMarkup(<LocaleProvider><PostureImageAuthorizations accepted={false}/></LocaleProvider>);
    expect(html).toContain("مجوز استفاده از تصاویر من");
    expect(html).toContain("ایمیل دقیق دریافت‌کنندهٔ مجوز");
    expect(html).toContain("ابتدا رضایت پردازش تصویر خود را ذخیره کنید");
    expect(html).not.toContain('type="checkbox"');
  });
});
