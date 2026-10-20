import type { FastifyInstance, FastifyRequest } from "fastify";
import { Prisma, SupportAssessmentType, SupportReplyVisibility, SupportRequestCategory, SupportRequestPriority, SupportRequestStatus } from "@prisma/client";
import { z } from "zod";
import { authenticate } from "../auth-guard.js";
import { envelope, parse, prisma, requireOrg } from "../core.js";
import { canTransitionSupportTicketStatus } from "../support-ticket-state.js";

const requestParams = z.object({ id: z.string().uuid() });
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(SupportRequestStatus).optional(),
  category: z.nativeEnum(SupportRequestCategory).optional(),
  priority: z.nativeEnum(SupportRequestPriority).optional(),
  organizationId: z.string().uuid().optional(),
  search: z.string().trim().max(120).optional(),
});
const publicErrorCodes = ["RULA_IMAGE_AI_UNAVAILABLE", "RULA_IMAGE_AI_QUALITY_REVIEW", "RULA_IMAGE_AI_INVALID_RESPONSE", "RULA_IMAGE_QUALITY_REVIEW", "RULA_IMAGE_TYPE_NOT_ALLOWED", "RULA_IMAGE_SIZE_LIMIT", "RULA_IMAGE_SIGNATURE_INVALID", "AI_ACCESS_DISABLED", "AI_ACCESS_LIMIT_REACHED", "SUBSCRIPTION_REQUIRED", "FORBIDDEN", "NETWORK_ERROR"] as const;
const createSupportRequestSchema = z.object({
  category: z.nativeEnum(SupportRequestCategory),
  subject: z.string().trim().min(3).max(191),
  message: z.string().trim().min(10).max(10_000),
  relatedAssessmentType: z.nativeEnum(SupportAssessmentType).optional(),
  relatedAssessmentId: z.string().uuid().optional(),
  publicErrorCode: z.enum(publicErrorCodes).optional(),
}).strict().superRefine((body, context) => {
  if ((body.relatedAssessmentType === undefined) !== (body.relatedAssessmentId === undefined)) {
    context.addIssue({ code: "custom", path: ["relatedAssessmentId"], message: "Assessment reference type and ID must be provided together" });
  }
});
const updateSupportRequestSchema = z.object({
  expectedUpdatedAt: z.string().datetime().optional(),
  status: z.nativeEnum(SupportRequestStatus).optional(),
  priority: z.nativeEnum(SupportRequestPriority).optional(),
  assignedToId: z.preprocess((value) => value === "" ? null : value, z.string().uuid().nullable().optional()),
  response: z.preprocess((value) => value === "" ? null : value, z.string().trim().max(4_000).nullable().optional()),
}).strict().refine((body) => body.status !== undefined || body.priority !== undefined || body.assignedToId !== undefined || body.response !== undefined, { message: "At least one support request field is required" });
const createReplySchema = z.object({ message: z.string().trim().min(1).max(4_000) }).strict();
const publicReplyInclude = { replies: { where: { visibility: SupportReplyVisibility.PUBLIC }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], include: { author: { select: { id: true, displayName: true, globalRole: true } } } } } satisfies Prisma.SupportRequestInclude;
const staffReplyInclude = { replies: { orderBy: [{ createdAt: "asc" }, { id: "asc" }], include: { author: { select: { id: true, displayName: true, globalRole: true } } } } } satisfies Prisma.SupportRequestInclude;
const staffRequestInclude = { requester: { select: { id: true, displayName: true, email: true } }, organization: { select: { id: true, nameFa: true, nameEn: true } }, assignedTo: { select: { id: true, displayName: true, email: true } } } satisfies Prisma.SupportRequestInclude;

// authenticate reloads this global role from the active user record on every request.
// Organization roles and client-supplied claims never grant the platform inbox.
function requireSupportAdministrator(request: FastifyRequest) {
  if (request.actor?.globalRole !== "SUPER_ADMIN") {
    throw Object.assign(new Error("Support operator access is required"), { statusCode: 403, code: "FORBIDDEN" });
  }
}

