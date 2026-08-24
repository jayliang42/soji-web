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
      accessLabel: "访问权限有效",
      detail: null,
      primaryLabel: "将在当前周期结束时取消",
      tone: "success"
    };
  }

  switch (subscription.status) {
    case "active":
      return {
        accessLabel: "访问权限有效",
        detail: null,
        primaryLabel: "有效",
        tone: "success"
      };
    case "trialing":
      return {
        accessLabel: "访问权限有效",
        detail: null,
        primaryLabel: "试用中",
        tone: "success"
      };
    case "incomplete":
      return {
        accessLabel: "暂不可访问",
        detail:
          "请在账单管理中完成或更新付款。Stripe 确认订阅有效后，访问权限才会恢复。",
        primaryLabel: "付款未完成",
        tone: "warning"
      };
    case "past_due":
      return {
        accessLabel: "访问权限已暂停",
        detail:
          "请在账单管理中更新付款。Stripe 确认订阅有效后，访问权限才会恢复。",
        primaryLabel: "付款异常",
        tone: "warning"
      };
    case "unpaid":
      return {
        accessLabel: "访问权限已暂停",
        detail:
          "请在账单管理中检查付款。Stripe 确认订阅有效后，访问权限才会恢复。",
        primaryLabel: "尚未付款",
        tone: "warning"
      };
    case "paused":
      return {
        accessLabel: "访问权限已暂停",
        detail:
          "请在账单管理中检查订阅。仅打开账单页面不会自动恢复访问权限。",
        primaryLabel: "已暂停",
        tone: "warning"
      };
    case "incomplete_expired":
      return {
        accessLabel: "无访问权限",
        detail: "请选择会员方案并重新发起结账。",
        primaryLabel: "结账已过期",
        tone: "neutral"
      };
    case "canceled":
      return {
        accessLabel: "访问权限已结束",
        detail: null,
        primaryLabel: "已取消",
        tone: "neutral"
      };
    default:
      return {
        accessLabel: "暂不可访问",
        detail:
          "暂时无法核实此订阅状态。请重试并确认状态后再使用会员内容。",
        primaryLabel: "状态不可用",
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
      accessLabel: "访问权限已结束",
      detail: "这笔付款已不再提供会员访问权限。",
      primaryLabel: "付款争议败诉",
      tone: "error"
    };
  }

  const openDispute = currentAdjustments.some(
    (item) =>
      item.kind === "dispute" && openDisputeStatuses.has(item.status)
  );
  if (openDispute) {
    return {
      accessLabel: "访问权限已暂停",
      detail: "付款争议审核期间，访问权限会暂停。",
      primaryLabel: "付款存在争议",
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
      accessLabel: "访问权限已结束",
      detail: "全额退款后，此订阅的访问权限已结束。",
      primaryLabel: "付款已退款",
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
          accessLabel: "访问权限有效",
          detail: "访问权限会持续到当前已付款周期结束。",
          primaryLabel: "已部分退款",
          tone: "success"
        }
      : {
          ...underlying,
          detail: "已记录部分退款，但不会因此恢复访问权限。"
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
        ? "付款争议已解决，此订阅当前有效。"
        : "付款争议已解决，但此订阅当前仍不符合访问条件。"
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
