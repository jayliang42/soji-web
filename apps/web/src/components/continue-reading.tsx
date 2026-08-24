"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useState } from "react";
import {
  getContinueReadingMatch,
  type ContinueReadingGuide,
  type ContinueReadingMatch
} from "@/lib/continue-reading";
import { formatContentType } from "@/lib/content-presentation";
import {
  getBrowserReadingProgressStorage,
  readReadingProgress,
  READING_PROGRESS_STORAGE_KEY
} from "@/lib/reading-progress";

export function ContinueReading({
  guides
}: {
  guides: ContinueReadingGuide[];
}) {
  const [match, setMatch] = useState<ContinueReadingMatch | null>(null);

  useEffect(() => {
    function restoreProgress() {
      setMatch(
        getContinueReadingMatch(
          readReadingProgress(getBrowserReadingProgressStorage()),
          guides
        )
      );
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === READING_PROGRESS_STORAGE_KEY) {
        restoreProgress();
      }
    }

    restoreProgress();
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [guides]);

  if (!match) {
    return null;
  }

  const { guide, progress } = match;
  const resumeHref =
    `/library/${encodeURIComponent(guide.slug)}?resume=1` as Route;

  return (
    <section
      aria-labelledby="continue-reading-heading"
      className="border-y border-dune bg-white"
      data-testid="home-continue-reading"
    >
      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 md:grid-cols-[minmax(0,1fr)_minmax(18rem,0.55fr)] md:items-center md:gap-10 md:py-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-clay">
            继续阅读
          </p>
          <h2
            className="mt-3 max-w-3xl font-display text-3xl font-bold leading-tight text-cocoa md:text-4xl"
            id="continue-reading-heading"
          >
            {guide.title}
          </h2>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-cocoa/70">
            {guide.summary}
          </p>
        </div>

        <div className="rounded-xl border border-dune bg-cream p-5 shadow-[0_14px_36px_rgba(32,31,28,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
            <span className="text-cocoa">
              已完成 {progress.progress}%
            </span>
            <span className="text-cocoa/58">
              {formatContentType(guide.type)} · 当前设备
            </span>
          </div>
          <progress
            aria-label={`${guide.title} 的阅读进度`}
            className="reading-progress mt-3 block h-2 w-full overflow-hidden rounded-full"
            max={100}
            value={progress.progress}
          >
            {progress.progress}%
          </progress>
          <Link
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-cocoa px-5 text-sm font-bold text-white transition-colors hover:bg-charcoal"
            href={resumeHref}
          >
            继续阅读
          </Link>
        </div>
      </div>
    </section>
  );
}
