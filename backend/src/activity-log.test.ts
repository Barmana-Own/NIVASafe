import { describe, expect, it } from "vitest";
import { buildActivityLogWhere, getActivityLogScope } from "./modules/audit.js";

describe("activity log visibility", () => {
  it("limits ordinary users to their own selected-organization activity", () => {
    const actor = { userId: "user-1", organizationId: "org-1", role: "HSE_SPECIALIST" };

    expect(getActivityLogScope(actor, false)).toBe("self");
    expect(buildActivityLogWhere({ actor, canViewOrganization: false })).toEqual({ OR: [{ organizationId: "org-1", userId: "user-1" }, { organizationId: null, userId: "user-1" }] });
  });

  it("lets organization activity readers see tenant events and account events for active members", () => {
    const actor = { userId: "manager-1", organizationId: "org-1", role: "HSE_MANAGER" };
    const where = buildActivityLogWhere({ actor, canViewOrganization: true });

    expect(getActivityLogScope(actor, true)).toBe("organization");
    expect(where.OR).toHaveLength(2);
    expect(where.OR?.[0]).toEqual({ organizationId: "org-1" });
    expect(where.OR?.[1]).toMatchObject({ organizationId: null });
  });

  it("keeps a global super administrator's unscoped view available", () => {
    const actor = { userId: "admin-1", role: "SUPER_ADMIN" };
    const where = buildActivityLogWhere({ actor, canViewOrganization: true, search: "LOGIN" });

    expect(getActivityLogScope(actor, true)).toBe("global");
    expect(where).toMatchObject({ AND: [{}, { OR: expect.any(Array) }] });
  });
});
