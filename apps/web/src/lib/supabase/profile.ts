import { reportOperationalError } from "@/lib/observability";
import type { AppSupabaseClient } from "@/lib/supabase/client-types";

export async function bootstrapUserProfile(
  supabase: AppSupabaseClient,
  userId: string
) {
  const { error } = await supabase.rpc("bootstrap_user_profile");

  if (error) {
    await reportOperationalError("auth.profile_bootstrap_failed", error, {
      userId
    });
    return { ok: false as const, reason: "profile_bootstrap_failed" };
  }

  return { ok: true as const };
}
