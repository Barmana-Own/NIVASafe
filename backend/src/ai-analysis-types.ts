/** Private, synchronous image results must never enter the generic text/queue workflow. */
export const RULA_IMAGE_RESULT_TYPE = "RULA_POSTURE_IMAGE";

export function isRulaImageResultType(value: unknown): boolean {
  return typeof value === "string" && value.trim().toUpperCase() === RULA_IMAGE_RESULT_TYPE;
}
