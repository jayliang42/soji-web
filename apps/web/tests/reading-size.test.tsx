import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReadingSizeControl } from "@/components/reading-size-control";
import {
  parseReadingSize,
  readReadingSize,
  READING_SIZE_STORAGE_KEY,
  type ReadingSizeStorage,
  writeReadingSize
} from "@/lib/reading-size";

function createStorage(initial?: string): ReadingSizeStorage {
  const values = new Map<string, string>();
  if (initial !== undefined) {
    values.set(READING_SIZE_STORAGE_KEY, initial);
  }

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    }
  };
}

describe("article reading size", () => {
  it("accepts only the bounded preference values", () => {
    expect(parseReadingSize("large")).toBe("large");
    expect(parseReadingSize("default")).toBe("default");
    expect(parseReadingSize("oversized")).toBe("default");
    expect(parseReadingSize(null)).toBe("default");
  });

  it("persists and restores a device-local preference", () => {
    const storage = createStorage();

    expect(writeReadingSize("large", storage)).toBe(true);
    expect(storage.getItem(READING_SIZE_STORAGE_KEY)).toBe("large");
    expect(readReadingSize(storage)).toBe("large");

    expect(writeReadingSize("default", storage)).toBe(true);
    expect(readReadingSize(storage)).toBe("default");
  });

  it("falls back without throwing when storage is unavailable", () => {
    const blockedStorage: ReadingSizeStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      }
    };

    expect(readReadingSize(undefined)).toBe("default");
    expect(readReadingSize(blockedStorage)).toBe("default");
    expect(writeReadingSize("large", undefined)).toBe(false);
    expect(writeReadingSize("large", blockedStorage)).toBe(false);
  });

  it("server-renders a named two-choice control with a truthful default", () => {
    const html = renderToStaticMarkup(
      <ReadingSizeControl targetId="guide-reading-body" />
    );

    expect(html).toContain('aria-label="阅读字号"');
    expect(html).toContain("字号");
    expect(html).toMatch(/aria-pressed="true"[^>]*>默认<\/button>/u);
    expect(html).toMatch(/aria-pressed="false"[^>]*>放大<\/button>/u);
    expect(html).toContain('aria-live="polite"');
  });
});