function supportOperatorUserWhere(): Prisma.UserWhereInput {
  return { active: true, globalRole: "SUPER_ADMIN" };
}

async function notifySupportAdministrators(tx: Prisma.TransactionClient, input: { organizationId: string; ticketId: string; authorId: string; kind: "CREATED" | "REPLY" }) {
  const administrators = await tx.user.findMany({ where: { ...supportOperatorUserWhere(), id: { not: input.authorId } }, select: { id: true, locale: true } });
  if (!administrators.length) return;
  await tx.notification.createMany({ data: administrators.map(person => ({
    organizationId: input.organizationId,
    userId: person.id,
    title: person.locale === "en" ? input.kind === "CREATED" ? "New support ticket" : "Customer replied" : input.kind === "CREATED" ? "تیکت پشتیبانی جدید" : "پاسخ جدید کاربر",
    message: person.locale === "en" ? "A customer support ticket is awaiting your review." : "یک تیکت پشتیبانی برای بررسی شما به‌روزرسانی شد.",
    link: `/support?ticket=${encodeURIComponent(input.ticketId)}`,
  })) });
}

async function auditSupportRead(request: FastifyRequest, input: { organizationId?: string; action: string; entityId?: string; page?: number; limit?: number; status?: string; category?: string; priority?: string; searchApplied?: boolean }) {
  const { organizationId, action, entityId, ...filters } = input;
  await prisma.auditLog.create({ data: {
    organizationId,
    userId: request.actor!.userId,
    action,
    entityType: action === "SUPPORT_STAFF_DIRECTORY_READ" ? "SupportStaff" : "SupportRequest",
    ...(entityId ? { entityId } : {}),
    metadata: Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined)),
    requestId: request.id,
    ipAddress: request.ip?.slice(0, 64),
    userAgent: request.headers["user-agent"]?.slice(0, 2000),
  } });
}

function isDuplicateKey(error: unknown) {
  return (error as { code?: unknown } | null)?.code === "P2002";
}

function sameIdempotentPayload(existing: { category: string; subject: string; message: string; relatedAssessmentType?: string | null; relatedAssessmentId?: string | null; publicErrorCode?: string | null }, body: z.infer<typeof createSupportRequestSchema>) {
  return existing.category === body.category && existing.subject === body.subject && existing.message === body.message
    && (existing.relatedAssessmentType ?? undefined) === body.relatedAssessmentType
    && (existing.relatedAssessmentId ?? undefined) === body.relatedAssessmentId
    && (existing.publicErrorCode ?? undefined) === body.publicErrorCode;
}

function idempotencyKey(request: FastifyRequest) {
  return parse(z.string().uuid(), request.headers["idempotency-key"]);
}

function replyIdempotencyKey(request: FastifyRequest) {
  return parse(z.string().uuid(), request.headers["idempotency-key"]);
}

function sameReply(existing: { message: string; visibility?: SupportReplyVisibility }, message: string, visibility: SupportReplyVisibility) {
  return existing.message === message && (existing.visibility ?? SupportReplyVisibility.PUBLIC) === visibility;
}

async function validateAssessmentReference(organizationId: string, body: z.infer<typeof createSupportRequestSchema>) {
  if (!body.relatedAssessmentId || !body.relatedAssessmentType) return;
  const exists = body.relatedAssessmentType === SupportAssessmentType.RULA
    ? await prisma.rulaAssessment.findFirst({ where: { id: body.relatedAssessmentId, organizationId }, select: { id: true } })
    : await prisma.fmeaAssessment.findFirst({ where: { id: body.relatedAssessmentId, organizationId }, select: { id: true } });
  if (!exists) throw Object.assign(new Error("Assessment reference is invalid for this organization"), { statusCode: 400, code: "SUPPORT_REFERENCE_INVALID" });
}

