import Stripe from "stripe";
import { randomUUID } from "node:crypto";
import { getPlanByTier } from "@soji/domain";
import type { MembershipTier } from "@soji/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

const paidPlanIds = ["tier_1", "tier_2", "tier_3"] as const satisfies readonly MembershipTier[];

export type BillingEventRecord = {
  id: string;
  processed_at: string | null;
  status: string;
};

export function createStripeBillingReceiptPayload(event: Stripe.Event): Json {
  const eventObject = event.data.object as unknown as {
    charge?: unknown;
    customer?: unknown;
    id?: unknown;
    object?: unknown;
    payment_intent?: unknown;
    subscription?: unknown;
  };
  const objectId = getUnknownObjectId(eventObject.id);
  const objectType =
    typeof eventObject.object === "string" ? eventObject.object : null;
  const payload: Record<string, Json | undefined> = {
    apiVersion: event.api_version ?? null,
    created: event.created,
    id: event.id,
    livemode: event.livemode,
    objectId,
    objectType,
    type: event.type
  };

  if (objectType === "charge") {
    addReceiptReference(payload, "chargeId", eventObject.id);
    addReceiptReference(payload, "customerId", eventObject.customer);
    addReceiptReference(payload, "paymentId", eventObject.payment_intent);
  } else if (objectType === "dispute") {
    addReceiptReference(payload, "chargeId", eventObject.charge);
    addReceiptReference(payload, "disputeId", eventObject.id);
    addReceiptReference(payload, "paymentId", eventObject.payment_intent);
  } else if (objectType === "checkout.session") {
    addReceiptReference(payload, "customerId", eventObject.customer);
    addReceiptReference(payload, "paymentId", eventObject.payment_intent);
    addReceiptReference(payload, "subscriptionId", eventObject.subscription);
  } else if (objectType === "payment_intent") {
    addReceiptReference(payload, "customerId", eventObject.customer);
    addReceiptReference(payload, "paymentId", eventObject.id);
  } else if (objectType === "subscription") {
    addReceiptReference(payload, "customerId", eventObject.customer);
    addReceiptReference(payload, "subscriptionId", eventObject.id);
  }

  return payload;
}

export type BillingAttempt =
  | {
      attemptCount: number;
      claimed: true;
      claimToken: string;
      lastAttemptedAt: string;
      status: "processing";
    }
  | {
      claimed: false;
      status: string;
    };

function requireAdminClient() {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("supabase_service_role_not_configured");
  }
  return supabase;
}

function toPlanId(value: string | undefined) {
  return paidPlanIds.find((planId) => planId === value) ?? null;
}

function getUnknownObjectId(value: unknown) {
  if (typeof value === "string") {
    return value;
  }
  if (
    value &&
    typeof value === "object" &&
    "id" in value &&
    typeof value.id === "string"
  ) {
    return value.id;
  }
  return null;
}

function addReceiptReference(
  payload: Record<string, Json | undefined>,
  key: string,
  value: unknown
) {
  const reference = getUnknownObjectId(value);
  if (reference) {
    payload[key] = reference;
  }
}

function getObjectId(value: string | { id: string } | null) {
  return typeof value === "string" ? value : value?.id ?? null;
}

function stripeTimestampToIso(timestamp: number | null | undefined) {
  return timestamp ? new Date(timestamp * 1000).toISOString() : undefined;
}

function isUuid(value: string | undefined): value is string {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value
      )
  );
}

function getCurrentPeriodEnd(subscription: Stripe.Subscription) {
  const period = subscription as Stripe.Subscription & {
    current_period_end?: number | null;
  };
  return stripeTimestampToIso(period.current_period_end);
}

function getSojiSubscriptionIdentity(
  subscription: Stripe.Subscription,
  fallbackMetadata?: Stripe.Metadata | null
) {
  const userId = subscription.metadata.userId || fallbackMetadata?.userId;
  const planId = toPlanId(
    subscription.metadata.planId || fallbackMetadata?.planId
  );

  if (!isUuid(userId) || !planId || !getPlanByTier(planId)) {
    throw new Error("stripe_subscription_metadata_missing");
  }

  return { planId, userId };
}

