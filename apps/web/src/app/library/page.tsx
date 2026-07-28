import type { Metadata } from "next";
import Link from "next/link";
import { ContentCard } from "@/components/content-card";
import { ContentSourceBadge } from "@/components/content-source-badge";
import { DataEmpty, DataUnavailable } from "@/components/data-state";
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

export default async function LibraryPage() {
  const [snapshot, session] = await Promise.all([
    getContentSnapshot(),
    getSessionSnapshot()
  ]);

  return (
    <main>
      <SectionShell
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
        <ul
          className="grid list-none gap-6 p-0 md:grid-cols-2 xl:grid-cols-3"
          aria-label="Published guides"
        >
          {snapshot.items.map((item, index) => {
            const featured = item.slug === "wealth-without-drift" || index === 0;

            return (
              <li key={item.id} className={featured ? "lg:col-span-2" : undefined}>
                <ContentCard
                  item={item}
                  featured={featured}
                  isAuthenticated={Boolean(session.user)}
                  accessMode={getContentAccessMode(item, {
                    accessUnavailable: Boolean(session.error),
                    entitlements: session.entitlements,
                    isAuthenticated: Boolean(session.user)
                  })}
                />
              </li>
            );
          })}
        </ul>
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
