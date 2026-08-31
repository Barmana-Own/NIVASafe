import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("AI provider adapters", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    process.env.AI_ENABLED = "true";
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
    expect(availability).toEqual({ fallback: true, openai: true, gemini: true, anthropic: true });
  });

  it.each([
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
});
