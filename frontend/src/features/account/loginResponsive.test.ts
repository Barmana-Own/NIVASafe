import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const readSource = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const stylesSource = readSource("../../styles.css");
const authenticationStylesSource = readSource("../../styles/authentication.css");
const accountPagesSource = readSource("./AccountPages.tsx");

describe("responsive login entry", () => {
  it("keeps mobile authentication controls at an iOS zoom-safe font size", () => {
    expect(authenticationStylesSource).toContain('.login .login-card :is(input:where(:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="range"]):not([type="hidden"])), textarea, select) { font-size: 16px; }');
  });

  it("keeps the login route and mobile login form inside the viewport", () => {
    expect(authenticationStylesSource).toContain("html:has(.login:not(.simple):not(.register-page))");
    expect(authenticationStylesSource).toContain("body:has(.login:not(.simple):not(.register-page)) #root");
    expect(authenticationStylesSource).toContain(".login:not(.simple):not(.register-page) {");
    expect(authenticationStylesSource).toContain("height: 100dvh;");
    expect(authenticationStylesSource).toContain("max-height: 100dvh;");
    expect(authenticationStylesSource).toContain("overflow: hidden !important;");
    expect(authenticationStylesSource).toContain(".login:not(.simple):not(.register-page) .login-card { min-height: 0; max-height: calc(100dvh - 2rem); overflow-y: auto;");
    expect(authenticationStylesSource).toContain(".login.mobile-login-form-visible:not(.simple):not(.register-page) .login-art { display: none;");
    expect(authenticationStylesSource).toContain(".login.mobile-login-form-visible:not(.simple):not(.register-page) .login-card {");
    expect(stylesSource).toContain(".login:not(.mobile-login-form-visible):not(.simple):not(.register-page) .login-toolbar-brand { display: none;");
    expect(authenticationStylesSource).toMatch(/\.login:not\(\.mobile-login-form-visible\):not\(\.simple\):not\(\.register-page\) \.login-toolbar-brand\s*\{\s*display: inline-flex;/);
    expect(stylesSource).not.toContain(".login.mobile-login-form-visible:not(.simple):not(.register-page) .login-toolbar-brand { display: none;");
  });

  it("keeps the white-theme hero image visible and centers its introduction", () => {
    expect(stylesSource).toContain("rgba(255, 255, 255, .56) 0%, rgba(238, 247, 255, .46) 48%, rgba(218, 238, 251, .34) 100%");
    expect(stylesSource).toContain(".login-hero-content { width: min(820px, 100%); flex: 1 1 auto; min-height: 0; margin-top: 16px; position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;");
    expect(stylesSource).toContain(".login-art h1 { margin: 0; max-width: 100%; font: 850 clamp(1.75rem, 2.55vw, 2.75rem)/1.22 \"Vazirmatn\", Tahoma, sans-serif; letter-spacing: -.03em; direction: rtl; text-align: center;");
    expect(stylesSource).toContain(".login-features span { display: flex; align-items: flex-start; justify-content: center;");
    expect(authenticationStylesSource).toContain(".login .login-hero-content { justify-content: center; align-items: center;");
    expect(authenticationStylesSource).toContain(".login .login-art h1 { font-size: clamp(1.8rem, 2.6vw, 2.7rem); line-height: 1.65; color: #fff; text-align: center;");
    expect(authenticationStylesSource).toContain("linear-gradient(150deg, rgba(255, 255, 255, .56) 0%, rgba(238, 247, 255, .46) 48%, rgba(218, 238, 251, .34) 100%), url(\"/brand/login-hse-background.png\")");
  });

  it("opens the login route after the mobile art selector and keeps registration on its route", () => {
    expect(accountPagesSource).toContain('const mobileLoginFormVisible = location.hash === "#login-form";');
    expect(accountPagesSource).toContain('nav({ pathname: "/login", search: location.search, hash: "#login-form" });');
    expect(accountPagesSource).toContain('<Link className="primary" to={{ pathname: "/login", search: location.search, hash: "#login-form" }} onClick={openMobileLogin}>');
    expect(accountPagesSource).toContain('<Link className="login-secondary-cta" to="/register">');
    expect(stylesSource).toContain(".login:not(.mobile-login-form-visible) { display: block; }");
    expect(stylesSource).toContain(".login:not(.mobile-login-form-visible):not(.register-page) .login-card { display: none; }");
    expect(stylesSource).toContain(".login.mobile-login-form-visible .login-art { display: none; }");
    expect(authenticationStylesSource).toContain(".login .login-art { order: 1;");
    expect(authenticationStylesSource).toContain(".login:not(.simple):not(.mobile-login-form-visible):not(.register-page) .login-card { display: none;");
    expect(authenticationStylesSource).toContain(".login.mobile-login-form-visible .login-card { display: flex; order: 2;");
  });

  it("keeps the login header logo, links, and appearance controls in separate RTL/LTR regions", () => {
    expect(accountPagesSource).toContain('<nav className="login-toolbar" aria-label={t("auth.links")}');
    expect(accountPagesSource).toContain('className="login-toolbar-icon" src="/brand/nivasafe-icon.png"');
    expect(accountPagesSource).not.toContain('className="login-toolbar-wordmark"');
    expect(accountPagesSource).not.toContain('className="login-mobile-brand-wordmark"');
    expect(accountPagesSource).toContain('className="login-toolbar-icon" src="/brand/nivasafe-icon.png" alt={brandAltForLocale(locale)}');
    expect(accountPagesSource).toContain('<AuthAppearanceControls/>');
    expect(authenticationStylesSource).toContain("grid-template-columns: auto minmax(0, 1fr) auto;");
    expect(authenticationStylesSource).toContain(".login .login-toolbar-links { grid-column: 2;");
    expect(authenticationStylesSource).toContain(".login .login-toolbar .auth-appearance-controls { grid-column: 3;");
    expect(authenticationStylesSource).toMatch(/grid-template-columns: minmax\(0, 1fr\) auto;\s*grid-template-rows: 36px 20px;/);
    expect(authenticationStylesSource).toMatch(/grid-column: 1 \/ -1;\s*grid-row: 2;\s*display: flex;\s*flex-wrap: nowrap;\s*justify-content: flex-start;/);
    expect(authenticationStylesSource).toMatch(/\.login:not\(\.mobile-login-form-visible\):not\(\.simple\):not\(\.register-page\) \.login-toolbar \.auth-appearance-controls\s*\{\s*grid-column: 2;\s*grid-row: 1;/);
    expect(authenticationStylesSource).toMatch(/\.login:not\(\.mobile-login-form-visible\):not\(\.simple\):not\(\.register-page\) \.login-mobile-brand\s*\{\s*display: none;/);
  });

  it("keeps phone entry navigation and brand on one row without altering tablet, desktop or form rules", () => {
    const phoneRules = authenticationStylesSource.split("/* Phone login entry: one toolbar row and subject-preserving photo crop. */")[1];
    expect(phoneRules).toBeDefined();
    expect(phoneRules).toMatch(/^\s*@media \(max-width: 760px\)/);
    expect(phoneRules).toMatch(/\.login:not\(\.mobile-login-form-visible\):not\(\.simple\):not\(\.register-page\) \.login-toolbar-links\s*\{[^}]*grid-column: 2;[^}]*grid-row: 1;/s);
    expect(phoneRules).toContain("background-position: left center;");
    expect(phoneRules).toContain("background-size: cover;");
    expect(phoneRules).not.toContain("@media (min-width:");
  });
});
