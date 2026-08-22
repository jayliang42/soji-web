import { NextRequest, NextResponse } from "next/server";
import { checkoutCancellationPayloadSchema } from "@/lib/checkout";
import { reportOperationalError } from "@/lib/observability";
import { releaseProductCheckout } from "@/lib/product-checkout-release";
import { releaseSubscriptionCheckout } from "@/lib/subscription-checkout-release";
import { isMissingAuthSession } from "@/lib/supabase/auth-errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe";

function getCheckoutKind(metadata: Record<string, string> | null) {
  if (!metadata || !metadata.userId) {
    return null;
  }

  if (metadata.kind === "membership") {
    return { kind: "membership" as const };
  }

  if (
    (metadata.kind === "product" || !metadata.kind) &&
    metadata.productSlug
  ) {
    return { kind: "product" as const, productSlug: metadata.productSlug };
  }

  return null;
}

function getCheckoutExpiresAt(expiresAt: number | null) {
  if (
    typeof expiresAt !== "number" ||
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= 0
  ) {
    return null;
  }

  const value = new Date(expiresAt * 1000);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = checkoutCancellationPayloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json(
      { error: "Checkout cancellation is temporarily unavailable." },
      { status: 503 }
    );
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Checkout cancellation is temporarily unavailable." },
      { status: 503 }
    );
  }

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError && !isMissingAuthSession(authError)) {
    await reportOperationalError("stripe.checkout.cancel_auth_lookup_failed", authError);
    return NextResponse.json(
      { error: "Authentication is temporarily unavailable." },
      { status: 503 }
    );
  }

  if (!user) {
    return NextResponse.json(
      { error: "Sign in before managing checkout." },
      { status: 401 }
    );
  }

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(parsed.data.sessionId);
  } catch (error) {
    await reportOperationalError("stripe.checkout.cancel_lookup_failed", error);
    return NextResponse.json(
      { error: "Checkout cancellation is temporarily unavailable." },
      { status: 502 }
    );
  }

  const checkout = getCheckoutKind(session.metadata);
  const checkoutExpiresAt = getCheckoutExpiresAt(session.expires_at);
  const belongsToUser =
    session.client_reference_id === user.id && session.metadata?.userId === user.id;

  if (session.mode !== "payment" || !belongsToUser || !checkout) {
    return NextResponse.json({ error: "Checkout not found." }, { status: 404 });
  }

  if (!checkoutExpiresAt) {
    return NextResponse.json(
      { error: "Checkout cancellation is temporarily unavailable." },
      { status: 502 }
    );
  }

  if (session.status === "complete") {
    return NextResponse.json(
      { error: "This Checkout is already complete." },
      { status: 409 }
    );
  }

  if (session.status === "open") {
    try {
      await stripe.checkout.sessions.expire(session.id);
    } catch (error) {
      await reportOperationalError("stripe.checkout.cancel_expire_failed", error, {
        checkoutKind: checkout.kind
      });
      return NextResponse.json(
        { error: "Checkout cancellation is temporarily unavailable." },
        { status: 502 }
      );
    }
  } else if (session.status !== "expired") {
    return NextResponse.json(
      { error: "Checkout cancellation is temporarily unavailable." },
      { status: 409 }
    );
  }

  const release =
    checkout.kind === "membership"
      ? await releaseSubscriptionCheckout(supabase, checkoutExpiresAt)
      : await releaseProductCheckout(supabase, checkout.productSlug, checkoutExpiresAt);

  if (!release.ok) {
    return NextResponse.json(
      { error: "Checkout cancellation is temporarily unavailable." },
      { status: 503 }
    );
  }

  return NextResponse.json({ status: release.released ? "cancelled" : "expired" });
}
