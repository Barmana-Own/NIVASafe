import { api, type ApiEnvelope } from "../../api/client";
function waitForRetry(delay: number, signal?: AbortSignal | null) {
  return new Promise<void>((resolve, reject) => {
    const abort = () => { clearTimeout(timer); signal?.removeEventListener("abort", abort); reject(new DOMException("Cancelled", "AbortError")); };
    const timer = setTimeout(() => { signal?.removeEventListener("abort", abort); resolve(); }, delay);
    if (signal?.aborted) abort(); else signal?.addEventListener("abort", abort, { once: true });
  });
}
/** Bounded automatic recovery; image retries resend the same photo and anatomical side. */
export async function rulaAiRequest<T>(path: string, options: RequestInit): Promise<ApiEnvelope<T>> {
  const imageAnalysis = path === "/rula/posture-image-analysis";
  const maxAttempts = imageAnalysis ? 3 : 2;
  for (let attempt = 0; ; attempt++) {
    options.signal?.throwIfAborted();
    try {
      const response = await api<T>(path, options);
      const data = response.data as { aiStatus?: string; reasonCode?: string | null; provider?: string };
      if (imageAnalysis && (data.aiStatus === "unavailable" || data.reasonCode || data.provider === "fallback")) {
        throw Object.assign(new Error("Image analysis did not return a validated vision result"), { status: 503, code: "RULA_IMAGE_AI_UNAVAILABLE", retryable: false });
      }
      if (data.aiStatus === "unavailable" || data.reasonCode || data.provider === "fallback") {
        if (attempt + 1 < maxAttempts) { await waitForRetry(imageAnalysis ? 1000 * 3 ** attempt : 600, options.signal); continue; }
        if (imageAnalysis) throw Object.assign(new Error("Image analysis is unavailable"), { status: 503, code: "RULA_IMAGE_AI_UNAVAILABLE" });
      }
      return response;
    } catch (error) {
      const failure = error as { status?: number; name?: string; code?: string; retryable?: boolean };
      const transientStatus = failure.status !== undefined && [408, 429, 500, 502, 503, 504].includes(failure.status);
      // An image upload may have completed server-side before a connection drops. Retry only
      // when the API explicitly confirms that the provider attempt is safe to repeat.
      const retryable = failure.retryable === true || (!imageAnalysis && failure.retryable !== false && transientStatus);
      if (failure.code?.startsWith("AI_ACCESS_") || attempt + 1 >= maxAttempts || options.signal?.aborted || failure.name === "AbortError" || !retryable) throw error;
      await waitForRetry(imageAnalysis ? 1000 * 3 ** attempt : 600, options.signal);
    }
  }
}
