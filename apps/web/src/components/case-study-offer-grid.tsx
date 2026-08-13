import type { ProductOffer } from "@soji/types";
import { ProductCheckoutButton } from "@/components/product-checkout-button";

export interface CaseStudyOfferEntry {
  accessPaused: boolean;
  alreadyPurchased: boolean;
  offer: ProductOffer;
}

export function CaseStudyOfferGrid({
  checkoutEnabled,
  customerEmail,
  entries,
  purchaseStateAvailable
}: {
  checkoutEnabled: boolean;
  customerEmail: string | null;
  entries: CaseStudyOfferEntry[];
  purchaseStateAvailable: boolean;
}) {
  return (
    <div
      className="grid gap-5 lg:grid-cols-2"
      id="case-study-offers"
      aria-label="Case study purchase options"
    >
      {entries.map(({ accessPaused, alreadyPurchased, offer }, index) => (
        <article
          className={`flex flex-col border p-6 sm:p-8 ${
            index === 1
              ? "border-clay bg-cocoa text-white"
              : "border-dune bg-white text-cocoa"
          }`}
          key={offer.id}
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
                {offer.title}
              </h3>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-display text-4xl font-bold">
                {offer.priceLabel}
              </p>
              <p
                className={`mt-1 text-sm font-semibold ${
                  index === 1 ? "text-white/70" : "text-cocoa/60"
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
            {offer.summary}
          </p>

          <ul
            className={`mt-6 grid gap-3 border-t pt-5 text-sm font-semibold leading-6 sm:grid-cols-2 ${
              index === 1
                ? "border-white/20 text-white/82"
                : "border-dune text-cocoa/75"
            }`}
          >
            {offer.bullets.map((bullet) => (
              <li className="flex gap-2" key={bullet}>
                <span aria-hidden="true" className="text-clay">
                  ✓
                </span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>

          <div className="mt-auto pt-7">
            <ProductCheckoutButton
              accessPaused={accessPaused}
              alreadyPurchased={alreadyPurchased}
              checkoutEnabled={checkoutEnabled}
              customerEmail={customerEmail}
              darkSurface={index === 1}
              nextPath="/pricing#case-study-offers"
              productSlug={offer.slug}
              purchaseStateAvailable={purchaseStateAvailable}
            />
          </div>
        </article>
      ))}
    </div>
  );
}
