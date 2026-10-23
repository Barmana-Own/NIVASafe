import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { LocaleProvider } from "../src/i18n";
import { SupportPage } from "../src/features/support/SupportPage";
import "../src/styles.css";
import "../src/styles/enterprise.css";

const parameters = new URLSearchParams(location.search);
const locale = parameters.get("locale") === "en" ? "en" : "fa";
const theme = parameters.get("theme") === "blue" ? "blue" : "white";
localStorage.setItem("nivasafe-locale", locale);
localStorage.setItem("nivasafe-session", JSON.stringify({
  accessToken: "synthetic-test-session", refreshToken: "synthetic-test-refresh",
  user: { id: "synthetic-support-user", email: "support-fixture@example.invalid", displayName: "Synthetic user", globalRole: parameters.get("role") === "customer" ? "USER" : "SUPER_ADMIN" },
  organizations: [{ id: "synthetic-support-org", nameFa: "سازمان آزمون", nameEn: "Synthetic organization", role: "HSE_SPECIALIST" }],
}));
localStorage.setItem("nivasafe-org", "synthetic-support-org");
document.documentElement.dir = locale === "fa" ? "rtl" : "ltr";
document.documentElement.lang = locale;
document.documentElement.dataset.theme = theme;
document.documentElement.style.colorScheme = theme === "blue" ? "dark" : "light";
document.body.dataset.theme = theme;

createRoot(document.getElementById("root")!).render(
  <LocaleProvider><BrowserRouter>
    <main style={{ padding: 16, marginInlineStart: innerWidth >= 1024 ? 280 : 0 }}><SupportPage/></main>
  </BrowserRouter></LocaleProvider>,
);