export async function syncSubscriptionEntitlements({
  fallbackMetadata,
  observedAt,
  subscription
}: {
  fallbackMetadata?: Stripe.Metadata | null;
  observedAt?: string;
  subscription: Stripe.Subscription;
}) {
  const supabase = requireAdminClient();
  const { planId, userId } = getSojiSubscriptionIdentity(
    subscription,
    fallbackMetadata
  );

  const status = subscription.status;
  const periodEndsAt = getCurrentPeriodEnd(subscription);
  const subscriptionId = subscription.id;
  const customerId = getObjectId(subscription.customer);
  const now = observedAt ?? new Date().toISOString();

  if (!customerId) {
    throw new Error("stripe_subscription_customer_missing");
  }

  const { data: effectiveTier, error } = await supabase.rpc(
    "sync_stripe_subscription_state",
    {
      p_cancel_at_period_end: subscription.cancel_at_period_end,
      p_cancelled_at: stripeTimestampToIso(subscription.canceled_at),
      p_current_period_ends_at: periodEndsAt,
      p_observed_at: now,
      p_plan_id: planId,
      p_provider_customer_id: customerId,
      p_provider_subscription_id: subscriptionId,
      p_status: status,
      p_user_id: userId
    }
  );
  if (error) {
    throw new Error(error.message);
  }

  return {
    action: "synced",
    effectiveTier: effectiveTier as MembershipTier,
    planId,
    status,
    userId
  } as const;
}

export async function closeMissingCustomerSubscriptions(
  customerId: string,
  remoteSubscriptionIds: ReadonlySet<string>
) {
  const supabase = requireAdminClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("provider_subscription_id, user_id, plan_id, current_period_ends_at")
    .eq("provider", "stripe")
    .eq("provider_customer_id", customerId);
  if (error) {
    throw new Error(error.message);
  }

  const staleSubscriptions = (data ?? []).filter(
    (row) => !remoteSubscriptionIds.has(row.provider_subscription_id as string)
  );
  const now = new Date().toISOString();

  for (const subscription of staleSubscriptions) {
    const subscriptionId = subscription.provider_subscription_id as string;
    const userId = subscription.user_id as string;
    const { error: syncError } = await supabase.rpc(
      "sync_stripe_subscription_state",
      {
        p_cancel_at_period_end: false,
        p_cancelled_at: now,
        p_current_period_ends_at:
          (subscription.current_period_ends_at as string | null) ?? undefined,
        p_observed_at: now,
        p_plan_id: subscription.plan_id as MembershipTier,
        p_provider_customer_id: customerId,
        p_provider_subscription_id: subscriptionId,
        p_status: "canceled",
        p_user_id: userId
      }
    );
    if (syncError) {
      throw new Error(syncError.message);
    }
  }

  return staleSubscriptions.length;
}

async function syncProductPurchase(
  session: Stripe.Checkout.Session,
  observedAt: string
) {
  const supabase = requireAdminClient();
  const userId = session.metadata?.userId;
  const productId = session.metadata?.productId;
  const paymentId = getObjectId(session.payment_intent) ?? session.id;

  if (!isUuid(userId) || !isUuid(productId)) {
    throw new Error("stripe_purchase_metadata_missing");
  }

  const { data: entitlementId, error } = await supabase.rpc(
    "sync_stripe_product_purchase",
    {
      p_observed_at: observedAt,
      p_product_id: productId,
      p_provider_payment_id: paymentId,
      p_status: session.payment_status ?? "paid",
      p_user_id: userId
    }
  );
  if (error) {
    throw new Error(error.message);
  }

  return {
    action: "synced_purchase",
    entitlementId: entitlementId as string,
    productId,
    userId
  } as const;
}

type PaymentIntentClassification =
  | {
      kind: "product";
      paymentId: string;
    }
  | {
      kind: "subscription";
      paymentId: string;
      subscription: Stripe.Subscription;
    }
  | {
      kind: "unmapped";
      paymentId: string;
    };

