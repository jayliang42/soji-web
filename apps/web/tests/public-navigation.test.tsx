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
    expect(html).toContain(">菜单<");
    expect(html).toContain('href="/pricing"');
    expect(html).toContain(">价格<");
    expect(html).toContain('href="/login"');
    expect(html).toContain(">登录<");
    expect(html).not.toContain(">账户<");
    expect(html).not.toContain(">会员权益<");
    expect(html).toContain("浏览 GS学院");
    expect(html).toContain("查看单篇与完整合集解锁方式");
    expect(html).toContain("查看权益、购买记录与下载");
  });

  it("gives every mobile destination a full-height target and list semantics", () => {
    const html = renderToStaticMarkup(<PublicNavigation />);

    expect(html.match(/min-h-\[4\.5rem\]/gu)).toHaveLength(4);
    expect(html).toContain("<ul");
    expect(html.match(/<li/gu)).toHaveLength(4);
    expect(html).toContain("hidden md:block");
  });

  it("moves membership choices under subscriptions for signed-in users", () => {
    const html = renderToStaticMarkup(<PublicNavigation signedIn />);

    expect(html).toContain('href="/account?view=subscriptions"');
    expect(html).toContain(">会员权益<");
    expect(html).toContain(">账户<");
    expect(html).not.toContain(">登录<");
    expect(html).not.toContain(">价格<");
    expect(html).toContain("查看权益与付款记录");
    expect(html).toContain("查看权益、购买记录与个人资料");
  });
});
