import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BillingPortalButton } from "@/components/billing-portal-button";

describe("billing portal button", () => {
  it("shows a disabled conservative state when billing delivery is unavailable", () => {
    const html = renderToStaticMarkup(
      <BillingPortalButton enabled={false} subscriptionId="subscription-id" />
    );

    expect(html).toContain("账单管理不可用");
    expect(html).toContain("disabled");
    expect(html).toContain(
      "在安全记录账单更新之前，相关修改已暂停。"
    );
    expect(html).not.toContain("管理账单");
  });

  it("keeps the management command available when billing delivery is ready", () => {
    const html = renderToStaticMarkup(
      <BillingPortalButton enabled subscriptionId="subscription-id" />
    );

    expect(html).toContain("管理账单");
    expect(html).not.toContain('disabled=""');
  });
});
