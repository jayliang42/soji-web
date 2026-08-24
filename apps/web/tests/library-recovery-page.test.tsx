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

    expect(html).toContain("连接暂时中断");
    expect(html).toContain("暂时无法加载内容库");
    expect(html).toContain("重新加载");
    expect(html).not.toContain(">浏览实用工具</a>");
    expect(html).toContain(
      "重新连接期间，你的访问权限和收藏不会改变。"
    );
    expect(html.match(/role="alert"/gu)).toHaveLength(1);
    expect(html).not.toContain("暂时无法确认会员访问权限");
  });
});
