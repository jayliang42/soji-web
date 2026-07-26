import Link from "next/link";
import type { Metadata } from "next";
import { ProductCheckoutButton } from "@/components/product-checkout-button";
import { DataEmpty, DataUnavailable } from "@/components/data-state";
import { SectionShell } from "@/components/section-shell";
import { getAccountPurchases } from "@/lib/account-purchases";
import {
  getBillingDeliveryReadiness,
  isBillingDeliveryReady
} from "@/lib/billing-readiness";
import { hasStripeConfig } from "@/lib/env";
import { getProductSnapshot } from "@/lib/products";
import {
  isDeliveredPurchaseStatus,
  isPurchaseDisputeBlockingAccess
} from "@/lib/purchase-status";
import { getSessionSnapshot } from "@/lib/session";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Buy focused Well Endowed templates and practical tools without starting a recurring membership.",
  alternates: { canonical: "/products" }
};

export default async function ProductsPage({
  searchParams
}: {
  searchParams: Promise<{ purchase?: string }>;
}) {
  const [snapshot, productSnapshot, params] = await Promise.all([
    getSessionSnapshot(),
    getProductSnapshot(),
    searchParams
  ]);
  const customerEmail = snapshot.user?.email ?? null;
  const purchases = await getAccountPurchases(snapshot.user?.id, snapshot.source);
  const purchaseStateAvailable = !snapshot.error && !purchases.error;
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
  let checkoutEnabled = false;
  if (customerEmail && purchaseStateAvailable && hasStripeConfig()) {
    checkoutEnabled = isBillingDeliveryReady(
      await getBillingDeliveryReadiness()
    );
  }
  const cancelled = params.purchase === "cancelled";

  return (
    <main>
      <SectionShell
        eyebrow="Products"
        headingLevel={1}
        title="Buy one focused tool without joining a membership."
        description="Standalone products give readers a lower-friction way to pay for a useful template or script pack before they are ready for recurring access."
      >
        <div className="mb-8 grid gap-6 border-y border-dune py-6 text-sm leading-6 text-cocoa/72 md:grid-cols-3 md:gap-0">
          <div className="border-t border-dune pt-4 first:border-t-0 first:pt-0 md:border-l md:border-t-0 md:px-6 md:pt-0 md:first:border-l-0 md:first:pl-0">
            <p className="font-bold uppercase tracking-[0.12em] text-cocoa/70">
              Best when
            </p>
            <p className="mt-2 font-medium">
              You need one practical tool today, not a recurring membership.
            </p>
          </div>
          <div className="border-t border-dune pt-4 md:border-l md:border-t-0 md:px-6 md:pt-0">
            <p className="font-bold uppercase tracking-[0.12em] text-cocoa/70">
              Access
            </p>
            <p className="mt-2 font-medium">
              Purchases stay on your Soji account for future downloads.
            </p>
          </div>
          <div className="border-t border-dune pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
            <p className="font-bold uppercase tracking-[0.12em] text-cocoa/70">
              Checkout
            </p>
            <p className="mt-2 font-medium">
              Create an account first, then complete secure Stripe checkout.
            </p>
          </div>
        </div>

        {cancelled ? (
          <div className="mb-6 rounded-lg border border-clay/30 bg-accent-muted px-5 py-4 text-sm text-cocoa">
            Product checkout was cancelled. Your account was not charged.
          </div>
        ) : null}

        {productSnapshot.error ? (
          <div className="mb-6">
            <DataUnavailable
              title="Products could not be loaded"
              description="Purchasing is unavailable until the catalog connection recovers."
            />
          </div>
        ) : null}

        {customerEmail && !purchaseStateAvailable ? (
          <div className="mb-6">
            <DataUnavailable
              title="Purchase status could not be verified"
              description="Checkout is paused until your account history can be checked, preventing an accidental duplicate purchase."
            />
          </div>
        ) : null}

        {!productSnapshot.error && productSnapshot.items.length === 0 ? (
          <div className="mb-6">
            <DataEmpty
              title="No products are available"
              description="Standalone tools will appear here when they are ready for purchase."
            />
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          {productSnapshot.items.map((product) => (
            <article
              key={product.id}
              className="flex h-full flex-col rounded-lg border border-dune bg-shell p-6 sm:p-8"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                <div>
                  <p className="text-xs font-bold uppercase text-cocoa/70">
                    Digital product
                  </p>
                  <h2 className="mt-4 font-display text-3xl leading-[1.05] text-cocoa sm:text-4xl">
                    {product.title}
                  </h2>
                </div>
                <p className="font-display text-4xl text-cocoa">{product.priceLabel}</p>
              </div>
              <p className="mt-5 text-lg leading-8 text-cocoa/76">{product.summary}</p>
              <ul className="mt-6 space-y-3 text-cocoa/78">
                {product.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-3">
                    <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-clay" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex flex-wrap items-center gap-4 pt-8">
                <ProductCheckoutButton
                  alreadyPurchased={purchasedProductIds.has(product.id)}
                  accessPaused={pausedProductIds.has(product.id)}
                  checkoutEnabled={checkoutEnabled}
                  customerEmail={customerEmail}
                  purchaseStateAvailable={purchaseStateAvailable}
                  productSlug={product.slug}
                />
                <span className="text-sm text-cocoa/58">
                  Secure account delivery
                </span>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 border-l-4 border-clay bg-white px-6 py-5 text-sm text-cocoa/75">
          Want ongoing access instead?{" "}
          <Link href="/pricing" className="font-semibold text-clay">
            Compare membership tiers
          </Link>
          .
        </div>
      </SectionShell>
    </main>
  );
}
