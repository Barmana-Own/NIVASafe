import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./ai-access.js", () => ({
  isAIAccessError: (error: { code?: string }) => error?.code?.startsWith("AI_ACCESS_"),
  withAIAllowance: (input: unknown, run: (input: unknown) => unknown) => run(input),
}));

describe("assessment model and gateway policy", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("AI_ENABLED", "true");
    vi.stubEnv("AI_RISK_PROVIDER", "arvancloud");
    vi.stubEnv("AI_CHAT_PROVIDER", "arvancloud");
    vi.stubEnv("AI_PROVIDER_MAX_ATTEMPTS", "1");
    vi.stubEnv("ARVAN_API_KEY", "test-arvan");
    vi.stubEnv("ARVAN_BASE_URL", "https://api.arvancloudai.ir/v1");
    vi.stubEnv("GAPGPT_API_KEY", "test-gapgpt");
    vi.stubEnv("GAPGPT_BASE_URL", "https://api.gapgpt.test/v1");
    vi.stubEnv("OPENAI_API_KEY", "test-openai");
    vi.stubEnv("GEMINI_API_KEY", "test-gemini");
    vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic");
    vi.doMock("./core.js", () => ({ prisma: { knowledgeDocument: { findMany: vi.fn().mockResolvedValue([]) } } }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("pins every assessment selector to Arvan despite stale provider, model and fallback overrides", async () => {
    vi.stubEnv("AI_RISK_PROVIDER", "openai");
    vi.stubEnv("AI_DEFAULT_PROVIDER", "gemini");
    vi.stubEnv("AI_RISK_MODEL", "GPT-4o-mini");
    vi.stubEnv("AI_RISK_FALLBACK_PROVIDER", "gapgpt");
    vi.stubEnv("AI_RISK_FALLBACK_MODEL", "GPT-4.1-Mini");
    const fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ model: "gpt-5-mini-2025-08-07", output_text: "verified", choices: [{ message: { content: "verified" } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const api = await import("./ai-provider.js");
    expect(api.getConfiguredAIProviderName("risk")).toBe("arvancloud");
    const selectors = [api.getAvailableAIProvider("risk"), api.getAvailableAssessmentAIProvider(), api.getAssessmentImageAIProvider(), api.getRulaPostureImageAIProvider(), api.getRoutedAIProvider("risk", "gapgpt")];
    for (const provider of selectors) {
      expect(provider.name).toBe("arvancloud");
      await provider.analyze({ organizationId: "stage", message: "Synthetic assessment", includeKnowledge: false });
    }
    expect(fetchMock).toHaveBeenCalledTimes(selectors.length);
    for (const [url, options] of fetchMock.mock.calls) {
      expect(url).toBe("https://api.arvancloudai.ir/v1/chat/completions");
      expect(JSON.parse(String(options.body)).model).toBe("GPT-5-Mini");
    }
  });

  it("fails visibly instead of using another provider or local assessment fallback", async () => {
    vi.stubEnv("AI_RISK_FALLBACK_PROVIDER", "openai");
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    const { getAvailableAIProvider } = await import("./ai-provider.js");
    await expect(getAvailableAIProvider("risk").analyze({ organizationId: "stage", message: "Synthetic assessment", includeKnowledge: false })).rejects.toMatchObject({ code: "PROVIDER_REQUEST_FAILED", statusCode: 503 });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.arvancloudai.ir/v1/chat/completions");
  });

  it.each(["gapgpt", "openai", "gemini", "anthropic", "fallback"])("rejects direct assessment dispatch to %s before any request", async (name) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { getAIProvider } = await import("./ai-provider.js");
    const provider = getAIProvider(name, "risk");
    expect(provider.available()).toBe(false);
    await expect(provider.analyze({ organizationId: "stage", message: "Synthetic assessment", includeKnowledge: false })).rejects.toMatchObject({ code: "ASSESSMENT_PROVIDER_NOT_APPROVED", statusCode: 503 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks an assessment endpoint override outside the approved Arvan gateway", async () => {
    vi.stubEnv("ARVAN_BASE_URL", "https://another-gateway.example/v1");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { getRulaPostureImageAIProvider } = await import("./ai-provider.js");
    const provider = getRulaPostureImageAIProvider();
    expect(provider.available()).toBe(false);
    await expect(provider.analyze({ organizationId: "stage", message: "Synthetic assessment", includeKnowledge: false })).rejects.toMatchObject({ code: "ASSESSMENT_PROVIDER_NOT_APPROVED" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserves DeepSeek chat while assessment environment values are overridden", async () => {
    vi.stubEnv("AI_CHAT_MODEL", "GPT-5-Mini");
    vi.stubEnv("ARVAN_CHAT_MODEL", "gpt-4o-mini");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ model: "DeepSeek-V4-Flash", choices: [{ message: { content: "Chat response" } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { getAIProvider } = await import("./ai-provider.js");
    const result = await getAIProvider("arvancloud", "chat").analyze({ organizationId: "stage", message: "Hello", includeKnowledge: false });
    expect(result.model).toBe("DeepSeek-V4-Flash");
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).model).toBe("DeepSeek-V4-Flash");
  });

  it.each(["gpt-5-mini-2025-08-07", "openai/gpt-5-mini"])("keeps the historical diagnostic probe on the approved assessment model when Arvan reports %s", async model => {
    const output = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ model, choices: [{ message: { content: "OK" } }], usage: { total_tokens: 10 } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await import(new URL("../../scripts/probe-efficient-vision-model.mjs", import.meta.url).href);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.arvancloudai.ir/v1/chat/completions");
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).model).toBe("GPT-5-Mini");
    expect(JSON.parse(output.mock.calls[0]?.[0] as string)).toMatchObject({ requestedModel: "GPT-5-Mini", effectiveModel: model, accepted: true });
  });

  it("allows a staging-specific longer image deadline while retaining a hard two-minute cap", async () => {
    vi.stubEnv("RULA_IMAGE_PROVIDER_TIMEOUT_MS", "999999");
    vi.useFakeTimers();
    try {
      const fetchMock = vi.fn((_url: unknown, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })), { once: true });
      }));
      vi.stubGlobal("fetch", fetchMock);
      const { getRulaPostureImageAIProvider } = await import("./ai-provider.js");
      const pending = getRulaPostureImageAIProvider().analyze({ organizationId: "stage", message: "Synthetic posture", imagePurpose: "rula-posture", includeKnowledge: false, image: { mimeType: "image/png", base64: "synthetic" } });
      const outcome = pending.then(() => null, error => error);
      await vi.advanceTimersByTimeAsync(119_999);
      expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(await outcome).toMatchObject({ code: "PROVIDER_TIMEOUT", retryable: true });
      expect(fetchMock).toHaveBeenCalledOnce();
    } finally { vi.useRealTimers(); }
  });
});
