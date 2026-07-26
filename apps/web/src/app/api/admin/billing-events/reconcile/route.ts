import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext } from "@/lib/publisher";
import { reportOperationalError } from "@/lib/observability";
import { getStripeClient } from "@/lib/stripe";
import { reconcileStripeBilling } from "@/lib/stripe-reconciliation";
import {
  beginBillingEventAttempt,
  markBillingEventFailed,
  markBillingEventProcessed,
  recordStripeReconciliationAttempt
} from "@/lib/stripe-webhook";

const requestSchema = z
  .object({
    identifier: z
      .string()
      .trim()
      .max(255)
      .regex(/^(?:sub|cus)_[A-Za-z0-9]+$/)
  })
  .strict();

export async function POST(request: Request) {
  const context = await getAdminContext();
  if ("error" in context) {
    return context.error;
  }

  const body = await request.json().catch(() => null);
  const parsedBody = requestSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { ok: false, reason: "invalid_reconciliation_request" },
      { status: 400 }
    );
  }

  let operation: Awaited<ReturnType<typeof recordStripeReconciliationAttempt>>;
  try {
    operation = await recordStripeReconciliationAttempt({
      identifier: parsedBody.data.identifier,
      requestedBy: context.user.id
    });
  } catch (error) {
    await reportOperationalError("stripe.reconciliation.receipt_failed", error, {
      identifier: parsedBody.data.identifier
    });
    return NextResponse.json(
      {
        ok: false,
        reason: "billing_reconciliation_record_failed"
      },
      { status: 501 }
    );
  }

  let attempt: Awaited<ReturnType<typeof beginBillingEventAttempt>>;
  try {
    attempt = await beginBillingEventAttempt(operation.id);
  } catch (error) {
    await reportOperationalError("stripe.reconciliation.attempt_record_failed", error, {
      operationId: operation.providerEventId
    });
    return NextResponse.json(
      { ok: false, operationId: operation.providerEventId, reason: "billing_attempt_record_failed" },
      { status: 500 }
    );
  }
  if (!attempt.claimed) {
    return NextResponse.json(
      {
        ok: false,
        operationId: operation.providerEventId,
        reason:
          attempt.status === "processed"
            ? "billing_reconciliation_already_processed"
            : "billing_reconciliation_in_progress"
      },
      { status: 409 }
    );
  }

  const stripe = getStripeClient();
  if (!stripe) {
    await markBillingEventFailed(
      operation.id,
      new Error("stripe_not_configured"),
      attempt.claimToken
    ).catch(() => "stripe_not_configured");
    return NextResponse.json(
      { ok: false, operationId: operation.providerEventId, reason: "stripe_not_configured" },
      { status: 501 }
    );
  }

  try {
    const result = await reconcileStripeBilling(stripe, parsedBody.data.identifier);
    const processedAt = await markBillingEventProcessed(
      operation.id,
      attempt.claimToken
    );
    return NextResponse.json({
      event: {
        attemptCount: attempt.attemptCount,
        createdAt: operation.createdAt,
        eventType: "admin.billing.reconcile",
        id: operation.id,
        lastAttemptedAt: attempt.lastAttemptedAt,
        processedAt,
        processingError: null,
        processingStartedAt: null,
        provider: "stripe",
        providerEventId: operation.providerEventId,
        status: "processed"
      },
      ok: true,
      result
    });
  } catch (error) {
    await reportOperationalError("stripe.reconciliation.processing_failed", error, {
      identifier: parsedBody.data.identifier,
      operationId: operation.providerEventId
    });
    await markBillingEventFailed(operation.id, error, attempt.claimToken).catch(
      () => null
    );
    return NextResponse.json(
      { ok: false, operationId: operation.providerEventId, reason: "billing_reconciliation_failed" },
      { status: 500 }
    );
  }
}
