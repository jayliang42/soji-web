import type { ContentItem } from "@soji/types";
import Link from "next/link";
import type { ContentAccessMode } from "@/lib/content-access";
import { formatContentType, formatPublishedDate } from "@/lib/content-presentation";

const accessLabels = {
  full: "Available now",
  locked: "Locked by tier",
  preview: "Preview available",
  unavailable: "Access unavailable"
} as const;

const accessClasses = {
  full: "bg-success-muted text-success",
  locked: "bg-sand text-cocoa/70",
  preview: "bg-accent-muted text-clay",
  unavailable: "bg-accent-muted text-cocoa/70"
} as const;

export function ContentCard({
  item,
  accessMode
}: {
  item: ContentItem;
  accessMode: ContentAccessMode;
}) {
  const publishedDate = formatPublishedDate(item.publishedAt);

  return (
    <article className="flex h-full flex-col rounded-lg border border-dune bg-shell p-6">
      <div className="flex items-center justify-between text-sm text-cocoa/70">
        <span>{formatContentType(item.type)}</span>
        {publishedDate ? <time dateTime={item.publishedAt}>{publishedDate}</time> : null}
      </div>
      <h3 className="mt-4 font-display text-3xl text-cocoa">{item.title}</h3>
      <p className="mt-3 text-cocoa/75">{item.summary}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {item.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-sand px-3 py-1 text-xs text-cocoa">
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-auto flex items-center justify-between gap-4 pt-6">
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${accessClasses[accessMode]}`}>
          {accessLabels[accessMode]}
        </span>
        <Link
          href={`/library/${item.slug}`}
          className="rounded-md border border-cocoa px-4 py-2 text-sm font-semibold text-cocoa transition-colors hover:bg-cocoa hover:text-white"
        >
          Read
        </Link>
      </div>
    </article>
  );
}
