import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MarkdownContent } from "@/components/markdown-content";

describe("MarkdownContent", () => {
  it("renders editorial structure and GitHub-flavored content", () => {
    const html = renderToStaticMarkup(
      <MarkdownContent
        content={[
          "# A section",
          "",
          "- First idea",
          "- Second idea",
          "",
          "| Choice | Result |",
          "| --- | --- |",
          "| Save | More runway |",
          "",
          "Read **carefully** and visit [Soji](https://example.com)."
        ].join("\n")}
      />
    );

    expect(html).toContain("<h2>A section</h2>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<table>");
    expect(html).toContain("<strong>carefully</strong>");
    expect(html).toContain('href="https://example.com"');
  });

  it("does not execute or render raw HTML", () => {
    const html = renderToStaticMarkup(
      <MarkdownContent
        content={'Before<script>alert("xss")</script><img src="https://tracker.example/pixel">After'}
      />
    );

    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("tracker.example");
  });

  it("removes unsafe link protocols", () => {
    const html = renderToStaticMarkup(
      <MarkdownContent content={'[Open](javascript:alert("xss"))'} />
    );

    expect(html).toContain("<a href=\"\"");
    expect(html).not.toContain("javascript:");
  });
});
