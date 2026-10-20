import type { Prisma } from "@prisma/client";
import { prisma } from "./core.js";

export const ACCOUNT_IMAGE_CONSENT_VERSION = "image-processing-account-2026-10-19-v1";
export const TERMS_VERSION = "nivasafe-terms-2026-10-19-v1";
const consentActions = ["IMAGE_PROCESSING_CONSENT_ACCEPTED", "IMAGE_PROCESSING_CONSENT_WITHDRAWN"];

export async function readAccountImageConsent(userId: string, store: Pick<typeof prisma, "auditLog"> = prisma) {
  const latest = await store.auditLog.findFirst({
    where: { userId, organizationId: null, entityType: "ImageProcessingConsent", entityId: userId, action: { in: consentActions } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true, action: true, createdAt: true, metadata: true },
  });
  const metadata = latest?.metadata && typeof latest.metadata === "object" && !Array.isArray(latest.metadata) ? latest.metadata as { policyVersion?: unknown } : null;
  const accepted = latest?.action === "IMAGE_PROCESSING_CONSENT_ACCEPTED" && metadata?.policyVersion === ACCOUNT_IMAGE_CONSENT_VERSION;
  return { accepted, policyVersion: ACCOUNT_IMAGE_CONSENT_VERSION, recordId: accepted ? latest.id : null, acceptedAt: accepted ? latest.createdAt.toISOString() : null, changedAt: latest?.createdAt.toISOString() ?? null };
}

export function imageConsentAuditData(input: { userId: string; accepted: boolean; source: "REGISTRATION" | "ACCOUNT"; requestId: string; ipAddress?: string; userAgent?: string; createdAt?: Date }): Prisma.AuditLogUncheckedCreateInput {
  return { userId: input.userId, organizationId: null, action: input.accepted ? "IMAGE_PROCESSING_CONSENT_ACCEPTED" : "IMAGE_PROCESSING_CONSENT_WITHDRAWN", entityType: "ImageProcessingConsent", entityId: input.userId, requestId: input.requestId, ipAddress: input.ipAddress?.slice(0, 64), userAgent: input.userAgent?.slice(0, 2000), ...(input.createdAt ? { createdAt: input.createdAt } : {}), metadata: { policyVersion: ACCOUNT_IMAGE_CONSENT_VERSION, source: input.source, scope: "authorized-assessment-images", externalProcessing: true } };
}

export async function assertAccountImageConsent(userId: string) {
  const consent = await readAccountImageConsent(userId);
  if (!consent.accepted) throw Object.assign(new Error("رضایت پردازش تصویر را در تنظیمات حساب ثبت کنید."), { statusCode: 403, code: "IMAGE_PROCESSING_ACCOUNT_CONSENT_REQUIRED", retryable: false });
  return consent;
}
