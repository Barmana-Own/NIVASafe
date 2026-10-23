import { z } from "zod";
import { rulaPostureImageAnalysisResponseSchema } from "./rula-posture-ai.js";
export { RULA_IMAGE_RESULT_TYPE } from "./ai-analysis-types.js";

export type RulaImageResult = z.infer<typeof rulaPostureImageAnalysisResponseSchema>;
export type RulaImageTransferAuthorization = {
  accountConsentVersion: string;
  consentRecordId: string;
  consentSource: "ACCOUNT_POLICY";
  imageSubject: "SELF" | "THIRD_PARTY";
  imageOwnerUserId: string;
  ownerAuthorizationId: string | null;
  ownerConsentRecordId: string | null;
};
export type RulaImageResultWrite = {
  organizationId: string;
  userId: string;
  sourceRequestId: string;
  imageSha256: string;
  bodySide: "RIGHT" | "LEFT" | "BOTH";
  locale: "fa" | "en";
  authorization: RulaImageTransferAuthorization;
  attempts: number;
  startedAt: Date;
  completedAt: Date;
  result: RulaImageResult;
};
export interface RulaImageResultRepository {
  create(input: RulaImageResultWrite): Promise<{ id: string }>;
  find(scope: { id: string; organizationId: string; userId: string }): Promise<{ id: string; output: unknown } | null>;
}

/** Persist validated findings before returning a successful paid inference to the client. */
export async function saveRulaImageResult(input: RulaImageResultWrite, repository: RulaImageResultRepository) {
  const result = rulaPostureImageAnalysisResponseSchema.parse(input.result);
  z.string().regex(/^[a-f0-9]{64}$/).parse(input.imageSha256);
  z.number().int().min(1).max(2).parse(input.attempts);
  if (!input.authorization.consentRecordId || !input.authorization.accountConsentVersion || input.authorization.consentSource !== "ACCOUNT_POLICY") throw new Error("Current transfer authorization is required");
  if (input.authorization.imageSubject === "THIRD_PARTY" && (!input.authorization.ownerAuthorizationId || !input.authorization.ownerConsentRecordId)) throw new Error("Current image-owner permission is required");
  let saved: { id: string };
  try { saved = await repository.create({ ...input, result }); }
  catch {
    throw Object.assign(new Error("نتیجهٔ تحلیل ذخیره نشد؛ ارسال تصویر را خودکار تکرار نکنید."), { code: "RULA_IMAGE_RESULT_SAVE_FAILED", statusCode: 503, retryable: false });
  }
  return { ...result, analysisRequestId: z.string().uuid().parse(saved.id) };
}

export async function loadRulaImageResult(scope: { id: string; organizationId: string; userId: string }, repository: RulaImageResultRepository) {
  const row = await repository.find(scope);
  if (!row) throw Object.assign(new Error("نتیجهٔ تحلیل یافت نشد."), { statusCode: 404, code: "RULA_IMAGE_RESULT_NOT_FOUND" });
  const result = rulaPostureImageAnalysisResponseSchema.safeParse(row.output);
  if (!result.success) throw Object.assign(new Error("نتیجهٔ ذخیره‌شده قابل نمایش نیست."), { statusCode: 503, code: "RULA_IMAGE_RESULT_INVALID", retryable: false });
  return { ...result.data, analysisRequestId: z.string().uuid().parse(row.id) };
}
