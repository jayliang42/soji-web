import { getPlanByTier } from "@soji/domain";
import type { Metadata } from "next";
import { AuthStatus } from "@/components/auth-status";
import { BillingPortalButton } from "@/components/billing-portal-button";
import { DataUnavailable } from "@/components/data-state";
import { MembershipPlanGrid } from "@/components/membership-plan-grid";
import { ProfileSetupRetry } from "@/components/profile-setup-retry";
import { SectionShell } from "@/components/section-shell";
import { getAccountPurchases } from "@/lib/account-purchases";
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
    return "subscription" satisfies CheckoutReturnKind;
  }
  return null;
}

interface PurchasePresentation {
  accessLabel: string;
  canDownload: boolean;
  primaryLabel: string;
  tone: "error" | "neutral" | "success" | "warning";
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
    user &&
      (user.roles.includes("admin") || user.roles.includes("editor"))
  );
  const accountTruthUnavailable = Boolean(snapshot.error);
  const plan = accountTruthUnavailable
    ? null
    : getPlanByTier(user?.tier ?? "free");
  const entitlements = snapshot.entitlements;
  const [checkoutReturn, purchases, subscriptions] = await Promise.all([
    getCheckoutReturnStatus({
      kind: getReturnKind(params),
      sessionId: params.session_id,
      userId: user?.id
    }),
    getAccountPurchases(user?.id, snapshot.source),
    getAccountSubscriptions(user?.id, snapshot.source)
  ]);
  const hasManageableSubscription = subscriptions.items.some(
    (subscription) => subscription.canManage
  );
  const hasExistingMembership = hasOpenStripeMembership(subscriptions.items);
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
    hasManageableSubscription && billingDeliveryReady;
  const checkoutEnabled =
    Boolean(user) &&
    showMembershipOptions &&
    !hasExistingMembership &&
    hasStripeConfig() &&
    billingDeliveryReady;

  return (
    <main>
      <SectionShell
        eyebrow="Account"
        headingLevel={1}
        title={user?.fullName ?? user?.email ?? "Guest"}
        description="Your account shows the membership tier and benefits that unlock the library across web and app."
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
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-lg border border-dune bg-shell p-6">
            <p className="text-sm uppercase text-cocoa/70">Current tier</p>
            <h3 className="mt-3 font-display text-4xl text-cocoa">
              {accountTruthUnavailable
                ? "Membership unavailable"
                : plan?.name ?? "Free"}
            </h3>
            <p className="mt-3 text-cocoa/75">{user?.email ?? "No active session"}</p>
            <p className="mt-2 text-sm text-cocoa/70">
              {user ? `Sign-in methods: ${user.providers.join(", ") || "email"}` : "Create an account to start checkout and save access."}
            </p>
            {user && !accountTruthUnavailable ? (
              <Link
                href="/account?view=subscriptions#membership-options"
                className="mt-5 inline-flex min-h-11 items-center rounded-md border border-cocoa px-5 py-3 text-sm font-semibold text-cocoa transition-colors hover:bg-cocoa hover:text-white motion-reduce:transition-none"
              >
                Upgrade membership
              </Link>
            ) : null}
            {!user ? (
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/login?next=/account"
                  className="rounded-md bg-cocoa px-5 py-3 text-sm font-semibold text-white"
                >
                  Sign in
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-md border border-cocoa px-5 py-3 text-sm font-semibold text-cocoa"
                >
                  View pricing
                </Link>
              </div>
            ) : null}
          </div>
          <div className="rounded-lg border border-dune bg-shell p-6">
            <p className="text-sm uppercase text-cocoa/70">
              Active entitlements
            </p>
            {accountTruthUnavailable ? (
              <div className="mt-4 border-l-4 border-dune bg-sand px-4 py-3 text-sm text-cocoa/72">
                Benefits could not be verified. Refresh Account before relying
                on membership access.
              </div>
            ) : entitlements.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-3">
                {entitlements.map((entitlement) => (
                  <span
                    key={entitlement}
                    className="rounded-md bg-sand px-4 py-2 text-sm text-cocoa"
                  >
                      {getEntitlementLabel(entitlement)}
                  </span>
                ))}
              </div>
            ) : (
              <div className="mt-4 border-l-4 border-dune bg-sand px-4 py-3 text-sm text-cocoa/72">
                No paid benefits are active yet. Browse previews first or choose a membership tier.
              </div>
            )}
          </div>
        </div>
        <CheckoutBanner status={checkoutReturn} />
        {user ? (
          <section className="mt-6 border-t border-dune pt-6" aria-labelledby="subscriptions-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase text-cocoa/70">Membership billing</p>
                <h2 id="subscriptions-heading" className="mt-2 font-display text-2xl font-semibold text-cocoa">
                  Subscriptions
                </h2>
              </div>
              <Link
                href={
                  showMembershipOptions
                    ? "/account#subscriptions-heading"
                    : "/account?view=subscriptions#membership-options"
                }
                className="text-sm font-semibold text-clay"
              >
                {showMembershipOptions
                  ? "Hide membership options"
                  : "Upgrade membership"}
              </Link>
            </div>

            {subscriptions.error ? (
              <div className="mt-4">
                <DataUnavailable
                  title="Subscriptions could not be refreshed"
                  description="Your access is being shown conservatively. Try again before changing billing."
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
                    No membership subscriptions have been recorded for this account.
                  </p>
                )}
              </>
            )}
          </section>
        ) : null}
        {user && showMembershipOptions ? (
          <section
            id="membership-options"
            className="mt-6 border-t border-dune pt-6"
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
          <section className="mt-6 border-t border-dune pt-6" aria-labelledby="purchases-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase text-cocoa/70">Billing record</p>
                <h2 id="purchases-heading" className="mt-2 font-display text-2xl font-semibold text-cocoa">
                  Standalone purchases
                </h2>
              </div>
              <Link href="/products" className="text-sm font-semibold text-clay">
                Browse products
              </Link>
            </div>

            {purchases.error ? (
              <div className="mt-4">
                <DataUnavailable
                  title="Purchases could not be refreshed"
                  description="Payment status is being shown conservatively. Try again before purchasing the same item."
                />
              </div>
            ) : purchases.items.length > 0 ? (
              <div className="mt-4 divide-y divide-dune border-y border-dune">
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
              <p className="mt-4 text-sm text-cocoa/70">
                No standalone purchases have been recorded for this account.
              </p>
            )}
          </section>
        ) : null}
        {canManage ? (
          <section className="mt-6 flex flex-col gap-4 border-y border-dune py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase text-cocoa/70">
                Publishing workspace
              </p>
              <p className="mt-1 text-sm text-cocoa/70">
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
        <div className="mt-6">
          <AuthStatus user={snapshot.user} source={snapshot.source} />
        </div>
      </SectionShell>
    </main>
  );
}
