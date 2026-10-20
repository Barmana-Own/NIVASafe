import Fastify from "fastify";
import { beforeEach, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({
  user: { findFirst: vi.fn(), findMany: vi.fn() },
  rulaAssessment: { findFirst: vi.fn() },
  fmeaAssessment: { findFirst: vi.fn() },
  supportRequest: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn() },
  supportReply: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  notification: { create: vi.fn(), createMany: vi.fn() },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("./core.js", () => ({ prisma: db, envelope: (data: unknown, meta?: unknown) => ({ data, meta }), requireOrg: (request: { actor: { organizationId?: string } }) => { if (!request.actor.organizationId) throw Object.assign(Error("Organization required"), { statusCode: 400 }); return request.actor.organizationId; }, parse: (schema: any, data: any) => { const result = schema.safeParse(data); if (!result.success) throw Object.assign(Error("Invalid input"), { statusCode: 400 }); return result.data; } }));
vi.mock("./auth-guard.js", () => ({ authenticate: async (request: any) => { if (!request.headers.authorization) throw Object.assign(Error("Unauthorized"), { statusCode: 401 }); request.actor = { userId: request.headers["x-user-id"] ?? "user-a", organizationId: request.headers["x-org-id"] ?? "org-a", role: request.headers["x-test-role"] ?? "HSE_SPECIALIST", globalRole: request.headers["x-test-role"] === "SUPER_ADMIN" ? "SUPER_ADMIN" : "USER" }; } }));
import { registerSupportRoutes } from "./modules/support.js";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("SUPPORT_OPERATOR_USER_IDS", "user-a,00000000-0000-4000-8000-000000000018");
  vi.stubEnv("SUPPORT_OPERATOR_ORGANIZATION_IDS", "org-a");
  db.supportRequest.create.mockResolvedValue({ id: "request-a", organizationId: "org-a", requesterId: "user-a", category: "AI_QUOTA", subject: "More tokens", message: "Please review", status: "OPEN" });
  db.supportRequest.findFirst.mockResolvedValue(null);
  db.supportRequest.findUnique.mockResolvedValue(null);
  db.supportRequest.findMany.mockResolvedValue([]);
  db.supportRequest.count.mockResolvedValue(0);
  db.supportRequest.update.mockResolvedValue({ id: "request-a", status: "IN_PROGRESS", priority: "NORMAL", response: "Review started" });
  db.user.findFirst.mockResolvedValue(null);
  db.user.findMany.mockResolvedValue([]);
  db.rulaAssessment.findFirst.mockResolvedValue(null);
  db.fmeaAssessment.findFirst.mockResolvedValue(null);
  db.supportReply.create.mockResolvedValue({ id: "reply-a", organizationId: "org-a", requestId: "request-a", authorId: "user-a", message: "More detail", createdAt: new Date("2026-10-15T08:00:00Z") });
  db.supportReply.findMany.mockResolvedValue([]);
  db.supportReply.findUnique.mockResolvedValue(null);
  db.notification.create.mockResolvedValue({ id: "notification-a" });
  db.$transaction.mockImplementation((callback: (tx: unknown) => Promise<unknown>) => callback({ user: db.user, supportRequest: db.supportRequest, supportReply: db.supportReply, notification: db.notification, auditLog: db.auditLog }));
});

it("lets every authenticated global super-admin read all tickets without operator allowlists or protection flags", async () => withApp(async app => {
  vi.stubEnv("SUPPORT_OPERATOR_USER_IDS", "");
  vi.stubEnv("SUPPORT_OPERATOR_ORGANIZATION_IDS", "");
  const response = await app.inject({ url: "/api/v1/admin/support-requests", headers: { authorization: "test", "x-test-role": "SUPER_ADMIN", "x-user-id": "another-system-admin", "x-org-id": "unrelated-organization" } });
  expect(response.statusCode).toBe(200);
  expect(db.supportRequest.findMany.mock.calls[0]![0].where).toEqual({});
  expect(db.user.findFirst).not.toHaveBeenCalled();
}));

