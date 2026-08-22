import type { AppSupabaseClient } from "@/lib/supabase/client-types";
import { reportOperationalError } from "@/lib/observability";

export async function releaseProductCheckout(
  supabase: AppSupabaseClient,
  productSlug: string,
  checkoutExpiresAt: string
) {
  const { data, error } = await supabase.rpc("release_product_checkout", {
    p_checkout_expires_at: checkoutExpiresAt,
    p_product_slug: productSlug
  });

  if (error || typeof data !== "boolean") {
    await reportOperationalError(
      "stripe.checkout.product_release_failed",
      error ?? new Error("product_checkout_release_invalid"),
      { productSlug }
    );
    return {
      ok: false as const,
      reason: error?.message ?? "product_checkout_release_invalid"
    };
  }

  return { ok: true as const, released: data };
}
