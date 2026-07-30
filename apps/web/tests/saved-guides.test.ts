import { describe, expect, it } from "vitest";
import {
  parseSavedGuideSlugs,
  readSavedGuideSlugs,
  SAVED_GUIDES_STORAGE_KEY,
  type SavedGuidesStorage,
  updateSavedGuide
} from "@/lib/saved-guides";

function createStorage(initial?: string): SavedGuidesStorage {
  const values = new Map<string, string>();
  if (initial !== undefined) {
    values.set(SAVED_GUIDES_STORAGE_KEY, initial);
  }

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    }
  };
}

describe("saved guides", () => {
  it("parses a bounded, de-duplicated list and ignores damaged state", () => {
    expect(
      parseSavedGuideSlugs(
        JSON.stringify(["first-guide", "first-guide", "", 42, "second-guide"])
      )
    ).toEqual(["first-guide", "second-guide"]);
    expect(parseSavedGuideSlugs("{damaged")).toEqual([]);
    expect(parseSavedGuideSlugs(JSON.stringify({ slug: "guide" }))).toEqual([]);
    expect(
      parseSavedGuideSlugs(
        JSON.stringify(
          Array.from({ length: 120 }, (_, index) => `guide-${index}`)
        )
      )
    ).toHaveLength(100);
  });

  it("adds the newest guide first and removes it without disturbing others", () => {
    const storage = createStorage(JSON.stringify(["older-guide"]));

    expect(updateSavedGuide("new-guide", true, storage)).toEqual([
      "new-guide",
      "older-guide"
    ]);
    expect(readSavedGuideSlugs(storage)).toEqual([
      "new-guide",
      "older-guide"
    ]);
    expect(updateSavedGuide("new-guide", false, storage)).toEqual([
      "older-guide"
    ]);
  });

  it("fails without throwing when browser storage is unavailable", () => {
    const blockedStorage: SavedGuidesStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      }
    };

    expect(readSavedGuideSlugs(undefined)).toEqual([]);
    expect(readSavedGuideSlugs(blockedStorage)).toEqual([]);
    expect(updateSavedGuide("guide", true, undefined)).toBeNull();
    expect(updateSavedGuide("guide", true, blockedStorage)).toBeNull();
  });
});
