import { z } from "zod";
import type { generateRulaActionSuggestions } from "./rula-action-generation.js";

export const RULA_REPORT_AI_SNAPSHOT = "RULA_REPORT_AI_SNAPSHOT";
export type RulaSuggestionResponse = Awaited<ReturnType<typeof generateRulaActionSuggestions>>["response"];
const snapshotSchema = z.object({
  snapshotVersion: z.literal(1),
  response: z.object({
    suggestions: z.array(z.object({
      id: z.string().min(1).max(240),
      titleFa: z.string().max(1000), titleEn: z.string().max(1000),
      descriptionFa: z.string().max(10000), descriptionEn: z.string().max(10000),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
      scoreReduction: z.number().min(0).max(7),
      affectedParts: z.array(z.enum(["upperArm", "lowerArm", "wrist", "wristTwist", "neck", "trunk", "legs"])).max(7),
      bodySide: z.enum(["LEFT", "RIGHT", "BOTH"]), source: z.enum(["AI", "FALLBACK"]).optional(),
    })).max(20),
    provider: z.string().max(240), model: z.string().max(240).nullable(),
    aiStatus: z.enum(["connected", "fallback", "unavailable"]),
    reasonCode: z.enum(["AI_UNAVAILABLE", "AI_INVALID_RESPONSE"]).nullable(),
    reasonMessage: z.string().max(1000).nullable(), minimum: z.literal(0), maximum: z.literal(20),
  }),
});

export function parseRulaSuggestionSnapshot(metadata: unknown): RulaSuggestionResponse | null {
  const parsed = snapshotSchema.safeParse(metadata);
  return parsed.success ? parsed.data.response : null;
}

// Database snapshots survive refreshes and process restarts. Single flight only
// coalesces concurrent first requests in this API process; it is not the cache.
export function createRulaSuggestionSingleFlight() {
  const pending = new Map<string, Promise<RulaSuggestionResponse>>();
  return (key: string, generate: () => Promise<RulaSuggestionResponse>) => {
    const active = pending.get(key);
    if (active) return active;
    const task = Promise.resolve().then(generate).finally(() => pending.delete(key));
    pending.set(key, task);
    return task;
  };
}
