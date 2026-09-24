import type { FastifyInstance } from "fastify";
import { AttachmentKind } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import { extname } from "node:path";
import { z } from "zod";
import { authenticate } from "../auth-guard.js";
import { audit, envelope, pageParams, parse, prisma, requireOrg, requirePermission } from "../core.js";
import { openLocalObject, storage } from "../storage.js";

export const allowedMime = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "application/pdf", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword", "application/vnd.ms-excel", "text/csv", "text/plain"]);
export const FMEA_PROCESS_IMAGE_MAX_COUNT = 3;
export const kindOf = (mime: string): AttachmentKind => mime.startsWith("image/") ? AttachmentKind.IMAGE : mime.startsWith("video/") ? AttachmentKind.VIDEO : AttachmentKind.DOCUMENT;
export function hasValidFileSignature(buffer: Buffer, mime: string): boolean {
  if (mime === "text/plain" || mime === "text/csv") return true;
  if (mime === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mime === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mime === "image/webp") return buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  if (mime === "video/mp4") return buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp";
  if (mime === "video/webm") return buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  if (mime === "application/pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (["application/msword", "application/vnd.ms-excel"].includes(mime)) return buffer.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  if (["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"].includes(mime)) return buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) || buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  return false;
}
const fieldValue = (field: unknown) => field && !Array.isArray(field) && typeof (field as { value?: unknown }).value === "string" ? (field as { value: string }).value : undefined;

export type AttachmentReferenceType = "FMEA" | "RULA" | "KNOWLEDGE" | "OTHER";
export function fileReferenceType(entityType: string | null | undefined): AttachmentReferenceType {
  switch ((entityType ?? "").trim().toLowerCase()) {
    case "fmea":
    case "fmeaassessment":
      return "FMEA";
    case "rula":
    case "rulaassessment":
      return "RULA";
    case "knowledge":
    case "knowledgedocument":
      return "KNOWLEDGE";
    default:
      return "OTHER";
  }
}

type AttachmentReference = { type: AttachmentReferenceType; title: string | null; code: string | null };
type AttachmentWithReference = { entityType: string | null; entityId: string | null };

async function addAttachmentReferenceMetadata<T extends AttachmentWithReference>(items: T[], organizationId: string) {
  const idsFor = (entityType: string) => [...new Set(items.filter((item) => item.entityType === entityType && item.entityId).map((item) => item.entityId as string))];
  const fmeaIds = idsFor("FmeaAssessment");
  const rulaIds = idsFor("RulaAssessment");
  const knowledgeIds = idsFor("KnowledgeDocument");
  const [fmeaAssessments, rulaAssessments, knowledgeDocuments] = await Promise.all([
    fmeaIds.length ? prisma.fmeaAssessment.findMany({ where: { organizationId, id: { in: fmeaIds }, deletedAt: null }, select: { id: true, title: true, code: true } }) : Promise.resolve([]),
    rulaIds.length ? prisma.rulaAssessment.findMany({ where: { organizationId, id: { in: rulaIds } }, select: { id: true, title: true } }) : Promise.resolve([]),
    knowledgeIds.length ? prisma.knowledgeDocument.findMany({ where: { organizationId, id: { in: knowledgeIds }, deletedAt: null }, select: { id: true, title: true } }) : Promise.resolve([]),
  ]);
  const references = new Map<string, AttachmentReference>();
  fmeaAssessments.forEach((item) => references.set(`FmeaAssessment:${item.id}`, { type: "FMEA", title: item.title, code: item.code }));
  rulaAssessments.forEach((item) => references.set(`RulaAssessment:${item.id}`, { type: "RULA", title: item.title, code: null }));
  knowledgeDocuments.forEach((item) => references.set(`KnowledgeDocument:${item.id}`, { type: "KNOWLEDGE", title: item.title, code: null }));
  return items.map((item) => ({ ...item, reference: item.entityType ? references.get(`${item.entityType}:${item.entityId ?? ""}`) ?? { type: fileReferenceType(item.entityType), title: null, code: null } : null }));
}

export async function registerFileRoutes(app: FastifyInstance) {
  app.get("/api/v1/files", { preHandler: authenticate }, async (request) => { const organizationId = requireOrg(request); const q = pageParams(request.query); const extra = parse(z.object({ entityType: z.string().optional(), entityId: z.string().uuid().optional() }), request.query); const where = { organizationId, deletedAt: null, ...(extra.entityType ? { entityType: extra.entityType } : {}), ...(extra.entityId ? { entityId: extra.entityId } : {}), ...(q.search ? { originalName: { contains: q.search } } : {}) }; const [attachments, total] = await Promise.all([prisma.attachment.findMany({ where, skip: (q.page - 1) * q.limit, take: q.limit, orderBy: { createdAt: "desc" } }), prisma.attachment.count({ where })]); const data = await addAttachmentReferenceMetadata(attachments, organizationId); return envelope(data, { page: q.page, limit: q.limit, total }); });
  app.post("/api/v1/files", { preHandler: authenticate }, async (request, reply) => {
    const organizationId = requireOrg(request); requirePermission(request, "assessments.update"); const file = await request.file(); if (!file) throw Object.assign(new Error("File is required"), { statusCode: 400, code: "FILE_REQUIRED" });
    if (!allowedMime.has(file.mimetype)) throw Object.assign(new Error("Unsupported file type"), { statusCode: 415, code: "FILE_TYPE_NOT_ALLOWED" });
    const buffer = await file.toBuffer();
    if (buffer.length > 10 * 1024 * 1024) throw Object.assign(new Error("حجم فایل عمومی نمی‌تواند بیشتر از ۱۰ مگابایت باشد."), { statusCode: 413, code: "FILE_SIZE_LIMIT" });
    if (!hasValidFileSignature(buffer, file.mimetype)) throw Object.assign(new Error("محتوای فایل با نوع اعلام‌شده مطابقت ندارد."), { statusCode: 415, code: "FILE_SIGNATURE_INVALID" });
    const entityType = fieldValue(file.fields.entityType); const rawEntityId = fieldValue(file.fields.entityId); const entityId = rawEntityId && z.string().uuid().safeParse(rawEntityId).success ? rawEntityId : undefined;
    if (entityType === "KnowledgeDocument") throw Object.assign(new Error("برای پیوست دانش از مسیر اختصاصی پایگاه دانش استفاده کنید."), { statusCode: 400, code: "KNOWLEDGE_ATTACHMENT_ROUTE_REQUIRED" });
    if (entityType === "RulaAssessment") {
      if (!entityId) throw Object.assign(new Error("شناسه ارزیابی RULA برای تصویر الزامی است."), { statusCode: 400, code: "RULA_ATTACHMENT_ENTITY_REQUIRED" });
      if (!file.mimetype.startsWith("image/")) throw Object.assign(new Error("برای عکس پوسچر فقط فایل تصویری مجاز است."), { statusCode: 415, code: "RULA_ATTACHMENT_IMAGE_REQUIRED" });
      const assessment = await prisma.rulaAssessment.findFirst({ where: { id: entityId, organizationId }, select: { id: true } });
      if (!assessment) throw Object.assign(new Error("ارزیابی RULA پیدا نشد."), { statusCode: 404, code: "RULA_ATTACHMENT_ASSESSMENT_NOT_FOUND" });
    }
    if (entityType === "FmeaAssessment") {
      if (!entityId) throw Object.assign(new Error("شناسه ارزیابی FMEA برای تصویر الزامی است."), { statusCode: 400, code: "FMEA_ATTACHMENT_ENTITY_REQUIRED" });
      if (!file.mimetype.startsWith("image/")) throw Object.assign(new Error("برای تصویر فرآیند FMEA فقط فایل تصویری مجاز است."), { statusCode: 415, code: "FMEA_ATTACHMENT_IMAGE_REQUIRED" });
      const assessment = await prisma.fmeaAssessment.findFirst({ where: { id: entityId, organizationId, deletedAt: null }, select: { id: true } });
      if (!assessment) throw Object.assign(new Error("ارزیابی FMEA پیدا نشد."), { statusCode: 404, code: "FMEA_ATTACHMENT_ASSESSMENT_NOT_FOUND" });
      const imageCount = await prisma.attachment.count({ where: { organizationId, entityType, entityId, kind: AttachmentKind.IMAGE, deletedAt: null } });
      if (imageCount >= FMEA_PROCESS_IMAGE_MAX_COUNT) throw Object.assign(new Error("برای هر ارزیابی FMEA حداکثر ۳ تصویر فرآیند مجاز است."), { statusCode: 409, code: "FMEA_ATTACHMENT_IMAGE_COUNT_LIMIT" });
    }
    const objectKey = `${randomUUID()}${extname(file.filename).toLowerCase()}`;
    await storage.put(objectKey, buffer, file.mimetype);
    try {
      const item = await prisma.attachment.create({ data: { organizationId, uploadedById: request.actor!.userId, originalName: file.filename, objectKey, mimeType: file.mimetype, size: buffer.length, kind: kindOf(file.mimetype), entityType, entityId, checksum: createHash("sha256").update(buffer).digest("hex") } });
      await audit(request, "FILE_UPLOAD", "Attachment", item.id); return reply.code(201).send(envelope(item));
    } catch (error) {
      await storage.delete(objectKey).catch(() => undefined);
      throw error;
    }
  });
  app.get("/api/v1/files/:id/download", { preHandler: authenticate }, async (request, reply) => { const organizationId = requireOrg(request); const { id } = parse(z.object({ id: z.string().uuid() }), request.params); const item = await prisma.attachment.findFirst({ where: { id, organizationId, deletedAt: null } }); if (!item) throw Object.assign(new Error("File not found"), { statusCode: 404 }); const local = openLocalObject(item.objectKey); if (local) return reply.header("content-type", item.mimeType).header("content-disposition", `attachment; filename*=UTF-8''${encodeURIComponent(item.originalName)}`).send(local); return reply.redirect(await storage.downloadUrl(item.objectKey)); });
  app.delete("/api/v1/files/:id", { preHandler: authenticate }, async (request) => { const organizationId = requireOrg(request); requirePermission(request, "assessments.delete"); const { id } = parse(z.object({ id: z.string().uuid() }), request.params); const item = await prisma.attachment.findFirst({ where: { id, organizationId, deletedAt: null } }); if (!item) throw Object.assign(new Error("File not found"), { statusCode: 404 }); await prisma.attachment.update({ where: { id }, data: { deletedAt: new Date() } });
    try { await storage.delete(item.objectKey); } catch (error) { await prisma.attachment.update({ where: { id }, data: { deletedAt: null } }); throw error; }
    await audit(request, "FILE_DELETE", "Attachment", id); return envelope({ success: true }); });
}
