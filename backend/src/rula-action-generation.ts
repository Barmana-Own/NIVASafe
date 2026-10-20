import { isAIAccessError } from "./ai-access.js";
import { aggregateAIProviderUsage } from "./ai-usage.js";
import { retryRulaInvalidAnswer } from "./rula-ai-retry.js";
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
  let analysis = input.analysis;
  let rawInputs = input.inputs;
  if (analysis.imageAssessments?.length) {
    const observations = analysis.imageAssessments.map(image => {
      const imageInputs = { ...input.inputs, force: image.force, muscleUse: image.muscleUse };
      const sides = buildRulaSideResults(input.bodySide, imageInputs, image.analysis);
      const result = sides ? primaryRulaResult(sides) : calculateRula(rulaInputsForAnalysis(imageInputs, image.analysis));
      return { image, inputs: imageInputs, score: result.score };
    });
    const worst = observations.reduce((current, item) => item.score > current.score ? item : current);
    analysis = { ...worst.image.analysis, imageAssessments: analysis.imageAssessments };
    rawInputs = worst.inputs;
  }
  const sideResults = buildRulaSideResults(input.bodySide, rawInputs, analysis);
  const inputs = rulaInputsForAnalysis(rawInputs, analysis);
  const calculation = sideResults ? primaryRulaResult(sideResults) : calculateRula(inputs);
  const context = { ...input, analysis, inputs, sideResults, score: calculation.score, actionLevel: calculation.actionLevel };
  const providerState: { result: AIProviderResult | null } = { result: null };
  const providerResults: AIProviderResult[] = [];
  let accessError: unknown;
  let reasonCode: "AI_UNAVAILABLE" | "AI_INVALID_RESPONSE" | null = null;
  let parsed: ReturnType<typeof parseRulaActionSuggestions> = [];
  try {
    await retryRulaInvalidAnswer(async () => {
    const providerResult = await provider.analyze({
      organizationId: input.organizationId,
      userId: input.userId,
      message: buildRulaActionSuggestionsPrompt(context),
      locale: input.locale,
      includeKnowledge: false,
      maxOutputTokens: 6000,
      structuredOutput: true,
    });
    providerResults.push(providerResult);
    providerState.result = providerResult;
    if (providerResult.provider !== "fallback") {
      parsed = parseRulaActionSuggestions(providerResult.answer, input.bodySide);
      if (!parsed.length) throw Object.assign(new Error("Invalid RULA corrective actions"), { code: "RULA_AI_INVALID_RESPONSE" });
    }
    });
  } catch (error) {
    if (isAIAccessError(error)) accessError = error;
    else reasonCode = (error as { code?: string }).code === "RULA_AI_INVALID_RESPONSE" ? "AI_INVALID_RESPONSE" : "AI_UNAVAILABLE";
  }
  const providerResult = providerState.result;
  const localFallback = providerResult?.provider === "fallback";

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
    usageResult: aggregateAIProviderUsage(providerResults),
    accessError,
  };
}
