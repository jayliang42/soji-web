import { getPlanByTier } from "@soji/domain";
import type { Metadata } from "next";
import { AuthStatus } from "@/components/auth-status";
import { BillingPortalButton } from "@/components/billing-portal-button";
import { DataUnavailable } from "@/components/data-state";
import { MembershipPlanGrid } from "@/components/membership-plan-grid";
import { ProfileSetupRetry } from "@/components/profile-setup-retry";
import { SectionShell } from "@/components/section-shell";
import {
  getAccountMembershipPurchases,
  getAccountPurchases,
  type AccountMembershipPurchase
} from "@/lib/account-purchases";
import {
  getAccountSubscriptions,
  getSubscriptionBillingPresentation,
  hasOpenStripeMembership
} from "@/lib/account-subscriptions";
import {
  getBillingDeliveryReadiness,
  isBillingDeliveryReady
} from "@/lib/billing-readiness";
import {
  getCheckoutReturnStatus,
  type CheckoutReturnKind,
  type CheckoutReturnStatus
} from "@/lib/checkout-return";
import { getEntitlementLabel } from "@/lib/entitlements";
import { hasStripeConfig } from "@/lib/env";
import {
  isDeliveredPurchaseStatus,
  isPurchaseDisputeBlockingAccess
} from "@/lib/purchase-status";
import { getSessionSnapshot } from "@/lib/session";
import Link from "next/link";

export const metadata: Metadata = {
  title: "账户",
  robots: { follow: false, index: false }
};

function CheckoutBanner({
  status
}: {
  status: CheckoutReturnStatus;
}) {
  if (status.state === "none") {
    return null;
  }

  const content = {
    confirmed: {
      title: "付款已确认",
      detail:
        status.kind === "product"
          ? "Stripe 已确认这笔购买。安全 webhook 完成访问权限同步后，记录会显示在下方。"
          : "Stripe 已确认本次结账。安全 webhook 完成同步后，会员权限会显示在下方。"
    },
    incomplete: {
      title: "结账尚未完成",
      detail: "Stripe 尚未确认本次结账已完成付款。"
    },
    invalid: {
      title: "无法核实本次结账返回状态",
      detail:
        "系统不会擅自判断付款状态。请使用结账时的账号登录，并查看下方记录。"
    },
    processing: {
      title: "付款仍在处理中",
      detail:
        "Stripe 已完成结账流程，但尚未确认付款。待付款方式处理完成后，请刷新此页面。"
    },
    unavailable: {
      title: "付款状态暂不可用",
      detail:
        "系统不会擅自判断付款状态。Stripe 和账单 webhook 确认后，购买记录会显示在下方。"
    }
  }[status.state];
  const toneClass = {
    confirmed: "border-sage/40 bg-success-muted",
    incomplete: "border-dune bg-cream",
    invalid: "border-dune bg-cream",
    processing: "border-warning/40 bg-cream",
    unavailable: "border-clay/30 bg-accent-muted"
  }[status.state];

  return (
    <div
      className={`mt-6 rounded-lg border px-5 py-4 text-sm text-cocoa ${toneClass}`}
      role="status"
    >
      <p className="font-semibold">{content.title}</p>
      <p className="mt-1 text-cocoa/75">{content.detail}</p>
    </div>
  );
}

function getReturnKind({ checkout, purchase }: { checkout?: string; purchase?: string }) {
  if (purchase === "success") {
    return "product" satisfies CheckoutReturnKind;
  }
  if (checkout === "success") {
    return "membership" satisfies CheckoutReturnKind;
  }
  return null;
}

interface PurchasePresentation {
  accessLabel: string;
  canDownload: boolean;
  primaryLabel: string;
  tone: "error" | "neutral" | "success" | "warning";
}

interface MembershipPurchasePresentation {
  accessLabel: string;
  primaryLabel: string;
  tone: "error" | "neutral" | "success" | "warning";
}

const openMembershipDisputeStatuses = new Set([
  "needs_response",
  "under_review",
  "warning_needs_response",
  "warning_under_review"
]);
const resolvedMembershipDisputeStatuses = new Set([
  "prevented",
  "warning_closed",
  "won"
]);

