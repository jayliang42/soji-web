import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { EntitlementKey } from "@soji/types";
import { reportOperationalError } from "@/lib/observability";
import { getPublisherContext } from "@/lib/publisher";
import type { Database } from "@/lib/supabase/database.types";

type UpsertContentArgs =
  Database["public"]["Functions"]["upsert_content_item"]["Args"];

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

const coverImageSchema = z
  .string()
  .trim()
  .max(2_000)
  .refine(
    (value) =>
      value === "" ||
      /^\/covers\/[a-zA-Z0-9/_-]+\.(?:avif|jpe?g|png|webp)$/u.test(value) ||
      z.string().url().safeParse(value).success,
    "Cover image must be an absolute URL or an owned /covers/ image."
  );

const contentFieldsSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Slug must use lowercase letters, numbers, and hyphens."),
  title: z.string().trim().min(3).max(200),
  summary: z.string().trim().min(10).max(2000),
  type: z.enum([
    "article",
    "case_study",
    "template",
    "monthly_update",
    "product",
    "office_hour_session"
  ]),
  visibility: z.enum(["public", "members_only", "purchase_required"]),
  body: z.string().min(20).max(100_000),
  preview: z.string().trim().max(20_000).default(""),
  coverImage: coverImageSchema.default(""),
  coverImageAlt: z.string().trim().max(300).default(""),
  tags: z
    .array(z.string().trim().min(2).max(40))
    .max(8)
    .transform((tags) => [...new Set(tags)])
    .default([]),
  requiredEntitlements: z.array(z.enum(entitlementKeys)).max(entitlementKeys.length)
}).strict();

type ContentPayload = z.infer<typeof contentFieldsSchema>;

function validatePublication(
  payload: ContentPayload,
  published: boolean,
  context: z.RefinementCtx
) {
  if (!published) {
    return;
  }

  if (!payload.coverImage) {
    context.addIssue({
      code: "custom",
      message: "Published content requires a cover image.",
      path: ["coverImage"]
    });
  }

  if (payload.coverImage && payload.coverImageAlt.length < 8) {
    context.addIssue({
      code: "custom",
      message: "Describe the cover image in at least 8 characters.",
      path: ["coverImageAlt"]
    });
  }

  if (payload.tags.length === 0) {
    context.addIssue({
      code: "custom",
      message: "Published content requires at least one useful tag.",
      path: ["tags"]
    });
  }

  if (payload.visibility !== "public" && payload.preview.length < 20) {
    context.addIssue({
      code: "custom",
      message: "Restricted published content requires a useful public preview.",
      path: ["preview"]
    });
  }
}

const payloadSchema = contentFieldsSchema.superRefine((payload, context) => {
  validatePublication(payload, true, context);
});

const updatePayloadSchema = contentFieldsSchema.extend({
  expectedRevision: z.number().int().positive(),
  id: z.string().uuid(),
  published: z.boolean()
}).superRefine((payload, context) => {
  validatePublication(payload, payload.published, context);
});

const deletePayloadSchema = z.object({
  expectedRevision: z.number().int().positive(),
  id: z.string().uuid()
}).strict();

function toContentRpcPayload(
  payload: ContentPayload,
  options: { expectedRevision: number | null; id: string | null; published: boolean }
): UpsertContentArgs {
  // Generated RPC types do not encode nullable PostgreSQL function arguments.
  return {
    p_body_markdown: payload.body,
    p_content_id: options.id,
    p_cover_image_alt: payload.coverImageAlt,
    p_cover_image_url: payload.coverImage || null,
    p_expected_revision: options.expectedRevision,
    p_published: options.published,
    p_preview_markdown: payload.preview,
    p_required_entitlements: payload.requiredEntitlements,
    p_slug: payload.slug,
    p_summary: payload.summary,
    p_tags: payload.tags,
    p_title: payload.title,
    p_type: payload.type,
    p_visibility: payload.visibility
  } as unknown as UpsertContentArgs;
}

function contentConflictResponse(
  error: { code?: string } | null,
  operation: "delete" | "write"
) {
  const reason =
    error?.code === "23505"
      ? "content_slug_conflict"
      : error?.code === "40001"
        ? operation === "delete"
          ? "content_delete_conflict"
          : "content_update_conflict"
        : error?.code === "P0002"
          ? "content_not_found"
          : null;

  if (!reason) {
    return null;
  }

  return NextResponse.json(
    { ok: false, reason },
    { status: reason === "content_not_found" ? 404 : 409 }
  );
}

async function contentWriteFailed(
  event: string,
  error: unknown,
  context: Record<string, boolean | number | string | null | undefined>
) {
  await reportOperationalError(event, error, context);
  return NextResponse.json(
    { ok: false, reason: "content_write_failed" },
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

  const { data, error } = await context.supabase
    .rpc(
      "upsert_content_item",
      toContentRpcPayload(parsed.data, {
        expectedRevision: null,
        id: null,
        published: true
      })
    )
    .single();

  if (error || !data) {
    const conflict = contentConflictResponse(error, "write");
    if (conflict) {
      return conflict;
    }
    return contentWriteFailed("admin.content.create_failed", error, {
      slug: parsed.data.slug
    });
  }

  return NextResponse.json({
    ok: true,
    item: data
  });
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

  const { expectedRevision, id, published, ...payload } = parsed.data;
  const { data, error } = await context.supabase
    .rpc(
      "upsert_content_item",
      toContentRpcPayload(payload, { expectedRevision, id, published })
    )
    .single();

  if (error || !data) {
    const conflict = contentConflictResponse(error, "write");
    if (conflict) {
      return conflict;
    }
    return contentWriteFailed("admin.content.update_failed", error, {
      contentId: id,
      slug: payload.slug
    });
  }

  return NextResponse.json({
    ok: true,
    item: data
  });
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

  const { data, error } = await context.supabase.rpc("delete_content_item", {
    p_content_id: parsed.data.id,
    p_expected_revision: parsed.data.expectedRevision
  });

  if (error || data !== true) {
    const conflict = contentConflictResponse(error, "delete");
    if (conflict) {
      return conflict;
    }
    return contentWriteFailed("admin.content.delete_failed", error, {
      contentId: parsed.data.id,
      expectedRevision: parsed.data.expectedRevision
    });
  }

  return NextResponse.json({ ok: true });
}
