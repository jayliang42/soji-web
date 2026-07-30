import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentCover } from "@/components/content-cover";
import { ContentPreviewCta } from "@/components/content-preview-cta";
import { ContentSourceBadge } from "@/components/content-source-badge";
import { DataUnavailable } from "@/components/data-state";
import { MarkdownContent } from "@/components/markdown-content";
import { SectionShell } from "@/components/section-shell";
import { getContentAccessMode, getVisibleContentBody } from "@/lib/content-access";
import { getContentAccessPresentation } from "@/lib/content-access-presentation";
import {
  estimateReadingMinutes,
  formatContentType,
  formatPublishedDate
} from "@/lib/content-presentation";
import { getContentBySlug } from "@/lib/content";
import { getSessionSnapshot } from "@/lib/session";

const accessToneClasses = {
  accent: "bg-accent-muted text-clay",
  neutral: "bg-cream text-cocoa/75",
  success: "bg-success-muted text-success"
} as const;

function getReadingLabel(
  minutes: number | null,
  mode: "full" | "preview" | "locked" | "unavailable"
) {
  if (!minutes) {
    return "Access details only";
  }

  return mode === "full"
    ? `${minutes} min read`
    : `${minutes} min public opening`;
}

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
  const readingMinutes = estimateReadingMinutes(displayBody);
  const readingLabel = getReadingLabel(readingMinutes, accessMode);
  const visibleTags = item.tags
    .filter((tag) => !["demo", "supporting"].includes(tag.toLocaleLowerCase()))
    .slice(0, 4);

  return (
    <main>
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-8 md:pb-24 md:pt-10">
        <Link
          className="inline-flex min-h-11 items-center text-sm font-bold text-clay underline decoration-clay/35 underline-offset-4 hover:decoration-clay"
          href="/library"
        >
          Back to Library
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)] lg:items-stretch">
          <header className="flex flex-col justify-center py-2 lg:py-8">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-clay">
              Soji Library
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
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${accessToneClasses[access.tone]}`}
              >
                {access.label}
              </span>
              {source === "demo" ? (
                <ContentSourceBadge source={source} />
              ) : null}
            </div>
          </header>

          <ContentCover
            alt={item.coverImageAlt}
            className="border border-dune lg:aspect-auto lg:h-full lg:min-h-[30rem]"
            eager
            label={formatContentType(item.type)}
            src={item.coverImage}
            title={item.title}
          />
        </div>

        {accessMode === "unavailable" ? (
          <div
            className="mt-8 max-w-[72ch] rounded-lg border border-clay/30 bg-accent-muted px-5 py-5 text-cocoa"
            role="alert"
          >
            <p className="font-semibold">Access temporarily unavailable</p>
            <p className="mt-2 leading-7 text-cocoa/75">
              We could not verify access right now. No member-only content or
              private links have been shown. Try again or contact{" "}
              <Link
                className="font-semibold text-clay underline decoration-clay/40 underline-offset-4"
                href="/support"
              >
                Support
              </Link>
              .
            </p>
          </div>
        ) : null}

        <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,72ch)_minmax(15rem,1fr)] lg:items-start">
          <article
            aria-label={`${item.title} reading`}
            className="min-w-0 overflow-hidden rounded-xl border border-dune bg-shell"
          >
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-dune px-5 py-4 sm:px-8">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-cocoa/62">
                Reading
              </p>
              <p className="text-sm font-semibold text-cocoa/62">
                {readingLabel}
              </p>
            </header>

            <div className="px-5 py-8 sm:px-8 md:py-10">
              {displayBody ? (
                <MarkdownContent content={displayBody} />
              ) : (
                <div className="space-y-4">
                  <p className="text-lg text-cocoa/80">
                    This guide is reserved for readers with the right access.
                  </p>
                  <p className="text-sm text-cocoa/70">
                    Review the available membership or purchase options to
                    continue.
                  </p>
                </div>
              )}

              {accessMode === "preview" || accessMode === "locked" ? (
                <ContentPreviewCta
                  isAuthenticated={isAuthenticated}
                  membershipName={access.membershipName}
                  membershipPlanId={access.membershipPlanId}
                  mode={accessMode}
                  nextPath={`/library/${item.slug}`}
                />
              ) : null}

              {accessMode === "full" ? (
                <footer className="mt-12 border-t border-dune pt-8">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-cocoa/62">
                    Continue exploring
                  </p>
                  <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-cocoa">
                    Choose the next useful step.
                  </h2>
                  <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-sm font-bold">
                    <Link
                      className="inline-flex min-h-11 items-center text-clay underline decoration-clay/35 underline-offset-4 hover:decoration-clay"
                      href="/library"
                    >
                      Browse more guides
                    </Link>
                    <Link
                      className="inline-flex min-h-11 items-center text-clay underline decoration-clay/35 underline-offset-4 hover:decoration-clay"
                      href="/products"
                    >
                      Explore practical tools
                    </Link>
                    <Link
                      className="inline-flex min-h-11 items-center text-clay underline decoration-clay/35 underline-offset-4 hover:decoration-clay"
                      href="/office-hours"
                    >
                      Review Office Hours
                    </Link>
                  </div>
                </footer>
              ) : null}
            </div>
          </article>

          <aside
            aria-labelledby="guide-details-heading"
            className="rounded-xl border border-dune bg-cream p-6 lg:sticky lg:top-28"
          >
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-cocoa/62">
              At a glance
            </p>
            <h2
              className="mt-3 font-display text-2xl font-semibold text-cocoa"
              id="guide-details-heading"
            >
              Guide details
            </h2>
            <dl className="mt-5 divide-y divide-dune border-y border-dune text-sm">
              <div className="grid grid-cols-[5.5rem_1fr] gap-3 py-3">
                <dt className="font-semibold text-cocoa/62">Format</dt>
                <dd className="font-semibold text-cocoa">
                  {formatContentType(item.type)}
                </dd>
              </div>
              {publishedDate ? (
                <div className="grid grid-cols-[5.5rem_1fr] gap-3 py-3">
                  <dt className="font-semibold text-cocoa/62">Published</dt>
                  <dd className="font-semibold text-cocoa">
                    <time dateTime={item.publishedAt}>{publishedDate}</time>
                  </dd>
                </div>
              ) : null}
              <div className="grid grid-cols-[5.5rem_1fr] gap-3 py-3">
                <dt className="font-semibold text-cocoa/62">Reading</dt>
                <dd className="font-semibold text-cocoa">{readingLabel}</dd>
              </div>
              <div className="grid grid-cols-[5.5rem_1fr] gap-3 py-3">
                <dt className="font-semibold text-cocoa/62">Access</dt>
                <dd className="font-semibold text-cocoa">{access.label}</dd>
              </div>
            </dl>

            {visibleTags.length > 0 ? (
              <div className="mt-6">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-cocoa/62">
                  Topics
                </p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {visibleTags.map((tag) => (
                    <li
                      className="rounded-full bg-sand px-3 py-1 text-xs font-semibold text-cocoa/75"
                      key={tag}
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <Link
              className="mt-6 inline-flex min-h-11 items-center text-sm font-bold text-clay underline decoration-clay/35 underline-offset-4 hover:decoration-clay"
              href="/library"
            >
              Return to Library
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
}
