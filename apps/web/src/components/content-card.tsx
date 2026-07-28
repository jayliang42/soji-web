import type { ContentItem } from "@soji/types";
import clsx from "clsx";
import Link from "next/link";
import { ContentCover } from "@/components/content-cover";
import type { ContentAccessMode } from "@/lib/content-access";
import { getContentAccessPresentation } from "@/lib/content-access-presentation";
import { formatContentType, formatPublishedDate } from "@/lib/content-presentation";

const accessClasses = {
  accent: "bg-accent-muted text-clay",
  neutral: "bg-cream text-cocoa/75",
  success: "bg-success-muted text-success"
} as const;

export function ContentCard({
  item,
  accessMode,
  featured = false,
  isAuthenticated = false
}: {
  item: ContentItem;
  accessMode: ContentAccessMode;
  featured?: boolean;
  isAuthenticated?: boolean;
}) {
  const publishedDate = formatPublishedDate(item.publishedAt);
  const access = getContentAccessPresentation(
    item,
    accessMode,
    isAuthenticated
  );

  return (
    <article
      className={clsx(
        "flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-dune bg-shell",
        featured && "lg:col-span-2"
      )}
      data-featured={featured ? "true" : undefined}
    >
      <ContentCover
        src={item.coverImage}
        alt={item.coverImageAlt}
        eager={featured}
        className="rounded-none border-b border-dune"
      />
      <div className="flex flex-1 flex-col p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium text-cocoa/70">
          <span>{formatContentType(item.type)}</span>
          {publishedDate ? (
            <time dateTime={item.publishedAt}>{publishedDate}</time>
          ) : null}
        </div>
        <h2
          className={clsx(
            "mt-4 font-display text-3xl font-bold leading-[1.05] text-cocoa",
            featured && "md:text-4xl"
          )}
        >
          {item.title}
        </h2>
        <p className="mt-4 leading-7 text-cocoa/75">{item.summary}</p>
        {item.tags.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2" aria-label="Topics">
            {item.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-sand px-3 py-1 text-xs font-semibold text-cocoa/75"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <div className="mt-auto flex flex-col items-start gap-4 pt-7 sm:flex-row sm:items-center sm:justify-between">
          <span
            className={clsx(
              "rounded-full px-3 py-1 text-sm font-semibold",
              accessClasses[access.tone]
            )}
          >
            {access.label}
          </span>
          <Link
            href={`/library/${item.slug}`}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-cocoa px-4 py-2 text-sm font-semibold text-cocoa transition-colors hover:bg-cocoa hover:text-white"
          >
            {access.action}
          </Link>
        </div>
      </div>
    </article>
  );
}
