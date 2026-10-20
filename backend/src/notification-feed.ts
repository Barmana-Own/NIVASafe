import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "./core.js";
import { getAIQuotaStatus, type AIQuotaStatus } from "./ai-quota.js";
import { isRulaPostureAnalysisReviewed, rulaPostureAnalysisSchema } from "./rula-posture.js";

/** Stable event identities keep concurrent refreshes from duplicating or reviving read alerts. */
export function notificationEventId(organizationId: string, userId: string, event: string) {
  const hex = createHash("sha256").update(JSON.stringify([organizationId, userId, event])).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function aiQuotaNotification(organizationId: string, userId: string, quota: AIQuotaStatus, cycle: number, locale = "fa") {
  if (quota.state !== "LOW" && quota.state !== "EXHAUSTED") return null;
  const exhausted = quota.state === "EXHAUSTED";
  const english = locale === "en";
  const remaining = quota.remainingTokens.toLocaleString(english ? "en-US" : "fa-IR");
  return {
    id: notificationEventId(organizationId, userId, `ai-quota:${cycle}:${quota.state}`),
    organizationId,
    userId,
    title: exhausted
      ? english ? "AI token allowance exhausted" : "سهمیه توکن هوش مصنوعی به پایان رسید"
      : english ? "AI token allowance is low" : "سهمیه توکن هوش مصنوعی رو به پایان است",
    message: exhausted
      ? english ? "Your AI token allowance has been used. Contact support to request a review." : "سهمیه مصرف هوش مصنوعی شما استفاده شده است. برای بررسی درخواست با پشتیبانی تماس بگیرید."
      : english ? `${remaining} AI tokens remain. Contact support if you need more.` : `${remaining} توکن هوش مصنوعی باقی مانده است. اگر به سهمیه بیشتری نیاز دارید، با پشتیبانی تماس بگیرید.`,
    link: "/support",
  };
}

/** Create one immutable in-app quota event per user, organization, allowance cycle, and threshold state. */
export async function refreshAIQuotaNotifications(organizationId: string, userId: string, now = new Date(), db: PrismaClient = prisma) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { active: true, aiEnabled: true, aiTokenLimit: true, aiTokensUsed: true, aiQuotaCycle: true, locale: true },
  });
  if (!user) return null;
  const quota = getAIQuotaStatus(user, now);
  const event = aiQuotaNotification(organizationId, userId, quota, user.aiQuotaCycle, user.locale);
  if (event) await db.notification.createMany({ data: [event], skipDuplicates: true });
  return quota;
}

export async function refreshAIQuotaNotificationsForUser(userId: string, now = new Date(), db: PrismaClient = prisma) {
  const memberships = await db.organizationMember.findMany({ where: { userId, active: true }, select: { organizationId: true } });
  await Promise.all(memberships.map(({ organizationId }) => refreshAIQuotaNotifications(organizationId, userId, now, db)));
}

export function reviewedRulaAlert(bodySide: string, postureAnalysis: unknown) {
  const parsed = rulaPostureAnalysisSchema.safeParse(postureAnalysis);
  return parsed.success && (bodySide === "LEFT" || bodySide === "RIGHT" || bodySide === "BOTH") && isRulaPostureAnalysisReviewed(bodySide, parsed.data);
}

/** Reconcile a bounded operational feed; historic notifications are never removed. */
export async function refreshOperationalNotifications(organizationId: string, userId: string, now = new Date()) {
  const preferences = await prisma.notificationPreference.findUnique({ where: { organizationId_userId: { organizationId, userId } } });
  const scope = { organizationId, userId };
  const events: { id: string; organizationId: string; userId: string; title: string; message: string; link: string }[] = [];
  const add = (event: string, title: string, message: string, link: string) => events.push({ ...scope, id: notificationEventId(organizationId, userId, event), title, message, link });
  if (preferences?.riskAlerts !== false) {
    const [fmea, rula] = await Promise.all([
      prisma.fmeaItem.findMany({ where: { riskLevel: "CRITICAL", assessment: { organizationId, deletedAt: null, status: { not: "ARCHIVED" }, project: { deletedAt: null } } }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 50, select: { id: true, failureMode: true, rpn: true, assessment: { select: { id: true, title: true, version: true } } } }),
      prisma.rulaAssessment.findMany({ where: { organizationId, actionLevel: 4, status: { not: "ARCHIVED" }, project: { deletedAt: null } }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 50, select: { id: true, title: true, version: true, score: true, bodySide: true, postureAnalysis: true } }),
    ]);
    for (const item of fmea) add(`fmea:${item.id}:${item.assessment.version}`, "ریسک بحرانی در ارزیابی FMEA", `${item.assessment.title} — ${item.failureMode}؛ RPN: ${item.rpn}`, `/fmea/${item.assessment.id}/report`);
    for (const item of rula) if (reviewedRulaAlert(item.bodySide, item.postureAnalysis)) add(`rula:${item.id}:${item.version}`, "اقدام فوری در ارزیابی RULA", `${item.title} — امتیاز تأییدشده: ${item.score}؛ سطح اقدام: ۴`, `/rula/${item.id}/report`);
  }
  if (preferences?.dueReminders !== false) {
    const actions = await prisma.correctiveAction.findMany({ where: { organizationId, status: { notIn: ["COMPLETED", "CANCELLED", "REJECTED"] }, dueDate: { lte: new Date(now.getTime() + 3 * 86_400_000) }, project: { deletedAt: null } }, orderBy: [{ dueDate: "asc" }, { id: "asc" }], take: 50, select: { id: true, title: true, dueDate: true } });
    for (const action of actions) {
      if (!action.dueDate) continue;
      const overdue = action.dueDate.getTime() < now.getTime();
      add(`action:${action.id}:${action.dueDate.toISOString()}:${overdue ? "overdue" : "due"}`, overdue ? "سررسید اقدام اصلاحی گذشته است" : "موعد اقدام اصلاحی نزدیک است", `${action.title} — سررسید: ${action.dueDate.toLocaleDateString("fa-IR-u-ca-persian", { timeZone: "Asia/Tehran" })}`, "/actions");
    }
  }
  if (events.length) await prisma.notification.createMany({ data: events, skipDuplicates: true });
}
