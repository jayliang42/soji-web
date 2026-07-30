export const READING_SIZE_STORAGE_KEY = "soji:reading-size:v1";

export type ReadingSize = "default" | "large";

export interface ReadingSizeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function parseReadingSize(value: string | null): ReadingSize {
  return value === "large" ? "large" : "default";
}

export function readReadingSize(
  storage: ReadingSizeStorage | undefined
): ReadingSize {
  if (!storage) {
    return "default";
  }

  try {
    return parseReadingSize(storage.getItem(READING_SIZE_STORAGE_KEY));
  } catch {
    return "default";
  }
}

export function writeReadingSize(
  size: ReadingSize,
  storage: ReadingSizeStorage | undefined
) {
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(READING_SIZE_STORAGE_KEY, size);
    return true;
  } catch {
    return false;
  }
}

export function getBrowserReadingSizeStorage() {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
