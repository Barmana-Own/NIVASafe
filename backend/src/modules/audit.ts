import type { FastifyInstance, FastifyRequest } from "fastify";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { authenticate } from "../auth-guard.js";
import { envelope, hasPermission, pageParams, parse, prisma } from "../core.js";

export type ActivityLogActor = {
  userId: string;
  organizationId?: string;
  role?: string;
};

export type ActivityLogScope = "self" | "organization" | "global";
export type ActivityCategory = "AUTH" | "ASSESSMENT" | "AI" | "OTHER";

type ActivityLogFilters = {
  actor: ActivityLogActor | undefined;
  canViewOrganization: boolean;
  search?: string;
  action?: string;
  entityType?: string;
};

type ActivityLogDbRow = Prisma.AuditLogGetPayload<{
  include: { user: { select: { id: true; displayName: true; email: true } } };
}>;

type AssessmentReference = {
  type: "FMEA" | "RULA";
  id: string;
  title: string;
  code: string | null;
};

type TokenUsageReference = {
  sourceType: string;
  sourceId: string;
};

type ScopedTokenUsageReference = TokenUsageReference & {
  organizationId: string;
};

export type ActivityLogEntry = ActivityLogDbRow & {
  category: ActivityCategory;
  assessment: AssessmentReference | null;
  tokenUsage: {
    useCase: string;
    provider: string;
    model: string | null;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    sourceType: string;
    createdAt: Date;
  } | null;
};

export function getActivityLogScope(actor: ActivityLogActor | undefined, canViewOrganization: boolean): ActivityLogScope {
  if (!actor) return "self";
  if (canViewOrganization && actor.role === "SUPER_ADMIN" && !actor.organizationId) return "global";
  if (canViewOrganization && actor.organizationId) return "organization";
  return "self";
}

export function buildActivityLogWhere({ actor, canViewOrganization, search, action, entityType }: ActivityLogFilters): Prisma.AuditLogWhereInput {
  const scope = getActivityLogScope(actor, canViewOrganization);
  const scopeWhere: Prisma.AuditLogWhereInput = !actor
    ? { id: "__missing__" }
    : scope === "global"
      ? {}
      : scope === "organization" && actor.organizationId
        ? {
            OR: [
              { organizationId: actor.organizationId },
              {
                organizationId: null,
                user: { is: { memberships: { some: { organizationId: actor.organizationId, active: true } } } },
              },
            ],
          }
        : actor.organizationId
          ? { OR: [{ organizationId: actor.organizationId, userId: actor.userId }, { organizationId: null, userId: actor.userId }] }
          : { userId: actor.userId };

  const filters: Prisma.AuditLogWhereInput[] = [scopeWhere];
  if (action) filters.push({ action: { contains: action } });
  if (entityType) filters.push({ entityType: { contains: entityType } });
  if (search) {
    filters.push({
      OR: [
        { action: { contains: search } },
        { entityType: { contains: search } },
        { entityId: { contains: search } },
        { requestId: { contains: search } },
        { user: { is: { displayName: { contains: search } } } },
        { user: { is: { email: { contains: search } } } },
      ],
    });
  }
  return filters.length === 1 ? scopeWhere : { AND: filters };
}

function activityCategory(action: string, entityType: string | null): ActivityCategory {
  if (["LOGIN", "LOGOUT", "FAILED_LOGIN"].includes(action)) return "AUTH";
  if (entityType === "FmeaAssessment" || entityType === "RulaAssessment" || /^(FMEA|RULA)_/.test(action)) return "ASSESSMENT";
  if (action.startsWith("AI_") || action.startsWith("CHAT_") || action.includes("IMAGE_ANALYSIS") || action.includes("SUGGESTION")) return "AI";
  return "OTHER";
}

function assessmentIds(rows: ActivityLogDbRow[], entityType: "FmeaAssessment" | "RulaAssessment"): string[] {
  return [...new Set(rows.flatMap((row) => row.entityType === entityType && row.entityId ? [row.entityId] : []))];
}

function assessmentKey(organizationId: string | null, id: string): string {
  return `${organizationId ?? ""}:${id}`;
}

function tokenUsageReferences(row: ActivityLogDbRow): TokenUsageReference[] {
  const references: TokenUsageReference[] = [];
  const add = (sourceType: string, sourceId: string | null | undefined) => {
    if (sourceId) references.push({ sourceType, sourceId });
  };
  if (row.action === "AI_REQUEST_CREATE" || row.action === "AI_REQUEST_RETRY") add("AI_ANALYSIS_REQUEST", row.entityId);
  if (row.action === "FMEA_PROCESS_IMAGE_ANALYSIS" || row.action === "FMEA_PROCESS_IMAGE_ANALYSIS_FAILED") add("FMEA_IMAGE_REVIEW", row.requestId);
  if (row.action === "RULA_POSTURE_IMAGE_ANALYSIS" || row.action === "RULA_POSTURE_IMAGE_ANALYSIS_FAILED") add("RULA_IMAGE_REVIEW", row.requestId);
  if (row.action === "FMEA_REPORT_DETAIL_SUGGESTIONS") add("FMEA_REPORT_DETAILS", row.requestId);
  if (row.action === "CHAT_MESSAGE") add("CHAT_MESSAGE", row.entityId);
  return references;
}

