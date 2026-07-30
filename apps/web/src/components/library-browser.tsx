"use client";

import type { ContentType } from "@soji/types";
import { useEffect, useMemo, useState } from "react";
import {
  ContentCard,
  type ContentCardItem
} from "@/components/content-card";
import type { ContentAccessMode } from "@/lib/content-access";
import { formatContentType } from "@/lib/content-presentation";

const focusOptions = [
  { id: "all", label: "All guides" },
  { id: "start", label: "Start here" },
  { id: "spending", label: "Spending & cash flow" },
  { id: "career", label: "Career & earning" },
  { id: "family", label: "Family & legacy" }
] as const;

type FocusId = (typeof focusOptions)[number]["id"];
type LibraryFormat = "all" | ContentType;

interface LibraryFilterState {
  focus: FocusId;
  format: LibraryFormat;
  query: string;
}

export interface LibraryBrowserEntry {
  accessMode: ContentAccessMode;
  item: ContentCardItem;
}

function normalizeFocus(value: string | undefined): FocusId {
  return focusOptions.some((option) => option.id === value)
    ? (value as FocusId)
    : "all";
}

function normalizeFormat(
  value: string | undefined,
  formats: readonly ContentType[]
): LibraryFormat {
  return formats.includes(value as ContentType)
    ? (value as ContentType)
    : "all";
}

export function getLibraryFilterHref({
  focus,
  format,
  query
}: LibraryFilterState) {
  const params = new URLSearchParams();
  const normalizedQuery = query.trim();

  if (focus !== "all") {
    params.set("focus", focus);
  }
  if (format !== "all") {
    params.set("format", format);
  }
  if (normalizedQuery) {
    params.set("q", normalizedQuery);
  }

  const queryString = params.toString();
  return queryString ? `/library?${queryString}` : "/library";
}

function searchableText(item: ContentCardItem) {
  return [
    item.title,
    item.summary,
    formatContentType(item.type),
    ...item.tags
  ]
    .join(" ")
    .toLocaleLowerCase();
}

function matchesFocus(item: ContentCardItem, focus: FocusId) {
  if (focus === "all") {
    return true;
  }

  const source = searchableText(item);
  const keywords: Record<Exclude<FocusId, "all">, string[]> = {
    career: ["career", "earning", "income", "negotiation", "salary"],
    family: ["family", "generation", "kids", "legacy", "partner"],
    spending: [
      "budget",
      "cash flow",
      "net worth",
      "spending",
      "tracking",
      "wealth"
    ],
    start: ["30-day reset", "audit", "decision-making", "starting point"]
  };

  return keywords[focus].some((keyword) => source.includes(keyword));
}

