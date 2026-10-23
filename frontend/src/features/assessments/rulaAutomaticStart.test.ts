import { describe, expect, it } from "vitest";
import { canStartRulaAutomaticAnalysis, getRulaAutomaticAnalysisMode } from "./rulaAnalysisQueue";

describe("RULA automatic start", () => {
  it.each([1, 2, 3] as const)("keeps image analysis active in wizard step %i", step => {
    const mode = getRulaAutomaticAnalysisMode(step, true);
    expect(mode).toBe("images");
    expect(canStartRulaAutomaticAnalysis(mode, "", "")).toBe(true);
  });
  it("starts text analysis only in review with complete activity context", () => {
    expect(getRulaAutomaticAnalysisMode(1, false)).toBeNull();
    expect(getRulaAutomaticAnalysisMode(3, false)).toBeNull();
    const mode = getRulaAutomaticAnalysisMode(2, false);
    expect(canStartRulaAutomaticAnalysis(mode, "", "")).toBe(false);
    expect(canStartRulaAutomaticAnalysis(mode, "Operator", "Synthetic assembly")).toBe(true);
  });
});