it("lets a system administrator open a different organization's ticket and audits the ticket's real organization", async () => withApp(async app => {
  const id = "00000000-0000-4000-8000-000000000022";
  db.supportRequest.findFirst.mockResolvedValueOnce({ id, organizationId: "org-b", message: "Synthetic request", replies: [] });
  const response = await app.inject({ url: `/api/v1/admin/support-requests/${id}`, headers: { authorization: "test", "x-test-role": "SUPER_ADMIN" } });
  expect(response.statusCode).toBe(200);
  expect(db.supportRequest.findFirst.mock.calls[0]![0].where).toEqual({ id });
  expect(db.auditLog.create.mock.calls[0]![0].data.organizationId).toBe("org-b");
}));

it("supports an explicit organization filter without locking a system administrator to the current organization", async () => withApp(async app => {
  const organizationId = "00000000-0000-4000-8000-000000000023";
  const response = await app.inject({ url: `/api/v1/admin/support-requests?organizationId=${organizationId}`, headers: { authorization: "test", "x-test-role": "SUPER_ADMIN" } });
  expect(response.statusCode).toBe(200);
  expect(db.supportRequest.findMany.mock.calls[0]![0].where).toEqual({ organizationId });
}));

it("notifies all active global administrators once when a customer creates a ticket without copying its private text", async () => withApp(async app => {
  db.user.findMany.mockResolvedValueOnce([{ id: "admin-a", locale: "fa" }, { id: "admin-b", locale: "en" }]);
  const response = await app.inject({ method: "POST", url: "/api/v1/support/requests", headers: { authorization: "test", "idempotency-key": "00000000-0000-4000-8000-000000000024" }, payload: { category: "OTHER", subject: "Synthetic request", message: "Private synthetic customer message" } });
  expect(response.statusCode).toBe(201);
  expect(db.user.findMany.mock.calls[0]![0].where).toMatchObject({ active: true, globalRole: "SUPER_ADMIN" });
  const notifications = db.notification.createMany.mock.calls[0]![0].data;
  expect(notifications.map((item: { userId: string }) => item.userId)).toEqual(["admin-a", "admin-b"]);
  expect(notifications.every((item: { organizationId: string; link: string }) => item.organizationId === "org-a" && item.link === "/support?ticket=request-a")).toBe(true);
  expect(JSON.stringify(notifications)).not.toContain("Private synthetic");
}));

it("notifies administrators for a customer reply but does not notify again on its idempotent replay", async () => withApp(async app => {
  const id = "00000000-0000-4000-8000-000000000025";
  const key = "00000000-0000-4000-8000-000000000026";
  db.supportRequest.findFirst.mockResolvedValue({ id, organizationId: "org-a", requesterId: "user-a", status: "WAITING_USER" });
  db.user.findMany.mockResolvedValue([{ id: "admin-a", locale: "en" }]);
  db.supportReply.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "reply-a", message: "Synthetic follow-up", visibility: "PUBLIC" });
  const input = { method: "POST" as const, url: `/api/v1/support/requests/${id}/replies`, headers: { authorization: "test", "idempotency-key": key }, payload: { message: "Synthetic follow-up" } };
  expect((await app.inject(input)).statusCode).toBe(201);
  expect((await app.inject(input)).statusCode).toBe(200);
  expect(db.notification.createMany).toHaveBeenCalledOnce();
  expect(db.supportReply.create).toHaveBeenCalledOnce();
}));

async function withApp(run: (app: ReturnType<typeof Fastify>) => Promise<void>) {
  const app = Fastify();
  app.setErrorHandler((error, _request, reply) => { const failure = error as Error & { statusCode?: number; code?: string }; return reply.status(failure.statusCode ?? 500).send({ error: { code: failure.code ?? "INTERNAL_ERROR", message: failure.message } }); });
  await registerSupportRoutes(app);
  try { await run(app); } finally { await app.close(); }
}

