import { reportOperationalError } from "@/lib/observability";
import type { AppSupabaseClient } from "@/lib/supabase/client-types";

export async function getExistingStripeCustomerId(
  supabase: AppSupabaseClient,
  userId: string
) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("provider_customer_id")
    .eq("user_id", userId)
    .eq("provider", "stripe")
    .not("provider_customer_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    await reportOperationalError("stripe.customer_lookup_failed", error, {
      userId
    });
    throw new Error("stripe_customer_lookup_failed");
  }

  return typeof data?.provider_customer_id === "string"
    ? data.provider_customer_id
    : null;
}
