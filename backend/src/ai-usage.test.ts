import { describe, expect, it, vi } from "vitest";
import { buildAIUsageRecordData, recordAIUsage } from "./ai-usage.js";

const result = {
  provider: "arvancloud",
  model: "GPT-5-Mini",
  answer: "answer",
  citations: [],
  confidence: 0.8,
  usage: { inputTokens: 120, outputTokens: 30, totalTokens: 150 },
};

describe("AI usage accounting", () => {
  it("builds a bounded per-request usage record", () => {
    expect(buildAIUsageRecordData({ organizationId: "org", userId: "user", useCase: "risk", sourceType: "AI_ANALYSIS_REQUEST", sourceId: "request", result })).toMatchObject({
      organizationId: "org",
      userId: "user",
      useCase: "risk",
      provider: "arvancloud",
      model: "GPT-5-Mini",
      inputTokens: 120,
      outputTokens: 30,
      totalTokens: 150,
      sourceType: "AI_ANALYSIS_REQUEST",
      sourceId: "request",
    });
  });

  it("does not report estimated usage when a provider did not return counts", () => {
    expect(buildAIUsageRecordData({ organizationId: "org", userId: "user", useCase: "chat", sourceType: "CHAT_MESSAGE", sourceId: "message", result: { ...result, usage: undefined } })).toBeNull();
  });

  it("uses the source identity as an idempotency key", async () => {
    const upsert = vi.fn().mockResolvedValue({});
    await recordAIUsage({ aIUsageRecord: { upsert } }, { organizationId: "org", userId: "user", useCase: "chat", sourceType: "CHAT_MESSAGE", sourceId: "message", result });
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { sourceType_sourceId: { sourceType: "CHAT_MESSAGE", sourceId: "message" } },
      update: {},
    }));
  });
});
