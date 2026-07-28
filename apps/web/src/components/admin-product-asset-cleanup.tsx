"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type {
  ProductAssetCleanupJob,
  ProductAssetCleanupSnapshot
} from "@soji/types";

const reasonLabels: Record<ProductAssetCleanupJob["reason"], string> = {
  abandoned_upload: "Abandoned upload",
  deleted_asset: "Deleted product file",
  replaced_asset: "Replaced product file"
};

const cleanupLeaseMs = 120_000;

export const PRODUCT_ASSET_CLEANUP_MESSAGE_ID =
  "product-asset-cleanup-action-message";

export function getProductAssetCleanupResultMessage({
  attempted,
  cleaned,
  failed,
  failedReason
}: {
  attempted: number;
  cleaned: number;
  failed: number;
  failedReason?: unknown;
}) {
  if (failedReason !== undefined) {
    return "Private file cleanup could not finish. Review the cleanup history, then retry due items.";
  }

  return attempted === 0
    ? "No cleanup jobs are due."
    : `Cleaned ${cleaned} file(s); ${failed} attempt(s) still need attention.`;
}

function focusCleanupMessage() {
  window.requestAnimationFrame(() => {
    document.getElementById(PRODUCT_ASSET_CLEANUP_MESSAGE_ID)?.focus();
  });
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function fileName(storagePath: string) {
  return storagePath.split("/").at(-1) ?? storagePath;
}

export function AdminProductAssetCleanup({
  canInspect,
  snapshot
}: {
  canInspect: boolean;
  snapshot: ProductAssetCleanupSnapshot;
}) {
  const [items, setItems] = useState(snapshot.items);
  const [message, setMessage] = useState<string | null>(snapshot.error ?? null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPending, startTransition] = useTransition();
  const dueCount = useMemo(
    () =>
      items.filter((item) => {
        if (item.status === "processing") {
          return Boolean(
            item.claimedAt &&
              new Date(item.claimedAt).getTime() + cleanupLeaseMs <= currentTime
          );
        }
        return new Date(item.notBefore).getTime() <= currentTime;
      }).length,
    [currentTime, items]
  );

  useEffect(() => {
    setCurrentTime(Date.now());
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [items]);

  function retryCleanup() {
    if (!canInspect) {
      setMessage("Admin role required to reconcile private file cleanup.");
      return;
    }

    startTransition(async () => {
      try {
        setMessage(null);
        const response = await fetch("/api/admin/product-assets/cleanup", {
          body: JSON.stringify({ limit: 20 }),
          headers: { "Content-Type": "application/json" },
          method: "POST"
        });
        const result = (await response.json().catch(() => null)) as
          | {
              attempted?: number;
              cleaned?: number;
              failed?: number;
              items?: ProductAssetCleanupJob[];
              ok?: boolean;
              reason?: unknown;
            }
          | null;

        if (!response.ok || !result?.ok || !result.items) {
          throw new Error(
            typeof result?.reason === "string"
              ? result.reason
              : "Private file cleanup failed."
          );
        }

        setItems(result.items);
        setMessage(
          getProductAssetCleanupResultMessage({
            attempted: result.attempted ?? 0,
            cleaned: result.cleaned ?? 0,
            failed: result.failed ?? 0
          })
        );
        focusCleanupMessage();
      } catch {
        setMessage(
          getProductAssetCleanupResultMessage({
            attempted: 0,
            cleaned: 0,
            failed: 0,
            failedReason: true
          })
        );
        focusCleanupMessage();
      }
    });
  }

  return (
    <div className="rounded-lg border border-dune bg-shell p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-2xl text-cocoa">Private File Cleanup</h3>
          <p className="mt-2 text-sm text-cocoa/70">
            {items.length} unresolved storage task{items.length === 1 ? "" : "s"}.
          </p>
        </div>
        <button
          type="button"
          onClick={retryCleanup}
          disabled={isPending || !canInspect || dueCount === 0}
          className="rounded-md border border-cocoa px-4 py-2 text-sm font-semibold text-cocoa disabled:opacity-50"
        >
          {isPending ? "Cleaning..." : `Retry due (${dueCount})`}
        </button>
      </div>

      {!canInspect ? (
        <p className="mt-5 border-l-4 border-dune bg-white px-4 py-3 text-sm text-cocoa/70">
          Admin role required to inspect cleanup history.
        </p>
      ) : items.length === 0 ? (
        <p className="mt-5 border-l-4 border-success bg-success-muted px-4 py-3 text-sm text-cocoa">
          No private files are awaiting cleanup.
        </p>
      ) : (
        <div className="mt-5 divide-y divide-dune border-y border-dune">
          {items.map((item) => (
            <div key={item.id} className="grid gap-2 bg-white px-4 py-4 md:grid-cols-[1fr_auto]">
              <div className="min-w-0">
                <p className="truncate font-semibold text-cocoa" title={item.storagePath}>
                  {fileName(item.storagePath)}
                </p>
                <p className="mt-1 text-sm text-cocoa/65">
                  {reasonLabels[item.reason]} · {item.attemptCount} attempt
                  {item.attemptCount === 1 ? "" : "s"}
                </p>
              </div>
              <div className="text-sm text-cocoa/65 md:text-right">
                <p>
                  {item.status === "failed"
                    ? "Retry required"
                    : item.status === "processing"
                      ? "Processing"
                      : "Pending"}
                </p>
                <p className="mt-1">Due {formatDate(item.notBefore)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {message ? (
        <p
          aria-live="polite"
          className="mt-4 text-sm text-cocoa/75"
          id={PRODUCT_ASSET_CLEANUP_MESSAGE_ID}
          role="status"
          tabIndex={-1}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
