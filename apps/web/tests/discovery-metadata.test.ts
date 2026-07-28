import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("public discovery metadata", () => {
  it("publishes only intended public routes for a valid site origin", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://soji.example");

    const [{ default: robots }, { default: sitemap }] = await Promise.all([
      import("@/app/robots"),
      import("@/app/sitemap")
    ]);

    expect(robots()).toMatchObject({
      rules: {
        allow: "/",
        disallow: ["/account", "/admin", "/api", "/auth", "/login"]
      },
      sitemap: "https://soji.example/sitemap.xml"
    });

    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toContain("https://soji.example/library");
    expect(urls).toEqual(
      expect.arrayContaining([
        "https://soji.example/support",
        "https://soji.example/privacy",
        "https://soji.example/terms",
        "https://soji.example/refund-policy",
        "https://soji.example/financial-disclaimer"
      ])
    );
    expect(urls).not.toContain("https://soji.example/account");
    expect(urls).not.toContain("https://soji.example/admin");
  });

  it("fails closed when the production site origin is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

    const [{ default: robots }, { default: sitemap }] = await Promise.all([
      import("@/app/robots"),
      import("@/app/sitemap")
    ]);

    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
    expect(sitemap()).toEqual([]);
  });

  it("fails closed for a non-HTTPS production origin", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://soji.example");

    const [{ default: robots }, { default: sitemap }] = await Promise.all([
      import("@/app/robots"),
      import("@/app/sitemap")
    ]);

    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
    expect(sitemap()).toEqual([]);
  });
});
