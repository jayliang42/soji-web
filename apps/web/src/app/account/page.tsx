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
  title: "Account",
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
      title: "Payment confirmed.",
      detail:
        status.kind === "product"
          ? "Stripe confirmed this purchase. It will appear below after the secure webhook finishes syncing access."
          : "Stripe confirmed this checkout. Membership access will appear after the secure webhook finishes syncing."
    },
    incomplete: {
      title: "Checkout was not completed.",
      detail: "Stripe has not confirmed a completed payment for this checkout session."
    },
    invalid: {
      title: "This checkout return could not be verified.",
      detail:
        "No payment status is being assumed. Sign in with the account used at checkout and review the records below."
    },
    processing: {
      title: "Payment is still processing.",
      detail:
        "Stripe has completed the checkout flow but has not confirmed payment yet. Refresh this page after the payment method settles."
    },
    unavailable: {
      title: "Payment status is temporarily unavailable.",
      detail:
        "No payment status is being assumed. Your purchase will appear below after Stripe and the billing webhook confirm it."
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
      accessLabel: "Access ended",
      primaryLabel: "Dispute lost",
      tone: "error"
    };
  }
  if (
    disputeStatus &&
    openMembershipDisputeStatuses.has(disputeStatus)
  ) {
    return {
      accessLabel: "Access paused",
      primaryLabel: "Payment disputed",
      tone: "warning"
    };
  }
  if (status === "refunded") {
    return {
      accessLabel: "Access ended",
      primaryLabel: "Refunded",
      tone: "error"
    };
  }
  if (status === "partially_refunded") {
    return {
      accessLabel: "Full Access active",
      primaryLabel: "Partially refunded",
      tone: "success"
    };
  }
  if (status === "paid" || status === "no_payment_required") {
    const paymentLabel =
      status === "paid" ? "Payment confirmed" : "No payment required";
    return {
      accessLabel: "Full Access active",
      primaryLabel:
        disputeStatus && resolvedMembershipDisputeStatuses.has(disputeStatus)
          ? `${paymentLabel} · Dispute resolved`
          : paymentLabel,
      tone: "success"
    };
  }
  return {
    accessLabel: "Access unavailable",
    primaryLabel: "Status unavailable",
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
      ? "Partially refunded"
      : status === "paid" || status === "no_payment_required"
        ? "Payment confirmed"
        : null;

  if (status === "refunded") {
    return {
      accessLabel: "Access ended",
      canDownload: false,
      primaryLabel: "Refunded",
      tone: "error"
    };
  }
  if (disputeStatus === "lost") {
    return {
      accessLabel: "Access ended",
      canDownload: false,
      primaryLabel: "Dispute lost",
      tone: "error"
    };
  }
  if (isPurchaseDisputeBlockingAccess(disputeStatus)) {
    return {
      accessLabel: "Access paused",
      canDownload: false,
      primaryLabel: "Payment disputed",
      tone: "warning"
    };
  }
  if (!isDelivered || !paymentLabel) {
    return status === "pending"
      ? {
          accessLabel: "Download available after Stripe confirms payment.",
          canDownload: false,
          primaryLabel: "Payment pending",
          tone: "warning"
        }
      : {
          accessLabel: "Delivery unavailable",
          canDownload: false,
          primaryLabel: "Status unavailable",
          tone: "neutral"
        };
  }

  const resolvedLabel =
    disputeStatus === "won"
      ? `${paymentLabel} · Dispute won`
      : disputeStatus === "warning_closed" || disputeStatus === "prevented"
        ? `${paymentLabel} · Inquiry closed`
        : paymentLabel;
  return {
    accessLabel: downloadReady ? "Download available" : "Delivery unavailable",
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
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
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
      label: "Access through",
      value: subscription.currentPeriodEndsAt
    };
  }
  if (subscription.status === "trialing" && subscription.currentPeriodEndsAt) {
    return {
      label: "Trial ends",
      value: subscription.currentPeriodEndsAt
    };
  }
  if (subscription.status === "active" && subscription.currentPeriodEndsAt) {
    return {
      label: "Renews",
      value: subscription.currentPeriodEndsAt
    };
  }
  if (subscription.status === "canceled" && subscription.cancelledAt) {
    return {
      label: "Ended",
      value: subscription.cancelledAt
    };
  }
  return { label: "Recorded", value: subscription.createdAt };
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
    ? "Membership unavailable"
    : plan?.name ?? "Free";
  const accessSummary = accountTruthUnavailable
    ? "Access needs verification"
    : entitlements.length > 0
      ? `${entitlements.length} active ${
          entitlements.length === 1 ? "benefit" : "benefits"
        }`
      : "Preview access";

  return (
    <main>
      <SectionShell
        compact
        eyebrow="Account"
        headingLevel={1}
        title={user?.fullName ?? user?.email ?? "Guest"}
        description="See what is active, manage billing, and return to the parts of GS学院 that matter next."
      >
        {params.setup === "failed" && user ? (
          <ProfileSetupRetry nextPath={params.next} />
        ) : null}
        {snapshot.error ? (
          <div className="mb-6">
            <DataUnavailable
              title="Account services are temporarily unavailable"
              description="Authentication or membership data could not be verified. Access below is shown conservatively; try again before purchasing or changing billing."
            />
          </div>
        ) : null}

        {user ? (
          <nav
            aria-label="Account sections"
            className="mb-5 flex flex-wrap gap-2 rounded-xl border border-dune bg-shell p-2"
          >
            {[
              { href: "#account-overview", label: "Overview" },
              { href: "#account-membership", label: "Membership" },
              { href: "#account-purchases", label: "Purchases" },
              { href: "#account-profile", label: "Profile" }
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
            Account overview
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
                    Current tier
                  </p>
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-white/85">
                    {accessSummary}
                  </span>
                </div>
                <p className="mt-5 font-display text-4xl font-semibold">
                  {currentPlanName}
                </p>
                <p className="mt-3 break-words text-sm text-white/75">
                  {user?.email ?? "No active session"}
                </p>
                <p className="mt-1 text-sm text-white/60">
                  {user
                    ? `Signed in with ${user.providers.join(" and ") || "email"}`
                    : "Create an account to save access and start checkout."}
                </p>
              </div>
              {user && !accountTruthUnavailable ? (
                <Link
                  href="/account?view=subscriptions#membership-options"
                  className="relative mt-6 inline-flex min-h-11 items-center rounded-md bg-white px-5 py-3 text-sm font-bold text-cocoa transition-colors hover:bg-cream motion-reduce:transition-none"
                >
                  Upgrade membership
                </Link>
              ) : null}
              {!user ? (
                <div className="relative mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/login?next=/account"
                    className="inline-flex min-h-11 items-center rounded-md bg-white px-5 py-3 text-sm font-bold text-cocoa"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/pricing"
                    className="inline-flex min-h-11 items-center rounded-md border border-white/35 px-5 py-3 text-sm font-bold text-white"
                  >
                    View pricing
                  </Link>
                </div>
              ) : null}
            </article>

            <article className="rounded-xl border border-dune bg-shell p-6 sm:p-7">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-clay">
                Active benefits
              </p>
              <p className="mt-4 font-display text-3xl font-semibold text-cocoa">
                {accountTruthUnavailable
                  ? "Check again"
                  : entitlements.length > 0
                    ? entitlements.length
                    : "Preview"}
              </p>
              {accountTruthUnavailable ? (
                <p className="mt-3 text-sm leading-6 text-cocoa/70">
                  Benefits could not be verified. Refresh Account before
                  relying on membership access.
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
                  Read public guides and member previews before choosing a
                  membership.
                </p>
              )}
            </article>

            <article className="rounded-xl border border-dune bg-cream p-6 sm:p-7">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-clay">
                Continue with GS学院
              </p>
              <div className="mt-4 grid gap-2">
                <Link
                  href="/library"
                  className="group flex min-h-11 items-center justify-between rounded-lg bg-shell px-4 text-sm font-bold text-cocoa transition-colors hover:text-clay"
                >
                  Browse your library
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
                  Check office hours
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
                <p className="text-sm font-bold uppercase text-cocoa/70">Membership access</p>
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
                    ? "Hide membership options"
                    : "View membership options"}
                </Link>
              ) : null}
            </div>

            {accountTruthUnavailable || subscriptions.error ? (
              <div className="mt-4">
                <DataUnavailable
                  title={
                    accountTruthUnavailable
                      ? "Subscriptions could not be verified"
                      : "Subscriptions could not be refreshed"
                  }
                  description={
                    accountTruthUnavailable
                      ? "Membership billing and access are unavailable until Account services recover. Refresh before relying on access or changing billing."
                      : "Your access is being shown conservatively. Try again before changing billing."
                  }
                />
              </div>
            ) : (
              <>
                {hasManageableSubscription && !billingManagementAvailable ? (
                  <div className="mt-4">
                    <DataUnavailable
                      title="Billing management is temporarily unavailable"
                      description="Subscription changes are paused until secure billing updates can be recorded. Your current subscription has not been changed. Refresh Account and try again later. If billing remains unavailable, use the published Support link."
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
                      ? "Full Access is active on this account. The $99 purchase does not renew automatically."
                      : "No Full Access purchase has been recorded for this account."}
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
                Membership options
              </p>
              <h2
                id="membership-options-heading"
                className="mt-2 font-display text-2xl font-semibold text-cocoa"
              >
                Upgrade your membership
              </h2>
              <p className="mt-3 text-sm leading-6 text-cocoa/70">
                Compare access and support without leaving your account.
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
                <p className="text-sm font-bold uppercase text-cocoa/70">Billing record</p>
                <h2 id="purchases-heading" className="mt-2 font-display text-2xl font-semibold text-cocoa">
                  Purchase history
                </h2>
              </div>
            </div>

            {accountTruthUnavailable || membershipPurchases.error || purchases.error ? (
              <div className="mt-4">
                <DataUnavailable
                  title={
                    accountTruthUnavailable
                      ? "Purchases could not be verified"
                      : "Purchases could not be refreshed"
                  }
                  description={
                    accountTruthUnavailable
                      ? "Payment status and downloads are unavailable until Account services recover. Refresh before relying on delivery or purchasing again."
                      : "Payment status is being shown conservatively. Try again before purchasing the same item."
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
                          One-time membership
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
                          {getBillingProviderLabel(purchase.provider)} · One-time purchase
                        </p>
                        <p className="mt-1 text-sm text-cocoa/65">
                          Purchased{" "}
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
                          Purchased{" "}
                          <time dateTime={purchase.createdAt}>
                            {formatAccountDate(purchase.createdAt)}
                          </time>
                        </p>
                      </div>
                      {presentation.canDownload ? (
                        <a
                          aria-label={`Download ${purchase.productTitle}`}
                          className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-cocoa px-5 py-3 text-sm font-semibold text-white md:w-auto"
                          href={`/api/account/purchases/${purchase.id}/download`}
                        >
                          Download file
                        </a>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-lg bg-cream p-5">
                <p className="font-semibold text-cocoa">
                  No purchases yet
                </p>
                <p className="mt-2 max-w-[62ch] text-sm leading-6 text-cocoa/70">
                  Full Access and standalone digital products will appear here
                  after payment is confirmed.
                </p>
              </div>
            )}
          </section>
        ) : null}
        {canManage ? (
          <section className="mt-6 flex flex-col gap-4 rounded-xl border border-clay/25 bg-accent-muted p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-clay">
                Publishing workspace
              </p>
              <p className="mt-2 text-sm leading-6 text-cocoa/70">
                Manage content, products, members, and billing operations.
              </p>
            </div>
            <Link
              href="/admin"
              className="w-fit rounded-md bg-cocoa px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-charcoal"
            >
              Open admin workspace
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
