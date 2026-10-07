// Two independent vision requests at a time; never enqueue stale work.
export async function runRulaAnalysisQueue<T>(items: readonly T[], analyze: (item: T) => Promise<void>, isCurrent: () => boolean) {
  let next = 0;
  async function worker() {
    while (isCurrent() && next < items.length) {
      const item = items[next++];
      await analyze(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(2, items.length) }, worker));
}
