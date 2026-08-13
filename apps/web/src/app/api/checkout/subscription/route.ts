import { NextRequest, NextResponse } from "next/server";
import { getPlanByTier } from "@soji/domain";
import type { MembershipPlan } from "@soji/types";
import {
  getBillingDeliveryReadiness,
  isBillingDeliveryReady
} from "@/lib/billing-readiness";
import { subscriptionCheckoutPayloadSchema } from "@/lib/checkout";
import { getCheckoutCustomerPolicyReadiness } from "@/lib/customer-policy";
import { getSiteUrl } from "@/lib/env";
import { reportOperationalError } from "@/lib/observability";
import {
  consumeCheckoutRateLimit,
  getRetryAfterSeconds
} from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isMissingAuthSession } from "@/lib/supabase/auth-errors";
import { getStripeClient } from "@/lib/stripe";
import { getExistingStripeCustomerId } from "@/lib/stripe-customer";
import { validateStripeMembershipCatalog } from "@/lib/stripe-price-validation";
import { claimSubscriptionCheckout } from "@/lib/subscription-checkout";

async function resolvePriceId(plan: MembershipPlan) {
  if (!plan.stripePriceLookupKey) {
    return null;
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return null;
  }

  const validation = await validateStripeMembershipCatalog({
    plans: [plan],
    stripe
  });
  return validation.ok ? validation.priceIds[plan.id] ?? null : null;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = subscriptionCheckoutPayloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!getCheckoutCustomerPolicyReadiness().ready) {
    return NextResponse.json(
      { error: "customer_policy_not_ready" },
      { status: 503 }
    );
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured yet." },
      { status: 501 }
    );
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is required before starting checkout." },
      { status: 501 }
    );
  }

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError && !isMissingAuthSession(authError)) {
    await reportOperationalError("stripe.checkout.auth_lookup_failed", authError, {
      checkoutMode: "subscription"
    });
    return NextResponse.json(
      { error: "Authentication is temporarily unavailable." },
      { status: 503 }
    );
  }

  if (!user) {
    return NextResponse.json(
      { error: "Sign in before starting checkout." },
      { status: 401 }
    );
  }

  const plan = getPlanByTier(parsed.data.planId);
  if (!plan) {
    return NextResponse.json({ error: "Unknown membership plan." }, { status: 400 });
  }

  if (!user.email) {
    return NextResponse.json(
      { error: "The signed-in account needs an email address before checkout." },
      { status: 400 }
    );
  }

  const siteUrl = getSiteUrl();
  if (!siteUrl) {
    return NextResponse.json(
      { error: "Checkout return URLs are not configured." },
      { status: 503 }
    );
  }

  const billingDelivery = await getBillingDeliveryReadiness();
  if (!isBillingDeliveryReady(billingDelivery)) {
    return NextResponse.json(
      { error: "Checkout is temporarily unavailable." },
      { status: 503 }
    );
  }

  const rateLimit = await consumeCheckoutRateLimit(supabase, "subscription");
  if (!rateLimit.ok) {
    await reportOperationalError(
      "stripe.checkout.rate_limit_unavailable",
      new Error(rateLimit.reason),
      { checkoutMode: "subscription" }
    );
    return NextResponse.json(
      { error: "Checkout protection is temporarily unavailable." },
      { status: 503 }
    );
  }
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many checkout attempts. Try again later." },
      {
        headers: {
          "Retry-After": String(getRetryAfterSeconds(rateLimit.resetAt))
        },
        status: 429
      }
    );
  }

  let priceId: string | null;
  try {
    priceId = await resolvePriceId(plan);
  } catch (error) {
    await reportOperationalError("stripe.checkout.price_lookup_failed", error, {
      planId: plan.id
    });
    return NextResponse.json(
      { error: "Checkout could not be started." },
      { status: 502 }
    );
  }

  if (!priceId) {
    return NextResponse.json(
      { error: "Membership checkout is temporarily unavailable." },
      { status: 503 }
    );
  }

  let customerId: string | null;
  try {
    customerId = await getExistingStripeCustomerId(supabase, user.id);
  } catch {
    return NextResponse.json(
      { error: "Billing account lookup is temporarily unavailable." },
      { status: 503 }
    );
  }

  const metadata = {
    lookupKey: plan.stripePriceLookupKey ?? "",
    planId: plan.id,
    userId: user.id
  };

  const claim = await claimSubscriptionCheckout(supabase, parsed.data.requestId);
  if (!claim.ok) {
    return NextResponse.json(
      { error: "Checkout protection is temporarily unavailable." },
      { status: 503 }
    );
  }
  if (claim.outcome === "existing_subscription") {
    return NextResponse.json(
      { error: "An existing membership must be managed from your account." },
      { status: 409 }
    );
  }
  if (claim.outcome === "checkout_in_progress") {
    return NextResponse.json(
      {
        error:
          "A membership checkout is already in progress. Return to it or try again after it expires."
      },
      { status: 409 }
    );
  }

  const checkoutExpiresAt = Math.floor(Date.parse(claim.expiresAt) / 1000);

  let session;
  try {
    session = await stripe.checkout.sessions.create(
      {
        allow_promotion_codes: true,
        client_reference_id: user.id,
        consent_collection: {
          terms_of_service: "required"
        },
        mode: "subscription",
        ...(customerId
          ? { customer: customerId }
          : { customer_email: user.email }),
        line_items: [{ price: priceId, quantity: 1 }],
        metadata,
        custom_text: {
          submit: {
            message:
              "By subscribing, you agree to the GS学院 Terms. Your membership renews monthly until canceled."
          }
        },
        expires_at: checkoutExpiresAt,
        subscription_data: {
          metadata
        },
        success_url: `${siteUrl}/account?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/pricing?checkout=cancelled`
      },
      {
        idempotencyKey: `soji:checkout:subscription:${user.id}:${parsed.data.requestId}`
      }
    );
  } catch (error) {
    await reportOperationalError("stripe.checkout.session_create_failed", error, {
      checkoutMode: "subscription",
      planId: plan.id
    });
    return NextResponse.json(
      { error: "Checkout could not be started." },
      { status: 502 }
    );
  }

  if (!session.url) {
    await reportOperationalError(
      "stripe.checkout.session_url_missing",
      new Error("stripe_checkout_session_url_missing"),
      { checkoutMode: "subscription", planId: plan.id }
    );
    return NextResponse.json(
      { error: "Checkout could not be started." },
      { status: 502 }
    );
  }

  return NextResponse.json({ url: session.url });
}
