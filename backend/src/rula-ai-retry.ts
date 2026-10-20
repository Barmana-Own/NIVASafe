/** Retry a malformed model answer once, without multiplying provider-level network retries. */
export async function retryInvalidAIAnswer<T>(operation: () => Promise<T>, retryableCodes: readonly string[]): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await operation(); }
    catch (error) {
      const code = (error as { code?: string }).code;
      if (attempt > 0 || !retryableCodes.includes(code ?? "")) throw error;
    }
  }
}

export function retryRulaInvalidAnswer<T>(operation: () => Promise<T>): Promise<T> {
  return retryInvalidAIAnswer(operation, ["RULA_IMAGE_AI_INVALID_RESPONSE", "RULA_IMAGE_AI_EMPTY_OBSERVATION", "RULA_AI_INVALID_RESPONSE"]);
}
