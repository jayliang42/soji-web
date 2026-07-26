import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, hasSupabaseAdminConfig } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";
import { fetchSupabase } from "@/lib/supabase/fetch";

let adminClient: SupabaseClient<Database> | null = null;

export function createSupabaseAdminClient() {
  if (!hasSupabaseAdminConfig()) {
    return null;
  }

  if (!adminClient) {
    adminClient = createClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL!,
      env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          fetch: fetchSupabase
        }
      }
    );
  }

  return adminClient;
}
