"use client";

import { useEffect, useRef, useState } from "react";
import type { BillingEventLog, BillingEventSnapshot } from "@soji/types";
import {
  getBillingRetryDescription,
  isBillingProcessingLeaseActive
} from "@/lib/billing-processing";
import { DataEmpty, DataUnavailable } from "@/components/data-state";

type ActionMessage = {
  body?: string;
  heading: string;
  tone: "error" | "status";
};

type ProcessingPresentation = {
  badge: string;
  canRetry: boolean;
  supportingCopy: string;
  toneClassName: string;
};

const MESSAGE_TARGET_ID = "billing-event-action-message";

type BillingRetryResponse = {
  event?: unknown;
  ok?: boolean;
  reason?: string;
};

type BillingRetryFetch = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Pick<Response, "json" | "ok">>;

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isBillingEventLog(
  value: unknown,
  expectedEventId: string
): value is BillingEventLog {
  if (!value || typeof value !== "object") {
    return false;
  }

  const event = value as Record<string, unknown>;
  return (
    event.id === expectedEventId &&
    Number.isInteger(event.attemptCount) &&
    typeof event.createdAt === "string" &&
    typeof event.eventType === "string" &&
    isNullableString(event.lastAttemptedAt) &&
    isNullableString(event.processedAt) &&
    isNullableString(event.processingError) &&
    isNullableString(event.processingStartedAt) &&
    event.provider === "stripe" &&
    typeof event.providerEventId === "string" &&
    (event.status === "received" ||
      event.status === "processing" ||
      event.status === "processed" ||
      event.status === "ignored" ||
      event.status === "failed")
  );
}

export function getBillingEventHeadingId(eventId: string) {
  return `billing-event-heading-${eventId}`;
}

export function getBillingRetryResultMessage(
  result:
    | "active"
    | "failed"
    | "ignored"
    | "processed"
    | "retryable"
    | "settled"
) {
  if (result === "processed") {
    return "Billing event processed successfully.";
  }
  if (result === "ignored") {
    return "Billing event stored; this event type has no GS学院 handler.";
  }
  if (result === "active") {
    return "This event is already being processed. Retry becomes available if its lease expires.";
  }
  if (result === "retryable") {
    return "This event is retryable again. Its latest processing state is shown.";
  }
  if (result === "settled") {
    return "This event has already settled. Its latest processing state is shown.";
  }
  return "This event could not be retried. Review its latest processing state, then try again or reconcile from Stripe.";
}

function getBillingRetryConflictResult(
  event: BillingEventLog | null,
  reason: string | undefined
) {
  if (event?.status === "processed" || event?.status === "ignored") {
    return "settled" as const;
  }
  if (
    event?.status === "processing" &&
    isBillingProcessingLeaseActive(
      event.status,
      event.processingStartedAt
    )
  ) {
    return "active" as const;
  }
  if (
    reason === "event_retryable_state_changed" &&
    (
      event?.status === "received" ||
      event?.status === "failed" ||
      event?.status === "processing"
    )
  ) {
    return "retryable" as const;
  }
  return reason === "event_processing_in_progress"
    ? ("active" as const)
    : ("failed" as const);
}

export function getBillingReconciliationValidationMessage(identifier: string) {
  return /^(?:sub|cus)_[A-Za-z0-9]+$/.test(identifier)
    ? null
    : "Enter a Stripe subscription ID (sub_…) or customer ID (cus_…).";
}

export function getBillingReconciliationResultMessage({
  staleSubscriptionsClosed,
  subscriptionsSynced
}: {
  staleSubscriptionsClosed: number;
  subscriptionsSynced: number;
}) {
  return `Reconciled ${subscriptionsSynced} subscription(s); closed ${staleSubscriptionsClosed} stale local record(s).`;
}

