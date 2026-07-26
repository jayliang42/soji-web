import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { env } from "@/lib/env";
import { getStripeClient } from "@/lib/stripe";
import {
  createOperationalLog,
  logOperationalEvent,
  reportOperationalError
} from "@/lib/observability";
import {
  beginBillingEventAttempt,
  markBillingEventFailed,
  markBillingEventIgnored,
  markBillingEventProcessed,
  processStripeEvent,
  recordStripeBillingEvent
} from "@/lib/stripe-webhook";

export async function POST(request: NextRequest) {
  const stripe = getStripeClient();
  const signature = request.headers.get("stripe-signature");
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET || !signature) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 501 });
  }

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    logOperationalEvent(
      createOperationalLog({
        error,
        event: "stripe.webhook.signature_rejected",
        level: "warn"
      })
    );
    return NextResponse.json(
      { error: "invalid_stripe_signature" },
      { status: 400 }
    );
  }

  let billingEvent: Awaited<ReturnType<typeof recordStripeBillingEvent>>;
  try {
    billingEvent = await recordStripeBillingEvent(event);
  } catch (error) {
    await reportOperationalError("stripe.webhook.receipt_failed", error, {
      eventId: event.id,
      eventType: event.type
    });
    return NextResponse.json(
      {
        error: "billing_event_record_failed",
        received: false,
        type: event.type
      },
      { status: 500 }
    );
  }

  if (
    billingEvent.duplicate &&
    (billingEvent.event.status === "processed" ||
      billingEvent.event.status === "ignored")
  ) {
    return NextResponse.json({
      duplicate: true,
      received: true,
      result: {
        action:
          billingEvent.event.status === "ignored"
            ? "already_ignored"
            : "already_processed"
      },
      type: event.type
    });
  }

  let attempt: Awaited<ReturnType<typeof beginBillingEventAttempt>> | null = null;
  try {
    attempt = await beginBillingEventAttempt(billingEvent.event.id);
    if (!attempt.claimed) {
      if (attempt.status === "processed" || attempt.status === "ignored") {
        return NextResponse.json({
          duplicate: true,
          received: true,
          result: {
            action:
              attempt.status === "ignored"
                ? "already_ignored"
                : "already_processed"
          },
          type: event.type
        });
      }
      return NextResponse.json(
        {
          duplicate: true,
          received: true,
          result: { action: "processing_in_progress" },
          type: event.type
        },
        { status: 409 }
      );
    }
    const result = await processStripeEvent(event, stripe);
    if (result.action === "ignored") {
      await markBillingEventIgnored(billingEvent.event.id, attempt.claimToken);
    } else {
      await markBillingEventProcessed(billingEvent.event.id, attempt.claimToken);
    }
    return NextResponse.json({
      duplicate: billingEvent.duplicate,
      received: true,
      result,
      type: event.type
    });
  } catch (error) {
    if (attempt?.claimed) {
      try {
        await markBillingEventFailed(
          billingEvent.event.id,
          error,
          attempt.claimToken
        );
      } catch {
        // The receipt remains persisted even if this worker loses its lease.
      }
    }
    await reportOperationalError("stripe.webhook.processing_failed", error, {
      billingEventId: billingEvent.event.id,
      eventId: event.id,
      eventType: event.type
    });
    return NextResponse.json(
      { error: "billing_event_processing_failed", received: true, type: event.type },
      { status: 500 }
    );
  }
}
