import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DialogProvider } from "../../components/UI";
import { LocaleProvider } from "../../i18n";
import { AdminPanelPage, OrganizationAdminPanelPage } from "./AdminPanelPage";

afterEach(() => vi.unstubAllGlobals());
function render(organization = false, locale = "en") {
  const session = { accessToken: "synthetic-only", refreshToken: "", user: { id: "synthetic-user", email: "synthetic@example.invalid", displayName: "Synthetic user", globalRole: organization ? "USER" : "SUPER_ADMIN" }, organizations: [{ id: "synthetic-org", role: "ORG_ADMIN" }] };
  vi.stubGlobal("localStorage", { getItem: (key: string) => key === "nivasafe-session" ? JSON.stringify(session) : key === "nivasafe-org" ? "synthetic-org" : key === "nivasafe-locale" ? locale : null });
  vi.stubGlobal("sessionStorage", { getItem: () => null });
  return renderToStaticMarkup(<LocaleProvider><MemoryRouter initialEntries={["/admin"]}><DialogProvider>{organization ? <OrganizationAdminPanelPage/> : <AdminPanelPage/>}</DialogProvider></MemoryRouter></LocaleProvider>);
}
describe("administration workspace support deduplication", () => {
  it.each(["en", "fa"])("keeps the four global administration tabs and panels in %s", locale => {
    const html = render(false, locale);
    expect([...html.matchAll(/id="global-admin-tab-([a-z]+)"/gu)].map(match => match[1])).toEqual(["users", "requests", "ai", "overview"]);
    expect([...html.matchAll(/id="global-admin-panel-([a-z]+)"/gu)].map(match => match[1])).toEqual(["users", "requests", "ai", "overview"]);
    expect(html).not.toContain("support-inbox-section");
    expect(html).not.toContain("global-admin-tab-support");
    expect(html).not.toContain("global-admin-panel-support");
  });
  it("preserves the organization administrator's two existing tabs", () => {
    const html = render(true);
    expect([...html.matchAll(/role="tab"/gu)]).toHaveLength(2);
    expect(html).not.toContain("support-inbox-section");
  });
});
