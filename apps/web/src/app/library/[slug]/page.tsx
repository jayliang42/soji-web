import { notFound } from "next/navigation";
import { hasEntitlement } from "@soji/domain";
import { SectionShell } from "@/components/section-shell";
import { getContentBySlug } from "@/lib/content";
import { getCurrentEntitlements } from "@/lib/session";

export default async function ContentDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = getContentBySlug(slug);
  const entitlements = await getCurrentEntitlements();

  if (!item) {
    notFound();
  }

  const unlocked = hasEntitlement(entitlements, item.requiredEntitlements);

  return (
    <main>
      <SectionShell
        eyebrow={item.type}
        title={item.title}
        description={item.summary}
      >
        <div className="rounded-[32px] border border-dune bg-shell p-8">
          {unlocked ? (
            <div className="space-y-4 text-cocoa/80">
              <p>{item.body}</p>
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
        </div>
      </SectionShell>
    </main>
  );
}
