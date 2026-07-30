"use client";

import type { ProductOffer } from "@soji/types";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ProductArtwork } from "@/components/product-artwork";
import { ProductCheckoutButton } from "@/components/product-checkout-button";
import { PurchaseDisclosure } from "@/components/purchase-disclosure";
import {
  getProductFocus,
  getProductSearchText,
  type ProductFocus
} from "@/lib/product-presentation";

const focusOptions = [
  { id: "all", label: "All tools" },
  { id: "track", label: "Track & review" },
  { id: "talk", label: "Talk & decide" }
] as const;

const sortOptions = [
  { id: "featured", label: "Featured" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" }
] as const;

export type ProductSort = (typeof sortOptions)[number]["id"];

interface ProductFilterState {
  focus: ProductFocus;
  query: string;
  sort: ProductSort;
}

export interface ProductCatalogEntry {
  accessPaused: boolean;
  alreadyPurchased: boolean;
  product: ProductOffer;
}

function normalizeFocus(value: string | undefined): ProductFocus {
  return focusOptions.some((option) => option.id === value)
    ? (value as ProductFocus)
    : "all";
}

function normalizeSort(value: string | undefined): ProductSort {
  return sortOptions.some((option) => option.id === value)
    ? (value as ProductSort)
    : "featured";
}

export function getProductFilterHref(
  { focus, query, sort }: ProductFilterState,
  currentSearch = ""
) {
  const params = new URLSearchParams(currentSearch);
  const normalizedQuery = query.trim();

  params.delete("focus");
  params.delete("q");
  params.delete("sort");

  if (focus !== "all") {
    params.set("focus", focus);
  }
  if (sort !== "featured") {
    params.set("sort", sort);
  }
  if (normalizedQuery) {
    params.set("q", normalizedQuery);
  }

  const queryString = params.toString();
  return queryString ? `/products?${queryString}` : "/products";
}

export function filterAndSortProductEntries(
  entries: ProductCatalogEntry[],
  {
    focus,
    query,
    sort
  }: {
    focus: ProductFocus;
    query: string;
    sort: ProductSort;
  }
) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleEntries = entries.filter(({ product }) => {
    const matchesFocus =
      focus === "all" || getProductFocus(product) === focus;
    const matchesQuery =
      !normalizedQuery ||
      getProductSearchText(product).includes(normalizedQuery);

    return matchesFocus && matchesQuery;
  });

  if (sort === "featured") {
    return visibleEntries;
  }

  return [...visibleEntries].sort((left, right) =>
    sort === "price-asc"
      ? left.product.price - right.product.price
      : right.product.price - left.product.price
  );
}

