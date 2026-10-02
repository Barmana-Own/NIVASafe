import { describe, expect, it } from "vitest";
import { fmeaPayloadFromDraft, fmeaRiskRowsFromDraft } from "./fmeaDraft";

describe("FMEA draft transformations", () => {
  it("normalizes process draft fields without changing the saved payload shape", () => {
    expect(fmeaPayloadFromDraft({
      projectId: "project-1",
      activityId: "",
      title: "  Loading  ",
      code: " FMEA-001 ",
      scope: "  ",
      equipment: ["Hoist", 4, "Crane"],
      materials: Array.from({ length: 22 }, (_, index) => `material-${index + 1}`),
      existingControls: "not-an-array",
    })).toMatchObject({
      projectId: "project-1",
      activityId: null,
      title: "Loading",
      code: "FMEA-001",
      scope: "Loading",
      equipment: ["Hoist", "Crane"],
      materials: Array.from({ length: 20 }, (_, index) => `material-${index + 1}`),
      existingControls: [],
    });
  });

  it("restores valid persisted risk rows and validates a partially edited row", () => {
    const draft = {
      reviewRiskRows: JSON.stringify([{ failureMode: "  Load falls ", effect: "Injury", cause: "Unstable", severity: 8, occurrence: 3, detection: 2 }]),
      reviewFailureMode: "New failure",
      reviewEffect: "Equipment damage",
      reviewCause: "Loose coupling",
      reviewSeverity: "6",
      reviewOccurrence: "4",
      reviewDetection: "5",
    };
    expect(fmeaRiskRowsFromDraft(draft)).toEqual([
      { failureMode: "Load falls", effect: "Injury", cause: "Unstable", preventiveControls: "", detectionControls: "", severity: 8, occurrence: 3, detection: 2, recommendation: "" },
      { failureMode: "New failure", effect: "Equipment damage", cause: "Loose coupling", preventiveControls: "", detectionControls: "", severity: 6, occurrence: 4, detection: 5, recommendation: "" },
    ]);
    expect(fmeaRiskRowsFromDraft({ reviewFailureMode: "Missing effect", reviewCause: "Cause" })).toBeNull();
    expect(fmeaRiskRowsFromDraft({ reviewRiskRows: draft.reviewRiskRows })).toHaveLength(1);
  });

  it("preserves the row limit when a saved list already contains twenty rows", () => {
    const rows = Array.from({ length: 20 }, (_, index) => ({ failureMode: `Failure ${index}`, effect: "Effect", cause: "Cause", severity: 1, occurrence: 1, detection: 1 }));
    expect(fmeaRiskRowsFromDraft({ reviewRiskRows: JSON.stringify(rows), reviewFailureMode: "Twenty-first", reviewEffect: "Effect", reviewCause: "Cause" })).toHaveLength(20);
  });
});
