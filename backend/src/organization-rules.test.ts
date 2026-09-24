import { describe, expect, it } from "vitest";
import { activeSubscription, createSubscriptionFields, resolveSubscriptionPaymentMode, subscriptionIsUsable, subscriptionRequiredError } from "./subscription.js";

describe("multi-organization subscription boundaries", () => {
  const now = new Date("2026-09-12T08:00:00.000Z");

  it("keeps every new company subscription independent and blocks unpaid production access", () => {
    const trial = createSubscriptionFields("STARTER", now, false);
    const pending = createSubscriptionFields("ENTERPRISE", now, true);

    expect(trial.subscriptionPlan).toBe("STARTER");
    expect(trial.subscriptionStatus).toBe("TRIALING");
    expect(subscriptionIsUsable(trial)).toBe(true);
    expect(pending.subscriptionPlan).toBe("ENTERPRISE");
    expect(pending.subscriptionStatus).toBe("PENDING_PAYMENT");
    expect(pending.subscriptionProvider).toBe("pending");
    expect(subscriptionIsUsable(pending)).toBe(false);
  });

  it("does not let one company subscription state spill into another company", () => {
    const active = activeSubscription("PROFESSIONAL", now, "gateway", "payment-company-a");
    const expired = { ...activeSubscription("STARTER", now, "gateway", "payment-company-b"), subscriptionExpiresAt: new Date(now.getTime() - 1) };

    expect(active.subscriptionExternalId).toBe("payment-company-a");
    expect(subscriptionIsUsable(active)).toBe(true);
    expect(expired.subscriptionExternalId).toBe("payment-company-b");
    expect(subscriptionIsUsable(expired)).toBe(false);
  });

  it("exposes a stable payment-required error for protected company routes", () => {
    const error = subscriptionRequiredError() as Error & { statusCode?: number; code?: string };
    expect(error.statusCode).toBe(402);
    expect(error.code).toBe("SUBSCRIPTION_REQUIRED");
  });

  it("never treats local checkout simulation as a production payment", () => {
    expect(resolveSubscriptionPaymentMode("production", "local")).toBe("external");
    expect(resolveSubscriptionPaymentMode("development", undefined)).toBe("local");
    expect(resolveSubscriptionPaymentMode("development", "external")).toBe("external");
  });
});
