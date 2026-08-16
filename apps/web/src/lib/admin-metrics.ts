import { activeSubscriptionStatuses } from "@soji/domain";
import type { AdminMetric } from "@soji/types";
import type { Tables } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SubscriptionRow = Pick<Tables<"subscriptions">, "plan_id" | "status">;

export type AdminMetricsSnapshot = {
  error?: string;
  metrics: AdminMetric[];
  source: "supabase" | "unavailable";
};

export async function getAdminMetricsSnapshot(): Promise<AdminMetricsSnapshot> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { metrics: [], source: "unavailable" };
  }

  const [membersQuery, productsQuery, subscriptionsQuery] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("subscriptions")
      .select("plan_id, status")
      .in("status", [...activeSubscriptionStatuses])
  ]);

  const error =
    membersQuery.error ?? productsQuery.error ?? subscriptionsQuery.error;
  if (error) {
    return { error: error.message, metrics: [], source: "supabase" };
  }

  const subscriptions: SubscriptionRow[] = subscriptionsQuery.data ?? [];

  return {
    metrics: [
      {
        detail: "Active and trialing records from the retired recurring plan",
        label: "Legacy subscriptions",
        value: String(subscriptions.length)
      },
      {
        detail: "Profiles currently registered in Supabase",
        label: "Members",
        value: String(membersQuery.count ?? 0)
      },
      {
        detail: "Standalone products currently available for purchase",
        label: "Active products",
        value: String(productsQuery.count ?? 0)
      }
    ],
    source: "supabase"
  };
}
