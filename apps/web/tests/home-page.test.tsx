import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const homeMocks = vi.hoisted(() => ({
  getContentSnapshot: vi.fn()
}));

vi.mock("@/lib/content", () => ({
  getContentSnapshot: homeMocks.getContentSnapshot
}));

import HomePage from "@/app/page";

describe("home page decision paths", () => {
  beforeEach(() => {
    homeMocks.getContentSnapshot.mockReset();
    homeMocks.getContentSnapshot.mockResolvedValue({
      items: [
        {
          slug: "current-guide",
          summary: "A current published guide.",
          title: "A Current Guide",
          type: "article"
        }
      ],
      source: "supabase"
    });
  });

  it("offers public previews plus $5 and $99 purchase paths", async () => {
    const html = renderToStaticMarkup(await HomePage());

    for (const [label, href] of [
      ["Read a preview", "/library"],
      ["Explore membership", "/pricing"],
      ["查看解锁方式", "/pricing#case-study-offers"],
      ["先看案例目录", "/library"]
    ]) {
      expect(html).toContain(`href="${href}"`);
      expect(html).toContain(label);
    }
    expect(html).toContain("$99");
    expect(html).toContain("一次性");
    expect(html).toContain("$5");
    expect(html).not.toContain("monthly");
    expect(html).not.toContain("Create account to join");
  });

  it("shows the single-case and Full Access offers without embedding checkout forms", async () => {
    const html = renderToStaticMarkup(await HomePage());

    expect(html).toContain("55篇真实录取案例，按你的需要解锁");
    expect(html).toContain("单篇真实录取案例");
    expect(html).toContain("55篇真实录取案例合集");
    expect(html).toContain('href="/pricing#case-study-offers"');
    expect(html).not.toContain('href="/products/case-study-single"');
    expect(html).not.toContain('href="/products/case-study-collection"');
    expect(html).not.toContain("Digital product purchase terms");
    expect(html).not.toContain("Membership purchase terms");
  });

  it("keeps personalized Continue reading out of server HTML", async () => {
    const html = renderToStaticMarkup(await HomePage());

    expect(homeMocks.getContentSnapshot).toHaveBeenCalledOnce();
    expect(html).not.toContain("Continue reading");
    expect(html).not.toContain("Resume guide");
  });
});
