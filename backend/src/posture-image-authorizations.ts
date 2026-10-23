import { randomUUID } from "node:crypto";
import type { FastifyRequest } from "fastify";
import { z } from "zod";
import { audit, prisma, ROLE_PERMISSIONS } from "./core.js";
import { ACCOUNT_IMAGE_CONSENT_VERSION, IMAGE_PROCESSING_PROVIDER, IMAGE_PROCESSING_PURPOSE, assertAccountImageConsent, readAccountImageConsent, readAccountImageConsents } from "./image-processing-consent.js";

const entityType = "PostureImageAuthorization";
const createdAction = "POSTURE_IMAGE_AUTHORIZATION_GRANTED";
const revokedAction = "POSTURE_IMAGE_AUTHORIZATION_REVOKED";
// Read legacy grants for history and revocation; transfer authorization still
// requires the current purpose and policy version explicitly below.
const metadataSchema = z.object({ recipientUserId: z.string().min(1).max(191), provider: z.literal(IMAGE_PROCESSING_PROVIDER), purpose: z.enum([IMAGE_PROCESSING_PURPOSE, "rula-posture"]), policyVersion: z.string().max(100), ownerConsentRecordId: z.string().min(1).max(191), expiresAt: z.iso.datetime() });
type GrantMetadata = z.infer<typeof metadataSchema>;
type GrantRow = { entityId: string | null; userId: string | null; organizationId: string | null; metadata: unknown; createdAt: Date };
export type PostureImageAuthorizationStatus = "ACTIVE" | "EXPIRED" | "REVOKED" | "CONSENT_REQUIRED" | "POLICY_OUTDATED" | "MEMBERSHIP_INACTIVE";
export type PostureImageSubjectAuthorization = { imageSubject: "SELF" | "THIRD_PARTY"; imageOwnerUserId: string; ownerAuthorizationId: string | null; ownerConsentRecordId: string };

function denied() {
  return Object.assign(new Error("برای عکس فرد دیگر، مجوز معتبر همان فرد در تنظیمات حساب لازم است."), { statusCode: 403, code: "POSTURE_IMAGE_OWNER_AUTHORIZATION_REQUIRED", retryable: false });
}
function canAssess(role: keyof typeof ROLE_PERMISSIONS) {
  const allowed = ROLE_PERMISSIONS[role] ?? [];
  return allowed.includes("*") || allowed.includes("assessments.create");
}
function parseGrant(row: GrantRow | null) {
  if (!row?.entityId || !row.userId || !row.organizationId) return null;
  const metadata = metadataSchema.safeParse(row.metadata);
  if (!metadata.success) return null;
  return { id: row.entityId, ownerUserId: row.userId, organizationId: row.organizationId, createdAt: row.createdAt, ...metadata.data };
}
export async function listPostureImageAuthorizations(userId: string, organizationId: string, direction: "issued" | "received") {
  const rows = await prisma.auditLog.findMany({ where: { organizationId, entityType, action: createdAction, ...(direction === "issued" ? { userId } : { metadata: { path: "$.recipientUserId", equals: userId } }) }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 50, select: { entityId: true, userId: true, organizationId: true, metadata: true, createdAt: true } });
  const grants = rows.flatMap(row => { const grant = parseGrant(row); return grant ? [grant] : []; });
  if (!grants.length) return { grants: [] };
  const userIds = [...new Set(grants.flatMap(grant => [grant.ownerUserId, grant.recipientUserId]))];
  const [revocations, memberships, consents] = await Promise.all([
    prisma.auditLog.findMany({ where: { organizationId, entityType, entityId: { in: grants.map(grant => grant.id) }, action: revokedAction }, select: { entityId: true, userId: true } }),
    prisma.organizationMember.findMany({ where: { organizationId, userId: { in: userIds }, active: true, user: { active: true } }, select: { userId: true, role: true, user: { select: { displayName: true, globalRole: true } } } }),
    readAccountImageConsents(grants.map(grant => grant.ownerUserId)),
  ]);
  const members = new Map(memberships.map(member => [member.userId, member]));
  const revoked = new Set(revocations.map(row => `${row.entityId}:${row.userId}`));
  const now = Date.now();
  return { grants: grants.map(grant => {
    const owner = members.get(grant.ownerUserId), recipient = members.get(grant.recipientUserId), consent = consents.get(grant.ownerUserId);
    const status: PostureImageAuthorizationStatus = revoked.has(`${grant.id}:${grant.ownerUserId}`) ? "REVOKED"
      : Date.parse(grant.expiresAt) <= now ? "EXPIRED"
      : grant.policyVersion !== ACCOUNT_IMAGE_CONSENT_VERSION || grant.purpose !== IMAGE_PROCESSING_PURPOSE ? "POLICY_OUTDATED"
      : !owner || !recipient || !canAssess(recipient.user.globalRole === "SUPER_ADMIN" ? "SUPER_ADMIN" : recipient.role) ? "MEMBERSHIP_INACTIVE"
      : !consent?.accepted || consent.recordId !== grant.ownerConsentRecordId ? "CONSENT_REQUIRED" : "ACTIVE";
    return { id: grant.id, ownerUserId: grant.ownerUserId, ownerName: owner?.user.displayName ?? "", recipientUserId: grant.recipientUserId, recipientName: recipient?.user.displayName ?? "", expiresAt: grant.expiresAt, policyVersion: grant.policyVersion, status };
  }) };
}