it("requires an authenticated organization user and creates only their scoped request", async () => withApp(async app => {
  expect((await app.inject({ method: "POST", url: "/api/v1/support/requests", payload: {} })).statusCode).toBe(401);
  const response = await app.inject({ method: "POST", url: "/api/v1/support/requests", headers: { authorization: "test", "idempotency-key": "00000000-0000-4000-8000-000000000003" }, payload: { category: "AI_QUOTA", subject: "More tokens", message: "Please review" } });
  expect(response.statusCode).toBe(201);
  expect(db.supportRequest.create.mock.calls[0]![0].data).toMatchObject({ organizationId: "org-a", requesterId: "user-a", category: "AI_QUOTA" });
  expect(db.auditLog.create).toHaveBeenCalledOnce();
}));

it("requires a valid idempotency key and validates bounded request text", async () => withApp(async app => {
  const headers = { authorization: "test" };
  expect((await app.inject({ method: "POST", url: "/api/v1/support/requests", headers, payload: { category: "AI_QUOTA", subject: "x", message: "y" } })).statusCode).toBe(400);
  expect(db.supportRequest.create).not.toHaveBeenCalled();
}));

it("deduplicates retries with the same requester, organization and key", async () => withApp(async app => {
  db.supportRequest.findUnique.mockResolvedValue({ id: "request-existing", organizationId: "org-a", requesterId: "user-a", category: "AI_QUOTA", subject: "More tokens", message: "Please review" });
  const response = await app.inject({ method: "POST", url: "/api/v1/support/requests", headers: { authorization: "test", "idempotency-key": "00000000-0000-4000-8000-000000000003" }, payload: { category: "AI_QUOTA", subject: "More tokens", message: "Please review" } });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.id).toBe("request-existing");
  expect(db.supportRequest.create).not.toHaveBeenCalled();
}));

it("scopes customer list/detail to the requester and current organization", async () => withApp(async app => {
  await app.inject({ url: "/api/v1/support/requests", headers: { authorization: "test" } });
  expect(db.supportRequest.findMany.mock.calls[0]![0].where).toEqual({ organizationId: "org-a", requesterId: "user-a" });
  db.supportRequest.findFirst.mockResolvedValueOnce(null);
  const response = await app.inject({ url: "/api/v1/support/requests/00000000-0000-4000-8000-000000000004", headers: { authorization: "test", "x-user-id": "user-b" } });
  expect(response.statusCode).toBe(404);
  db.supportRequest.findFirst.mockResolvedValueOnce({ id: "request-a", replies: [] });
  await app.inject({ url: "/api/v1/support/requests/00000000-0000-4000-8000-000000000004", headers: { authorization: "test" } });
  expect(db.supportRequest.findFirst.mock.calls.at(-1)![0].include.replies.where).toEqual({ visibility: "PUBLIC" });
}));

it("limits support operations to global administrators while allowing tickets from every organization", async () => withApp(async app => {
  const denied = await app.inject({ url: "/api/v1/admin/support-requests", headers: { authorization: "test", "x-test-role": "ORG_ADMIN" } });
  expect(denied.statusCode).toBe(403);
  const allowed = await app.inject({ url: "/api/v1/admin/support-requests", headers: { authorization: "test", "x-test-role": "SUPER_ADMIN" } });
  expect(allowed.statusCode).toBe(200);
  expect(db.supportRequest.findMany.mock.calls[0]![0].where).toEqual({});
  expect(db.auditLog.create.mock.calls[0]![0].data).toMatchObject({ action: "SUPPORT_QUEUE_READ", organizationId: "org-a" });
  db.supportRequest.findFirst.mockResolvedValueOnce({ id: "request-a", organizationId: "org-a", requesterId: "user-a", response: null, status: "OPEN", requester: { locale: "fa" } });
  const update = await app.inject({ method: "PATCH", url: "/api/v1/admin/support-requests/00000000-0000-4000-8000-000000000005", headers: { authorization: "test", "x-test-role": "SUPER_ADMIN" }, payload: { status: "IN_PROGRESS", response: "Review started" } });
  expect(update.statusCode).toBe(200);
  expect(db.auditLog.create).toHaveBeenCalled();
  expect((await app.inject({ url: "/api/v1/admin/support-requests", headers: { authorization: "test", "x-test-role": "SUPER_ADMIN", "x-org-id": "org-b" } })).statusCode).toBe(200);
  expect((await app.inject({ url: "/api/v1/admin/support-requests", headers: { authorization: "test", "x-test-role": "SUPER_ADMIN", "x-user-id": "user-b" } })).statusCode).toBe(200);
}));

