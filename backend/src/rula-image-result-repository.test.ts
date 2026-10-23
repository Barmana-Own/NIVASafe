import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { rulaImageResultRepository } from "./rula-image-result-repository.js";
import type { RulaImageResultWrite } from "./rula-image-results.js";

describe("private image result persistence adapter", () => {
  it("writes only the whitelisted inference, actor and authorization fields", async () => {
    const create = vi.fn().mockResolvedValue({ id: "saved-id" });
    const repository = rulaImageResultRepository({ aIAnalysisRequest: { create } } as unknown as Pick<PrismaClient, "aIAnalysisRequest">);
    const value = { userId: "user-a", organizationId: "org-a", sourceRequestId: "req-a", imageSha256: "a".repeat(64), bodySide: "RIGHT", locale: "en", authorization: { accountConsentVersion: "v2", consentRecordId: "consent-a", consentSource: "ACCOUNT_POLICY", imageSubject: "SELF", imageOwnerUserId: "user-a", ownerAuthorizationId: null, ownerConsentRecordId: "consent-a" }, attempts: 1, startedAt: new Date(), completedAt: new Date(), result: { provider: "arvancloud", notes: "Synthetic" }, image: "PRIVATE_IMAGE", base64: "PRIVATE_BASE64", prompt: "PRIVATE_PROMPT" } as unknown as RulaImageResultWrite;
    await repository.create(value);
    const written = create.mock.calls[0]![0];
    expect(written).toMatchObject({ data: { userId: "user-a", organizationId: "org-a", type: "RULA_POSTURE_IMAGE", status: "SUCCEEDED", input: { consentRecordId: "consent-a", requestedModel: "GPT-5-Mini", imageSha256: "a".repeat(64) } }, select: { id: true } });
    expect(JSON.stringify(written)).not.toMatch(/PRIVATE_IMAGE|PRIVATE_BASE64|PRIVATE_PROMPT/);
    expect(written.data.input).not.toHaveProperty("image");
  });
  it("queries successful output only for the requesting actor and organization", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const repository = rulaImageResultRepository({ aIAnalysisRequest: { findFirst } } as unknown as Pick<PrismaClient, "aIAnalysisRequest">);
    expect(await repository.find({ id: "record-a", userId: "user-b", organizationId: "org-b" })).toBeNull();
    expect(findFirst).toHaveBeenCalledWith({ where: { id: "record-a", userId: "user-b", organizationId: "org-b", type: "RULA_POSTURE_IMAGE", status: "SUCCEEDED" }, select: { id: true, output: true } });
  });
});
