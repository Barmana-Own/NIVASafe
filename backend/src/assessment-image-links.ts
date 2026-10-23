import { Prisma, type Attachment } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { z } from "zod";

export const assessmentImageTargetSchema = z.object({
  entityType: z.enum(["FmeaAssessment", "RulaAssessment"]),
  entityId: z.string().uuid(),
}).strict();
export type AssessmentImageTarget = z.infer<typeof assessmentImageTargetSchema>;
export type ImageLinkClient = Pick<Prisma.TransactionClient, "$queryRaw" | "$executeRaw" | "attachment">;
export const assessmentImageTransactionOptions = { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted };
const imageMime = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 10 * 1024 * 1024;

function failure(message: string, code: string, statusCode = 404): never {
  throw Object.assign(new Error(message), { code, statusCode });
}

export function assertReusableAssessmentImage(source: Pick<Attachment, "kind" | "mimeType" | "size">) {
  if (source.kind !== "IMAGE" || !imageMime.has(source.mimeType)) failure("Only supported image files can be reused.", "ASSESSMENT_IMAGE_TYPE_INVALID", 415);
  if (source.size <= 0 || source.size > maxBytes) failure("Image exceeds the supported size.", "ASSESSMENT_IMAGE_SIZE_INVALID", 413);
}

/** Lock order for reuse/unlink is source attachment, then target assessment. */
export async function lockImageSource(client: ImageLinkClient, organizationId: string, attachmentId: string) {
  const rows = await client.$queryRaw<Array<{ id: string }>>`SELECT id FROM Attachment WHERE id = ${attachmentId} AND organizationId = ${organizationId} AND deletedAt IS NULL FOR UPDATE`;
  if (!rows.length) failure("File not found", "FILE_NOT_FOUND");
  const source = await client.attachment.findFirst({ where: { id: attachmentId, organizationId, deletedAt: null } });
  if (!source) failure("File not found", "FILE_NOT_FOUND");
  return source;
}

export async function lockAssessmentImageTarget(client: ImageLinkClient, organizationId: string, target: AssessmentImageTarget, options: { cleanup?: boolean; allowArchivedRula?: boolean } = {}) {
  const rows = target.entityType === "FmeaAssessment"
    ? await client.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM FmeaAssessment WHERE id = ${target.entityId} AND organizationId = ${organizationId} ${options.cleanup ? Prisma.empty : Prisma.sql`AND deletedAt IS NULL`} FOR UPDATE`)
    : await client.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM RulaAssessment WHERE id = ${target.entityId} AND organizationId = ${organizationId} ${options.cleanup || options.allowArchivedRula ? Prisma.empty : Prisma.sql`AND status <> 'ARCHIVED'`} FOR UPDATE`);
  if (!rows.length && !options.cleanup) failure("Assessment not found", "ASSESSMENT_IMAGE_TARGET_NOT_FOUND");
}

export async function assessmentImageBelongs(client: ImageLinkClient, organizationId: string, attachmentId: string, target: AssessmentImageTarget) {
  const rows = await client.$queryRaw<Array<{ id: string }>>`
    SELECT a.id FROM Attachment a
    WHERE a.id = ${attachmentId} AND a.organizationId = ${organizationId} AND a.deletedAt IS NULL AND a.kind = 'IMAGE'
      AND ((a.entityType = ${target.entityType} AND a.entityId = ${target.entityId}) OR EXISTS (
        SELECT 1 FROM AttachmentAssessmentLink l WHERE l.attachmentId = a.id AND l.organizationId = ${organizationId}
          AND l.entityType = ${target.entityType} AND l.entityId = ${target.entityId}
      )) LIMIT 1`;
  return rows.length > 0;
}

export async function countAssessmentImages(client: ImageLinkClient, organizationId: string, target: AssessmentImageTarget) {
  const rows = await client.$queryRaw<Array<{ count: bigint | number }>>`
    SELECT COUNT(*) AS count FROM Attachment a
    WHERE a.organizationId = ${organizationId} AND a.deletedAt IS NULL AND a.kind = 'IMAGE'
      AND ((a.entityType = ${target.entityType} AND a.entityId = ${target.entityId}) OR EXISTS (
        SELECT 1 FROM AttachmentAssessmentLink l WHERE l.attachmentId = a.id AND l.organizationId = ${organizationId}
          AND l.entityType = ${target.entityType} AND l.entityId = ${target.entityId}
      ))`;
  return Number(rows[0]?.count ?? 0);
}

export function assertAssessmentImageCapacity(entityType: AssessmentImageTarget["entityType"], count: number) {
  const rula = entityType === "RulaAssessment";
  if (count >= (rula ? 4 : 3)) failure(rula ? "برای هر ارزیابی RULA حداکثر ۴ عکس پوسچر مجاز است." : "برای هر ارزیابی FMEA حداکثر ۳ تصویر فرآیند مجاز است.", rula ? "RULA_ATTACHMENT_IMAGE_COUNT_LIMIT" : "FMEA_ATTACHMENT_IMAGE_COUNT_LIMIT", 409);
}

/** Must run in READ COMMITTED: the count is taken after acquiring the parent lock. */
export async function linkAssessmentImage(client: ImageLinkClient, organizationId: string, attachmentId: string, target: AssessmentImageTarget) {
  const source = await lockImageSource(client, organizationId, attachmentId);
  assertReusableAssessmentImage(source);
  await lockAssessmentImageTarget(client, organizationId, target);
  if (await assessmentImageBelongs(client, organizationId, attachmentId, target)) return source;
  assertAssessmentImageCapacity(target.entityType, await countAssessmentImages(client, organizationId, target));
  await client.$executeRaw`INSERT INTO AttachmentAssessmentLink (id, organizationId, attachmentId, entityType, entityId, createdAt)
    VALUES (${randomUUID()}, ${organizationId}, ${attachmentId}, ${target.entityType}, ${target.entityId}, CURRENT_TIMESTAMP(3))`;
  return source;
}

