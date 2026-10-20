import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "./core.js";
import { refreshAIQuotaNotifications } from "./notification-feed.js";
import type { AIProviderInput, AIProviderResult } from "./ai-provider.js";

export const DEFAULT_AI_TOKEN_LIMIT = 1_000_000;
export function isAIAccessError(error: unknown): boolean {
  return typeof (error as { code?: unknown } | null)?.code === "string" && String((error as { code: string }).code).startsWith("AI_ACCESS_");
}
export function assertAIAccess(user: { active: boolean; aiEnabled: boolean; aiTokenLimit: number; aiTokensUsed: number } | null) {
  if (!user?.active || !user.aiEnabled) throw Object.assign(new Error("دسترسی شما به هوش مصنوعی غیرفعال است؛ با مدیر سامانه تماس بگیرید."), { statusCode: 403, code: "AI_ACCESS_DISABLED" });
  if (user.aiTokensUsed >= user.aiTokenLimit) throw Object.assign(new Error("سقف مصرف توکن هوش مصنوعی شما تکمیل شده است."), { statusCode: 429, code: "AI_ACCESS_LIMIT_REACHED" });
}

// Reserve the complete output allowance and a conservative input estimate before
// an external call. User row locking serializes concurrent requests across workers.
export async function withAIAllowance(input: AIProviderInput, run: (input: AIProviderInput) => Promise<AIProviderResult>, db: PrismaClient = prisma, imageTokenBudget = 16_000): Promise<AIProviderResult> {
  if (!input.userId) throw Object.assign(new Error("AI user identity is required"), { statusCode: 401, code: "AI_ACCESS_IDENTITY_REQUIRED" });
  const userId = input.userId;
  const id = randomUUID();
  const output = Math.min(8_000, Math.max(128, input.maxOutputTokens ?? 1600));
  const textBytes = Buffer.byteLength(input.message + (input.history ?? []).map(turn => turn.content).join(""), "utf8");
  const amount = textBytes + output + (input.image ? imageTokenBudget : 0) + (input.includeKnowledge === false ? 512 : 16_000);
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM User WHERE id = ${userId} FOR UPDATE`;
    const user = await tx.user.findUnique({ where: { id: userId }, select: { active: true, aiEnabled: true, aiTokenLimit: true, aiTokensUsed: true } });
    assertAIAccess(user);
    await tx.aIQuotaReservation.deleteMany({ where: { userId, expiresAt: { lte: new Date() } } });
    const reserved = await tx.aIQuotaReservation.aggregate({ where: { userId }, _sum: { tokens: true } });
    if (user!.aiTokensUsed + (reserved._sum.tokens ?? 0) + amount > user!.aiTokenLimit) throw Object.assign(new Error("توکن باقی‌مانده برای این درخواست کافی نیست؛ سقف مصرف را با مدیر بررسی کنید."), { statusCode: 429, code: "AI_ACCESS_LIMIT_REACHED" });
    await tx.aIQuotaReservation.create({ data: { id, userId, tokens: amount, expiresAt: new Date(Date.now() + 15 * 60_000) } });
  });
  let result: AIProviderResult | undefined;
  try {
    result = await run({ ...input, maxOutputTokens: output });
    return result;
  } finally {
    await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM User WHERE id = ${userId} FOR UPDATE`;
      const reported = result?.usage?.totalTokens;
      const tokens = result?.provider === "fallback" ? 0 : result ? (Number.isSafeInteger(reported) && reported! >= 0 && reported! <= 2_147_483_647 ? reported! : amount) : 0;
      if (Number.isSafeInteger(tokens) && tokens > 0) await tx.user.update({ where: { id: userId }, data: { aiTokensUsed: { increment: tokens } } });
      await tx.aIQuotaReservation.deleteMany({ where: { id, userId } });
    });
    if (input.organizationId) await refreshAIQuotaNotifications(input.organizationId, userId, new Date(), db).catch(() => undefined);
  }
}
