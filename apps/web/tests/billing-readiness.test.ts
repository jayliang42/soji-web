import { beforeEach, describe, expect, it, vi } from "vitest";

const billingReadinessMocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  hasStripeWebhookConfig: vi.fn(),
  rpc: vi.fn()
}));

vi.mock("@/lib/env", () => ({
  hasStripeWebhookConfig: billingReadinessMocks.hasStripeWebhookConfig
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: billingReadinessMocks.createSupabaseAdminClient
}));

import {
  BILLING_DELIVERY_READINESS_CACHE_MS,
  getBillingDeliveryReadiness,
  isBillingDeliveryReady,
  probeBillingDeliveryReadiness
} from "@/lib/billing-readiness";

describe("billing delivery readiness", () => {
  beforeEach(() => {
    for (const mock of Object.values(billingReadinessMocks)) mock.mockReset();
    billingReadinessMocks.hasStripeWebhookConfig.mockReturnValue(true);
    billingReadinessMocks.rpc.mockResolvedValue({ data: true, error: null });
    billingReadinessMocks.createSupabaseAdminClient.mockReturnValue({
      rpc: billingReadinessMocks.rpc
    });
  });

  it("requires both webhook verification and operational receipt storage", async () => {
    await expect(probeBillingDeliveryReadiness()).resolves.toEqual({
      stripeWebhookConfigured: true,
      supabaseServiceRoleOperational: true
    });
    expect(billingReadinessMocks.rpc).toHaveBeenCalledWith(
      "service_role_readiness"
    );
  });

  it("preserves independent configuration and database failure signals", async () => {
    billingReadinessMocks.hasStripeWebhookConfig.mockReturnValue(false);
    billingReadinessMocks.rpc.mockResolvedValue({
      data: false,
      error: { message: "service role denied" }
    });

    await expect(probeBillingDeliveryReadiness()).resolves.toEqual({
      stripeWebhookConfigured: false,
      supabaseServiceRoleOperational: false
    });
  });

  it("fails closed when the admin client or probe is unavailable", async () => {
    billingReadinessMocks.createSupabaseAdminClient.mockReturnValue(null);
    await expect(probeBillingDeliveryReadiness()).resolves.toEqual({
      stripeWebhookConfigured: true,
      supabaseServiceRoleOperational: false
    });

    billingReadinessMocks.createSupabaseAdminClient.mockReturnValue({
      rpc: billingReadinessMocks.rpc
    });
    billingReadinessMocks.rpc.mockRejectedValue(new Error("network unavailable"));
    await expect(probeBillingDeliveryReadiness()).resolves.toEqual({
      stripeWebhookConfigured: true,
      supabaseServiceRoleOperational: false
    });
  });

  it("coalesces readiness probes inside the cache window", async () => {
    const first = getBillingDeliveryReadiness(20_000);
    const second = getBillingDeliveryReadiness(
      20_000 + BILLING_DELIVERY_READINESS_CACHE_MS - 1
    );

    expect(second).toBe(first);
    await expect(first).resolves.toMatchObject({
      supabaseServiceRoleOperational: true
    });
    expect(billingReadinessMocks.rpc).toHaveBeenCalledTimes(1);
  });

  it("opens checkout only when both delivery requirements pass", () => {
    expect(
      isBillingDeliveryReady({
        stripeWebhookConfigured: true,
        supabaseServiceRoleOperational: true
      })
    ).toBe(true);
    expect(
      isBillingDeliveryReady({
        stripeWebhookConfigured: false,
        supabaseServiceRoleOperational: true
      })
    ).toBe(false);
    expect(
      isBillingDeliveryReady({
        stripeWebhookConfigured: true,
        supabaseServiceRoleOperational: false
      })
    ).toBe(false);
  });
});