async function classifyPaymentIntent(
  paymentIntent: Stripe.PaymentIntent,
  stripe: Stripe
): Promise<PaymentIntentClassification> {
  const paymentId = paymentIntent.id;
  const userId = paymentIntent.metadata.userId;
  const productId = paymentIntent.metadata.productId;

  if (isUuid(userId) && isUuid(productId)) {
    return { kind: "product", paymentId };
  }

  const invoicePayments = await stripe.invoicePayments.list({
    limit: 2,
    payment: {
      payment_intent: paymentId,
      type: "payment_intent"
    }
  });
  if (invoicePayments.data.length === 0) {
    return { kind: "unmapped", paymentId };
  }
  if (invoicePayments.data.length !== 1) {
    throw new Error("stripe_invoice_payment_ambiguous");
  }

  const invoiceReference = invoicePayments.data[0]!.invoice;
  if (
    typeof invoiceReference !== "string" &&
    "deleted" in invoiceReference &&
    invoiceReference.deleted
  ) {
    throw new Error("stripe_invoice_payment_invoice_deleted");
  }
  const invoice =
    typeof invoiceReference === "string"
      ? await stripe.invoices.retrieve(invoiceReference)
      : invoiceReference;
  if ("deleted" in invoice && invoice.deleted) {
    throw new Error("stripe_invoice_payment_invoice_deleted");
  }

  const parent = invoice.parent;
  if (
    parent?.type !== "subscription_details" ||
    !parent.subscription_details
  ) {
    throw new Error("stripe_invoice_payment_subscription_parent_missing");
  }
  const subscriptionId = getObjectId(
    parent.subscription_details.subscription
  );
  if (!subscriptionId) {
    throw new Error("stripe_invoice_payment_subscription_missing");
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  getSojiSubscriptionIdentity(subscription);

  return {
    kind: "subscription",
    paymentId,
    subscription
  };
}

async function resolvePaymentIntent(
  paymentIntentReference: string | Stripe.PaymentIntent | null,
  stripe: Stripe,
  missingReason: string
) {
  const paymentId = getObjectId(paymentIntentReference);
  if (!paymentId) {
    throw new Error(missingReason);
  }
  const paymentIntent =
    paymentIntentReference && typeof paymentIntentReference === "object"
      ? paymentIntentReference
      : await stripe.paymentIntents.retrieve(paymentId);

  return { paymentId, paymentIntent };
}

async function syncProductRefund(
  paymentId: string,
  status: "partially_refunded" | "refunded",
  observedAt: string
) {
  const supabase = requireAdminClient();
  const { data: purchaseStatus, error } = await supabase.rpc(
    "sync_stripe_product_refund",
    {
      p_observed_at: observedAt,
      p_provider_payment_id: paymentId,
      p_status: status
    }
  );
  if (error) {
    throw new Error(error.message);
  }

  return {
    action: "synced_purchase_refund",
    paymentId,
    status: purchaseStatus as string
  } as const;
}

async function syncSubscriptionAdjustment({
  amount,
  currency,
  kind,
  observedAt,
  providerAdjustmentId,
  status,
  classification
}: {
  amount: number;
  currency: string;
  kind: "dispute" | "refund";
  observedAt: string;
  providerAdjustmentId: string;
  status: string;
  classification: Extract<
    PaymentIntentClassification,
    { kind: "subscription" }
  >;
}) {
  const supabase = requireAdminClient();
  const { data: effectiveTier, error } = await supabase.rpc(
    "sync_stripe_subscription_adjustment",
    {
      p_amount: amount,
      p_currency: currency,
      p_kind: kind,
      p_observed_at: observedAt,
      p_provider_adjustment_id: providerAdjustmentId,
      p_provider_payment_id: classification.paymentId,
      p_provider_subscription_id: classification.subscription.id,
      p_status: status
    }
  );
  if (error) {
    throw new Error(error.message);
  }

  return {
    effectiveTier: effectiveTier as MembershipTier,
    paymentId: classification.paymentId,
    subscriptionId: classification.subscription.id
  };
}

async function syncRefund(
  charge: Stripe.Charge,
  observedAt: string,
  stripe: Stripe
) {
  const { paymentIntent } = await resolvePaymentIntent(
    charge.payment_intent,
    stripe,
    "stripe_refund_payment_intent_missing"
  );
  const classification = await classifyPaymentIntent(paymentIntent, stripe);
  const status =
    charge.refunded || charge.amount_refunded >= charge.amount
      ? "refunded"
      : "partially_refunded";

  if (classification.kind === "unmapped") {
    return {
      action: "ignored",
      reason: "refund_not_soji_checkout"
    } as const;
  }
  if (classification.kind === "product") {
    return syncProductRefund(classification.paymentId, status, observedAt);
  }

  const result = await syncSubscriptionAdjustment({
    amount: charge.amount_refunded,
    classification,
    currency: charge.currency,
    kind: "refund",
    observedAt,
    providerAdjustmentId: charge.id,
    status
  });
  return {
    action: "synced_subscription_refund",
    status,
    ...result
  } as const;
}

async function syncDispute(
  dispute: Stripe.Dispute,
  observedAt: string,
  stripe: Stripe
) {
  let paymentIntentReference =
    typeof dispute.payment_intent === "object"
      ? dispute.payment_intent
      : null;
  let paymentId = getObjectId(dispute.payment_intent);

  if (!paymentId) {
    const chargeId = getObjectId(dispute.charge);
    if (!chargeId) {
      throw new Error("stripe_dispute_charge_missing");
    }
    const charge = await stripe.charges.retrieve(chargeId);
    paymentId = getObjectId(charge.payment_intent);
    paymentIntentReference =
      typeof charge.payment_intent === "object"
        ? charge.payment_intent
        : null;
  }
  if (!paymentId) {
    throw new Error("stripe_dispute_payment_intent_missing");
  }

  const paymentIntent =
    paymentIntentReference ??
    (await stripe.paymentIntents.retrieve(paymentId));
  const classification = await classifyPaymentIntent(paymentIntent, stripe);
  if (classification.kind === "unmapped") {
    return {
      action: "ignored",
      reason: "dispute_not_soji_checkout"
    } as const;
  }

  if (classification.kind === "subscription") {
    const result = await syncSubscriptionAdjustment({
      amount: dispute.amount,
      classification,
      currency: dispute.currency,
      kind: "dispute",
      observedAt,
      providerAdjustmentId: dispute.id,
      status: dispute.status
    });
    return {
      action: "synced_subscription_dispute",
      disputeId: dispute.id,
      status: dispute.status,
      ...result
    } as const;
  }

  const supabase = requireAdminClient();
  const { data: disputeStatus, error } = await supabase.rpc(
    "sync_stripe_product_dispute",
    {
      p_observed_at: observedAt,
      p_provider_dispute_id: dispute.id,
      p_provider_payment_id: classification.paymentId,
      p_status: dispute.status
    }
  );
  if (error) {
    throw new Error(error.message);
  }

  return {
    action: "synced_purchase_dispute",
    disputeId: dispute.id,
    paymentId: classification.paymentId,
    status: disputeStatus as string
  } as const;
}

export async function processStripeEvent(event: Stripe.Event, stripe: Stripe) {
  const observedAt =
    stripeTimestampToIso(event.created) ?? new Date().toISOString();

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object;
    const subscriptionId = getObjectId(session.subscription);
    if (session.mode === "subscription") {
      if (!subscriptionId) {
        throw new Error("stripe_checkout_subscription_missing");
      }
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      return syncSubscriptionEntitlements({
        fallbackMetadata: session.metadata,
        subscription
      });
    }
    if (
      session.mode === "payment" &&
      (session.payment_status === "paid" ||
        session.payment_status === "no_payment_required")
    ) {
      return syncProductPurchase(session, observedAt);
    }

    if (session.mode === "payment") {
      if (event.type === "checkout.session.async_payment_succeeded") {
        throw new Error("stripe_async_payment_not_paid");
      }
      return {
        action: "awaiting_payment",
        paymentStatus: session.payment_status
      } as const;
    }
  }

  if (event.type === "checkout.session.async_payment_failed") {
    return {
      action: "payment_failed",
      paymentStatus: event.data.object.payment_status
    } as const;
  }

  if (event.type === "charge.refunded") {
    return syncRefund(event.data.object, observedAt, stripe);
  }

  if (
    event.type === "charge.dispute.created" ||
    event.type === "charge.dispute.updated" ||
    event.type === "charge.dispute.closed" ||
    event.type === "charge.dispute.funds_withdrawn" ||
    event.type === "charge.dispute.funds_reinstated"
  ) {
    return syncDispute(event.data.object, observedAt, stripe);
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = await stripe.subscriptions.retrieve(
      event.data.object.id
    );
    return syncSubscriptionEntitlements({
      observedAt: new Date().toISOString(),
      subscription
    });
  }

  return { action: "ignored", reason: "event_not_handled" } as const;
}

