import { expect, it, vi } from "vitest";
import { retryRulaInvalidAnswer } from "./rula-ai-retry.js";
it("recovers an incomplete answer once", async () => {
  const operation = vi.fn().mockRejectedValueOnce(Object.assign(new Error("Malformed"), { code: "RULA_IMAGE_AI_INVALID_RESPONSE" })).mockResolvedValueOnce({ sides: { RIGHT: {} } });
  await expect(retryRulaInvalidAnswer(operation)).resolves.toMatchObject({ sides: { RIGHT: {} } }); expect(operation).toHaveBeenCalledTimes(2);
});
it("bounds invalid-answer retries and does not multiply authentication or network failures", async () => {
  for (const code of ["RULA_IMAGE_AI_INVALID_RESPONSE", "PROVIDER_REQUEST_FAILED", "PROVIDER_TIMEOUT"]) {
    const operation = vi.fn().mockRejectedValue(Object.assign(new Error("Failed"), { code })); await expect(retryRulaInvalidAnswer(operation)).rejects.toMatchObject({ code }); expect(operation).toHaveBeenCalledTimes(code === "RULA_IMAGE_AI_INVALID_RESPONSE" ? 2 : 1);
  }
});
