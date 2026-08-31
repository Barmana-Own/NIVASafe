export const SUBSCRIPTION_TRIAL_DAYS = 14;
export const SUBSCRIPTION_PERIOD_DAYS = 30;

export const SUBSCRIPTION_PLANS = [
  { id: "STARTER", titleFa: "شروع", titleEn: "Starter", descriptionFa: "برای یک شرکت کوچک و شروع ارزیابی‌ها" },
  { id: "PROFESSIONAL", titleFa: "حرفه‌ای", titleEn: "Professional", descriptionFa: "برای تیم‌های HSE و چند پروژه هم‌زمان" },
  { id: "ENTERPRISE", titleFa: "سازمانی", titleEn: "Enterprise", descriptionFa: "برای سازمان‌های بزرگ و چند واحد عملیاتی" },
] as const;

export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number]["id"];
export type SubscriptionStatus = "TRIALING" | "ACTIVE" | "PENDING_PAYMENT" | "PAST_DUE" | "CANCELED" | "EXPIRED";

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  TRIALING: "آزمایشی",
  ACTIVE: "فعال",
  PENDING_PAYMENT: "در انتظار پرداخت",
  PAST_DUE: "پرداخت معوق",
  CANCELED: "لغوشده",
  EXPIRED: "منقضی",
};

export function isSubscriptionPlan(value: unknown): value is SubscriptionPlan {
  return typeof value === "string" && SUBSCRIPTION_PLANS.some((plan) => plan.id === value);
}

export function isSubscriptionActive(status: unknown, expiresAt?: Date | string | null, now = new Date()): boolean {
  if (status !== "ACTIVE" && status !== "TRIALING") return false;
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() > now.getTime();
}
