import { Prisma } from "@prisma/client";
import type { AIProviderResult, AIUseCase } from "./ai-provider.js";

const MAX_DATABASE_INT = 2_147_483_647;

type AIUsageWriter = {
  aIUsageRecord: {
    upsert(args: Prisma.AIUsageRecordUpsertArgs): Promise<unknown>;
  };
};

export type AIUsageSourceType = "AI_ANALYSIS_REQUEST" | "CHAT_MESSAGE" | "FMEA_IMAGE_REVIEW" | "FMEA_REPORT_DETAILS" | "FMEA_ACTION_SUGGESTIONS" | "RULA_IMAGE_REVIEW" | "RULA_TEXT_REVIEW" | "RULA_ACTION_SUGGESTIONS" | "RULA_TASK_DESCRIPTION_SUGGESTION";

export type AIUsageRecordInput = {
  organizationId: string;
  userId: string;
  useCase: AIUseCase;
  sourceType: AIUsageSourceType;
  sourceId: string;
  result: AIProviderResult;
};

/** Combines usage reported by multiple application-level validation attempts into one request record. */
export function aggregateAIProviderUsage(results: readonly AIProviderResult[]): AIProviderResult | null {
  const reported = results.filter((result) => result.usage !== undefined);
  if (!reported.length) return null;
  const providers = [...new Set(reported.map((result) => result.provider))];
  const models = [...new Set(reported.flatMap((result) => result.model ? [result.model] : []))];
  return {
    ...reported[reported.length - 1]!,
    provider: providers.join("+").slice(0, 64),
    model: models.length === 1 ? models[0] : undefined,
    usage: {
      inputTokens: reported.reduce((sum, result) => sum + result.usage!.inputTokens, 0),
      outputTokens: reported.reduce((sum, result) => sum + result.usage!.outputTokens, 0),
      totalTokens: reported.reduce((sum, result) => sum + result.usage!.totalTokens, 0),
    },
  };
}

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
