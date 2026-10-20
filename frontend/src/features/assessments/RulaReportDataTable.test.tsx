import { readFileSync, writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../i18n";
import { RulaReportDataTable } from "./AssessmentPages";

type Props = Parameters<typeof RulaReportDataTable>[0];
const posture = { angle: 25, score: 2, detected: true, source: "AI" as const, confirmedByUser: false };
const analysis: Props["analysis"] = { upperArm: posture, lowerArm: posture, wrist: posture, wristTwist: posture, neck: posture, trunk: posture, legs: posture };
const actions: Props["selectedActions"] = [
  { id: "a", titleFa: "اقدام اول", titleEn: "First action", descriptionFa: "شرح اول", descriptionEn: "First description", priority: "HIGH", status: "UNSELECTED", scoreReduction: 1, affectedParts: ["neck"] },
  { id: "b", titleFa: "اقدام دوم", titleEn: "Second action", descriptionFa: "شرح دوم", descriptionEn: "Second description", priority: "LOW", status: "COMPLETED", scoreReduction: 1, affectedParts: ["neck"] },
  { id: "c", titleFa: "اقدام عمومی", titleEn: "General action", descriptionFa: "شرح عمومی", descriptionEn: "General description", priority: "MEDIUM", status: "IN_PROGRESS", scoreReduction: 0, affectedParts: [] },
];
afterEach(() => vi.unstubAllGlobals());
describe("Unified RULA assessment table", () => {
  it.each(["fa", "en"] as const)("renders separate action rows with descriptions, states and matching controls in %s", locale => {
    vi.stubGlobal("localStorage", { getItem: () => locale });
    const markup = renderToStaticMarkup(<LocaleProvider><RulaReportDataTable analysis={analysis} factors={[]} selectedActions={actions} locale={locale} onSavePosture={async () => {}} onUpdateAction={async () => {}} onCompleteAction={() => {}}/></LocaleProvider>);
    if (locale === "fa" && process.env.RULA_LAYOUT_FIXTURE) {
      const css = readFileSync(new URL("../../styles.css", import.meta.url), "utf8");
      writeFileSync(process.env.RULA_LAYOUT_FIXTURE, '<!doctype html><html dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + css + '</style></head><body style="margin:0"><main style="width:calc(100% - 40px);margin:20px;min-width:0"><form class="assessment-wizard"><fieldset><div class="rula-report-view"><div class="rula-report-score-card"><div>RULA Score</div><div>سطح ریسک</div></div><div class="rula-report-secondary-sections">' + markup + '</div></div></fieldset></form></main></body></html>');
    }
    const rows = markup.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/g) ?? [];
    expect(rows).toHaveLength(10); // heading, eight posture/action rows, one general action
    for (const action of actions) {
      const row = rows.find(row => row.includes(`data-action-id="${action.id}"`));
      expect(row).toContain(locale === "fa" ? action.titleFa : action.titleEn);
      expect(row).toContain(locale === "fa" ? action.descriptionFa : action.descriptionEn);
      expect(row?.match(/data-rula-row-edit="true"/g)).toHaveLength(1);
      expect(row).not.toContain("rula-evaluation-action-editor");
      expect(row?.match(/<button\b/g)).toHaveLength(2); // one combined edit button plus completion
    }
    expect(rows.find(row => row.includes('data-action-id="a"'))).not.toContain("Second description");
    expect(rows.find(row => row.includes('data-action-id="b"'))).toContain('disabled=""');
    expect(markup.match(/<table\b/g)).toHaveLength(1);
  });
  it("provides completion and deletion for every row, preserves edited labels and compacts display numbers", () => {
    vi.stubGlobal("localStorage", { getItem: () => "en" });
    const edited = { ...analysis, evaluationRows: [{ id: "upperArm", deleted: true }, { id: "lowerArm", group: "B", bodyPart: "Edited arm", scoreShare: 45, title: "<script>action</script>", status: "COMPLETED" as const }] };
    const markup = renderToStaticMarkup(<LocaleProvider><RulaReportDataTable analysis={edited} factors={[]} selectedActions={[]} locale="en" onSavePosture={async () => {}} onSaveDetails={async () => {}}/></LocaleProvider>);
    expect(markup.match(/data-rula-row-complete="true"/g)).toHaveLength(6);
    expect(markup.match(/data-rula-row-delete="true"/g)).toHaveLength(6);
    expect(markup).toContain("Edited arm"); expect(markup).toContain("45٪"); expect(markup).not.toContain("<script>");
    expect([...markup.matchAll(/class="report-table-number">(\d+)<\/td>/g)].map(match => match[1])).toEqual(["1", "2", "3", "4", "5", "6"]);
  });
  it("keeps read-only output safe and preserves posture-only rows", () => {
    vi.stubGlobal("localStorage", { getItem: () => "en" });
    const markup = renderToStaticMarkup(<LocaleProvider><RulaReportDataTable analysis={analysis} factors={[]} selectedActions={[{ ...actions[0]!, titleEn: "<script>unsafe</script>" }]} locale="en"/></LocaleProvider>);
    expect(markup).not.toContain("<button");
    expect(markup).not.toContain("<script>");
    expect(markup).toContain("&lt;script&gt;");
    expect(markup.match(/<tr\b/g)).toHaveLength(8);
  });
  it("hides unreviewed angle and detection outputs in summary and detailed/image rows", () => {
    vi.stubGlobal("localStorage", { getItem: () => "en" });
    const unreviewed = { ...posture, requiresReview: true };
    const unreviewedAnalysis: Props["analysis"] = { upperArm: unreviewed, lowerArm: unreviewed, wrist: unreviewed, wristTwist: unreviewed, neck: unreviewed, trunk: unreviewed, legs: unreviewed };
    const image = { imageKey: "image", fileName: "posture.png", analysis: unreviewedAnalysis, force: 0, muscleUse: false };
    const markup = renderToStaticMarkup(<LocaleProvider><RulaReportDataTable analysis={unreviewedAnalysis} imageAssessments={[image]} factors={[]} selectedActions={[]} locale="en"/></LocaleProvider>);
    expect(markup).not.toContain("25°");
    expect(markup).not.toContain(">Detected<");
    expect(markup).not.toContain(">Not detected<");
    const scores = markup.match(/class="rula-suggested-score[^\"]*">[^<]*<\/strong>/g) ?? [];
    expect(scores.length).toBeGreaterThan(0);
    expect(scores.every(score => score.endsWith(">—</strong>"))).toBe(true);
  });
  it.each(["LEFT", "RIGHT"] as const)("labels every posture and image row with its evaluated %s side", side => {
    vi.stubGlobal("localStorage", { getItem: () => "en" });
    const image = { imageKey: "image", fileName: "posture.png", analysis, force: 0, muscleUse: false };
    const markup = renderToStaticMarkup(<LocaleProvider><RulaReportDataTable analysis={analysis} imageAssessments={[image]} imageBodySide={side} factors={[]} selectedActions={[{ ...actions[2]!, bodySide: "BOTH" }]} locale="en"/></LocaleProvider>);
    const rows = markup.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/g) ?? [];
    const postureRows = rows.filter(row => row.includes('class="rula-evaluation-row"'));
    expect(postureRows).toHaveLength(14);
    expect(markup).not.toContain(image.fileName);
    expect(image.fileName).toBe("posture.png");
    for (const row of postureRows) {
      expect(row).toContain('data-rula-body-side="' + side + '"');
      expect(row).toContain(side === "LEFT" ? "Left side" : "Right side");
    }
    expect(rows.find(row => row.includes('data-action-id="c"'))).toContain('data-rula-body-side="BOTH"');
  });

});
