import { describe, expect, it } from "vitest";
import { DEFAULT_AI_QUOTA_WARNING_THRESHOLD, getAIQuotaStatus } from "./ai-quota.js";

const user = { active: true, aiEnabled: true, aiTokenLimit: 1_000_000, aiTokensUsed: 0 };

describe("personal AI quota status", () => {
  it("uses a configurable 100,000-token warning boundary", () => {
    expect(DEFAULT_AI_QUOTA_WARNING_THRESHOLD).toBe(100_000);
    expect(getAIQuotaStatus({ ...user, aiTokensUsed: 899_999 }).state).toBe("HEALTHY");
    expect(getAIQuotaStatus({ ...user, aiTokensUsed: 900_000 }).state).toBe("LOW");
    expect(getAIQuotaStatus({ ...user, aiTokensUsed: 900_001 }).state).toBe("LOW");
    expect(getAIQuotaStatus({ ...user, aiTokensUsed: 999_999 })).toMatchObject({ remainingTokens: 1, state: "LOW" });
  });

  it("clamps overuse and reports exhausted as a separate state", () => {
    expect(getAIQuotaStatus({ ...user, aiTokensUsed: 1_000_000 })).toMatchObject({ remainingTokens: 0, state: "EXHAUSTED" });
    expect(getAIQuotaStatus({ ...user, aiTokensUsed: 1_000_001 }).remainingTokens).toBe(0);
  });

  it("does not call a fresh small allowance low before it is used", () => {
    expect(getAIQuotaStatus({ ...user, aiTokenLimit: 10, aiTokensUsed: 0 })).toMatchObject({ warningThreshold: 1, remainingTokens: 10, state: "HEALTHY" });
    expect(getAIQuotaStatus({ ...user, aiTokenLimit: 10, aiTokensUsed: 9 })).toMatchObject({ warningThreshold: 1, remainingTokens: 1, state: "LOW" });
    expect(getAIQuotaStatus({ ...user, aiTokenLimit: 0, aiTokensUsed: 0 })).toMatchObject({ warningThreshold: 0, state: "EXHAUSTED" });
  });

  it("reports disabled access without conflating it with exhaustion", () => {
    expect(getAIQuotaStatus({ ...user, aiEnabled: false, aiTokensUsed: user.aiTokenLimit }).state).toBe("DISABLED");
    expect(getAIQuotaStatus({ ...user, active: false }).state).toBe("DISABLED");
  });
});
