import type { Metadata } from "next";
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
        title="Content, templates, and member-only drops"
        description="Each content item declares the entitlements required to unlock it."
      >
        <div className="mb-6">
          <ContentSourceBadge source={snapshot.source} />
        </div>
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
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {snapshot.items.map((item) => (
            <ContentCard
              key={item.id}
              item={item}
              accessMode={getContentAccessMode(item, {
                accessUnavailable: Boolean(session.error),
                entitlements: session.entitlements,
                isAuthenticated: Boolean(session.user)
              })}
            />
          ))}
        </div>
        {!snapshot.error && snapshot.items.length === 0 ? (
          <div className="mt-6">
            <DataEmpty
              title="No published content yet"
              description="New essays, templates, and member drops will appear here."
            />
          </div>
        ) : null}
      </SectionShell>
    </main>
  );
}
