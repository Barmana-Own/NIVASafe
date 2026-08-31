import { SUBSCRIPTION_PERIOD_DAYS, SUBSCRIPTION_PLANS, SUBSCRIPTION_TRIAL_DAYS, isSubscriptionActive, isSubscriptionPlan, type SubscriptionPlan, type SubscriptionStatus } from "@nivasafe/domain";

export { isSubscriptionActive, isSubscriptionPlan, SUBSCRIPTION_PLANS };

export type OrganizationSubscriptionFields = {
  subscriptionPlan: string;
  subscriptionStatus: string;
  subscriptionProvider: string;
  subscriptionStartedAt: Date;
  subscriptionExpiresAt: Date | null;
  subscriptionExternalId: string | null;
};

export function createSubscriptionFields(plan: SubscriptionPlan, now = new Date(), production = process.env.NODE_ENV === "production"): OrganizationSubscriptionFields {
  const trialEndsAt = new Date(now.getTime() + SUBSCRIPTION_TRIAL_DAYS * 86400000);
  return {
    subscriptionPlan: plan,
    subscriptionStatus: production ? "PENDING_PAYMENT" : "TRIALING",
    subscriptionProvider: production ? "pending" : "local",
    subscriptionStartedAt: now,
    subscriptionExpiresAt: production ? null : trialEndsAt,
    subscriptionExternalId: null,
  };
}

export function activeSubscription(plan: SubscriptionPlan, now = new Date(), provider = "local", externalId: string | null = null): OrganizationSubscriptionFields {
  return {
    subscriptionPlan: plan,
    subscriptionStatus: "ACTIVE",
    subscriptionProvider: provider,
    subscriptionStartedAt: now,
    subscriptionExpiresAt: new Date(now.getTime() + SUBSCRIPTION_PERIOD_DAYS * 86400000),
    subscriptionExternalId: externalId,
  };
}

export function subscriptionIsUsable(subscription: { subscriptionStatus: string; subscriptionExpiresAt: Date | null }): boolean {
  return isSubscriptionActive(subscription.subscriptionStatus as SubscriptionStatus, subscription.subscriptionExpiresAt);
}

export function subscriptionRequiredError() {
  return Object.assign(new Error("برای این شرکت اشتراک فعال لازم است."), { statusCode: 402, code: "SUBSCRIPTION_REQUIRED" });
}
