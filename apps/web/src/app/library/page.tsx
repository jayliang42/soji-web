import type { Metadata } from "next";
import type { ReactElement } from "react";
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
  title: "内容库",
  description:
    "阅读公开预览，探索会员文章、模板和实用的决策工具。",
  alternates: { canonical: "/library" }
};

type LibraryPageProps = {
  searchParams?: Promise<{ focus?: string; format?: string; q?: string }>;
};

export default async function LibraryPage(): Promise<ReactElement>;
export default async function LibraryPage(
  props: LibraryPageProps
): Promise<ReactElement>;
export default async function LibraryPage(props?: LibraryPageProps) {
  const searchParams =
    props?.searchParams ??
    Promise.resolve<{ focus?: string; format?: string; q?: string }>({});
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
        eyebrow="内容库"
        headingLevel={1}
        title="帮助你做出更清晰决定的指南"
        description="阅读实用的公开指南，以及更深入的会员文章、模板和工具。"
      >
        {snapshot.source === "demo" ? (
          <div className="mb-6">
            <ContentSourceBadge source={snapshot.source} />
          </div>
        ) : null}
        {snapshot.error ? (
          <div className="mb-6">
            <DataUnavailable
              title="暂时无法加载内容库"
              description="我们没有显示任何受限内容，请稍后再试。"
              note="重新连接期间，你的访问权限和收藏不会改变。"
              variant="panel"
            />
          </div>
        ) : null}
        {session.error && !snapshot.error ? (
          <div className="mb-6">
            <DataUnavailable
              title="暂时无法确认会员访问权限"
              description="公开内容仍可阅读，但我们目前无法确认受限内容的访问权限。你的会员状态没有改变，请稍后再试。"
            />
          </div>
        ) : null}
        {entries.length > 0 ? (
          <LibraryBrowser
            entries={entries}
            initialFocus={params.focus}
            initialFormat={params.format}
            initialQuery={params.q}
            isAuthenticated={isAuthenticated}
          />
        ) : null}
        {!snapshot.error && snapshot.items.length === 0 ? (
          <div className="mt-6">
            <DataEmpty
              actionHref="/pricing"
              actionLabel="查看解锁方案"
              title="首篇指南正在准备中"
              description="你可以先查看解锁方案，首篇指南发布后再回来阅读。"
              variant="panel"
            />
          </div>
        ) : null}
      </SectionShell>
    </main>
  );
}
