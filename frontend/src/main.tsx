import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { LocaleProvider } from "./i18n";
import { AppearanceProvider } from "./AppearanceProvider";
import { installUnsavedChangesGuard } from "./components/useUnsavedChanges";
import "./styles.css";
import "./styles/enterprise.css";
import "./styles/responsive-tables.css";
import "./styles/touch-targets.css";

installUnsavedChangesGuard();
createRoot(document.getElementById("root")!).render(<React.StrictMode><AppearanceProvider><LocaleProvider><App /></LocaleProvider></AppearanceProvider></React.StrictMode>);
