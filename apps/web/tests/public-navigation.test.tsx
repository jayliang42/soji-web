import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/account",
  useSearchParams: () => new URLSearchParams()
}));

import { PublicNavigation } from "@/components/public-navigation";

describe("primary navigation", () => {
  it("keeps public pricing available to guests", () => {
    const html = renderToStaticMarkup(<PublicNavigation />);

    expect(html).toContain('aria-controls="primary-navigation"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain(">Menu<");
    expect(html).toContain('href="/pricing"');
    expect(html).toContain(">Pricing<");
    expect(html).toContain('href="/login"');
    expect(html).toContain(">Sign in<");
    expect(html).not.toContain(">Account<");
    expect(html).not.toContain(">Subscriptions<");
    expect(html).toContain("Explore Soji");
    expect(html).toContain("Unlock the complete membership");
    expect(html).toContain("Access your benefits and purchases");
  });

  it("gives every mobile destination a full-height target and list semantics", () => {
    const html = renderToStaticMarkup(<PublicNavigation />);

    expect(html.match(/min-h-\[4\.5rem\]/gu)).toHaveLength(5);
    expect(html).toContain("<ul");
    expect(html.match(/<li/gu)).toHaveLength(5);
    expect(html).toContain("hidden md:block");
  });

  it("moves membership choices under subscriptions for signed-in users", () => {
    const html = renderToStaticMarkup(<PublicNavigation signedIn />);

    expect(html).toContain('href="/account?view=subscriptions"');
    expect(html).toContain(">Subscriptions<");
    expect(html).toContain(">Account<");
    expect(html).not.toContain(">Sign in<");
    expect(html).not.toContain(">Pricing<");
    expect(html).toContain("Review plans and billing");
    expect(html).toContain("See benefits, purchases, and profile");
  });
});
