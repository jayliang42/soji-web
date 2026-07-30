import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ShareButton, sharePage } from "@/components/share-button";

describe("detail-page sharing", () => {
  it("uses the native share sheet with the exact title and URL", async () => {
    const share = vi.fn().mockResolvedValue(undefined);

    await expect(
      sharePage(
        {
          title: "A useful guide",
          url: "https://soji.example/library/useful-guide"
        },
        { share }
      )
    ).resolves.toBe("shared");
    expect(share).toHaveBeenCalledWith({
      title: "A useful guide",
      url: "https://soji.example/library/useful-guide"
    });
  });

  it("copies the URL when native sharing is unavailable or fails", async () => {
    const copy = vi.fn().mockResolvedValue(undefined);
    const share = vi.fn().mockRejectedValue(new Error("not supported"));

    await expect(
      sharePage(
        {
          title: "A useful guide",
          url: "https://soji.example/library/useful-guide"
        },
        { copy, share }
      )
    ).resolves.toBe("copied");
    expect(copy).toHaveBeenCalledWith(
      "https://soji.example/library/useful-guide"
    );
  });

  it("treats reader cancellation as neutral and exposes manual copy on failure", async () => {
    await expect(
      sharePage(
        { title: "Guide", url: "https://soji.example/library/guide" },
        {
          copy: vi.fn().mockRejectedValue(new Error("blocked")),
          share: vi
            .fn()
            .mockRejectedValue(new DOMException("Cancelled", "AbortError"))
        }
      )
    ).resolves.toBe("cancelled");

    await expect(
      sharePage(
        { title: "Guide", url: "https://soji.example/library/guide" },
        { copy: vi.fn().mockRejectedValue(new Error("blocked")) }
      )
    ).resolves.toBe("manual");
  });

  it("renders an accessible initial action without leaking a server-side URL", () => {
    const html = renderToStaticMarkup(
      <ShareButton label="Share guide" title="A useful guide" />
    );

    expect(html).toContain("Share guide");
    expect(html).toContain('type="button"');
    expect(html).toContain('aria-live="polite"');
    expect(html).not.toContain("Copy this link manually");
    expect(html).not.toContain('type="url"');
  });
});
