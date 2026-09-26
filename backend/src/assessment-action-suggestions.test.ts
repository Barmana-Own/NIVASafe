import { describe, expect, it } from "vitest";
import {
  buildFmeaActionSuggestionsPrompt,
  buildRulaActionSuggestionsPrompt,
  fallbackFmeaActionSuggestions,
  fallbackRulaActionSuggestions,
  mergeFmeaActionSuggestions,
  mergeRulaActionSuggestions,
  parseFmeaActionSuggestions,
  parseRulaActionSuggestions,
  type FmeaActionCandidate,
} from "./assessment-action-suggestions.js";
import { fallbackRulaPostureAnalysis } from "./rula-report.js";

const fmeaCandidates: FmeaActionCandidate[] = [
  {
    id: "item-1",
    rowNumber: 1,
    processStep: "پمپاژ",
    failureMode: "نشتی اتصال",
    effect: "تماس شیمیایی",
    cause: "واشر فرسوده",
    preventiveControls: "بازرسی دوره‌ای",
    detectionControls: "حسگر نشت",
    severity: 8,
    occurrence: 4,
    detection: 5,
    rpn: 160,
    riskLevel: "CRITICAL",
    recommendation: null,
  },
];

describe("assessment corrective action suggestions", () => {
  it("builds a bounded FMEA prompt with JSON-only output instructions", () => {
    const prompt = buildFmeaActionSuggestionsPrompt({
      processName: "پمپاژ",
      projectName: "پروژه آزمایشی",
      locale: "fa",
      candidates: fmeaCandidates,
      existingActionTitles: [],
    });
    expect(prompt).toContain("NIVASAFE_FMEA_ACTION_SUGGESTIONS");
    expect(prompt).toContain("Return only valid JSON");
    expect(prompt).toContain("نشتی اتصال");
    expect(prompt).toContain("qualified HSE");
  });

  it("rejects unmapped FMEA rows and keeps the server-owned item id", () => {
    const suggestions = parseFmeaActionSuggestions(JSON.stringify({
      actions: [
        { rowNumber: 99, title: "غیرمجاز", description: "رد شود", priority: "HIGH" },
        { rowNumber: 1, title: "تعویض واشر و آزمون نشتی", description: "اتصال را ایمن و پس از تعمیر آزمون کنید.", priority: "HIGH" },
      ],
    }), fmeaCandidates);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({ fmeaItemId: "item-1", priority: "HIGH", source: "AI" });
  });

  it("always creates a useful FMEA fallback when recommendations are blank", () => {
    const suggestions = fallbackFmeaActionSuggestions({ candidates: fmeaCandidates, existingActionTitles: [], locale: "fa" });
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({ fmeaItemId: "item-1", source: "FALLBACK", priority: "CRITICAL" });
    expect(suggestions[0]!.title).toContain("نشتی اتصال");
  });

  it("provides a distinct fallback action when the primary suggestion is excluded", () => {
    const first = fallbackFmeaActionSuggestions({ candidates: fmeaCandidates, existingActionTitles: [], locale: "fa" });
    const next = fallbackFmeaActionSuggestions({ candidates: fmeaCandidates, existingActionTitles: [first[0]!.title], locale: "fa" });
    expect(next.length).toBeGreaterThan(0);
    expect(next[0]!.title).not.toBe(first[0]!.title);
    expect(next[0]!.fmeaItemId).toBe("item-1");
  });

  it("prioritizes AI FMEA actions and removes duplicates", () => {
    const fallback = fallbackFmeaActionSuggestions({ candidates: fmeaCandidates, existingActionTitles: [], locale: "fa" });
    const ai = parseFmeaActionSuggestions(JSON.stringify({ actions: [{ rowNumber: 1, title: "تعویض واشر و آزمون نشتی", description: "اقدام مشخص", priority: "HIGH" }] }), fmeaCandidates);
    const merged = mergeFmeaActionSuggestions(ai, fallback);
    expect(merged).toHaveLength(2);
    expect(merged[0]!.source).toBe("AI");
  });

  it("builds RULA prompts from posture scores and task context", () => {
    const inputs = { upperArm: 1, lowerArm: 1, wrist: 1, wristTwist: 1, neck: 1, trunk: 1, legs: 1, muscleUse: false, force: 0 };
    const analysis = fallbackRulaPostureAnalysis(inputs);
    const prompt = buildRulaActionSuggestionsPrompt({ bodySide: "RIGHT", score: 2, actionLevel: 1, inputs, analysis, jobTitle: "بازرس", taskDescription: "بازرسی خط", locale: "fa" });
    expect(prompt).toContain("NIVASAFE_RULA_ACTION_SUGGESTIONS");
    expect(prompt).toContain("Return only valid JSON");
    expect(prompt).toContain("بازرسی خط");
    expect(prompt).toContain("qualified HSE");
  });

  it("includes independent side posture data in BOTH prompts and preserves AI side labels", () => {
    const inputs = { upperArm: 2, lowerArm: 1, wrist: 1, wristTwist: 1, neck: 3, trunk: 2, legs: 1, muscleUse: true, force: 1 };
    const baseAnalysis = fallbackRulaPostureAnalysis(inputs);
    const analysis = {
      ...baseAnalysis,
      sideAnalyses: {
        LEFT: { ...baseAnalysis, neck: { ...baseAnalysis.neck, score: 4 } },
        RIGHT: { ...baseAnalysis, neck: { ...baseAnalysis.neck, score: 2 } },
      },
    };
    const prompt = buildRulaActionSuggestionsPrompt({
      bodySide: "BOTH",
      score: 5,
      actionLevel: 3,
      inputs,
      analysis,
      sideResults: { LEFT: { score: 6, actionLevel: 3 }, RIGHT: { score: 3, actionLevel: 2 } },
      jobTitle: "اپراتور خط",
      taskDescription: "کنترل دستگاه",
      locale: "fa",
    });
    expect(prompt).toContain("Independent side scores");
    expect(prompt).toContain('"LEFT"');
    expect(prompt).toContain('"RIGHT"');
    expect(prompt).toContain("keep the two sides independent");

    const suggestions = parseRulaActionSuggestions(JSON.stringify({
      actions: [
        { title: "اقدام سمت چپ", priority: "HIGH", scoreReduction: 2, affectedParts: ["neck"], bodySide: "LEFT" },
        { title: "اقدام سمت راست", priority: "MEDIUM", scoreReduction: 1, affectedParts: ["trunk"], bodySide: "RIGHT" },
      ],
    }), "BOTH");
    expect(suggestions.map((suggestion) => suggestion.bodySide)).toEqual(["LEFT", "RIGHT"]);
  });
  it("sanitizes RULA action parts and bounds score reduction", () => {
    const suggestions = parseRulaActionSuggestions(JSON.stringify({
      actions: [{
        titleFa: "تنظیم میز",
        titleEn: "Adjust desk",
        descriptionFa: "ارتفاع میز را تنظیم کنید.",
        descriptionEn: "Adjust the desk height.",
        priority: "CRITICAL",
        scoreReduction: 99,
        affectedParts: ["trunk", "not-a-part"],
      }],
    }), "RIGHT");
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({ priority: "CRITICAL", scoreReduction: 6, affectedParts: ["trunk"], bodySide: "RIGHT", source: "AI" });
  });

  it("provides a non-empty low-risk RULA fallback", () => {
    const inputs = { upperArm: 1, lowerArm: 1, wrist: 1, wristTwist: 1, neck: 1, trunk: 1, legs: 1, muscleUse: false, force: 0 };
    const suggestions = fallbackRulaActionSuggestions({ bodySide: "RIGHT", analysis: fallbackRulaPostureAnalysis(inputs), inputs, locale: "fa" });
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.every((item) => item.source === "FALLBACK")).toBe(true);
  });

  it("prioritizes AI RULA actions and keeps fallback coverage", () => {
    const fallback = fallbackRulaActionSuggestions({
      bodySide: "RIGHT",
      analysis: fallbackRulaPostureAnalysis({ upperArm: 1, lowerArm: 1, wrist: 1, wristTwist: 1, neck: 2, trunk: 2, legs: 1, muscleUse: false, force: 0 }),
      inputs: { upperArm: 1, lowerArm: 1, wrist: 1, wristTwist: 1, neck: 2, trunk: 2, legs: 1, muscleUse: false, force: 0 },
      locale: "fa",
    });
    const ai = parseRulaActionSuggestions(JSON.stringify({ actions: [{ titleFa: "اقدام اختصاصی", titleEn: "Specific action", descriptionFa: "شرح", descriptionEn: "Description", priority: "HIGH", scoreReduction: 2, affectedParts: ["neck"] }] }), "RIGHT");
    const merged = mergeRulaActionSuggestions(ai, fallback);
    expect(merged[0]!.source).toBe("AI");
    expect(merged.length).toBeGreaterThan(1);
  });
});
