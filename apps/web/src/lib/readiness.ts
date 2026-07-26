import { membershipPlans } from "@soji/domain";
import { getBillingDeliveryReadiness } from "@/lib/billing-readiness";
import { getStripeClient } from "@/lib/stripe";
import { validateStripeMembershipCatalog } from "@/lib/stripe-price-validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface OperationalReadiness {
  stripeMembershipPrices: boolean;
  supabasePublicOperational: boolean;
  supabaseServiceRoleOperational: boolean;
}

const emptyReadiness: OperationalReadiness = {
  stripeMembershipPrices: false,
  supabasePublicOperational: false,
  supabaseServiceRoleOperational: false
};

export const READINESS_CACHE_MS = 60_000;

let readinessCache:
  | {
      expiresAt: number;
      result: Promise<OperationalReadiness>;
    }
  | undefined;

export async function probeOperationalReadiness(): Promise<OperationalReadiness> {
  const [supabase, billingDelivery] = await Promise.all([
    createSupabaseServerClient(),
    getBillingDeliveryReadiness()
  ]);
  const stripe = getStripeClient();

  const publicProbe = supabase
    ? supabase.from("membership_plans").select("id").limit(1)
    : Promise.resolve({ error: new Error("supabase_public_not_configured") });
  const stripeProbe = stripe
    ? validateStripeMembershipCatalog({ plans: membershipPlans, stripe })
    : Promise.resolve({ ok: false as const });

  try {
    const [publicResult, stripeResult] = await Promise.all([
      publicProbe,
      stripeProbe
    ]);

    return {
      stripeMembershipPrices: stripeResult.ok,
      supabasePublicOperational: !publicResult.error,
      supabaseServiceRoleOperational:
        billingDelivery.supabaseServiceRoleOperational
    };
  } catch {
    return emptyReadiness;
  }
}

export function getOperationalReadiness(now = Date.now()) {
  if (readinessCache && readinessCache.expiresAt > now) {
    return readinessCache.result;
  }

  const result = probeOperationalReadiness();
  readinessCache = {
    expiresAt: now + READINESS_CACHE_MS,
    result
  };
  return result;
}
