import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const readinessMocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  getBillingDeliveryReadiness: vi.fn(),
  getStripeClient: vi.fn(),
  officeHourRows: [
    {
      id: "office-hour-1",
      replay_url: "https://events.soji.test/replays/office-hour-1",
      signup_url: "https://events.soji.test/register/office-hour-1"
    }
  ],
  flagshipRows: [
    {
      body_markdown: "PRIVATE PHASE3 BODY with a complete member guide.",
      content_access_rules: [{ entitlement_id: "content.basic" }],
      cover_image_alt: "Paper decision map in warm window light.",
      cover_image_url: "/covers/wealth-without-drift.webp",
      id: "flagship-1",
      preview_markdown: "A useful public decision-reset preview.",
      published_at: "2026-07-28T00:00:00.000Z",
      slug: "wealth-without-drift",
      tags: ["decision-making", "cash flow", "family"],
      visibility: "members_only"
    }
  ],
  publicLimit: vi.fn(),
  validateStripeMembershipCatalog: vi.fn()
}));

vi.mock("@/lib/billing-readiness", () => ({
  getBillingDeliveryReadiness: readinessMocks.getBillingDeliveryReadiness
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: readinessMocks.createSupabaseAdminClient
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
    for (const mock of Object.values(readinessMocks)) {
      if (typeof mock === "function" && "mockReset" in mock) {
        mock.mockReset();
      }
    }
    vi.stubEnv("NEXT_PUBLIC_SUPPORT_URL", "https://support.soji.test/help");
    vi.stubEnv("SOJI_POLICIES_APPROVED", "true");
    vi.stubEnv("STRIPE_TERMS_ACCEPTANCE_READY", "true");
    readinessMocks.createSupabaseAdminClient.mockReturnValue({
      from: vi.fn((table: string) => ({
        select: vi.fn().mockResolvedValue(
          table === "content_items"
            ? { data: readinessMocks.flagshipRows, error: null }
            : { data: readinessMocks.officeHourRows, error: null }
        )
      }))
    });
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
      launchContentCount: 1,
      launchContentOperational: true,
      officeHourReplayCount: 1,
      officeHourReplayState: "ready",
      officeHourSignupCount: 1,
      officeHourSignupState: "ready",
      officeHoursOperational: true,
      policiesApprovalState: "ready",
      policiesApproved: true,
      stripeTermsAcceptanceReady: true,
      stripeTermsAcceptanceState: "ready",
      supportContactConfigured: true,
      supportContactState: "ready",
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
      launchContentOperational: true,
      officeHoursOperational: true,
      policiesApproved: true,
      stripeTermsAcceptanceReady: true,
      supportContactConfigured: true,
      supabasePublicOperational: false,
      supabaseServiceRoleOperational: false
    });
  });

  it("fails closed when dependency clients are unavailable", async () => {
    readinessMocks.createSupabaseAdminClient.mockReturnValue(null);
    readinessMocks.createSupabaseServerClient.mockResolvedValue(null);
    readinessMocks.getBillingDeliveryReadiness.mockResolvedValue({
      stripeWebhookConfigured: false,
      supabaseServiceRoleOperational: false
    });
    readinessMocks.getStripeClient.mockReturnValue(null);

    await expect(probeOperationalReadiness()).resolves.toEqual({
      stripeMembershipPrices: false,
      launchContentCount: 0,
      launchContentOperational: false,
      officeHourReplayCount: 0,
      officeHourReplayState: "needs_owner_input",
      officeHourSignupCount: 0,
      officeHourSignupState: "needs_owner_input",
      officeHoursOperational: false,
      policiesApprovalState: "ready",
      policiesApproved: true,
      stripeTermsAcceptanceReady: true,
      stripeTermsAcceptanceState: "ready",
      supportContactConfigured: true,
      supportContactState: "ready",
      supabasePublicOperational: false,
      supabaseServiceRoleOperational: false
    });
  });

  it("distinguishes absent owner input from invalid launch destinations", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPPORT_URL", "https://example.com/support");
    vi.stubEnv("SOJI_POLICIES_APPROVED", "not-yet");
    vi.stubEnv("STRIPE_TERMS_ACCEPTANCE_READY", "");
    readinessMocks.createSupabaseAdminClient.mockReturnValue({
      from: vi.fn((table: string) => ({
        select: vi.fn().mockResolvedValue(
          table === "content_items"
            ? { data: readinessMocks.flagshipRows, error: null }
            : {
                data: [
                  {
                    id: "office-hour-invalid",
                    replay_url: null,
                    signup_url: "https://example.com/signup"
                  }
                ],
                error: null
              }
        )
      }))
    });

    await expect(probeOperationalReadiness()).resolves.toMatchObject({
      officeHourReplayState: "needs_owner_input",
      officeHourSignupState: "invalid",
      officeHoursOperational: false,
      policiesApprovalState: "invalid",
      policiesApproved: false,
      stripeTermsAcceptanceReady: false,
      stripeTermsAcceptanceState: "needs_owner_input",
      supportContactConfigured: false,
      supportContactState: "invalid"
    });
  });

  it("never returns protected launch values from readiness", async () => {
    const result = await probeOperationalReadiness();
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain("PRIVATE PHASE3 BODY");
    expect(serialized).not.toContain("support.soji.test");
    expect(serialized).not.toContain("events.soji.test");
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

  afterEach(() => {
    vi.unstubAllEnvs();
  });
});
