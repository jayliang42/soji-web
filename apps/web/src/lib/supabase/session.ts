import type { User } from "@supabase/supabase-js";
import { getDefaultEntitlements } from "@soji/domain";
import type { EntitlementKey, UserProfile, UserRole } from "@soji/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  tier: "tier_2",
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

async function loadSupabaseSession(): Promise<SessionSnapshot | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

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
    return {
      user: null,
      entitlements: [],
      source: "supabase",
      error:
        profileQuery.error?.message ??
        rolesQuery.error?.message ??
        grantsQuery.error?.message ??
        "session_query_failed"
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

export async function getSessionSnapshot(): Promise<SessionSnapshot> {
  const liveSnapshot = await loadSupabaseSession();
  if (liveSnapshot) {
    return liveSnapshot;
  }

  return {
    user: demoUser,
    entitlements: getDefaultEntitlements(demoUser.tier),
    source: "demo"
  };
}

export async function getCurrentUser() {
  const snapshot = await getSessionSnapshot();
  return snapshot.user;
}

export async function getCurrentEntitlements() {
  const snapshot = await getSessionSnapshot();
  return snapshot.entitlements;
}
