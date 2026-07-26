import { notFound } from "next/navigation";
import { ContentPreviewCta } from "@/components/content-preview-cta";
import { ContentSourceBadge } from "@/components/content-source-badge";
import { SectionShell } from "@/components/section-shell";
import { getContentAccessMode, getPreviewBody } from "@/lib/content-access";
import { formatContentType } from "@/lib/content-presentation";
import { getContentBySlug } from "@/lib/content";
import { getCurrentEntitlements } from "@/lib/session";

export default async function ContentDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getContentBySlug(slug);
  const entitlements = await getCurrentEntitlements();

  if (!result.item) {
    notFound();
  }

  const { item, source, error } = result;
  const accessMode = getContentAccessMode(item, entitlements);
  const displayBody =
    accessMode === "preview" ? getPreviewBody(item.body) : item.body;

  return (
    <main>
      <SectionShell
        eyebrow={formatContentType(item.type)}
        title={item.title}
        description={item.summary}
      >
        <div className="mb-6">
          <ContentSourceBadge source={source} />
        </div>
        {error ? (
          <div className="mb-6 rounded-[24px] border border-clay/30 bg-[#fff1ea] px-5 py-4 text-sm text-cocoa">
            Supabase content query failed: {error}
          </div>
        ) : null}
        <div className="rounded-[32px] border border-dune bg-shell p-8">
          {accessMode !== "locked" ? (
            <div className="space-y-4 text-cocoa/80">
              <div className="whitespace-pre-wrap">{displayBody}</div>
              <p className="text-sm text-cocoa/60">
                Required entitlements: {item.requiredEntitlements.join(", ")}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-lg text-cocoa/80">
                This content is locked for the current account.
              </p>
              <p className="text-sm text-cocoa/60">
                Upgrade the membership plan to unlock {item.requiredEntitlements.join(", ")}.
              </p>
            </div>
          )}
          {accessMode === "preview" || accessMode === "locked" ? (
            <ContentPreviewCta mode={accessMode} />
          ) : null}
        </div>
      </SectionShell>
    </main>
  );
}
