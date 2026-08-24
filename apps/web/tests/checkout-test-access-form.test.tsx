import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  CheckoutTestAccessForm,
  registerCheckoutTestBrowser
} from "@/components/checkout-test-access-form";

const browserId = "00000000-0000-4000-8000-000000000951";

describe("checkout test access form", () => {
  it("keeps the capability out of URLs and visible form text", () => {
    const html = renderToStaticMarkup(<CheckoutTestAccessForm />);

    expect(html).toContain('type="password"');
    expect(html).toContain('autoComplete="off"');
    expect(html).toContain("登记这台浏览器");
    expect(html).not.toContain(browserId);
    expect(html).not.toContain("action=");
  });

  it("posts the trimmed capability only to the same-origin access API", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));

    await expect(
      registerCheckoutTestBrowser(`  ${browserId}  `, fetcher)
    ).resolves.toBe(true);
    expect(fetcher).toHaveBeenCalledWith(
      "/api/checkout/test-access",
      expect.objectContaining({
        body: JSON.stringify({ browserId }),
        credentials: "same-origin",
        method: "POST"
      })
    );
  });

  it("reports a rejected registration without exposing response details", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "internal detail" }), { status: 404 })
    );

    await expect(registerCheckoutTestBrowser(browserId, fetcher)).resolves.toBe(
      false
    );
  });
});
