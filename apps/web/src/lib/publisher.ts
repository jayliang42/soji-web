import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { reportOperationalError } from "@/lib/observability";
import { isMissingAuthSession } from "@/lib/supabase/auth-errors";
import type { AppSupabaseClient } from "@/lib/supabase/client-types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasAdminAccess, hasPublisherAccess } from "@/lib/roles";

type PublisherContext = {
  roles: RoleName[];
  supabase: AppSupabaseClient;
  user: User;
};

type RoleName = "admin" | "editor" | "member";

async function getRoleNames(supabase: AppSupabaseClient, userId: string) {
  const { data: roles, error: rolesError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (rolesError) {
    throw new Error(rolesError.message);
  }

  return (roles ?? []).map((entry) => entry.role as RoleName);
}

export async function getPublisherContext(): Promise<
  PublisherContext | { error: NextResponse }
> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      error: NextResponse.json(
        { ok: false, reason: "supabase_not_configured" },
        { status: 501 }
      )
    };
  }

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError && !isMissingAuthSession(authError)) {
    await reportOperationalError("publisher.auth_lookup_failed", authError);
    return {
      error: NextResponse.json(
        { ok: false, reason: "authentication_unavailable" },
        { status: 503 }
      )
    };
  }

  if (!user) {
    return {
      error: NextResponse.json(
        { ok: false, reason: "not_authenticated" },
        { status: 401 }
      )
    };
  }

  let roles: RoleName[];
  try {
    roles = await getRoleNames(supabase, user.id);
  } catch (error) {
    await reportOperationalError("publisher.roles_query_failed", error, {
      userId: user.id
    });
    return {
      error: NextResponse.json(
        { ok: false, reason: "roles_query_failed" },
        { status: 500 }
      )
    };
  }

  if (!hasPublisherAccess(roles)) {
    return {
      error: NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 })
    };
  }

  return { roles, supabase, user };
}

export async function getAdminContext(): Promise<
  PublisherContext | { error: NextResponse }
> {
  const context = await getPublisherContext();
  if ("error" in context) {
    return context;
  }

  if (!hasAdminAccess(context.roles)) {
    return {
      error: NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 })
    };
  }

  return context;
}
