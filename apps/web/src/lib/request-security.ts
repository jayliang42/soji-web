const protectedMutationPrefixes = ["/api/admin/", "/api/checkout/"] as const;
const protectedMutationPaths = new Set(["/api/auth/bootstrap"]);
const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

export function isProtectedBrowserMutation(pathname: string, method: string) {
  if (safeMethods.has(method.toUpperCase())) {
    return false;
  }

  return (
    protectedMutationPaths.has(pathname) ||
    protectedMutationPrefixes.some((prefix) => pathname.startsWith(prefix))
  );
}

export function isTrustedBrowserMutation(
  request: Pick<Request, "headers" | "method" | "url">,
  configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL
) {
  const requestUrl = new URL(request.url);
  if (!isProtectedBrowserMutation(requestUrl.pathname, request.method)) {
    return true;
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return false;
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    return true;
  }

  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    return false;
  }

  const allowedOrigins = new Set([requestUrl.origin]);
  if (configuredSiteUrl) {
    try {
      allowedOrigins.add(new URL(configuredSiteUrl).origin);
    } catch {
      // An invalid configured URL must not broaden the trust boundary.
    }
  }

  return allowedOrigins.has(originUrl.origin);
}
