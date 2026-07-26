import type { AppSupabaseClient } from "@/lib/supabase/client-types";

export type CheckoutRateLimitAction = "product" | "subscription";

export async function consumeCheckoutRateLimit(
  supabase: AppSupabaseClient,
  action: CheckoutRateLimitAction
) {
  const { data, error } = await supabase
    .rpc("consume_checkout_rate_limit", { p_action: action })
    .single();

  if (error || !data) {
    return {
      ok: false,
      reason: error?.message ?? "checkout_rate_limit_unavailable"
    } as const;
  }

  return {
    allowed: data.allowed,
    ok: true,
    remaining: data.remaining,
    resetAt: data.reset_at
  } as const;
}

export function getRetryAfterSeconds(resetAt: string, now = Date.now()) {
  const resetTime = Date.parse(resetAt);
  if (!Number.isFinite(resetTime)) {
    return 600;
  }

  return Math.min(Math.max(Math.ceil((resetTime - now) / 1000), 1), 600);
}