async function findBillingEvent(providerEventId: string) {
  const supabase = requireAdminClient();
  const { data, error } = await supabase
    .from("billing_events")
    .select("id, processed_at, status")
    .eq("provider", "stripe")
    .eq("provider_event_id", providerEventId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data as BillingEventRecord | null;
}

export async function recordStripeBillingEvent(event: Stripe.Event) {
  const supabase = requireAdminClient();
  const { data, error } = await supabase
    .from("billing_events")
    .insert({
      event_type: event.type,
      payload: createStripeBillingReceiptPayload(event),
      provider: "stripe",
      provider_event_id: event.id,
      status: "received"
    })
    .select("id, processed_at, status")
    .single();

  if (!error && data) {
    return { duplicate: false, event: data as BillingEventRecord } as const;
  }
  if (error?.code !== "23505") {
    throw new Error(error?.message ?? "billing_event_insert_failed");
  }

  const existingEvent = await findBillingEvent(event.id);
  if (!existingEvent) {
    throw new Error("billing_event_duplicate_lookup_failed");
  }
  return { duplicate: true, event: existingEvent } as const;
}

type BillingAttemptSettlement = {
  processedAt?: string | null;
  settled?: boolean;
  status?: string;
};

async function finishBillingEventAttempt({
  billingEventId,
  claimToken,
  processingError,
  resultStatus,
  succeeded
}: {
  billingEventId: string;
  claimToken: string;
  processingError?: unknown;
  resultStatus?: "ignored" | "processed";
  succeeded: boolean;
}) {
  const supabase = requireAdminClient();
  const message =
    processingError instanceof Error
      ? processingError.message
      : "webhook_processing_failed";
  const { data, error } = await supabase.rpc("finish_billing_event_attempt", {
    p_billing_event_id: billingEventId,
    p_claim_token: claimToken,
    p_error: succeeded ? undefined : message,
    p_result_status: succeeded ? (resultStatus ?? "processed") : undefined,
    p_succeeded: succeeded
  });
  if (error || !data) {
    throw new Error(error?.message ?? "billing_event_attempt_finish_failed");
  }

  const settlement = data as BillingAttemptSettlement;
  if (!settlement.settled) {
    throw new Error("billing_event_attempt_lease_lost");
  }

  return { message, settlement };
}

export async function markBillingEventProcessed(
  billingEventId: string,
  claimToken: string
) {
  const { settlement } = await finishBillingEventAttempt({
    billingEventId,
    claimToken,
    succeeded: true
  });
  if (
    settlement.status !== "processed" ||
    typeof settlement.processedAt !== "string"
  ) {
    throw new Error("billing_event_attempt_finish_invalid");
  }
  return settlement.processedAt;
}

export async function markBillingEventIgnored(
  billingEventId: string,
  claimToken: string
) {
  const { settlement } = await finishBillingEventAttempt({
    billingEventId,
    claimToken,
    resultStatus: "ignored",
    succeeded: true
  });
  if (
    settlement.status !== "ignored" ||
    typeof settlement.processedAt !== "string"
  ) {
    throw new Error("billing_event_attempt_finish_invalid");
  }
  return settlement.processedAt;
}

export async function beginBillingEventAttempt(
  billingEventId: string
): Promise<BillingAttempt> {
  const supabase = requireAdminClient();
  const { data, error } = await supabase.rpc("begin_billing_event_attempt", {
    p_billing_event_id: billingEventId
  });
  if (error || !data) {
    throw new Error(error?.message ?? "billing_event_attempt_record_failed");
  }

  const attempt = data as Partial<{
    attemptCount: number;
    claimed: boolean;
    claimToken: string;
    lastAttemptedAt: string;
    status: string;
  }>;
  if (attempt.claimed === false && typeof attempt.status === "string") {
    return { claimed: false, status: attempt.status };
  }
  if (
    attempt.claimed !== true ||
    !Number.isInteger(attempt.attemptCount) ||
    !isUuid(attempt.claimToken) ||
    typeof attempt.lastAttemptedAt !== "string" ||
    attempt.status !== "processing"
  ) {
    throw new Error("billing_event_attempt_record_invalid");
  }

  return {
    claimed: true,
    claimToken: attempt.claimToken,
    attemptCount: attempt.attemptCount!,
    lastAttemptedAt: attempt.lastAttemptedAt,
    status: "processing"
  };
}

export async function markBillingEventFailed(
  billingEventId: string,
  processingError: unknown,
  claimToken: string
) {
  const { message } = await finishBillingEventAttempt({
    billingEventId,
    claimToken,
    processingError,
    succeeded: false
  });
  return message;
}

export async function recordStripeReconciliationAttempt({
  identifier,
  requestedBy
}: {
  identifier: string;
  requestedBy: string;
}) {
  const supabase = requireAdminClient();
  const providerEventId = `reconcile_${randomUUID()}`;
  const { data, error } = await supabase
    .from("billing_events")
    .insert({
      event_type: "admin.billing.reconcile",
      payload: { identifier, requestedBy },
      provider: "stripe",
      provider_event_id: providerEventId,
      status: "received"
    })
    .select("id, created_at")
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "billing_reconciliation_record_failed");
  }

  return {
    createdAt: data.created_at as string,
    id: data.id as string,
    providerEventId
  };
}
