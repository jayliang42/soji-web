import type Stripe from "stripe";
import type { MembershipPlan, MembershipTier } from "@soji/types";

export type StripeProductPriceFailureReason =
  | "stripe_price_amount_mismatch"
  | "stripe_price_currency_mismatch"
  | "stripe_price_inactive"
  | "stripe_price_lookup_failed"
  | "stripe_price_missing"
  | "stripe_price_must_be_one_time"
  | "stripe_price_not_configured";

type StripeProductPriceValidation =
  | { ok: true }
  | {
      error?: unknown;
      ok: false;
      reason: StripeProductPriceFailureReason;
      status: number;
    };

export type StripeMembershipCatalogFailureReason =
  | "stripe_membership_price_amount_mismatch"
  | "stripe_membership_price_currency_mismatch"
  | "stripe_membership_price_inactive"
  | "stripe_membership_price_lookup_failed"
  | "stripe_membership_price_missing"
  | "stripe_membership_price_must_be_one_time"
  | "stripe_membership_price_must_be_monthly";

export type StripeMembershipCatalogValidation =
  | {
      ok: true;
      priceIds: Partial<Record<MembershipTier, string>>;
    }
  | {
      error?: unknown;
      ok: false;
      reason: StripeMembershipCatalogFailureReason;
    };

export async function validateStripeMembershipCatalog({
  plans,
  stripe
}: {
  plans: MembershipPlan[];
  stripe: Stripe;
}): Promise<StripeMembershipCatalogValidation> {
  const lookupKeys = plans.flatMap((plan) =>
    plan.stripePriceLookupKey ? [plan.stripePriceLookupKey] : []
  );

  let prices: Stripe.Price[];
  try {
    const response = await stripe.prices.list({
      active: true,
      limit: 100,
      lookup_keys: lookupKeys
    });
    prices = response.data;
  } catch (error) {
    return {
      error,
      ok: false,
      reason: "stripe_membership_price_lookup_failed"
    };
  }

  const priceIds: Partial<Record<MembershipTier, string>> = {};
  for (const plan of plans) {
    const price = prices.find(
      (candidate) => candidate.lookup_key === plan.stripePriceLookupKey
    );

    if (!price) {
      return { ok: false, reason: "stripe_membership_price_missing" };
    }
    if (!price.active) {
      return { ok: false, reason: "stripe_membership_price_inactive" };
    }
    if (price.currency.toLowerCase() !== "usd") {
      return {
        ok: false,
        reason: "stripe_membership_price_currency_mismatch"
      };
    }
    if (price.unit_amount !== plan.price * 100) {
      return {
        ok: false,
        reason: "stripe_membership_price_amount_mismatch"
      };
    }
    if (plan.billingType === "one_time" && price.type !== "one_time") {
      return {
        ok: false,
        reason: "stripe_membership_price_must_be_one_time"
      };
    }
    if (
      plan.billingType === "recurring" &&
      (price.type !== "recurring" ||
        price.recurring?.interval !== "month" ||
        price.recurring.interval_count !== 1)
    ) {
      return {
        ok: false,
        reason: "stripe_membership_price_must_be_monthly"
      };
    }

    priceIds[plan.id] = price.id;
  }

  return { ok: true, priceIds };
}

export async function validateStripeProductPrice({
  expectedAmount,
  isActive,
  priceId,
  stripe
}: {
  expectedAmount: number;
  isActive: boolean;
  priceId: string;
  stripe: Stripe | null;
}): Promise<StripeProductPriceValidation> {
  if (!priceId) {
    return isActive
      ? { ok: false, reason: "stripe_price_missing", status: 400 }
      : { ok: true };
  }

  if (!stripe) {
    return {
      ok: false,
      reason: "stripe_price_not_configured",
      status: 501
    };
  }

  let price: Stripe.Price;
  try {
    price = await stripe.prices.retrieve(priceId);
  } catch (error) {
    return {
      error,
      ok: false,
      reason: "stripe_price_lookup_failed",
      status: 502
    };
  }

  if (!price.active) {
    return { ok: false, reason: "stripe_price_inactive", status: 400 };
  }
  if (price.type !== "one_time") {
    return {
      ok: false,
      reason: "stripe_price_must_be_one_time",
      status: 400
    };
  }
  if (price.currency.toLowerCase() !== "usd") {
    return {
      ok: false,
      reason: "stripe_price_currency_mismatch",
      status: 400
    };
  }
  if (price.unit_amount !== expectedAmount) {
    return {
      ok: false,
      reason: "stripe_price_amount_mismatch",
      status: 400
    };
  }

  return { ok: true };
}
