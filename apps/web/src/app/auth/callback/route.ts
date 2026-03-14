import { NextRequest, NextResponse } from "next/server";
import { getSafeNextPath } from "@/lib/navigation";
import { bootstrapUserProfile } from "@/lib/supabase/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirectTo = getSafeNextPath(requestUrl.searchParams.get("next"));
  const redirectUrl = new URL(redirectTo, requestUrl.origin);

  const supabase = await createSupabaseServerClient();
  if (!supabase || !code) {
    return NextResponse.redirect(redirectUrl);
  }

  await supabase.auth.exchangeCodeForSession(code);
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    await bootstrapUserProfile(user);
  }

  return NextResponse.redirect(redirectUrl);
}
