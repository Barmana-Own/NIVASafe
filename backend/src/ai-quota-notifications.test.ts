import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  notification: { createMany: vi.fn() },
  organizationMember: { findMany: vi.fn() },
}));
vi.mock("./core.js", () => ({ prisma: db }));
import { aiQuotaNotification, refreshAIQuotaNotifications, refreshAIQuotaNotificationsForUser } from "./notification-feed.js";

beforeEach(() => {
  vi.resetAllMocks();
  db.user.findUnique.mockResolvedValue({ active: true, aiEnabled: true, aiTokenLimit: 1_000_000, aiTokensUsed: 900_000, aiQuotaCycle: 0, locale: "fa" });
  db.notification.createMany.mockResolvedValue({ count: 1 });
  db.organizationMember.findMany.mockResolvedValue([{ organizationId: "org-a" }, { organizationId: "org-b" }]);
});

describe("AI quota notification lifecycle", () => {
  it("creates only LOW/EXHAUSTED notifications with internal support routing", async () => {
    const event = aiQuotaNotification("org-a", "user-a", { tokenLimit: 1_000_000, tokensUsed: 900_000, remainingTokens: 100_000, warningThreshold: 100_000, state: "LOW", serverTimestamp: "2026-10-15T00:00:00.000Z" }, 2);
    expect(event).toMatchObject({ organizationId: "org-a", userId: "user-a", link: "/support" });
    expect(aiQuotaNotification("org-a", "user-a", { ...event!, id: "", state: "HEALTHY" } as never, 2)).toBeNull();
    await refreshAIQuotaNotifications("org-a", "user-a");
    expect(db.notification.createMany.mock.calls[0]![0].skipDuplicates).toBe(true);
    expect(db.notification.createMany.mock.calls[0]![0].data[0].title).toContain("سهمیه");
  });

  it("deduplicates within a cycle, re-arms after an authorized new cycle, and never rewrites read state", async () => {
    await refreshAIQuotaNotifications("org-a", "user-a");
    const firstId = db.notification.createMany.mock.calls[0]![0].data[0].id;
    await refreshAIQuotaNotifications("org-a", "user-a");
    const secondId = db.notification.createMany.mock.calls[1]![0].data[0].id;
    expect(secondId).toBe(firstId);
    expect(db.notification.createMany.mock.calls.every(([args]) => args.skipDuplicates === true)).toBe(true);
    expect(db.notification).not.toHaveProperty("updateMany");
    db.user.findUnique.mockResolvedValueOnce({ active: true, aiEnabled: true, aiTokenLimit: 1_000_000, aiTokensUsed: 900_000, aiQuotaCycle: 1, locale: "fa" });
    await refreshAIQuotaNotifications("org-a", "user-a");
    expect(db.notification.createMany.mock.calls[2]![0].data[0].id).not.toBe(firstId);
  });

  it("does not label disabled AI as exhausted and scopes refresh fan-out to active organizations", async () => {
    db.user.findUnique.mockResolvedValue({ active: true, aiEnabled: false, aiTokenLimit: 100, aiTokensUsed: 100, aiQuotaCycle: 0, locale: "en" });
    const status = await refreshAIQuotaNotifications("org-a", "user-a");
    expect(status?.state).toBe("DISABLED");
    expect(db.notification.createMany).not.toHaveBeenCalled();
    await refreshAIQuotaNotificationsForUser("user-a");
    expect(db.organizationMember.findMany).toHaveBeenCalledWith({ where: { userId: "user-a", active: true }, select: { organizationId: true } });
  });
});
