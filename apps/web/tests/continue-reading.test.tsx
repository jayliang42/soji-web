import type { ContentType } from "@soji/types";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ContinueReading } from "@/components/continue-reading";
import {
  getContinueReadingMatch,
  type ContinueReadingGuide
} from "@/lib/continue-reading";
import type { ReadingProgressEntry } from "@/lib/reading-progress";

const guides: ContinueReadingGuide[] = [
  {
    slug: "current-guide",
    summary: "A current published guide.",
    title: "A Current Guide",
    type: "article" as ContentType
  },
  {
    slug: "next-guide",
    summary: "Another current guide.",
    title: "The Next Guide",
    type: "template" as ContentType
  }
];

function progress(
  slug: string,
  value: number,
  updatedAt = "2026-07-30T19:00:00.000Z"
): ReadingProgressEntry {
  return {
    offset: 180,
    progress: value,
    slug,
    updatedAt
  };
}

describe("homepage Continue reading", () => {
  it("chooses the newest meaningful incomplete entry that still exists", () => {
    expect(
      getContinueReadingMatch(
        [
          progress("finished-guide", 100),
          progress("removed-guide", 42),
          progress("current-guide", 36),
          progress("next-guide", 20)
        ],
        guides
      )
    ).toEqual({
      guide: guides[0],
      progress: progress("current-guide", 36)
    });
  });

  it("ignores trivial starts, completed guides, and unknown content", () => {
    expect(
      getContinueReadingMatch(
        [
          progress("current-guide", 4),
          progress("next-guide", 98),
          progress("unknown-guide", 44)
        ],
        guides
      )
    ).toBeNull();
  });

  it("does not server-render stale personalized UI before storage is restored", () => {
    const html = renderToStaticMarkup(<ContinueReading guides={guides} />);

    expect(html).toBe("");
    expect(html).not.toContain("Resume guide");
  });
});
