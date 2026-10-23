import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { LocaleProvider } from "./i18n";
import { AppearanceProvider } from "./AppearanceProvider";
import { installUnsavedChangesGuard } from "./components/useUnsavedChanges";
import "./styles.css";
import "./styles/enterprise.css";
import "./styles/responsive-tables.css";
import "./styles/login-desktop-branding.css";
import "./styles/login-mobile-branding.css";
import "./styles/login-white-typography.css";

installUnsavedChangesGuard();
createRoot(document.getElementById("root")!).render(<React.StrictMode><AppearanceProvider><LocaleProvider><App /></LocaleProvider></AppearanceProvider></React.StrictMode>);
