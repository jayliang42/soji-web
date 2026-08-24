import { describe, expect, it } from "vitest";
import {
  isProtectedBrowserMutation,
  isTrustedBrowserMutation
} from "@/lib/request-security";

function request(
  path: string,
  { fetchSite, method = "POST", origin }: {
    fetchSite?: string;
    method?: string;
    origin?: string;
  } = {}
) {
  const headers = new Headers();
  if (fetchSite) headers.set("Sec-Fetch-Site", fetchSite);
  if (origin) headers.set("Origin", origin);
  return new Request(`https://soji.example${path}`, { headers, method });
}

describe("browser mutation trust boundary", () => {
  it("protects session-backed mutations but excludes reads and provider webhooks", () => {
    expect(isProtectedBrowserMutation("/api/admin/content", "POST")).toBe(true);
    expect(isProtectedBrowserMutation("/api/checkout/product", "POST")).toBe(true);
    expect(
      isProtectedBrowserMutation("/api/checkout/test-access", "POST")
    ).toBe(true);
    expect(
      isProtectedBrowserMutation("/api/account/purchases/claim", "POST")
    ).toBe(true);
    expect(isProtectedBrowserMutation("/api/auth/bootstrap", "POST")).toBe(true);
    expect(isProtectedBrowserMutation("/api/admin/billing-events", "GET")).toBe(false);
    expect(isProtectedBrowserMutation("/api/webhooks/stripe", "POST")).toBe(false);
  });

  it("accepts exact same-origin browser requests", () => {
    expect(
      isTrustedBrowserMutation(
        request("/api/checkout/subscription", {
          fetchSite: "same-origin",
          origin: "https://soji.example"
        })
      )
    ).toBe(true);
  });

  it("rejects cross-site and sibling-subdomain mutations", () => {
    expect(
      isTrustedBrowserMutation(
        request("/api/admin/content", {
          fetchSite: "cross-site",
          origin: "https://attacker.example"
        })
      )
    ).toBe(false);
    expect(
      isTrustedBrowserMutation(
        request("/api/admin/content", {
          fetchSite: "same-site",
          origin: "https://untrusted.soji.example"
        })
      )
    ).toBe(false);
  });

  it("allows non-browser server calls without Origin or Fetch Metadata", () => {
    expect(isTrustedBrowserMutation(request("/api/admin/content"))).toBe(true);
  });
});
