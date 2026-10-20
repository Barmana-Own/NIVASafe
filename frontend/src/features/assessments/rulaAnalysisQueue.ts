// Two independent vision requests at a time; never enqueue stale work.
export type RulaAutomaticAnalysisMode = "images" | "text" | null;

export function hasRulaActivityContext(jobTitle: string, taskDescription: string): boolean {
  return jobTitle.trim().length >= 2 && taskDescription.trim().length >= 2;
}

export function canStartRulaAutomaticAnalysis(mode: RulaAutomaticAnalysisMode, jobTitle: string, taskDescription: string): boolean {
  if (mode === "images") return true;
  return mode === "text" && hasRulaActivityContext(jobTitle, taskDescription);
}

export function getRulaAutomaticAnalysisMode(step: 1 | 2 | 3, hasImages: boolean): RulaAutomaticAnalysisMode {
  if (hasImages) return "images";
  return step === 2 ? "text" : null;
}

export async function runRulaAnalysisQueue<T>(items: readonly T[], analyze: (item: T) => Promise<void>, isCurrent: () => boolean, concurrency = 2) {
  let next = 0;
  async function worker() {
    while (isCurrent() && next < items.length) {
      const item = items[next++];
      await analyze(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(Math.max(1, Math.min(2, Math.floor(concurrency))), items.length) }, worker));
}
