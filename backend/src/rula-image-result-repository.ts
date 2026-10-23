import { AIRequestStatus, type Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "./core.js";
import { RULA_IMAGE_RESULT_TYPE } from "./ai-analysis-types.js";
import type { RulaImageResultRepository } from "./rula-image-results.js";

/** Reuse existing durable storage without retaining raw images or provider prompts. */
export function rulaImageResultRepository(db: Pick<PrismaClient, "aIAnalysisRequest"> = prisma): RulaImageResultRepository {
  return {
    async create(value) {
      return db.aIAnalysisRequest.create({
        data: {
          organizationId: value.organizationId,
          userId: value.userId,
          type: RULA_IMAGE_RESULT_TYPE,
          status: AIRequestStatus.SUCCEEDED,
          provider: value.result.provider,
          input: {
            sourceRequestId: value.sourceRequestId.slice(0, 100),
            purpose: "rula-posture",
            requestedModel: "GPT-5-Mini",
            bodySide: value.bodySide,
            locale: value.locale,
            imageSha256: value.imageSha256,
            accountConsentVersion: value.authorization.accountConsentVersion,
            consentRecordId: value.authorization.consentRecordId,
            consentSource: value.authorization.consentSource,
            imageSubject: value.authorization.imageSubject,
            imageOwnerUserId: value.authorization.imageOwnerUserId,
            ownerAuthorizationId: value.authorization.ownerAuthorizationId,
            ownerConsentRecordId: value.authorization.ownerConsentRecordId,
          },
          output: value.result as unknown as Prisma.InputJsonValue,
          attempts: value.attempts,
          startedAt: value.startedAt,
          completedAt: value.completedAt,
        },
        select: { id: true },
      });
    },
    async find(scope) {
      return db.aIAnalysisRequest.findFirst({
        where: { id: scope.id, organizationId: scope.organizationId, userId: scope.userId, type: RULA_IMAGE_RESULT_TYPE, status: AIRequestStatus.SUCCEEDED },
        select: { id: true, output: true },
      });
    },
  };
}
