"use client";

import type { ContentType } from "@soji/types";
import { useEffect, useMemo, useState } from "react";
import {
  ContentCard,
  type ContentCardItem
} from "@/components/content-card";
import type { ContentAccessMode } from "@/lib/content-access";
import { formatContentType } from "@/lib/content-presentation";
import {
  getBrowserSavedGuidesStorage,
  readSavedGuideSlugs,
  SAVED_GUIDES_EVENT,
  SAVED_GUIDES_STORAGE_KEY
} from "@/lib/saved-guides";

const focusOptions = [
  { id: "all", label: "全部指南" },
  { id: "start", label: "从这里开始" },
  { id: "spending", label: "支出与现金流" },
  { id: "career", label: "职业与收入" },
  { id: "family", label: "家庭与传承" },
  { id: "saved", label: "我的收藏" }
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

function matchesFocus(
  item: ContentCardItem,
  focus: FocusId,
  savedSlugs: ReadonlySet<string>
) {
  if (focus === "all") {
    return true;
  }
  if (focus === "saved") {
    return savedSlugs.has(item.slug);
  }

  const source = searchableText(item);
  const keywords: Record<Exclude<FocusId, "all" | "saved">, string[]> = {
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
  const [savedSlugs, setSavedSlugs] = useState<string[] | null>(null);

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

  useEffect(() => {
    function refreshSavedGuides() {
      setSavedSlugs(readSavedGuideSlugs(getBrowserSavedGuidesStorage()));
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === SAVED_GUIDES_STORAGE_KEY) {
        refreshSavedGuides();
      }
    }

    refreshSavedGuides();
    window.addEventListener(SAVED_GUIDES_EVENT, refreshSavedGuides);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(SAVED_GUIDES_EVENT, refreshSavedGuides);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

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
    const savedSlugSet = new Set(savedSlugs ?? []);

    return entries.filter(({ item }) => {
      return (
        matchesFocus(item, focus, savedSlugSet) &&
        (format === "all" || item.type === format) &&
        (!normalizedQuery || searchableText(item).includes(normalizedQuery))
      );
    });
  }, [entries, focus, format, query, savedSlugs]);
  const filtersActive = focus !== "all" || format !== "all" || query.trim();
  const loadingSavedGuides = focus === "saved" && savedSlugs === null;

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
              找到适合你的方向
            </p>
            <h2
              id="library-discovery-heading"
              className="mt-3 font-display text-3xl font-bold leading-tight text-cocoa"
            >
              你现在最想解决什么问题？
            </h2>
            <p className="mt-3 max-w-lg text-sm font-medium leading-6 text-cocoa/70">
              先选择关注方向，再按内容形式或关键词筛选。收藏的指南会保存在当前设备上。
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_13rem]">
            <label className="grid gap-2 text-sm font-bold text-cocoa">
              搜索内容库
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
                placeholder="试试“家庭”或“现金流”"
                className="min-h-12 w-full rounded-md border border-dune bg-white px-4 font-medium text-cocoa outline-none placeholder:text-cocoa/45 focus:border-clay focus:ring-2 focus:ring-clay/20"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-cocoa">
              内容形式
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
                <option value="all">全部形式</option>
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
          <p className="text-sm font-bold text-cocoa">按主题浏览</p>
          <div
            className="mt-3 flex flex-wrap gap-2"
            role="group"
            aria-label="按主题筛选指南"
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
          {loadingSavedGuides
            ? "正在加载收藏…"
            : `${visibleEntries.length} 篇指南${
                filtersActive ? "符合当前筛选条件" : "可供阅读"
              }`}
        </p>
        {filtersActive ? (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex min-h-11 items-center text-sm font-bold text-clay underline decoration-clay/35 underline-offset-4 hover:decoration-clay"
          >
            清除筛选
          </button>
        ) : null}
      </div>

      {loadingSavedGuides ? (
        <div
          aria-live="polite"
          className="rounded-xl border border-dune bg-shell px-6 py-12 text-center"
        >
          <p className="font-display text-2xl font-bold text-cocoa">
            正在加载收藏…
          </p>
        </div>
      ) : visibleEntries.length > 0 ? (
        <ul
          className="grid list-none gap-6 p-0 md:grid-cols-2 xl:grid-cols-3"
          aria-label="已发布指南"
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
            {focus === "saved"
              ? "还没有收藏指南"
              : "没有符合筛选条件的指南"}
          </h3>
          <p className="mx-auto mt-3 max-w-lg text-cocoa/70">
            {focus === "saved"
              ? "在任意指南卡片或文章中点击收藏，即可把阅读清单保存在当前设备上。"
              : "可以扩大主题范围，或清除筛选条件查看完整内容库。"}
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-6 min-h-11 rounded-md bg-cocoa px-5 text-sm font-bold text-white transition-colors hover:bg-charcoal"
          >
            查看全部指南
          </button>
        </div>
      )}
    </div>
  );
}
