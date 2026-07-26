import { cookies } from "next/headers";
import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { env, hasSupabaseConfig } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";
import { fetchSupabase } from "@/lib/supabase/fetch";

type SupabaseCookie = Parameters<SetAllCookies>[0][number];

interface ServerCookieWriter {
  set(
    name: string,
    value: string,
    options: SupabaseCookie["options"]
  ): unknown;
}

export function persistSupabaseCookies(
  cookieStore: ServerCookieWriter,
  items: Parameters<SetAllCookies>[0]
) {
  try {
    items.forEach(({ name, value, options }) =>
      cookieStore.set(name, value, options)
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Cookies can only be modified")
    ) {
      return;
    }

    throw error;
  }
}

export async function createSupabaseServerClient() {
  if (!hasSupabaseConfig()) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: fetchSupabase
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(items: Parameters<SetAllCookies>[0]) {
          persistSupabaseCookies(cookieStore, items);
        }
      }
    }
  );
}
