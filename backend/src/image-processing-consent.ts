import type { Prisma } from "@prisma/client";
import { prisma } from "./core.js";

export const ACCOUNT_IMAGE_CONSENT_VERSION = "image-processing-account-2026-10-22-v3";
export const TERMS_VERSION = "nivasafe-terms-2026-10-19-v1";
export const IMAGE_PROCESSING_PROVIDER = "arvancloud";
export const IMAGE_PROCESSING_PURPOSE = "assessment-images";
const consentActions = ["IMAGE_PROCESSING_CONSENT_ACCEPTED", "IMAGE_PROCESSING_CONSENT_DECLINED", "IMAGE_PROCESSING_CONSENT_WITHDRAWN"];
type ConsentAuditRow = { id: string; action: string; createdAt: Date; metadata: unknown };

function consentState(latest: ConsentAuditRow | null) {
  const metadata = latest?.metadata && typeof latest.metadata === "object" && !Array.isArray(latest.metadata) ? latest.metadata as { policyVersion?: unknown; provider?: unknown; purpose?: unknown } : null;
  const accepted = latest?.action === "IMAGE_PROCESSING_CONSENT_ACCEPTED" && metadata?.policyVersion === ACCOUNT_IMAGE_CONSENT_VERSION && metadata.provider === IMAGE_PROCESSING_PROVIDER && metadata.purpose === IMAGE_PROCESSING_PURPOSE;
  return { accepted, policyVersion: ACCOUNT_IMAGE_CONSENT_VERSION, recordId: accepted ? latest.id : null, acceptedAt: accepted ? latest.createdAt.toISOString() : null, changedAt: latest?.createdAt.toISOString() ?? null };
}

export async function readAccountImageConsent(userId: string, store: Pick<typeof prisma, "auditLog"> = prisma) {
  const latest = await store.auditLog.findFirst({
    where: { userId, organizationId: null, entityType: "ImageProcessingConsent", entityId: userId, action: { in: consentActions } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true, action: true, createdAt: true, metadata: true },
  });
  return consentState(latest);
}

/** Batched latest receipts keep a bounded grant list from issuing a query per owner. */
export async function readAccountImageConsents(userIds: readonly string[], store: Pick<typeof prisma, "auditLog"> = prisma) {
  const ids = [...new Set(userIds)];
  const states = new Map(ids.map(id => [id, consentState(null)]));
  if (!ids.length) return states;
  const where = { userId: { in: ids }, organizationId: null, entityType: "ImageProcessingConsent", action: { in: consentActions } };
  const latest = await store.auditLog.groupBy({ by: ["userId"], where, _max: { createdAt: true } });
  const dates = latest.flatMap(row => row.userId && row._max.createdAt ? [{ userId: row.userId, createdAt: row._max.createdAt }] : []);
  if (!dates.length) return states;
  const rows = await store.auditLog.findMany({ where: { ...where, OR: dates }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true, userId: true, entityId: true, action: true, createdAt: true, metadata: true } });
  const seen = new Set<string>();
  for (const row of rows) if (row.userId && row.entityId === row.userId && !seen.has(row.userId)) { seen.add(row.userId); states.set(row.userId, consentState(row)); }
  return states;
}

export function imageConsentAuditData(input: { userId: string; accepted: boolean; source: "REGISTRATION" | "ACCOUNT"; requestId: string; ipAddress?: string; userAgent?: string; createdAt?: Date }): Prisma.AuditLogUncheckedCreateInput {
  return { userId: input.userId, organizationId: null, action: input.accepted ? "IMAGE_PROCESSING_CONSENT_ACCEPTED" : input.source === "REGISTRATION" ? "IMAGE_PROCESSING_CONSENT_DECLINED" : "IMAGE_PROCESSING_CONSENT_WITHDRAWN", entityType: "ImageProcessingConsent", entityId: input.userId, requestId: input.requestId, ipAddress: input.ipAddress?.slice(0, 64), userAgent: input.userAgent?.slice(0, 2000), ...(input.createdAt ? { createdAt: input.createdAt } : {}), metadata: { accepted: input.accepted, policyVersion: ACCOUNT_IMAGE_CONSENT_VERSION, provider: IMAGE_PROCESSING_PROVIDER, purpose: IMAGE_PROCESSING_PURPOSE, source: input.source, scope: "authorized-assessment-images", externalProcessing: true } };
}

export async function assertAccountImageConsent(userId: string) {
  const consent = await readAccountImageConsent(userId);
  if (!consent.accepted || !consent.recordId) throw Object.assign(new Error("رضایت پردازش تصویر را در تنظیمات حساب ثبت کنید."), { statusCode: 403, code: "IMAGE_PROCESSING_ACCOUNT_CONSENT_REQUIRED", retryable: false });
  return { ...consent, accepted: true as const, recordId: consent.recordId };
}
