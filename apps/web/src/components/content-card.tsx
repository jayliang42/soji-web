import type { ContentItem } from "@soji/types";
import Link from "next/link";

export function ContentCard({ item, locked }: { item: ContentItem; locked: boolean }) {
  return (
    <article className="rounded-[28px] border border-dune bg-shell p-6">
      <div className="flex items-center justify-between text-sm text-cocoa/60">
        <span>{item.type.replace("_", " ")}</span>
        <span>{item.publishedAt}</span>
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
      <div className="mt-6 flex items-center justify-between">
        <span className="text-sm text-clay">
          {locked ? "Locked by tier" : "Available now"}
        </span>
        <Link href={`/library/${item.slug}`} className="text-sm font-semibold text-cocoa">
          View
        </Link>
      </div>
    </article>
  );
}
