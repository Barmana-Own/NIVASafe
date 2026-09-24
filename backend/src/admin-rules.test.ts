import type { FastifyRequest } from "fastify";
import { describe, expect, it } from "vitest";
import { isForbiddenSelfChange, removesLastSuperAdmin, requireAIUsageAdmin, requireSuperAdmin } from "./modules/admin.js";
import { canChangeGlobalRole } from "./modules/users.js";

describe("global administration safeguards", () => {
  it("allows only global administrators into the administrative boundary", () => {
    expect(() => requireSuperAdmin({ actor: { userId: "user", role: "ORG_ADMIN", globalRole: "USER" } } as FastifyRequest)).toThrow();
    expect(() => requireSuperAdmin({ actor: { userId: "admin", role: "SUPER_ADMIN", globalRole: "SUPER_ADMIN" } } as FastifyRequest)).not.toThrow();
  });

  it("limits AI usage visibility to global or organization administrators", () => {
    expect(() => requireAIUsageAdmin({ actor: { userId: "user", role: "ASSESSOR", globalRole: "USER" } } as FastifyRequest)).toThrow();
    expect(() => requireAIUsageAdmin({ actor: { userId: "org-admin", organizationId: "org", role: "ORG_ADMIN", globalRole: "USER" } } as FastifyRequest)).not.toThrow();
    expect(() => requireAIUsageAdmin({ actor: { userId: "admin", role: "SUPER_ADMIN", globalRole: "SUPER_ADMIN" } } as FastifyRequest)).not.toThrow();
  });

  it("prevents a global administrator from disabling or demoting itself", () => {
    expect(isForbiddenSelfChange("admin", "admin", "SUPER_ADMIN", "USER", true)).toBe(true);
    expect(isForbiddenSelfChange("admin", "admin", "SUPER_ADMIN", "SUPER_ADMIN", false)).toBe(true);
    expect(isForbiddenSelfChange("admin", "other", "SUPER_ADMIN", "USER", true)).toBe(false);
  });

  it("protects the last active global administrator", () => {
    expect(removesLastSuperAdmin({ targetGlobalRole: "SUPER_ADMIN", targetActive: true, nextGlobalRole: "USER", nextActive: true, activeSuperAdminCount: 1 })).toBe(true);
    expect(removesLastSuperAdmin({ targetGlobalRole: "SUPER_ADMIN", targetActive: true, nextGlobalRole: "SUPER_ADMIN", nextActive: false, activeSuperAdminCount: 1 })).toBe(true);
    expect(removesLastSuperAdmin({ targetGlobalRole: "SUPER_ADMIN", targetActive: true, nextGlobalRole: "USER", nextActive: true, activeSuperAdminCount: 2 })).toBe(false);
  });

  it("does not let an organization administrator change a global account level", () => {
    expect(canChangeGlobalRole("ORG_ADMIN", "USER")).toBe(false);
    expect(canChangeGlobalRole("ORG_ADMIN", "SUPER_ADMIN")).toBe(false);
    expect(canChangeGlobalRole("ORG_ADMIN", undefined)).toBe(true);
    expect(canChangeGlobalRole("SUPER_ADMIN", "USER")).toBe(true);
  });
});
