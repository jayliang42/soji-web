import type { ProductOffer } from "@soji/types";
import clsx from "clsx";
import { getProductFocus, getProductFocusLabel } from "@/lib/product-presentation";

export function ProductArtwork({
  className,
  product,
  titleAs = "heading"
}: {
  className?: string;
  product: ProductOffer;
  titleAs?: "heading" | "text";
}) {
  const focus = getProductFocus(product);
  const background =
    focus === "track"
      ? "bg-richgreen"
      : focus === "talk"
        ? "bg-blush"
        : "bg-cream";
  const titleClassName =
    "max-w-[16ch] font-display text-4xl font-semibold leading-[1.02] sm:text-5xl";

  return (
    <div
      className={clsx(
        "relative min-h-56 overflow-hidden border-b border-dune p-6 text-cocoa sm:p-8",
        background,
        className
      )}
    >
      <div
        aria-hidden="true"
        className="absolute -right-12 -top-12 h-40 w-40 rounded-full border border-cocoa/10 bg-white/35"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-5 right-8 h-20 w-20 rotate-12 rounded-lg border border-cocoa/10 bg-white/45"
      />
      <div className="relative flex min-h-40 h-full flex-col justify-between">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-cocoa/65">
            {getProductFocusLabel(product)}
          </p>
          <p className="rounded-full border border-cocoa/15 bg-white/65 px-4 py-2 text-sm font-bold">
            {product.priceLabel} once
          </p>
        </div>
        {titleAs === "heading" ? (
          <h3 className={titleClassName}>{product.title}</h3>
        ) : (
          <p className={titleClassName}>{product.title}</p>
        )}
      </div>
    </div>
  );
}
