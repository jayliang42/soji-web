import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirectTo = requestUrl.searchParams.get("next") ?? "/account";
  const redirectUrl = new URL(redirectTo, requestUrl.origin);

  const supabase = await createSupabaseServerClient();
  if (!supabase || !code) {
    return NextResponse.redirect(redirectUrl);
  }

  await supabase.auth.exchangeCodeForSession(code);

  return NextResponse.redirect(redirectUrl);
}
