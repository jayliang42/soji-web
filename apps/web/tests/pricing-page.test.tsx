import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pricingMocks = vi.hoisted(() => ({
  getAccountSubscriptions: vi.fn(),
  getBillingDeliveryReadiness: vi.fn(),
  getSessionSnapshot: vi.fn()
}));

vi.mock("@/lib/account-subscriptions", () => ({
  getAccountSubscriptions: pricingMocks.getAccountSubscriptions,
  hasOpenStripeMembership: (items: Array<{ provider: string; status: string }>) =>
    items.some(
      (item) =>
        item.provider === "stripe" &&
        ["active", "trialing", "incomplete", "past_due", "unpaid", "paused"].includes(
          item.status
        )
    )
}));
vi.mock("@/lib/billing-readiness", () => ({
  getBillingDeliveryReadiness: pricingMocks.getBillingDeliveryReadiness,
  isBillingDeliveryReady: () => true
}));
vi.mock("@/lib/env", () => ({ hasStripeConfig: () => true }));
vi.mock("@/lib/session", () => ({
  getSessionSnapshot: pricingMocks.getSessionSnapshot
}));

import PricingPage from "@/app/pricing/page";

const signedInSession = {
  entitlements: [],
  source: "supabase" as const,
  user: {
    avatarUrl: null,
    email: "member@example.com",
    fullName: "Member",
    id: "user-id",
    providers: ["email"],
    roles: ["member"],
    tier: "tier_1"
  }
};

describe("pricing membership safety", () => {
  beforeEach(() => {
    for (const mock of Object.values(pricingMocks)) mock.mockReset();
    pricingMocks.getSessionSnapshot.mockResolvedValue(signedInSession);
    pricingMocks.getBillingDeliveryReadiness.mockResolvedValue({});
  });

  it("routes an existing Stripe member to account management", async () => {
    pricingMocks.getAccountSubscriptions.mockResolvedValue({
      items: [{ provider: "stripe", status: "active" }]
    });

    const html = renderToStaticMarkup(
      await PricingPage({ searchParams: Promise.resolve({}) })
    );

    expect(html).toContain("Manage existing membership");
    expect(html).not.toContain("Join Tier");
    expect(pricingMocks.getBillingDeliveryReadiness).not.toHaveBeenCalled();
  });

  it("fails closed when current membership cannot be verified", async () => {
    pricingMocks.getAccountSubscriptions.mockResolvedValue({
      error: "subscription_query_failed",
      items: []
    });

    const html = renderToStaticMarkup(
      await PricingPage({ searchParams: Promise.resolve({}) })
    );

    expect(html).toContain("Membership status unavailable");
    expect(html).toContain("checkout is paused to prevent a duplicate subscription");
    expect(html).toContain("Checkout unavailable");
    expect(pricingMocks.getBillingDeliveryReadiness).not.toHaveBeenCalled();
  });

  it("keeps exact plan pricing nearby and groups shared policy terms once", async () => {
    pricingMocks.getAccountSubscriptions.mockResolvedValue({ items: [] });

    const html = renderToStaticMarkup(
      await PricingPage({ searchParams: Promise.resolve({}) })
    );

    for (const amount of ["$29", "$128", "$299"]) {
      expect(html).toContain(`${amount} billed monthly until canceled`);
    }
    expect(html.match(/Stripe Customer Portal/gu)).toHaveLength(1);
    expect(html.split('href="/refund-policy"')).toHaveLength(2);
    expect(html).toContain("One billing rhythm across every plan");
    expect(html).not.toMatch(/type="checkbox"/u);
  });
});
