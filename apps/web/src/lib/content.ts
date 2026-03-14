import { officeHourSessions, sampleLibrary } from "@soji/domain";
import type { ContentItem, ContentSnapshot, EntitlementKey } from "@soji/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface ContentRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  type: ContentItem["type"];
  visibility: ContentItem["visibility"];
  body_markdown: string;
  cover_image_url: string | null;
  published_at: string | null;
  content_access_rules:
    | Array<{
        entitlement_id: string;
      }>
    | null;
}

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
    coverImage: row.cover_image_url ?? undefined,
    tags: [],
    body: row.body_markdown
  };
}

async function loadSupabaseContent(): Promise<ContentSnapshot | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("content_items")
    .select(
      "id, slug, title, summary, type, visibility, body_markdown, cover_image_url, published_at, content_access_rules(entitlement_id)"
    )
    .order("published_at", { ascending: false, nullsFirst: false });

  if (error || !data) {
    return null;
  }

  return {
    items: data.map((row) => mapContentRow(row as unknown as ContentRow)),
    source: "supabase"
  };
}

export async function getContentSnapshot(): Promise<ContentSnapshot> {
  const liveSnapshot = await loadSupabaseContent();
  if (liveSnapshot && liveSnapshot.items.length > 0) {
    return liveSnapshot;
  }

  return {
    items: sampleLibrary,
    source: "demo"
  };
}

export async function getAllContent() {
  const snapshot = await getContentSnapshot();
  return snapshot.items;
}

export async function getContentBySlug(slug: string) {
  const snapshot = await getContentSnapshot();
  return {
    item: snapshot.items.find((item) => item.slug === slug) ?? null,
    source: snapshot.source
  };
}

export function getOfficeHours() {
  return officeHourSessions;
}
