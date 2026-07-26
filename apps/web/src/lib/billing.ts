import type {
  BillingEventLog,
  BillingEventSnapshot,
  BillingEventStatus
} from "@soji/types";
import { isExplicitDemoModeEnabled } from "@/lib/env";
import { reportOperationalError } from "@/lib/observability";
import type { Json, Tables } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const demoBillingEvents: BillingEventLog[] = [
  {
    attemptCount: 2,
    createdAt: "2026-07-14T14:00:00.000Z",
    eventType: "checkout.session.completed",
    id: "00000000-0000-4000-8000-000000000501",
    lastAttemptedAt: "2026-07-14T14:03:00.000Z",
    processedAt: null,
    processingError: "Demo processing failure: account metadata needs review.",
    processingStartedAt: null,
    provider: "stripe",
    providerEventId: "evt_demo_received_failed",
    status: "failed"
  }
];

export const billingEventSelect =
  "id, provider, provider_event_id, event_type, status, attempt_count, last_attempted_at, payload, processed_at, processing_error, processing_started_at, created_at";

export type BillingEventRow = Pick<
  Tables<"billing_events">,
  | "attempt_count"
  | "created_at"
  | "event_type"
  | "id"
  | "last_attempted_at"
  | "payload"
  | "processed_at"
  | "processing_error"
  | "processing_started_at"
  | "provider"
  | "provider_event_id"
  | "status"
>;

function getBoundedPayloadReference(payload: Json, key: string) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const value = payload[key];
  return typeof value === "string" && value.length > 0 && value.length <= 255
    ? value
    : null;
}

function getBillingEventReferences(payload: Json) {
  const identifier = getBoundedPayloadReference(payload, "identifier");
  const syntheticSubscriptionId =
    identifier && /^sub_[A-Za-z0-9]+$/.test(identifier) ? identifier : null;
  const syntheticCustomerId =
    identifier && /^cus_[A-Za-z0-9]+$/.test(identifier) ? identifier : null;
  const subscriptionId =
    getBoundedPayloadReference(payload, "subscriptionId") ??
    syntheticSubscriptionId;
  const customerId =
    getBoundedPayloadReference(payload, "customerId") ?? syntheticCustomerId;

  return {
    customerId,
    disputeId: getBoundedPayloadReference(payload, "disputeId"),
    objectId:
      getBoundedPayloadReference(payload, "objectId") ??
      subscriptionId ??
      customerId,
    objectType:
      getBoundedPayloadReference(payload, "objectType") ??
      (subscriptionId ? "subscription" : customerId ? "customer" : null),
    paymentId: getBoundedPayloadReference(payload, "paymentId"),
    subscriptionId
  };
}

function getStableProcessingError(value: string | null) {
  if (!value) {
    return null;
  }

  return /^[a-z][a-z0-9_]{0,119}$/.test(value)
    ? value
    : "billing_event_processing_failed";
}

export function mapBillingEventRow(row: BillingEventRow): BillingEventLog {
  return {
    attemptCount: row.attempt_count,
    ...getBillingEventReferences(row.payload),
    id: row.id,
    provider: row.provider,
    providerEventId: row.provider_event_id,
    eventType: row.event_type,
    lastAttemptedAt: row.last_attempted_at,
    status: row.status as BillingEventStatus,
    processedAt: row.processed_at,
    processingError: getStableProcessingError(row.processing_error),
    processingStartedAt: row.processing_started_at,
    createdAt: row.created_at
  };
}

export async function getBillingEventSnapshot(): Promise<BillingEventSnapshot> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    const items = isExplicitDemoModeEnabled() ? demoBillingEvents : [];
    return {
      items,
      page: 1,
      pageSize: 25,
      source: "demo",
      totalItems: items.length,
      totalPages: 1
    };
  }

  const { count, data, error } = await supabase
    .from("billing_events")
    .select(billingEventSelect, { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(25);

  if (error || !data) {
    await reportOperationalError("billing.events.query_failed", error, {
      source: "supabase"
    });
    return {
      error: "billing_events_query_failed",
      items: [],
      page: 1,
      pageSize: 25,
      source: "supabase",
      totalItems: 0,
      totalPages: 1
    };
  }

  const totalItems = count ?? data.length;
  return {
    items: data.map(mapBillingEventRow),
    page: 1,
    pageSize: 25,
    source: "supabase",
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / 25))
  };
}
