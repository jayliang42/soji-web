import { NextRequest, NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/env";
import { getSafeNextPath } from "@/lib/navigation";
import { reportOperationalError } from "@/lib/observability";
import { bootstrapUserProfile } from "@/lib/supabase/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getLoginErrorUrl(
  origin: string,
  nextPath: string,
  recoveryFlow: boolean
) {
  const url = new URL("/login", origin);
  url.searchParams.set(
    "error",
    recoveryFlow ? "password_reset_callback_failed" : "oauth_callback_failed"
  );
  url.searchParams.set("next", nextPath);
  return url;
}

function getSetupErrorUrl(origin: string, nextPath: string) {
  const url = new URL("/account", origin);
  url.searchParams.set("setup", "failed");
  url.searchParams.set("next", nextPath);
  return url;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirectTo = getSafeNextPath(requestUrl.searchParams.get("next"));
  const recoveryFlow = requestUrl.searchParams.get("flow") === "recovery";
  const siteUrl = getSiteUrl();

  if (!siteUrl) {
    await reportOperationalError(
      "auth.oauth_callback_site_url_invalid",
      new Error("Canonical site URL is not configured")
    );
    return NextResponse.json(
      { ok: false, reason: "site_url_not_configured" },
      { status: 503 }
    );
  }

  const redirectUrl = new URL(redirectTo, siteUrl);

  const supabase = await createSupabaseServerClient();
  if (!supabase || !code) {
    return NextResponse.redirect(
      getLoginErrorUrl(siteUrl, redirectTo, recoveryFlow)
    );
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    await reportOperationalError("auth.oauth_code_exchange_failed", exchangeError);
    return NextResponse.redirect(
      getLoginErrorUrl(siteUrl, redirectTo, recoveryFlow)
    );
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    await reportOperationalError(
      "auth.oauth_user_lookup_failed",
      userError ?? new Error("OAuth session has no user")
    );
    return NextResponse.redirect(
      getLoginErrorUrl(siteUrl, redirectTo, recoveryFlow)
    );
  }

  const bootstrapResult = await bootstrapUserProfile(supabase, user.id);
  if (!bootstrapResult.ok) {
    return NextResponse.redirect(getSetupErrorUrl(siteUrl, redirectTo));
  }

  return NextResponse.redirect(redirectUrl);
}
