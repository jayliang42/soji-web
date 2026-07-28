import { afterEach, describe, expect, it, vi } from "vitest";

const discoveryMocks = vi.hoisted(() => ({
  getContentBySlug: vi.fn()
}));

vi.mock("@/lib/content", () => ({
  getContentBySlug: discoveryMocks.getContentBySlug
}));

afterEach(() => {
  discoveryMocks.getContentBySlug.mockReset();
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

  it("builds article metadata only from public title, summary, and cover fields", async () => {
    discoveryMocks.getContentBySlug.mockResolvedValue({
      item: {
        body: "PRIVATE PHASE3 BODY",
        coverImage: "/covers/wealth-without-drift.webp",
        coverImageAlt:
          "Paper decision map, pencil, linen ledger, and ceramic dish in warm window light.",
        id: "flagship-content",
        preview: "A useful public preview.",
        publishedAt: "2026-07-28T00:00:00.000Z",
        requiredEntitlements: ["content.basic"],
        slug: "wealth-without-drift",
        summary: "A focused 90-minute decision reset.",
        tags: ["decision-making"],
        title: "Wealth Without Drift",
        type: "article",
        visibility: "members_only"
      },
      source: "supabase"
    });

    const { generateMetadata } = await import("@/app/library/[slug]/page");
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "wealth-without-drift" })
    });
    const serialized = JSON.stringify(metadata);

    expect(metadata).toMatchObject({
      alternates: { canonical: "/library/wealth-without-drift" },
      description: "A focused 90-minute decision reset.",
      openGraph: {
        description: "A focused 90-minute decision reset.",
        images: [
          {
            alt:
              "Paper decision map, pencil, linen ledger, and ceramic dish in warm window light.",
            url: "/covers/wealth-without-drift.webp"
          }
        ],
        title: "Wealth Without Drift"
      },
      title: "Wealth Without Drift"
    });
    expect(serialized).not.toContain("PRIVATE PHASE3 BODY");
    expect(serialized).not.toContain("content.basic");
  });
});