export async function executeBillingEventRetry({
  eventId,
  fetchImpl = fetch,
  onEvent,
  onFocus,
  onMessage,
  onPendingChange,
  pendingIds
}: {
  eventId: string;
  fetchImpl?: BillingRetryFetch;
  onEvent: (event: BillingEventLog) => void;
  onFocus: (targetId: string) => void;
  onMessage: (message: ActionMessage | null) => void;
  onPendingChange: (pendingIds: ReadonlySet<string>) => void;
  pendingIds: Set<string>;
}) {
  if (pendingIds.has(eventId)) {
    return false;
  }

  pendingIds.add(eventId);
  onPendingChange(new Set(pendingIds));
  onMessage(null);
  try {
    const response = await fetchImpl(
      `/api/admin/billing-events/${eventId}/retry`,
      { method: "POST" }
    );
    const result = (await response.json().catch(() => null)) as
      | BillingRetryResponse
      | null;
    const event = isBillingEventLog(result?.event, eventId)
      ? result.event
      : null;

    if (event) {
      onEvent(event);
    }

    const settled =
      event?.status === "processed" || event?.status === "ignored";
    if (!response.ok || !result?.ok || !settled || !event.processedAt) {
      const conflictResult = getBillingRetryConflictResult(
        event,
        result?.reason
      );
      onMessage(
        conflictResult === "failed"
          ? {
              heading: getBillingRetryResultMessage("failed"),
              tone: "error"
            }
          : {
              heading: getBillingRetryResultMessage(conflictResult),
              tone: "status"
            }
      );
      onFocus(MESSAGE_TARGET_ID);
      return true;
    }

    onMessage({
      heading: getBillingRetryResultMessage(
        event.status === "ignored" ? "ignored" : "processed"
      ),
      tone: "status"
    });
    onFocus(getBillingEventHeadingId(eventId));
    return true;
  } catch {
    onMessage({
      heading: getBillingRetryResultMessage("failed"),
      tone: "error"
    });
    onFocus(MESSAGE_TARGET_ID);
    return true;
  } finally {
    pendingIds.delete(eventId);
    onPendingChange(new Set(pendingIds));
  }
}

function focusTarget(targetId: string) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  window.requestAnimationFrame(() => {
    document.getElementById(targetId)?.focus();
  });
}

function getProcessingPresentation(
  event: BillingEventLog,
  now: number
): ProcessingPresentation {
  if (event.status === "processed") {
    return {
      badge: "Complete",
      canRetry: false,
      supportingCopy: "GS学院 processing completed.",
      toneClassName: "bg-success-muted text-success"
    };
  }

  if (event.status === "ignored") {
    return {
      badge: "No handler",
      canRetry: false,
      supportingCopy:
        "The signed event is retained, but this type does not change GS学院 state.",
      toneClassName: "bg-sand text-cocoa/70"
    };
  }

  if (event.status === "failed") {
    return {
      badge: "Failed",
      canRetry: true,
      supportingCopy:
        "GS学院 processing failed. The verified receipt remains stored.",
      toneClassName: "bg-accent-muted text-error"
    };
  }

  if (event.status === "processing") {
    const leaseActive = isBillingProcessingLeaseActive(
      event.status,
      event.processingStartedAt,
      now
    );
    return leaseActive
      ? {
          badge: "In progress",
          canRetry: false,
          supportingCopy: "Another worker is processing this event.",
          toneClassName: "bg-gold/20 text-cocoa"
        }
      : {
          badge: "Lease expired",
          canRetry: true,
          supportingCopy:
            "The processing lease expired before the event settled.",
          toneClassName: "bg-accent-muted text-clay"
        };
  }

  return {
    badge: "Awaiting",
    canRetry: true,
    supportingCopy: "No processing attempt has completed.",
    toneClassName: "bg-sand text-cocoa/70"
  };
}

function formatAdminDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZoneName: "short",
    year: "numeric"
  }).format(new Date(value));
}

function AdminTime({
  emptyLabel,
  value
}: {
  emptyLabel: string;
  value: string | null;
}) {
  if (!value || !Number.isFinite(Date.parse(value))) {
    return <span>{emptyLabel}</span>;
  }

  return <time dateTime={value}>{formatAdminDate(value)}</time>;
}

function getSafeProcessingError(event: BillingEventLog) {
  if (event.status !== "failed") {
    return null;
  }

  return event.processingError &&
    /^[a-z][a-z0-9_]{0,119}$/.test(event.processingError)
    ? event.processingError
    : "billing_event_processing_failed";
}

