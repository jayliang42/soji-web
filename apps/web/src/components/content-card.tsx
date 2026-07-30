import type { ContentItem } from "@soji/types";
import clsx from "clsx";
import Link from "next/link";
import { ContentCover } from "@/components/content-cover";
import { SavedGuideButton } from "@/components/saved-guide-button";
import type { ContentAccessMode } from "@/lib/content-access";
import { getContentAccessPresentation } from "@/lib/content-access-presentation";
import { formatContentType, formatPublishedDate } from "@/lib/content-presentation";

const accessClasses = {
  accent: "bg-accent-muted text-clay",
  neutral: "bg-cream text-cocoa/75",
  success: "bg-success-muted text-success"
} as const;

export type ContentCardItem = Pick<
  ContentItem,
  | "coverImage"
  | "coverImageAlt"
  | "id"
  | "publishedAt"
  | "requiredEntitlements"
  | "slug"
  | "summary"
  | "tags"
  | "title"
  | "type"
  | "visibility"
>;

export function ContentCard({
  item,
  accessMode,
  featured = false,
  headingLevel = 2,
  isAuthenticated = false
}: {
  item: ContentCardItem;
  accessMode: ContentAccessMode;
  featured?: boolean;
  headingLevel?: 2 | 3;
  isAuthenticated?: boolean;
}) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  const publishedDate = formatPublishedDate(item.publishedAt);
  const access = getContentAccessPresentation(
    item,
    accessMode,
    isAuthenticated
  );
  const visibleTags = item.tags
    .filter((tag) => !["demo", "supporting"].includes(tag.toLocaleLowerCase()))
    .slice(0, 3);

  return (
    <article
      className={clsx(
        "flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-dune bg-shell",
        featured && "lg:grid lg:grid-cols-2"
      )}
      data-featured={featured ? "true" : undefined}
    >
      <ContentCover
        src={item.coverImage}
        alt={item.coverImageAlt}
        eager={featured}
        label={formatContentType(item.type)}
        title={item.title}
        className={clsx(
          "rounded-none border-b border-dune",
          featured && "lg:aspect-auto lg:h-full lg:border-b-0 lg:border-r"
        )}
      />
      <div className="flex flex-1 flex-col p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium text-cocoa/70">
          <span>{formatContentType(item.type)}</span>
          {publishedDate ? (
            <time dateTime={item.publishedAt}>{publishedDate}</time>
          ) : null}
        </div>
        <Heading
          className={clsx(
            "mt-4 font-display text-3xl font-bold leading-[1.05] text-cocoa",
            featured && "md:text-4xl"
          )}
        >
          {item.title}
        </Heading>
        <p className="mt-4 leading-7 text-cocoa/75">{item.summary}</p>
        {visibleTags.length > 0 ? (
          <ul
            aria-label="Topics"
            className="mt-5 flex list-none flex-wrap gap-2 p-0"
          >
            {visibleTags.map((tag) => (
              <li key={tag}>
                <Link
                  aria-label={`Browse guides about ${tag}`}
                  className="inline-flex min-h-11 items-center rounded-full border border-transparent bg-sand px-3 py-1 text-xs font-semibold text-cocoa/75 transition-colors hover:border-clay/35 hover:bg-accent-muted hover:text-clay"
                  href={`/library?q=${encodeURIComponent(tag)}`}
                >
                  {tag}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-auto flex flex-col items-start gap-4 pt-7">
          <span
            className={clsx(
              "rounded-full px-3 py-1 text-sm font-semibold",
              accessClasses[access.tone]
            )}
          >
            {access.label}
          </span>
          <div className="flex w-full flex-wrap items-center gap-2">
            <SavedGuideButton slug={item.slug} title={item.title} />
            <Link
              href={`/library/${item.slug}`}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md border border-cocoa px-4 py-2 text-sm font-semibold text-cocoa transition-colors hover:bg-cocoa hover:text-white"
            >
              {access.action}
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