it("does not require optional operator allowlists for a global administrator", async () => withApp(async app => {
  vi.stubEnv("SUPPORT_OPERATOR_USER_IDS", "");
  const response = await app.inject({ url: "/api/v1/admin/support-requests", headers: { authorization: "test", "x-test-role": "SUPER_ADMIN" } });
  expect(response.statusCode).toBe(200);
  expect(db.supportRequest.findMany).toHaveBeenCalledOnce();
  expect(db.supportRequest.findMany.mock.calls[0]![0].where).toEqual({});
}));

it("keeps protected system administrators in the same audited global support policy", async () => withApp(async app => {
  vi.stubEnv("SUPPORT_OPERATOR_USER_IDS", "");
  vi.stubEnv("SUPPORT_OPERATOR_ORGANIZATION_IDS", "");

  const response = await app.inject({ url: "/api/v1/admin/support-requests?page=1&limit=20", headers: { authorization: "test", "x-test-role": "SUPER_ADMIN", "x-org-id": "org-b" } });

  expect(response.statusCode).toBe(200);
  expect(db.supportRequest.findMany.mock.calls[0]![0].where).toEqual({});
  expect(db.auditLog.create.mock.calls[0]![0].data).toMatchObject({ action: "SUPPORT_QUEUE_READ", organizationId: "org-b" });
}));

it("offers every active global system administrator as assignable support staff", async () => withApp(async app => {
  const protectedAdminId = "00000000-0000-4000-8000-000000000018";
  vi.stubEnv("SUPPORT_OPERATOR_USER_IDS", "");
  vi.stubEnv("SUPPORT_OPERATOR_ORGANIZATION_IDS", "");
  db.user.findMany.mockResolvedValueOnce([{ id: protectedAdminId, displayName: "Protected System Admin", email: "support@example.test" }]);

  const staff = await app.inject({ url: "/api/v1/admin/support-staff", headers: { authorization: "test", "x-test-role": "SUPER_ADMIN" } });
  expect(staff.statusCode).toBe(200);
  expect(db.user.findMany.mock.calls[0]![0].where).toEqual({ active: true, globalRole: "SUPER_ADMIN" });

  db.user.findFirst.mockResolvedValueOnce({ id: protectedAdminId });
  db.supportRequest.findFirst.mockResolvedValueOnce({ id: "request-a", organizationId: "org-a", requesterId: "user-b", assignedToId: null, response: null, status: "OPEN", requester: { locale: "en" } });
  const assigned = await app.inject({ method: "PATCH", url: "/api/v1/admin/support-requests/00000000-0000-4000-8000-000000000005", headers: { authorization: "test", "x-test-role": "SUPER_ADMIN" }, payload: { assignedToId: protectedAdminId } });

  expect(assigned.statusCode).toBe(200);
  expect(db.supportRequest.update.mock.calls.at(-1)![0].data).toMatchObject({ assignedToId: protectedAdminId });
}));

it("reads global staff ticket details by ID and audits the target organization without content", async () => withApp(async app => {
  const requestId = "00000000-0000-4000-8000-000000000020";
  db.supportRequest.findFirst.mockResolvedValueOnce({ id: requestId, organizationId: "org-a", message: "Sensitive requester message", replies: [{ message: "Internal note" }] });
  const response = await app.inject({ url: `/api/v1/admin/support-requests/${requestId}`, headers: { authorization: "test", "x-test-role": "SUPER_ADMIN" } });
  expect(response.statusCode).toBe(200);
  expect(db.supportRequest.findFirst.mock.calls[0]![0].where).toEqual({ id: requestId });
  expect(db.auditLog.create.mock.calls[0]![0].data).toMatchObject({ action: "SUPPORT_TICKET_READ", entityId: requestId, organizationId: "org-a" });
  expect(db.auditLog.create.mock.calls[0]![0].data.metadata).not.toHaveProperty("message");
  expect(db.auditLog.create.mock.calls[0]![0].data.metadata).not.toHaveProperty("replies");
}));

