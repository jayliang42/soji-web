import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BillingPortalButton } from "@/components/billing-portal-button";

describe("billing portal button", () => {
  it("shows a disabled conservative state when billing delivery is unavailable", () => {
    const html = renderToStaticMarkup(
      <BillingPortalButton enabled={false} subscriptionId="subscription-id" />
    );

    expect(html).toContain("Billing unavailable");
    expect(html).toContain("disabled");
    expect(html).toContain(
      "Changes are paused until secure billing updates can be recorded."
    );
    expect(html).not.toContain("Manage billing");
  });

  it("keeps the management command available when billing delivery is ready", () => {
    const html = renderToStaticMarkup(
      <BillingPortalButton enabled subscriptionId="subscription-id" />
    );

    expect(html).toContain("Manage billing");
    expect(html).not.toContain('disabled=""');
  });
});
