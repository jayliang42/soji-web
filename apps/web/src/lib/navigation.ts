export function getSafeNextPath(value: string | null | undefined) {
  if (!value || typeof value !== "string") {
    return "/account";
  }

  if (!value.startsWith("/")) {
    return "/account";
  }

  try {
    const baseUrl = new URL("https://soji.local");
    const parsedUrl = new URL(value, baseUrl);
    if (parsedUrl.origin !== baseUrl.origin) {
      return "/account";
    }

    return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
  } catch {
    return "/account";
  }
}

export function isNavigationSectionActive(
  pathname: string,
  href: string,
  currentSearch = ""
) {
  const destination = new URL(href, "https://soji.local");
  const destinationPathname = destination.pathname;

  if (destinationPathname === "/") {
    return pathname === destinationPathname;
  }

  const pathMatches =
    pathname === destinationPathname ||
    pathname.startsWith(`${destinationPathname}/`);
  if (!pathMatches) {
    return false;
  }

  if (destinationPathname === "/account") {
    const destinationView = destination.searchParams.get("view");
    const currentView = new URLSearchParams(currentSearch).get("view");
    if (destinationView || currentView) {
      return destinationView === currentView;
    }
  }

  return true;
}
