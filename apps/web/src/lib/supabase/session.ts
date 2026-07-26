import type { User } from "@supabase/supabase-js";
import { cache } from "react";
import { getDefaultEntitlements } from "@soji/domain";
import type { EntitlementKey, UserProfile, UserRole } from "@soji/types";
import { isDemoModeEnabled } from "@/lib/env";
import { reportOperationalError } from "@/lib/observability";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isMissingAuthSession } from "@/lib/supabase/auth-errors";

export interface SessionSnapshot {
  user: UserProfile | null;
  entitlements: EntitlementKey[];
  source: "supabase" | "demo";
  error?: string;
}

const demoUser: UserProfile = {
  id: "demo-user",
  email: "member@soji.club",
  fullName: "Soji Demo Member",
  avatarUrl: null,
  tier: "free",
  roles: ["admin"],
  providers: ["email", "google"]
};

function mapProviders(user: User) {
  const providers = new Set<string>();
  const appMetadata = user.app_metadata;
  const identities = user.identities ?? [];

  if (typeof appMetadata?.provider === "string") {
    providers.add(appMetadata.provider);
  }

  identities.forEach((identity) => {
    if (typeof identity.provider === "string") {
      providers.add(identity.provider);
    }
  });

  return Array.from(providers) as UserProfile["providers"];
}

function restrictedUserProfile(user: User): UserProfile {
  return {
    avatarUrl:
      typeof user.user_metadata?.avatar_url === "string"
        ? user.user_metadata.avatar_url
        : null,
    email: user.email ?? "",
    fullName:
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : null,
    id: user.id,
    providers: mapProviders(user),
    roles: ["member"],
    tier: "free"
  };
}

async function loadSupabaseSession(): Promise<SessionSnapshot | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError && !isMissingAuthSession(authError)) {
    await reportOperationalError("session.auth_lookup_failed", authError);
    return {
      user: null,
      entitlements: [],
      source: "supabase",
      error: "session_auth_failed"
    };
  }

  if (!user) {
    return {
      user: null,
      entitlements: [],
      source: "supabase"
    };
  }

  const [profileQuery, rolesQuery, grantsQuery] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, avatar_url, tier")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase
      .from("user_entitlements")
      .select("entitlement_id, ends_at")
      .eq("user_id", user.id)
      .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
  ]);

  if (profileQuery.error || rolesQuery.error || grantsQuery.error) {
    await reportOperationalError(
      "session.data_query_failed",
      profileQuery.error ?? rolesQuery.error ?? grantsQuery.error,
      {
        entitlementsFailed: Boolean(grantsQuery.error),
        profileFailed: Boolean(profileQuery.error),
        rolesFailed: Boolean(rolesQuery.error),
        userId: user.id
      }
    );
    return {
      user: restrictedUserProfile(user),
      entitlements: [],
      source: "supabase",
      error: "session_query_failed"
    };
  }

  const tier = (profileQuery.data?.tier ?? "free") as UserProfile["tier"];
  const roleList =
    rolesQuery.data?.map((item) => item.role as UserRole).filter(Boolean) ?? ["member"];
  const directEntitlements =
    grantsQuery.data?.map((item) => item.entitlement_id as EntitlementKey).filter(Boolean) ??
    [];
  const effectiveEntitlements = Array.from(
    new Set([...getDefaultEntitlements(tier), ...directEntitlements])
  );

  return {
    user: {
      id: user.id,
      email: user.email ?? "",
      fullName: profileQuery.data?.full_name ?? user.user_metadata?.full_name ?? null,
      avatarUrl: profileQuery.data?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
      tier,
      roles: roleList.length > 0 ? roleList : ["member"],
      providers: mapProviders(user)
    },
    entitlements: effectiveEntitlements,
    source: "supabase"
  };
}

async function loadSessionSnapshot(): Promise<SessionSnapshot> {
  const liveSnapshot = await loadSupabaseSession();
  if (liveSnapshot) {
    return liveSnapshot;
  }

  if (isDemoModeEnabled()) {
    return {
      user: demoUser,
      entitlements: getDefaultEntitlements(demoUser.tier),
      source: "demo"
    };
  }

  return {
    entitlements: [],
    error: "authentication_service_not_configured",
    source: "supabase",
    user: null
  };
}

// A layout and its page share this result during one React server render.
export const getSessionSnapshot = cache(loadSessionSnapshot);

export async function getCurrentUser() {
  const snapshot = await getSessionSnapshot();
  return snapshot.user;
}

export async function getCurrentEntitlements() {
  const snapshot = await getSessionSnapshot();
  return snapshot.entitlements;
}
