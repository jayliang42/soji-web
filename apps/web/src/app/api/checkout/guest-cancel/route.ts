import { NextRequest, NextResponse } from "next/server";
import { guestCheckoutCancellationPayloadSchema } from "@/lib/checkout";
import {
  closeGuestMembershipCheckout,
  getGuestCheckoutBrowser,
  getGuestCheckoutRequestId,
  getGuestMembershipCheckoutForCancel
} from "@/lib/guest-membership-checkout";
import { guestCheckoutRequestCookieName } from "@/lib/guest-checkout-identity";
import { reportOperationalError } from "@/lib/observability";
import { getStripeClient } from "@/lib/stripe";

function clearGuestRequestCookie(response: NextResponse) {
  response.cookies.set({
    httpOnly: true,
    maxAge: 0,
    name: guestCheckoutRequestCookieName,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    value: ""
  });
}

export async function POST(request: NextRequest) {
  const browser = getGuestCheckoutBrowser(request);
  if (!browser) {
    return NextResponse.json({ error: "Checkout not found." }, { status: 404 });
  }
  const body = await request.json().catch(() => null);
  const parsed = guestCheckoutCancellationPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const requestId = parsed.data.requestId;

  const checkout = await getGuestMembershipCheckoutForCancel({
    browserHmac: browser.browserHmac,
    requestId
  });
  if (!checkout.ok) {
    return NextResponse.json({ error: "Checkout not found." }, { status: 404 });
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json(
      { error: "Checkout cancellation is temporarily unavailable." },
      { status: 503 }
    );
  }

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(checkout.sessionId);
  } catch (error) {
    await reportOperationalError("stripe.checkout.guest_cancel_lookup_failed", error);
    return NextResponse.json(
      { error: "Checkout cancellation is temporarily unavailable." },
      { status: 502 }
    );
  }

  const belongsToGuest =
    session.mode === "payment" &&
    session.client_reference_id === checkout.checkoutId &&
    session.metadata?.kind === "guest_membership" &&
    session.metadata.guestCheckoutId === checkout.checkoutId;
  if (!belongsToGuest) {
    return NextResponse.json({ error: "Checkout not found." }, { status: 404 });
  }
  if (
    session.status === "complete" ||
    session.payment_status === "paid" ||
    session.payment_status === "no_payment_required"
  ) {
    return NextResponse.json(
      { error: "This Checkout is already complete." },
      { status: 409 }
    );
  }

  if (session.status === "open") {
    try {
      await stripe.checkout.sessions.expire(session.id);
    } catch (error) {
      await reportOperationalError("stripe.checkout.guest_cancel_expire_failed", error);
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

  const close = await closeGuestMembershipCheckout({
    browserHmac: browser.browserHmac,
    observedAt: new Date().toISOString(),
    reason: "cancelled",
    requestId
  });
  if (!close.ok) {
    await reportOperationalError(
      "stripe.checkout.guest_cancel_release_failed",
      new Error(close.reason)
    );
    return NextResponse.json(
      { error: "Checkout cancellation is temporarily unavailable." },
      { status: 503 }
    );
  }

  const response = NextResponse.json({ status: close.status });
  if (getGuestCheckoutRequestId(request) === requestId) {
    clearGuestRequestCookie(response);
  }
  return response;
}
