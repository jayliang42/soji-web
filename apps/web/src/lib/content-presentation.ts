const publishedDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric"
});

export function formatContentType(value: string): string {
  const label = value.replaceAll("_", " ").replace(/\s+/g, " ").trim();

  return label ? `${label.charAt(0).toUpperCase()}${label.slice(1)}` : "Content";
}

export function formatPublishedDate(value: string): string | null {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : publishedDateFormatter.format(date);
}

export function estimateReadingMinutes(value: string | null | undefined) {
  const wordCount = value?.trim().split(/\s+/u).filter(Boolean).length ?? 0;

  return wordCount > 0 ? Math.max(1, Math.ceil(wordCount / 220)) : null;
}
