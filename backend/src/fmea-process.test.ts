import { describe, expect, it } from "vitest";
import {
  buildDescriptionPrompt,
  buildFmeaRiskSuggestionsPrompt,
  buildFmeaRiskRowsPrompt,
  buildJobTitleSuggestionsPrompt,
  buildProcessSuggestionsPrompt,
  cleanDescription,
  cleanTextList,
  countShortDescriptionSentences,
  fallbackProcessDescription,
  isValidShortActivityDescription,
  nextFmeaRowNumber,
  defaultFmeaProcessStep,
  parseProcessSuggestions,
  parseFmeaRiskSuggestions,
  parseFmeaRiskScoreSuggestion,
  parseFmeaRiskRows,
  buildFmeaImageAnalysisPrompt,
  parseFmeaImageAnalysis,
  parseJobTitleSuggestions,
  cleanJobTitleList,
  parseFmeaProcessAutofill,
  buildFmeaProcessAutofillPrompt,
  normalizeJobTitle,
  assertFmeaProcessItemSelectionLimit,
  FMEA_PROCESS_AI_SUGGESTION_MAX,
  FMEA_PROCESS_SELECTION_MAX,
  FMEA_PROCESS_SUGGESTION_MAX,
  limitProcessSuggestions,
} from "./fmea-process.js";

