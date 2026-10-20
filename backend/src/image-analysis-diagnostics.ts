type ImageFailure = { code?: unknown; statusCode?: unknown; retryable?: unknown; name?: unknown; upstreamRequestId?: unknown; providerErrorCode?: unknown; responseValidationCode?: unknown };
const retryableStatuses = new Set([408, 425, 429, 500, 502, 503, 504]);
const retryableCodes = new Set(["PROVIDER_TIMEOUT", "ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN"]);
const safeProviderErrorCodes = new Set([
  "access_denied", "account_deactivated", "authentication_error", "billing_hard_limit_reached",
  "insufficient_permissions", "insufficient_quota", "invalid_api_key", "invalid_request_error",
  "model_access_denied", "model_not_found", "model_not_supported", "permission_denied",
  "quota_exceeded", "rate_limit_exceeded", "unauthorized", "unsupported_media_type",
  "unsupported_model", "unsupported_parameter", "unsupported_value", "vision_not_supported",
]);
const safeResponseValidationCodes = new Set([
  "response_json_invalid", "side_container_missing", "side_result_incomplete_left", "side_result_incomplete_right",
  "invalid_overlay", "invalid_overlay_points", "invalid_overlay_landmark", "overlay_landmark_out_of_bounds",
  "overlay_landmark_confidence_invalid", "overlay_schema_invalid", "summary_missing", "risk_rows_missing",
  "risk_rows_exceeded_limit", "risk_row_invalid", "annotations_invalid",
]);

function asFailure(error: unknown): ImageFailure {
  return error && typeof error === "object" ? error as ImageFailure : {};
}

export function isRetryableImageAnalysisFailure(error: unknown) {
  const value = asFailure(error);
  if (typeof value.retryable === "boolean") return value.retryable;
  if (typeof value.statusCode === "number" && retryableStatuses.has(value.statusCode)) return true;
  return (typeof value.code === "string" && retryableCodes.has(value.code)) || value.name === "TypeError";
}

/** Stable, privacy-safe API errors; provider bodies and uploaded data are never returned. */
export function classifyRulaImageFailure(error: unknown) {
  const value = asFailure(error);
  if (value.code === "RULA_IMAGE_AI_INVALID_RESPONSE") {
    return { statusCode: 502, code: "RULA_IMAGE_AI_INVALID_RESPONSE", message: "The image analysis response could not be validated. Review the posture manually.", retryable: false } as const;
  }
  if (value.code === "RULA_IMAGE_AI_EMPTY_OBSERVATION") {
    return { statusCode: 422, code: "RULA_IMAGE_AI_QUALITY_REVIEW", message: "No clear posture was detected. Retake the image or continue with manual review.", retryable: false } as const;
  }
  const retryable = isRetryableImageAnalysisFailure(error);
  return {
    statusCode: 503,
    code: "RULA_IMAGE_AI_UNAVAILABLE",
    message: retryable ? "Image analysis is temporarily unavailable. You can retry this request." : "Image analysis is unavailable. Continue with manual review or contact support.",
    // Transience does not establish that an upstream image request was unbilled.
    // Let the user choose a new attempt; do not authorize frontend automatic replays.
    retryable: false,
  } as const;
}

/** Audit-safe diagnostics: never persist provider bodies, messages or uploaded data. */
export function imageAnalysisFailureMetadata(error: unknown) {
  const value = asFailure(error);
  const allowedCodes = new Set(["PROVIDER_REQUEST_FAILED", "PROVIDER_TIMEOUT", "EMPTY_PROVIDER_RESPONSE", "AI_MODEL_MISMATCH", "RULA_IMAGE_AI_INVALID_RESPONSE", "RULA_IMAGE_AI_EMPTY_OBSERVATION", "FMEA_IMAGE_AI_INVALID_RESPONSE", "ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN"]);
  const failureCode = typeof value.code === "string" && allowedCodes.has(value.code) ? value.code : "IMAGE_ANALYSIS_INTERNAL_ERROR";
  const status = value.statusCode;
  const providerErrorCode = typeof value.providerErrorCode === "string"
    && safeProviderErrorCodes.has(value.providerErrorCode.trim().toLowerCase())
    ? value.providerErrorCode.trim().toLowerCase()
    : undefined;
  const upstreamRequestId = typeof value.upstreamRequestId === "string"
    && /^(?:(?:req_)?[A-F0-9]{8}-(?:[A-F0-9]{4}-){3}[A-F0-9]{12}|[A-F0-9]{32})$/iu.test(value.upstreamRequestId)
    ? value.upstreamRequestId
    : undefined;
  const responseValidationCode = typeof value.responseValidationCode === "string"
    && safeResponseValidationCodes.has(value.responseValidationCode)
    ? value.responseValidationCode
    : undefined;
  return {
    failureCode,
    ...(typeof status === "number" && Number.isInteger(status) && status >= 400 && status <= 599 ? { upstreamStatus: status } : {}),
    ...(providerErrorCode ? { providerErrorCode } : {}),
    ...(upstreamRequestId ? { upstreamRequestId } : {}),
    ...(responseValidationCode ? { responseValidationCode } : {}),
    retryable: isRetryableImageAnalysisFailure(error),
  };
}
