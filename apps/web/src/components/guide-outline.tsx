"use client";

import { useEffect, useMemo, useState } from "react";
import type { MarkdownOutlineItem } from "@/lib/markdown-outline";

const ACTIVE_SECTION_LINE_PX = 144;

export interface GuideSectionMeasurement {
  id: string;
  top: number;
}

export function getActiveGuideSectionId(
  measurements: readonly GuideSectionMeasurement[],
  activationLine: number
) {
  if (!Number.isFinite(activationLine)) {
    return null;
  }

  let activeId: string | null = null;
  for (const measurement of measurements) {
    if (!measurement.id || !Number.isFinite(measurement.top)) {
      continue;
    }
    if (measurement.top > activationLine) {
      break;
    }
    activeId = measurement.id;
  }

  return activeId;
}

function OutlineLinks({
  activeId,
  onSelect,
  outline
}: {
  activeId: string | null;
  onSelect: (id: string) => void;
  outline: MarkdownOutlineItem[];
}) {
  return (
    <ol className="mt-3 space-y-1">
      {outline.map((heading, index) => {
        const current = heading.id === activeId;

        return (
          <li
            className={heading.level >= 3 ? "pl-4" : undefined}
            key={`${heading.line}-${heading.id}`}
          >
            <a
              aria-current={current ? "location" : undefined}
              className={`group grid min-h-11 grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-2 rounded-md border-l-2 px-2 py-2 text-sm font-semibold leading-5 transition-colors ${
                current
                  ? "border-clay bg-shell text-cocoa"
                  : "border-transparent text-cocoa/72 hover:bg-shell hover:text-cocoa"
              }`}
              href={`#${heading.id}`}
              onClick={() => onSelect(heading.id)}
            >
              <span
                aria-hidden="true"
                className={`text-xs font-bold tabular-nums ${
                  current
                    ? "text-clay"
                    : "text-clay/65 group-hover:text-clay"
                }`}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{heading.label}</span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}

export function GuideOutline({
  className = "",
  contentTargetId,
  headingId,
  outline,
  variant
}: {
  className?: string;
  contentTargetId: string;
  headingId: string;
  outline: MarkdownOutlineItem[];
  variant: "desktop" | "mobile";
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeLabel = useMemo(
    () => outline.find((heading) => heading.id === activeId)?.label ?? null,
    [activeId, outline]
  );

  useEffect(() => {
    const headings = outline
      .map((heading) => document.getElementById(heading.id))
      .filter((heading): heading is HTMLElement => heading !== null);
    if (headings.length === 0) {
      return;
    }

    let animationFrame = 0;
    function measure() {
      const nextId = getActiveGuideSectionId(
        headings.map((heading) => ({
          id: heading.id,
          top: heading.getBoundingClientRect().top
        })),
        ACTIVE_SECTION_LINE_PX
      );
      setActiveId((current) => (current === nextId ? current : nextId));
    }

    function scheduleMeasurement() {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(measure);
    }

    const contentTarget = document.getElementById(contentTargetId);
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(scheduleMeasurement);
    if (contentTarget) {
      resizeObserver?.observe(contentTarget);
    }

    measure();
    window.addEventListener("hashchange", scheduleMeasurement);
    window.addEventListener("resize", scheduleMeasurement);
    window.addEventListener("scroll", scheduleMeasurement, { passive: true });
    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      window.removeEventListener("hashchange", scheduleMeasurement);
      window.removeEventListener("resize", scheduleMeasurement);
      window.removeEventListener("scroll", scheduleMeasurement);
    };
  }, [contentTargetId, outline]);

  const links = (
    <OutlineLinks
      activeId={activeId}
      onSelect={setActiveId}
      outline={outline}
    />
  );

  if (variant === "mobile") {
    return (
      <nav aria-labelledby={headingId} className={className}>
        <details className="group">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 rounded-md px-1 text-cocoa [&::-webkit-details-marker]:hidden">
            <span
              className="text-xs font-bold uppercase tracking-[0.12em]"
              id={headingId}
            >
              In this guide
            </span>
            <span className="flex min-w-0 items-center gap-2 text-right text-xs font-semibold text-cocoa/62">
              <span className="truncate">
                {activeLabel ?? `${outline.length} sections`}
              </span>
              <svg
                aria-hidden="true"
                className="h-4 w-4 flex-none transition-transform group-open:rotate-180"
                fill="none"
                viewBox="0 0 20 20"
              >
                <path
                  d="m5 7.5 5 5 5-5"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.75"
                />
              </svg>
            </span>
          </summary>
          {links}
        </details>
      </nav>
    );
  }

  return (
    <nav aria-labelledby={headingId} className={className}>
      <h3
        className="text-xs font-bold uppercase tracking-[0.12em] text-cocoa/62"
        id={headingId}
      >
        In this guide
      </h3>
      {links}
    </nav>
  );
}
