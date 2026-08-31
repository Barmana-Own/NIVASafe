import type { FastifyRequest } from "fastify";
import { PrismaClient, type Role } from "@prisma/client";
import { createHash } from "node:crypto";
import { z } from "zod";

export const prisma = new PrismaClient();

export const parse = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw Object.assign(new Error(result.error.issues.map((issue) => issue.message).join(", ")), {
      statusCode: 400,
      code: "VALIDATION_ERROR",
    });
  }
  return result.data;
};

export const envelope = <T>(data: T, meta?: object) => ({ data, ...(meta ? { meta } : {}) });
export const tokenHash = (value: string) => createHash("sha256").update(value).digest("hex");

export const pageParams = (query: unknown) =>
  parse(
    z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      search: z.string().trim().optional(),
    }),
    query,
  );

export function requireOrg(request: FastifyRequest): string {
  if (!request.actor?.organizationId) {
    throw Object.assign(new Error("x-organization-id is required"), {
      statusCode: 400,
      code: "ORGANIZATION_REQUIRED",
    });
  }
  return request.actor.organizationId;
}

export function requireRole(request: FastifyRequest, roles: Role[]): void {
  if (!request.actor?.role || !roles.includes(request.actor.role as Role)) {
    throw Object.assign(new Error("Permission denied"), { statusCode: 403, code: "FORBIDDEN" });
  }
}

export async function audit(
  request: FastifyRequest,
  action: string,
  entityType?: string,
  entityId?: string,
  metadata?: object,
) {
  await prisma.auditLog.create({
    data: {
      userId: request.actor?.userId,
      organizationId: request.actor?.organizationId,
      action,
      entityType,
      entityId,
      metadata,
      requestId: request.id,
    },
  });
}

export const safeUser = (user: {
  id: string;
  email: string;
  displayName: string;
  locale: string;
  phone: string | null;
  jobTitle: string | null;
  active: boolean;
  globalRole?: string;
}) => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
  locale: user.locale,
  phone: user.phone,
  jobTitle: user.jobTitle,
  active: user.active,
  ...(user.globalRole ? { globalRole: user.globalRole } : {}),
});

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  SUPER_ADMIN: ["*"],
  ORG_ADMIN: ["users.read", "users.manage", "organizations.manage", "projects.read", "projects.manage", "assessments.create", "assessments.update", "assessments.delete", "assessments.approve", "reports.generate", "knowledge.manage", "ai.configure", "audit.read"],
  HSE_MANAGER: ["users.read", "projects.read", "projects.manage", "assessments.create", "assessments.update", "assessments.approve", "reports.generate", "knowledge.manage", "audit.read"],
  ASSESSOR: ["projects.read", "assessments.create", "assessments.update", "reports.generate"],
  VIEWER: ["projects.read"],
};

export function requirePermission(request: FastifyRequest, permission: string): void {
  const role = request.actor?.role as Role | undefined;
  if (!role) throw Object.assign(new Error("Permission denied"), { statusCode: 403, code: "FORBIDDEN" });
  const allowed = ROLE_PERMISSIONS[role] ?? [];
  if (!allowed.includes("*") && !allowed.includes(permission)) {
    throw Object.assign(new Error("Permission denied"), { statusCode: 403, code: "FORBIDDEN" });
  }
}
