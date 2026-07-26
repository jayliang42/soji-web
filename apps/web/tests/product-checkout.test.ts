import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const checkoutMocks = vi.hoisted(() => ({
  reportOperationalError: vi.fn()
}));

vi.mock("@/lib/observability", () => ({
  reportOperationalError: checkoutMocks.reportOperationalError
}));

import { claimProductCheckout } from "@/lib/product-checkout";

function claimResult(result: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(result);
  const rpc = vi.fn(() => ({ single }));
  return { client: { rpc } as unknown as SupabaseClient, rpc };
}

describe("product checkout claim", () => {
  beforeEach(() => {
    checkoutMocks.reportOperationalError.mockReset();
  });

  it.each(["claimed", "checkout_in_progress"] as const)(
    "maps a valid %s result and preserves its expiry",
    async (outcome) => {
      const { client, rpc } = claimResult({
        data: {
          expires_at: "2026-07-14T12:35:00.000Z",
          outcome
        },
        error: null
      });

      await expect(
        claimProductCheckout(client, "product-id", "request-id")
      ).resolves.toEqual({
        expiresAt: "2026-07-14T12:35:00.000Z",
        ok: true,
        outcome
      });
      expect(rpc).toHaveBeenCalledWith("claim_product_checkout", {
        p_product_id: "product-id",
        p_request_id: "request-id"
      });
    }
  );

  it("maps an existing paid purchase without requiring an expiry", async () => {
    const { client } = claimResult({
      data: { expires_at: null, outcome: "already_purchased" },
      error: null
    });

    await expect(
      claimProductCheckout(client, "product-id", "request-id")
    ).resolves.toEqual({
      expiresAt: null,
      ok: true,
      outcome: "already_purchased"
    });
  });

  it.each([
    [{ data: null, error: { message: "function unavailable" } }, "function unavailable"],
    [
      { data: { expires_at: null, outcome: "claimed" }, error: null },
      "product_checkout_expiry_invalid"
    ],
    [
      { data: { expires_at: null, outcome: "unexpected" }, error: null },
      "product_checkout_claim_invalid"
    ]
  ])("fails closed for an invalid claim response", async (result, reason) => {
    const { client } = claimResult(result);

    await expect(
      claimProductCheckout(client, "product-id", "request-id")
    ).resolves.toEqual({ ok: false, reason });
    expect(checkoutMocks.reportOperationalError).toHaveBeenCalled();
  });
});
