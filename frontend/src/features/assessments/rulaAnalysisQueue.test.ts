import { describe, expect, it } from "vitest";
import { canStartRulaAutomaticAnalysis, getRulaAutomaticAnalysisMode, runRulaAnalysisQueue } from "./rulaAnalysisQueue";

describe("RULA image analysis scheduling", () => {
  it.each([
    [1, true, "images"],
    [2, true, "images"],
    [3, true, "images"],
    [1, false, null],
    [2, false, "text"],
    [3, false, null],
  ] as const)("selects automatic analysis mode for wizard step %s with images=%s", (step, hasImages, mode) => {
    expect(getRulaAutomaticAnalysisMode(step, hasImages)).toBe(mode);
  });

  it.each([
    ["images", "", "", true],
    ["images", "Operator", "", true],
    ["text", "", "Task", false],
    ["text", "Operator", "", false],
    ["text", "Operator", "Task", true],
    [null, "Operator", "Task", false],
  ] as const)("gates automatic %s analysis based on image availability and text context", (mode, jobTitle, taskDescription, expected) => {
    expect(canStartRulaAutomaticAnalysis(mode, jobTitle, taskDescription)).toBe(expected);
  });

  it("runs two images concurrently and processes every image independently", async () => {
    const release: Array<() => void> = [];
    const started: number[] = [];
    const finished: number[] = [];
    const run = runRulaAnalysisQueue([1, 2, 3, 4], async (id) => {
      started.push(id);
      await new Promise<void>((resolve) => { release.push(resolve); });
      finished.push(id);
    }, () => true);
    expect(started).toEqual([1, 2]);
    release[1]();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(started).toEqual([1, 2, 3]);
    release[0]();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(started).toEqual([1, 2, 3, 4]);
    release[2](); release[3]();
    await run;
    expect(finished).toEqual([2, 1, 3, 4]);
  });
  it("does not start queued requests after context changes", async () => {
    let current = true;
    const seen: number[] = [];
    await runRulaAnalysisQueue([1, 2, 3, 4], async (id) => { seen.push(id); current = false; }, () => current);
    expect(seen).toEqual([1]);
  });
  it("does not start stale or empty batches", async () => {
    await runRulaAnalysisQueue([1], async () => { throw new Error("unexpected request"); }, () => false);
    await runRulaAnalysisQueue([], async () => { throw new Error("unexpected request"); }, () => true);
  });
});

it("serializes vision calls when requested so paid reservations are released before the next image", async () => {
 let active=0;let maxActive=0;const seen:number[]=[];
 await runRulaAnalysisQueue([1,2,3,4],async id=>{active++;maxActive=Math.max(maxActive,active);await Promise.resolve();seen.push(id);active--;},()=>true,1);
 expect(maxActive).toBe(1);expect(seen).toEqual([1,2,3,4]);
});
