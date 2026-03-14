import type { User } from "@supabase/supabase-js";
import type { UserRole } from "@soji/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function bootstrapUserProfile(user: User) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false as const, reason: "supabase_not_configured" };
  }

  const normalizedFullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : null;
  const normalizedAvatarUrl =
    typeof user.user_metadata?.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : null;

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfileError) {
    return { ok: false as const, reason: existingProfileError.message };
  }

  const profilePayload = existingProfile
    ? {
        id: user.id,
        email: user.email ?? existingProfile.email,
        full_name: existingProfile.full_name ?? normalizedFullName,
        avatar_url: existingProfile.avatar_url ?? normalizedAvatarUrl
      }
    : {
        id: user.id,
        email: user.email ?? "",
        full_name: normalizedFullName,
        avatar_url: normalizedAvatarUrl
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
