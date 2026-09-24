import { describe, expect, it } from "vitest";
import { actionPriority, buildFmeaReportDetailSeedRows, buildFmeaReportDetailSuggestionsPrompt, ensureMinimumFmeaReportDetailSuggestions, fallbackFmeaReportDetailSuggestions, parseFmeaReportDetailSuggestions, summariseFmea, topFailureModes, type FmeaReportRisk } from "./fmea-report.js";

const rows: FmeaReportRisk[] = [
  { rowNumber: 1, failureMode: "Critical", effect: "", cause: "", severity: 10, occurrence: 10, detection: 5, rpn: 500, riskLevel: "CRITICAL", recommendation: "Stop and isolate" },
  { rowNumber: 2, failureMode: "High", effect: "", cause: "", severity: 9, occurrence: 6, detection: 4, rpn: 216, riskLevel: "HIGH", recommendation: "Install guard" },
  { rowNumber: 3, failureMode: "Medium", effect: "", cause: "", severity: 4, occurrence: 4, detection: 3, rpn: 101, riskLevel: "MEDIUM", recommendation: null },
  { rowNumber: 4, failureMode: "Low", effect: "", cause: "", severity: 2, occurrence: 2, detection: 2, rpn: 51, riskLevel: "LOW", recommendation: null },
  { rowNumber: 5, failureMode: "Very low", effect: "", cause: "", severity: 2, occurrence: 2, detection: 2, rpn: 8, riskLevel: "VERY_LOW", recommendation: null },
];

describe("FMEA report calculations", () => {
  it("maps unknown risk values to a safe medium action priority", () => {
    expect(actionPriority("UNKNOWN")).toBe("MEDIUM");
    expect(actionPriority("VERY_LOW")).toBe("LOW");
  });

  it("summarises risk levels and action demand", () => {
    expect(summariseFmea(rows)).toEqual({
      totalFailureModes: 5,
      highPriorityRisks: 2,
      correctiveActionsNeeded: 2,
      immediateActions: 1,
      distribution: { CRITICAL: 1, HIGH: 1, MEDIUM: 1, LOW: 1, VERY_LOW: 1 },
    });
  });

  it("ranks critical and high modes before lower priority modes", () => {
    expect(topFailureModes(rows, 3).map((item) => item.rowNumber)).toEqual([1, 2, 3]);
  });

  it("parses bounded editable report-detail drafts and guarantees a five-row fallback", () => {
    const parsed = parseFmeaReportDetailSuggestions(JSON.stringify({ rows: [
      { processStep: "مونتاژ", failureMode: "گیرکردن قطعه", effect: "توقف خط", cause: "تنظیم نامناسب", preventiveControls: "بازرسی", detectionControls: "چک‌لیست", recommendation: "تنظیم مجدد", severity: 7, occurrence: "3", detection: 4 },
      { processStep: "", failureMode: "نامعتبر", effect: "", cause: "", severity: 11 },
    ] }));
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ processStep: "مونتاژ", failureMode: "گیرکردن قطعه", occurrence: 3 });
    const fallback = fallbackFmeaReportDetailSuggestions({ processName: "اپراتور خط تولید", projectName: "پروژه نمونه", locale: "fa" });
    expect(fallback).toHaveLength(5);
    expect(ensureMinimumFmeaReportDetailSuggestions(parsed, fallback)).toHaveLength(6);
  });

  it("builds a context-bounded report-detail prompt", () => {
    const prompt = buildFmeaReportDetailSuggestionsPrompt({ processName: "Welder", projectName: "Plant upgrade", department: "Fabrication", existingRows: [], locale: "en" });
    expect(prompt).toContain("NIVASAFE_FMEA_REPORT_DETAIL_SUGGESTIONS");
    expect(prompt).toContain('"rows"');
    expect(prompt).toContain("inserted automatically as editable defaults");
  });

  it("builds exactly five persisted draft rows with calculated RPN values", () => {
    const suggestions = fallbackFmeaReportDetailSuggestions({ processName: "اپراتور خط تولید", projectName: "پروژه نمونه", locale: "fa" });
    const seeded = buildFmeaReportDetailSeedRows({ assessmentId: "assessment-1", suggestions });
    expect(seeded).toHaveLength(5);
    expect(seeded.map((row) => row.rowNumber)).toEqual([1, 2, 3, 4, 5]);
    expect(seeded[0]).toMatchObject({ assessmentId: "assessment-1", processStep: "اپراتور خط تولید", severity: 6, occurrence: 4, detection: 5, rpn: 120, riskLevel: "MEDIUM" });
    expect(seeded.every((row) => row.failureMode && row.effect && row.cause)).toBe(true);
  });

  it("adds five rows without duplicating existing risk details", () => {
    const suggestions = fallbackFmeaReportDetailSuggestions({ processName: "اپراتور خط تولید", projectName: "پروژه نمونه", locale: "fa" });
    const firstSuggestion = suggestions[0];
    expect(firstSuggestion).toBeDefined();
    const seeded = buildFmeaReportDetailSeedRows({
      assessmentId: "assessment-1",
      suggestions,
      fallbackSuggestions: fallbackFmeaReportDetailSuggestions({ processName: "اپراتور خط تولید", projectName: "پروژه نمونه", locale: "fa", limit: 8 }),
      existingRows: [{ rowNumber: 3, processStep: firstSuggestion!.processStep, failureMode: firstSuggestion!.failureMode, effect: firstSuggestion!.effect, cause: firstSuggestion!.cause }],
      additionalCount: 5,
    });
    expect(seeded).toHaveLength(5);
    expect(seeded.map((row) => row.rowNumber)).toEqual([4, 5, 6, 7, 8]);
    expect(seeded.some((row) => row.failureMode === firstSuggestion!.failureMode)).toBe(false);
    expect(buildFmeaReportDetailSeedRows({ assessmentId: "assessment-1", suggestions, existingRows: [...suggestions.map((suggestion, index) => ({ ...suggestion, rowNumber: index + 1 }))] })).toEqual([]);
  });
});
