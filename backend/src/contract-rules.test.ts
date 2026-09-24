import { describe, expect, it } from "vitest";
import { AttachmentKind, Role } from "@prisma/client";
import { ROLE_PERMISSIONS } from "./core.js";
import { allowedMime, fileReferenceType, FMEA_PROCESS_IMAGE_MAX_COUNT, hasValidFileSignature, kindOf } from "./modules/files.js";
import { getAIProvider } from "./ai-provider.js";
import { subscriptionIsUsable } from "./subscription.js";
import { resolveStoragePath } from "./storage.js";
import { INVITATION_ROLES, ORGANIZATION_MEMBER_ROLES } from "./modules/users.js";

describe("contract security and adapters", () => {
  it("keeps viewer permissions read-only", () => { expect(ROLE_PERMISSIONS[Role.VIEWER]).toEqual(["projects.read"]); expect(ROLE_PERMISSIONS[Role.VIEWER]).not.toContain("assessments.update"); });
  it("allows organization administrators to manage users and reports", () => { expect(ROLE_PERMISSIONS[Role.ORG_ADMIN]).toContain("users.manage"); expect(ROLE_PERMISSIONS[Role.ORG_ADMIN]).toContain("reports.generate"); });
  it("gives assistants a bounded operational role and exposes admin invite roles", () => { expect(ROLE_PERMISSIONS[Role.ASSISTANT]).toEqual(["projects.read", "assessments.create", "assessments.update", "reports.generate"]); expect(ORGANIZATION_MEMBER_ROLES).toContain("ASSISTANT"); expect(ORGANIZATION_MEMBER_ROLES).toContain("ORG_ADMIN"); expect(INVITATION_ROLES).toContain("SUPER_ADMIN"); });
  it("validates supported attachment types and media classes", () => { expect(allowedMime.has("application/x-msdownload")).toBe(false); expect(kindOf("image/png")).toBe(AttachmentKind.IMAGE); expect(kindOf("video/mp4")).toBe(AttachmentKind.VIDEO); expect(kindOf("application/pdf")).toBe(AttachmentKind.DOCUMENT); });
  it("keeps the FMEA process-image attachment limit at three", () => { expect(FMEA_PROCESS_IMAGE_MAX_COUNT).toBe(3); });
  it("normalizes assessment attachment reference types", () => { expect(fileReferenceType("FmeaAssessment")).toBe("FMEA"); expect(fileReferenceType("RulaAssessment")).toBe("RULA"); expect(fileReferenceType("KnowledgeDocument")).toBe("KNOWLEDGE"); expect(fileReferenceType("CustomReference")).toBe("OTHER"); });
  it("rejects files whose bytes do not match their declared media type", () => { expect(hasValidFileSignature(Buffer.from("not-a-pdf"), "application/pdf")).toBe(false); expect(hasValidFileSignature(Buffer.from("%PDF-1.7"), "application/pdf")).toBe(true); expect(hasValidFileSignature(Buffer.from("plain text"), "text/plain")).toBe(true); });
  it("keeps local storage keys inside the configured upload root", () => { expect(resolveStoragePath("D:/nivasafe/uploads", "abc.txt")).toContain("uploads"); expect(() => resolveStoragePath("D:/nivasafe/uploads", "../outside.txt")).toThrow("Invalid storage key"); });
  it("exposes unavailable external adapters without making fallback unavailable", () => { expect(getAIProvider("fallback").available()).toBe(true); expect(getAIProvider("openai").name).toBe("openai"); });
  it("requires an active per-organization subscription", () => { expect(subscriptionIsUsable({ subscriptionStatus: "ACTIVE", subscriptionExpiresAt: null })).toBe(true); expect(subscriptionIsUsable({ subscriptionStatus: "PENDING_PAYMENT", subscriptionExpiresAt: null })).toBe(false); expect(subscriptionIsUsable({ subscriptionStatus: "TRIALING", subscriptionExpiresAt: new Date(Date.now() - 1_000) })).toBe(false); });
});
