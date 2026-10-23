import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), update: vi.fn(), provider: vi.fn(), handlers: [] as Array<{ queue: string; run: (job: { data: { requestId: string } }) => Promise<unknown> }> }));
vi.mock("./core.js", () => ({ prisma: { aIAnalysisRequest: { findUnique: mocks.findUnique, update: mocks.update } } }));
vi.mock("./ai-provider.js", () => ({ describeAIProviderError: vi.fn(), getRoutedAIProvider: mocks.provider }));
vi.mock("./ai-usage.js", () => ({ recordAIUsage: vi.fn() }));
vi.mock("./mail.js", () => ({ deliverEmailOutbox: vi.fn() }));
vi.mock("ioredis", () => ({ Redis: vi.fn(function () { return { quit: vi.fn() }; }) }));
vi.mock("bullmq", () => ({ Worker: vi.fn(function (queue: string, run: (job: { data: { requestId: string } }) => Promise<unknown>) { mocks.handlers.push({ queue, run }); return { close: vi.fn() }; }) }));
const before = new Map((["SIGINT", "SIGTERM"] as const).map(name => [name, process.listeners(name)]));
afterEach(() => {
  for (const name of ["SIGINT", "SIGTERM"] as const) for (const listener of process.listeners(name)) if (!before.get(name)?.includes(listener)) process.removeListener(name, listener);
  vi.unstubAllEnvs();
  vi.resetModules();
});
it("never replays a persisted image result as text even if a queue job is forged", async () => {
  vi.stubEnv("REDIS_URL", "redis://127.0.0.1:1");
  mocks.findUnique.mockResolvedValue({ id: "image-result-a", type: "RULA_POSTURE_IMAGE", status: "SUCCEEDED", input: { purpose: "rula-posture" } });
  await import("./worker.js");
  const worker = mocks.handlers.find(item => item.queue === "nivasafe-ai");
  expect(worker).toBeDefined();
  await worker!.run({ data: { requestId: "image-result-a" } });
  expect(mocks.provider).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
});
