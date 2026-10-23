import React from "react";
import { createRoot } from "react-dom/client";
import { LocaleProvider } from "../src/i18n";
import { AssistantPage } from "../src/features/assistant/AssistantPage";
import "../src/styles.css";
import "../src/styles/enterprise.css";

const parameters = new URLSearchParams(location.search);
const locale = parameters.get("locale") === "en" ? "en" : "fa";
const theme = parameters.get("theme") === "blue" ? "blue" : "white";
localStorage.setItem("nivasafe-locale", locale);
document.documentElement.dir = locale === "fa" ? "rtl" : "ltr";
document.documentElement.lang = locale;
document.documentElement.dataset.theme = theme;
document.documentElement.style.colorScheme = theme === "blue" ? "dark" : "light";
document.body.dataset.theme = theme;

createRoot(document.getElementById("root")!).render(
  <LocaleProvider><main style={{ height: "100dvh", padding: 16 }}><AssistantPage/></main></LocaleProvider>,
);
