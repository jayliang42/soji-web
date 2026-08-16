import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const releaseMocks = vi.hoisted(() => ({
  reportOperationalError: vi.fn()
}));

vi.mock("@/lib/observability", () => ({
  reportOperationalError: releaseMocks.reportOperationalError
}));

import { releaseProductCheckout } from "@/lib/product-checkout-release";

describe("cancelled product checkout release", () => {
  beforeEach(() => releaseMocks.reportOperationalError.mockReset());

  it("releases only the authenticated user's named product claim", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    const client = { rpc } as unknown as SupabaseClient;

    await expect(
      releaseProductCheckout(client, "case-study-single")
    ).resolves.toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith("release_product_checkout", {
      p_product_slug: "case-study-single"
    });
  });

  it("reports and fails closed when the release RPC is unavailable", async () => {
    const error = { message: "rpc unavailable" };
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: null, error })
    } as unknown as SupabaseClient;

    await expect(
      releaseProductCheckout(client, "case-study-single")
    ).resolves.toEqual({ ok: false, reason: "rpc unavailable" });
    expect(releaseMocks.reportOperationalError).toHaveBeenCalledWith(
      "stripe.checkout.product_release_failed",
      error,
      { productSlug: "case-study-single" }
    );
  });
});
