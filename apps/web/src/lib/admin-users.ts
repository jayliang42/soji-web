import { z } from "zod";
import type {
  ManagedUser,
  ManagedUserSnapshot
} from "@soji/types";
import type { AppSupabaseClient } from "@/lib/supabase/client-types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const MANAGED_USERS_PAGE_SIZE = 25;

const managedUserRowSchema = z.object({
  access_role: z.enum(["member", "editor", "admin"]),
  created_at: z.string(),
  email: z.string(),
  full_name: z.string().nullable(),
  id: z.string().uuid(),
  roles: z.array(z.enum(["member", "editor", "admin"])),
  tier: z.enum(["free", "tier_1"])
});

const managedUsersRpcResultSchema = z.object({
  items: z.array(managedUserRowSchema),
  total_items: z.number().int().nonnegative()
});

type ManagedUserRow = z.infer<typeof managedUserRowSchema>;

function emptySnapshot({
  error,
  page,
  pageSize,
  query,
  source
}: {
  error?: string;
  page: number;
  pageSize: number;
  query: string;
  source: ManagedUserSnapshot["source"];
}): ManagedUserSnapshot {
  return {
    error,
    items: [],
    page,
    pageSize,
    query,
    source,
    totalItems: 0,
    totalPages: 0
  };
}

function mapManagedUser(row: ManagedUserRow): ManagedUser {
  return {
    accessRole: row.access_role,
    createdAt: row.created_at,
    email: row.email,
    fullName: row.full_name,
    id: row.id,
    roles: row.roles,
    tier: row.tier
  };
}

export async function getManagedUserSnapshot({
  page = 1,
  pageSize = MANAGED_USERS_PAGE_SIZE,
  query = "",
  supabase: suppliedClient
}: {
  page?: number;
  pageSize?: number;
  query?: string;
  supabase?: AppSupabaseClient;
} = {}): Promise<ManagedUserSnapshot> {
  const normalizedPage = Math.max(1, Math.trunc(page));
  const normalizedPageSize = Math.min(50, Math.max(1, Math.trunc(pageSize)));
  const normalizedQuery = query.trim().slice(0, 100);
  const supabase = suppliedClient ?? (await createSupabaseServerClient());

  if (!supabase) {
    return emptySnapshot({
      page: normalizedPage,
      pageSize: normalizedPageSize,
      query: normalizedQuery,
      source: "demo"
    });
  }

  const { data, error } = await supabase.rpc("list_managed_users", {
    p_limit: normalizedPageSize,
    p_offset: (normalizedPage - 1) * normalizedPageSize,
    p_query: normalizedQuery || undefined
  });

  if (error || !data) {
    return emptySnapshot({
      error: error?.message ?? "managed_users_query_failed",
      page: normalizedPage,
      pageSize: normalizedPageSize,
      query: normalizedQuery,
      source: "supabase"
    });
  }

  const parsedResult = managedUsersRpcResultSchema.safeParse(data);
  if (!parsedResult.success) {
    return emptySnapshot({
      error: "managed_users_response_invalid",
      page: normalizedPage,
      pageSize: normalizedPageSize,
      query: normalizedQuery,
      source: "supabase"
    });
  }
  const result = parsedResult.data;

  return {
    items: result.items.map(mapManagedUser),
    page: normalizedPage,
    pageSize: normalizedPageSize,
    query: normalizedQuery,
    source: "supabase",
    totalItems: result.total_items,
    totalPages: Math.ceil(result.total_items / normalizedPageSize)
  };
}
