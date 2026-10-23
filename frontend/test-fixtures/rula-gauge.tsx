import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { calculateRula } from "@nivasafe/domain";
import { LocaleProvider } from "../src/i18n";
import { RulaPostureAnalysisStep, rulaInputsFromAnalysis } from "../src/features/assessments/AssessmentPages";
import { rulaGaugeAnalysis, type RulaGaugeState } from "./rula-gauge-data";
import "../src/styles.css";
import "../src/styles/enterprise.css";

const parameters = new URLSearchParams(location.search);
const locale = parameters.get("locale") === "fa" ? "fa" : "en";
const requested = parameters.get("state") as RulaGaugeState;
const state = ["pending", "partial", "low", "medium", "high", "critical"].includes(requested) ? requested : "partial";
localStorage.setItem("locale", locale);
document.documentElement.dir = locale === "fa" ? "rtl" : "ltr";
document.documentElement.lang = locale;
document.body.dataset.theme = parameters.get("theme") === "blue" ? "blue" : "white";

function Fixture() {
  const [photo, setPhoto] = useState(0);
  const right = rulaGaugeAnalysis(([state, "low", "high", "critical"] as const)[photo]);
  const left = rulaGaugeAnalysis((["critical", "medium", "partial", "pending"] as const)[photo]);
  const result = calculateRula(rulaInputsFromAnalysis(right, 0, false));
  const leftResult = calculateRula(rulaInputsFromAnalysis(left, 0, false));
  return <LocaleProvider><main style={{ padding: 16 }}><nav aria-label="Synthetic photo selection">{[0, 1, 2, 3].map(index => <button key={index} type="button" data-photo={index} onClick={() => setPhoto(index)}>Synthetic photo {index + 1}</button>)}</nav><RulaPostureAnalysisStep analysis={{ ...right, sideAnalyses: { RIGHT: right, LEFT: left } }} result={result} sideResults={{ RIGHT: result, LEFT: leftResult }} bodySide="BOTH" imagePreview="" postureDescription="" locale={locale} onChange={() => undefined}/></main></LocaleProvider>;
}
createRoot(document.getElementById("root")!).render(<Fixture/>);
