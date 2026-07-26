import { NextResponse } from "next/server";
import { z } from "zod";
import {
  billingEventSelect,
  mapBillingEventRow,
  type BillingEventRow
} from "@/lib/billing";
import { isBillingProcessingLeaseActive } from "@/lib/billing-processing";
import { getAdminContext } from "@/lib/publisher";
import { reportOperationalError } from "@/lib/observability";
import { getStripeClient } from "@/lib/stripe";
import {
  getStripeReconciliationPayloadIdentifier,
  reconcileStripeBilling
} from "@/lib/stripe-reconciliation";
import {
  beginBillingEventAttempt,
  markBillingEventFailed,
  markBillingEventIgnored,
  markBillingEventProcessed,
  processStripeEvent
} from "@/lib/stripe-webhook";

const idSchema = z.string().uuid();

function getStableProcessingError(value: unknown) {
  return typeof value === "string" && /^[a-z][a-z0-9_]{0,119}$/.test(value)
    ? value
    : "billing_event_processing_failed";
}

function getUnclaimedRetryReason(event: ReturnType<typeof mapBillingEventRow>) {
  if (event.status === "processed" || event.status === "ignored") {
    return "event_already_settled";
  }
  if (
    isBillingProcessingLeaseActive(
      event.status,
      event.processingStartedAt
    )
  ) {
    return "event_processing_in_progress";
  }
  return "event_retryable_state_changed";
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getAdminContext();
  if ("error" in context) {
    return context.error;
  }

  const parsedId = idSchema.safeParse((await params).id);
  if (!parsedId.success) {
    return NextResponse.json({ ok: false, reason: "invalid_event_id" }, { status: 400 });
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json(
      { ok: false, reason: "stripe_not_configured" },
      { status: 501 }
    );
  }

  const { data: billingEvent, error: eventError } = await context.supabase
    .from("billing_events")
    .select(billingEventSelect)
    .eq("id", parsedId.data)
    .maybeSingle();

  if (eventError) {
    await reportOperationalError("stripe.webhook.retry_lookup_failed", eventError, {
      billingEventId: parsedId.data
    });
    return NextResponse.json(
      { ok: false, reason: "billing_event_lookup_failed" },
      { status: 500 }
    );
  }
  if (!billingEvent || billingEvent.provider !== "stripe") {
    return NextResponse.json(
      { ok: false, reason: "stripe_event_not_found" },
      { status: 404 }
    );
  }
  if (billingEvent.status === "processed" || billingEvent.status === "ignored") {
    return NextResponse.json(
      { ok: false, reason: "event_already_settled" },
      { status: 409 }
    );
  }

  const reconciliationIdentifier =
    billingEvent.event_type === "admin.billing.reconcile"
      ? getStripeReconciliationPayloadIdentifier(billingEvent.payload)
      : null;
  if (
    billingEvent.event_type === "admin.billing.reconcile" &&
    !reconciliationIdentifier
  ) {
    await reportOperationalError(
      "stripe.reconciliation.retry_payload_invalid",
      new Error("billing_reconciliation_payload_invalid"),
      { billingEventId: billingEvent.id }
    );
    return NextResponse.json(
      { ok: false, reason: "billing_reconciliation_payload_invalid" },
      { status: 422 }
    );
  }

  let attempt: Awaited<ReturnType<typeof beginBillingEventAttempt>> | null = null;
  try {
    attempt = await beginBillingEventAttempt(billingEvent.id);
    if (!attempt.claimed) {
      const { data: currentBillingEvent, error: refreshError } =
        await context.supabase
          .from("billing_events")
          .select(billingEventSelect)
          .eq("id", billingEvent.id)
          .maybeSingle();
      if (refreshError || !currentBillingEvent) {
        await reportOperationalError(
          "stripe.webhook.retry_refresh_failed",
          refreshError ?? new Error("billing_event_not_found_after_attempt"),
          { billingEventId: billingEvent.id }
        );
        return NextResponse.json(
          { ok: false, reason: "billing_event_lookup_failed" },
          { status: 500 }
        );
      }

      const event = mapBillingEventRow(
        currentBillingEvent as BillingEventRow
      );
      return NextResponse.json(
        {
          event,
          ok: false,
          reason: getUnclaimedRetryReason(event)
        },
        { status: 409 }
      );
    }
    const result = reconciliationIdentifier
      ? await reconcileStripeBilling(stripe, reconciliationIdentifier)
      : await processStripeEvent(
          await stripe.events.retrieve(billingEvent.provider_event_id),
          stripe
        );
    const status =
      "action" in result && result.action === "ignored"
        ? "ignored"
        : "processed";
    const processedAt =
      status === "ignored"
        ? await markBillingEventIgnored(billingEvent.id, attempt.claimToken)
        : await markBillingEventProcessed(billingEvent.id, attempt.claimToken);
    const event = {
      ...mapBillingEventRow(billingEvent as BillingEventRow),
      attemptCount: attempt.attemptCount,
      lastAttemptedAt: attempt.lastAttemptedAt,
      processedAt,
      processingError: null,
      processingStartedAt: null,
      status
    };
    return NextResponse.json({ event, ok: true, result });
  } catch (error) {
    await reportOperationalError(
      reconciliationIdentifier
        ? "stripe.reconciliation.retry_failed"
        : "stripe.webhook.retry_failed",
      error,
      {
      billingEventId: billingEvent.id,
      eventId: billingEvent.provider_event_id
      }
    );
    let event;
    if (attempt?.claimed) {
      try {
        const processingError = await markBillingEventFailed(
          billingEvent.id,
          error,
          attempt.claimToken
        );
        event = {
          ...mapBillingEventRow(billingEvent as BillingEventRow),
          attemptCount: attempt.attemptCount,
          lastAttemptedAt: attempt.lastAttemptedAt,
          processedAt: null,
          processingError: getStableProcessingError(processingError),
          processingStartedAt: null,
          status: "failed" as const
        };
      } catch {
        // The persisted receipt still proves delivery if this worker loses its lease.
      }
    }
    return NextResponse.json(
      { event, ok: false, reason: "billing_event_retry_failed" },
      { status: 500 }
    );
  }
}
