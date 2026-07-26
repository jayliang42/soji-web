import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import {
  isProtectedBrowserMutation,
  isTrustedBrowserMutation
} from "@/lib/request-security";
import { getSafeNextPath } from "@/lib/navigation";
import { reportOperationalError } from "@/lib/observability";
import { isMissingAuthSession } from "@/lib/supabase/auth-errors";
import type { Database } from "@/lib/supabase/database.types";

const protectedRoutes = ["/account", "/admin"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { pathname, search } = request.nextUrl;

  if (isProtectedBrowserMutation(pathname, request.method)) {
    if (!isTrustedBrowserMutation(request)) {
      return NextResponse.json(
        { ok: false, reason: "cross_site_request_forbidden" },
        { status: 403 }
      );
    }
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      }
    }
  });

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (authError && !isMissingAuthSession(authError) && isProtectedRoute) {
    await reportOperationalError("middleware.auth_lookup_failed", authError, {
      pathname
    });
    return new NextResponse("Authentication is temporarily unavailable.", {
      status: 503
    });
  }

  if (!user && isProtectedRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/login") {
    const accountUrl = request.nextUrl.clone();
    const nextPath = getSafeNextPath(request.nextUrl.searchParams.get("next"));
    const destination = new URL(nextPath, request.nextUrl.origin);
    accountUrl.pathname = destination.pathname;
    accountUrl.search = destination.search;
    accountUrl.hash = destination.hash;
    return NextResponse.redirect(accountUrl);
  }

  return response;
}

export const config = {
  runtime: "nodejs",
  matcher: [
    "/account",
    "/admin",
    "/login",
    "/auth/callback",
    "/api/admin/:path*",
    "/api/auth/bootstrap",
    "/api/checkout/:path*"
  ]
};
