import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseRulaPostureImageAnalysis } from "./rula-posture-ai.js";
import { loadRulaImageResult, saveRulaImageResult, type RulaImageResultWrite } from "./rula-image-results.js";

const id = "4dac0e52-118f-4520-9b93-236c5b6ed5d2";
const repository = { create: vi.fn(), find: vi.fn() };
function input(): RulaImageResultWrite {
  const parts = ["upperArm", "lowerArm", "wrist", "wristTwist", "neck", "trunk", "legs"];
  const answer = JSON.stringify({ sides: { RIGHT: { ...Object.fromEntries(parts.map(part => [part, { angle: part === "legs" ? null : 20, score: 1, detected: true, confidence: 0.8 }])), overlay: { points: {} } } }, notes: "Synthetic posture" });
  return { organizationId: "org-a", userId: "user-a", sourceRequestId: "request-a", imageSha256: "a".repeat(64), bodySide: "RIGHT", locale: "en", authorization: { accountConsentVersion: "current-test-policy", consentRecordId: "consent-a", consentSource: "ACCOUNT_POLICY", imageSubject: "SELF", imageOwnerUserId: "user-a", ownerAuthorizationId: null, ownerConsentRecordId: null }, attempts: 1, startedAt: new Date("2026-10-22T00:00:00Z"), completedAt: new Date("2026-10-22T00:00:01Z"), result: { ...parseRulaPostureImageAnalysis(answer, "RIGHT"), provider: "arvancloud", model: "GPT-5-Mini", aiStatus: "connected" } };
}
beforeEach(() => { vi.resetAllMocks(); repository.create.mockResolvedValue({ id }); });
describe("durable RULA image results", () => {
  it("waits for successful persistence and retains uncertain human-review states", async () => {
    const value = input();
    const response = await saveRulaImageResult(value, repository);
    expect(response.analysisRequestId).toBe(id);
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-a", userId: "user-a", imageSha256: "a".repeat(64), authorization: expect.objectContaining({ consentRecordId: "consent-a" }) }));
    expect(response.sides.RIGHT?.upperArm.requiresReview).toBe(true);
  });
  it("does not return success or leak database diagnostics when storage fails", async () => {
    repository.create.mockRejectedValue(new Error("private database address and credentials"));
    await expect(saveRulaImageResult(input(), repository)).rejects.toMatchObject({ code: "RULA_IMAGE_RESULT_SAVE_FAILED", statusCode: 503, retryable: false });
  });
  it("rejects an unvalidated model payload before persistence", async () => {
    const value = input();
    await expect(saveRulaImageResult({ ...value, result: { ...value.result, image: "data:image/png;base64,PRIVATE" } } as never, repository)).rejects.toThrow();
    expect(repository.create).not.toHaveBeenCalled();
  });
  it("requires third-party authorization references before persistence", async () => {
    const value = input();
    await expect(saveRulaImageResult({ ...value, authorization: { ...value.authorization, imageSubject: "THIRD_PARTY" } }, repository)).rejects.toThrow("owner permission");
    expect(repository.create).not.toHaveBeenCalled();
  });
  it("scopes a result lookup to the exact actor and tenant and fails closed", async () => {
    repository.find.mockResolvedValue(null);
    const scope = { id, organizationId: "org-b", userId: "user-b" };
    await expect(loadRulaImageResult(scope, repository)).rejects.toMatchObject({ statusCode: 404 });
    expect(repository.find).toHaveBeenCalledWith(scope);
  });
  it("validates stored output before returning it", async () => {
    repository.find.mockResolvedValue({ id, output: { image: "private", sides: {} } });
    await expect(loadRulaImageResult({ id, organizationId: "org-a", userId: "user-a" }, repository)).rejects.toMatchObject({ code: "RULA_IMAGE_RESULT_INVALID" });
    repository.find.mockResolvedValue({ id, output: input().result });
    expect((await loadRulaImageResult({ id, organizationId: "org-a", userId: "user-a" }, repository)).analysisRequestId).toBe(id);
  });
});
