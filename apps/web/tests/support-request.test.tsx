import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SupportRequestComposer } from "@/components/support-request-composer";
import {
  buildSupportMailto,
  buildSupportRequest,
  copySupportRequest,
  type SupportRequestDraft
} from "@/lib/support-request";

const draft: SupportRequestDraft = {
  context: "Products page, around 2 PM CT",
  details:
    "I selected the workbook, but the download did not appear in Purchases.",
  issue: "purchase"
};

describe("support request composer", () => {
  it("builds one predictable request and omits empty optional context", () => {
    expect(buildSupportRequest(draft)).toBe(
      [
        "Soji support request",
        "",
        "Issue type: Purchase or download",
        "",
        "What I was trying to do and what happened:",
        "I selected the workbook, but the download did not appear in Purchases.",
        "",
        "Account, product, page, or timing context:",
        "Products page, around 2 PM CT",
        "",
        "—",
        "Prepared on Soji Support. This message was not saved by Soji."
      ].join("\n")
    );

    const withoutContext = buildSupportRequest({
      ...draft,
      context: "   ",
      details: "\r\n  The reset link returned me to the sign-in page.  \r\n"
    });
    expect(withoutContext).toContain(
      "What I was trying to do and what happened:\nThe reset link returned me to the sign-in page."
    );
    expect(withoutContext).not.toContain(
      "Account, product, page, or timing context:"
    );
  });

  it("prefills a valid mail channel with the exact subject and body", () => {
    const href = buildSupportMailto("mailto:help@soji.test", draft);

    expect(href).not.toBeNull();
    const mailto = new URL(href!);
    expect(mailto.protocol).toBe("mailto:");
    expect(mailto.pathname).toBe("help@soji.test");
    expect(mailto.searchParams.get("subject")).toBe(
      "Soji support — Purchase or download"
    );
    expect(mailto.searchParams.get("body")).toBe(buildSupportRequest(draft));
  });

  it("does not turn a web channel or preconfigured query into an email draft", () => {
    expect(
      buildSupportMailto("https://support.soji.co/requests/new", draft)
    ).toBeNull();
    expect(
      buildSupportMailto("mailto:help@soji.test?subject=existing", draft)
    ).toBeNull();
  });

  it("copies the exact prepared request and exposes failure truthfully", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const request = buildSupportRequest(draft);

    await expect(copySupportRequest(request, { writeText })).resolves.toBe(
      true
    );
    expect(writeText).toHaveBeenCalledWith(request);

    writeText.mockRejectedValueOnce(new Error("blocked"));
    await expect(copySupportRequest(request, { writeText })).resolves.toBe(
      false
    );
    await expect(copySupportRequest(request, undefined)).resolves.toBe(false);
  });

  it("server-renders a labeled vertical form and an honest empty preview", () => {
    const html = renderToStaticMarkup(
      <SupportRequestComposer destination="mailto:help@soji.test" />
    );

    expect(html).toContain("Request builder");
    expect(html).toContain("What do you need help with?");
    expect(html).toContain(
      "What were you trying to do, and what happened instead?"
    );
    expect(html).toContain("(optional)");
    expect(html).toContain("Prepare my request");
    expect(html).toContain("Your prepared request will appear here.");
    expect(html).not.toContain("Open email draft");
    expect(html).not.toContain("Soji support request");
  });
});
