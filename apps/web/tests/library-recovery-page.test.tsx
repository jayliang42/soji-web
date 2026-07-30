import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pageMocks = vi.hoisted(() => ({
  getContentSnapshot: vi.fn(),
  getSessionSnapshot: vi.fn()
}));

vi.mock("@/lib/content", () => ({
  getContentSnapshot: pageMocks.getContentSnapshot
}));
vi.mock("@/lib/session", () => ({
  getSessionSnapshot: pageMocks.getSessionSnapshot
}));

import LibraryPage from "@/app/library/page";

describe("library collection recovery", () => {
  beforeEach(() => {
    for (const mock of Object.values(pageMocks)) mock.mockReset();
    pageMocks.getContentSnapshot.mockResolvedValue({
      error: "content_query_failed",
      items: [],
      source: "supabase"
    });
    pageMocks.getSessionSnapshot.mockResolvedValue({
      entitlements: [],
      error: "session_query_failed",
      source: "supabase",
      user: null
    });
  });

  it("shows one rich catalog recovery path when both catalog and access checks fail", async () => {
    const html = renderToStaticMarkup(await LibraryPage({}));

    expect(html).toContain("Connection paused");
    expect(html).toContain("The library could not be loaded");
    expect(html).toContain("Try loading again");
    expect(html).toContain(">Browse practical tools</a>");
    expect(html).toContain(
      "Your membership and saved access stay unchanged while the library reconnects."
    );
    expect(html.match(/role="alert"/gu)).toHaveLength(1);
    expect(html).not.toContain("Membership access is temporarily unavailable");
  });
});