async function createReply(
  request: FastifyRequest,
  input: { organizationId: string; requestId: string; authorId: string; message: string; idempotencyKey: string; statusAfterReply?: SupportRequestStatus; visibility: SupportReplyVisibility; notifyRequester?: { userId: string; locale?: string }; notifyAdministrators?: boolean },
) {
  const where = { organizationId_requestId_authorId_idempotencyKey: {
    organizationId: input.organizationId,
    requestId: input.requestId,
    authorId: input.authorId,
    idempotencyKey: input.idempotencyKey,
  } };
  const existing = await prisma.supportReply.findUnique({ where });
  if (existing) {
    if (!sameReply(existing, input.message, input.visibility)) throw Object.assign(new Error("The idempotency key was already used for another reply"), { statusCode: 409, code: "IDEMPOTENCY_KEY_REUSED" });
    return { item: existing, replay: true };
  }
  try {
    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.supportReply.create({ data: {
        organizationId: input.organizationId,
        requestId: input.requestId,
        authorId: input.authorId,
        idempotencyKey: input.idempotencyKey,
        message: input.message,
        visibility: input.visibility,
      } });
      await tx.supportRequest.update({ where: { id: input.requestId }, data: { updatedAt: new Date(), ...(input.statusAfterReply ? { status: input.statusAfterReply, resolvedAt: null, responderId: null } : {}) } });
      if (input.notifyRequester) await tx.notification.create({ data: {
        organizationId: input.organizationId,
        userId: input.notifyRequester.userId,
        title: input.notifyRequester.locale === "en" ? "Support replied" : "پشتیبانی پاسخ داد",
        message: input.notifyRequester.locale === "en" ? "A new reply was added to your support request." : "پاسخ جدیدی برای درخواست پشتیبانی شما ثبت شد.",
        link: `/support?ticket=${encodeURIComponent(input.requestId)}`,
      } });
      if (input.notifyAdministrators) await notifySupportAdministrators(tx, { organizationId: input.organizationId, ticketId: input.requestId, authorId: input.authorId, kind: "REPLY" });
      await tx.auditLog.create({ data: {
        organizationId: input.organizationId,
        userId: input.authorId,
        action: input.visibility === SupportReplyVisibility.INTERNAL ? "SUPPORT_INTERNAL_NOTE_CREATE" : "SUPPORT_REPLY_CREATE",
        entityType: "SupportRequest",
        entityId: input.requestId,
        metadata: { statusAfterReply: input.statusAfterReply ?? null, visibility: input.visibility },
        requestId: request.id,
        ipAddress: request.ip?.slice(0, 64),
        userAgent: request.headers["user-agent"]?.slice(0, 2000),
      } });
      return created;
    });
    return { item, replay: false };
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
    const duplicate = await prisma.supportReply.findUnique({ where });
    if (duplicate && sameReply(duplicate, input.message, input.visibility)) return { item: duplicate, replay: true };
    throw Object.assign(new Error("The idempotency key was already used for another reply"), { statusCode: 409, code: "IDEMPOTENCY_KEY_REUSED" });
  }
}

