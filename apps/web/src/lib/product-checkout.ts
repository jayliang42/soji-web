import type { AppSupabaseClient } from "@/lib/supabase/client-types";
import { reportOperationalError } from "@/lib/observability";

const claimOutcomes = new Set([
  "already_purchased",
  "checkout_in_progress",
  "claimed"
]);

export type ProductCheckoutClaim =
  | {
      expiresAt: string;
      ok: true;
      outcome: "claimed" | "checkout_in_progress";
    }
  | {
      expiresAt: null;
      ok: true;
      outcome: "already_purchased";
    }
  | {
      ok: false;
      reason: string;
    };

export async function claimProductCheckout(
  supabase: AppSupabaseClient,
  productId: string,
  requestId: string
): Promise<ProductCheckoutClaim> {
  const { data, error } = await supabase
    .rpc("claim_product_checkout", {
      p_product_id: productId,
      p_request_id: requestId
    })
    .single();

  if (error || !data || !claimOutcomes.has(data.outcome)) {
    await reportOperationalError(
      "stripe.checkout.product_claim_failed",
      error ?? new Error("product_checkout_claim_invalid"),
      { productId, requestId }
    );
    return {
      ok: false,
      reason: error?.message ?? "product_checkout_claim_invalid"
    };
  }

  if (data.outcome === "already_purchased") {
    return { expiresAt: null, ok: true, outcome: "already_purchased" };
  }

  if (!data.expires_at || !Number.isFinite(Date.parse(data.expires_at))) {
    await reportOperationalError(
      "stripe.checkout.product_claim_failed",
      new Error("product_checkout_expiry_invalid"),
      { productId, requestId }
    );
    return { ok: false, reason: "product_checkout_expiry_invalid" };
  }

  return {
    expiresAt: data.expires_at,
    ok: true,
    outcome: data.outcome as "claimed" | "checkout_in_progress"
  };
}
