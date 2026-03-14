import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { EntitlementKey } from "@soji/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  slug: z
    .string()
    .min(3)
    .regex(/^[a-z0-9-]+$/, "Slug must use lowercase letters, numbers, and hyphens."),
  title: z.string().min(3),
  summary: z.string().min(10),
  type: z.enum([
    "article",
    "case_study",
    "template",
    "monthly_update",
    "product",
    "office_hour_session"
  ]),
  visibility: z.enum(["public", "members_only", "purchase_required"]),
  body: z.string().min(20),
  coverImage: z.string().url().optional().or(z.literal("")),
  requiredEntitlements: z.array(z.enum(entitlementKeys))
});

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, reason: "supabase_not_configured" },
      { status: 501 }
    );
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, reason: "not_authenticated" }, { status: 401 });
  }

  const { data: roles, error: rolesError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (rolesError) {
    return NextResponse.json(
      { ok: false, reason: rolesError.message },
      { status: 500 }
    );
  }

  const allowed = (roles ?? []).some(
    (entry) => entry.role === "admin" || entry.role === "editor"
  );

  if (!allowed) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = payloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, reason: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const payload = parsed.data;

  const { data: insertedItem, error: insertError } = await supabase
    .from("content_items")
    .insert({
      slug: payload.slug,
      title: payload.title,
      summary: payload.summary,
      type: payload.type,
      visibility: payload.visibility,
      body_markdown: payload.body,
      cover_image_url: payload.coverImage || null,
      published_at: new Date().toISOString(),
      created_by: user.id
    })
    .select("id, slug")
    .single();

  if (insertError || !insertedItem) {
    return NextResponse.json(
      { ok: false, reason: insertError?.message ?? "content_insert_failed" },
      { status: 500 }
    );
  }

  if (payload.requiredEntitlements.length > 0) {
    const { error: ruleError } = await supabase.from("content_access_rules").insert(
      payload.requiredEntitlements.map((entitlementId) => ({
        content_id: insertedItem.id,
        entitlement_id: entitlementId
      }))
    );

    if (ruleError) {
      await supabase.from("content_items").delete().eq("id", insertedItem.id);
      return NextResponse.json(
        { ok: false, reason: ruleError.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    item: insertedItem
  });
}
