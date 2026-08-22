import type { AppSupabaseClient } from "@/lib/supabase/client-types";
import { reportOperationalError } from "@/lib/observability";

export async function releaseSubscriptionCheckout(
  supabase: AppSupabaseClient,
  checkoutExpiresAt: string
) {
  const { data, error } = await supabase.rpc("release_subscription_checkout", {
    p_checkout_expires_at: checkoutExpiresAt
  });

  if (error || typeof data !== "boolean") {
    await reportOperationalError(
      "stripe.checkout.subscription_release_failed",
      error ?? new Error("subscription_checkout_release_invalid")
    );
    return {
      ok: false as const,
      reason: error?.message ?? "subscription_checkout_release_invalid"
    };
  }

  return { ok: true as const, released: data };
}
