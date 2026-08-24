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
        "GS学院帮助请求",
        "",
        "问题类型：购买或下载",
        "",
        "我原本想做什么，以及实际发生了什么：",
        "I selected the workbook, but the download did not appear in Purchases.",
        "",
        "相关账号、产品、页面或时间信息：",
        "Products page, around 2 PM CT",
        "",
        "—",
        "此内容由 GS学院帮助中心整理，GS学院不会在此页面保存这条消息。"
      ].join("\n")
    );

    const withoutContext = buildSupportRequest({
      ...draft,
      context: "   ",
      details: "\r\n  The reset link returned me to the sign-in page.  \r\n"
    });
    expect(withoutContext).toContain(
      "我原本想做什么，以及实际发生了什么：\nThe reset link returned me to the sign-in page."
    );
    expect(withoutContext).not.toContain(
      "相关账号、产品、页面或时间信息："
    );
  });

  it("prefills a valid mail channel with the exact subject and body", () => {
    const href = buildSupportMailto("mailto:help@soji.test", draft);

    expect(href).not.toBeNull();
    const mailto = new URL(href!);
    expect(mailto.protocol).toBe("mailto:");
    expect(mailto.pathname).toBe("help@soji.test");
    expect(mailto.searchParams.get("subject")).toBe(
      "GS学院帮助请求 — 购买或下载"
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

    expect(html).toContain("请求整理工具");
    expect(html).toContain("你需要哪方面的帮助？");
    expect(html).toContain(
      "你原本想做什么，实际发生了什么？"
    );
    expect(html).toContain("（选填）");
    expect(html).toContain("整理我的请求");
    expect(html).toContain("整理后的帮助请求会显示在这里。");
    expect(html).not.toContain("打开邮件草稿");
    expect(html).not.toContain("GS学院帮助请求");
  });
});
