import { Prisma } from "@prisma/client";
import type { AIProviderResult, AIUseCase } from "./ai-provider.js";

const MAX_DATABASE_INT = 2_147_483_647;

type AIUsageWriter = {
  aIUsageRecord: {
    upsert(args: Prisma.AIUsageRecordUpsertArgs): Promise<unknown>;
  };
};

export type AIUsageSourceType = "AI_ANALYSIS_REQUEST" | "CHAT_MESSAGE" | "FMEA_IMAGE_REVIEW" | "FMEA_REPORT_DETAILS";

export type AIUsageRecordInput = {
  organizationId: string;
  userId: string;
  useCase: AIUseCase;
  sourceType: AIUsageSourceType;
  sourceId: string;
  result: AIProviderResult;
};

function boundedText(value: string | undefined, maxLength: number, fallback: string) {
  const normalized = value?.trim();
  return (normalized || fallback).slice(0, maxLength);
}

function databaseTokenCount(value: number) {
  return Number.isSafeInteger(value) && value >= 0 && value <= MAX_DATABASE_INT ? value : null;
}

export function buildAIUsageRecordData(input: AIUsageRecordInput): Prisma.AIUsageRecordUncheckedCreateInput | null {
  if (!input.result.usage) return null;
  const inputTokens = databaseTokenCount(input.result.usage.inputTokens);
  const outputTokens = databaseTokenCount(input.result.usage.outputTokens);
  const totalTokens = databaseTokenCount(input.result.usage.totalTokens);
  if (inputTokens === null || outputTokens === null || totalTokens === null) return null;
  return {
    organizationId: input.organizationId,
    userId: input.userId,
    useCase: input.useCase,
    provider: boundedText(input.result.provider, 64, "unknown"),
    model: input.result.model?.trim().slice(0, 128) || null,
    inputTokens,
    outputTokens,
    totalTokens,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
  };
}

export async function recordAIUsage(db: AIUsageWriter, input: AIUsageRecordInput) {
  const data = buildAIUsageRecordData(input);
  if (!data) return false;
  await db.aIUsageRecord.upsert({
    where: { sourceType_sourceId: { sourceType: data.sourceType, sourceId: data.sourceId } },
    create: data,
    update: {},
  });
  return true;
}
