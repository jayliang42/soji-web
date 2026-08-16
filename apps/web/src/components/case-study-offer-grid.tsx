import Link from "next/link";
import type { MembershipPlan, ProductOffer } from "@soji/types";
import { PlanCheckoutButton } from "@/components/plan-checkout-button";
import { ProductCheckoutButton } from "@/components/product-checkout-button";
import { PurchaseDisclosure } from "@/components/purchase-disclosure";

interface ProductEntry {
  accessPaused: boolean;
  alreadyPurchased: boolean;
  checkoutEnabled: boolean;
  kind: "product";
  membershipEntitled: boolean;
  offer: ProductOffer;
  productId?: string;
  purchaseStateAvailable: boolean;
}

interface MembershipEntry {
  checkoutEnabled: boolean;
  hasExistingMembership: boolean;
  kind: "membership";
  offer: ProductOffer;
  plan: MembershipPlan;
}

export type CaseStudyOfferEntry = ProductEntry | MembershipEntry;

export function CaseStudyOfferGrid({
  customerEmail,
  entries
}: {
  customerEmail: string | null;
  entries: CaseStudyOfferEntry[];
}) {
  return (
    <div
      className="grid gap-5 lg:grid-cols-2"
      id="case-study-offers"
      aria-label="Case study purchase options"
    >
      {entries.map((entry, index) => (
        <article
          className={`flex flex-col border p-6 sm:p-8 ${
            index === 1
              ? "border-clay bg-cocoa text-white"
              : "border-dune bg-white text-cocoa"
          }`}
          key={entry.offer.id}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p
                className={`text-xs font-bold uppercase tracking-[0.14em] ${
                  index === 1 ? "text-white/70" : "text-clay"
                }`}
              >
                {index === 1 ? "最划算" : "按篇解锁"}
              </p>
              <h3 className="mt-4 font-display text-3xl font-bold leading-tight sm:text-4xl">
                {entry.offer.title}
              </h3>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-display text-4xl font-bold">
                {entry.offer.priceLabel}
              </p>
              <p
                className={`mt-1 text-sm font-semibold ${
                  index === 1 ? "text-white/70" : "text-cocoa/70"
                }`}
              >
                一次性付款
              </p>
            </div>
          </div>

          <p
            className={`mt-5 text-base font-medium leading-7 ${
              index === 1 ? "text-white/78" : "text-cocoa/72"
            }`}
          >
            {entry.offer.summary}
          </p>

          <ul
            className={`mt-6 grid gap-3 border-t pt-5 text-sm font-semibold leading-6 sm:grid-cols-2 ${
              index === 1
                ? "border-white/20 text-white/82"
                : "border-dune text-cocoa/75"
            }`}
          >
            {entry.offer.bullets.map((bullet) => (
              <li className="flex gap-2" key={bullet}>
                <span aria-hidden="true" className="text-clay">
                  ✓
                </span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>

          <div className="mt-auto pt-7">
            {entry.kind === "product" ? (
              <>
                <ProductCheckoutButton
                  accessPaused={entry.accessPaused}
                  alreadyPurchased={entry.alreadyPurchased}
                  checkoutEnabled={entry.checkoutEnabled}
                  customerEmail={customerEmail}
                  membershipEntitled={entry.membershipEntitled}
                  nextPath="/pricing#case-study-offers"
                  productId={entry.productId}
                  productSlug={entry.offer.slug}
                  purchaseStateAvailable={entry.purchaseStateAvailable}
                  returnTo="pricing"
                />
                <PurchaseDisclosure variant="product" />
              </>
            ) : entry.hasExistingMembership ? (
              <Link
                href="/account"
                className="block w-full rounded-md border border-white bg-transparent px-6 py-4 text-center text-sm font-bold text-white transition-colors hover:bg-white hover:text-cocoa"
              >
                查看已解锁内容
              </Link>
            ) : (
              <>
                <PlanCheckoutButton
                  accountLabel="登录后解锁完整合集"
                  checkoutEnabled={entry.checkoutEnabled}
                  customerEmail={customerEmail}
                  darkSurface
                  label="一次性解锁全部 55 篇"
                  lookupKey={entry.plan.stripePriceLookupKey ?? null}
                  planId={entry.plan.id}
                />
                <PurchaseDisclosure
                  darkSurface
                  priceLabel={entry.offer.priceLabel}
                  variant="membership"
                />
              </>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
