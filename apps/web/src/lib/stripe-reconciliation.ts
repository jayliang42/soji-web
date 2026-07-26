import type Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import {
  beginStripeCustomerReconciliation,
  closeMissingCustomerSubscriptions,
  syncSubscriptionEntitlements
} from "@/lib/stripe-webhook";

export type StripeBillingIdentifierKind = "customer" | "subscription";

export function getStripeBillingIdentifierKind(
  identifier: string
): StripeBillingIdentifierKind | null {
  if (/^sub_[A-Za-z0-9]+$/.test(identifier)) {
    return "subscription";
  }
  if (/^cus_[A-Za-z0-9]+$/.test(identifier)) {
    return "customer";
  }
  return null;
}

export function getStripeReconciliationPayloadIdentifier(payload: Json) {
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    typeof payload.identifier !== "string"
  ) {
    return null;
  }

  return getStripeBillingIdentifierKind(payload.identifier)
    ? payload.identifier
    : null;
}

function getObjectId(value: string | { id: string } | null | undefined) {
  return typeof value === "string" ? value : value?.id ?? null;
}

async function reconcileLatestPaidInvoicePayment(
  stripe: Stripe,
  subscription: Stripe.Subscription
) {
  if (!subscription.latest_invoice) {
    return false;
  }

  const invoice =
    typeof subscription.latest_invoice === "string"
      ? await stripe.invoices.retrieve(subscription.latest_invoice)
      : subscription.latest_invoice;
  if (
    !invoice ||
    ("deleted" in invoice && invoice.deleted) ||
    typeof invoice.id !== "string"
  ) {
    throw new Error("stripe_latest_invoice_invalid");
  }

  const invoicePayments = await stripe.invoicePayments.list({
    invoice: invoice.id,
    limit: 2,
    status: "paid"
  });
  if (invoicePayments.data.length === 0) {
    return false;
  }
  if (invoicePayments.data.length !== 1) {
    throw new Error("stripe_paid_invoice_payment_ambiguous");
  }

  const invoicePayment = invoicePayments.data[0]!;
  if (invoicePayment.status !== "paid") {
    throw new Error("stripe_paid_invoice_payment_status_invalid");
  }
  if (
    invoicePayment.payment.type !== "payment_intent" ||
    !invoicePayment.payment.payment_intent
  ) {
    throw new Error("stripe_paid_invoice_payment_not_payment_intent");
  }
  const paymentId = getObjectId(invoicePayment.payment.payment_intent);
  if (!paymentId) {
    throw new Error("stripe_paid_invoice_payment_intent_missing");
  }
  const paidAt = invoicePayment.status_transitions.paid_at;
  if (!paidAt) {
    throw new Error("stripe_paid_invoice_payment_timestamp_missing");
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("supabase_service_role_not_configured");
  }
  const { data, error } = await supabase.rpc(
    "reconcile_stripe_subscription_paid_payment",
    {
      p_observed_at: new Date(paidAt * 1000).toISOString(),
      p_provider_payment_id: paymentId,
      p_provider_subscription_id: subscription.id
    }
  );
  if (error || typeof data !== "string") {
    throw new Error(error?.message ?? "stripe_paid_payment_reconciliation_invalid");
  }

  return true;
}

async function syncExactSubscription(
  stripe: Stripe,
  subscription: Stripe.Subscription
) {
  const result = await syncSubscriptionEntitlements({ subscription });
  await reconcileLatestPaidInvoicePayment(stripe, subscription);
  return result;
}

export async function reconcileStripeBilling(
  stripe: Stripe,
  identifier: string
) {
  const kind = getStripeBillingIdentifierKind(identifier);
  if (!kind) {
    throw new Error("invalid_stripe_billing_identifier");
  }

  if (kind === "subscription") {
    const subscription = await stripe.subscriptions.retrieve(identifier);
    const result = await syncExactSubscription(stripe, subscription);
    return {
      identifier,
      kind,
      staleSubscriptionsClosed: 0,
      subscriptionsSynced: result.action === "synced" ? 1 : 0
    } as const;
  }

  const reconciliation =
    await beginStripeCustomerReconciliation(identifier);
  const remoteSubscriptionIds = new Set<string>();
  let subscriptionsSynced = 0;
  for await (const subscription of stripe.subscriptions.list({
    customer: identifier,
    limit: 100,
    status: "all"
  })) {
    remoteSubscriptionIds.add(subscription.id);
    const result = await syncExactSubscription(stripe, subscription);
    if (result.action === "synced") {
      subscriptionsSynced += 1;
    }
  }

  const staleSubscriptionsClosed = await closeMissingCustomerSubscriptions(
    identifier,
    remoteSubscriptionIds,
    reconciliation.token
  );
  return {
    identifier,
    kind,
    staleSubscriptionsClosed,
    subscriptionsSynced
  } as const;
}
