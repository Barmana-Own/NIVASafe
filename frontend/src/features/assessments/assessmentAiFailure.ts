import type { ApiError } from "../../api/client";
/** Preserve actionable access failures; never present them as a vision outage. */
export function assessmentAiFailure(reason: unknown, fallback: string) {
  const failure = reason as Partial<ApiError> | null;
  const stopBatch = Boolean(failure?.code?.startsWith("AI_ACCESS_") || [401, 402, 403, 429].includes(failure?.status ?? 0));
  return { stopBatch, message: stopBatch && typeof failure?.message === "string" && failure.message ? failure.message : fallback };
}

/** A deliberate user retry is separate from permission to replay a paid image automatically. */
export function rulaImageManualRetryAllowed(reason: unknown, stopBatch: boolean) {
  if (stopBatch) return false;
  const failure = reason as Partial<ApiError> | null;
  return failure?.retryable === true || failure?.code === 'NETWORK_ERROR' || Boolean(
    ['RULA_IMAGE_AI_UNAVAILABLE', 'RULA_IMAGE_AI_INVALID_RESPONSE'].includes(failure?.code ?? '') &&
    [408, 500, 502, 503, 504].includes(failure?.status ?? 0),
  );
}
