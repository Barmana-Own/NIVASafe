import type { FastifyInstance, FastifyRequest } from "fastify";
import { Prisma } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import { extname } from "node:path";
import { z } from "zod";
import { authenticate } from "../auth-guard.js";
import { audit, envelope, pageParams, parse, prisma, requireOrg, requirePermission } from "../core.js";
import { openLocalObject, storage } from "../storage.js";
import { allowedMime, hasValidFileSignature, kindOf } from "./files.js";

const managerRoles = ["SUPER_ADMIN", "ORG_ADMIN", "HSE_MANAGER"] as const;
const documentSchema = z.object({
  title: z.string().trim().min(2).max(160),
  content: z.string().trim().max(100000).default(""),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  published: z.boolean().default(true),
  aiReadable: z.boolean().default(true),
  aiOnly: z.boolean().default(false),
  isGlobal: z.boolean().default(false),
  visibility: z.enum(["ALL", "SELECTED", "HIDDEN"]).default("ALL"),
  visibleUserIds: z.array(z.string().uuid()).max(100).default([]),
  visibleOrganizationIds: z.array(z.string().uuid()).max(500).default([]),
  categoryId: z.string().uuid().nullable().optional(),
});
const documentPatchSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  content: z.string().trim().max(100000).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  published: z.boolean().optional(),
  aiReadable: z.boolean().optional(),
  aiOnly: z.boolean().optional(),
  isGlobal: z.boolean().optional(),
  visibility: z.enum(["ALL", "SELECTED", "HIDDEN"]).optional(),
  visibleUserIds: z.array(z.string().uuid()).max(100).optional(),
  visibleOrganizationIds: z.array(z.string().uuid()).max(500).optional(),
  categoryId: z.string().uuid().nullable().optional(),
});
const categorySchema = z.object({ name: z.string().trim().min(2).max(120), description: z.string().trim().max(5000).nullable().optional() });
const idParam = z.object({ id: z.string().uuid() });

const quotaByPlan: Record<string, { tokenLimit: number; maxFileBytes: number }> = {
  STARTER: { tokenLimit: 25_000, maxFileBytes: 5 * 1024 * 1024 },
  PROFESSIONAL: { tokenLimit: 100_000, maxFileBytes: 10 * 1024 * 1024 },
  ENTERPRISE: { tokenLimit: 500_000, maxFileBytes: 25 * 1024 * 1024 },
};
const defaultQuota = { tokenLimit: 25_000, maxFileBytes: 5 * 1024 * 1024 };
export const knowledgeTokenCount = (value: string | number) => Math.max(0, Math.ceil((typeof value === "number" ? value / 1024 : value.length / 4)));
const hasManagerRole = (request: FastifyRequest) => managerRoles.includes((request.actor?.role ?? "") as (typeof managerRoles)[number]);
const isSuperAdmin = (request: FastifyRequest) => request.actor?.role === "SUPER_ADMIN";
function fail(message: string, statusCode: number, code: string): never { throw Object.assign(new Error(message), { statusCode, code }); }

type KnowledgeVisibility = { isGlobal: boolean; visibleOrganizationIds: unknown };
export function isKnowledgeVisibleToOrganization(item: KnowledgeVisibility, organizationId: string | undefined, privileged = false) {
  if (!item.isGlobal || privileged) return true;
  if (!organizationId) return false;
  return !Array.isArray(item.visibleOrganizationIds) || item.visibleOrganizationIds.length === 0 || item.visibleOrganizationIds.includes(organizationId);
}

async function resolveKnowledgeOrganization(request: FastifyRequest, required = true): Promise<string | undefined> {
  if (request.actor?.organizationId) return request.actor.organizationId;
  if (isSuperAdmin(request)) {
    const owner = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
    if (owner) return owner.id;
  }
  if (required) return requireOrg(request);
  return undefined;
}

async function getKnowledgeQuota(organizationId: string) {
  const organization = await prisma.organization.findUnique({ where: { id: organizationId }, select: { subscriptionPlan: true } });
  const plan = organization?.subscriptionPlan ?? "STARTER";
  const limits = quotaByPlan[plan] ?? defaultQuota;
  const [documents, attachments] = await Promise.all([
    prisma.knowledgeDocument.findMany({ where: { organizationId, deletedAt: null }, select: { content: true } }),
    prisma.attachment.findMany({ where: { organizationId, entityType: "KnowledgeDocument", deletedAt: null }, select: { size: true } }),
  ]);
  const usedTokens = documents.reduce((sum, item) => sum + knowledgeTokenCount(item.content), 0) + attachments.reduce((sum, item) => sum + knowledgeTokenCount(item.size), 0);
  return { plan, tokenLimit: limits.tokenLimit, usedTokens, remainingTokens: Math.max(0, limits.tokenLimit - usedTokens), maxFileBytes: limits.maxFileBytes };
}

