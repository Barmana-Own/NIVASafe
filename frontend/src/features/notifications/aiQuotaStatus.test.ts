import { describe, expect, it } from "vitest";
import { isAIQuotaStatus } from "./AIQuotaBanner";

describe("isAIQuotaStatus", () => {
  it("accepts a complete quota response", () => {
    expect(isAIQuotaStatus({
      tokenLimit: 1_000,
      tokensUsed: 100,
      remainingTokens: 900,
      warningThreshold: 100,
      state: "HEALTHY",
      serverTimestamp: "2026-10-20T00:00:00.000Z",
    })).toBe(true);
  });

  it("rejects malformed responses before they can break the application shell", () => {
    expect(isAIQuotaStatus([])).toBe(false);
    expect(isAIQuotaStatus({ state: "LOW", remainingTokens: undefined })).toBe(false);
    expect(isAIQuotaStatus(null)).toBe(false);
  });
});