export async function registerSupportRoutes(app: FastifyInstance) {
  app.post("/api/v1/support/requests", {
    preHandler: authenticate,
    config: { allowUnsubscribed: true, rateLimit: { max: 5, timeWindow: "1 hour" } },
  }, async (request, reply) => {
    const organizationId = requireOrg(request);
    const requesterId = request.actor!.userId;
    const key = idempotencyKey(request);
    const body = parse(createSupportRequestSchema, request.body);
    await validateAssessmentReference(organizationId, body);
    const where = { organizationId_requesterId_idempotencyKey: { organizationId, requesterId, idempotencyKey: key } };
    const existing = await prisma.supportRequest.findUnique({ where });
    if (existing) {
      if (!sameIdempotentPayload(existing, body)) throw Object.assign(new Error("The idempotency key was already used for another request"), { statusCode: 409, code: "IDEMPOTENCY_KEY_REUSED" });
      return reply.code(200).send(envelope(existing));
    }
    try {
      const created = await prisma.$transaction(async (tx) => {
        const item = await tx.supportRequest.create({ data: { ...body, organizationId, requesterId, idempotencyKey: key } });
        await notifySupportAdministrators(tx, { organizationId, ticketId: item.id, authorId: requesterId, kind: "CREATED" });
        await tx.auditLog.create({ data: { organizationId, userId: requesterId, action: "SUPPORT_REQUEST_CREATE", entityType: "SupportRequest", entityId: item.id, metadata: { category: body.category }, requestId: request.id } });
        return item;
      });
      return reply.code(201).send(envelope(created));
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
      const duplicate = await prisma.supportRequest.findUnique({ where });
      if (duplicate && sameIdempotentPayload(duplicate, body)) return reply.code(200).send(envelope(duplicate));
      throw Object.assign(new Error("The idempotency key was already used for another request"), { statusCode: 409, code: "IDEMPOTENCY_KEY_REUSED" });
    }
  });

  app.get("/api/v1/support/requests", { preHandler: authenticate, config: { allowUnsubscribed: true } }, async (request) => {
    const organizationId = requireOrg(request);
    const requesterId = request.actor!.userId;
    const query = parse(paginationSchema, request.query);
    const where: Prisma.SupportRequestWhereInput = {
      organizationId,
      requesterId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.search ? { OR: [{ subject: { contains: query.search } }, { message: { contains: query.search } }] } : {}),
    };
    const [data, total] = await Promise.all([
      prisma.supportRequest.findMany({ where, skip: (query.page - 1) * query.limit, take: query.limit, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }),
      prisma.supportRequest.count({ where }),
    ]);
    return envelope(data, { page: query.page, limit: query.limit, total });
  });

  app.get("/api/v1/support/requests/:id", { preHandler: authenticate, config: { allowUnsubscribed: true } }, async (request) => {
    const organizationId = requireOrg(request);
    const { id } = parse(requestParams, request.params);
    const item = await prisma.supportRequest.findFirst({ where: { id, organizationId, requesterId: request.actor!.userId }, include: publicReplyInclude });
    if (!item) throw Object.assign(new Error("Support request not found"), { statusCode: 404, code: "NOT_FOUND" });
    return envelope(item);
  });

  app.post("/api/v1/support/requests/:id/replies", {
    preHandler: authenticate,
    config: { allowUnsubscribed: true, rateLimit: { max: 20, timeWindow: "1 hour" } },
  }, async (request, reply) => {
    const organizationId = requireOrg(request);
    const { id } = parse(requestParams, request.params);
    const key = replyIdempotencyKey(request);
    const body = parse(createReplySchema, request.body);
    const ticket = await prisma.supportRequest.findFirst({ where: { id, organizationId, requesterId: request.actor!.userId } });
    if (!ticket) throw Object.assign(new Error("Support request not found"), { statusCode: 404, code: "NOT_FOUND" });
    const result = await createReply(request, {
      organizationId,
      requestId: ticket.id,
      authorId: request.actor!.userId,
      message: body.message,
      idempotencyKey: key,
      statusAfterReply: ticket.status === "WAITING_USER" ? SupportRequestStatus.IN_PROGRESS : ticket.status === "RESOLVED" || ticket.status === "CLOSED" ? SupportRequestStatus.OPEN : undefined,
      visibility: SupportReplyVisibility.PUBLIC,
      notifyAdministrators: true,
    });
    return reply.code(result.replay ? 200 : 201).send(envelope(result.item));
  });

  app.get("/api/v1/admin/support-requests", { preHandler: authenticate, config: { allowUnsubscribed: true } }, async (request) => {
    requireSupportAdministrator(request);
    const query = parse(paginationSchema, request.query);
    const where: Prisma.SupportRequestWhereInput = {
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.search ? { OR: [
        { subject: { contains: query.search } },
        { message: { contains: query.search } },
        { requester: { displayName: { contains: query.search } } },
        { requester: { email: { contains: query.search } } },
      ] } : {}),
    };
    const [data, total] = await Promise.all([
      prisma.supportRequest.findMany({ where, skip: (query.page - 1) * query.limit, take: query.limit, orderBy: [{ updatedAt: "asc" }, { id: "asc" }], include: staffRequestInclude }),
      prisma.supportRequest.count({ where }),
    ]);
    await auditSupportRead(request, { organizationId: query.organizationId ?? request.actor!.organizationId, action: "SUPPORT_QUEUE_READ", page: query.page, limit: query.limit, status: query.status, category: query.category, priority: query.priority, searchApplied: Boolean(query.search) });
    return envelope(data, { page: query.page, limit: query.limit, total });
  });

  app.get("/api/v1/admin/support-staff", { preHandler: authenticate, config: { allowUnsubscribed: true } }, async (request) => {
    requireSupportAdministrator(request);
    const staff = await prisma.user.findMany({ where: supportOperatorUserWhere(), orderBy: [{ displayName: "asc" }, { id: "asc" }], take: 100, select: { id: true, displayName: true, email: true } });
    await auditSupportRead(request, { organizationId: request.actor!.organizationId, action: "SUPPORT_STAFF_DIRECTORY_READ" });
    return envelope(staff);
  });

  app.get("/api/v1/admin/support-requests/:id", { preHandler: authenticate, config: { allowUnsubscribed: true } }, async (request) => {
    requireSupportAdministrator(request);
    const { id } = parse(requestParams, request.params);
    const item = await prisma.supportRequest.findFirst({ where: { id }, include: { ...staffRequestInclude, ...staffReplyInclude } });
    if (!item) throw Object.assign(new Error("Support request not found"), { statusCode: 404, code: "NOT_FOUND" });
    await auditSupportRead(request, { organizationId: item.organizationId, action: "SUPPORT_TICKET_READ", entityId: id });
    return envelope(item);
  });

  app.post("/api/v1/admin/support-requests/:id/replies", {
    preHandler: authenticate,
    config: { allowUnsubscribed: true, rateLimit: { max: 30, timeWindow: "1 hour" } },
  }, async (request, reply) => {
    requireSupportAdministrator(request);
    const { id } = parse(requestParams, request.params);
    const key = replyIdempotencyKey(request);
    const body = parse(createReplySchema, request.body);
    const ticket = await prisma.supportRequest.findFirst({ where: { id }, select: { id: true, organizationId: true, requesterId: true, status: true, requester: { select: { locale: true } } } });
    if (!ticket) throw Object.assign(new Error("Support request not found"), { statusCode: 404, code: "NOT_FOUND" });
    const result = await createReply(request, {
      organizationId: ticket.organizationId,
      requestId: ticket.id,
      authorId: request.actor!.userId,
      message: body.message,
      idempotencyKey: key,
      visibility: SupportReplyVisibility.PUBLIC,
      notifyRequester: { userId: ticket.requesterId, locale: ticket.requester.locale },
    });
    return reply.code(result.replay ? 200 : 201).send(envelope(result.item));
  });

  app.post("/api/v1/admin/support-requests/:id/internal-notes", {
    preHandler: authenticate,
    config: { allowUnsubscribed: true, rateLimit: { max: 30, timeWindow: "1 hour" } },
  }, async (request, reply) => {
    requireSupportAdministrator(request);
    const { id } = parse(requestParams, request.params);
    const key = replyIdempotencyKey(request);
    const body = parse(createReplySchema, request.body);
    const ticket = await prisma.supportRequest.findFirst({ where: { id }, select: { id: true, organizationId: true } });
    if (!ticket) throw Object.assign(new Error("Support request not found"), { statusCode: 404, code: "NOT_FOUND" });
    const result = await createReply(request, {
      organizationId: ticket.organizationId,
      requestId: ticket.id,
      authorId: request.actor!.userId,
      message: body.message,
      idempotencyKey: key,
      visibility: SupportReplyVisibility.INTERNAL,
    });
    return reply.code(result.replay ? 200 : 201).send(envelope(result.item));
  });

  app.patch("/api/v1/admin/support-requests/:id", { preHandler: authenticate, config: { allowUnsubscribed: true } }, async (request) => {
    requireSupportAdministrator(request);
    const { id } = parse(requestParams, request.params);
    const body = parse(updateSupportRequestSchema, request.body);
    const existing = await prisma.supportRequest.findFirst({ where: { id }, select: { id: true, organizationId: true, requesterId: true, assignedToId: true, response: true, status: true, updatedAt: true, requester: { select: { locale: true } } } });
    if (!existing) throw Object.assign(new Error("Support request not found"), { statusCode: 404, code: "NOT_FOUND" });
    if (body.status && !canTransitionSupportTicketStatus(existing.status, body.status)) throw Object.assign(new Error("Support request status transition is invalid"), { statusCode: 409, code: "SUPPORT_STATUS_TRANSITION_INVALID" });
    if (body.assignedToId) {
      const assignee = await prisma.user.findFirst({ where: { ...supportOperatorUserWhere(), id: body.assignedToId }, select: { id: true } });
      if (!assignee) throw Object.assign(new Error("Support assignee is invalid"), { statusCode: 400, code: "SUPPORT_ASSIGNEE_INVALID" });
    }
    try {
      return await prisma.$transaction(async (tx) => {
      const status = body.status;
      const { response, expectedUpdatedAt, ...ticketUpdates } = body;
      const item = await tx.supportRequest.update({ where: { id, ...(expectedUpdatedAt ? { updatedAt: new Date(expectedUpdatedAt) } : {}) }, data: {
        ...ticketUpdates,
        responderId: request.actor!.userId,
        ...(status === "RESOLVED" || status === "CLOSED" ? { resolvedAt: new Date() } : status ? { resolvedAt: null } : {}),
      } });
      if (response && response !== existing.response) {
        await tx.supportReply.create({ data: { organizationId: existing.organizationId, requestId: id, authorId: request.actor!.userId, idempotencyKey: null, message: response, visibility: SupportReplyVisibility.PUBLIC } });
        await tx.notification.create({ data: {
          organizationId: existing.organizationId,
          userId: existing.requesterId,
          title: existing.requester.locale === "en" ? "Support replied" : "پشتیبانی پاسخ داد",
          message: existing.requester.locale === "en" ? "A new reply was added to your support request." : "پاسخ جدیدی برای درخواست پشتیبانی شما ثبت شد.",
          link: `/support?ticket=${encodeURIComponent(id)}`,
        } });
      }
      await tx.auditLog.create({ data: { userId: request.actor!.userId, organizationId: existing.organizationId, action: "SUPPORT_REQUEST_REVIEW", entityType: "SupportRequest", entityId: id, metadata: { status: item.status, priority: item.priority, ...(body.assignedToId !== undefined ? { assigneeChange: { from: existing.assignedToId, to: item.assignedToId } } : {}), responseUpdated: response !== undefined }, requestId: request.id, ipAddress: request.ip?.slice(0, 64), userAgent: request.headers["user-agent"]?.slice(0, 2000) } });
      return envelope(item);
      });
    } catch (error) {
      if (body.expectedUpdatedAt && (error as { code?: unknown } | null)?.code === "P2025") throw Object.assign(new Error("This ticket changed while you were editing it. Reload and review the latest version."), { statusCode: 409, code: "SUPPORT_TICKET_CONFLICT" });
      throw error;
    }
  });
}
