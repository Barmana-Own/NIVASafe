import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("AI provider adapters", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    process.env.AI_ENABLED = "true";
    process.env.AI_RISK_PROVIDER = "arvancloud";
    process.env.AI_RISK_MODEL = "GPT-5-Mini";
    process.env.AI_RISK_FALLBACK_PROVIDER = "arvancloud";
    process.env.AI_RISK_FALLBACK_MODEL = "";
    process.env.AI_CHAT_PROVIDER = "arvancloud";
    process.env.AI_CHAT_MODEL = "DeepSeek-V4-Flash";
    process.env.AI_CHAT_MAX_OUTPUT_TOKENS = "900";
    process.env.AI_MAX_OUTPUT_TOKENS = "1600";
    process.env.AI_PROVIDER_TIMEOUT_MS = "30000";
    process.env.AI_PROVIDER_MAX_ATTEMPTS = "2";
    process.env.AI_PROVIDER_RETRY_DELAY_MS = "0";
    process.env.ARVAN_API_KEY = "test-arvancloud";
    process.env.ARVAN_BASE_URL = "https://api.arvancloudai.ir/v1";
    process.env.OPENAI_API_KEY = "test-openai";
    process.env.OPENAI_CHAT_MODEL = "test-openai-model";
    process.env.GEMINI_API_KEY = "test-gemini";
    process.env.GEMINI_CHAT_MODEL = "test-gemini-model";
    process.env.ANTHROPIC_API_KEY = "test-anthropic";
    process.env.ANTHROPIC_CHAT_MODEL = "test-anthropic-model";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports configured providers as available", async () => {
    const { listAIProviders } = await import("./ai-provider.js");
    const availability = Object.fromEntries(listAIProviders().map((item) => [item.name, item.available]));
    expect(availability).toEqual({ fallback: true, arvancloud: true, openai: true, gemini: true, anthropic: true });
    expect(listAIProviders().find((item) => item.name === "arvancloud")).toMatchObject({ configuredForRisk: true, configuredForChat: true });
  });

  it.each([
    ["arvancloud", { choices: [{ message: { content: "ArvanCloud answer" } }] }, "ArvanCloud answer"],
    ["openai", { output: [{ content: [{ type: "output_text", text: "OpenAI answer" }] }] }, "OpenAI answer"],
    ["gemini", { candidates: [{ content: { parts: [{ text: "Gemini answer" }] } }] }, "Gemini answer"],
    ["anthropic", { content: [{ type: "text", text: "Anthropic answer" }] }, "Anthropic answer"],
  ] as const)("parses %s text responses", async (name, payload, expected) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    vi.doMock("./core.js", () => ({ prisma: { knowledgeDocument: { findMany: vi.fn().mockResolvedValue([]) } } }));
    const { getAIProvider } = await import("./ai-provider.js");
    const result = await getAIProvider(name).analyze({ organizationId: "org", message: "risk guidance" });
    expect(result.answer).toBe(expected);
    expect(result.provider).toBe(name);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("uses role-specific ArvanCloud models through the chat completions endpoint", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: "Role-aware answer" } }] }), { status: 200 })));
    vi.stubGlobal("fetch", fetchMock);
    vi.doMock("./core.js", () => ({ prisma: { knowledgeDocument: { findMany: vi.fn().mockResolvedValue([]) } } }));
    const { getAIProvider } = await import("./ai-provider.js");

    await getAIProvider("arvancloud", "risk").analyze({ organizationId: "org", message: "risk guidance" });
    const riskBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.arvancloudai.ir/v1/chat/completions");
    expect(riskBody.model).toBe("GPT-5-Mini");
    expect(riskBody.max_tokens).toBe(1600);
    expect(riskBody.messages[0].content).toContain("Do not introduce yourself");
    expect(riskBody.messages[0].content).not.toContain("Introduce yourself as the NIVASafe intelligent assistant");

    await getAIProvider("arvancloud", "chat").analyze({ organizationId: "org", message: "chat guidance", history: [{ role: "user", content: "Earlier question" }, { role: "assistant", content: "Earlier answer" }] });
    const chatBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(chatBody.model).toBe("DeepSeek-V4-Flash");
    expect(chatBody.max_tokens).toBe(900);
    expect(chatBody.messages[0].content).toContain("Introduce yourself as the NIVASafe intelligent assistant");
    expect(chatBody.messages[1].content).toContain("Recent conversation history (reference only):");
    expect(chatBody.messages[1].content).toContain("User: Earlier question");
    expect(chatBody.messages[1].content).toContain("Assistant: Earlier answer");
  });

  it("keeps the assistant introduction in chat fallback responses only", async () => {
    vi.doMock("./core.js", () => ({ prisma: { knowledgeDocument: { findMany: vi.fn().mockResolvedValue([]) } } }));
    const { getAIProvider } = await import("./ai-provider.js");
    const chat = await getAIProvider("fallback", "chat").analyze({ organizationId: "org", message: "سلام" });
    const risk = await getAIProvider("fallback", "risk").analyze({ organizationId: "org", message: "پیشنهاد کنترل خطر" });
    expect(chat.answer).toContain("من دستیار هوشمند سامانه NIVASafe");
    expect(risk.answer).not.toContain("من دستیار هوشمند سامانه NIVASafe");
    expect(risk.answer).toContain("راهنمای پایه:");
  });

  it("removes a known assistant introduction from risk-provider output", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "من دستیار هوشمند NIVASafe برای ایمنی و بهداشت حرفه‌ای هستم.\n\nکنترل پیشنهادی: حفاظ‌گذاری دستگاه." } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.doMock("./core.js", () => ({ prisma: { knowledgeDocument: { findMany: vi.fn().mockResolvedValue([]) } } }));
    const { getAIProvider } = await import("./ai-provider.js");
    const result = await getAIProvider("arvancloud", "risk").analyze({ organizationId: "org", message: "پیشنهاد کنترل خطر" });
    expect(result.answer).toBe("کنترل پیشنهادی: حفاظ‌گذاری دستگاه.");
  });

  it("sends FMEA image reviews as multimodal ArvanCloud messages", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: '{"summary":"ok","riskRows":[]}' } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.doMock("./core.js", () => ({ prisma: { knowledgeDocument: { findMany: vi.fn().mockResolvedValue([]) } } }));
    const { getAIProvider } = await import("./ai-provider.js");

    const provider = getAIProvider("arvancloud", "risk");
    expect(provider.supportsImages()).toBe(true);
    await provider.analyze({ organizationId: "org", message: "image review", image: { mimeType: "image/png", base64: "iVBORw0KGgo=" } });
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.messages[1].content[0]).toMatchObject({ type: "text" });
    expect(body.messages[1].content[1]).toEqual({ type: "image_url", image_url: { url: "data:image/png;base64,iVBORw0KGgo=" } });
  });

  it("retries a transient provider response with bounded attempts", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "temporary outage" } }), { status: 503, headers: { "retry-after": "0" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: "Recovered answer" } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.doMock("./core.js", () => ({ prisma: { knowledgeDocument: { findMany: vi.fn().mockResolvedValue([]) } } }));
    const { getAIProvider } = await import("./ai-provider.js");

    const result = await getAIProvider("arvancloud", "risk").analyze({ organizationId: "org", message: "risk guidance" });
    expect(result.answer).toBe("Recovered answer");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries a transient network failure before returning the provider response", async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: "Network recovered answer" } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.doMock("./core.js", () => ({ prisma: { knowledgeDocument: { findMany: vi.fn().mockResolvedValue([]) } } }));
    const { getAIProvider } = await import("./ai-provider.js");

    const result = await getAIProvider("arvancloud", "risk").analyze({ organizationId: "org", message: "risk guidance" });
    expect(result.answer).toBe("Network recovered answer");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("normalises provider token usage without trusting malformed counts", async () => {
    const { normaliseAIUsage } = await import("./ai-provider.js");
    expect(normaliseAIUsage({ prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 })).toEqual({ inputTokens: 12, outputTokens: 8, totalTokens: 20 });
    expect(normaliseAIUsage({ input_tokens: 14, output_tokens: 6 })).toEqual({ inputTokens: 14, outputTokens: 6, totalTokens: 20 });
    expect(normaliseAIUsage({ promptTokenCount: 9, candidatesTokenCount: 4, totalTokenCount: 13 })).toEqual({ inputTokens: 9, outputTokens: 4, totalTokens: 13 });
    expect(normaliseAIUsage({ prompt_tokens: -1, completion_tokens: "not-a-number" })).toBeUndefined();
  });

  it("returns usage and the configured model with a successful ArvanCloud response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ model: "GPT-5-Mini", choices: [{ message: { content: "Usage-aware answer" } }], usage: { prompt_tokens: 21, completion_tokens: 7, total_tokens: 28 } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.doMock("./core.js", () => ({ prisma: { knowledgeDocument: { findMany: vi.fn().mockResolvedValue([]) } } }));
    const { getAIProvider } = await import("./ai-provider.js");
    const result = await getAIProvider("arvancloud", "risk").analyze({ organizationId: "org", message: "risk guidance" });
    expect(result.model).toBe("GPT-5-Mini");
    expect(result.usage).toEqual({ inputTokens: 21, outputTokens: 7, totalTokens: 28 });
  });

  it("fails over risk requests to the configured secondary ArvanCloud model", async () => {
    process.env.AI_RISK_FALLBACK_MODEL = "GPT-5-Mini";
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error("primary unavailable"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: "Fallback answer" } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.doMock("./core.js", () => ({ prisma: { knowledgeDocument: { findMany: vi.fn().mockResolvedValue([]) } } }));
    const { getAvailableAIProvider } = await import("./ai-provider.js");

    const result = await getAvailableAIProvider("risk").analyze({ organizationId: "org", message: "risk guidance" });
    const fallbackBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(result.answer).toBe("Fallback answer");
    expect(result.usedFallback).toBe(true);
    expect(fallbackBody.model).toBe("GPT-5-Mini");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reports the configured fallback model without exposing credentials", async () => {
    process.env.AI_RISK_FALLBACK_MODEL = "GPT-5-Mini";
    const { listAIProviders } = await import("./ai-provider.js");
    expect(listAIProviders().find((item) => item.name === "arvancloud")).toMatchObject({ riskModel: "GPT-5-Mini", riskFallbackProvider: "arvancloud", riskFallbackModel: "GPT-5-Mini" });
    expect(JSON.stringify(listAIProviders())).not.toContain("test-arvancloud");
  });

  it("does not enable ArvanCloud for an unsafe base URL", async () => {
    process.env.ARVAN_BASE_URL = "https://user:password@example.com/v1";
    const { getAIProvider } = await import("./ai-provider.js");
    expect(getAIProvider("arvancloud", "chat").available()).toBe(false);
    expect(getAIProvider("arvancloud", "chat").unavailableReason()).toBe("ARVAN_BASE_URL is invalid");
  });
});
