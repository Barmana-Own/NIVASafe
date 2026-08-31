import type { FastifyInstance } from "fastify";
import { AttachmentKind } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import { extname } from "node:path";
import { z } from "zod";
import { authenticate } from "../auth-guard.js";
import { audit, envelope, pageParams, parse, prisma, requireOrg, requirePermission } from "../core.js";
import { openLocalObject, storage } from "../storage.js";

export const allowedMime = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "application/pdf", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword", "application/vnd.ms-excel", "text/csv", "text/plain"]);
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

export async function registerFileRoutes(app: FastifyInstance) {
  app.get("/api/v1/files", { preHandler: authenticate }, async (request) => { const organizationId = requireOrg(request); const q = pageParams(request.query); const extra = parse(z.object({ entityType: z.string().optional(), entityId: z.string().uuid().optional() }), request.query); const where = { organizationId, deletedAt: null, ...(extra.entityType ? { entityType: extra.entityType } : {}), ...(extra.entityId ? { entityId: extra.entityId } : {}), ...(q.search ? { originalName: { contains: q.search } } : {}) }; const [data, total] = await Promise.all([prisma.attachment.findMany({ where, skip: (q.page - 1) * q.limit, take: q.limit, orderBy: { createdAt: "desc" } }), prisma.attachment.count({ where })]); return envelope(data, { page: q.page, limit: q.limit, total }); });
  app.post("/api/v1/files", { preHandler: authenticate }, async (request, reply) => {
    const organizationId = requireOrg(request); requirePermission(request, "assessments.update"); const file = await request.file(); if (!file) throw Object.assign(new Error("File is required"), { statusCode: 400, code: "FILE_REQUIRED" });
    if (!allowedMime.has(file.mimetype)) throw Object.assign(new Error("Unsupported file type"), { statusCode: 415, code: "FILE_TYPE_NOT_ALLOWED" });
    const buffer = await file.toBuffer();
    if (buffer.length > 10 * 1024 * 1024) throw Object.assign(new Error("حجم فایل عمومی نمی‌تواند بیشتر از ۱۰ مگابایت باشد."), { statusCode: 413, code: "FILE_SIZE_LIMIT" });
    if (!hasValidFileSignature(buffer, file.mimetype)) throw Object.assign(new Error("محتوای فایل با نوع اعلام‌شده مطابقت ندارد."), { statusCode: 415, code: "FILE_SIGNATURE_INVALID" });
    const entityType = fieldValue(file.fields.entityType); const rawEntityId = fieldValue(file.fields.entityId); const entityId = rawEntityId && z.string().uuid().safeParse(rawEntityId).success ? rawEntityId : undefined;
    if (entityType === "KnowledgeDocument") throw Object.assign(new Error("برای پیوست دانش از مسیر اختصاصی پایگاه دانش استفاده کنید."), { statusCode: 400, code: "KNOWLEDGE_ATTACHMENT_ROUTE_REQUIRED" });
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
