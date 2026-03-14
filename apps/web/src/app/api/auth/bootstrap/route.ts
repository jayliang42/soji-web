import { NextResponse } from "next/server";
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
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, reason: "not_authenticated" }, { status: 401 });
  }

  const result = await bootstrapUserProfile(user);

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
