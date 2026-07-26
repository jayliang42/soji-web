import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getBillingDeliveryReadiness,
  isBillingDeliveryReady
} from "@/lib/billing-readiness";
import { getSiteUrl } from "@/lib/env";
import { reportOperationalError } from "@/lib/observability";
import { getStripeClient } from "@/lib/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isMissingAuthSession } from "@/lib/supabase/auth-errors";

const requestSchema = z
  .object({ subscriptionId: z.string().uuid() })
  .strict();

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, reason: "invalid_billing_portal_request" },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, reason: "supabase_not_configured" },
      { status: 501 }
    );
  }

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();
  if (authError && !isMissingAuthSession(authError)) {
    await reportOperationalError("billing_portal.auth_lookup_failed", authError);
    return NextResponse.json(
      { ok: false, reason: "authentication_unavailable" },
      { status: 503 }
    );
  }
  if (!user) {
    return NextResponse.json(
      { ok: false, reason: "not_authenticated" },
      { status: 401 }
    );
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("id, provider_customer_id")
    .eq("id", parsed.data.subscriptionId)
    .eq("user_id", user.id)
    .eq("provider", "stripe")
    .maybeSingle();

  if (subscriptionError) {
    await reportOperationalError(
      "billing_portal.subscription_lookup_failed",
      subscriptionError,
      { subscriptionId: parsed.data.subscriptionId, userId: user.id }
    );
    return NextResponse.json(
      { ok: false, reason: "subscription_query_failed" },
      { status: 500 }
    );
  }
  if (!subscription?.provider_customer_id) {
    return NextResponse.json(
      { ok: false, reason: "billing_customer_not_found" },
      { status: 404 }
    );
  }

  const billingDelivery = await getBillingDeliveryReadiness();
  if (!isBillingDeliveryReady(billingDelivery)) {
    return NextResponse.json(
      { ok: false, reason: "billing_delivery_unavailable" },
      { status: 503 }
    );
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json(
      { ok: false, reason: "stripe_not_configured" },
      { status: 501 }
    );
  }

  const siteUrl = getSiteUrl();
  if (!siteUrl) {
    return NextResponse.json(
      { ok: false, reason: "site_url_not_configured" },
      { status: 503 }
    );
  }

  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: subscription.provider_customer_id,
      return_url: `${siteUrl}/account`
    });
    return NextResponse.json({ ok: true, url: portal.url });
  } catch (error) {
    await reportOperationalError("billing_portal.session_create_failed", error, {
      subscriptionId: subscription.id,
      userId: user.id
    });
    return NextResponse.json(
      { ok: false, reason: "billing_portal_unavailable" },
      { status: 502 }
    );
  }
}
