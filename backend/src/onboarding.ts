import type { PrismaClient } from "@prisma/client";

export type RegistrationKind = "personal" | "organization";
export type RegistrationLocale = "fa" | "en";

export type RegistrationWorkspaceInput = {
  displayName: string;
  registrationKind: RegistrationKind;
  locale: RegistrationLocale;
  companyName?: string | null;
  activityArea?: string | null;
  industry?: string | null;
  employeeCount?: number | null;
  nationalId?: string | null;
};

export type RegistrationWorkspace = {
  nameFa: string;
  nameEn: string;
  nationalId: string | null;
  industry: string | null;
  employeeCount: number | null;
  defaultLocale: RegistrationLocale;
};

export const DEFAULT_PROJECT_CODE = "DEFAULT";

export function defaultProjectForLocale(locale: RegistrationLocale) {
  return locale === "en"
    ? {
        name: "NIVASafe Demo Project",
        code: DEFAULT_PROJECT_CODE,
        status: "ACTIVE",
        description: "A ready-to-use project for exploring FMEA, RULA, and corrective actions.",
      }
    : {
        name: "پروژه آزمایشی NIVASafe",
        code: DEFAULT_PROJECT_CODE,
        status: "ACTIVE",
        description: "پروژه آماده برای بررسی FMEA، RULA و اقدامات اصلاحی.",
      };
}

type ProjectProvisioningClient = Pick<PrismaClient, "project">;

export async function ensureDefaultProject(
  client: ProjectProvisioningClient,
  organizationId: string,
  locale: RegistrationLocale,
) {
  return client.project.upsert({
    where: { organizationId_code: { organizationId, code: DEFAULT_PROJECT_CODE } },
    // The starter project is part of every workspace contract. Restore it if
    // an older build soft-deleted it, while preserving any user-edited content.
    update: { deletedAt: null, status: "ACTIVE" },
    create: { organizationId, ...defaultProjectForLocale(locale) },
  });
}

export function workspaceForRegistration(input: RegistrationWorkspaceInput): RegistrationWorkspace {
  const isOrganization = input.registrationKind === "organization";
  const companyName = input.companyName?.trim() || input.displayName;

  return {
    nameFa: isOrganization ? companyName : `فضای شخصی ${input.displayName}`,
    nameEn: isOrganization ? companyName : `Personal workspace - ${input.displayName}`,
    nationalId: isOrganization ? input.nationalId?.trim() || null : null,
    industry: isOrganization ? input.industry?.trim() || null : input.activityArea?.trim() || null,
    employeeCount: isOrganization ? input.employeeCount ?? null : null,
    defaultLocale: input.locale,
  };
}
