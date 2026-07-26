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
