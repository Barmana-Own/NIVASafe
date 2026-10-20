export type AIQuotaState = "HEALTHY" | "LOW" | "EXHAUSTED" | "DISABLED";
export type AIQuotaAccount = {
  active: boolean;
  aiEnabled: boolean;
  aiTokenLimit: number;
  aiTokensUsed: number;
};

export type AIQuotaStatus = {
  tokenLimit: number;
  tokensUsed: number;
  remainingTokens: number;
  warningThreshold: number;
  state: AIQuotaState;
  serverTimestamp: string;
};

function parsePositiveInteger(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 2_147_483_647 ? parsed : null;
}

export const DEFAULT_AI_QUOTA_WARNING_THRESHOLD = parsePositiveInteger(process.env.AI_QUOTA_WARNING_THRESHOLD)
  ?? 100_000;

export function getAIQuotaStatus(
  account: AIQuotaAccount,
  now = new Date(),
  configuredThreshold = DEFAULT_AI_QUOTA_WARNING_THRESHOLD,
): AIQuotaStatus {
  const tokenLimit = Math.max(0, Math.trunc(account.aiTokenLimit));
  const tokensUsed = Math.max(0, Math.trunc(account.aiTokensUsed));
  const remainingTokens = Math.max(0, tokenLimit - tokensUsed);
  // Small allowances use a 10% warning point. A fresh allowance is never LOW;
  // this keeps a small plan from appearing exhausted on first login.
  const warningThreshold = tokenLimit === 0
    ? 0
    : Math.min(Math.max(1, Math.trunc(configuredThreshold)), Math.max(1, Math.floor(tokenLimit / 10)));
  const state: AIQuotaState = !account.active || !account.aiEnabled
    ? "DISABLED"
    : remainingTokens <= 0
      ? "EXHAUSTED"
      : tokensUsed > 0 && remainingTokens <= warningThreshold
        ? "LOW"
        : "HEALTHY";

  return { tokenLimit, tokensUsed, remainingTokens, warningThreshold, state, serverTimestamp: now.toISOString() };
}