function getMembershipPurchasePresentation({
  disputeStatus,
  status
}: Pick<AccountMembershipPurchase, "disputeStatus" | "status">): MembershipPurchasePresentation {
  if (disputeStatus === "lost") {
    return {
      accessLabel: "访问权限已结束",
      primaryLabel: "付款争议败诉",
      tone: "error"
    };
  }
  if (
    disputeStatus &&
    openMembershipDisputeStatuses.has(disputeStatus)
  ) {
    return {
      accessLabel: "访问权限已暂停",
      primaryLabel: "付款存在争议",
      tone: "warning"
    };
  }
  if (status === "refunded") {
    return {
      accessLabel: "访问权限已结束",
      primaryLabel: "已退款",
      tone: "error"
    };
  }
  if (status === "partially_refunded") {
    return {
      accessLabel: "Full Access 权限有效",
      primaryLabel: "已部分退款",
      tone: "success"
    };
  }
  if (status === "paid" || status === "no_payment_required") {
    const paymentLabel =
      status === "paid" ? "付款已确认" : "无需付款";
    return {
      accessLabel: "Full Access 权限有效",
      primaryLabel:
        disputeStatus && resolvedMembershipDisputeStatuses.has(disputeStatus)
          ? `${paymentLabel} · 付款争议已解决`
          : paymentLabel,
      tone: "success"
    };
  }
  return {
    accessLabel: "暂不可访问",
    primaryLabel: "状态不可用",
    tone: "neutral"
  };
}

function getBillingProviderLabel(provider: AccountMembershipPurchase["provider"]) {
  return {
    app_store: "App Store",
    play_store: "Google Play",
    stripe: "Stripe"
  }[provider];
}

function getPurchasePresentation({
  disputeStatus,
  downloadReady,
  status
}: {
  disputeStatus: string | null;
  downloadReady: boolean;
  status: string;
}): PurchasePresentation {
  const isDelivered = isDeliveredPurchaseStatus(status);
  const paymentLabel =
    status === "partially_refunded"
      ? "已部分退款"
      : status === "paid" || status === "no_payment_required"
        ? "付款已确认"
        : null;

  if (status === "refunded") {
    return {
      accessLabel: "访问权限已结束",
      canDownload: false,
      primaryLabel: "已退款",
      tone: "error"
    };
  }
  if (disputeStatus === "lost") {
    return {
      accessLabel: "访问权限已结束",
      canDownload: false,
      primaryLabel: "付款争议败诉",
      tone: "error"
    };
  }
  if (isPurchaseDisputeBlockingAccess(disputeStatus)) {
    return {
      accessLabel: "访问权限已暂停",
      canDownload: false,
      primaryLabel: "付款存在争议",
      tone: "warning"
    };
  }
  if (!isDelivered || !paymentLabel) {
    return status === "pending"
      ? {
          accessLabel: "Stripe 确认付款后即可下载。",
          canDownload: false,
          primaryLabel: "付款待确认",
          tone: "warning"
        }
      : {
          accessLabel: "暂不可交付",
          canDownload: false,
          primaryLabel: "状态不可用",
          tone: "neutral"
        };
  }

  const resolvedLabel =
    disputeStatus === "won"
      ? `${paymentLabel} · 付款争议胜诉`
      : disputeStatus === "warning_closed" || disputeStatus === "prevented"
        ? `${paymentLabel} · 调查已结束`
        : paymentLabel;
  return {
    accessLabel: downloadReady ? "可以下载" : "暂不可交付",
    canDownload: downloadReady,
    primaryLabel: resolvedLabel,
    tone: downloadReady ? "success" : "warning"
  };
}

function billingToneClass(
  tone: "error" | "neutral" | "success" | "warning"
) {
  return {
    error: "text-error",
    neutral: "text-cocoa/65",
    success: "text-success",
    warning: "text-warning"
  }[tone];
}

function formatAccountDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(
    new Date(value)
  );
}

function getSubscriptionDate(
  subscription: Awaited<
    ReturnType<typeof getAccountSubscriptions>
  >["items"][number]
) {
  if (
    subscription.cancelAtPeriodEnd &&
    (subscription.status === "active" || subscription.status === "trialing") &&
    subscription.currentPeriodEndsAt
  ) {
    return {
      label: "访问权限有效至",
      value: subscription.currentPeriodEndsAt
    };
  }
  if (subscription.status === "trialing" && subscription.currentPeriodEndsAt) {
    return {
      label: "试用结束于",
      value: subscription.currentPeriodEndsAt
    };
  }
  if (subscription.status === "active" && subscription.currentPeriodEndsAt) {
    return {
      label: "续费日期",
      value: subscription.currentPeriodEndsAt
    };
  }
  if (subscription.status === "canceled" && subscription.cancelledAt) {
    return {
      label: "结束于",
      value: subscription.cancelledAt
    };
  }
  return { label: "记录于", value: subscription.createdAt };
}

