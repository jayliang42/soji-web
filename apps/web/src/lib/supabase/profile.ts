import type { User } from "@supabase/supabase-js";
import type { UserRole } from "@soji/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function bootstrapUserProfile(user: User) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false as const, reason: "supabase_not_configured" };
  }

  const profilePayload = {
    id: user.id,
    email: user.email ?? "",
    full_name:
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : typeof user.user_metadata?.name === "string"
          ? user.user_metadata.name
          : null,
    avatar_url:
      typeof user.user_metadata?.avatar_url === "string"
        ? user.user_metadata.avatar_url
        : null
  };

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(profilePayload, { onConflict: "id" });

  if (profileError) {
    return { ok: false as const, reason: profileError.message };
  }

  const rolePayload: { user_id: string; role: UserRole } = {
    user_id: user.id,
    role: "member"
  };

  const { error: roleError } = await supabase
    .from("user_roles")
    .upsert(rolePayload, { onConflict: "user_id,role" });

  if (roleError) {
    return { ok: false as const, reason: roleError.message };
  }

  return { ok: true as const };
}
