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

export function isNavigationSectionActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