it("returns assignable support staff only to authorized support operators", async () => withApp(async app => {
  const denied = await app.inject({ url: "/api/v1/admin/support-staff", headers: { authorization: "test", "x-test-role": "ORG_ADMIN" } });
  expect(denied.statusCode).toBe(403);
  db.user.findMany.mockResolvedValueOnce([{ id: "staff-a", displayName: "Support Admin", email: "support@example.test" }]);
  const allowed = await app.inject({ url: "/api/v1/admin/support-staff", headers: { authorization: "test", "x-test-role": "SUPER_ADMIN" } });
  expect(allowed.statusCode).toBe(200);
  expect(db.user.findMany.mock.calls[0]![0].where).toEqual({
    active: true,
    globalRole: "SUPER_ADMIN",
  });
}));

it("lets only the requester append a reply and reopens a closed request without logging the message", async () => withApp(async app => {
  db.supportRequest.findFirst.mockResolvedValueOnce({ id: "request-a", organizationId: "org-a", requesterId: "user-a", subject: "More tokens", status: "CLOSED" });
  const response = await app.inject({ method: "POST", url: "/api/v1/support/requests/00000000-0000-4000-8000-000000000006/replies", headers: { authorization: "test", "idempotency-key": "00000000-0000-4000-8000-000000000008" }, payload: { message: "The issue is still happening." } });
  expect(response.statusCode).toBe(201);
  expect(db.supportRequest.findFirst).toHaveBeenCalledWith({ where: { id: "00000000-0000-4000-8000-000000000006", organizationId: "org-a", requesterId: "user-a" } });
  expect(db.supportReply.create.mock.calls[0]![0].data).toMatchObject({ organizationId: "org-a", requestId: "request-a", authorId: "user-a", idempotencyKey: "00000000-0000-4000-8000-000000000008", message: "The issue is still happening." });
  expect(db.supportRequest.update.mock.calls[0]![0].data).toMatchObject({ status: "OPEN", resolvedAt: null });
  expect(db.auditLog.create.mock.calls[0]![0].data.metadata).not.toHaveProperty("message");
}));

it("allows only a super-admin to reply from the global inbox and notifies the requester", async () => withApp(async app => {
  const denied = await app.inject({ method: "POST", url: "/api/v1/admin/support-requests/00000000-0000-4000-8000-000000000006/replies", headers: { authorization: "test", "x-test-role": "ORG_ADMIN", "idempotency-key": "00000000-0000-4000-8000-000000000009" }, payload: { message: "We are reviewing this." } });
  expect(denied.statusCode).toBe(403);
  db.supportRequest.findFirst.mockResolvedValueOnce({ id: "request-a", organizationId: "org-a", requesterId: "user-a", subject: "More tokens", status: "OPEN", requester: { locale: "en" } });
  const allowed = await app.inject({ method: "POST", url: "/api/v1/admin/support-requests/00000000-0000-4000-8000-000000000006/replies", headers: { authorization: "test", "x-test-role": "SUPER_ADMIN", "idempotency-key": "00000000-0000-4000-8000-000000000009" }, payload: { message: "We are reviewing this." } });
  expect(allowed.statusCode).toBe(201);
  expect(db.notification.create.mock.calls[0]![0].data).toMatchObject({ organizationId: "org-a", userId: "user-a", link: "/support?ticket=request-a" });
  expect(db.notification.create.mock.calls[0]![0].data.message).not.toContain("We are reviewing this.");
}));

