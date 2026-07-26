import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const checkoutMocks = vi.hoisted(() => ({
  reportOperationalError: vi.fn()
}));

vi.mock("@/lib/observability", () => ({
  reportOperationalError: checkoutMocks.reportOperationalError
}));

import { claimSubscriptionCheckout } from "@/lib/subscription-checkout";

function claimResult(result: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(result);
  const rpc = vi.fn(() => ({ single }));
  return { client: { rpc } as unknown as SupabaseClient, rpc };
}

describe("subscription checkout claim", () => {
  beforeEach(() => {
    checkoutMocks.reportOperationalError.mockReset();
  });

  it("maps a valid claimed result and preserves its expiry", async () => {
    const { client, rpc } = claimResult({
      data: {
        expires_at: "2026-07-14T12:35:00.000Z",
        outcome: "claimed"
      },
      error: null
    });

    await expect(
      claimSubscriptionCheckout(client, "request-id")
    ).resolves.toEqual({
      expiresAt: "2026-07-14T12:35:00.000Z",
      ok: true,
      outcome: "claimed"
    });
    expect(rpc).toHaveBeenCalledWith("claim_subscription_checkout", {
      p_request_id: "request-id"
    });
  });

  it.each([
    [{ data: null, error: { message: "function unavailable" } }, "function unavailable"],
    [
      { data: { expires_at: null, outcome: "claimed" }, error: null },
      "subscription_checkout_expiry_invalid"
    ],
    [
      { data: { expires_at: null, outcome: "unexpected" }, error: null },
      "subscription_checkout_claim_invalid"
    ]
  ])("fails closed for an invalid claim response", async (result, reason) => {
    const { client } = claimResult(result);

    await expect(
      claimSubscriptionCheckout(client, "request-id")
    ).resolves.toEqual({ ok: false, reason });
    expect(checkoutMocks.reportOperationalError).toHaveBeenCalled();
  });
});
