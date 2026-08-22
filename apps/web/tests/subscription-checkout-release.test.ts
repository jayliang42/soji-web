import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const releaseMocks = vi.hoisted(() => ({
  reportOperationalError: vi.fn()
}));

vi.mock("@/lib/observability", () => ({
  reportOperationalError: releaseMocks.reportOperationalError
}));

import { releaseSubscriptionCheckout } from "@/lib/subscription-checkout-release";

const checkoutExpiresAt = "2026-07-13T12:15:00.000Z";

describe("cancelled membership checkout release", () => {
  beforeEach(() => releaseMocks.reportOperationalError.mockReset());

  it("releases only the matching authenticated checkout claim", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    const client = { rpc } as unknown as SupabaseClient;

    await expect(
      releaseSubscriptionCheckout(client, checkoutExpiresAt)
    ).resolves.toEqual({ ok: true, released: true });
    expect(rpc).toHaveBeenCalledWith("release_subscription_checkout", {
      p_checkout_expires_at: checkoutExpiresAt
    });
  });

  it("fails closed when the guarded release RPC is unavailable", async () => {
    const error = { message: "rpc unavailable" };
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: null, error })
    } as unknown as SupabaseClient;

    await expect(
      releaseSubscriptionCheckout(client, checkoutExpiresAt)
    ).resolves.toEqual({ ok: false, reason: "rpc unavailable" });
    expect(releaseMocks.reportOperationalError).toHaveBeenCalledWith(
      "stripe.checkout.subscription_release_failed",
      error
    );
  });
});
