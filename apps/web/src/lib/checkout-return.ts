import type Stripe from "stripe";
import { reportOperationalError } from "@/lib/observability";
import { getStripeClient } from "@/lib/stripe";

export type CheckoutReturnKind = "product" | "subscription";
export type CheckoutReturnState =
  | "confirmed"
  | "incomplete"
  | "invalid"
  | "none"
  | "processing"
  | "unavailable";

export interface CheckoutReturnStatus {
  kind: CheckoutReturnKind | null;
  state: CheckoutReturnState;
}

const checkoutSessionIdPattern = /^cs_(?:test|live)_[A-Za-z0-9]+$/;

export async function getCheckoutReturnStatus({
  kind,
  sessionId,
  stripe = getStripeClient(),
  userId
}: {
  kind: CheckoutReturnKind | null;
  sessionId?: string;
  stripe?: Stripe | null;
  userId?: string;
}): Promise<CheckoutReturnStatus> {
  if (!kind) {
    return { kind: null, state: "none" };
  }

  if (
    !userId ||
    !sessionId ||
    sessionId.length > 255 ||
    !checkoutSessionIdPattern.test(sessionId)
  ) {
    return { kind, state: "invalid" };
  }

  if (!stripe) {
    return { kind, state: "unavailable" };
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (error) {
    await reportOperationalError("stripe.checkout.return_lookup_failed", error, {
      checkoutKind: kind,
      checkoutSessionId: sessionId
    });
    return { kind, state: "unavailable" };
  }

  const expectedMode = kind === "product" ? "payment" : "subscription";
  const belongsToUser =
    session.client_reference_id === userId && session.metadata?.userId === userId;

  if (session.mode !== expectedMode || !belongsToUser) {
    return { kind, state: "invalid" };
  }

  if (
    session.payment_status === "paid" ||
    session.payment_status === "no_payment_required"
  ) {
    return { kind, state: "confirmed" };
  }

  if (session.status === "complete") {
    return { kind, state: "processing" };
  }

  return { kind, state: "incomplete" };
}
