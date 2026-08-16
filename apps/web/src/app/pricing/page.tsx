import type { Metadata } from "next";
import { membershipPlans, productOffers } from "@soji/domain";
import { CaseStudyOfferGrid } from "@/components/case-study-offer-grid";
import { DataUnavailable } from "@/components/data-state";
import { MembershipTerms } from "@/components/membership-terms";
import { getAccountPurchases } from "@/lib/account-purchases";
import {
  getAccountSubscriptions,
  hasOpenStripeMembership
} from "@/lib/account-subscriptions";
import {
  getBillingDeliveryReadiness,
  isBillingDeliveryReady
} from "@/lib/billing-readiness";
import { hasStripeConfig } from "@/lib/env";
import { getProductSnapshot } from "@/lib/products";
import { releaseProductCheckout } from "@/lib/product-checkout-release";
import {
  isDeliveredPurchaseStatus,
  isPurchaseDisputeBlockingAccess
} from "@/lib/purchase-status";
import { getSessionSnapshot } from "@/lib/session";
import { releaseSubscriptionCheckout } from "@/lib/subscription-checkout-release";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "解锁录取案例",
  description: "单篇5美元，或一次性99美元解锁55篇真实录取案例合集。",
  alternates: { canonical: "/pricing" }
};

export default async function PricingPage({
  searchParams
}: {
  searchParams: Promise<{
    checkout?: string;
    product?: string;
    purchase?: string;
  }>;
}) {
  const [session, productSnapshot, params] = await Promise.all([
    getSessionSnapshot(),
    getProductSnapshot(),
    searchParams
  ]);

  if (
    params.checkout === "cancelled" ||
    (params.purchase === "cancelled" && params.product)
  ) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      if (params.checkout === "cancelled") {
        await releaseSubscriptionCheckout(supabase);
      } else if (params.product) {
        await releaseProductCheckout(supabase, params.product);
      }
    }
  }

  const [purchases, subscriptions] = await Promise.all([
    getAccountPurchases(session.user?.id, session.source),
    getAccountSubscriptions(session.user?.id, session.source)
  ]);
  const customerEmail = session.user?.email ?? null;
  const purchaseStateAvailable = !session.error && !purchases.error;
  const membershipStateAvailable = !session.error && !subscriptions.error;
  const hasExistingMembership =
    session.entitlements.includes("content.all") ||
    hasOpenStripeMembership(subscriptions.items);
  const hasFullProductAccess = session.entitlements.includes("product.digital");
  const purchasedProductIds = new Set(
    purchases.items
      .filter((purchase) => isDeliveredPurchaseStatus(purchase.status))
      .map((purchase) => purchase.productId)
  );
  const pausedProductIds = new Set(
    purchases.items
      .filter((purchase) =>
        isPurchaseDisputeBlockingAccess(purchase.disputeStatus)
      )
      .map((purchase) => purchase.productId)
  );
  const singleOfferFallback = productOffers.find(
    (offer) => offer.slug === "case-study-single"
  )!;
  const collectionOffer = productOffers.find(
    (offer) => offer.slug === "case-study-collection"
  )!;
  const fullAccessPlan = membershipPlans[0]!;
  const singleOffer =
    productSnapshot.items.find(
      (offer) => offer.slug === singleOfferFallback.slug
    ) ?? singleOfferFallback;
  const configuredSingleOffer = productSnapshot.items.find(
    (offer) =>
      offer.slug === singleOfferFallback.slug &&
      offer.isActive &&
      Boolean(offer.stripePriceId)
  );
  const singleAlreadyPurchased = configuredSingleOffer
    ? purchasedProductIds.has(configuredSingleOffer.id)
    : false;
  const singleAccessPaused = configuredSingleOffer
    ? pausedProductIds.has(configuredSingleOffer.id)
    : false;
  const needsProductCheckout =
    purchaseStateAvailable &&
    Boolean(configuredSingleOffer) &&
    !singleAlreadyPurchased &&
    !hasFullProductAccess;
  const needsMembershipCheckout =
    membershipStateAvailable && !hasExistingMembership;

  let billingReady = false;
  if (
    customerEmail &&
    !session.error &&
    hasStripeConfig() &&
    (needsProductCheckout || needsMembershipCheckout)
  ) {
    billingReady = isBillingDeliveryReady(
      await getBillingDeliveryReadiness()
    );
  }

  const cancelled =
    params.checkout === "cancelled" || params.purchase === "cancelled";
  const stateUnavailable =
    Boolean(session.error) ||
    Boolean(purchases.error) ||
    Boolean(subscriptions.error) ||
    Boolean(productSnapshot.error);

  return (
    <main>
      <section className="mx-auto max-w-6xl px-6 pb-10 pt-8 md:pb-14 md:pt-12">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-clay">
              55篇真实录取案例
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-[1] text-cocoa md:text-6xl">
              一次性付费，按你的需要解锁。
            </h1>
          </div>
          <p className="max-w-2xl text-base font-medium leading-7 text-cocoa/72 md:text-lg md:leading-8">
            单篇案例 $5，完整合集 $99。没有月费，先从你正在面对的申请问题开始。
          </p>
        </div>

        {cancelled ? (
          <div className="mt-6 border border-clay/25 bg-accent-muted px-5 py-4 text-sm font-medium text-cocoa">
            你已取消支付，账号没有被扣款，可以重新发起结账。
          </div>
        ) : null}

        {stateUnavailable ? (
          <div className="mt-6">
            <DataUnavailable
              title="购买状态暂时无法确认"
              description="为避免重复购买，受影响的结账入口已暂停。请稍后刷新再试。"
              retryHref="/pricing"
            />
          </div>
        ) : null}

        <div className="mt-10">
          <CaseStudyOfferGrid
            customerEmail={customerEmail}
            entries={[
              {
                accessPaused: singleAccessPaused,
                alreadyPurchased: singleAlreadyPurchased,
                checkoutEnabled:
                  billingReady &&
                  purchaseStateAvailable &&
                  Boolean(configuredSingleOffer),
                kind: "product",
                membershipEntitled: hasFullProductAccess,
                offer: singleOffer,
                productId: configuredSingleOffer?.id,
                purchaseStateAvailable
              },
              {
                checkoutEnabled:
                  billingReady &&
                  membershipStateAvailable &&
                  !hasExistingMembership,
                hasExistingMembership,
                kind: "membership",
                offer: collectionOffer,
                plan: fullAccessPlan
              }
            ]}
          />
        </div>

        <div className="mt-8 grid gap-4 border-y border-dune py-6 text-sm font-medium leading-6 text-cocoa/72 md:grid-cols-3 md:gap-0">
          <div className="border-t border-dune pt-4 first:border-t-0 first:pt-0 md:border-l md:border-t-0 md:px-6 md:pt-0 md:first:border-l-0 md:first:pl-0">
            <p className="font-bold uppercase tracking-[0.12em] text-clay">单篇</p>
            <p className="mt-2">只解锁当前最想研究的一个申请问题。</p>
          </div>
          <div className="border-t border-dune pt-4 md:border-l md:border-t-0 md:px-6 md:pt-0">
            <p className="font-bold uppercase tracking-[0.12em] text-clay">合集</p>
            <p className="mt-2">55篇全部解锁，同时包含 Full Access 的全部权益。</p>
          </div>
          <div className="border-t border-dune pt-4 md:border-l md:border-t-0 md:pl-6">
            <p className="font-bold uppercase tracking-[0.12em] text-clay">付款</p>
            <p className="mt-2">两档均为一次性支付，没有自动续费或月度扣款。</p>
          </div>
        </div>

        <MembershipTerms />
      </section>
    </main>
  );
}
