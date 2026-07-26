import { NextResponse } from "next/server";
import { reportOperationalError } from "@/lib/observability";
import { isMissingAuthSession } from "@/lib/supabase/auth-errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { bootstrapUserProfile } from "@/lib/supabase/profile";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, reason: "supabase_not_configured" },
      { status: 501 }
    );
  }

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError && !isMissingAuthSession(authError)) {
    await reportOperationalError("auth.bootstrap_lookup_failed", authError);
    return NextResponse.json(
      { ok: false, reason: "authentication_unavailable" },
      { status: 503 }
    );
  }

  if (!user) {
    return NextResponse.json({ ok: false, reason: "not_authenticated" }, { status: 401 });
  }

  const result = await bootstrapUserProfile(supabase, user.id);

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