function getEventReferences(event: BillingEventLog) {
  const references: Array<{ label: string; value: string }> = [
    { label: "Event", value: event.providerEventId }
  ];
  if (event.objectId) {
    references.push({
      label: event.objectType
        ? event.objectType.replaceAll("_", " ")
        : "Object",
      value: event.objectId
    });
  }

  const relatedReferences = [
    ["Dispute", event.disputeId],
    ["Payment", event.paymentId],
    ["Subscription", event.subscriptionId],
    ["Customer", event.customerId]
  ] as const;
  for (const [label, value] of relatedReferences) {
    if (value && !references.some((reference) => reference.value === value)) {
      references.push({ label, value });
    }
  }

  return references;
}

function BillingEventRecord({
  event,
  now,
  onRetry,
  retrying
}: {
  event: BillingEventLog;
  now: number;
  onRetry: (eventId: string) => void;
  retrying: boolean;
}) {
  const processing = getProcessingPresentation(event, now);
  const safeProcessingError = getSafeProcessingError(event);
  const references = getEventReferences(event);

  return (
    <article className="py-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <h3
            id={getBillingEventHeadingId(event.id)}
            tabIndex={-1}
            className="font-semibold text-cocoa"
          >
            {event.eventType}
          </h3>
          <dl className="mt-2 flex min-w-0 flex-wrap gap-x-4 gap-y-2 text-sm text-cocoa/70">
            {references.map((reference) => (
              <div
                key={`${reference.label}-${reference.value}`}
                className="min-w-0"
              >
                <dt className="inline font-semibold">{reference.label}: </dt>
                <dd className="inline select-text font-mono [overflow-wrap:anywhere]">
                  {reference.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <span className="rounded bg-success-muted px-2 py-1 text-sm font-semibold text-success">
            Receipt · Received
          </span>
          <span
            className={`rounded px-2 py-1 text-sm font-semibold ${processing.toneClassName}`}
          >
            Processing · {processing.badge}
          </span>
        </div>
      </div>

      <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-sm font-semibold uppercase text-cocoa/55">
            Received
          </dt>
          <dd className="mt-2 font-semibold text-success">
            Received and stored
          </dd>
          <dd className="mt-1 text-cocoa/65">
            <AdminTime
              emptyLabel="Receipt time unavailable"
              value={event.createdAt}
            />
          </dd>
        </div>
        <div>
          <dt className="text-sm font-semibold uppercase text-cocoa/55">
            Processing
          </dt>
          <dd className="mt-2 font-semibold text-cocoa">
            {processing.supportingCopy}
          </dd>
          <dd className="mt-1 text-cocoa/65">
            <AdminTime emptyLabel="Not completed" value={event.processedAt} />
          </dd>
          {event.status === "processing" && event.processingStartedAt ? (
            <dd className="mt-1 text-cocoa/65">
              Lease started{" "}
              <AdminTime
                emptyLabel="Time unavailable"
                value={event.processingStartedAt}
              />
            </dd>
          ) : null}
        </div>
        <div>
          <dt className="text-sm font-semibold uppercase text-cocoa/55">
            Attempts
          </dt>
          <dd className="mt-2 font-semibold text-cocoa">
            {event.attemptCount}
          </dd>
          <dd className="mt-1 text-cocoa/65">
            {event.lastAttemptedAt ? (
              <>
                Last attempt{" "}
                <AdminTime
                  emptyLabel="Time unavailable"
                  value={event.lastAttemptedAt}
                />
              </>
            ) : (
              "No processing attempt recorded"
            )}
          </dd>
        </div>
        <div>
          <dt className="text-sm font-semibold uppercase text-cocoa/55">
            Object
          </dt>
          {event.objectId ? (
            <>
              <dd className="mt-2 font-semibold capitalize text-cocoa">
                {event.objectType?.replaceAll("_", " ") ?? "Stored reference"}
              </dd>
              <dd className="mt-1 select-text font-mono text-cocoa/65 [overflow-wrap:anywhere]">
                {event.objectId}
              </dd>
            </>
          ) : (
            <dd className="mt-2 text-cocoa/65">
              No bounded object reference
            </dd>
          )}
        </div>
      </dl>

      {safeProcessingError ? (
        <div className="mt-4 rounded-md border border-clay/30 bg-accent-muted p-4 text-sm text-cocoa">
          <p className="font-semibold">Stable processing error</p>
          <code className="mt-1 block select-text font-mono [overflow-wrap:anywhere]">
            {safeProcessingError}
          </code>
        </div>
      ) : null}

      {processing.canRetry ? (
        <div className="mt-4 grid gap-3 border-t border-dune pt-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <p className="text-sm text-cocoa/70">
            {getBillingRetryDescription(event.eventType)}
          </p>
          <button
            type="button"
            onClick={() => onRetry(event.id)}
            disabled={retrying}
            aria-busy={retrying}
            className="min-h-11 w-full rounded-md border border-cocoa px-4 py-2 text-sm font-semibold text-cocoa disabled:opacity-50 sm:w-auto"
          >
            {retrying ? "Retrying…" : "Retry processing"}
          </button>
        </div>
      ) : event.status === "processing" ? (
        <p className="mt-4 border-t border-dune pt-4 text-sm text-cocoa/70">
          This event is already being processed. Retry becomes available if its
          lease expires.
        </p>
      ) : null}
    </article>
  );
}

export function AdminBillingEvents({
  canInspect,
  snapshot
}: {
  canInspect: boolean;
  snapshot: BillingEventSnapshot;
}) {
  const [items, setItems] = useState(snapshot.items);
  const [query, setQuery] = useState("");
  const [reconciliationId, setReconciliationId] = useState("");
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState<ActionMessage | null>(null);
  const [emptyState, setEmptyState] = useState<"ledger" | "no-match" | null>(
    snapshot.error ? null : snapshot.items.length === 0 ? "ledger" : null
  );
  const [initialLoadError, setInitialLoadError] = useState(
    Boolean(snapshot.error)
  );
  const [page, setPage] = useState(snapshot.page);
  const [pageSize, setPageSize] = useState(snapshot.pageSize);
  const pendingRetryIds = useRef(new Set<string>());
  const [retryingIds, setRetryingIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const [searching, setSearching] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [totalItems, setTotalItems] = useState(snapshot.totalItems);
  const [totalPages, setTotalPages] = useState(snapshot.totalPages);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  async function searchEvents(targetPage = 1) {
    if (!canInspect || searching) {
      return;
    }

    const params = new URLSearchParams({
      limit: "50",
      page: String(targetPage)
    });
    if (query.trim()) {
      params.set("q", query.trim());
    }
    if (status) {
      params.set("status", status);
    }

    setSearching(true);
    setMessage(null);
    setInitialLoadError(false);
    try {
      const response = await fetch(
        `/api/admin/billing-events?${params.toString()}`
      );
      const result = (await response.json().catch(() => null)) as
        | {
            items?: BillingEventLog[];
            ok?: boolean;
            page?: number;
            pageSize?: number;
            totalItems?: number;
            totalPages?: number;
          }
        | null;

      if (
        !response.ok ||
        !result?.ok ||
        !result.items ||
        !result.page ||
        !result.pageSize ||
        result.totalItems === undefined ||
        !result.totalPages
      ) {
        throw new Error("billing_events_query_failed");
      }

      setItems(result.items);
      setPage(result.page);
      setPageSize(result.pageSize);
      setTotalItems(result.totalItems);
      setTotalPages(result.totalPages);
      if (result.items.length === 0) {
        setEmptyState("no-match");
        setMessage({
          body:
            "Change the identifier or processing-status filter and search again.",
          heading: "No matching billing events.",
          tone: "status"
        });
        focusTarget(MESSAGE_TARGET_ID);
      } else {
        setEmptyState(null);
      }
    } catch {
      setMessage({
        body: "The current results are unchanged. Try the search again.",
        heading: "Billing events could not be searched.",
        tone: "error"
      });
      focusTarget(MESSAGE_TARGET_ID);
    } finally {
      setSearching(false);
    }
  }

  async function retryEvent(eventId: string) {
    if (!canInspect) {
      return;
    }

    await executeBillingEventRetry({
      eventId,
      onEvent: (event) =>
        setItems((currentItems) =>
          currentItems.map((item) => (item.id === event.id ? event : item))
        ),
      onFocus: focusTarget,
      onMessage: setMessage,
      onPendingChange: setRetryingIds,
      pendingIds: pendingRetryIds.current
    });
  }

  async function reconcileBilling() {
    if (!canInspect || reconciling) {
      return;
    }

    const identifier = reconciliationId.trim();
    const validationMessage =
      getBillingReconciliationValidationMessage(identifier);
    if (validationMessage) {
      setMessage({
        heading: validationMessage,
        tone: "error"
      });
      focusTarget(MESSAGE_TARGET_ID);
      return;
    }

    setReconciling(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/billing-events/reconcile", {
        body: JSON.stringify({ identifier }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const result = (await response.json().catch(() => null)) as
        | {
            event?: BillingEventLog;
            ok?: boolean;
            result?: {
              staleSubscriptionsClosed: number;
              subscriptionsSynced: number;
            };
          }
        | null;

      if (!response.ok || !result?.ok || !result.event || !result.result) {
        throw new Error("billing_reconciliation_failed");
      }

      const reconciledEvent: BillingEventLog = {
        ...result.event,
        customerId: identifier.startsWith("cus_") ? identifier : null,
        objectId: identifier,
        objectType: identifier.startsWith("sub_")
          ? "subscription"
          : "customer",
        subscriptionId: identifier.startsWith("sub_") ? identifier : null
      };
      setItems((currentItems) =>
        [
          reconciledEvent,
          ...currentItems.filter((item) => item.id !== reconciledEvent.id)
        ].slice(0, pageSize)
      );
      const nextTotalItems = totalItems + 1;
      setPage(1);
      setQuery("");
      setReconciliationId("");
      setStatus("");
      setEmptyState(null);
      setInitialLoadError(false);
      setTotalItems(nextTotalItems);
      setTotalPages(Math.max(1, Math.ceil(nextTotalItems / pageSize)));
      setMessage({
        heading: getBillingReconciliationResultMessage(result.result),
        tone: "status"
      });
      focusTarget(getBillingEventHeadingId(reconciledEvent.id));
    } catch {
      setMessage({
        heading:
          "Billing reconciliation failed. Confirm the Stripe identifier, then try again.",
        tone: "error"
      });
      focusTarget(MESSAGE_TARGET_ID);
    } finally {
      setReconciling(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-2xl font-semibold text-cocoa">
            Billing Events
          </h3>
          <p className="mt-2 text-sm text-cocoa/70">
            Signed Stripe receipts and their independent GS学院 processing
            outcomes.
          </p>
        </div>
        <span className="rounded bg-sand px-3 py-1 text-sm text-cocoa/70">
          {snapshot.source === "supabase" ? "Live" : "Demo"}
        </span>
      </div>

      {!canInspect ? (
        <div className="mt-6 rounded-md border border-dune bg-sand p-5 text-cocoa">
          <p className="font-semibold">
            Admin role required to inspect billing events.
          </p>
          <p className="mt-2 text-sm text-cocoa/70">
            Return to Account, or ask an owner to grant the required Admin role.
          </p>
          <a
            href="/account"
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-cocoa px-5 py-3 text-sm font-semibold text-cocoa sm:w-auto"
          >
            Return to Account
          </a>
        </div>
      ) : (
        <>
          <form
            className="mt-6 border-b border-dune pb-6"
            onSubmit={(formEvent) => {
              formEvent.preventDefault();
              void reconcileBilling();
            }}
            aria-busy={reconciling}
          >
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <label className="grid min-w-0 gap-2 text-sm text-cocoa/75">
                Reconcile from Stripe
                <input
                  value={reconciliationId}
                  onChange={(inputEvent) =>
                    setReconciliationId(inputEvent.target.value)
                  }
                  placeholder="sub_… or cus_…"
                  autoComplete="off"
                  aria-describedby="billing-reconciliation-helper"
                  className="min-h-11 w-full rounded-md border border-dune bg-white px-4 py-3 text-cocoa"
                />
              </label>
              <button
                type="submit"
                disabled={reconciling}
                className="min-h-11 w-full rounded-md border border-cocoa px-5 py-3 text-sm font-semibold text-cocoa disabled:opacity-50 sm:w-auto"
              >
                {reconciling ? "Reconciling…" : "Reconcile billing"}
              </button>
            </div>
            <p
              id="billing-reconciliation-helper"
              className="mt-2 max-w-[68ch] text-sm text-cocoa/70"
            >
              Pulls current Stripe subscription data, reapplies access rules,
              and records a synthetic receipt. Use a subscription or customer ID
              only.
            </p>
          </form>

          <form
            className="mt-6 grid gap-4"
            onSubmit={(formEvent) => {
              formEvent.preventDefault();
              void searchEvents(1);
            }}
            aria-busy={searching}
          >
            <label className="grid gap-2 text-sm text-cocoa/75">
              Search billing events
              <input
                value={query}
                onChange={(inputEvent) => setQuery(inputEvent.target.value)}
                placeholder="Event, dispute, payment, subscription, or customer ID"
                className="min-h-11 w-full rounded-md border border-dune bg-white px-4 py-3 text-cocoa"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,16rem)_auto] sm:items-end">
              <label className="grid gap-2 text-sm text-cocoa/75">
                Processing status
                <select
                  value={status}
                  onChange={(selectEvent) => setStatus(selectEvent.target.value)}
                  className="min-h-11 w-full rounded-md border border-dune bg-white px-4 py-3 text-cocoa"
                >
                  <option value="">Any processing status</option>
                  <option value="received">Awaiting</option>
                  <option value="processing">In progress</option>
                  <option value="processed">Complete</option>
                  <option value="ignored">No handler</option>
                  <option value="failed">Failed</option>
                </select>
              </label>
              <button
                type="submit"
                disabled={searching}
                className="min-h-11 w-full rounded-md bg-cocoa px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto"
              >
                {searching ? "Searching…" : "Search events"}
              </button>
            </div>
          </form>

          <div
            id={MESSAGE_TARGET_ID}
            tabIndex={-1}
            aria-live="polite"
            className="mt-4"
          >
            {message ? (
              <div
                className={`rounded-md border p-4 text-sm ${
                  message.tone === "error"
                    ? "border-clay/30 bg-accent-muted text-cocoa"
                    : "border-dune bg-sand text-cocoa/75"
                }`}
              >
                <p
                  role={message.tone === "error" ? "alert" : "status"}
                  className="font-semibold"
                >
                  {message.heading}
                </p>
                {message.body ? <p className="mt-1">{message.body}</p> : null}
              </div>
            ) : null}
          </div>

          {initialLoadError ? (
            <div className="mt-4">
              <DataUnavailable
                title="Billing events could not be loaded."
                description="Refresh this workspace or check service health before taking a recovery action."
              />
            </div>
          ) : null}

          {items.length === 0 && emptyState === "ledger" ? (
            <div className="mt-4" role="status">
              <DataEmpty
                title="No billing events recorded yet."
                description="Signed Stripe receipts will appear here after the webhook stores them."
              />
            </div>
          ) : null}

          {items.length > 0 ? (
            <>
              <div className="mt-6 grid gap-3 text-sm text-cocoa/65 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <p>
                  Showing {(page - 1) * pageSize + 1}–
                  {Math.min(page * pageSize, totalItems)} of {totalItems}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_auto_auto] sm:items-center">
                  <button
                    type="button"
                    className="min-h-11 w-full rounded-md border border-dune px-4 py-2 font-semibold text-cocoa disabled:opacity-50 sm:w-auto"
                    disabled={searching || page <= 1}
                    onClick={() => void searchEvents(page - 1)}
                  >
                    Previous
                  </button>
                  <span
                    aria-current="page"
                    className="min-h-11 content-center text-center"
                  >
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className="min-h-11 w-full rounded-md border border-dune px-4 py-2 font-semibold text-cocoa disabled:opacity-50 sm:w-auto"
                    disabled={searching || page >= totalPages}
                    onClick={() => void searchEvents(page + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>

              <div className="mt-4 divide-y divide-dune border-y border-dune">
                {items.map((billingEvent) => (
                  <BillingEventRecord
                    key={billingEvent.id}
                    event={billingEvent}
                    now={now}
                    onRetry={(eventId) => void retryEvent(eventId)}
                    retrying={retryingIds.has(billingEvent.id)}
                  />
                ))}
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
