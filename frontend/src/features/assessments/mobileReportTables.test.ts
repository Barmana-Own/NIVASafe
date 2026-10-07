import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./AssessmentPages.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../../styles.css", import.meta.url), "utf8");
const mobileRules = styles.slice(styles.indexOf("/* Shared report records:"));

describe("Mobile report table contract", () => {
  it("shares the mobile layout between wizard previews and saved reports", () => {
    for (const table of ["fmea-report-data-table", "rula-report-data-table", "rula-correction-table"]) {
      expect(source).toContain(`assessment-report-table ${table} assessment-mobile-table`);
    }
    expect(mobileRules).toContain("@media screen and (max-width: 760px)");
    expect(mobileRules).not.toContain(".rula-report-page");
    expect(mobileRules).toContain("min-width: 0 !important");
    expect(mobileRules).toContain("content: attr(data-label)");
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
  });

  it("keeps accessible headers, wrapping actions and inline details without clipping", () => {
    expect(mobileRules).toContain("clip-path: inset(50%)");
    expect(mobileRules).not.toContain("display: none");
    expect(mobileRules).not.toContain("overflow-x: hidden");
    expect(mobileRules).toContain("flex-wrap: wrap");
    expect(mobileRules).toContain("width: 40px");
    expect(mobileRules).toContain(".report-inline-details-popover");
    expect(mobileRules).toContain("position: static");
  });
});