async function enforceKnowledgeQuota(organizationId: string, input: { text?: string; fileBytes?: number; replacingText?: string } = {}) {
  const quota = await getKnowledgeQuota(organizationId);
  if (input.fileBytes !== undefined && input.fileBytes > quota.maxFileBytes) fail(`حجم فایل برای طرح ${quota.plan} حداکثر ${Math.round(quota.maxFileBytes / 1024 / 1024)} مگابایت است.`, 413, "KNOWLEDGE_FILE_SIZE_LIMIT");
  const replacement = input.replacingText ? knowledgeTokenCount(input.replacingText) : 0;
  const incoming = knowledgeTokenCount(input.text ?? "") + knowledgeTokenCount(input.fileBytes ?? 0);
  if (quota.usedTokens - replacement + incoming > quota.tokenLimit) fail("سقف توکن پایگاه دانش این شرکت تکمیل شده است؛ طرح اشتراک یا اسناد قدیمی را بررسی کنید.", 413, "KNOWLEDGE_TOKEN_QUOTA_EXCEEDED");
  return quota;
}

function jsonStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

async function validateVisibilityTargets(input: {
  isGlobal: boolean;
  visibility: string;
  visibleUserIds: string[];
  visibleOrganizationIds: string[];
  organizationId: string;
}) {
  const organizationIds = [...new Set(input.visibleOrganizationIds)];
  if (!input.isGlobal && organizationIds.length) fail("محدودیت شرکت فقط برای سندهای سراسری قابل تنظیم است.", 400, "GLOBAL_ORGANIZATION_VISIBILITY_REQUIRED");
  if (organizationIds.length) {
    const organizationCount = await prisma.organization.count({ where: { id: { in: organizationIds } } });
    if (organizationCount !== organizationIds.length) fail("یکی از شرکت‌های انتخاب‌شده وجود ندارد.", 400, "INVALID_ORGANIZATION_TARGET");
  }
  const userIds = [...new Set(input.visibleUserIds)];
  if (input.visibility !== "SELECTED" || !userIds.length) return;
  const userCount = await prisma.user.count({
    where: {
      id: { in: userIds },
      active: true,
      ...(input.isGlobal ? {} : { memberships: { some: { organizationId: input.organizationId, active: true } } }),
    },
  });
  if (userCount !== userIds.length) fail("یکی از کاربران منتخب عضو فعال شرکت نیست.", 400, "INVALID_USER_TARGET");
}

type KnowledgeAttachment = { id: string; originalName: string; mimeType: string; size: number; kind: string; createdAt: Date; downloadPath: string };
type KnowledgeDocumentWithAttachments = Prisma.KnowledgeDocumentGetPayload<{ include: { category: true } }> & { attachments: KnowledgeAttachment[] };

async function findDocument(id: string, organizationId?: string) {
  return prisma.knowledgeDocument.findFirst({ where: { id, deletedAt: null, ...(organizationId ? { OR: [{ organizationId }, { isGlobal: true }] } : { isGlobal: true }) }, include: { category: true } });
}

async function getDocumentAttachments(ids: string[]) {
  if (!ids.length) return new Map<string, KnowledgeAttachment[]>();
  const files = await prisma.attachment.findMany({ where: { entityType: "KnowledgeDocument", entityId: { in: ids }, deletedAt: null }, orderBy: { createdAt: "desc" } });
  const grouped = new Map<string, KnowledgeAttachment[]>();
  for (const file of files) {
    const key = file.entityId ?? "";
    if (!key) continue;
    const list = grouped.get(key) ?? [];
    list.push({ id: file.id, originalName: file.originalName, mimeType: file.mimeType, size: file.size, kind: file.kind, createdAt: file.createdAt, downloadPath: `/knowledge/attachments/${file.id}/download` });
    grouped.set(key, list);
  }
  return grouped;
}

function assertGlobalAccess(request: FastifyRequest, item: { isGlobal: boolean }) {
  if (item.isGlobal && !isSuperAdmin(request)) fail("فقط سوپر ادمین می‌تواند دانش پیش‌فرض همه شرکت‌ها را تغییر دهد.", 403, "GLOBAL_KNOWLEDGE_FORBIDDEN");
}

