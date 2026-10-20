import Fastify from "fastify";
import jwt from "@fastify/jwt";
import { beforeEach, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  user: { findFirst: vi.fn(), findMany: vi.fn() },
  organizationMember: { findFirst: vi.fn() },
  organization: { findUnique: vi.fn() },
  supportRequest: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn() },
  supportReply: { findUnique: vi.fn(), create: vi.fn() },
  notification: { create: vi.fn(), createMany: vi.fn() },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("./core.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./core.js")>();
  return { ...actual, prisma: db };
});

import { authenticate } from "./auth-guard.js";
import { registerSupportRoutes } from "./modules/support.js";

const ticketId = "00000000-0000-4000-8000-000000000006";

beforeEach(() => {
  vi.resetAllMocks();
  db.user.findFirst.mockResolvedValue({ id: "user-a", globalRole: "USER" });
  db.user.findMany.mockResolvedValue([]);
  db.organizationMember.findFirst.mockResolvedValue({ role: "ASSESSOR", user: { globalRole: "USER" } });
  db.organization.findUnique.mockResolvedValue({ active: true, subscriptionStatus: "EXPIRED", subscriptionExpiresAt: new Date("2025-01-01T00:00:00Z") });
  db.supportRequest.findUnique.mockResolvedValue(null);
  db.supportRequest.findFirst.mockResolvedValue({ id: ticketId, organizationId: "org-a", requesterId: "user-a", status: "OPEN" });
  db.supportRequest.findMany.mockResolvedValue([]);
  db.supportRequest.count.mockResolvedValue(0);
  db.supportRequest.create.mockResolvedValue({ id: ticketId, organizationId: "org-a", requesterId: "user-a", status: "OPEN" });
  db.supportRequest.update.mockResolvedValue({ id: ticketId, status: "OPEN" });
  db.supportReply.findUnique.mockResolvedValue(null);
  db.supportReply.create.mockResolvedValue({ id: "reply-a", requestId: ticketId, message: "I still need help." });
  db.notification.create.mockResolvedValue({ id: "notification-a" });
  db.auditLog.create.mockResolvedValue({ id: "audit-a" });
  db.$transaction.mockImplementation((callback: (tx: unknown) => Promise<unknown>) => callback({
    user: db.user,
    supportRequest: db.supportRequest,
    supportReply: db.supportReply,
    notification: db.notification,
    auditLog: db.auditLog,
  }));
});

it("lets an authenticated member contact support with an expired subscription", async () => {
  const app = Fastify();
  await app.register(jwt, { secret: "task-07-support-expired-subscription-test" });
  app.setErrorHandler((error, _request, reply) => {
    const failure = error as Error & { statusCode?: number; code?: string };
    return reply.status(failure.statusCode ?? 500).send({ error: { code: failure.code ?? "INTERNAL_ERROR", message: failure.message } });
  });
  await app.register(registerSupportRoutes);
  try {
    const token = app.jwt.sign({ sub: "user-a" });
    const headers = { authorization: `Bearer ${token}`, "x-organization-id": "org-a" };
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/support/requests",
      headers: { ...headers, "idempotency-key": "00000000-0000-4000-8000-000000000007" },
      payload: { category: "PROFESSIONAL_PLAN", subject: "Subscription review", message: "Please help restore my subscription." },
    });
    expect(created.statusCode).toBe(201);
    expect(db.supportRequest.create).toHaveBeenCalledOnce();

    const listed = await app.inject({ method: "GET", url: "/api/v1/support/requests", headers });
    expect(listed.statusCode).toBe(200);

    const detail = await app.inject({ method: "GET", url: `/api/v1/support/requests/${ticketId}`, headers });
    expect(detail.statusCode).toBe(200);
    expect(db.supportRequest.findFirst).toHaveBeenCalledWith({ where: { id: ticketId, organizationId: "org-a", requesterId: "user-a" }, include: expect.any(Object) });

    const replied = await app.inject({
      method: "POST",
      url: `/api/v1/support/requests/${ticketId}/replies`,
      headers: { ...headers, "idempotency-key": "00000000-0000-4000-8000-000000000008" },
      payload: { message: "I still need help." },
    });
    expect(replied.statusCode).toBe(201);
    expect(db.supportReply.create).toHaveBeenCalledOnce();
  } finally {
    await app.close();
  }
});
