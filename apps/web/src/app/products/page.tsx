import Link from "next/link";
import type { Metadata } from "next";
import { DataEmpty, DataUnavailable } from "@/components/data-state";
import { ProductCatalog } from "@/components/product-catalog";
import { SectionShell } from "@/components/section-shell";
import { getAccountPurchases } from "@/lib/account-purchases";
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
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Buy focused Well Endowed templates and practical tools without starting a recurring membership.",
  alternates: { canonical: "/products" }
};

export default async function ProductsPage({
  searchParams
}: {
  searchParams: Promise<{
    focus?: string;
    product?: string;
    purchase?: string;
    q?: string;
    sort?: string;
  }>;
}) {
  const [snapshot, productSnapshot, params] = await Promise.all([
    getSessionSnapshot(),
    getProductSnapshot(),
    searchParams
  ]);
  if (params.purchase === "cancelled" && params.product) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      await releaseProductCheckout(supabase, params.product);
    }
  }
  const customerEmail = snapshot.user?.email ?? null;
  const membershipEntitled = snapshot.entitlements.includes("product.digital");
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
              You need one practical tool today, or want to see what Full Access includes.
            </p>
          </div>
          <div className="border-t border-dune pt-4 md:border-l md:border-t-0 md:px-6 md:pt-0">
            <p className="font-bold uppercase tracking-[0.12em] text-cocoa/70">
              Access
            </p>
            <p className="mt-2 font-medium">
              Purchases stay on your GS学院 account for future downloads.
            </p>
          </div>
          <div className="border-t border-dune pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
            <p className="font-bold uppercase tracking-[0.12em] text-cocoa/70">
              Checkout
            </p>
            <p className="mt-2 font-medium">
              Create an account first, then choose membership or a standalone Stripe checkout.
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
              alternativeHref="/library"
              alternativeLabel="Read a public guide"
              title="Products could not be loaded"
              description="Purchasing is unavailable until the catalog connection recovers."
              note="Checkout stays paused until the catalog returns; no purchase is started."
              retryHref="/products"
              variant="panel"
            />
          </div>
        ) : null}

        {customerEmail && !purchaseStateAvailable && !productSnapshot.error ? (
          <div className="mb-6">
            <DataUnavailable
              title="Purchase status could not be verified"
              description="Checkout is paused until your account history can be checked, preventing an accidental duplicate purchase."
              retryHref="/products"
            />
          </div>
        ) : null}

        {!productSnapshot.error && productSnapshot.items.length === 0 ? (
          <div className="mb-6">
            <DataEmpty
              actionHref="/pricing"
              actionLabel="Compare membership"
              title="No products are available"
              description="Standalone tools will appear here when they are ready for purchase."
              variant="panel"
            />
          </div>
        ) : null}

        {!productSnapshot.error && productSnapshot.items.length > 0 ? (
          <ProductCatalog
            checkoutEnabled={checkoutEnabled}
            customerEmail={customerEmail}
            entries={productSnapshot.items.map((product) => ({
              accessPaused: pausedProductIds.has(product.id),
              alreadyPurchased: purchasedProductIds.has(product.id),
              membershipEntitled,
              product
            }))}
            initialFocus={params.focus}
            initialQuery={params.q}
            initialSort={params.sort}
            purchaseStateAvailable={purchaseStateAvailable}
          />
        ) : null}

        <div className="mt-8 border-l-4 border-clay bg-white px-6 py-5 text-sm text-cocoa/75">
          Want ongoing access instead?{" "}
          <Link href="/pricing" className="font-semibold text-clay">
            Unlock every product with Full Access
          </Link>
          .
        </div>
      </SectionShell>
    </main>
  );
}
