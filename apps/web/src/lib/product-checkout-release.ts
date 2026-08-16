import type { AppSupabaseClient } from "@/lib/supabase/client-types";
import { reportOperationalError } from "@/lib/observability";

export async function releaseProductCheckout(
  supabase: AppSupabaseClient,
  productSlug: string
) {
  const { error } = await supabase.rpc("release_product_checkout", {
    p_product_slug: productSlug
  });

  if (error) {
    await reportOperationalError(
      "stripe.checkout.product_release_failed",
      error,
      { productSlug }
    );
    return { ok: false as const, reason: error.message };
  }

  return { ok: true as const };
}
