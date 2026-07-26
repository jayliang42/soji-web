import { officeHourSessions, sampleLibrary } from "@soji/domain";
import type { ContentItem, ContentSnapshot, EntitlementKey } from "@soji/types";
import { cache } from "react";
import {
  resolveDataSnapshot,
  type LiveDataSnapshot
} from "@/lib/data-source";
import { isDemoModeEnabled } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ContentRow = Pick<
  Tables<"content_items">,
  | "body_markdown"
  | "cover_image_url"
  | "id"
  | "published_at"
  | "slug"
  | "summary"
  | "title"
  | "type"
  | "updated_at"
  | "revision"
  | "visibility"
> & {
  content_access_rules:
    | Array<Pick<Tables<"content_access_rules">, "entitlement_id">>
    | null;
};

function mapContentRow(row: ContentRow): ContentItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    type: row.type,
    visibility: row.visibility,
    requiredEntitlements:
      row.content_access_rules?.map(
        (rule) => rule.entitlement_id as EntitlementKey
      ) ?? [],
    publishedAt: row.published_at ?? "",
    revision: row.revision,
    updatedAt: row.updated_at,
    coverImage: row.cover_image_url ?? undefined,
    tags: [],
    body: row.body_markdown
  };
}

async function loadSupabaseContent({
  includeUnpublished = false
}: {
  includeUnpublished?: boolean;
} = {}): Promise<LiveDataSnapshot<ContentItem> | null> {
  const supabase = createSupabaseAdminClient() ?? (await createSupabaseServerClient());
  if (!supabase) {
    return null;
  }

  let query = supabase
    .from("content_items")
    .select(
      "id, slug, title, summary, type, visibility, body_markdown, cover_image_url, published_at, updated_at, revision, content_access_rules(entitlement_id)"
    )
    .order("published_at", { ascending: false, nullsFirst: false });

  if (!includeUnpublished) {
    query = query.not("published_at", "is", null);
  }

  const { data, error } = await query;

  if (error || !data) {
    return {
      items: [],
      source: "supabase",
      error: error?.message ?? "content_query_failed"
    };
  }

  return {
    items: data.map(mapContentRow),
    source: "supabase"
  };
}

export async function getContentSnapshot(): Promise<ContentSnapshot> {
  const liveSnapshot = await loadSupabaseContent();
  return resolveDataSnapshot({
    demoEnabled: isDemoModeEnabled(),
    demoItems: sampleLibrary,
    liveSnapshot,
    missingConfigurationError: "content_service_not_configured"
  });
}

export async function getEditorialContentSnapshot(): Promise<ContentSnapshot> {
  const liveSnapshot = await loadSupabaseContent({ includeUnpublished: true });
  return resolveDataSnapshot({
    demoEnabled: isDemoModeEnabled(),
    demoItems: sampleLibrary,
    liveSnapshot,
    missingConfigurationError: "content_service_not_configured"
  });
}

export async function getAllContent() {
  const snapshot = await getContentSnapshot();
  return snapshot.items;
}

export const getContentBySlug = cache(async function getContentBySlug(slug: string) {
  const snapshot = await getContentSnapshot();
  return {
    item: snapshot.items.find((item) => item.slug === slug) ?? null,
    source: snapshot.source,
    error: snapshot.error
  };
});

export function getOfficeHours() {
  return officeHourSessions;
}
