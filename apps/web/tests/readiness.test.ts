import { beforeEach, describe, expect, it, vi } from "vitest";

const readinessMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getBillingDeliveryReadiness: vi.fn(),
  getStripeClient: vi.fn(),
  publicLimit: vi.fn(),
  validateStripeMembershipCatalog: vi.fn()
}));

vi.mock("@/lib/billing-readiness", () => ({
  getBillingDeliveryReadiness: readinessMocks.getBillingDeliveryReadiness
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: readinessMocks.createSupabaseServerClient
}));
vi.mock("@/lib/stripe", () => ({
  getStripeClient: readinessMocks.getStripeClient
}));
vi.mock("@/lib/stripe-price-validation", () => ({
  validateStripeMembershipCatalog: readinessMocks.validateStripeMembershipCatalog
}));

import {
  getOperationalReadiness,
  probeOperationalReadiness,
  READINESS_CACHE_MS
} from "@/lib/readiness";

describe("operational readiness probes", () => {
  beforeEach(() => {
    for (const mock of Object.values(readinessMocks)) mock.mockReset();
    readinessMocks.publicLimit.mockResolvedValue({ data: [{ id: "free" }], error: null });
    readinessMocks.createSupabaseServerClient.mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({ limit: readinessMocks.publicLimit }))
      }))
    });
    readinessMocks.getBillingDeliveryReadiness.mockResolvedValue({
      stripeWebhookConfigured: true,
      supabaseServiceRoleOperational: true
    });
    readinessMocks.getStripeClient.mockReturnValue({ prices: { list: vi.fn() } });
    readinessMocks.validateStripeMembershipCatalog.mockResolvedValue({
      ok: true,
      priceIds: {}
    });
  });

  it("reports all dependencies operational only after real probes pass", async () => {
    await expect(probeOperationalReadiness()).resolves.toEqual({
      stripeMembershipPrices: true,
      supabasePublicOperational: true,
      supabaseServiceRoleOperational: true
    });
    expect(readinessMocks.getBillingDeliveryReadiness).toHaveBeenCalledTimes(1);
  });

  it("keeps independent failure signals for database and Stripe operations", async () => {
    readinessMocks.publicLimit.mockResolvedValue({
      data: null,
      error: { message: "public query failed" }
    });
    readinessMocks.getBillingDeliveryReadiness.mockResolvedValue({
      stripeWebhookConfigured: true,
      supabaseServiceRoleOperational: false
    });
    readinessMocks.validateStripeMembershipCatalog.mockResolvedValue({
      ok: false,
      reason: "stripe_membership_price_missing"
    });

    await expect(probeOperationalReadiness()).resolves.toEqual({
      stripeMembershipPrices: false,
      supabasePublicOperational: false,
      supabaseServiceRoleOperational: false
    });
  });

  it("fails closed when dependency clients are unavailable", async () => {
    readinessMocks.createSupabaseServerClient.mockResolvedValue(null);
    readinessMocks.getBillingDeliveryReadiness.mockResolvedValue({
      stripeWebhookConfigured: false,
      supabaseServiceRoleOperational: false
    });
    readinessMocks.getStripeClient.mockReturnValue(null);

    await expect(probeOperationalReadiness()).resolves.toEqual({
      stripeMembershipPrices: false,
      supabasePublicOperational: false,
      supabaseServiceRoleOperational: false
    });
  });

  it("coalesces dependency probes within the readiness cache window", async () => {
    const first = getOperationalReadiness(1_000);
    const second = getOperationalReadiness(1_000 + READINESS_CACHE_MS - 1);

    expect(second).toBe(first);
    await expect(first).resolves.toMatchObject({
      stripeMembershipPrices: true
    });
    expect(readinessMocks.validateStripeMembershipCatalog).toHaveBeenCalledTimes(1);
  });
});
