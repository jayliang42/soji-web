import { NextRequest, NextResponse } from "next/server";
import {
  getBillingDeliveryReadiness,
  isBillingDeliveryReady
} from "@/lib/billing-readiness";
import { productCheckoutPayloadSchema } from "@/lib/checkout";
import { getCustomerPolicyReadiness } from "@/lib/customer-policy";
import { getSiteUrl } from "@/lib/env";
import { reportOperationalError } from "@/lib/observability";
import { claimProductCheckout } from "@/lib/product-checkout";
import {
  consumeCheckoutRateLimit,
  getRetryAfterSeconds
} from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isMissingAuthSession } from "@/lib/supabase/auth-errors";
import { getStripeClient } from "@/lib/stripe";
import { getExistingStripeCustomerId } from "@/lib/stripe-customer";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = productCheckoutPayloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!getCustomerPolicyReadiness().ready) {
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
      checkoutMode: "payment"
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

  const rateLimit = await consumeCheckoutRateLimit(supabase, "product");
  if (!rateLimit.ok) {
    await reportOperationalError(
      "stripe.checkout.rate_limit_unavailable",
      new Error(rateLimit.reason),
      { checkoutMode: "payment" }
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

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, slug, title, stripe_price_id, entitlement_id, is_active")
    .eq("slug", parsed.data.productSlug)
    .maybeSingle();

  if (productError) {
    await reportOperationalError("stripe.checkout.product_lookup_failed", productError, {
      productSlug: parsed.data.productSlug
    });
    return NextResponse.json(
      { error: "Product lookup failed." },
      { status: 500 }
    );
  }

  if (!product || !product.is_active) {
    return NextResponse.json(
      { error: "This product is not available for purchase." },
      { status: 404 }
    );
  }

  const productEntitlement = product.entitlement_id ?? "product.digital";
  const { data: membershipGrants, error: membershipGrantError } = await supabase
    .from("user_entitlements")
    .select("entitlement_id, ends_at")
    .eq("user_id", user.id);

  if (membershipGrantError) {
    await reportOperationalError(
      "stripe.checkout.membership_entitlement_lookup_failed",
      membershipGrantError,
      { productSlug: product.slug, userId: user.id }
    );
    return NextResponse.json(
      { error: "Membership access could not be verified." },
      { status: 503 }
    );
  }

  const membershipGrant = membershipGrants?.some(
    (grant) =>
      grant.entitlement_id === productEntitlement &&
      (!grant.ends_at || Date.parse(grant.ends_at) > Date.now())
  );

  if (membershipGrant) {
    return NextResponse.json(
      { error: "This product is included with your Full Access membership." },
      { status: 409 }
    );
  }

  const priceId = product.stripe_price_id;
  if (!priceId) {
    return NextResponse.json(
      { error: "This product is missing a Stripe price id." },
      { status: 400 }
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
    entitlementId: product.entitlement_id ?? "",
    productId: product.id,
    productSlug: product.slug,
    userId: user.id
  };

  const claim = await claimProductCheckout(
    supabase,
    product.id,
    parsed.data.requestId
  );
  if (!claim.ok) {
    return NextResponse.json(
      { error: "Checkout protection is temporarily unavailable." },
      { status: 503 }
    );
  }
  if (claim.outcome === "already_purchased") {
    return NextResponse.json(
      { error: "You already own this product. Access it from your account." },
      { status: 409 }
    );
  }
  if (claim.outcome === "checkout_in_progress") {
    return NextResponse.json(
      {
        error:
          "A checkout for this product is already in progress. Return to it or try again after it expires."
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
        mode: "payment",
        client_reference_id: user.id,
        consent_collection: {
          terms_of_service: "required"
        },
        ...(customerId
          ? { customer: customerId }
          : { customer_email: user.email }),
        line_items: [{ price: priceId, quantity: 1 }],
        metadata,
        custom_text: {
          submit: {
            message:
              "By purchasing, you agree to the Soji Terms and acknowledge the digital-product refund policy."
          }
        },
        expires_at: checkoutExpiresAt,
        payment_intent_data: {
          metadata
        },
        success_url: `${siteUrl}/account?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/products?purchase=cancelled`
      },
      {
        idempotencyKey: `soji:checkout:product:${user.id}:${parsed.data.requestId}`
      }
    );
  } catch (error) {
    await reportOperationalError("stripe.checkout.session_create_failed", error, {
      checkoutMode: "payment",
      productSlug: product.slug
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
      { checkoutMode: "payment", productSlug: product.slug }
    );
    return NextResponse.json(
      { error: "Checkout could not be started." },
      { status: 502 }
    );
  }

  return NextResponse.json({ url: session.url });
}
