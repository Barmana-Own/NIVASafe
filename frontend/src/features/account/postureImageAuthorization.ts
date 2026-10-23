import { ACCOUNT_IMAGE_CONSENT_VERSION } from "./imageProcessingPolicy";

export type PostureImageAuthorization = {
  id: string;
  ownerUserId: string;
  ownerName: string;
  recipientUserId: string;
  recipientName: string;
  expiresAt: string;
  policyVersion: string;
  status: string;
};
export type PostureImageAuthorizationsResponse = { grants: PostureImageAuthorization[] };

export function isPostureImageAuthorizationId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

/** The backend verifies the actual owner grant again immediately before dispatch. */
export function isUsablePostureImageAuthorization(grant: PostureImageAuthorization, recipientUserId: string, now = Date.now()): boolean {
  const expiresAt = Date.parse(grant.expiresAt);
  return isPostureImageAuthorizationId(grant.id) && grant.status === "ACTIVE" && grant.policyVersion === ACCOUNT_IMAGE_CONSENT_VERSION
    && Boolean(recipientUserId) && grant.recipientUserId === recipientUserId && Boolean(grant.ownerUserId)
    && grant.ownerUserId !== recipientUserId && Number.isFinite(expiresAt) && expiresAt > now;
}
