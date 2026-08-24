import { getPlanByTier } from "@soji/domain";
import type { BillingProvider, MembershipTier } from "@soji/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import { isPurchaseDownloadAllowed } from "@/lib/purchase-status";

export interface AccountPurchase {
  createdAt: string;
  downloadReady: boolean;
  disputeStatus: string | null;
  id: string;
  productId: string;
  productSlug: string | null;
  productTitle: string;
  status: string;
}

export interface AccountPurchaseSnapshot {
  error?: string;
  items: AccountPurchase[];
}

export interface AccountMembershipPurchase {
  createdAt: string;
  disputeStatus: string | null;
  id: string;
  planId: MembershipTier;
  planName: string;
  provider: BillingProvider;
  status: string;
}

export interface AccountMembershipPurchaseSnapshot {
  error?: string;
  items: AccountMembershipPurchase[];
}

type ProductRow = Pick<Tables<"products">, "slug" | "title"> & {
  product_assets: Pick<Tables<"product_assets">, "id"> | null;
};

type PurchaseRow = Pick<
  Tables<"purchases">,
  "created_at" | "dispute_status" | "id" | "product_id" | "status"
> & {
  products: ProductRow | null;
};

type MembershipPurchaseRow = Pick<
  Tables<"membership_purchases">,
  | "created_at"
  | "dispute_status"
  | "id"
  | "plan_id"
  | "provider"
  | "status"
>;

function getProduct(row: PurchaseRow) {
  return row.products;
}

function hasDeliveryAsset(product: ProductRow | null) {
  if (!product) {
    return false;
  }
  return Boolean(product.product_assets);
}

export async function getAccountPurchases(
  userId: string | undefined,
  source: "demo" | "supabase"
): Promise<AccountPurchaseSnapshot> {
  if (!userId || source === "demo") {
    return { items: [] };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: "purchase_service_not_configured", items: [] };
  }

  const { data, error } = await supabase
    .from("purchases")
    .select(
      "id, product_id, status, dispute_status, created_at, products(slug, title, product_assets(id))"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return {
      error: error?.message ?? "purchase_query_failed",
      items: []
    };
  }

  return {
    items: data.map((row: PurchaseRow) => {
      const product = getProduct(row);
      return {
        createdAt: row.created_at,
        downloadReady:
          isPurchaseDownloadAllowed(row.status, row.dispute_status) &&
          hasDeliveryAsset(product),
        disputeStatus: row.dispute_status,
        id: row.id,
        productId: row.product_id,
        productSlug: product?.slug ?? null,
        productTitle: product?.title ?? "单独购买的产品",
        status: row.status
      };
    })
  };
}

export async function getAccountMembershipPurchases(
  userId: string | undefined,
  source: "demo" | "supabase"
): Promise<AccountMembershipPurchaseSnapshot> {
  if (!userId || source === "demo") {
    return { items: [] };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: "membership_purchase_service_not_configured", items: [] };
  }

  const { data, error } = await supabase
    .from("membership_purchases")
    .select("id, plan_id, provider, status, dispute_status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return {
      error: error?.message ?? "membership_purchase_query_failed",
      items: []
    };
  }

  return {
    items: data.map((row: MembershipPurchaseRow) => ({
      createdAt: row.created_at,
      disputeStatus: row.dispute_status,
      id: row.id,
      planId: row.plan_id,
      planName: getPlanByTier(row.plan_id)?.name ?? row.plan_id,
      provider: row.provider,
      status: row.status
    }))
  };
}
