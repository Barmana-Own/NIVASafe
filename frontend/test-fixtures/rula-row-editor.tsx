import { useState } from "react";
import { createRoot } from "react-dom/client";
import { LocaleProvider } from "../src/i18n";
import { RulaReportDataTable } from "../src/features/assessments/AssessmentPages";
import "../src/styles.css";
const posture = { angle: 20, score: 2, detected: true, source: "AI" as const, confirmedByUser: false };
type Props = Parameters<typeof RulaReportDataTable>[0];
function Fixture() {
  const [analysis, setAnalysis] = useState<Props["analysis"]>({ upperArm: posture, lowerArm: posture, wrist: posture, wristTwist: posture, neck: posture, trunk: posture, legs: posture });
  const [actions, setActions] = useState<Props["selectedActions"]>([{ id: "a", titleFa: "اقدام آزمایشی", titleEn: "Test action", descriptionFa: "توضیح آزمایشی", descriptionEn: "Test description", priority: "LOW", status: "IN_PROGRESS", scoreReduction: 1, affectedParts: ["neck"] }, { id: "general", titleFa: "اقدام عمومی", titleEn: "General action", descriptionFa: "توضیح اقدام عمومی", descriptionEn: "General description", priority: "LOW", status: "IN_PROGRESS", scoreReduction: 0, affectedParts: [] }]);
  const [events, setEvents] = useState<string[]>([]);
  const [fullControls, setFullControls] = useState(false);
  const [failPosture, setFailPosture] = useState(false);
  return <main style={{ margin: 20, width: "calc(100% - 40px)" }}><button type="button" id="full-controls" onClick={() => setFullControls(true)}>Enable all fields</button><button type="button" id="fail-posture" onClick={() => setFailPosture(true)}>Fail next posture save</button><output id="events">{JSON.stringify(events)}</output><form onSubmit={event => { event.preventDefault(); setEvents(current => [...current, "unexpected-outer-submit"]); }}><RulaReportDataTable analysis={analysis} factors={[]} selectedActions={actions} locale="fa" onSavePosture={async (part, row) => { if (failPosture) { setFailPosture(false); throw new Error("Synthetic posture save failure"); } setAnalysis(current => ({ ...current, [part]: row })); setEvents(current => [...current, `posture:${part}:${row.score}`]); }} onUpdateAction={async action => { setActions(current => current.map(item => item.id === action.id ? action : item)); setEvents(current => [...current, `action:${action.id}:${action.titleFa}`]); }} onSaveDetails={fullControls ? async (details, part, row) => { setAnalysis(current => ({ ...current, ...(part && row ? { [part]: row } : {}), evaluationRows: [...(current.evaluationRows ?? []).filter(item => item.id !== details.id), details] })); setEvents(current => [...current, `details:${details.id}:${details.status ?? ""}:${details.deleted ?? false}`]); } : undefined} onCompleteAction={() => {}}/></form></main>;
}
localStorage.setItem("nivasafe-locale", "fa");
createRoot(document.getElementById("root")!).render(<LocaleProvider><Fixture/></LocaleProvider>);