export async function unlinkAssessmentImage(client: ImageLinkClient, organizationId: string, attachmentId: string, target: AssessmentImageTarget) {
  const source = await lockImageSource(client, organizationId, attachmentId);
  await lockAssessmentImageTarget(client, organizationId, target, { cleanup: true });
  if (target.entityType === "RulaAssessment") {
    const rows = await client.$queryRaw<Array<{ activityInfo: unknown; postureAnalysis: unknown }>>`SELECT activityInfo, postureAnalysis FROM RulaAssessment WHERE id = ${target.entityId} AND organizationId = ${organizationId}`;
    if (rows.some(row => rulaReferencesAttachment(row, attachmentId))) failure("ابتدا مرجع تصویر را از نتیجهٔ ارزیابی حذف کنید.", "RULA_IMAGE_RESULT_IN_USE", 409);
  }
  await client.$executeRaw`DELETE FROM AttachmentAssessmentLink WHERE organizationId = ${organizationId} AND attachmentId = ${attachmentId} AND entityType = ${target.entityType} AND entityId = ${target.entityId}`;
  if (source.entityType === target.entityType && source.entityId === target.entityId) {
    await client.attachment.update({ where: { id: source.id }, data: { entityType: null, entityId: null } });
  }
}

export async function assertNoAssessmentImageLinks(client: ImageLinkClient, organizationId: string, attachmentId: string) {
  const rows = await client.$queryRaw<Array<{ id: string }>>`SELECT id FROM AttachmentAssessmentLink WHERE organizationId = ${organizationId} AND attachmentId = ${attachmentId} LIMIT 1`;
  if (rows.length) failure("این تصویر در ارزیابی استفاده شده است؛ ابتدا ارتباط آن را از ارزیابی جدا کنید.", "FILE_IN_USE", 409);
}

export function rulaReferencesAttachment(row: { activityInfo: unknown; postureAnalysis: unknown }, attachmentId: string) {
  const object = (value: unknown): Record<string, unknown> => {
    if (typeof value === "string") { try { value = JSON.parse(value); } catch { return {}; } }
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  };
  const analysis = object(row.postureAnalysis);
  return object(row.activityInfo).postureImageAttachmentId === attachmentId
    || (Array.isArray(analysis.imageAssessments) && analysis.imageAssessments.some(image => object(image).attachmentId === attachmentId));
}

/** Resolve only the requested page; never load every association ID into application memory. */
export async function assessmentLinkedFilePage(client: ImageLinkClient, organizationId: string, filter: { entityType?: string; entityId?: string }, page: { page: number; limit: number; search?: string }) {
  const { entityType, entityId } = filter;
  if ((!entityType && !entityId) || (entityType && entityType !== "FmeaAssessment" && entityType !== "RulaAssessment")) return null;
  const membership = Prisma.sql`(
    (1 = 1 ${entityType ? Prisma.sql`AND a.entityType = ${entityType}` : Prisma.empty} ${entityId ? Prisma.sql`AND a.entityId = ${entityId}` : Prisma.empty})
    OR EXISTS (SELECT 1 FROM AttachmentAssessmentLink l WHERE l.organizationId = ${organizationId} AND l.attachmentId = a.id
      ${entityType ? Prisma.sql`AND l.entityType = ${entityType}` : Prisma.empty} ${entityId ? Prisma.sql`AND l.entityId = ${entityId}` : Prisma.empty})
  )`;
  const where = Prisma.sql`a.organizationId = ${organizationId} AND a.deletedAt IS NULL AND ${membership}
    ${page.search ? Prisma.sql`AND a.originalName LIKE ${"%" + page.search + "%"}` : Prisma.empty}`;
  const [ids, total] = await Promise.all([
    client.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT a.id FROM Attachment a WHERE ${where} ORDER BY a.createdAt DESC LIMIT ${page.limit} OFFSET ${(page.page - 1) * page.limit}`),
    client.$queryRaw<Array<{ count: bigint | number }>>(Prisma.sql`SELECT COUNT(*) AS count FROM Attachment a WHERE ${where}`),
  ]);
  return { ids: ids.map(row => row.id), total: Number(total[0]?.count ?? 0) };
}

export type AssessmentImage = Pick<Attachment, "id" | "originalName" | "mimeType" | "size" | "createdAt"> & { entityId: string };
/** One bounded-by-assessment-set query; UNION deduplicates legacy+explicit membership. */
export async function listAssessmentImages(client: ImageLinkClient, organizationId: string, entityType: AssessmentImageTarget["entityType"], entityIds: string[]): Promise<AssessmentImage[]> {
  if (!entityIds.length) return [];
  return client.$queryRaw<AssessmentImage[]>(Prisma.sql`
    SELECT a.id, a.originalName, a.mimeType, a.size, a.createdAt, a.entityId
      FROM Attachment a WHERE a.organizationId = ${organizationId} AND a.deletedAt IS NULL AND a.kind = 'IMAGE'
        AND a.entityType = ${entityType} AND a.entityId IN (${Prisma.join(entityIds)})
    UNION
    SELECT a.id, a.originalName, a.mimeType, a.size, a.createdAt, l.entityId
      FROM Attachment a JOIN AttachmentAssessmentLink l ON l.attachmentId = a.id AND l.organizationId = a.organizationId
      WHERE a.organizationId = ${organizationId} AND a.deletedAt IS NULL AND a.kind = 'IMAGE'
        AND l.entityType = ${entityType} AND l.entityId IN (${Prisma.join(entityIds)})
    ORDER BY createdAt ASC, id ASC`);
}
