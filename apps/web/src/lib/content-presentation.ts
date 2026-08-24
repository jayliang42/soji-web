const publishedDateFormatter = new Intl.DateTimeFormat("zh-CN", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric"
});

export function formatContentType(value: string): string {
  const normalized = value.replaceAll("_", " ").replace(/\s+/g, " ").trim();
  const labels: Record<string, string> = {
    article: "文章",
    case_study: "案例",
    guide: "指南",
    monthly_update: "每月更新",
    template: "模板",
    video: "视频",
    workbook: "练习册"
  };

  return labels[value.toLowerCase()] ?? (normalized || "内容");
}

export function formatPublishedDate(value: string): string | null {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : publishedDateFormatter.format(date);
}

export function estimateReadingMinutes(value: string | null | undefined) {
  const wordCount = value?.trim().split(/\s+/u).filter(Boolean).length ?? 0;

  return wordCount > 0 ? Math.max(1, Math.ceil(wordCount / 220)) : null;
}