describe("FMEA process-information helpers", () => {
  it("normalizes suggestion lists without duplicates or oversized input", () => {
    const result = cleanTextList([" دستگاه برش ", "دستگاه برش", "", 42, "x".repeat(180)]);
    expect(result).toEqual(["دستگاه برش", "x".repeat(160)]);
  });

  it("accepts only the structured suggestion contract from an AI response", () => {
    expect(parseProcessSuggestions("نتیجه:\n{\"equipment\":[\"دستگاه جوش\"],\"materials\":[\"الکترود\"],\"controls\":[\"مجوز کار گرم\"]}"))
      .toEqual({ equipment: ["دستگاه جوش"], materials: ["الکترود"], controls: ["مجوز کار گرم"] });
    expect(parseProcessSuggestions("پاسخ نامعتبر بدون JSON")).toEqual({ equipment: [], materials: [], controls: [] });
    const tenEquipmentItems = parseProcessSuggestions(JSON.stringify({ equipment: Array.from({ length: 12 }, (_, index) => `تجهیز ${index + 1}`), materials: [], controls: [] }));
    expect(tenEquipmentItems.equipment).toHaveLength(FMEA_PROCESS_SUGGESTION_MAX);
  });

  it("enforces five selected process items while preserving legacy values on edit", () => {
    const items = Array.from({ length: FMEA_PROCESS_SELECTION_MAX + 1 }, (_, index) => `مورد ${index + 1}`);
    expect(() => assertFmeaProcessItemSelectionLimit({ equipment: items })).toThrow("A maximum of 5 items");
    expect(() => assertFmeaProcessItemSelectionLimit({ equipment: items }, { equipment: items })).not.toThrow();
    expect(() => assertFmeaProcessItemSelectionLimit({ equipment: [...items, "مورد جدید"] }, { equipment: items })).toThrow("A maximum of 5 items");
  });

  it("normalizes bounded AI job-title suggestions", () => {
    expect(parseJobTitleSuggestions('{"jobTitles":[" اپراتور خط تولید ","اپراتور خط تولید","بازرس ایمنی",42]}'))
      .toEqual(["اپراتور خط تولید", "بازرس ایمنی"]);
    expect(cleanJobTitleList(["عنوان", "عنوان", "x".repeat(200)])).toEqual(["عنوان", "x".repeat(180)]);
    expect(normalizeJobTitle("  اپراتور‌  ماشین‌آلات ")).toBe("اپراتور ماشین آلات");
  });

  it("accepts only bounded, editable FMEA process autofill fields", () => {
    const result = parseFmeaProcessAutofill(JSON.stringify({
      department: " تولید ",
      activityDescription: "بررسی دستگاه و ثبت نتایج.",
      specialConditions: "کار در شیفت شب",
      equipment: ["دستگاه برش", "دستگاه برش"],
      materials: ["ورق فلزی"],
      controls: ["مجوز کار"],
    }));
    expect(result).toEqual({
      department: "تولید",
      activityDescription: "بررسی دستگاه و ثبت نتایج.",
      specialConditions: "کار در شیفت شب",
      suggestions: { equipment: ["دستگاه برش"], materials: ["ورق فلزی"], controls: ["مجوز کار"] },
    });
    expect(parseFmeaProcessAutofill('{"activityDescription":"جمله اول. جمله دوم. جمله سوم."}')).toMatchObject({ activityDescription: "" });
  });

  it("normalizes bounded FMEA risk-row suggestions", () => {
    expect(parseFmeaRiskSuggestions("answer: {\"failureModes\":[\" نشت روغن \",\"نشت روغن\"],\"effects\":[\"آسیب به محصول\"],\"causes\":[\"شل بودن اتصال\"],\"preventiveControls\":[\"بازرسی دوره‌ای\"],\"detectionControls\":[\"چک‌لیست قبل از شروع\"],\"recommendations\":[\"ایمن‌سازی\"]}"))
      .toEqual({ failureModes: ["نشت روغن"], effects: ["آسیب به محصول"], causes: ["شل بودن اتصال"], preventiveControls: ["بازرسی دوره‌ای"], detectionControls: ["چک‌لیست قبل از شروع"], recommendations: ["ایمن‌سازی"] });
    expect(parseFmeaRiskSuggestions("invalid")).toEqual({ failureModes: [], effects: [], causes: [], preventiveControls: [], detectionControls: [], recommendations: [] });
  });

  it("accepts only bounded advisory S/O/D score suggestions", () => {
    expect(parseFmeaRiskScoreSuggestion('{"scoreSuggestion":{"severity":6,"occurrence":"8","detection":3,"rationale":"بر اساس پیامد، تکرار و قابلیت کشف بررسی شود."}}'))
      .toEqual({ severity: 6, occurrence: 8, detection: 3, rationale: "بر اساس پیامد، تکرار و قابلیت کشف بررسی شود." });
    expect(parseFmeaRiskScoreSuggestion('{"scoreSuggestion":{"severity":11,"occurrence":2,"detection":3,"rationale":"نامعتبر"}}')).toBeNull();
    expect(parseFmeaRiskScoreSuggestion('{"scoreSuggestion":{"severity":2,"occurrence":2,"detection":2}}')).toMatchObject({ severity: 2, occurrence: 2, detection: 2 });
  });

  it("normalizes exactly five complete default FMEA risk rows", () => {
    const rows = parseFmeaRiskRows(JSON.stringify({ riskRows: [
      { processStep: "شرح فعالیت", failureMode: "  نشت روغن ", effect: "آسیب به محصول", cause: "شل بودن اتصال", preventiveControls: "بازرسی دوره‌ای", detectionControls: "چک‌لیست", recommendation: "ایمن‌سازی", severity: "۸", occurrence: 3, detection: 4 },
      { processStep: "شرح فعالیت", failureMode: "نشت روغن", effect: "آسیب به محصول", cause: "شل بودن اتصال", severity: 8, occurrence: 3, detection: 4 },
      ...Array.from({ length: 6 }, (_, index) => ({ processStep: "شرح فعالیت", failureMode: `خطر ${index + 1}`, effect: `پیامد ${index + 1}`, cause: `علت ${index + 1}`, severity: 5, occurrence: 4, detection: 3 })),
    ] }));
    expect(rows).toHaveLength(5);
    expect(rows[0]).toMatchObject({ processStep: "شرح فعالیت", failureMode: "نشت روغن", severity: 8, occurrence: 3, detection: 4 });
    expect(parseFmeaRiskRows(JSON.stringify({ riskRows: [{ processStep: "شرح", failureMode: "خرابی", effect: "پیامد", cause: "علت", severity: 11, occurrence: 2, detection: 2 }] }))).toEqual([]);
  });

  it("normalizes image-review risk rows and rejects unsafe scores", () => {
    const result = parseFmeaImageAnalysis(JSON.stringify({ summary: "یک خطر قابل بررسی دیده شد.", riskRows: [
      { failureMode: "ریزش بار", effect: "آسیب به تجهیزات", cause: "چیدمان نامناسب", preventiveControls: "بازرسی", detectionControls: "نظارت", recommendation: "ایمن‌سازی", severity: 8, occurrence: "3", detection: 4 },
      { failureMode: "نامعتبر", effect: "", cause: "علت", severity: 11, occurrence: 2, detection: 2 },
    ] }));
    expect(result).toEqual({ summary: "یک خطر قابل بررسی دیده شد.", riskRows: [{ failureMode: "ریزش بار", effect: "آسیب به تجهیزات", cause: "چیدمان نامناسب", preventiveControls: "بازرسی", detectionControls: "نظارت", recommendation: "ایمن‌سازی", severity: 8, occurrence: 3, detection: 4 }] });
    expect(parseFmeaImageAnalysis(JSON.stringify({ summary: "خطر بررسی شد.", rows: [{ failureMode: "لغزش", effect: "آسیب", cause: "سطح خیس", preventiveControls: "نظافت", detectionControls: "بازرسی", recommendation: "خشک‌کردن", severity: "۸", occurrence: "٧", detection: "2" }] }))).toMatchObject({ riskRows: [{ severity: 8, occurrence: 7, detection: 2 }] });
  });

  it("keeps AI prompts bounded and explicit about review before registration", () => {
    const suggestions = buildProcessSuggestionsPrompt({
      jobTitle: "اپراتور خط مونتاژ",
      department: "تولید",
      activityDescription: "شرح فعالیت",
      databaseSuggestions: { equipment: ["میز مونتاژ"], materials: [], controls: [] },
      locale: "fa",
    });
    expect(suggestions).toContain("NIVASAFE_PROCESS_SUGGESTIONS");
    expect(suggestions).toContain("The user will confirm every item");
    expect(suggestions).toContain(`Return at most ${FMEA_PROCESS_AI_SUGGESTION_MAX} concise items per array`);
    expect(limitProcessSuggestions({ equipment: Array.from({ length: 10 }, (_, index) => `تجهیز ${index + 1}`), materials: [], controls: [] }, FMEA_PROCESS_AI_SUGGESTION_MAX).equipment).toHaveLength(FMEA_PROCESS_AI_SUGGESTION_MAX);

    const jobTitles = buildJobTitleSuggestionsPrompt({ jobTitle: "اپراتور", department: "تولید", activityDescription: "کار با خط تولید", existingJobTitles: ["اپراتور خط تولید"], locale: "fa" });
    expect(jobTitles).toContain("NIVASAFE_FMEA_JOB_TITLE_SUGGESTIONS");
    expect(jobTitles).toContain("jobTitles");
    expect(jobTitles).toContain("Do not repeat the entered title");

    const autofill = buildFmeaProcessAutofillPrompt({
      projectName: "پروژه توسعه خط تولید",
      jobTitle: "اپراتور خط مونتاژ",
      department: "",
      activityDescription: "",
      specialConditions: "",
      databaseSuggestions: { equipment: ["میز مونتاژ"], materials: [], controls: [] },
      locale: "fa",
    });
    expect(autofill).toContain("NIVASAFE_FMEA_PROCESS_AUTOFILL");
    expect(autofill).toContain('"specialConditions"');
    expect(autofill).toContain("The user will review and edit every autofilled value");
    expect(autofill).toContain(`Return at most ${FMEA_PROCESS_SUGGESTION_MAX} concise items per equipment/materials/controls array`);

    const description = buildDescriptionPrompt({ jobTitle: "Welder", department: "Fabrication", locale: "en" });
    expect(description).toContain("NIVASAFE_PROCESS_DESCRIPTION");
    expect(description).toContain("one or two sentences");

    const riskRow = buildFmeaRiskSuggestionsPrompt({ projectName: "Assembly line upgrade", jobTitle: "Welder", processStep: "Welding", failureMode: "", effect: "", cause: "", preventiveControls: "", detectionControls: "", recommendation: "", locale: "en" });
    expect(riskRow).toContain("NIVASAFE_FMEA_RISK_ROW_SUGGESTIONS");
    expect(riskRow).toContain("require explicit user confirmation");
    expect(riskRow).toContain('"scoreSuggestion":{"severity":1,"occurrence":1,"detection":1');
    expect(riskRow).toContain('"preventiveControls":[]');
    expect(riskRow).toContain('"detectionControls":[]');
    expect(riskRow).toContain("Project: Assembly line upgrade");
    expect(riskRow).toContain("preventive controls");
    expect(riskRow).toContain("advisory values, not final assessment results");

    const riskRows = buildFmeaRiskRowsPrompt({ projectName: "Assembly line upgrade", jobTitle: "Welder", department: "Fabrication", activityDescription: "Welding", specialConditions: "Night shift", processStep: "Welding", locale: "en" });
    expect(riskRows).toContain("NIVASAFE_FMEA_RISK_ROWS");
    expect(riskRows).toContain('"riskRows"');
    expect(riskRows).toContain("Return exactly 5 distinct");
    expect(riskRows).toContain("defaults for the review table");
    expect(riskRows).toContain("Project: Assembly line upgrade");

    const imagePrompt = buildFmeaImageAnalysisPrompt({ jobTitle: "اپراتور خط", department: "تولید", activityDescription: "جابجایی قطعات.", locale: "fa" });
    expect(imagePrompt).toContain("NIVASAFE_FMEA_IMAGE_REVIEW");
    expect(imagePrompt).toContain("visible evidence");
    expect(imagePrompt).toContain("editable review rows");
  });

  it("provides a safe local description fallback", () => {
    expect(cleanDescription("```text\nشرح فعالیت\n```")).toBe("شرح فعالیت");
    expect(fallbackProcessDescription("جوشکار", "ساخت و تعمیرات", "fa")).toContain("جوشکار");
    expect(fallbackProcessDescription("Welder", "Fabrication", "en")).toContain("Welder");
  });

  it("limits activity descriptions to one or two sentences", () => {
    expect(countShortDescriptionSentences("جمله اول. جمله دوم؟")).toBe(2);
    expect(isValidShortActivityDescription("جمله اول. جمله دوم؟")).toBe(true);
    expect(isValidShortActivityDescription("جمله اول. جمله دوم؟ جمله سوم!")).toBe(false);
    expect(cleanDescription("جمله اول. جمله دوم. جمله سوم.")).toBe("");
  });

  it("derives a sequential row number and process context for new risk rows", () => {
    expect(nextFmeaRowNumber([])).toBe(1);
    expect(nextFmeaRowNumber([1, 4, 2])).toBe(5);
    expect(defaultFmeaProcessStep("  شرح فعالیت ارزیابی  ", "عنوان ارزیابی")).toBe("شرح فعالیت ارزیابی");
    expect(defaultFmeaProcessStep("", "عنوان ارزیابی")).toBe("عنوان ارزیابی");
  });
});
