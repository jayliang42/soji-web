import { hasEntitlement } from "@soji/domain";
import { ContentCard } from "@/components/content-card";
import { ContentSourceBadge } from "@/components/content-source-badge";
import { SectionShell } from "@/components/section-shell";
import { getContentSnapshot } from "@/lib/content";
import { getCurrentEntitlements } from "@/lib/session";

export default async function LibraryPage() {
  const snapshot = await getContentSnapshot();
  const entitlements = await getCurrentEntitlements();

  return (
    <main>
      <SectionShell
        eyebrow="Library"
        title="Content, templates, and member-only drops"
        description="Each content item declares the entitlements required to unlock it."
      >
        <div className="mb-6">
          <ContentSourceBadge source={snapshot.source} />
        </div>
        {snapshot.error ? (
          <div className="mb-6 rounded-[24px] border border-clay/30 bg-[#fff1ea] px-5 py-4 text-sm text-cocoa">
            Supabase content query failed: {snapshot.error}
          </div>
        ) : null}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {snapshot.items.map((item) => (
            <ContentCard
              key={item.id}
              item={item}
              locked={!hasEntitlement(entitlements, item.requiredEntitlements)}
            />
          ))}
        </div>
        {!snapshot.error && snapshot.items.length === 0 ? (
          <div className="mt-6 rounded-[24px] border border-dune bg-shell px-5 py-4 text-sm text-cocoa/75">
            No content has been published yet.
          </div>
        ) : null}
      </SectionShell>
    </main>
  );
}
