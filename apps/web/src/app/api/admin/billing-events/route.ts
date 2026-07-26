import { NextRequest, NextResponse } from "next/server";
import {
  billingEventSelect,
  mapBillingEventRow
} from "@/lib/billing";
import { reportOperationalError } from "@/lib/observability";
import { getAdminContext } from "@/lib/publisher";

function clampLimit(value: string | null) {
  const parsed = Number(value ?? 25);
  if (!Number.isFinite(parsed)) {
    return 25;
  }

  return Math.min(Math.max(Math.trunc(parsed), 1), 100);
}

function clampPage(value: string | null) {
  const parsed = Number(value ?? 1);
  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return Math.min(Math.max(Math.trunc(parsed), 1), 10_000);
}

function normalizeStatus(value: string | null) {
  if (
    value === "received" ||
    value === "processing" ||
    value === "processed" ||
    value === "ignored" ||
    value === "failed"
  ) {
    return value;
  }

  return null;
}

function normalizeSearch(value: string | null) {
  if (value === null || value.trim() === "") {
    return { kind: "empty" } as const;
  }

  if (value.includes("@")) {
    return { kind: "invalid" } as const;
  }

  const safeValue = value
    ?.trim()
    .slice(0, 200)
    .replace(/[^A-Za-z0-9._:-]+/g, "");
  if (!safeValue) {
    return { kind: "invalid" } as const;
  }

  return {
    kind: "value",
    value: safeValue
      .replaceAll("%", "\\%")
      .replaceAll("_", "\\_")
  } as const;
}

export async function GET(request: NextRequest) {
  const context = await getAdminContext();
  if ("error" in context) {
    return context.error;
  }

  const searchParams = request.nextUrl.searchParams;
  const limit = clampLimit(searchParams.get("limit"));
  const page = clampPage(searchParams.get("page"));
  const status = normalizeStatus(searchParams.get("status"));
  const normalizedSearch = normalizeSearch(searchParams.get("q"));
  if (normalizedSearch.kind === "invalid") {
    return NextResponse.json(
      { ok: false, reason: "invalid_billing_event_search" },
      { status: 400 }
    );
  }
  const search =
    normalizedSearch.kind === "value" ? normalizedSearch.value : null;

  let query = context.supabase
    .from("billing_events")
    .select(billingEventSelect, { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  if (search) {
    query = query.or(
      [
        "provider_event_id",
        "event_type",
        "payload->>objectId",
        "payload->>disputeId",
        "payload->>paymentId",
        "payload->>subscriptionId",
        "payload->>customerId"
      ]
        .map((path) => `${path}.ilike.%${search}%`)
        .join(",")
    );
  }

  const offset = (page - 1) * limit;
  const { count, data, error } = await query.range(
    offset,
    offset + limit - 1
  );

  if (error || !data) {
    await reportOperationalError("admin.billing_events.query_failed", error, {
      hasSearch: Boolean(search),
      status
    });
    return NextResponse.json(
      { ok: false, reason: "billing_events_query_failed" },
      { status: 500 }
    );
  }

  const totalItems = count ?? data.length;
  return NextResponse.json({
    items: data.map(mapBillingEventRow),
    ok: true,
    page,
    pageSize: limit,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / limit))
  });
}
