import type { ContentType } from "@soji/types";
import type { ReadingProgressEntry } from "@/lib/reading-progress";

const CONTINUE_MINIMUM_PROGRESS = 5;
const CONTINUE_MAXIMUM_PROGRESS = 97;

export interface ContinueReadingGuide {
  slug: string;
  summary: string;
  title: string;
  type: ContentType;
}

export interface ContinueReadingMatch {
  guide: ContinueReadingGuide;
  progress: ReadingProgressEntry;
}

export function getContinueReadingMatch(
  progressEntries: readonly ReadingProgressEntry[],
  guides: readonly ContinueReadingGuide[]
): ContinueReadingMatch | null {
  const guidesBySlug = new Map(guides.map((guide) => [guide.slug, guide]));

  for (const progress of progressEntries) {
    if (
      progress.progress < CONTINUE_MINIMUM_PROGRESS ||
      progress.progress > CONTINUE_MAXIMUM_PROGRESS
    ) {
      continue;
    }

    const guide = guidesBySlug.get(progress.slug);
    if (guide) {
      return { guide, progress };
    }
  }

  return null;
}
