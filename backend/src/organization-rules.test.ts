import { describe, expect, it, vi } from "vitest";
import { activeSubscription, createSubscriptionFields, resolveSubscriptionPaymentMode, subscriptionIsUsable, subscriptionRequiredError } from "./subscription.js";

describe("multi-organization subscription boundaries", () => {
  const now = new Date("2026-09-12T08:00:00.000Z");

  it.each(["2026-09-12T08:00:00.000Z", "2046-04-23T17:36:12.345Z"])("uses one supplied UTC instant for trial creation and access checks at %s", (instant) => {
    const createdAt = new Date(instant);
    const trial = createSubscriptionFields("STARTER", createdAt, false);
    const expectedExpiry = new Date(createdAt.getTime() + 14 * 24 * 60 * 60 * 1000);

    expect(trial.subscriptionExpiresAt).toEqual(expectedExpiry);
    expect(subscriptionIsUsable(trial, createdAt)).toBe(true);
    expect(subscriptionIsUsable(trial, new Date(expectedExpiry.getTime() - 1))).toBe(true);
    expect(subscriptionIsUsable(trial, expectedExpiry)).toBe(false);
    expect(subscriptionIsUsable(trial, new Date(expectedExpiry.getTime() + 1))).toBe(false);
    expect(subscriptionIsUsable(trial, new Date(expectedExpiry.getTime() + 30 * 24 * 60 * 60 * 1000))).toBe(false);
  });

  it("keeps every new company subscription independent and blocks unpaid production access", () => {
    const trial = createSubscriptionFields("STARTER", now, false);
    const pending = createSubscriptionFields("ENTERPRISE", now, true);

    expect(trial.subscriptionPlan).toBe("STARTER");
    expect(trial.subscriptionStatus).toBe("TRIALING");
    expect(subscriptionIsUsable(trial, now)).toBe(true);
    expect(pending.subscriptionPlan).toBe("ENTERPRISE");
    expect(pending.subscriptionStatus).toBe("PENDING_PAYMENT");
    expect(pending.subscriptionProvider).toBe("pending");
    expect(subscriptionIsUsable(pending, now)).toBe(false);
  });

  it("does not let one company subscription state spill into another company", () => {
    const active = activeSubscription("PROFESSIONAL", now, "gateway", "payment-company-a");
    const expired = { ...activeSubscription("STARTER", now, "gateway", "payment-company-b"), subscriptionExpiresAt: new Date(now.getTime() - 1) };

    expect(active.subscriptionExternalId).toBe("payment-company-a");
    expect(subscriptionIsUsable(active, now)).toBe(true);
    expect(expired.subscriptionExternalId).toBe("payment-company-b");
    expect(subscriptionIsUsable(expired, now)).toBe(false);
  });

  it.each(["PENDING_PAYMENT", "PAST_DUE", "CANCELED", "EXPIRED"])("does not grant access for the ineligible %s status", (subscriptionStatus) => {
    expect(subscriptionIsUsable({ subscriptionStatus, subscriptionExpiresAt: new Date("2050-01-01T00:00:00.000Z") }, now)).toBe(false);
  });

  it("preserves the existing missing and invalid expiration behavior", () => {
    expect(subscriptionIsUsable({ subscriptionStatus: "ACTIVE", subscriptionExpiresAt: null }, now)).toBe(true);
    expect(subscriptionIsUsable({ subscriptionStatus: "TRIALING", subscriptionExpiresAt: null }, now)).toBe(true);
    expect(subscriptionIsUsable({ subscriptionStatus: "PENDING_PAYMENT", subscriptionExpiresAt: null }, now)).toBe(false);
    expect(subscriptionIsUsable({ subscriptionStatus: "ACTIVE", subscriptionExpiresAt: new Date(Number.NaN) }, now)).toBe(false);
  });

  it("uses the current clock when production callers omit the optional instant", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(now);
      const trial = createSubscriptionFields("STARTER");
      expect(trial.subscriptionStartedAt).toEqual(now);
      expect(trial.subscriptionExpiresAt).toEqual(new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000));
      expect(subscriptionIsUsable(trial)).toBe(true);

      vi.setSystemTime(trial.subscriptionExpiresAt!);
      expect(subscriptionIsUsable(trial)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
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