function assertHumanVisible(request: FastifyRequest, item: { published: boolean; aiOnly: boolean; visibility: string; visibleUserIds: unknown }) {
  if (isSuperAdmin(request)) return;
  if (item.aiOnly || (!hasManagerRole(request) && (!item.published || item.visibility === "HIDDEN"))) fail("این سند برای کاربران منتشر نشده است.", 404, "NOT_FOUND");
  if (item.visibility === "SELECTED" && (!Array.isArray(item.visibleUserIds) || !item.visibleUserIds.includes(request.actor!.userId))) fail("این سند برای شما قابل مشاهده نیست.", 404, "NOT_FOUND");
}

function assertOrganizationVisible(request: FastifyRequest, item: KnowledgeVisibility) {
  if (!isKnowledgeVisibleToOrganization(item, request.actor?.organizationId, isSuperAdmin(request))) fail("این سند برای شرکت شما منتشر نشده است.", 404, "NOT_FOUND");
}

export async function registerKnowledgeRoutes(app: FastifyInstance) {
  app.get("/api/v1/knowledge/quota", { preHandler: authenticate }, async (request) => {
    const organizationId = await resolveKnowledgeOrganization(request);
    if (!organizationId) fail("برای مشاهده سهمیه، یک سازمان را انتخاب کنید.", 400, "ORGANIZATION_REQUIRED");
    const quota = await getKnowledgeQuota(organizationId);
    return envelope({ ...quota, canUpload: hasManagerRole(request), maxFileSizeLabel: `${Math.round(quota.maxFileBytes / 1024 / 1024)} MB` });
  });

  app.get("/api/v1/knowledge", { preHandler: authenticate }, async (request) => {
    const organizationId = await resolveKnowledgeOrganization(request, false);
    const q = pageParams(request.query);
    const canManage = hasManagerRole(request);
    if (!organizationId && !isSuperAdmin(request)) return envelope([], { page: q.page, limit: q.limit, total: 0 });
    const conditions: Prisma.KnowledgeDocumentWhereInput[] = [organizationId ? { OR: [{ organizationId }, { isGlobal: true }] } : { isGlobal: true }, { deletedAt: null }];
    if (!isSuperAdmin(request)) conditions.push({ aiOnly: false });
    if (!canManage) conditions.push({ published: true }, { visibility: { not: "HIDDEN" } });
    if (q.search) conditions.push({ OR: [{ title: { contains: q.search } }, { content: { contains: q.search } }] });
    const all = await prisma.knowledgeDocument.findMany({ where: { AND: conditions }, include: { category: true }, orderBy: { updatedAt: "desc" } });
    const visible = all.filter((item) => {
      if (!isKnowledgeVisibleToOrganization(item, organizationId, isSuperAdmin(request))) return false;
      if (canManage) return true;
      return item.visibility === "ALL" || (item.visibility === "SELECTED" && Array.isArray(item.visibleUserIds) && item.visibleUserIds.some((id) => id === request.actor!.userId));
    });
    const attachments = await getDocumentAttachments(visible.map((item) => item.id));
    const data = visible.slice((q.page - 1) * q.limit, q.page * q.limit).map((item) => {
      const withFiles: KnowledgeDocumentWithAttachments = { ...item, attachments: attachments.get(item.id) ?? [] };
      if (canManage) return withFiles;
      const { visibleUserIds: _visibleUserIds, ...safe } = withFiles;
      return safe;
    });
    return envelope(data, { page: q.page, limit: q.limit, total: visible.length });
  });

  app.post("/api/v1/knowledge", { preHandler: authenticate }, async (request, reply) => {
    requirePermission(request, "knowledge.manage");
    const body = parse(documentSchema, request.body);
    const organizationId = await resolveKnowledgeOrganization(request, !body.isGlobal);
    if (!organizationId) fail("برای ثبت سند سازمانی، یک سازمان را انتخاب کنید.", 400, "ORGANIZATION_REQUIRED");
    if (body.isGlobal && !isSuperAdmin(request)) fail("فقط سوپر ادمین می‌تواند سند پیش‌فرض همه شرکت‌ها را ثبت کند.", 403, "GLOBAL_KNOWLEDGE_FORBIDDEN");
    if (!body.isGlobal && body.visibleOrganizationIds.length) fail("محدودیت شرکت فقط برای سندهای سراسری قابل تنظیم است.", 400, "GLOBAL_ORGANIZATION_VISIBILITY_REQUIRED");
    if (body.aiOnly && !body.aiReadable) fail("برای سندهای فقط AI، خوانش هوش مصنوعی باید فعال باشد.", 400, "AI_ONLY_REQUIRES_AI_READABLE");
    await validateVisibilityTargets({ isGlobal: body.isGlobal, visibility: body.aiOnly ? "HIDDEN" : body.visibility, visibleUserIds: body.aiOnly ? [] : body.visibleUserIds, visibleOrganizationIds: body.visibleOrganizationIds, organizationId });
    await enforceKnowledgeQuota(organizationId, { text: body.content });
    const item = await prisma.knowledgeDocument.create({ data: { organizationId, title: body.title, content: body.content, tags: body.tags, published: body.aiOnly ? false : body.published, aiReadable: body.aiReadable, aiOnly: body.aiOnly, isGlobal: body.isGlobal, visibility: body.aiOnly ? "HIDDEN" : body.visibility, categoryId: body.categoryId, visibleUserIds: body.visibility === "SELECTED" && !body.aiOnly ? body.visibleUserIds : Prisma.JsonNull, visibleOrganizationIds: body.isGlobal && body.visibleOrganizationIds.length ? body.visibleOrganizationIds : Prisma.JsonNull } });
    await audit(request, "KNOWLEDGE_CREATE", "KnowledgeDocument", item.id, { isGlobal: item.isGlobal, aiOnly: item.aiOnly });
    return reply.code(201).send(envelope(item));
  });

  app.patch("/api/v1/knowledge/:id", { preHandler: authenticate }, async (request) => {
    requirePermission(request, "knowledge.manage");
    const { id } = parse(idParam, request.params);
    const organizationId = await resolveKnowledgeOrganization(request, false);
    const found = await findDocument(id, organizationId);
    if (!found) fail("Document not found", 404, "NOT_FOUND");
    assertOrganizationVisible(request, found);
    assertGlobalAccess(request, found);
    const body = parse(documentPatchSchema, request.body);
    const nextGlobal = body.isGlobal ?? found.isGlobal;
    if ((body.isGlobal === true || found.isGlobal) && !isSuperAdmin(request)) fail("فقط سوپر ادمین می‌تواند سند پیش‌فرض همه شرکت‌ها را تنظیم کند.", 403, "GLOBAL_KNOWLEDGE_FORBIDDEN");
    if (body.visibleOrganizationIds !== undefined && !nextGlobal && body.visibleOrganizationIds.length) fail("محدودیت شرکت فقط برای سندهای سراسری قابل تنظیم است.", 400, "GLOBAL_ORGANIZATION_VISIBILITY_REQUIRED");
    if (body.content !== undefined && body.content !== found.content) {
      if (!organizationId) fail("برای ویرایش سند سازمانی، یک سازمان را انتخاب کنید.", 400, "ORGANIZATION_REQUIRED");
      await enforceKnowledgeQuota(organizationId, { text: body.content, replacingText: found.content });
    }
    const nextAiOnly = body.aiOnly ?? found.aiOnly;
    const nextAiReadable = body.aiReadable ?? found.aiReadable;
    if (nextAiOnly && !nextAiReadable) fail("برای سندهای فقط AI، خوانش هوش مصنوعی باید فعال باشد.", 400, "AI_ONLY_REQUIRES_AI_READABLE");
    const nextVisibility = nextAiOnly ? "HIDDEN" : body.visibility ?? (found.aiOnly ? "ALL" : found.visibility);
    const nextVisibleUserIds = body.visibleUserIds ?? jsonStringArray(found.visibleUserIds);
    const nextVisibleOrganizationIds = body.visibleOrganizationIds ?? jsonStringArray(found.visibleOrganizationIds);
    await validateVisibilityTargets({ isGlobal: nextGlobal, visibility: nextVisibility, visibleUserIds: nextAiOnly ? [] : nextVisibleUserIds, visibleOrganizationIds: nextGlobal ? nextVisibleOrganizationIds : [], organizationId: organizationId ?? found.organizationId });
    const data: Prisma.KnowledgeDocumentUncheckedUpdateInput = {
      ...(body.title !== undefined ? { title: body.title } : {}), ...(body.content !== undefined ? { content: body.content } : {}), ...(body.tags !== undefined ? { tags: body.tags } : {}),
      ...(body.published !== undefined || body.aiOnly !== undefined ? { published: nextAiOnly ? false : body.published ?? found.published } : {}), ...(body.aiReadable !== undefined ? { aiReadable: body.aiReadable } : {}), ...(body.aiOnly !== undefined ? { aiOnly: body.aiOnly } : {}), ...(body.isGlobal !== undefined ? { isGlobal: body.isGlobal } : {}),
      ...(body.visibility !== undefined || body.aiOnly !== undefined ? { visibility: nextVisibility } : {}), ...(body.categoryId !== undefined ? { categoryId: body.categoryId } : {}),
      ...(body.visibility !== undefined || body.aiOnly !== undefined || body.visibleUserIds !== undefined ? { visibleUserIds: nextVisibility === "SELECTED" ? nextVisibleUserIds : Prisma.JsonNull } : {}),
      ...(body.isGlobal === false ? { visibleOrganizationIds: Prisma.JsonNull } : body.visibleOrganizationIds !== undefined ? { visibleOrganizationIds: nextGlobal && nextVisibleOrganizationIds.length ? nextVisibleOrganizationIds : Prisma.JsonNull } : {}), version: { increment: 1 },
    };
    const item = await prisma.knowledgeDocument.update({ where: { id }, data });
    await audit(request, "KNOWLEDGE_UPDATE", "KnowledgeDocument", id, { version: item.version, isGlobal: item.isGlobal, aiOnly: item.aiOnly });
    return envelope(item);
  });

  app.delete("/api/v1/knowledge/:id", { preHandler: authenticate }, async (request) => {
    requirePermission(request, "knowledge.manage");
    const { id } = parse(idParam, request.params);
    const organizationId = await resolveKnowledgeOrganization(request, false);
    const found = await findDocument(id, organizationId);
    if (!found) fail("Document not found", 404, "NOT_FOUND");
    assertOrganizationVisible(request, found);
    assertGlobalAccess(request, found);
    const deletedAt = new Date();
    const files = await prisma.attachment.findMany({ where: { entityType: "KnowledgeDocument", entityId: id, deletedAt: null }, select: { id: true, objectKey: true } });
    await prisma.knowledgeDocument.update({ where: { id }, data: { deletedAt, published: false } });
    await prisma.attachment.updateMany({ where: { entityType: "KnowledgeDocument", entityId: id, deletedAt: null }, data: { deletedAt } });
    await Promise.all(files.map((file) => storage.delete(file.objectKey).catch(() => undefined)));
    await audit(request, "KNOWLEDGE_DELETE", "KnowledgeDocument", id, { isGlobal: found.isGlobal });
    return envelope({ success: true });
  });

  app.get("/api/v1/knowledge/:id/attachments", { preHandler: authenticate }, async (request) => {
    const organizationId = await resolveKnowledgeOrganization(request, false);
    const { id } = parse(idParam, request.params);
    const item = await findDocument(id, organizationId);
    if (!item) fail("Document not found", 404, "NOT_FOUND");
    assertOrganizationVisible(request, item);
    assertHumanVisible(request, item);
    return envelope((await getDocumentAttachments([id])).get(id) ?? []);
  });

  app.post("/api/v1/knowledge/:id/attachments", { preHandler: authenticate }, async (request, reply) => {
    requirePermission(request, "knowledge.manage");
    const organizationId = await resolveKnowledgeOrganization(request);
    if (!organizationId) fail("برای بارگذاری فایل، یک سازمان را انتخاب کنید.", 400, "ORGANIZATION_REQUIRED");
    const { id } = parse(idParam, request.params);
    const item = await findDocument(id, organizationId);
    if (!item) fail("Document not found", 404, "NOT_FOUND");
    assertOrganizationVisible(request, item);
    assertGlobalAccess(request, item);
    const file = await request.file();
    if (!file) fail("File is required", 400, "FILE_REQUIRED");
    if (!allowedMime.has(file.mimetype)) fail("Unsupported file type", 415, "FILE_TYPE_NOT_ALLOWED");
    const buffer = await file.toBuffer();
    if (!hasValidFileSignature(buffer, file.mimetype)) fail("محتوای فایل با نوع اعلام‌شده مطابقت ندارد.", 415, "FILE_SIGNATURE_INVALID");
    await enforceKnowledgeQuota(organizationId, { fileBytes: buffer.length });
    const objectKey = `${randomUUID()}${extname(file.filename).toLowerCase()}`;
    await storage.put(objectKey, buffer, file.mimetype);
    try {
      const attachment = await prisma.attachment.create({ data: { organizationId, uploadedById: request.actor!.userId, originalName: file.filename, objectKey, mimeType: file.mimetype, size: buffer.length, kind: kindOf(file.mimetype), entityType: "KnowledgeDocument", entityId: id, checksum: createHash("sha256").update(buffer).digest("hex") } });
      await audit(request, "KNOWLEDGE_FILE_UPLOAD", "Attachment", attachment.id, { documentId: id, originalName: file.filename });
      return reply.code(201).send(envelope({ id: attachment.id, originalName: attachment.originalName, mimeType: attachment.mimeType, size: attachment.size, kind: attachment.kind, createdAt: attachment.createdAt, downloadPath: `/knowledge/attachments/${attachment.id}/download` }));
    } catch (error) {
      await storage.delete(objectKey).catch(() => undefined);
      throw error;
    }
  });

  app.get("/api/v1/knowledge/attachments/:id/download", { preHandler: authenticate }, async (request, reply) => {
    const organizationId = await resolveKnowledgeOrganization(request, false);
    const { id } = parse(idParam, request.params);
    const file = await prisma.attachment.findFirst({ where: { id, entityType: "KnowledgeDocument", deletedAt: null } });
    if (!file?.entityId) fail("File not found", 404, "NOT_FOUND");
    const item = await findDocument(file.entityId, organizationId);
    if (!item) fail("File not found", 404, "NOT_FOUND");
    assertOrganizationVisible(request, item);
    assertHumanVisible(request, item);
    const local = openLocalObject(file.objectKey);
    if (local) return reply.header("content-type", file.mimeType).header("content-disposition", `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`).send(local);
    return reply.redirect(await storage.downloadUrl(file.objectKey));
  });

  app.delete("/api/v1/knowledge/attachments/:id", { preHandler: authenticate }, async (request) => {
    requirePermission(request, "knowledge.manage");
    const organizationId = await resolveKnowledgeOrganization(request, false);
    const { id } = parse(idParam, request.params);
    const file = await prisma.attachment.findFirst({ where: { id, entityType: "KnowledgeDocument", deletedAt: null } });
    if (!file?.entityId) fail("File not found", 404, "NOT_FOUND");
    const item = await findDocument(file.entityId, organizationId);
    if (!item) fail("File not found", 404, "NOT_FOUND");
    assertOrganizationVisible(request, item);
    assertGlobalAccess(request, item);
    await prisma.attachment.update({ where: { id }, data: { deletedAt: new Date() } });
    try { await storage.delete(file.objectKey); } catch (error) { await prisma.attachment.update({ where: { id }, data: { deletedAt: null } }); throw error; }
    await audit(request, "KNOWLEDGE_FILE_DELETE", "Attachment", id, { documentId: item.id });
    return envelope({ success: true });
  });

  app.get("/api/v1/knowledge/categories", { preHandler: authenticate }, async (request) => envelope(await prisma.knowledgeCategory.findMany({ where: { organizationId: requireOrg(request) }, orderBy: { name: "asc" } })));
  app.post("/api/v1/knowledge/categories", { preHandler: authenticate }, async (request, reply) => { const organizationId = requireOrg(request); requirePermission(request, "knowledge.manage"); return reply.code(201).send(envelope(await prisma.knowledgeCategory.create({ data: { organizationId, ...parse(categorySchema, request.body) } }))); });
  app.patch("/api/v1/knowledge/categories/:id", { preHandler: authenticate }, async (request) => { const organizationId = requireOrg(request); requirePermission(request, "knowledge.manage"); const { id } = parse(idParam, request.params); const found = await prisma.knowledgeCategory.findFirst({ where: { id, organizationId } }); if (!found) fail("Category not found", 404, "NOT_FOUND"); return envelope(await prisma.knowledgeCategory.update({ where: { id }, data: parse(categorySchema.partial(), request.body) })); });
  app.delete("/api/v1/knowledge/categories/:id", { preHandler: authenticate }, async (request) => { const organizationId = requireOrg(request); requirePermission(request, "knowledge.manage"); const { id } = parse(idParam, request.params); const count = await prisma.knowledgeDocument.count({ where: { organizationId, categoryId: id, deletedAt: null } }); if (count) fail("Category is in use", 409, "CATEGORY_IN_USE"); const result = await prisma.knowledgeCategory.deleteMany({ where: { id, organizationId } }); if (!result.count) fail("Category not found", 404, "NOT_FOUND"); return envelope({ success: true }); });
}