export async function grantPostureImageAuthorization(request: FastifyRequest, input: { recipientEmail: string; expiresInDays: number }, organizationId: string) {
  const ownerUserId = request.actor!.userId;
  const [ownerConsent, owner, recipient] = await Promise.all([
    readAccountImageConsent(ownerUserId),
    prisma.organizationMember.findFirst({ where: { organizationId, userId: ownerUserId, active: true, user: { active: true } }, select: { userId: true, user: { select: { displayName: true } } } }),
    prisma.organizationMember.findFirst({ where: { organizationId, active: true, user: { active: true, email: input.recipientEmail } }, select: { userId: true, role: true, user: { select: { displayName: true, globalRole: true } } } }),
  ]);
  if (!ownerConsent.accepted || !ownerConsent.recordId) throw Object.assign(new Error("ابتدا رضایت پردازش تصویر را در تنظیمات حساب ثبت کنید."), { statusCode: 403, code: "IMAGE_PROCESSING_ACCOUNT_CONSENT_REQUIRED", retryable: false });
  if (!owner || !recipient || recipient.userId === ownerUserId || !canAssess(recipient.user.globalRole === "SUPER_ADMIN" ? "SUPER_ADMIN" : recipient.role)) throw Object.assign(new Error("گیرندهٔ مجاز در سازمان جاری یافت نشد."), { statusCode: 400, code: "POSTURE_IMAGE_RECIPIENT_INVALID", retryable: false });
  const id = randomUUID(), expiresAt = new Date(Date.now() + input.expiresInDays * 86_400_000).toISOString();
  const metadata: GrantMetadata = { recipientUserId: recipient.userId, provider: IMAGE_PROCESSING_PROVIDER, purpose: IMAGE_PROCESSING_PURPOSE, policyVersion: ACCOUNT_IMAGE_CONSENT_VERSION, ownerConsentRecordId: ownerConsent.recordId, expiresAt };
  await audit(request, createdAction, entityType, id, metadata);
  return { id, ownerUserId, ownerName: owner.user.displayName, recipientUserId: recipient.userId, recipientName: recipient.user.displayName, expiresAt, policyVersion: ACCOUNT_IMAGE_CONSENT_VERSION, status: "ACTIVE" as const };
}

export async function revokePostureImageAuthorization(request: FastifyRequest, id: string, organizationId: string) {
  const grant = await prisma.auditLog.findFirst({ where: { organizationId, entityType, entityId: id, action: createdAction, userId: request.actor!.userId }, select: { entityId: true } });
  if (!grant) throw Object.assign(new Error("مجوز یافت نشد."), { statusCode: 404, code: "POSTURE_IMAGE_AUTHORIZATION_NOT_FOUND", retryable: false });
  await audit(request, revokedAction, entityType, id, { provider: IMAGE_PROCESSING_PROVIDER, purpose: IMAGE_PROCESSING_PURPOSE, policyVersion: ACCOUNT_IMAGE_CONSENT_VERSION });
  return { revoked: true };
}

export async function authorizePostureImageSubject(input: { userId: string; organizationId: string; imageSubject: "SELF" | "THIRD_PARTY"; ownerAuthorizationId?: string }): Promise<PostureImageSubjectAuthorization> {
  if (input.imageSubject === "SELF") {
    if (input.ownerAuthorizationId) throw denied();
    const consent = await assertAccountImageConsent(input.userId);
    return { imageSubject: "SELF", imageOwnerUserId: input.userId, ownerAuthorizationId: null, ownerConsentRecordId: consent.recordId! };
  }
  if (!input.ownerAuthorizationId) throw denied();
  const row = await prisma.auditLog.findFirst({ where: { organizationId: input.organizationId, entityType, entityId: input.ownerAuthorizationId, action: createdAction }, select: { entityId: true, userId: true, organizationId: true, metadata: true, createdAt: true } });
  const grant = parseGrant(row);
  if (!grant || grant.recipientUserId !== input.userId || grant.ownerUserId === input.userId || grant.policyVersion !== ACCOUNT_IMAGE_CONSENT_VERSION || grant.purpose !== IMAGE_PROCESSING_PURPOSE || Date.parse(grant.expiresAt) <= Date.now()) throw denied();
  const [revoked, owner, recipient, ownerConsent] = await Promise.all([
    prisma.auditLog.findFirst({ where: { organizationId: input.organizationId, userId: grant.ownerUserId, entityType, entityId: grant.id, action: revokedAction }, select: { id: true } }),
    prisma.organizationMember.findFirst({ where: { organizationId: input.organizationId, userId: grant.ownerUserId, active: true, user: { active: true } }, select: { userId: true } }),
    prisma.organizationMember.findFirst({ where: { organizationId: input.organizationId, userId: input.userId, active: true, user: { active: true } }, select: { role: true, user: { select: { globalRole: true } } } }),
    readAccountImageConsent(grant.ownerUserId),
  ]);
  if (revoked || !owner || !recipient || !canAssess(recipient.user.globalRole === "SUPER_ADMIN" ? "SUPER_ADMIN" : recipient.role) || !ownerConsent.accepted || ownerConsent.recordId !== grant.ownerConsentRecordId) throw denied();
  return { imageSubject: "THIRD_PARTY", imageOwnerUserId: grant.ownerUserId, ownerAuthorizationId: grant.id, ownerConsentRecordId: ownerConsent.recordId };
}
