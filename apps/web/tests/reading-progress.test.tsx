import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GuideReadingProgress } from "@/components/guide-reading-progress";
import {
  calculateReadingProgress,
  getResumeScrollTop,
  parseReadingProgress,
  readGuideProgress,
  READING_PROGRESS_STORAGE_KEY,
  type ReadingProgressStorage,
  writeGuideProgress
} from "@/lib/reading-progress";

function createStorage(initial?: string): ReadingProgressStorage {
  const values = new Map<string, string>();
  if (initial !== undefined) {
    values.set(READING_PROGRESS_STORAGE_KEY, initial);
  }

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    }
  };
}

describe("guide reading progress", () => {
  it("calculates a bounded position through the visible reading region", () => {
    const measurements = {
      headerOffset: 80,
      targetHeight: 1200,
      targetTop: 500,
      viewportHeight: 600
    };

    expect(
      calculateReadingProgress({ ...measurements, scrollY: 420 })
    ).toBe(0);
    expect(
      calculateReadingProgress({ ...measurements, scrollY: 760 })
    ).toBe(50);
    expect(
      calculateReadingProgress({ ...measurements, scrollY: 1100 })
    ).toBe(100);
    expect(
      calculateReadingProgress({
        ...measurements,
        scrollY: Number.NaN
      })
    ).toBe(0);
  });

  it("restores the exact stored offset beneath the persistent header", () => {
    expect(
      getResumeScrollTop({
        headerOffset: 76,
        offset: 340,
        targetTop: 620
      })
    ).toBe(884);
    expect(
      getResumeScrollTop({
        headerOffset: 76,
        offset: -20,
        targetTop: 30
      })
    ).toBe(0);
  });

  it("persists newest progress first and replaces an older guide position", () => {
    const older = {
      offset: 120,
      progress: 25,
      slug: "calmer-decision",
      updatedAt: "2026-07-30T18:00:00.000Z"
    };
    const storage = createStorage(JSON.stringify([older]));
    const latest = {
      ...older,
      offset: 420,
      progress: 72,
      updatedAt: "2026-07-30T19:00:00.000Z"
    };

    expect(writeGuideProgress(latest, storage)).toEqual(latest);
    expect(readGuideProgress(older.slug, storage)).toEqual(latest);
    expect(parseReadingProgress(storage.getItem(READING_PROGRESS_STORAGE_KEY)))
      .toEqual([latest]);
  });

  it("ignores damaged, duplicate, invalid, and excessive stored history", () => {
    const validEntry = {
      offset: 120,
      progress: 25,
      slug: "guide-0",
      updatedAt: "2026-07-30T18:00:00.000Z"
    };
    const entries = Array.from({ length: 60 }, (_, index) => ({
      ...validEntry,
      slug: `guide-${index}`
    }));

    expect(
      parseReadingProgress(
        JSON.stringify([
          validEntry,
          { ...validEntry, progress: 0 },
          { ...validEntry, offset: -1 },
          { ...validEntry, updatedAt: "not-a-date" },
          validEntry,
          ...entries.slice(1)
        ])
      )
    ).toHaveLength(50);
    expect(parseReadingProgress("{damaged")).toEqual([]);
    expect(parseReadingProgress(JSON.stringify({ entries }))).toEqual([]);
  });

  it("fails without throwing when browser storage is unavailable", () => {
    const blockedStorage: ReadingProgressStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      }
    };
    const entry = {
      offset: 120,
      progress: 25,
      slug: "calmer-decision",
      updatedAt: "2026-07-30T18:00:00.000Z"
    };

    expect(readGuideProgress(entry.slug, undefined)).toBeNull();
    expect(readGuideProgress(entry.slug, blockedStorage)).toBeNull();
    expect(writeGuideProgress(entry, undefined)).toBeNull();
    expect(writeGuideProgress(entry, blockedStorage)).toBeNull();
  });

  it("server-renders a named determinate progress element without a false resume action", () => {
    const html = renderToStaticMarkup(
      <GuideReadingProgress
        slug="calmer-decision"
        targetId="guide-reading-body"
        title="A Calmer Decision"
      />
    );

    expect(html).toContain("已阅读 0%");
    expect(html).toContain(
      'aria-label="《A Calmer Decision》的阅读进度"'
    );
    expect(html).toContain('max="100"');
    expect(html).toContain('value="0"');
    expect(html).not.toContain("处继续");
  });
});