export function LibraryBrowser({
  entries,
  initialFocus,
  initialFormat,
  initialQuery,
  isAuthenticated
}: {
  entries: LibraryBrowserEntry[];
  initialFocus?: string;
  initialFormat?: string;
  initialQuery?: string;
  isAuthenticated: boolean;
}) {
  const formats = useMemo(
    () =>
      [...new Set(entries.map(({ item }) => item.type))].sort((left, right) =>
        formatContentType(left).localeCompare(formatContentType(right))
      ),
    [entries]
  );
  const [focus, setFocus] = useState<FocusId>(() =>
    normalizeFocus(initialFocus)
  );
  const [format, setFormat] = useState<LibraryFormat>(() =>
    normalizeFormat(initialFormat, formats)
  );
  const [query, setQuery] = useState(initialQuery ?? "");

  useEffect(() => {
    function restoreFiltersFromHistory() {
      const params = new URLSearchParams(window.location.search);
      setFocus(normalizeFocus(params.get("focus") ?? undefined));
      setFormat(
        normalizeFormat(params.get("format") ?? undefined, formats)
      );
      setQuery(params.get("q") ?? "");
    }

    window.addEventListener("popstate", restoreFiltersFromHistory);
    return () =>
      window.removeEventListener("popstate", restoreFiltersFromHistory);
  }, [formats]);

  function updateFilterUrl(
    nextFilters: LibraryFilterState,
    mode: "push" | "replace"
  ) {
    const href = getLibraryFilterHref(nextFilters);
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
  const visibleEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return entries.filter(({ item }) => {
      return (
        matchesFocus(item, focus) &&
        (format === "all" || item.type === format) &&
        (!normalizedQuery || searchableText(item).includes(normalizedQuery))
      );
    });
  }, [entries, focus, format, query]);
  const filtersActive = focus !== "all" || format !== "all" || query.trim();

  function clearFilters() {
    setFocus("all");
    setFormat("all");
    setQuery("");
    updateFilterUrl({ focus: "all", format: "all", query: "" }, "push");
  }

  return (
    <div>
      <section
        aria-labelledby="library-discovery-heading"
        className="mb-8 overflow-hidden rounded-xl border border-dune bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,239,232,0.82))] p-5 shadow-[0_18px_50px_rgba(32,31,28,0.06)] sm:p-7"
      >
        <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-clay">
              Find your path
            </p>
            <h2
              id="library-discovery-heading"
              className="mt-3 font-display text-3xl font-bold leading-tight text-cocoa"
            >
              What would feel useful right now?
            </h2>
            <p className="mt-3 max-w-lg text-sm font-medium leading-6 text-cocoa/70">
              Choose a focus, then narrow the library by format or a word you
              have in mind.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_13rem]">
            <label className="grid gap-2 text-sm font-bold text-cocoa">
              Search the library
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  const nextQuery = event.target.value;
                  setQuery(nextQuery);
                  updateFilterUrl(
                    { focus, format, query: nextQuery },
                    "replace"
                  );
                }}
                placeholder="Try “family” or “cash flow”"
                className="min-h-12 w-full rounded-md border border-dune bg-white px-4 font-medium text-cocoa outline-none placeholder:text-cocoa/45 focus:border-clay focus:ring-2 focus:ring-clay/20"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-cocoa">
              Format
              <select
                value={format}
                onChange={(event) => {
                  const nextFormat = event.target.value as LibraryFormat;
                  setFormat(nextFormat);
                  updateFilterUrl(
                    { focus, format: nextFormat, query },
                    "push"
                  );
                }}
                className="min-h-12 w-full rounded-md border border-dune bg-white px-4 font-medium text-cocoa outline-none focus:border-clay focus:ring-2 focus:ring-clay/20"
              >
                <option value="all">All formats</option>
                {formats.map((contentType) => (
                  <option key={contentType} value={contentType}>
                    {formatContentType(contentType)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-6 border-t border-dune/80 pt-5">
          <p className="text-sm font-bold text-cocoa">Explore by focus</p>
          <div
            className="mt-3 flex flex-wrap gap-2"
            role="group"
            aria-label="Filter guides by focus"
          >
            {focusOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={focus === option.id}
                onClick={() => {
                  setFocus(option.id);
                  updateFilterUrl(
                    { focus: option.id, format, query },
                    "push"
                  );
                }}
                className={`min-h-11 rounded-full border px-4 text-sm font-bold transition-colors ${
                  focus === option.id
                    ? "border-cocoa bg-cocoa text-white"
                    : "border-dune bg-white text-cocoa/75 hover:border-clay hover:text-clay"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="mb-5 flex min-h-11 flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-sm font-bold text-cocoa/70">
          {visibleEntries.length === 1
            ? "1 guide"
            : `${visibleEntries.length} guides`}
          {filtersActive ? " match your filters" : " in the library"}
        </p>
        {filtersActive ? (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex min-h-11 items-center text-sm font-bold text-clay underline decoration-clay/35 underline-offset-4 hover:decoration-clay"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {visibleEntries.length > 0 ? (
        <ul
          className="grid list-none gap-6 p-0 md:grid-cols-2 xl:grid-cols-3"
          aria-label="Published guides"
        >
          {visibleEntries.map(({ accessMode, item }) => {
            const featured = item.slug === "wealth-without-drift";

            return (
              <li
                key={item.id}
                className={featured ? "lg:col-span-2" : undefined}
              >
                <ContentCard
                  item={item}
                  featured={featured}
                  isAuthenticated={isAuthenticated}
                  accessMode={accessMode}
                />
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed border-dune bg-shell px-6 py-12 text-center">
          <h3 className="font-display text-3xl font-bold text-cocoa">
            No guides match those filters.
          </h3>
          <p className="mx-auto mt-3 max-w-lg text-cocoa/70">
            Try a broader focus or clear the filters to see the complete
            library.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-6 min-h-11 rounded-md bg-cocoa px-5 text-sm font-bold text-white transition-colors hover:bg-charcoal"
          >
            Show all guides
          </button>
        </div>
      )}
    </div>
  );
}
