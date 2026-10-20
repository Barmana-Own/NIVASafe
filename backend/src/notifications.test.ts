import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const db = vi.hoisted(() => ({
  notification: { findMany: vi.fn(), count: vi.fn(), createMany: vi.fn(), updateMany: vi.fn() },
  notificationPreference: { findUnique: vi.fn(), upsert: vi.fn() },
  fmeaItem: { findMany: vi.fn() }, rulaAssessment: { findMany: vi.fn() }, correctiveAction: { findMany: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("./core.js", () => ({ prisma: db, envelope: (data: unknown) => ({ data }), requireOrg: (request: { actor: { organizationId: string } }) => request.actor.organizationId, parse: (schema: z.ZodType, data: unknown) => { const result = schema.safeParse(data); if (!result.success) throw Object.assign(new Error("Invalid input"), { statusCode: 400 }); return result.data; } }));
vi.mock("./auth-guard.js", () => ({ authenticate: async (request: { headers: Record<string, string>; actor: unknown }) => { if (!request.headers.authorization) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 }); request.actor = { organizationId: "organization-a", userId: "user-a", globalRole: request.headers["x-test-global-role"] ?? "USER" }; } }));
import { notificationEventId, refreshOperationalNotifications, reviewedRulaAlert } from "./notification-feed.js";
import { registerNotificationRoutes } from "./modules/notifications.js";

beforeEach(() => {
  vi.resetAllMocks();
  db.notificationPreference.findUnique.mockResolvedValue(null);
  db.fmeaItem.findMany.mockResolvedValue([]); db.rulaAssessment.findMany.mockResolvedValue([]); db.correctiveAction.findMany.mockResolvedValue([]);
  db.notification.findMany.mockResolvedValue([]); db.notification.count.mockResolvedValue(0);
  db.$transaction.mockImplementation((queries: Promise<unknown>[]) => Promise.all(queries));
});

describe("operational notifications", () => {
  it("uses stable UUIDs scoped to user, organization and event", () => {
    const id = notificationEventId("org-a", "user-a", "risk-1");
    expect(z.string().uuid().safeParse(id).success).toBe(true);
    expect(notificationEventId("org-a", "user-a", "risk-1")).toBe(id);
    expect(notificationEventId("org-b", "user-a", "risk-1")).not.toBe(id);
    expect(notificationEventId("org-a", "user-b", "risk-1")).not.toBe(id);
  });
  it("does not invent risk alerts from missing, default or one-sided BOTH observations", () => {
    expect(reviewedRulaAlert("RIGHT", null)).toBe(false);
    expect(reviewedRulaAlert("BOTH", {})).toBe(false);
    const analysis = Object.fromEntries(["upperArm", "lowerArm", "wrist", "wristTwist", "neck", "trunk", "legs"].map(key => [key, { angle: null, score: 1, detected: true, source: "USER", confirmedByUser: true }]));
    expect(reviewedRulaAlert("RIGHT", analysis)).toBe(true);
    expect(reviewedRulaAlert("BOTH", { ...analysis, sideAnalyses: { RIGHT: analysis } })).toBe(false);
    expect(reviewedRulaAlert("RIGHT", { ...analysis, neck: { ...analysis.neck, source: "DEFAULT", confirmedByUser: false } })).toBe(false);
  });
  it("respects disabled preferences without querying or creating operational alerts", async () => {
    db.notificationPreference.findUnique.mockResolvedValue({ riskAlerts: false, dueReminders: false });
    await refreshOperationalNotifications("org-a", "user-a");
    expect(db.fmeaItem.findMany).not.toHaveBeenCalled(); expect(db.correctiveAction.findMany).not.toHaveBeenCalled(); expect(db.notification.createMany).not.toHaveBeenCalled();
  });
  it("creates real scoped alerts idempotently, excluding unreviewed RULA", async () => {
    db.fmeaItem.findMany.mockResolvedValue([{ id: "item-a", failureMode: "Failure", rpn: 500, assessment: { id: "assessment-a", title: "Packing", version: 2 } }]);
    db.rulaAssessment.findMany.mockResolvedValue([{ id: "rula-a", title: "Posture", version: 1, score: 7, bodySide: "RIGHT", postureAnalysis: null }]);
    db.correctiveAction.findMany.mockResolvedValue([{ id: "action-a", title: "Adjust chair", dueDate: new Date("2026-10-06T00:00:00Z") }]);
    await refreshOperationalNotifications("org-a", "user-a", new Date("2026-10-07T00:00:00Z"));
    const first = db.notification.createMany.mock.calls[0]![0];
    expect(first.skipDuplicates).toBe(true); expect(first.data).toHaveLength(2);
    expect(first.data[0]).toMatchObject({ organizationId: "org-a", userId: "user-a", link: "/fmea/assessment-a/report" });
    expect(first.data[0].message).toContain("500"); expect(first.data[1].title).toContain("گذشته");
    expect(db.correctiveAction.findMany.mock.calls[0]![0].where).toMatchObject({ organizationId: "org-a", status: { notIn: ["COMPLETED", "CANCELLED", "REJECTED"] } });
    expect(db.fmeaItem.findMany.mock.calls[0]![0].where.assessment.organizationId).toBe("org-a");
    await refreshOperationalNotifications("org-a", "user-a", new Date("2026-10-07T00:00:00Z"));
    expect(db.notification.createMany.mock.calls[1]![0]).toEqual(first);
  });
});

describe("notification HTTP boundary", () => {
  it("shows a global administrator only their own notifications across organizations", async () => {
    const app = Fastify(); await app.register(registerNotificationRoutes);
    const headers = { authorization: "test", "x-test-global-role": "SUPER_ADMIN" };
    try {
      expect((await app.inject({ url: "/api/v1/notifications/summary", headers })).statusCode).toBe(200);
      expect(db.notification.findMany.mock.calls[0]![0].where).toEqual({ userId: "user-a" });
      await app.inject({ url: "/api/v1/notifications", headers });
      expect(db.notification.findMany.mock.calls[1]![0].where).toEqual({ userId: "user-a" });
      db.notification.updateMany.mockResolvedValue({ count: 1 });
      await app.inject({ method: "PATCH", url: "/api/v1/notifications/00000000-0000-4000-8000-000000000001/read", headers });
      expect(db.notification.updateMany.mock.calls[0]![0].where).toEqual({ id: "00000000-0000-4000-8000-000000000001", userId: "user-a" });
      await app.inject({ method: "POST", url: "/api/v1/notifications/read-all", headers });
      expect(db.notification.updateMany.mock.calls[1]![0].where).toEqual({ userId: "user-a", readAt: null });
    } finally { await app.close(); }
  });
  it("counts all unread messages, not just the latest eight, scoped to the authenticated tenant/user", async () => {
    db.notification.count.mockResolvedValueOnce(143).mockResolvedValueOnce(220);
    db.notification.findMany.mockResolvedValue([{ id: "recent", title: "Actual message" }]);
    const app = Fastify(); await app.register(registerNotificationRoutes);
    try {
      const response = await app.inject({ url: "/api/v1/notifications/summary", headers: { authorization: "test", "x-organization-id": "attacker-org" } });
      expect(response.statusCode).toBe(200); expect(response.json().data).toMatchObject({ unreadCount: 143, total: 220, items: [{ id: "recent" }] });
      expect(db.notification.count.mock.calls[0]![0].where).toEqual({ organizationId: "organization-a", userId: "user-a", readAt: null });
      expect(db.notification.findMany.mock.calls[0]![0].take).toBe(8);
    } finally { await app.close(); }
  });
  it("rejects unauthenticated and unbounded summary requests before reading data", async () => {
    const app = Fastify(); await app.register(registerNotificationRoutes);
    try {
      expect((await app.inject({ url: "/api/v1/notifications/summary" })).statusCode).toBe(401);
      for (const limit of ["0", "101", "NaN", "2.5"]) expect((await app.inject({ url: `/api/v1/notifications/summary?limit=${limit}`, headers: { authorization: "test" } })).statusCode).toBe(400);
      expect(db.notification.findMany).not.toHaveBeenCalled();
    } finally { await app.close(); }
  });
  it("cannot mark another user's notification and scopes read-all", async () => {
    db.notification.updateMany.mockResolvedValue({ count: 0 });
    const app = Fastify(); await app.register(registerNotificationRoutes);
    try {
      const response = await app.inject({ method: "PATCH", url: "/api/v1/notifications/00000000-0000-4000-8000-000000000001/read", headers: { authorization: "test" } });
      expect(response.statusCode).toBe(404);
      expect(db.notification.updateMany.mock.calls[0]![0].where).toMatchObject({ organizationId: "organization-a", userId: "user-a" });
      await app.inject({ method: "POST", url: "/api/v1/notifications/read-all", headers: { authorization: "test" } });
      expect(db.notification.updateMany.mock.calls[1]![0].where).toEqual({ organizationId: "organization-a", userId: "user-a", readAt: null });
    } finally { await app.close(); }
  });
});