it("lets only authorized staff add private notes that are excluded from requester replies and notifications", async () => withApp(async app => {
  const requestId = "00000000-0000-4000-8000-000000000006";
  db.supportRequest.findFirst.mockResolvedValueOnce({ id: requestId, organizationId: "org-a", requesterId: "user-a", status: "OPEN" });
  db.supportReply.create.mockResolvedValueOnce({ id: "note-a", organizationId: "org-a", requestId, authorId: "admin-a", message: "Internal triage note", visibility: "INTERNAL" });
  const denied = await app.inject({ method: "POST", url: `/api/v1/admin/support-requests/${requestId}/internal-notes`, headers: { authorization: "test", "x-test-role": "ORG_ADMIN", "idempotency-key": "00000000-0000-4000-8000-000000000010" }, payload: { message: "Internal triage note" } });
  expect(denied.statusCode).toBe(403);
  const allowed = await app.inject({ method: "POST", url: `/api/v1/admin/support-requests/${requestId}/internal-notes`, headers: { authorization: "test", "x-test-role": "SUPER_ADMIN", "idempotency-key": "00000000-0000-4000-8000-000000000010" }, payload: { message: "Internal triage note" } });
  expect(allowed.statusCode).toBe(201);
  expect(db.supportReply.create.mock.calls[0]![0].data).toMatchObject({ requestId, visibility: "INTERNAL", message: "Internal triage note" });
  expect(db.notification.create).not.toHaveBeenCalled();
  expect(db.auditLog.create.mock.calls.at(-1)![0].data.metadata).not.toHaveProperty("message");
}));

it("supports bounded server-side global queue search, category and priority filters", async () => withApp(async app => {
  const response = await app.inject({ url: "/api/v1/admin/support-requests?page=2&limit=10&status=OPEN&category=AI_QUOTA&priority=URGENT&search=vision", headers: { authorization: "test", "x-test-role": "SUPER_ADMIN" } });
  expect(response.statusCode).toBe(200);
  expect(db.supportRequest.findMany.mock.calls[0]![0]).toMatchObject({
    skip: 10,
    take: 10,
    where: { status: "OPEN", category: "AI_QUOTA", priority: "URGENT", OR: [{ subject: { contains: "vision" } }, { message: { contains: "vision" } }, { requester: { displayName: { contains: "vision" } } }, { requester: { email: { contains: "vision" } } }] },
  });
  expect(db.auditLog.create.mock.calls[0]![0].data.metadata).not.toHaveProperty("search");
}));

it("stores only allowlisted RULA support context after checking the assessment is in the selected organization", async () => withApp(async app => {
  const assessmentId = "00000000-0000-4000-8000-000000000013";
  db.rulaAssessment.findFirst.mockResolvedValueOnce({ id: assessmentId });
  const response = await app.inject({ method: "POST", url: "/api/v1/support/requests", headers: { authorization: "test", "idempotency-key": "00000000-0000-4000-8000-000000000014" }, payload: { category: "TECHNICAL_SUPPORT", subject: "RULA image review", message: "Please review the analysis request.", relatedAssessmentType: "RULA", relatedAssessmentId: assessmentId, publicErrorCode: "RULA_IMAGE_AI_UNAVAILABLE" } });
  expect(response.statusCode).toBe(201);
  expect(db.rulaAssessment.findFirst).toHaveBeenCalledWith({ where: { id: assessmentId, organizationId: "org-a" }, select: { id: true } });
  expect(db.supportRequest.create.mock.calls[0]![0].data).toMatchObject({ relatedAssessmentType: "RULA", relatedAssessmentId: assessmentId, publicErrorCode: "RULA_IMAGE_AI_UNAVAILABLE" });
  expect((await app.inject({ method: "POST", url: "/api/v1/support/requests", headers: { authorization: "test", "idempotency-key": "00000000-0000-4000-8000-000000000015" }, payload: { category: "TECHNICAL_SUPPORT", subject: "RULA image review", message: "Please review the analysis request.", publicErrorCode: "provider-secret-token" } })).statusCode).toBe(400);
}));

it("allows the waiting-for-requester lifecycle state through an audited status update", async () => withApp(async app => {
  db.supportRequest.findFirst.mockResolvedValueOnce({ id: "request-a", organizationId: "org-a", requesterId: "user-a", response: null, status: "IN_PROGRESS", requester: { locale: "fa" } });
  const response = await app.inject({ method: "PATCH", url: "/api/v1/admin/support-requests/00000000-0000-4000-8000-000000000005", headers: { authorization: "test", "x-test-role": "SUPER_ADMIN" }, payload: { status: "WAITING_USER", priority: "HIGH" } });
  expect(response.statusCode).toBe(200);
  expect(db.supportRequest.update.mock.calls.at(-1)![0].data).toMatchObject({ status: "WAITING_USER", priority: "HIGH" });
}));