function formatProviderList(providers: string[]) {
  const providerLabels: Record<string, string> = {
    email: "邮箱",
    google: "Google"
  };
  return new Intl.ListFormat("zh-CN", { type: "conjunction" }).format(
    (providers.length > 0 ? providers : ["email"]).map(
      (provider) => providerLabels[provider] ?? provider
    )
  );
}

export default async function AccountPage({
  searchParams
}: {
  searchParams: Promise<{
    checkout?: string;
    next?: string;
    purchase?: string;
    session_id?: string;
    setup?: string;
    view?: string;
  }>;
}) {
  const [snapshot, params] = await Promise.all([
    getSessionSnapshot(),
    searchParams
  ]);
  const user = snapshot.user;
  const canManage = Boolean(
    !snapshot.error &&
      user &&
      (user.roles.includes("admin") || user.roles.includes("editor"))
  );
  const accountTruthUnavailable = Boolean(snapshot.error);
  const plan = accountTruthUnavailable
    ? null
    : getPlanByTier(user?.tier ?? "free");
  const entitlements = snapshot.entitlements;
  const [
    checkoutReturn,
    membershipPurchases,
    purchases,
    subscriptions
  ] = await Promise.all([
    getCheckoutReturnStatus({
      kind: getReturnKind(params),
      sessionId: params.session_id,
      userId: user?.id
    }),
    getAccountMembershipPurchases(user?.id, snapshot.source),
    getAccountPurchases(user?.id, snapshot.source),
    getAccountSubscriptions(user?.id, snapshot.source)
  ]);
  const hasManageableSubscription = subscriptions.items.some(
    (subscription) =>
      !accountTruthUnavailable && subscription.canManage
  );
  const hasExistingMembership =
    !accountTruthUnavailable &&
    (entitlements.includes("content.all") ||
      hasOpenStripeMembership(subscriptions.items));
  const showMembershipOptions = params.view === "subscriptions";
  const shouldCheckBillingReadiness =
    !snapshot.error &&
    !subscriptions.error &&
    (hasManageableSubscription ||
      (showMembershipOptions && !hasExistingMembership && hasStripeConfig()));
  let billingDeliveryReady = false;
  if (shouldCheckBillingReadiness) {
    billingDeliveryReady = isBillingDeliveryReady(
      await getBillingDeliveryReadiness()
    );
  }
  const billingManagementAvailable =
    !accountTruthUnavailable &&
    hasManageableSubscription &&
    billingDeliveryReady;
  const checkoutEnabled =
    !accountTruthUnavailable &&
    Boolean(user) &&
    showMembershipOptions &&
    !hasExistingMembership &&
    hasStripeConfig() &&
    billingDeliveryReady;
  const currentPlanName = accountTruthUnavailable
    ? "会员状态不可用"
    : plan?.name ?? "免费";
  const accessSummary = accountTruthUnavailable
    ? "访问权限需要核实"
    : entitlements.length > 0
      ? `${entitlements.length} 项有效权益`
      : "预览权限";

  return (
    <main>
      <SectionShell
        compact
        eyebrow="账户"
        headingLevel={1}
        title={user?.fullName ?? user?.email ?? "访客"}
        description="查看当前有效权限、管理账单，并继续使用你需要的 GS学院内容。"
      >
        {params.setup === "failed" && user ? (
          <ProfileSetupRetry nextPath={params.next} />
        ) : null}
        {snapshot.error ? (
          <div className="mb-6">
            <DataUnavailable
              title="账户服务暂不可用"
              description="暂时无法核实登录或会员数据。下方权限采用保守显示；购买或修改账单前请重试。"
            />
          </div>
        ) : null}

        {user ? (
          <nav
            aria-label="账户页面分区"
            className="mb-5 flex flex-wrap gap-2 rounded-xl border border-dune bg-shell p-2"
          >
            {[
              { href: "#account-overview", label: "概览" },
              { href: "#account-membership", label: "会员" },
              { href: "#account-purchases", label: "购买记录" },
              { href: "#account-profile", label: "账号资料" }
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg px-4 text-sm font-bold text-cocoa transition-colors hover:bg-cream hover:text-clay sm:flex-none"
              >
                {item.label}
              </a>
            ))}
          </nav>
        ) : null}

        <section
          aria-labelledby="account-overview-heading"
          className="scroll-mt-28"
          id="account-overview"
        >
          <h2 className="sr-only" id="account-overview-heading">
            账户概览
          </h2>
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.9fr_0.95fr]">
            <article className="relative overflow-hidden rounded-xl bg-cocoa p-6 text-white sm:p-7">
              <div
                aria-hidden="true"
                className="absolute -right-12 -top-14 h-40 w-40 rounded-full border border-white/15"
              />
              <div
                aria-hidden="true"
                className="absolute -bottom-20 right-8 h-40 w-40 rounded-full bg-white/5"
              />
              <div className="relative">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/65">
                    当前方案
                  </p>
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-white/85">
                    {accessSummary}
                  </span>
                </div>
                <p className="mt-5 font-display text-4xl font-semibold">
                  {currentPlanName}
                </p>
                <p className="mt-3 break-words text-sm text-white/75">
                  {user?.email ?? "当前未登录"}
                </p>
                <p className="mt-1 text-sm text-white/60">
                  {user
                    ? `登录方式：${formatProviderList(user.providers)}`
                    : "创建账号后可保存访问权限并开始结账。"}
                </p>
              </div>
              {user && !accountTruthUnavailable ? (
                <Link
                  href="/account?view=subscriptions#membership-options"
                  className="relative mt-6 inline-flex min-h-11 items-center rounded-md bg-white px-5 py-3 text-sm font-bold text-cocoa transition-colors hover:bg-cream motion-reduce:transition-none"
                >
                  升级会员
                </Link>
              ) : null}
              {!user ? (
                <div className="relative mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/login?next=/account"
                    className="inline-flex min-h-11 items-center rounded-md bg-white px-5 py-3 text-sm font-bold text-cocoa"
                  >
                    登录
                  </Link>
                  <Link
                    href="/pricing"
                    className="inline-flex min-h-11 items-center rounded-md border border-white/35 px-5 py-3 text-sm font-bold text-white"
                  >
                    查看价格
                  </Link>
                </div>
              ) : null}
            </article>

            <article className="rounded-xl border border-dune bg-shell p-6 sm:p-7">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-clay">
                当前权益
              </p>
              <p className="mt-4 font-display text-3xl font-semibold text-cocoa">
                {accountTruthUnavailable
                  ? "请重新检查"
                  : entitlements.length > 0
                    ? entitlements.length
                    : "预览"}
              </p>
              {accountTruthUnavailable ? (
                <p className="mt-3 text-sm leading-6 text-cocoa/70">
                  暂时无法核实权益。请刷新账户页并确认会员状态后再使用相关内容。
                </p>
              ) : entitlements.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {entitlements.map((entitlement) => (
                    <span
                      key={entitlement}
                      className="rounded-full bg-sand px-3 py-1.5 text-xs font-semibold text-cocoa"
                    >
                      {getEntitlementLabel(entitlement)}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-cocoa/70">
                  选择会员前，可以先阅读公开指南和会员内容预览。
                </p>
              )}
            </article>

            <article className="rounded-xl border border-dune bg-cream p-6 sm:p-7">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-clay">
                继续使用 GS学院
              </p>
              <div className="mt-4 grid gap-2">
                <Link
                  href="/library"
                  className="group flex min-h-11 items-center justify-between rounded-lg bg-shell px-4 text-sm font-bold text-cocoa transition-colors hover:text-clay"
                >
                  浏览资料库
                  <span
                    aria-hidden="true"
                    className="transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
                  >
                    →
                  </span>
                </Link>
                <Link
                  href="/office-hours"
                  className="group flex min-h-11 items-center justify-between rounded-lg bg-shell px-4 text-sm font-bold text-cocoa transition-colors hover:text-clay"
                >
                  查看线上答疑
                  <span
                    aria-hidden="true"
                    className="transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
                  >
                    →
                  </span>
                </Link>
              </div>
            </article>
          </div>
        </section>
        {!accountTruthUnavailable ? (
          <CheckoutBanner status={checkoutReturn} />
        ) : null}
        {user ? (
          <section
            aria-labelledby="subscriptions-heading"
            className="mt-6 scroll-mt-28 rounded-xl border border-dune bg-shell p-5 sm:p-7"
            id="account-membership"
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase text-cocoa/70">会员权限</p>
                <h2 id="subscriptions-heading" className="mt-2 font-display text-2xl font-semibold text-cocoa">
                  Full Access
                </h2>
              </div>
              {!accountTruthUnavailable ? (
                <Link
                  href={
                    showMembershipOptions
                      ? "/account#subscriptions-heading"
                      : "/account?view=subscriptions#membership-options"
                  }
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-clay"
                >
                  {showMembershipOptions
                    ? "收起会员方案"
                    : "查看会员方案"}
                </Link>
              ) : null}
            </div>

            {accountTruthUnavailable || subscriptions.error ? (
              <div className="mt-4">
                <DataUnavailable
                  title={
                    accountTruthUnavailable
                      ? "无法核实订阅"
                      : "无法刷新订阅"
                  }
                  description={
                    accountTruthUnavailable
                      ? "账户服务恢复前，会员账单和访问权限暂不可用。使用会员内容或修改账单前请刷新确认。"
                      : "当前访问权限采用保守显示。修改账单前请重试。"
                  }
                />
              </div>
            ) : (
              <>
                {hasManageableSubscription && !billingManagementAvailable ? (
                  <div className="mt-4">
                    <DataUnavailable
                      title="账单管理暂不可用"
                      description="在安全记录账单更新之前，订阅修改已暂停。你当前的订阅没有改变。请稍后刷新账户页重试；如果仍不可用，请通过帮助中心联系我们。"
                    />
                  </div>
                ) : null}
                {subscriptions.items.length > 0 ? (
                  <div className="mt-4 divide-y divide-dune border-y border-dune">
                    {subscriptions.items.map((subscription) => {
                      const presentation =
                        getSubscriptionBillingPresentation(subscription);
                      const date = getSubscriptionDate(subscription);
                      return (
                        <article
                          className="grid gap-4 py-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-6"
                          key={subscription.id}
                        >
                          <div className="min-w-0">
                            <h3 className="break-words font-semibold text-cocoa">
                              {subscription.planName}
                            </h3>
                            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm font-semibold">
                              <span
                                className={billingToneClass(
                                  presentation.tone
                                )}
                              >
                                {presentation.primaryLabel}
                              </span>
                              <span className={billingToneClass(presentation.tone)}>
                                {presentation.accessLabel}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-cocoa/65">
                              {date.label}{" "}
                              <time dateTime={date.value}>
                                {formatAccountDate(date.value)}
                              </time>
                            </p>
                            {presentation.detail ? (
                              <p className="mt-4 max-w-[68ch] text-base leading-relaxed text-cocoa/75">
                                {presentation.detail}
                              </p>
                            ) : null}
                          </div>
                          {subscription.canManage ? (
                            <div className="w-full md:max-w-xs md:text-right">
                              <BillingPortalButton
                                enabled={billingManagementAvailable}
                                subscriptionId={subscription.id}
                              />
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-cocoa/70">
                    {hasExistingMembership
                      ? "此账号的 Full Access 权限有效。99 美元为一次性付款，不会自动续费。"
                      : "此账号尚未记录 Full Access 购买。"}
                  </p>
                )}
              </>
            )}
          </section>
        ) : null}
        {user && showMembershipOptions && !accountTruthUnavailable ? (
          <section
            id="membership-options"
            className="mt-6 scroll-mt-28 rounded-xl border border-dune bg-shell p-5 sm:p-7"
            aria-labelledby="membership-options-heading"
          >
            <div className="mb-7 max-w-3xl">
              <p className="text-sm font-bold uppercase text-cocoa/70">
                会员方案
              </p>
              <h2
                id="membership-options-heading"
                className="mt-2 font-display text-2xl font-semibold text-cocoa"
              >
                选择会员升级方案
              </h2>
              <p className="mt-3 text-sm leading-6 text-cocoa/70">
                无需离开账户页即可比较访问权限和支持服务。
              </p>
            </div>
            <MembershipPlanGrid
              checkoutEnabled={checkoutEnabled}
              customerEmail={user.email}
              hasExistingMembership={hasExistingMembership}
            />
          </section>
        ) : null}
        {user ? (
          <section
            aria-labelledby="purchases-heading"
            className="mt-6 scroll-mt-28 rounded-xl border border-dune bg-shell p-5 sm:p-7"
            id="account-purchases"
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase text-cocoa/70">账单记录</p>
                <h2 id="purchases-heading" className="mt-2 font-display text-2xl font-semibold text-cocoa">
                  购买记录
                </h2>
              </div>
            </div>

            {accountTruthUnavailable || membershipPurchases.error || purchases.error ? (
              <div className="mt-4">
                <DataUnavailable
                  title={
                    accountTruthUnavailable
                      ? "无法核实购买记录"
                      : "无法刷新购买记录"
                  }
                  description={
                    accountTruthUnavailable
                      ? "账户服务恢复前，付款状态和下载暂不可用。请刷新确认后再依赖交付状态或重新购买。"
                      : "付款状态采用保守显示。再次购买同一内容前请重试。"
                  }
                />
              </div>
            ) : membershipPurchases.items.length > 0 || purchases.items.length > 0 ? (
              <div className="mt-4 divide-y divide-dune border-y border-dune">
                {membershipPurchases.items.map((purchase) => {
                  const presentation =
                    getMembershipPurchasePresentation(purchase);
                  return (
                    <article
                      className="grid gap-4 py-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-6"
                      key={`membership-${purchase.id}`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-cocoa/55">
                          一次性会员购买
                        </p>
                        <h3 className="mt-2 break-words font-semibold text-cocoa">
                          {purchase.planName}
                        </h3>
                        <p
                          className={`mt-2 text-sm font-semibold ${billingToneClass(presentation.tone)}`}
                        >
                          {presentation.primaryLabel}
                        </p>
                        <p
                          className={`mt-1 text-sm ${billingToneClass(presentation.tone)}`}
                        >
                          {presentation.accessLabel}
                        </p>
                        <p className="mt-2 text-sm text-cocoa/65">
                          {getBillingProviderLabel(purchase.provider)} · 一次性购买
                        </p>
                        <p className="mt-1 text-sm text-cocoa/65">
                          购买日期：{" "}
                          <time dateTime={purchase.createdAt}>
                            {formatAccountDate(purchase.createdAt)}
                          </time>
                        </p>
                      </div>
                    </article>
                  );
                })}
                {purchases.items.map((purchase) => {
                  const presentation = getPurchasePresentation(purchase);
                  return (
                    <article
                      className="grid gap-4 py-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-6"
                      key={purchase.id}
                    >
                      <div className="min-w-0">
                        <h3 className="break-words font-semibold text-cocoa">
                          {purchase.productTitle}
                        </h3>
                        <p
                          className={`mt-2 text-sm font-semibold ${billingToneClass(presentation.tone)}`}
                        >
                          {presentation.primaryLabel}
                        </p>
                        <p
                          className={`mt-1 text-sm ${billingToneClass(presentation.tone)}`}
                        >
                          {presentation.accessLabel}
                        </p>
                        <p className="mt-2 text-sm text-cocoa/65">
                          购买日期：{" "}
                          <time dateTime={purchase.createdAt}>
                            {formatAccountDate(purchase.createdAt)}
                          </time>
                        </p>
                      </div>
                      {presentation.canDownload ? (
                        <a
                          aria-label={`下载 ${purchase.productTitle}`}
                          className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-cocoa px-5 py-3 text-sm font-semibold text-white md:w-auto"
                          href={`/api/account/purchases/${purchase.id}/download`}
                        >
                          下载文件
                        </a>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-lg bg-cream p-5">
                <p className="font-semibold text-cocoa">
                  暂无购买记录
                </p>
                <p className="mt-2 max-w-[62ch] text-sm leading-6 text-cocoa/70">
                  付款确认后，Full Access 和单独购买的电子产品会显示在这里。
                </p>
              </div>
            )}
          </section>
        ) : null}
        {canManage ? (
          <section className="mt-6 flex flex-col gap-4 rounded-xl border border-clay/25 bg-accent-muted p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-clay">
                内容管理工作区
              </p>
              <p className="mt-2 text-sm leading-6 text-cocoa/70">
                管理内容、产品、会员和账单操作。
              </p>
            </div>
            <Link
              href="/admin"
              className="w-fit rounded-md bg-cocoa px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-charcoal"
            >
              打开管理工作区
            </Link>
          </section>
        ) : null}
        <div className="mt-6 scroll-mt-28" id="account-profile">
          <AuthStatus user={snapshot.user} source={snapshot.source} />
        </div>
      </SectionShell>
    </main>
  );
}
