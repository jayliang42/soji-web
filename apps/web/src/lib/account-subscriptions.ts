import { getPlanByTier } from "@soji/domain";
import type { BillingProvider, MembershipTier } from "@soji/types";
import { reportOperationalError } from "@/lib/observability";
import type { Tables } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AccountSubscriptionBillingAdjustment {
  blocksAccess: boolean;
  kind: string;
  observedAt: string;
  status: string;
  supersededAt: string | null;
}

export interface AccountSubscription {
  billingAdjustments: AccountSubscriptionBillingAdjustment[];
  canManage: boolean;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  createdAt: string;
  currentPeriodEndsAt: string | null;
  id: string;
  planId: MembershipTier;
  planName: string;
  provider: BillingProvider;
  status: string;
}

export interface SubscriptionBillingPresentation {
  accessLabel: string;
  detail: string | null;
  primaryLabel: string;
  tone: "error" | "neutral" | "success" | "warning";
}

export interface AccountSubscriptionSnapshot {
  error?: string;
  items: AccountSubscription[];
}

const manageableSubscriptionStatuses = new Set([
  "active",
  "incomplete",
  "past_due",
  "paused",
  "trialing",
  "unpaid"
]);

export function isManageableSubscriptionStatus(status: string) {
  return manageableSubscriptionStatuses.has(status);
}

export function hasOpenStripeMembership(
  subscriptions: AccountSubscription[]
) {
  return subscriptions.some(
    (subscription) =>
      subscription.provider === "stripe" &&
      isManageableSubscriptionStatus(subscription.status)
  );
}

type SubscriptionAdjustmentRow = Pick<
  Tables<"subscription_billing_adjustments">,
  "blocks_access" | "kind" | "observed_at" | "status" | "superseded_at"
>;

type SubscriptionRow = Pick<
  Tables<"subscriptions">,
  | "cancel_at_period_end"
  | "cancelled_at"
  | "created_at"
  | "current_period_ends_at"
  | "id"
  | "plan_id"
  | "provider"
  | "provider_customer_id"
  | "status"
> & {
  subscription_billing_adjustments: SubscriptionAdjustmentRow[];
};

const eligibleSubscriptionStatuses = new Set(["active", "trialing"]);
const openDisputeStatuses = new Set([
  "warning_needs_response",
  "warning_under_review",
  "needs_response",
  "under_review"
]);
const resolvedDisputeStatuses = new Set([
  "won",
  "warning_closed",
  "prevented"
]);

function getUnderlyingSubscriptionPresentation(
  subscription: Pick<
    AccountSubscription,
    "cancelAtPeriodEnd" | "status"
  >
): SubscriptionBillingPresentation {
  if (
    subscription.cancelAtPeriodEnd &&
    eligibleSubscriptionStatuses.has(subscription.status)
  ) {
    return {
      accessLabel: "Access active",
      detail: null,
      primaryLabel: "Cancels at period end",
      tone: "success"
    };
  }

  switch (subscription.status) {
    case "active":
      return {
        accessLabel: "Access active",
        detail: null,
        primaryLabel: "Active",
        tone: "success"
      };
    case "trialing":
      return {
        accessLabel: "Access active",
        detail: null,
        primaryLabel: "Trial",
        tone: "success"
      };
    case "incomplete":
      return {
        accessLabel: "Access unavailable",
        detail:
          "Complete or update payment in billing. Access returns only after Stripe confirms an eligible subscription.",
        primaryLabel: "Payment incomplete",
        tone: "warning"
      };
    case "past_due":
      return {
        accessLabel: "Access paused",
        detail:
          "Update payment in billing. Access returns only after Stripe confirms an eligible subscription.",
        primaryLabel: "Payment issue",
        tone: "warning"
      };
    case "unpaid":
      return {
        accessLabel: "Access paused",
        detail:
          "Review payment in billing. Access returns only after Stripe confirms an eligible subscription.",
        primaryLabel: "Unpaid",
        tone: "warning"
      };
    case "paused":
      return {
        accessLabel: "Access paused",
        detail:
          "Review the subscription in billing. Opening billing does not itself restore access.",
        primaryLabel: "Paused",
        tone: "warning"
      };
    case "incomplete_expired":
      return {
        accessLabel: "No access",
        detail: "Choose a membership plan to start a new checkout.",
        primaryLabel: "Checkout expired",
        tone: "neutral"
      };
    case "canceled":
      return {
        accessLabel: "Access ended",
        detail: null,
        primaryLabel: "Canceled",
        tone: "neutral"
      };
    default:
      return {
        accessLabel: "Access unavailable",
        detail:
          "We could not verify this subscription state. Try again before relying on access.",
        primaryLabel: "Status unavailable",
        tone: "neutral"
      };
  }
}

