import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { EntitlementKey } from "@soji/types";
import { reportOperationalError } from "@/lib/observability";
import { getPublisherContext } from "@/lib/publisher";
import { getStripeClient } from "@/lib/stripe";
import { validateStripeProductPrice } from "@/lib/stripe-price-validation";
import type { AppSupabaseClient } from "@/lib/supabase/client-types";
import type { Database } from "@/lib/supabase/database.types";

type UpsertProductArgs = Database["public"]["Functions"]["upsert_product"]["Args"];

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

const payloadSchema = z.object({
  bullets: z.array(z.string().trim().min(2).max(240)).max(8),
  entitlementId: z.enum(entitlementKeys),
  isActive: z.boolean(),
  priceCents: z.number().int().nonnegative(),
  priceLabel: z.string().trim().min(1).max(40),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug must use lowercase letters, numbers, and hyphens."),
  stripePriceId: z
    .string()
    .trim()
    .max(255)
    .regex(/^price_[A-Za-z0-9]+$/)
    .optional()
    .or(z.literal("")),
  summary: z.string().trim().min(10).max(1000),
  title: z.string().trim().min(3).max(160)
}).strict();

const updatePayloadSchema = payloadSchema.extend({
  expectedRevision: z.number().int().positive(),
  id: z.string().uuid()
});

const archivePayloadSchema = z.object({
  expectedRevision: z.number().int().positive(),
  id: z.string().uuid()
}).strict();

function toProductRpcPayload(
  payload: z.infer<typeof payloadSchema>,
  options: { expectedRevision: number | null; id: string | null }
): UpsertProductArgs {
  return {
    p_bullets: payload.bullets,
    p_entitlement_id: payload.entitlementId,
    p_expected_revision: options.expectedRevision,
    p_is_active: payload.isActive,
    p_price_cents: payload.priceCents,
    p_price_label: payload.priceLabel,
    p_product_id: options.id,
    p_slug: payload.slug,
    p_stripe_price_id: payload.stripePriceId || null,
    p_summary: payload.summary,
    p_title: payload.title
  } as unknown as UpsertProductArgs;
}

function productConflictResponse(
  error: { code?: string } | null,
  operation: "archive" | "write"
) {
  const reason =
    error?.code === "23505"
      ? "product_slug_conflict"
      : error?.code === "40001"
        ? operation === "archive"
          ? "product_archive_conflict"
          : "product_update_conflict"
        : error?.code === "P0002"
          ? "product_not_found"
          : null;

  if (!reason) {
    return null;
  }

  return NextResponse.json(
    { ok: false, reason },
    { status: reason === "product_not_found" ? 404 : 409 }
  );
}

async function validateProductPrice(payload: z.infer<typeof payloadSchema>) {
  const priceId = payload.stripePriceId ?? "";
  const validation = await validateStripeProductPrice({
    expectedAmount: payload.priceCents,
    isActive: payload.isActive,
    priceId,
    stripe: priceId ? getStripeClient() : null
  });

  if (validation.ok) {
    return null;
  }

  if (validation.error) {
    await reportOperationalError("stripe.admin.price_validation_failed", validation.error, {
      stripePriceId: payload.stripePriceId
    });
  }

  return NextResponse.json(
    { ok: false, reason: validation.reason },
    { status: validation.status }
  );
}

async function validateProductDelivery({
  id,
  isActive,
  supabase
}: {
  id?: string;
  isActive: boolean;
  supabase: AppSupabaseClient;
}) {
  if (!isActive) {
    return null;
  }
  if (!id) {
    return NextResponse.json(
      { ok: false, reason: "product_must_be_created_as_draft" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("product_assets")
    .select("id")
    .eq("product_id", id)
    .maybeSingle();
  if (error) {
    await reportOperationalError("admin.product.delivery_lookup_failed", error, {
      productId: id
    });
    return NextResponse.json(
      { ok: false, reason: "product_delivery_lookup_failed" },
      { status: 500 }
    );
  }
  if (!data) {
    return NextResponse.json(
      { ok: false, reason: "product_delivery_missing" },
      { status: 400 }
    );
  }

  return null;
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

  const deliveryError = await validateProductDelivery({
    isActive: parsed.data.isActive,
    supabase: context.supabase
  });
  if (deliveryError) {
    return deliveryError;
  }

  const priceError = await validateProductPrice(parsed.data);
  if (priceError) {
    return priceError;
  }

  const { data, error } = await context.supabase
    .rpc(
      "upsert_product",
      toProductRpcPayload(parsed.data, { expectedRevision: null, id: null })
    )
    .single();

  if (error || !data) {
    const conflict = productConflictResponse(error, "write");
    if (conflict) {
      return conflict;
    }
    await reportOperationalError("admin.product.insert_failed", error, {
      slug: parsed.data.slug
    });
    return NextResponse.json(
      { ok: false, reason: "product_insert_failed" },
      { status: 500 }
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

  const deliveryError = await validateProductDelivery({
    id: parsed.data.id,
    isActive: parsed.data.isActive,
    supabase: context.supabase
  });
  if (deliveryError) {
    return deliveryError;
  }

  const priceError = await validateProductPrice(parsed.data);
  if (priceError) {
    return priceError;
  }

  const { expectedRevision, id, ...payload } = parsed.data;
  const { data, error } = await context.supabase
    .rpc(
      "upsert_product",
      toProductRpcPayload(payload, { expectedRevision, id })
    )
    .single();

  if (error || !data) {
    const conflict = productConflictResponse(error, "write");
    if (conflict) {
      return conflict;
    }
    await reportOperationalError("admin.product.update_failed", error, {
      productId: id,
      slug: payload.slug
    });
    return NextResponse.json(
      { ok: false, reason: "product_update_failed" },
      { status: 500 }
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
  const parsed = archivePayloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, reason: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data, error } = await context.supabase
    .rpc("archive_product", {
      p_expected_revision: parsed.data.expectedRevision,
      p_product_id: parsed.data.id
    })
    .single();

  if (error || !data) {
    const conflict = productConflictResponse(error, "archive");
    if (conflict) {
      return conflict;
    }
    await reportOperationalError("admin.product.archive_failed", error, {
      expectedRevision: parsed.data.expectedRevision,
      productId: parsed.data.id
    });
    return NextResponse.json(
      { ok: false, reason: "product_archive_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, item: data });
}
