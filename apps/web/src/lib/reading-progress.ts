export const READING_PROGRESS_STORAGE_KEY = "soji:reading-progress:v1";

const MAX_READING_PROGRESS_ENTRIES = 50;
const MAX_READING_OFFSET = 1_000_000;
const MAX_SLUG_LENGTH = 160;

export interface ReadingProgressEntry {
  offset: number;
  progress: number;
  slug: string;
  updatedAt: string;
}

export interface ReadingProgressStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function normalizeSlug(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const slug = value.trim();
  return slug && slug.length <= MAX_SLUG_LENGTH ? slug : null;
}

function normalizeEntry(value: unknown): ReadingProgressEntry | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const slug = normalizeSlug(candidate.slug);
  const progress =
    typeof candidate.progress === "number" && Number.isFinite(candidate.progress)
      ? Math.round(candidate.progress)
      : Number.NaN;
  const offset =
    typeof candidate.offset === "number" && Number.isFinite(candidate.offset)
      ? Math.round(candidate.offset)
      : Number.NaN;
  const updatedAt =
    typeof candidate.updatedAt === "string" &&
    candidate.updatedAt.length <= 40 &&
    Number.isFinite(Date.parse(candidate.updatedAt))
      ? candidate.updatedAt
      : null;

  if (
    !slug ||
    progress < 1 ||
    progress > 100 ||
    offset < 0 ||
    offset > MAX_READING_OFFSET ||
    !updatedAt
  ) {
    return null;
  }

  return { offset, progress, slug, updatedAt };
}

export function parseReadingProgress(value: string | null) {
  if (!value) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const entries: ReadingProgressEntry[] = [];
    const seen = new Set<string>();

    for (const candidate of parsed) {
      const entry = normalizeEntry(candidate);
      if (!entry || seen.has(entry.slug)) {
        continue;
      }

      seen.add(entry.slug);
      entries.push(entry);
      if (entries.length === MAX_READING_PROGRESS_ENTRIES) {
        break;
      }
    }

    return entries;
  } catch {
    return [];
  }
}

export function readGuideProgress(
  slug: string,
  storage: ReadingProgressStorage | undefined
) {
  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug || !storage) {
    return null;
  }

  try {
    return (
      parseReadingProgress(storage.getItem(READING_PROGRESS_STORAGE_KEY)).find(
        (entry) => entry.slug === normalizedSlug
      ) ?? null
    );
  } catch {
    return null;
  }
}

export function writeGuideProgress(
  entry: ReadingProgressEntry,
  storage: ReadingProgressStorage | undefined
) {
  const normalized = normalizeEntry(entry);
  if (!normalized || !storage) {
    return null;
  }

  try {
    const current = parseReadingProgress(
      storage.getItem(READING_PROGRESS_STORAGE_KEY)
    );
    const next = [
      normalized,
      ...current.filter((candidate) => candidate.slug !== normalized.slug)
    ].slice(0, MAX_READING_PROGRESS_ENTRIES);
    storage.setItem(READING_PROGRESS_STORAGE_KEY, JSON.stringify(next));
    return normalized;
  } catch {
    return null;
  }
}

export function calculateReadingProgress({
  headerOffset,
  scrollY,
  targetHeight,
  targetTop,
  viewportHeight
}: {
  headerOffset: number;
  scrollY: number;
  targetHeight: number;
  targetTop: number;
  viewportHeight: number;
}) {
  const values = [
    headerOffset,
    scrollY,
    targetHeight,
    targetTop,
    viewportHeight
  ];
  if (values.some((value) => !Number.isFinite(value))) {
    return 0;
  }

  const safeHeaderOffset = Math.max(0, headerOffset);
  const start = targetTop - safeHeaderOffset;
  const end = Math.max(
    start,
    targetTop + Math.max(0, targetHeight) - Math.max(0, viewportHeight)
  );

  if (scrollY <= start) {
    return 0;
  }
  if (end === start || scrollY >= end) {
    return 100;
  }

  return Math.round(((scrollY - start) / (end - start)) * 100);
}

export function getResumeScrollTop({
  headerOffset,
  offset,
  targetTop
}: {
  headerOffset: number;
  offset: number;
  targetTop: number;
}) {
  if (
    !Number.isFinite(headerOffset) ||
    !Number.isFinite(offset) ||
    !Number.isFinite(targetTop)
  ) {
    return 0;
  }

  return Math.max(0, targetTop + Math.max(0, offset) - Math.max(0, headerOffset));
}

export function getBrowserReadingProgressStorage() {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
