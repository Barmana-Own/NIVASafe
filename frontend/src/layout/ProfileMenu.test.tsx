import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../i18n";
import { ProfileMenu } from "./ProfileMenu";

afterEach(() => vi.unstubAllGlobals());
function render(globalRole: "USER" | "SUPER_ADMIN") {
  const session = { accessToken: "synthetic-only", refreshToken: "", user: { id: "synthetic-user", email: "synthetic@example.invalid", displayName: "Synthetic Account", globalRole }, organizations: [{ id: "synthetic-org", role: "HSE_SPECIALIST" }] };
  vi.stubGlobal("localStorage", { getItem: (key: string) => key === "nivasafe-session" ? JSON.stringify(session) : key === "nivasafe-org" ? "synthetic-org" : key === "nivasafe-locale" ? "en" : null });
  vi.stubGlobal("sessionStorage", { getItem: () => null });
  return renderToStaticMarkup(<LocaleProvider><MemoryRouter><ProfileMenu/></MemoryRouter></LocaleProvider>);
}

describe("sidebar account shortcut", () => {
  it.each(["USER", "SUPER_ADMIN"] as const)("links the visible %s account identity directly to existing account settings", role => {
    const html = render(role);
    expect(html).toMatch(/<a\b[^>]*aria-label="Account and application settings"[^>]*href="\/profile"[^>]*>[\s\S]*?Synthetic Account[\s\S]*?<\/a>/);
    expect(html).toMatch(/<button\b[^>]*aria-haspopup="menu"[^>]*aria-expanded="false"/);
  });
});
