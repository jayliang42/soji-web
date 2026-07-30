import type { Metadata } from "next";
import Link from "next/link";
import { ContentSourceBadge } from "@/components/content-source-badge";
import { DataEmpty, DataUnavailable } from "@/components/data-state";
import {
  LibraryBrowser,
  type LibraryBrowserEntry
} from "@/components/library-browser";
import { SectionShell } from "@/components/section-shell";
import { getContentAccessMode } from "@/lib/content-access";
import { getContentSnapshot } from "@/lib/content";
import { getSessionSnapshot } from "@/lib/session";

export const metadata: Metadata = {
  title: "Library",
  description:
    "Read public previews and explore member essays, templates, and practical money decision tools.",
  alternates: { canonical: "/library" }
};

export default async function LibraryPage({
  searchParams = Promise.resolve({})
}: {
  searchParams?: Promise<{ focus?: string }>;
}) {
  const [snapshot, session, params] = await Promise.all([
    getContentSnapshot(),
    getSessionSnapshot(),
    searchParams
  ]);
  const isAuthenticated = Boolean(session.user);
  const entries: LibraryBrowserEntry[] = snapshot.items.map((item) => ({
    accessMode: getContentAccessMode(item, {
      accessUnavailable: Boolean(session.error),
      entitlements: session.entitlements,
      isAuthenticated
    }),
    item: {
      coverImage: item.coverImage,
      coverImageAlt: item.coverImageAlt,
      id: item.id,
      publishedAt: item.publishedAt,
      requiredEntitlements: item.requiredEntitlements,
      slug: item.slug,
      summary: item.summary,
      tags: item.tags,
      title: item.title,
      type: item.type,
      visibility: item.visibility
    }
  }));

  return (
    <main>
      <SectionShell
        compact
        eyebrow="Library"
        headingLevel={1}
        title="Guides for making clearer money decisions"
        description="Read useful public guides alongside deeper member editions, templates, and practical tools."
      >
        {snapshot.source === "demo" ? (
          <div className="mb-6">
            <ContentSourceBadge source={snapshot.source} />
          </div>
        ) : null}
        {snapshot.error ? (
          <div className="mb-6">
            <DataUnavailable
              title="The library could not be loaded"
              description="No restricted content has been shown. Please try again shortly."
            />
          </div>
        ) : null}
        {session.error ? (
          <div className="mb-6">
            <DataUnavailable
              title="Membership access is temporarily unavailable"
              description="Public pieces remain available, but we could not verify access to restricted content. Your membership has not been changed. Please try again shortly."
            />
          </div>
        ) : null}
        {entries.length > 0 ? (
          <LibraryBrowser
            entries={entries}
            initialFocus={params.focus}
            isAuthenticated={isAuthenticated}
          />
        ) : null}
        {!snapshot.error && snapshot.items.length === 0 ? (
          <div className="mt-6 space-y-4">
            <DataEmpty
              title="The first guide is being prepared"
              description="Browse membership details now, then return when the first guide is published."
            />
            <Link
              href="/pricing"
              className="inline-flex min-h-11 items-center font-semibold text-clay underline decoration-clay/40 underline-offset-4 hover:decoration-clay"
            >
              Compare membership
            </Link>
          </div>
        ) : null}
      </SectionShell>
    </main>
  );
}
