export type SupportCategory = "AI_QUOTA" | "PROFESSIONAL_PLAN" | "TECHNICAL_SUPPORT" | "OTHER";
export type SupportStatus = "OPEN" | "IN_PROGRESS" | "WAITING_USER" | "RESOLVED" | "CLOSED";
export type SupportPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type SupportLocale = "fa" | "en";
export type SupportPrefill = { category: SupportCategory; subject: string; message: string; assessmentReference: string; publicErrorCode: string; fromRulaAi: boolean };

const categories = new Set<SupportCategory>(["AI_QUOTA", "PROFESSIONAL_PLAN", "TECHNICAL_SUPPORT", "OTHER"]);
const supportedRulaErrorCodes = new Set([
  "RULA_IMAGE_AI_UNAVAILABLE",
  "RULA_IMAGE_AI_QUALITY_REVIEW",
  "RULA_IMAGE_AI_INVALID_RESPONSE",
  "RULA_IMAGE_QUALITY_REVIEW",
  "RULA_IMAGE_TYPE_NOT_ALLOWED",
  "RULA_IMAGE_SIZE_LIMIT",
  "RULA_IMAGE_SIGNATURE_INVALID",
  "AI_ACCESS_DISABLED",
  "AI_ACCESS_LIMIT_REACHED",
  "SUBSCRIPTION_REQUIRED",
  "FORBIDDEN",
  "NETWORK_ERROR",
]);

export function isSupportedRulaSupportErrorCode(value: string) {
  return supportedRulaErrorCodes.has(value);
}
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const statusTransitions: Record<SupportStatus, readonly SupportStatus[]> = {
  OPEN: ["OPEN", "IN_PROGRESS", "WAITING_USER", "RESOLVED", "CLOSED"],
  IN_PROGRESS: ["IN_PROGRESS", "OPEN", "WAITING_USER", "RESOLVED", "CLOSED"],
  WAITING_USER: ["WAITING_USER", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"],
  RESOLVED: ["RESOLVED", "OPEN", "CLOSED"],
  CLOSED: ["CLOSED", "OPEN"],
};

export function supportStatusOptions(status: SupportStatus) {
  return statusTransitions[status];
}

export function isSupportRequestId(value: string) {
  return uuidPattern.test(value);
}

export function supportPrefillFromSearch(search: string, locale: SupportLocale): SupportPrefill {
  const params = new URLSearchParams(search);
  const fromRulaAi = params.get("source") === "rula-ai";
  const rawCategory = params.get("category") as SupportCategory | null;
  const category = rawCategory && categories.has(rawCategory) ? rawCategory : fromRulaAi ? "TECHNICAL_SUPPORT" : "OTHER";
  if (!fromRulaAi) return { category, subject: "", message: "", assessmentReference: "", publicErrorCode: "", fromRulaAi: false };

  const rawErrorCode = params.get("errorCode") ?? "";
  const errorCode = isSupportedRulaSupportErrorCode(rawErrorCode) ? rawErrorCode : "";
  const rawAssessmentId = params.get("assessment") ?? "";
  const assessmentReference = uuidPattern.test(rawAssessmentId) ? rawAssessmentId : "";
  const subject = locale === "fa" ? "بازبینی خطای تحلیل تصویر RULA" : "Review a RULA image-analysis issue";
  const context = locale === "fa"
    ? ["درخواست از جریان تحلیل تصویری RULA آغاز شده است.", errorCode ? `کد خطای نمایش‌داده‌شده: ${errorCode}` : "", assessmentReference ? `شناسه ارزیابی: ${assessmentReference}` : ""].filter(Boolean).join("\n")
    : ["This request was started from the RULA image-analysis flow.", errorCode ? `Displayed error code: ${errorCode}` : "", assessmentReference ? `Assessment reference: ${assessmentReference}` : ""].filter(Boolean).join("\n");
  return { category, subject, message: context, assessmentReference, publicErrorCode: errorCode, fromRulaAi: true };
}

export type SupportSearchItem = {
  category: string;
  subject: string;
  message: string;
  requester?: { displayName?: string };
  organization?: { nameFa?: string; nameEn?: string };
};

export function filterSupportRequests<T extends SupportSearchItem>(items: readonly T[], filters: { search: string; category: string }): T[] {
  const query = filters.search.trim().normalize("NFKC").toLocaleLowerCase();
  return items.filter((item) => {
    if (filters.category && item.category !== filters.category) return false;
    if (!query) return true;
    const searchable = [item.subject, item.message, item.requester?.displayName, item.organization?.nameFa, item.organization?.nameEn]
      .filter((value): value is string => typeof value === "string")
      .join(" ")
      .normalize("NFKC")
      .toLocaleLowerCase();
    return searchable.includes(query);
  });
}
