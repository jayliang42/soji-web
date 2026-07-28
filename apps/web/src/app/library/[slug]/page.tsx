import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ContentCover } from "@/components/content-cover";
import { ContentPreviewCta } from "@/components/content-preview-cta";
import { ContentSourceBadge } from "@/components/content-source-badge";
import { DataUnavailable } from "@/components/data-state";
import { MarkdownContent } from "@/components/markdown-content";
import { SectionShell } from "@/components/section-shell";
import { getContentAccessMode, getVisibleContentBody } from "@/lib/content-access";
import { getContentAccessPresentation } from "@/lib/content-access-presentation";
import {
  formatContentType,
  formatPublishedDate
} from "@/lib/content-presentation";
import { getContentBySlug } from "@/lib/content";
import { getSessionSnapshot } from "@/lib/session";

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
        ? {
            images: [
              {
                alt: result.item.coverImageAlt || result.item.title,
                url: result.item.coverImage
              }
            ]
          }
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
  const isAuthenticated = Boolean(session.user);
  const access = getContentAccessPresentation(
    item,
    accessMode,
    isAuthenticated
  );
  const displayBody = getVisibleContentBody(item, accessMode);
  const publishedDate = formatPublishedDate(item.publishedAt);

  return (
    <main>
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <header className="max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-clay">
            Library
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-medium text-cocoa/70">
            <span>{formatContentType(item.type)}</span>
            {publishedDate ? (
              <>
                <span aria-hidden="true">·</span>
                <time dateTime={item.publishedAt}>{publishedDate}</time>
              </>
            ) : null}
          </div>
          <h1 className="mt-5 max-w-4xl font-display text-5xl font-bold leading-[0.98] text-cocoa md:text-7xl">
            {item.title}
          </h1>
          <p className="mt-6 max-w-3xl text-xl font-semibold leading-8 text-cocoa/72">
            {item.summary}
          </p>
        </header>

        <ContentCover
          src={item.coverImage}
          alt={item.coverImageAlt}
          eager
          className="mt-10 max-w-5xl border border-dune"
        />

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <span
            className={
              access.tone === "success"
                ? "rounded-full bg-success-muted px-3 py-1 text-sm font-semibold text-success"
                : access.tone === "accent"
                  ? "rounded-full bg-accent-muted px-3 py-1 text-sm font-semibold text-clay"
                  : "rounded-full bg-cream px-3 py-1 text-sm font-semibold text-cocoa/75"
            }
          >
            {access.label}
          </span>
          {source === "demo" ? (
            <ContentSourceBadge source={source} />
          ) : null}
        </div>

        {accessMode === "unavailable" ? (
          <div
            role="alert"
            className="mt-7 max-w-[72ch] rounded-lg border border-clay/30 bg-accent-muted px-5 py-5 text-cocoa"
          >
            <p className="font-semibold">Access temporarily unavailable</p>
            <p className="mt-2 leading-7 text-cocoa/75">
              We could not verify access right now. No member-only content or
              private links have been shown. Try again or contact{" "}
              <Link
                href="/support"
                className="font-semibold text-clay underline decoration-clay/40 underline-offset-4"
              >
                Support
              </Link>
              .
            </p>
          </div>
        ) : null}

        <article className="mt-8 max-w-[72ch] rounded-lg border border-dune bg-shell px-5 py-8 sm:px-8 md:py-10">
          {displayBody ? (
            <MarkdownContent content={displayBody} />
          ) : (
            <div className="space-y-4">
              <p className="text-lg text-cocoa/80">
                This guide is reserved for readers with the right access.
              </p>
              <p className="text-sm text-cocoa/70">
                Review the available membership or purchase options to continue.
              </p>
            </div>
          )}
          {accessMode === "preview" || accessMode === "locked" ? (
            <ContentPreviewCta
              mode={accessMode}
              isAuthenticated={isAuthenticated}
              membershipName={access.membershipName}
              nextPath={`/library/${item.slug}`}
            />
          ) : null}
        </article>
      </section>
    </main>
  );
}
