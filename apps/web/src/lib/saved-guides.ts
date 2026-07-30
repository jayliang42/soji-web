export const SAVED_GUIDES_EVENT = "soji:saved-guides-changed";
export const SAVED_GUIDES_STORAGE_KEY = "soji:saved-guides:v1";

const MAX_SAVED_GUIDES = 100;

export interface SavedGuidesStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function normalizeSlug(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const slug = value.trim();
  return slug && slug.length <= 160 ? slug : null;
}

export function parseSavedGuideSlugs(value: string | null) {
  if (!value) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const slugs = parsed
      .map(normalizeSlug)
      .filter((slug): slug is string => Boolean(slug));
    return [...new Set(slugs)].slice(0, MAX_SAVED_GUIDES);
  } catch {
    return [];
  }
}

export function readSavedGuideSlugs(
  storage: SavedGuidesStorage | undefined
) {
  if (!storage) {
    return [];
  }

  try {
    return parseSavedGuideSlugs(storage.getItem(SAVED_GUIDES_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function updateSavedGuide(
  slug: string,
  shouldSave: boolean,
  storage: SavedGuidesStorage | undefined
) {
  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug || !storage) {
    return null;
  }

  try {
    const current = readSavedGuideSlugs(storage);
    const next = shouldSave
      ? [normalizedSlug, ...current.filter((item) => item !== normalizedSlug)]
      : current.filter((item) => item !== normalizedSlug);
    const bounded = next.slice(0, MAX_SAVED_GUIDES);
    storage.setItem(SAVED_GUIDES_STORAGE_KEY, JSON.stringify(bounded));
    return bounded;
  } catch {
    return null;
  }
}

export function getBrowserSavedGuidesStorage() {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
