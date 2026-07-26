import { productOffers } from "@soji/domain";
import type { EntitlementKey, ProductOffer, ProductSnapshot } from "@soji/types";
import {
  resolveDataSnapshot,
  type LiveDataSnapshot
} from "@/lib/data-source";
import { isDemoModeEnabled } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProductRow = Pick<
  Tables<"products">,
  | "bullets"
  | "entitlement_id"
  | "id"
  | "is_active"
  | "price_cents"
  | "price_label"
  | "revision"
  | "slug"
  | "stripe_price_id"
  | "summary"
  | "title"
  | "updated_at"
> & {
  product_assets?:
    | Pick<Tables<"product_assets">, "original_filename" | "revision" | "size_bytes">
    | Array<Pick<Tables<"product_assets">, "original_filename" | "revision" | "size_bytes">>
    | null;
};

function getDeliveryAsset(row: ProductRow) {
  const asset = Array.isArray(row.product_assets)
    ? row.product_assets[0] ?? null
    : row.product_assets ?? null;

  return asset
    ? {
        fileName: asset.original_filename,
        revision: asset.revision,
        sizeBytes: asset.size_bytes
      }
    : undefined;
}

function mapProductRow(row: ProductRow): ProductOffer {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    price: row.price_cents / 100,
    priceLabel: row.price_label ?? `$${Math.round(row.price_cents / 100)}`,
    entitlement: (row.entitlement_id ?? "product.digital") as EntitlementKey,
    stripePriceId: row.stripe_price_id ?? undefined,
    isActive: row.is_active,
    revision: row.revision,
    updatedAt: row.updated_at,
    bullets: row.bullets ?? [],
    deliveryAsset: getDeliveryAsset(row)
  };
}

async function loadSupabaseProducts({
  includeInactive = false
}: {
  includeInactive?: boolean;
} = {}): Promise<LiveDataSnapshot<ProductOffer> | null> {
  const supabase = createSupabaseAdminClient() ?? (await createSupabaseServerClient());
  if (!supabase) {
    return null;
  }

  const { data, error } = includeInactive
    ? await supabase
        .from("products")
        .select(
          "id, slug, title, summary, price_cents, price_label, bullets, stripe_price_id, entitlement_id, is_active, revision, updated_at, product_assets(original_filename, revision, size_bytes)"
        )
        .order("created_at", { ascending: false })
    : await supabase
        .from("products")
        .select(
          "id, slug, title, summary, price_cents, price_label, bullets, stripe_price_id, entitlement_id, is_active, revision, updated_at"
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false });

  if (error || !data) {
    return {
      items: [],
      source: "supabase",
      error: error?.message ?? "products_query_failed"
    };
  }

  return {
    items: data.map(mapProductRow),
    source: "supabase"
  };
}

export async function getProductSnapshot({
  includeInactive = false
}: {
  includeInactive?: boolean;
} = {}): Promise<ProductSnapshot> {
  const liveSnapshot = await loadSupabaseProducts({ includeInactive });
  return resolveDataSnapshot({
    demoEnabled: isDemoModeEnabled(),
    demoItems: productOffers,
    liveSnapshot,
    missingConfigurationError: "product_service_not_configured"
  });
}
