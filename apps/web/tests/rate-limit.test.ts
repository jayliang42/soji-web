import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  consumeCheckoutRateLimit,
  getRetryAfterSeconds
} from "@/lib/rate-limit";

function supabaseResult(result: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(result);
  const rpc = vi.fn(() => ({ single }));
  return { client: { rpc } as unknown as SupabaseClient, rpc, single };
}

describe("checkout rate limit", () => {
  it("maps the atomic RPC result", async () => {
    const { client, rpc } = supabaseResult({
      data: {
        allowed: true,
        remaining: 3,
        reset_at: "2026-07-14T12:10:00.000Z"
      },
      error: null
    });

    await expect(consumeCheckoutRateLimit(client, "subscription")).resolves.toEqual({
      allowed: true,
      ok: true,
      remaining: 3,
      resetAt: "2026-07-14T12:10:00.000Z"
    });
    expect(rpc).toHaveBeenCalledWith("consume_checkout_rate_limit", {
      p_action: "subscription"
    });
  });

  it("fails closed when the RPC is missing or unavailable", async () => {
    const { client } = supabaseResult({
      data: null,
      error: { message: "function does not exist" }
    });

    await expect(consumeCheckoutRateLimit(client, "product")).resolves.toEqual({
      ok: false,
      reason: "function does not exist"
    });
  });

  it("calculates a bounded Retry-After value", () => {
    const now = Date.parse("2026-07-14T12:00:00.000Z");
    expect(getRetryAfterSeconds("2026-07-14T12:02:01.000Z", now)).toBe(121);
    expect(getRetryAfterSeconds("invalid", now)).toBe(600);
    expect(getRetryAfterSeconds("2026-07-14T11:00:00.000Z", now)).toBe(1);
  });
});
