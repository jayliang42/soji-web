import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const claimPageMocks = vi.hoisted(() => ({
  getSessionSnapshot: vi.fn(),
  redirect: vi.fn()
}));

vi.mock("@/lib/session", () => ({
  getSessionSnapshot: claimPageMocks.getSessionSnapshot
}));
vi.mock("next/navigation", () => ({
  redirect: claimPageMocks.redirect
}));

import CheckoutClaimPage from "@/app/checkout/claim/page";
import { getPurchaseClaimCopy } from "@/components/purchase-claim-status";
import { purchaseClaimLoginHref } from "@/lib/purchase-claim";

describe("checkout claim page", () => {
  beforeEach(() => {
    for (const mock of Object.values(claimPageMocks)) mock.mockReset();
    claimPageMocks.redirect.mockImplementation(() => {
      throw new Error("redirected");
    });
  });

  it("sends a guest to login without adding claim material to the URL", async () => {
    claimPageMocks.getSessionSnapshot.mockResolvedValue({
      entitlements: [],
      source: "supabase",
      user: null
    });

    await expect(CheckoutClaimPage()).rejects.toThrow("redirected");
    expect(claimPageMocks.redirect).toHaveBeenCalledWith(purchaseClaimLoginHref);
    expect(purchaseClaimLoginHref).not.toMatch(/session|token/iu);
  });

  it("starts server-verified discovery for an authenticated account", async () => {
    claimPageMocks.getSessionSnapshot.mockResolvedValue({
      entitlements: [],
      source: "supabase",
      user: { email: "member@example.com", id: "user-id" }
    });

    const html = renderToStaticMarkup(await CheckoutClaimPage());

    expect(html).toContain("领取你的购买");
    expect(html).toContain("正在绑定你的购买");
    expect(html).toContain("不需要输入订单号");
    expect(html).not.toContain("member@example.com");
  });

  it.each([
    ["processing", "正在绑定你的购买"],
    ["claimed", "购买已绑定"],
    ["email_mismatch", "暂时无法绑定购买"],
    ["invalid", "无法确认这笔购买"],
    ["error", "领取没有完成"]
  ] as const)("defines safe copy for the %s state", (status, title) => {
    const copy = getPurchaseClaimCopy(status);

    expect(copy.title).toBe(title);
    expect(copy.description).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+/iu);
  });
});
