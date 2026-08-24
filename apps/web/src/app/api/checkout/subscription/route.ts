import { NextRequest, NextResponse } from "next/server";
import { getPlanByTier } from "@soji/domain";
import type { MembershipPlan } from "@soji/types";
import {
  getBillingDeliveryReadiness,
  isBillingDeliveryReady
} from "@/lib/billing-readiness";
import { subscriptionCheckoutPayloadSchema } from "@/lib/checkout";
import { getCheckoutCustomerPolicyReadiness } from "@/lib/customer-policy";
import { getCheckoutReturnSiteUrl } from "@/lib/env";
import {
  attachGuestMembershipCheckoutSession,
  consumeGuestMembershipCheckoutRateLimit,
  getGuestCheckoutBrowser,
  reserveGuestMembershipCheckout,
  setGuestCheckoutBrowserCookie
} from "@/lib/guest-membership-checkout";
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

async function createGuestMembershipCheckout({
  plan,
  request,
  requestId,
  siteUrl,
  stripe
}: {
  plan: MembershipPlan;
  request: NextRequest;
  requestId: string;
  siteUrl: string;
  stripe: NonNullable<ReturnType<typeof getStripeClient>>;
}) {
  const browser = getGuestCheckoutBrowser(request);
  if (!browser) {
    return NextResponse.json(
      { error: "Checkout protection is temporarily unavailable." },
      { status: 503 }
    );
  }

  const rateLimit = await consumeGuestMembershipCheckoutRateLimit(
    browser.browserHmac
  );
  if (!rateLimit.ok) {
    await reportOperationalError(
      "stripe.checkout.guest_rate_limit_unavailable",
      new Error(rateLimit.reason),
      { checkoutMode: "guest_membership" }
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
      checkoutMode: "guest_membership",
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

  const reservation = await reserveGuestMembershipCheckout({
    browserHmac: browser.browserHmac,
    planId: plan.id,
    requestId
  });
  if (!reservation.ok) {
    await reportOperationalError(
      "stripe.checkout.guest_reservation_failed",
      new Error(reservation.reason),
      { checkoutMode: "guest_membership", planId: plan.id }
    );
    return NextResponse.json(
      { error: "Checkout protection is temporarily unavailable." },
      { status: 503 }
    );
  }

  const checkoutExpiresAt = Math.floor(
    Date.parse(reservation.expiresAt) / 1000
  );
  if (!Number.isSafeInteger(checkoutExpiresAt) || checkoutExpiresAt <= 0) {
    await reportOperationalError(
      "stripe.checkout.guest_expiry_invalid",
      new Error("guest_checkout_expiry_invalid"),
      { checkoutMode: "guest_membership", planId: plan.id }
    );
    return NextResponse.json(
      { error: "Checkout protection is temporarily unavailable." },
      { status: 503 }
    );
  }

  const metadata = {
    guestCheckoutId: reservation.checkoutId,
    kind: "guest_membership",
    lookupKey: plan.stripePriceLookupKey ?? "",
    planId: plan.id
  };

  let session;
  try {
    session = await stripe.checkout.sessions.create(
      {
        allow_promotion_codes: true,
        cancel_url: `${siteUrl}/pricing?checkout=cancelled&guest=1`,
        client_reference_id: reservation.checkoutId,
        consent_collection: { terms_of_service: "required" },
        custom_text: {
          submit: {
            message:
              "By purchasing, you agree to the GS学院 Terms. This is a one-time $99 payment."
          }
        },
        expires_at: checkoutExpiresAt,
        line_items: [{ price: priceId, quantity: 1 }],
        metadata,
        mode: "payment",
        payment_intent_data: { metadata },
        success_url: `${siteUrl}/checkout/claim`
      },
      {
        idempotencyKey: `soji:checkout:guest-membership:${reservation.checkoutId}:${requestId}`
      }
    );
  } catch (error) {
    await reportOperationalError("stripe.checkout.session_create_failed", error, {
      checkoutMode: "guest_membership",
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
      { checkoutMode: "guest_membership", planId: plan.id }
    );
    return NextResponse.json(
      { error: "Checkout could not be started." },
      { status: 502 }
    );
  }

  const sessionExpiresAt = new Date(session.expires_at * 1000).toISOString();
  const attachment = await attachGuestMembershipCheckoutSession({
    browserHmac: browser.browserHmac,
    checkoutId: reservation.checkoutId,
    checkoutSessionId: session.id,
    requestId,
    stripeExpiresAt: sessionExpiresAt
  });
  if (!attachment.ok) {
    await reportOperationalError(
      "stripe.checkout.guest_attachment_failed",
      new Error(attachment.reason),
      { checkoutMode: "guest_membership", planId: plan.id }
    );
    return NextResponse.json(
      { error: "Checkout protection is temporarily unavailable." },
      { status: 503 }
    );
  }

  const response = NextResponse.json({ sessionId: session.id, url: session.url });
  setGuestCheckoutBrowserCookie(response, browser.browserId);
  return response;
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
      checkoutMode: "membership"
    });
    return NextResponse.json(
      { error: "Authentication is temporarily unavailable." },
      { status: 503 }
    );
  }

  const plan = getPlanByTier(parsed.data.planId);
  if (!plan) {
    return NextResponse.json({ error: "Unknown membership plan." }, { status: 400 });
  }

  const siteUrl = getCheckoutReturnSiteUrl(request.url);
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

  if (!user) {
    return createGuestMembershipCheckout({
      plan,
      request,
      requestId: parsed.data.requestId,
      siteUrl,
      stripe
    });
  }

  if (!user.email) {
    return NextResponse.json(
      { error: "The signed-in account needs an email address before checkout." },
      { status: 400 }
    );
  }

  const rateLimit = await consumeCheckoutRateLimit(supabase, "subscription");
  if (!rateLimit.ok) {
    await reportOperationalError(
      "stripe.checkout.rate_limit_unavailable",
      new Error(rateLimit.reason),
      { checkoutMode: "membership" }
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
    kind: "membership",
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
      { error: "An existing Full Access purchase is already attached to this account." },
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
        consent_collection: { terms_of_service: "required" },
        mode: "payment",
        ...(customerId
          ? { customer: customerId }
          : { customer_email: user.email }),
        line_items: [{ price: priceId, quantity: 1 }],
        metadata,
        custom_text: {
          submit: {
            message:
              "By purchasing, you agree to the GS学院 Terms. This is a one-time $99 payment."
          }
        },
        expires_at: checkoutExpiresAt,
        payment_intent_data: {
          metadata: {
            ...metadata,
            kind: "membership"
          }
        },
        success_url: `${siteUrl}/account?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/pricing?checkout=cancelled`
      },
      {
        idempotencyKey: `soji:checkout:membership:${user.id}:${parsed.data.requestId}`
      }
    );
  } catch (error) {
    await reportOperationalError("stripe.checkout.session_create_failed", error, {
      checkoutMode: "membership",
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
      { checkoutMode: "membership", planId: plan.id }
    );
    return NextResponse.json(
      { error: "Checkout could not be started." },
      { status: 502 }
    );
  }

  return NextResponse.json({ sessionId: session.id, url: session.url });
}
