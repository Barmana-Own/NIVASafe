import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_PROJECT_CODE, defaultProjectForLocale, ensureDefaultProject, workspaceForRegistration } from "./onboarding.js";

describe("new-user onboarding", () => {
  it("provides a localized default project for every new workspace", () => {
    expect(defaultProjectForLocale("fa")).toEqual({
      name: "پروژه آزمایشی NIVASafe",
      code: DEFAULT_PROJECT_CODE,
      status: "ACTIVE",
      description: "پروژه آماده برای بررسی FMEA، RULA و اقدامات اصلاحی.",
    });
    expect(defaultProjectForLocale("en")).toEqual({
      name: "NIVASafe Demo Project",
      code: DEFAULT_PROJECT_CODE,
      status: "ACTIVE",
      description: "A ready-to-use project for exploring FMEA, RULA, and corrective actions.",
    });
  });

  it("backfills one localized starter project for an existing workspace", async () => {
    const upsert = vi.fn().mockResolvedValue({ id: "starter-project" });
    const client = { project: { upsert } } as unknown as Pick<PrismaClient, "project">;

    await ensureDefaultProject(client, "organization-id", "en");

    expect(upsert).toHaveBeenCalledWith({
      where: { organizationId_code: { organizationId: "organization-id", code: DEFAULT_PROJECT_CODE } },
      update: { deletedAt: null, status: "ACTIVE" },
      create: {
        organizationId: "organization-id",
        name: "NIVASafe Demo Project",
        code: DEFAULT_PROJECT_CODE,
        status: "ACTIVE",
        description: "A ready-to-use project for exploring FMEA, RULA, and corrective actions.",
      },
    });
  });

  it("restores a soft-deleted starter project instead of leaving the workspace empty", async () => {
    const upsert = vi.fn().mockResolvedValue({ id: "restored-project", deletedAt: null, status: "ACTIVE" });
    const client = { project: { upsert } } as unknown as Pick<PrismaClient, "project">;

    await ensureDefaultProject(client, "organization-id", "fa");

    expect(upsert.mock.calls[0]?.[0].update).toEqual({ deletedAt: null, status: "ACTIVE" });
  });

  it("maps personal and organization registration details to an isolated workspace", () => {
    expect(workspaceForRegistration({ displayName: "کاربر آزمایشی", registrationKind: "personal", locale: "fa", activityArea: "ایمنی" })).toEqual({
      nameFa: "فضای شخصی کاربر آزمایشی",
      nameEn: "Personal workspace - کاربر آزمایشی",
      nationalId: null,
      industry: "ایمنی",
      employeeCount: null,
      defaultLocale: "fa",
    });
    expect(workspaceForRegistration({ displayName: "Jane Doe", registrationKind: "organization", locale: "en", companyName: "Safe Co", industry: "Manufacturing", employeeCount: 12, nationalId: "ORG-12" })).toEqual({
      nameFa: "Safe Co",
      nameEn: "Safe Co",
      nationalId: "ORG-12",
      industry: "Manufacturing",
      employeeCount: 12,
      defaultLocale: "en",
    });
  });
});