export function getSubscriptionBillingPresentation(
  subscription: Pick<
    AccountSubscription,
    "billingAdjustments" | "cancelAtPeriodEnd" | "status"
  >
): SubscriptionBillingPresentation {
  const currentAdjustments = subscription.billingAdjustments.filter(
    (item) => item.supersededAt === null
  );
  const lostDispute = currentAdjustments.some(
    (item) => item.kind === "dispute" && item.status === "lost"
  );
  if (lostDispute) {
    return {
      accessLabel: "Access ended",
      detail: "This payment no longer provides membership access.",
      primaryLabel: "Dispute lost",
      tone: "error"
    };
  }

  const openDispute = currentAdjustments.some(
    (item) =>
      item.kind === "dispute" && openDisputeStatuses.has(item.status)
  );
  if (openDispute) {
    return {
      accessLabel: "Access paused",
      detail: "Access is paused while the payment dispute is under review.",
      primaryLabel: "Payment disputed",
      tone: "warning"
    };
  }

  const fullRefund = currentAdjustments.some(
    (item) =>
      item.kind === "refund" &&
      item.status === "refunded" &&
      item.blocksAccess
  );
  if (fullRefund) {
    return {
      accessLabel: "Access ended",
      detail: "A full refund ended access for this subscription.",
      primaryLabel: "Payment refunded",
      tone: "error"
    };
  }

  const partialRefund = currentAdjustments.some(
    (item) =>
      item.kind === "refund" && item.status === "partially_refunded"
  );
  const underlying = getUnderlyingSubscriptionPresentation(subscription);
  const isEligible = eligibleSubscriptionStatuses.has(subscription.status);
  if (partialRefund) {
    return isEligible
      ? {
          accessLabel: "Access active",
          detail: "Access continues through the current paid period.",
          primaryLabel: "Partially refunded",
          tone: "success"
        }
      : {
          ...underlying,
          detail: "A partial refund was recorded; it does not restore access."
        };
  }

  const resolvedDispute = currentAdjustments.some(
    (item) =>
      item.kind === "dispute" && resolvedDisputeStatuses.has(item.status)
  );
  if (resolvedDispute) {
    return {
      ...underlying,
      detail: isEligible
        ? "The payment dispute is resolved and this subscription is eligible."
        : "The payment dispute is resolved, but this subscription is not currently eligible."
    };
  }

  return underlying;
}

const demoAccountSubscriptions: AccountSubscription[] = [
  {
    billingAdjustments: [],
    canManage: false,
    cancelAtPeriodEnd: false,
    cancelledAt: "2026-06-30T12:00:00.000Z",
    createdAt: "2026-01-01T12:00:00.000Z",
    currentPeriodEndsAt: "2026-06-30T12:00:00.000Z",
    id: "00000000-0000-4000-8000-000000000601",
    planId: "tier_1",
    planName: "Full Access",
    provider: "stripe",
    status: "canceled"
  }
];

export async function getAccountSubscriptions(
  userId: string | undefined,
  source: "demo" | "supabase"
): Promise<AccountSubscriptionSnapshot> {
  if (!userId) {
    return { items: [] };
  }
  if (source === "demo") {
    return { items: demoAccountSubscriptions };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: "subscription_service_not_configured", items: [] };
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      "id, provider, provider_customer_id, plan_id, status, current_period_ends_at, cancelled_at, cancel_at_period_end, created_at, subscription_billing_adjustments(kind, status, blocks_access, observed_at, superseded_at)"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    await reportOperationalError("account.subscriptions_query_failed", error, {
      userId
    });
    return { error: "subscription_query_failed", items: [] };
  }

  return {
    items: data.map((row: SubscriptionRow) => ({
      billingAdjustments: row.subscription_billing_adjustments.map(
        (adjustment) => ({
          blocksAccess: adjustment.blocks_access,
          kind: adjustment.kind,
          observedAt: adjustment.observed_at,
          status: adjustment.status,
          supersededAt: adjustment.superseded_at
        })
      ),
      canManage:
        row.provider === "stripe" &&
        Boolean(row.provider_customer_id) &&
        isManageableSubscriptionStatus(row.status),
      cancelAtPeriodEnd: row.cancel_at_period_end,
      cancelledAt: row.cancelled_at,
      createdAt: row.created_at,
      currentPeriodEndsAt: row.current_period_ends_at,
      id: row.id,
      planId: row.plan_id,
      planName: getPlanByTier(row.plan_id)?.name ?? row.plan_id,
      provider: row.provider,
      status: row.status
    }))
  };
}
