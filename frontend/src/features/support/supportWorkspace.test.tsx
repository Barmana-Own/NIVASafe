import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../i18n";
import { SupportPage } from "./SupportPage";

afterEach(() => vi.unstubAllGlobals());
function render(globalRole: string, organizationRole = "HSE_SPECIALIST") {
  const session = { accessToken: "synthetic-only", refreshToken: "", user: { id: "synthetic-user", email: "synthetic@example.invalid", displayName: "Synthetic user", globalRole }, organizations: [{ id: "synthetic-org", role: organizationRole }] };
  vi.stubGlobal("localStorage", { getItem: (key: string) => key === "nivasafe-session" ? JSON.stringify(session) : key === "nivasafe-org" ? "synthetic-org" : key === "nivasafe-locale" ? "en" : null });
  vi.stubGlobal("sessionStorage", { getItem: () => null });
  return renderToStaticMarkup(<LocaleProvider><MemoryRouter initialEntries={["/support"]}><SupportPage/></MemoryRouter></LocaleProvider>);
}
describe("support workspace by account role", () => {
  it("gives a global administrator the customer ticket inbox at the existing support route", () => {
    const html = render("SUPER_ADMIN");
    expect(html).toContain("Ticket management");
    expect(html).toContain("support-inbox-section");
    expect(html).not.toContain("support-request-form");
  });
  it.each(["HSE_SPECIALIST", "ORG_ADMIN", "SUPER_ADMIN"])("keeps ordinary global users on their own requests even with organization role %s", role => {
    const html = render("USER", role);
    expect(html).toContain("support-request-form");
    expect(html).toContain("My requests");
    expect(html).not.toContain("support-inbox-section");
  });
});