export function ProductCatalog({
  checkoutEnabled,
  customerEmail,
  entries,
  initialFocus,
  initialQuery,
  initialSort,
  purchaseStateAvailable
}: {
  checkoutEnabled: boolean;
  customerEmail: string | null;
  entries: ProductCatalogEntry[];
  initialFocus?: string;
  initialQuery?: string;
  initialSort?: string;
  purchaseStateAvailable: boolean;
}) {
  const [focus, setFocus] = useState<ProductFocus>(() =>
    normalizeFocus(initialFocus)
  );
  const [query, setQuery] = useState(initialQuery ?? "");
  const [sort, setSort] = useState<ProductSort>(() =>
    normalizeSort(initialSort)
  );

  useEffect(() => {
    function restoreFiltersFromHistory() {
      const params = new URLSearchParams(window.location.search);
      setFocus(normalizeFocus(params.get("focus") ?? undefined));
      setQuery(params.get("q") ?? "");
      setSort(normalizeSort(params.get("sort") ?? undefined));
    }

    window.addEventListener("popstate", restoreFiltersFromHistory);
    return () =>
      window.removeEventListener("popstate", restoreFiltersFromHistory);
  }, []);

  function updateFilterUrl(
    nextFilters: ProductFilterState,
    mode: "push" | "replace"
  ) {
    const href = getProductFilterHref(
      nextFilters,
      window.location.search
    );
    const currentHref = `${window.location.pathname}${window.location.search}`;

    if (href === currentHref) {
      return;
    }

    window.history[mode === "push" ? "pushState" : "replaceState"](
      null,
      "",
      href
    );
  }

  const visibleEntries = useMemo(
    () => filterAndSortProductEntries(entries, { focus, query, sort }),
    [entries, focus, query, sort]
  );
  const controlsActive =
    focus !== "all" || query.trim().length > 0 || sort !== "featured";

  function resetControls() {
    setFocus("all");
    setQuery("");
    setSort("featured");
    updateFilterUrl(
      { focus: "all", query: "", sort: "featured" },
      "push"
    );
  }

  return (
    <section aria-labelledby="shop-catalog-heading">
      <div className="overflow-hidden rounded-xl border border-dune bg-white p-5 shadow-[0_18px_50px_rgba(32,31,28,0.06)] sm:p-7">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-clay">
              Shop by need
            </p>
            <h2
              className="mt-3 font-display text-3xl font-bold leading-tight text-cocoa"
              id="shop-catalog-heading"
            >
              Find your one-time tool.
            </h2>
            <p className="mt-3 max-w-lg text-sm font-medium leading-6 text-cocoa/70">
              Search what you want to work through, or browse by how you plan
              to use the tool.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_13rem]">
            <label className="grid gap-2 text-sm font-bold text-cocoa">
              Search the shop
              <input
                className="min-h-12 w-full rounded-md border border-dune bg-shell px-4 font-medium text-cocoa outline-none placeholder:text-cocoa/45 focus:border-clay focus:ring-2 focus:ring-clay/20"
                onChange={(event) => {
                  const nextQuery = event.target.value;
                  setQuery(nextQuery);
                  updateFilterUrl(
                    { focus, query: nextQuery, sort },
                    "replace"
                  );
                }}
                placeholder="Try “family” or “cash flow”"
                type="search"
                value={query}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-cocoa">
              Sort
              <select
                className="min-h-12 w-full rounded-md border border-dune bg-shell px-4 font-medium text-cocoa outline-none focus:border-clay focus:ring-2 focus:ring-clay/20"
                onChange={(event) => {
                  const nextSort = event.target.value as ProductSort;
                  setSort(nextSort);
                  updateFilterUrl(
                    { focus, query, sort: nextSort },
                    "push"
                  );
                }}
                value={sort}
              >
                {sortOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-6 border-t border-dune pt-5">
          <p className="text-sm font-bold text-cocoa">Browse by use</p>
          <div
            aria-label="Filter products by use"
            className="mt-3 flex flex-wrap gap-2"
            role="group"
          >
            {focusOptions.map((option) => (
              <button
                aria-pressed={focus === option.id}
                className={`min-h-11 rounded-full border px-4 text-sm font-bold transition-colors ${
                  focus === option.id
                    ? "border-cocoa bg-cocoa text-white"
                    : "border-dune bg-shell text-cocoa/75 hover:border-clay hover:text-clay"
                }`}
                key={option.id}
                onClick={() => {
                  setFocus(option.id);
                  updateFilterUrl(
                    { focus: option.id, query, sort },
                    "push"
                  );
                }}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="my-5 flex min-h-11 flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-sm font-bold text-cocoa/70">
          {visibleEntries.length === 1
            ? "1 tool matches"
            : `${visibleEntries.length} tools match`}
          {controlsActive ? " your choices" : " the shop"}
        </p>
        {controlsActive ? (
          <button
            className="inline-flex min-h-11 items-center text-sm font-bold text-clay underline decoration-clay/35 underline-offset-4 hover:decoration-clay"
            onClick={resetControls}
            type="button"
          >
            Clear search and filters
          </button>
        ) : null}
      </div>

      {visibleEntries.length > 0 ? (
        <ul
          aria-label="One-time digital tools"
          className="grid list-none gap-6 p-0 lg:grid-cols-2"
        >
          {visibleEntries.map(
            ({ accessPaused, alreadyPurchased, product }) => (
              <li key={product.id}>
                <article className="flex h-full flex-col overflow-hidden rounded-xl border border-dune bg-shell">
                  <ProductArtwork product={product} />
                  <div className="flex flex-1 flex-col p-6 sm:p-8">
                    <p className="text-base font-medium leading-7 text-cocoa/75">
                      {product.summary}
                    </p>
                    <div className="mt-6 border-t border-dune pt-6">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-cocoa/70">
                        What it helps you do
                      </p>
                      <ul className="mt-4 space-y-3 text-sm font-medium leading-6 text-cocoa/78">
                        {product.bullets.map((bullet) => (
                          <li className="flex gap-3" key={bullet}>
                            <span
                              aria-hidden="true"
                              className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-clay"
                            />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-dune pt-5 text-xs font-bold uppercase tracking-[0.12em] text-cocoa/58">
                      <span>Digital download</span>
                      <span>Keep in your account</span>
                      <span>No subscription</span>
                    </div>
                    <div className="mt-auto pt-7">
                      <Link
                        className="mb-3 inline-flex min-h-11 items-center text-sm font-bold text-clay underline decoration-clay/35 underline-offset-4 hover:decoration-clay"
                        href={`/products/${product.slug}` as Route}
                      >
                        View tool details
                        <span aria-hidden="true" className="ml-2">
                          →
                        </span>
                      </Link>
                      <ProductCheckoutButton
                        accessPaused={accessPaused}
                        alreadyPurchased={alreadyPurchased}
                        checkoutEnabled={checkoutEnabled}
                        customerEmail={customerEmail}
                        productSlug={product.slug}
                        purchaseStateAvailable={purchaseStateAvailable}
                      />
                      <PurchaseDisclosure variant="product" />
                    </div>
                  </div>
                </article>
              </li>
            )
          )}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed border-dune bg-shell px-6 py-12 text-center">
          <h3 className="font-display text-3xl font-bold text-cocoa">
            No tools match those choices.
          </h3>
          <p className="mx-auto mt-3 max-w-lg text-cocoa/70">
            Try a broader search, or show every one-time tool in the shop.
          </p>
          <button
            className="mt-6 min-h-11 rounded-md bg-cocoa px-5 text-sm font-bold text-white transition-colors hover:bg-charcoal"
            onClick={resetControls}
            type="button"
          >
            Show all tools
          </button>
        </div>
      )}
    </section>
  );
}
