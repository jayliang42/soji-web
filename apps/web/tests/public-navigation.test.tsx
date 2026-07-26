import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/account"
}));

import { PublicNavigation } from "@/components/public-navigation";

describe("primary navigation", () => {
  it("keeps public pricing available to guests", () => {
    const html = renderToStaticMarkup(<PublicNavigation />);

    expect(html).toContain('href="/pricing"');
    expect(html).toContain(">Pricing<");
    expect(html).not.toContain(">Subscriptions<");
  });

  it("moves membership choices under subscriptions for signed-in users", () => {
    const html = renderToStaticMarkup(<PublicNavigation signedIn />);

    expect(html).toContain('href="/account?view=subscriptions"');
    expect(html).toContain(">Subscriptions<");
    expect(html).not.toContain(">Pricing<");
  });
});
