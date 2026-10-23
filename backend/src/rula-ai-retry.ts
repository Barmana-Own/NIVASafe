/** Retry a malformed model answer once, without multiplying provider-level network retries. */
export async function retryRulaInvalidAnswer<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await operation(); }
    catch (error) {
      const code = (error as { code?: string }).code;
      if (attempt > 0 || !["RULA_IMAGE_AI_INVALID_RESPONSE", "RULA_IMAGE_AI_EMPTY_OBSERVATION", "RULA_AI_INVALID_RESPONSE"].includes(code ?? "")) throw error;
    }
  }
}