it("returns a waiting ticket to active work when the requester replies", async () => withApp(async app => {
  db.supportRequest.findFirst.mockResolvedValueOnce({ id: "request-a", organizationId: "org-a", requesterId: "user-a", subject: "More tokens", status: "WAITING_USER" });
  const response = await app.inject({ method: "POST", url: "/api/v1/support/requests/00000000-0000-4000-8000-000000000006/replies", headers: { authorization: "test", "idempotency-key": "00000000-0000-4000-8000-000000000016" }, payload: { message: "Here is the requested detail." } });
  expect(response.statusCode).toBe(201);
  expect(db.supportRequest.update.mock.calls[0]![0].data).toMatchObject({ status: "IN_PROGRESS", resolvedAt: null });
}));

it("assigns tickets only to active support operators", async () => withApp(async app => {
  const requestId = "00000000-0000-4000-8000-000000000017";
  const assigneeId = "00000000-0000-4000-8000-000000000018";
  db.supportRequest.findFirst.mockResolvedValueOnce({ id: requestId, organizationId: "org-a", requesterId: "user-a", assignedToId: "old-operator", response: null, status: "OPEN", requester: { locale: "fa" } });
  db.supportRequest.update.mockResolvedValueOnce({ id: requestId, assignedToId: assigneeId, status: "OPEN", priority: "NORMAL" });
  db.user.findFirst.mockResolvedValueOnce({ id: assigneeId });
  const response = await app.inject({ method: "PATCH", url: `/api/v1/admin/support-requests/${requestId}`, headers: { authorization: "test", "x-test-role": "SUPER_ADMIN" }, payload: { assignedToId: assigneeId } });
  expect(response.statusCode).toBe(200);
  expect(db.user.findFirst).toHaveBeenCalledWith({ where: { active: true, globalRole: "SUPER_ADMIN", id: assigneeId }, select: { id: true } });
  expect(db.supportRequest.update.mock.calls.at(-1)![0].data).toMatchObject({ assignedToId: assigneeId });
  expect(db.auditLog.create.mock.calls.at(-1)![0].data.metadata).toMatchObject({ assigneeChange: { from: "old-operator", to: assigneeId } });
}));

it("rejects a stale staff update when its ticket timestamp has changed", async () => withApp(async app => {
  const requestId = "00000000-0000-4000-8000-000000000019";
  const expectedUpdatedAt = "2026-10-15T08:00:00.000Z";
  db.supportRequest.findFirst.mockResolvedValueOnce({ id: requestId, organizationId: "org-a", requesterId: "user-a", response: null, status: "OPEN", updatedAt: new Date(expectedUpdatedAt), requester: { locale: "fa" } });
  db.supportRequest.update.mockRejectedValueOnce({ code: "P2025" });
  const response = await app.inject({ method: "PATCH", url: `/api/v1/admin/support-requests/${requestId}`, headers: { authorization: "test", "x-test-role": "SUPER_ADMIN" }, payload: { priority: "HIGH", expectedUpdatedAt } });
  expect(response.statusCode).toBe(409);
  expect(response.json().error.code).toBe("SUPPORT_TICKET_CONFLICT");
  expect(db.supportRequest.update.mock.calls.at(-1)![0].where).toEqual({ id: requestId, updatedAt: new Date(expectedUpdatedAt) });
}));

it("rejects blank replies without creating message or status changes", async () => withApp(async app => {
  const response = await app.inject({ method: "POST", url: "/api/v1/support/requests/00000000-0000-4000-8000-000000000006/replies", headers: { authorization: "test", "idempotency-key": "00000000-0000-4000-8000-000000000008" }, payload: { message: "   " } });
  expect(response.statusCode).toBe(400);
  expect(db.supportReply.create).not.toHaveBeenCalled();
}));
