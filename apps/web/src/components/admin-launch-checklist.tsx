"use client";

import { useState } from "react";
import type {
  LaunchChecklistItem,
  LaunchChecklistStatus
} from "@/lib/admin-launch-checklist";

const statusLabels: Record<LaunchChecklistStatus, string> = {
  invalid: "Invalid",
  manual: "Confirm",
  missing: "Missing",
  needs_owner_input: "Needs owner input",
  ready: "Ready"
};

function statusClassName(status: LaunchChecklistStatus) {
  if (status === "ready") {
    return "bg-success-muted text-success";
  }

  if (status === "missing" || status === "invalid") {
    return "bg-accent-muted text-clay";
  }

  return "bg-sand text-cocoa/65";
}

export type LaunchChecklistFilter =
  | "all"
  | "confirm"
  | "needs-work"
  | "open"
  | "ready";

export function filterLaunchChecklistItems(
  items: LaunchChecklistItem[],
  filter: LaunchChecklistFilter
) {
  if (filter === "all") {
    return items;
  }

  if (filter === "ready") {
    return items.filter((item) => item.status === "ready");
  }

  if (filter === "needs-work") {
    return items.filter(
      (item) => item.status === "missing" || item.status === "invalid"
    );
  }

  if (filter === "confirm") {
    return items.filter(
      (item) =>
        item.status === "manual" || item.status === "needs_owner_input"
    );
  }

  return items.filter((item) => item.status !== "ready");
}

export function AdminLaunchChecklist({
  items
}: {
  items: LaunchChecklistItem[];
}) {
  const [filter, setFilter] = useState<LaunchChecklistFilter>("open");
  const readyCount = items.filter((item) => item.status === "ready").length;
  const missingCount = items.filter(
    (item) => item.status === "missing" || item.status === "invalid"
  ).length;
  const manualCount = items.filter(
    (item) =>
      item.status === "manual" || item.status === "needs_owner_input"
  ).length;
  const openCount = items.length - readyCount;
  const visibleItems = filterLaunchChecklistItems(items, filter);
  const filterOptions: ReadonlyArray<{
    count: number;
    id: LaunchChecklistFilter;
    label: string;
  }> = [
    { count: openCount, id: "open", label: "Open" },
    { count: missingCount, id: "needs-work", label: "Needs work" },
    { count: manualCount, id: "confirm", label: "Confirm" },
    { count: readyCount, id: "ready", label: "Ready" },
    { count: items.length, id: "all", label: "All" }
  ];

  return (
    <section
      aria-labelledby="launch-checklist-heading"
      className="border-y border-dune py-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-clay">
            Release readiness
          </p>
          <h2
            className="mt-3 font-display text-3xl font-semibold text-cocoa"
            id="launch-checklist-heading"
          >
            Launch Checklist
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-cocoa/70">
            Environment and operations items to confirm before taking real payments.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold" aria-label="Launch status summary">
          <span className="rounded-md bg-success-muted px-2.5 py-1 text-success">
            {readyCount} ready
          </span>
          <span className="rounded-md bg-accent-muted px-2.5 py-1 text-clay">
            {missingCount} missing
          </span>
          <span className="rounded-md bg-sand px-2.5 py-1 text-cocoa/65">
            {manualCount} confirm
          </span>
        </div>
      </div>

      {missingCount > 0 ? (
        <div className="mt-5 border-l-4 border-clay bg-accent-muted px-4 py-3 text-sm text-cocoa">
          {missingCount} required configuration item{missingCount === 1 ? "" : "s"} still missing.
        </div>
      ) : null}

      <div
        aria-label="Filter launch checklist"
        className="mt-6 flex flex-wrap gap-2"
        role="group"
      >
        {filterOptions.map((option) => (
          <button
            aria-pressed={filter === option.id}
            className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-bold transition-colors ${
              filter === option.id
                ? "border-cocoa bg-cocoa text-white"
                : "border-dune bg-shell text-cocoa/72 hover:border-clay hover:text-clay"
            }`}
            key={option.id}
            onClick={() => setFilter(option.id)}
            type="button"
          >
            {option.label}
            <span
              aria-hidden="true"
              className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                filter === option.id ? "bg-white/15" : "bg-sand"
              }`}
            >
              {option.count}
            </span>
          </button>
        ))}
      </div>

      <p aria-live="polite" className="mt-5 text-sm font-bold text-cocoa/62">
        Showing {visibleItems.length} of {items.length} checklist items
      </p>

      {visibleItems.length > 0 ? (
        <ul className="mt-3 grid gap-3 lg:grid-cols-2">
          {visibleItems.map((item) => (
            <li
              className="rounded-md border border-dune bg-white px-4 py-3.5"
              key={item.label}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-cocoa">{item.label}</p>
                  <p className="mt-1 text-sm text-cocoa/65">{item.detail}</p>
                </div>
                <span
                  className={`rounded-md px-3 py-1 text-xs font-semibold ${statusClassName(item.status)}`}
                >
                  {statusLabels[item.status]}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-3 rounded-lg border border-dashed border-dune bg-shell px-5 py-8 text-center">
          <p className="font-display text-2xl font-semibold text-cocoa">
            No checklist items match this view.
          </p>
          <button
            className="mt-4 min-h-11 text-sm font-bold text-clay underline decoration-clay/35 underline-offset-4 hover:decoration-clay"
            onClick={() => setFilter("all")}
            type="button"
          >
            Show the complete checklist
          </button>
        </div>
      )}
    </section>
  );
}
