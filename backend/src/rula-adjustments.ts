import { z } from "zod";
import type { RulaActivityInfo } from "./rula-process.js";

export const rulaAdjustmentsSchema = z.object({ force: z.number().int().min(0).max(3), muscleUse: z.boolean() }).strict();
export const rulaAdjustmentSuggestionsSchema = rulaAdjustmentsSchema.partial().strict();
export type RulaAdjustmentSuggestions = z.infer<typeof rulaAdjustmentSuggestionsSchema>;

/** Cornell worksheet context rules; image pixels never establish load or timing.
 * Repetitions/shift and duration/occurrence have different denominators: neither
 * supplies a repetition rate or proves that a short hold is nonrepetitive.
 */
export function suggestRulaActivityAdjustments(activity?: RulaActivityInfo): RulaAdjustmentSuggestions {
  if (!activity) return {};
  const suggestions: RulaAdjustmentSuggestions = {};
  const hold = activity.postureHoldDuration;
  const multiplier = { SECOND: 1, MINUTE: 60, HOUR: 3600 };
  const holdSeconds = typeof hold === "number" && Number.isFinite(hold) && hold > 0 && activity.postureHoldUnit
    ? hold * multiplier[activity.postureHoldUnit] : undefined;
  if (holdSeconds !== undefined && holdSeconds > 60) suggestions.muscleUse = true;
  const weight = activity.loadWeight;
  if (typeof weight !== "number" || !Number.isFinite(weight) || weight < 0 || !activity.loadUnit) return suggestions;
  const kilograms = activity.loadUnit === "LB" ? weight * 0.45359237 : weight;
  if (kilograms === 0) suggestions.force = 0;
  else if (kilograms > 10) suggestions.force = 3;
  else if (kilograms >= 2 && suggestions.muscleUse === true) suggestions.force = 2;
  // Intermittency is not an input: do not invent force 0/1 or muscleUse=false.
  return suggestions;
}
