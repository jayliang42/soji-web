import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ContentPreviewCta } from "@/components/content-preview-cta";
import { ContentSourceBadge } from "@/components/content-source-badge";
import { DataUnavailable } from "@/components/data-state";
import { MarkdownContent } from "@/components/markdown-content";
import { SectionShell } from "@/components/section-shell";
import { getContentAccessMode, getVisibleContentBody } from "@/lib/content-access";
import { formatContentType } from "@/lib/content-presentation";
import { getContentBySlug } from "@/lib/content";
import { formatEntitlementList } from "@/lib/entitlements";
import { getSessionSnapshot } from "@/lib/session";

const accessLabels = {
  full: "Available now",
  locked: "Locked by tier",
  preview: "Preview available",
  unavailable: "Access unavailable"
} as const;

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getContentBySlug(slug);

  if (!result.item) {
    return {
      title: result.error ? "Content unavailable" : "Content not found",
      robots: { follow: false, index: false }
    };
  }

  const canonical = `/library/${encodeURIComponent(result.item.slug)}`;
  return {
    title: result.item.title,
    description: result.item.summary,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title: result.item.title,
      description: result.item.summary,
      url: canonical,
      ...(result.item.coverImage
        ? { images: [{ alt: result.item.title, url: result.item.coverImage }] }
        : {})
    }
  };
}

export default async function ContentDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [result, session] = await Promise.all([
    getContentBySlug(slug),
    getSessionSnapshot()
  ]);

  if (!result.item && result.error) {
    return (
      <main>
        <SectionShell
          eyebrow="Library"
          headingLevel={1}
          title="This piece could not be loaded."
          description="The library connection is temporarily unavailable."
        >
          <DataUnavailable
            title="Content unavailable"
            description="No restricted body content has been shown. Please try again shortly."
          />
        </SectionShell>
      </main>
    );
  }

  if (!result.item) {
    notFound();
  }

  const { item, source } = result;
  const accessMode = getContentAccessMode(item, {
    accessUnavailable: Boolean(session.error),
    entitlements: session.entitlements,
    isAuthenticated: Boolean(session.user)
  });
  const displayBody = getVisibleContentBody(item, accessMode);

  return (
    <main>
      <SectionShell
        eyebrow={formatContentType(item.type)}
        headingLevel={1}
        title={item.title}
        description={item.summary}
      >
        <div className="mb-6">
          <ContentSourceBadge source={source} />
        </div>
        {accessMode === "unavailable" ? (
          <div className="mb-6">
            <DataUnavailable
              title="Membership access is temporarily unavailable"
              description="We could not verify access to this restricted piece. Your membership has not been changed, and no private body content has been shown. Please try again shortly."
            />
          </div>
        ) : null}
        <article className="rounded-lg border border-dune bg-shell p-8">
          <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full bg-sand px-3 py-1 font-semibold text-cocoa">
              {accessLabels[accessMode]}
            </span>
            {item.requiredEntitlements.length > 0 ? (
              <span className="text-cocoa/70">
                Includes {formatEntitlementList(item.requiredEntitlements)}
              </span>
            ) : (
              <span className="text-cocoa/70">
                {item.visibility === "public" ? "Free public piece" : "Member account required"}
              </span>
            )}
          </div>
          {displayBody ? (
            <MarkdownContent content={displayBody} />
          ) : (
            <div className="space-y-4">
              <p className="text-lg text-cocoa/80">
                This piece is reserved for members with the right access.
              </p>
              <p className="text-sm text-cocoa/70">
                Choose a membership that includes {formatEntitlementList(item.requiredEntitlements)}.
              </p>
            </div>
          )}
          {accessMode === "preview" || accessMode === "locked" ? (
            <ContentPreviewCta mode={accessMode} nextPath={`/library/${item.slug}`} />
          ) : null}
        </article>
      </SectionShell>
    </main>
  );
}
