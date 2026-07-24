import { describe, expect, it } from "vitest";
import { AttachmentKind, Role } from "@prisma/client";
import { ROLE_PERMISSIONS } from "./core.js";
import { allowedMime, kindOf } from "./modules/files.js";
import { getAIProvider } from "./ai-provider.js";

describe("contract security and adapters", () => {
  it("keeps viewer permissions read-only", () => { expect(ROLE_PERMISSIONS[Role.VIEWER]).toEqual(["projects.read"]); expect(ROLE_PERMISSIONS[Role.VIEWER]).not.toContain("assessments.update"); });
  it("allows organization administrators to manage users and reports", () => { expect(ROLE_PERMISSIONS[Role.ORG_ADMIN]).toContain("users.manage"); expect(ROLE_PERMISSIONS[Role.ORG_ADMIN]).toContain("reports.generate"); });
  it("validates supported attachment types and media classes", () => { expect(allowedMime.has("application/x-msdownload")).toBe(false); expect(kindOf("image/png")).toBe(AttachmentKind.IMAGE); expect(kindOf("video/mp4")).toBe(AttachmentKind.VIDEO); expect(kindOf("application/pdf")).toBe(AttachmentKind.DOCUMENT); });
  it("exposes unavailable external adapters without making fallback unavailable", () => { expect(getAIProvider("fallback").available()).toBe(true); expect(getAIProvider("openai").name).toBe("openai"); });
});
