import type { AppSupabaseClient } from "@/lib/supabase/client-types";
import { reportOperationalError } from "@/lib/observability";

const claimOutcomes = new Set([
  "claimed",
  "checkout_in_progress",
  "existing_subscription"
]);

export type SubscriptionCheckoutClaim =
  | {
      expiresAt: string;
      ok: true;
      outcome: "claimed";
    }
  | {
      expiresAt: string;
      ok: true;
      outcome: "checkout_in_progress";
    }
  | {
      expiresAt: null;
      ok: true;
      outcome: "existing_subscription";
    }
  | {
      ok: false;
      reason: string;
    };

export async function claimSubscriptionCheckout(
  supabase: AppSupabaseClient,
  requestId: string
): Promise<SubscriptionCheckoutClaim> {
  const { data, error } = await supabase
    .rpc("claim_subscription_checkout", { p_request_id: requestId })
    .single();

  if (error || !data || !claimOutcomes.has(data.outcome)) {
    await reportOperationalError(
      "stripe.checkout.subscription_claim_failed",
      error ?? new Error("subscription_checkout_claim_invalid"),
      { requestId }
    );
    return {
      ok: false,
      reason: error?.message ?? "subscription_checkout_claim_invalid"
    };
  }

  if (data.outcome === "claimed") {
    if (!data.expires_at || !Number.isFinite(Date.parse(data.expires_at))) {
      await reportOperationalError(
        "stripe.checkout.subscription_claim_failed",
        new Error("subscription_checkout_expiry_invalid"),
        { requestId }
      );
      return { ok: false, reason: "subscription_checkout_expiry_invalid" };
    }

    return {
      expiresAt: data.expires_at,
      ok: true,
      outcome: "claimed"
    };
  }

  if (data.outcome === "checkout_in_progress") {
    if (!data.expires_at || !Number.isFinite(Date.parse(data.expires_at))) {
      await reportOperationalError(
        "stripe.checkout.subscription_claim_failed",
        new Error("subscription_checkout_expiry_invalid"),
        { requestId }
      );
      return { ok: false, reason: "subscription_checkout_expiry_invalid" };
    }

    return {
      expiresAt: data.expires_at,
      ok: true,
      outcome: "checkout_in_progress"
    };
  }

  return {
    expiresAt: null,
    ok: true,
    outcome: "existing_subscription"
  };
}
