import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { EntitlementKey } from "@soji/types";
import { reportOperationalError } from "@/lib/observability";
import { getPublisherContext } from "@/lib/publisher";
import type { Database } from "@/lib/supabase/database.types";

type UpsertOfficeHourArgs =
  Database["public"]["Functions"]["upsert_office_hour"]["Args"];

const entitlementKeys = [
  "content.basic",
  "content.all",
  "library.case_studies",
  "library.templates",
  "monthly.updates",
  "office_hours.join",
  "community.vip_access",
  "contact.unlock",
  "product.digital"
] as const satisfies readonly EntitlementKey[];

const webUrlSchema = z
  .string()
  .trim()
  .max(2_048)
  .url()
  .refine((value) => ["http:", "https:"].includes(new URL(value).protocol), {
    message: "URL must use http or https"
  });

const payloadSchema = z
  .object({
    replayUrl: webUrlSchema.optional().or(z.literal("")),
    requiredEntitlement: z.enum(entitlementKeys),
    signupUrl: webUrlSchema,
    startsAt: z.string().datetime(),
    title: z.string().trim().min(3).max(200)
  })
  .strict();

const updatePayloadSchema = payloadSchema.extend({
  expectedRevision: z.number().int().positive(),
  id: z.string().uuid()
});

const deletePayloadSchema = z.object({
  expectedRevision: z.number().int().positive(),
  id: z.string().uuid()
}).strict();

function toOfficeHourRpcPayload(
  payload: z.infer<typeof payloadSchema>,
  options: { expectedRevision: number | null; id: string | null }
): UpsertOfficeHourArgs {
  return {
    p_expected_revision: options.expectedRevision,
    p_office_hour_id: options.id,
    p_replay_url: payload.replayUrl || null,
    p_required_entitlement_id: payload.requiredEntitlement,
    p_signup_url: payload.signupUrl,
    p_starts_at: payload.startsAt,
    p_title: payload.title
  } as unknown as UpsertOfficeHourArgs;
}

function officeHourConflictResponse(
  error: { code?: string } | null,
  operation: "delete" | "write"
) {
  const reason =
    error?.code === "40001"
      ? operation === "delete"
        ? "office_hour_delete_conflict"
        : "office_hour_update_conflict"
      : error?.code === "P0002"
        ? "office_hour_not_found"
        : null;

  if (!reason) {
    return null;
  }

  return NextResponse.json(
    { ok: false, reason },
    { status: reason === "office_hour_not_found" ? 404 : 409 }
  );
}

async function writeFailure(
  event: string,
  error: unknown,
  context: Record<string, number | string>
) {
  await reportOperationalError(event, error, context);
  return NextResponse.json(
    { ok: false, reason: "office_hour_write_failed" },
    { status: 500 }
  );
}

export async function POST(request: NextRequest) {
  const context = await getPublisherContext();
  if ("error" in context) {
    return context.error;
  }

  const body = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, reason: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const payload = parsed.data;
  const { data, error } = await context.supabase
    .rpc(
      "upsert_office_hour",
      toOfficeHourRpcPayload(payload, { expectedRevision: null, id: null })
    )
    .single();

  if (error || !data) {
    const conflict = officeHourConflictResponse(error, "write");
    if (conflict) {
      return conflict;
    }
    return writeFailure(
      "admin.office_hour.insert_failed",
      error ?? new Error("office_hour_insert_failed"),
      { title: payload.title }
    );
  }

  return NextResponse.json({ ok: true, item: data });
}

export async function PATCH(request: NextRequest) {
  const context = await getPublisherContext();
  if ("error" in context) {
    return context.error;
  }

  const body = await request.json().catch(() => null);
  const parsed = updatePayloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, reason: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { expectedRevision, id, ...payload } = parsed.data;
  const { data, error } = await context.supabase
    .rpc(
      "upsert_office_hour",
      toOfficeHourRpcPayload(payload, { expectedRevision, id })
    )
    .single();

  if (error || !data) {
    const conflict = officeHourConflictResponse(error, "write");
    if (conflict) {
      return conflict;
    }
    return writeFailure(
      "admin.office_hour.update_failed",
      error ?? new Error("office_hour_update_failed"),
      { expectedRevision, officeHourId: id, title: payload.title }
    );
  }

  return NextResponse.json({ ok: true, item: data });
}

export async function DELETE(request: NextRequest) {
  const context = await getPublisherContext();
  if ("error" in context) {
    return context.error;
  }

  const body = await request.json().catch(() => null);
  const parsed = deletePayloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, reason: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data, error } = await context.supabase.rpc("delete_office_hour", {
    p_expected_revision: parsed.data.expectedRevision,
    p_office_hour_id: parsed.data.id
  });

  if (error || data !== true) {
    const conflict = officeHourConflictResponse(error, "delete");
    if (conflict) {
      return conflict;
    }
    return writeFailure(
      "admin.office_hour.delete_failed",
      error ?? new Error("office_hour_delete_failed"),
      {
        expectedRevision: parsed.data.expectedRevision,
        officeHourId: parsed.data.id
      }
    );
  }

  return NextResponse.json({ ok: true });
}