async function enrichActivityLog(rows: ActivityLogDbRow[]): Promise<ActivityLogEntry[]> {
  const fmeaIds = assessmentIds(rows, "FmeaAssessment");
  const rulaIds = assessmentIds(rows, "RulaAssessment");
  const usageReferences: ScopedTokenUsageReference[] = rows.flatMap((row) => {
    const organizationId = row.organizationId;
    if (!organizationId) return [];
    return tokenUsageReferences(row).map((reference) => ({ ...reference, organizationId }));
  });
  const [fmeas, rulas, usage] = await Promise.all([
    fmeaIds.length
      ? prisma.fmeaAssessment.findMany({ where: { id: { in: fmeaIds } }, select: { id: true, organizationId: true, title: true, code: true } })
      : Promise.resolve([]),
    rulaIds.length
      ? prisma.rulaAssessment.findMany({ where: { id: { in: rulaIds } }, select: { id: true, organizationId: true, title: true, subjectCode: true } })
      : Promise.resolve([]),
    usageReferences.length
      ? prisma.aIUsageRecord.findMany({
          where: {
            OR: usageReferences.map((reference) => ({ sourceType: reference.sourceType, sourceId: reference.sourceId, organizationId: reference.organizationId })),
          },
          select: { sourceType: true, sourceId: true, organizationId: true, useCase: true, provider: true, model: true, inputTokens: true, outputTokens: true, totalTokens: true, createdAt: true },
        })
      : Promise.resolve([]),
  ]);
  const assessments = new Map<string, AssessmentReference>();
  for (const fmea of fmeas) assessments.set(assessmentKey(fmea.organizationId, fmea.id), { type: "FMEA", id: fmea.id, title: fmea.title, code: fmea.code });
  for (const rula of rulas) assessments.set(assessmentKey(rula.organizationId, rula.id), { type: "RULA", id: rula.id, title: rula.title, code: rula.subjectCode });
  const tokenUsageByKey = new Map(usage.map((item) => [`${item.sourceType}:${item.sourceId}:${item.organizationId}`, item]));

  return rows.map((row) => {
    const assessment = row.entityId && (row.entityType === "FmeaAssessment" || row.entityType === "RulaAssessment")
      ? assessments.get(assessmentKey(row.organizationId, row.entityId)) ?? null
      : null;
    const tokenUsage = tokenUsageReferences(row)
      .map((reference) => tokenUsageByKey.get(`${reference.sourceType}:${reference.sourceId}:${row.organizationId}`))
      .find((item) => item !== undefined);
    return {
      ...row,
      category: activityCategory(row.action, row.entityType),
      assessment,
      tokenUsage: tokenUsage
        ? { useCase: tokenUsage.useCase, provider: tokenUsage.provider, model: tokenUsage.model, inputTokens: tokenUsage.inputTokens, outputTokens: tokenUsage.outputTokens, totalTokens: tokenUsage.totalTokens, sourceType: tokenUsage.sourceType, createdAt: tokenUsage.createdAt }
        : null,
    };
  });
}

export async function registerAuditRoutes(app: FastifyInstance) {
  const activityLogHandler = async (request: FastifyRequest) => {
    const q = pageParams(request.query);
    const filter = parse(z.object({ action: z.string().trim().max(120).optional(), entityType: z.string().trim().max(120).optional() }), request.query);
    const canViewOrganization = hasPermission(request, "audit.read");
    const scope = getActivityLogScope(request.actor, canViewOrganization);
    const where = buildActivityLogWhere({ actor: request.actor, canViewOrganization, search: q.search, action: filter.action, entityType: filter.entityType });
    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({ where, include: { user: { select: { id: true, displayName: true, email: true } } }, skip: (q.page - 1) * q.limit, take: q.limit, orderBy: { createdAt: "desc" } }),
      prisma.auditLog.count({ where }),
    ]);
    return envelope(await enrichActivityLog(rows), { page: q.page, limit: q.limit, total, scope });
  };

  app.get("/api/v1/activity-log", { preHandler: authenticate }, activityLogHandler);
  // Keep the old API path as a compatibility alias while the user-facing section uses Activity Log.
  app.get("/api/v1/audit", { preHandler: authenticate }, activityLogHandler);
}
