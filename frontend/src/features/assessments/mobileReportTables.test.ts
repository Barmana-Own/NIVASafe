import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./AssessmentPages.tsx", import.meta.url), "utf8");
const rulaFeature = readFileSync(new URL("./rula/RulaFeature.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../../styles.css", import.meta.url), "utf8");
const enterpriseStyles = readFileSync(new URL("../../styles/assessments.css", import.meta.url), "utf8");
const foundationStyles = readFileSync(new URL("../../styles/foundations.css", import.meta.url), "utf8");
const mobileRules = styles.slice(styles.indexOf("/* Shared report records:"));
const reportActionRules = styles.slice(styles.indexOf("/* Keep mobile assessment report actions"));

describe("Mobile report table contract", () => {
  it("fills two equal-width columns with the RULA report header actions on mobile", () => {
    const actionMarkup = rulaFeature.match(/rula-report-header-actions">([\s\S]*?)<\/div>/)?.[1];

    expect(actionMarkup).toBeDefined();
    expect(actionMarkup?.match(/<button\b/g)).toHaveLength(4);
    expect(foundationStyles).toContain(".rula-report-page > .page-header .rula-report-header-actions");
    expect(foundationStyles).toContain("grid-template-columns: repeat(2, minmax(0, 1fr)) !important;");
    expect(foundationStyles).toContain("flex: 1 1 100%;");
    expect(foundationStyles).toContain("width: 100% !important;");
  });

  it("stretches FMEA and RULA report action pairs across narrow mobile headers", () => {
    expect(reportActionRules).toContain(".fmea-report-page > .page-header > .page-actions");
    expect(reportActionRules).toContain(".rula-report-page > .page-header > .page-actions");
    expect(reportActionRules).toContain("flex: 1 1 100%; width: 100%; min-width: 0;");
    expect(reportActionRules).toContain("grid-template-columns: repeat(2, minmax(0, 1fr));");
    expect(reportActionRules).toContain(":last-child:nth-child(odd)");
    expect(reportActionRules).toContain("justify-self: center;");
  });

  it("gives mobile report headers one full-width track for their action grid", () => {
    expect(foundationStyles).toContain(".app[data-design=\"enterprise\"] .page-header { display: grid; grid-template-columns: minmax(0, 1fr);");
    expect(foundationStyles).toContain(".app[data-design=\"enterprise\"] .page-header > .page-actions { width: 100%; min-width: 0; justify-self: stretch;");
    expect(foundationStyles).toContain(".app[data-design=\"enterprise\"] :is(.fmea-report-page, .rula-report-page) .page-actions-inline > :last-child:nth-child(odd) { grid-column: 1 / -1; width: 50%; justify-self: center;");
  });

  it("shares the mobile layout between wizard previews and saved reports", () => {
    for (const table of ["fmea-report-data-table", "rula-report-data-table", "rula-correction-table"]) {
      expect(source).toContain(`assessment-report-table ${table} assessment-mobile-table`);
    }
    expect(mobileRules).toContain("@media screen and (max-width: 760px)");
    expect(mobileRules).not.toContain(".rula-report-page");
    expect(mobileRules).toContain("min-width: 0 !important");
    expect(mobileRules).toContain("content: attr(data-label)");
    expect(mobileRules).toContain("direction: inherit;");
  });

  it("labels every FMEA field, including scores and optional operations", () => {
    const interactiveRow = source.split("\n").find((line) =>
      line.includes("return <tr key={item.id}>") && line.includes("onMove?.(item"));
    expect(interactiveRow).toBeDefined();
    expect(interactiveRow?.match(/<td data-label=/g)).toHaveLength(12);
    for (const field of ["row", "failureMode", "effect", "cause", "existingControls",
      "severity", "occurrence", "detection", "riskLevel", "recommendation", "operations"]) {
      expect(interactiveRow).toContain(`data-label={t("assessment.${field}")}`);
    }
    expect(interactiveRow).toContain('data-label={"RPN"}');
    expect(interactiveRow).toContain('assessment.fmeaConfirmRowCompletion');
    expect(interactiveRow).toContain('isFmeaRowCompleted(item)');
  });

  it("keeps accessible headers, wrapping actions and inline details without clipping", () => {
    expect(mobileRules).toContain("clip-path: inset(50%)");
    expect(mobileRules).not.toContain(".assessment-mobile-table tbody > tr > td { display: none");
    expect(mobileRules).not.toContain("overflow-x: hidden");
    expect(mobileRules).toContain("flex-wrap: wrap");
    expect(mobileRules).toContain("width: 40px");
    expect(mobileRules).toContain(".report-inline-details-popover");
    expect(mobileRules).toContain("position: static");
  });

  it("keeps desktop FMEA and RULA report columns compact and readable", () => {
    expect(enterpriseStyles).toContain(".surface-body:has(.report-data-table-wrap)");
    expect(enterpriseStyles).toContain("padding: 10px 12px;");
    expect(enterpriseStyles).toContain("padding: 6px 8px;");
    expect(enterpriseStyles).toContain("overflow-wrap: normal;");
    expect(enterpriseStyles).toContain(".fmea-report-data-table :is(th, td):nth-child(12) { width: 8%; }");
    expect(enterpriseStyles).toContain(".rula-report-data-table.rula-unified-evaluation-table :is(th, td):nth-child(8) { width: 24%; }");
    expect(enterpriseStyles).toContain("grid-template-columns: repeat(2, minmax(28px, 1fr));");
  });
});
