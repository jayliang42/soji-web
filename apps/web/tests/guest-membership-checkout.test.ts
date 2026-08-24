import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const guestMocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  rpc: vi.fn()
}));

vi.mock("@/lib/env", () => ({
  env: { GUEST_CHECKOUT_HMAC_SECRET: "test-guest-checkout-hmac-secret-value" }
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: guestMocks.createSupabaseAdminClient
}));

import {
  claimGuestMembershipCheckout,
  consumeGuestMembershipCheckoutRateLimit,
  getGuestCheckoutBrowser,
  getGuestCheckoutNetwork,
  recordGuestMembershipPayment,
  reserveGuestMembershipCheckout,
  setGuestCheckoutBrowserCookie
} from "@/lib/guest-membership-checkout";

const browserId = "00000000-0000-4000-8000-000000000901";
const userId = "00000000-0000-4000-8000-000000000902";

describe("guest membership checkout service", () => {
  beforeEach(() => {
    guestMocks.rpc.mockReset();
    guestMocks.createSupabaseAdminClient.mockReset();
    guestMocks.createSupabaseAdminClient.mockReturnValue({ rpc: guestMocks.rpc });
  });

  it("uses a server-only HMAC browser identity and HttpOnly cookie", () => {
    const request = new NextRequest("http://localhost:3000/pricing", {
      headers: { Cookie: `soji_guest_checkout_browser=${browserId}` }
    });
    const browser = getGuestCheckoutBrowser(request);

    expect(browser).toMatchObject({ browserId });
    expect(browser?.browserHmac).toMatch(/^[a-f0-9]{64}$/);

    const response = NextResponse.json({ ok: true });
    setGuestCheckoutBrowserCookie(
      response,
      browserId,
      "00000000-0000-4000-8000-000000000904"
    );
    expect(response.headers.get("set-cookie")).toContain(
      `soji_guest_checkout_browser=${browserId}`
    );
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=lax");
    expect(response.headers.get("set-cookie")).toContain(
      "soji_guest_checkout_request=00000000-0000-4000-8000-000000000904"
    );
  });

  it("maps the service-role guest limiter response", async () => {
    guestMocks.rpc.mockResolvedValue({
      data: [
        {
          allowed: false,
          remaining: 0,
          reset_at: "2026-08-24T06:10:00.000Z"
        }
      ],
      error: null
    });

    await expect(
      consumeGuestMembershipCheckoutRateLimit("a".repeat(64), "b".repeat(64))
    ).resolves.toEqual({
      allowed: false,
      ok: true,
      remaining: 0,
      resetAt: "2026-08-24T06:10:00.000Z"
    });
    expect(guestMocks.rpc).toHaveBeenCalledWith(
      "consume_guest_full_access_checkout_rate_limit",
      {
        p_browser_hmac: "a".repeat(64),
        p_network_hmac: "b".repeat(64)
      }
    );
  });

  it("uses Vercel's trusted client address for the network limiter", () => {
    vi.stubEnv("VERCEL", "1");
    const request = new NextRequest("https://soji.example/pricing", {
      headers: { "x-vercel-forwarded-for": "203.0.113.9" }
    });

    expect(getGuestCheckoutNetwork(request)).toMatch(/^[a-f0-9]{64}$/);
    vi.unstubAllEnvs();
  });

  it("accepts only the fixed server-side guest reservation contract", async () => {
    guestMocks.rpc.mockResolvedValue({
      data: [
        {
          checkout_id: "00000000-0000-4000-8000-000000000903",
          expected_amount_cents: 9_900,
          expected_currency: "usd",
          outcome: "reserved",
          stripe_expires_at: "2026-08-24T06:35:00.000Z"
        }
      ],
      error: null
    });

    await expect(
      reserveGuestMembershipCheckout({
        browserHmac: "b".repeat(64),
        planId: "tier_1",
        requestId: "00000000-0000-4000-8000-000000000904"
      })
    ).resolves.toMatchObject({
      checkoutId: "00000000-0000-4000-8000-000000000903",
      ok: true,
      outcome: "reserved"
    });
  });

  it("claims by verified-email HMAC without sending raw email to Supabase", async () => {
    guestMocks.rpc.mockResolvedValue({
      data: [{ effective_tier: "tier_1", outcome: "claimed" }],
      error: null
    });

    await expect(
      claimGuestMembershipCheckout({
        browserHmac: "c".repeat(64),
        email: " Buyer@Example.com ",
        requestId: "00000000-0000-4000-8000-000000000904",
        userId
      })
    ).resolves.toEqual({ ok: true, status: "claimed" });

    const [, args] = guestMocks.rpc.mock.calls[0] as [
      string,
      Record<string, unknown>
    ];
    expect(args.p_verified_email_hmac).toMatch(/^[a-f0-9]{64}$/);
    expect(args.p_request_id).toBe(
      "00000000-0000-4000-8000-000000000904"
    );
    expect(JSON.stringify(args)).not.toContain("buyer@example.com");
  });

  it("records only an email HMAC for a verified Stripe payment", async () => {
    guestMocks.rpc.mockResolvedValue({
      data: "paid_unclaimed",
      error: null
    });

    await expect(
      recordGuestMembershipPayment({
        amountTotal: 9_900,
        currency: "usd",
        email: "buyer@example.com",
        observedAt: "2026-08-24T06:00:00.000Z",
        paymentId: "pi_guest",
        paymentStatus: "paid",
        sessionId: "cs_test_guest"
      })
    ).resolves.toEqual({ ok: true, status: "paid_unclaimed" });

    const [, args] = guestMocks.rpc.mock.calls[0] as [
      string,
      Record<string, unknown>
    ];
    expect(args.p_email_hmac).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(args)).not.toContain("buyer@example.com");
  });
});
