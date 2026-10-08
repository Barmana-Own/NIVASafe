import { calculateRula } from "@nivasafe/domain";
import { z } from "zod";
import { getAvailableAssessmentAIProvider, type AIProviderResult } from "./ai-provider.js";
import { buildRulaActionSuggestionsPrompt, fallbackRulaActionSuggestions, mergeRulaActionSuggestions, parseRulaActionSuggestions, type RulaActionSuggestionContext } from "./assessment-action-suggestions.js";
import { rulaActivityInfoSchema, rulaBodySideSchema } from "./rula-process.js";
import { rulaPostureAnalysisSchema } from "./rula-posture.js";
import { buildRulaSideResults, primaryRulaResult, RULA_CORRECTIVE_SUGGESTION_MAX, rulaInputSchema, rulaInputsForAnalysis } from "./rula-report.js";

export const rulaActionSuggestionBodySchema = z.object({
  bodySide: rulaBodySideSchema,
  inputs: rulaInputSchema,
  postureAnalysis: rulaPostureAnalysisSchema,
  // Advisory generation can use validated posture/score data before the task
  // form is complete. Do not weaken the required fields for saving assessments.
  activityInfo: z.preprocess(value => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return value;
    const fields = value as Record<string, unknown>;
    return { ...fields, jobTitle: fields.jobTitle ?? "", taskDescription: fields.taskDescription ?? "" };
  }, rulaActivityInfoSchema.safeExtend({
    jobTitle: z.string().trim().max(180),
    taskDescription: z.string().trim().max(500),
  })).optional(),
  locale: z.enum(["fa", "en"]).default("fa"),
}).strict().superRefine((value, context) => {
  if (value.bodySide === "BOTH" && (!value.postureAnalysis.sideAnalyses?.LEFT || !value.postureAnalysis.sideAnalyses.RIGHT)) {
    context.addIssue({ code: "custom", path: ["postureAnalysis", "sideAnalyses"], message: "Independent LEFT and RIGHT posture analyses are required for BOTH" });
  }
});

type GenerationInput = Omit<RulaActionSuggestionContext, "score" | "actionLevel" | "sideResults"> & {
  organizationId: string;
  userId: string;
  existingActionTitles?: string[];
};

export async function generateRulaActionSuggestions(input: GenerationInput) {
  const provider = getAvailableAssessmentAIProvider();
  const sideResults = buildRulaSideResults(input.bodySide, input.inputs, input.analysis);
  const inputs = rulaInputsForAnalysis(input.inputs, input.analysis);
  const calculation = sideResults ? primaryRulaResult(sideResults) : calculateRula(inputs);
  const context = { ...input, inputs, sideResults, score: calculation.score, actionLevel: calculation.actionLevel };
  let providerResult: AIProviderResult | null = null;
  let reasonCode: "AI_UNAVAILABLE" | "AI_INVALID_RESPONSE" | null = null;
  try {
    providerResult = await provider.analyze({
      organizationId: input.organizationId,
      userId: input.userId,
      message: buildRulaActionSuggestionsPrompt(context),
      locale: input.locale,
      includeKnowledge: false,
      maxOutputTokens: 6000,
      structuredOutput: true,
    });
  } catch {
    reasonCode = "AI_UNAVAILABLE";
  }
  const localFallback = providerResult?.provider === "fallback";
  const parsed = providerResult && !localFallback ? parseRulaActionSuggestions(providerResult.answer, input.bodySide) : [];
  if (localFallback) reasonCode = "AI_UNAVAILABLE";
  else if (providerResult && !parsed.length) reasonCode = "AI_INVALID_RESPONSE";
  // Filter registered actions only after validating the model output. An empty
  // list after filtering is a successful response and must not be padded.
  const suggestions = mergeRulaActionSuggestions(
    reasonCode ? [] : parsed,
    reasonCode ? fallbackRulaActionSuggestions(context) : [],
    input.existingActionTitles,
  );
  const aiStatus = reasonCode ? localFallback ? "fallback" as const : "unavailable" as const : providerResult?.usedFallback ? "fallback" as const : "connected" as const;
  const reasonMessage = reasonCode === "AI_UNAVAILABLE"
    ? "AI suggestions are unavailable. Local advisory suggestions are provided for review."
    : reasonCode === "AI_INVALID_RESPONSE"
      ? "AI returned no usable corrective actions. Local advisory suggestions are provided for review."
      : null;
  return {
    response: { suggestions, provider: providerResult?.provider ?? provider.name, model: providerResult?.model ?? null, aiStatus, reasonCode, reasonMessage, minimum: 0, maximum: RULA_CORRECTIVE_SUGGESTION_MAX },
    providerResult,
  };
}
