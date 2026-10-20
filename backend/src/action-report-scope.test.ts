import { describe, expect, it } from "vitest";
import { fmeaAssessmentActionScope, rulaAssessmentActionScope } from "./action-report-scope.js";

describe("assessment action report scope", () => {
  it("includes only non-mixed FMEA actions linked to the exact assessment or its legacy item-only rows", () => {
    expect(fmeaAssessmentActionScope("fmea-a")).toEqual({
      rulaId: null,
      OR: [
        { fmeaId: "fmea-a", OR: [{ fmeaItemId: null }, { fmeaItem: { assessmentId: "fmea-a" } }] },
        { fmeaId: null, fmeaItem: { assessmentId: "fmea-a" } },
      ],
    });
  });

  it("excludes mixed FMEA links from the RULA report inventory", () => {
    expect(rulaAssessmentActionScope("rula-a")).toEqual({ rulaId: "rula-a", fmeaId: null, fmeaItemId: null });
  });
});
