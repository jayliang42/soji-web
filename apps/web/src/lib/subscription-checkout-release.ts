import type { AppSupabaseClient } from "@/lib/supabase/client-types";
import { reportOperationalError } from "@/lib/observability";

export async function releaseSubscriptionCheckout(
  supabase: AppSupabaseClient
) {
  const { error } = await supabase.rpc("release_subscription_checkout");

  if (error) {
    await reportOperationalError(
      "stripe.checkout.subscription_release_failed",
      error
    );
    return { ok: false as const, reason: error.message };
  }

  return { ok: true as const };
}
