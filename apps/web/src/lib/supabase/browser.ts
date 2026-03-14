"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env, hasSupabaseConfig } from "@/lib/env";

let browserClient:
  | ReturnType<typeof createBrowserClient>
  | null = null;

export function createSupabaseBrowserClient() {
  if (!hasSupabaseConfig()) {
    return null;
  }

  if (!browserClient) {
    browserClient = createBrowserClient(
      env.NEXT_PUBLIC_SUPABASE_URL!,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  return browserClient;
}
