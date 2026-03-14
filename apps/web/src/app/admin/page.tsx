import { adminMetrics, officeHourSessions } from "@soji/domain";
import { AdminMetrics } from "@/components/admin-metrics";
import { AdminContentForm } from "@/components/admin-content-form";
import { SectionShell } from "@/components/section-shell";
import { getContentSnapshot } from "@/lib/content";
import { getSessionSnapshot } from "@/lib/session";

export default async function AdminPage() {
  const session = await getSessionSnapshot();
  const contentSnapshot = await getContentSnapshot();
  const canPublish = Boolean(
    session.user &&
      (session.user.roles.includes("admin") || session.user.roles.includes("editor"))
  );

  return (
    <main>
      <SectionShell
        eyebrow="Admin"
        title="Lightweight editorial and membership operations"
        description="This scaffold is where content CRUD, upload flows, plan mappings, and event management should live."
      >
        <div className="mb-6 rounded-[24px] border border-dune bg-shell p-5 text-sm text-cocoa/80">
          Promote your main account with `supabase/publisher-setup.sql`. Once that
          account is `editor/admin`, content published into Supabase can be consumed
          by both the website and the app.
        </div>
        <div className="mb-6 rounded-[24px] border border-dune bg-shell p-5 text-sm text-cocoa/80">
          Current publisher state:{" "}
          {canPublish
            ? `enabled for ${session.user?.email}`
            : "read-only. Sign in with an editor/admin account to publish."}
        </div>
        <AdminMetrics metrics={adminMetrics} />
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[28px] border border-dune bg-shell p-6">
            <h3 className="font-display text-3xl text-cocoa">Content Queue</h3>
            {contentSnapshot.error ? (
              <div className="mt-4 rounded-[20px] bg-[#fff1ea] p-4 text-sm text-cocoa">
                Supabase content query failed: {contentSnapshot.error}
              </div>
            ) : null}
            <div className="mt-4 space-y-4">
              {contentSnapshot.items.map((item) => (
                <div key={item.id} className="rounded-[20px] bg-sand p-4">
                  <p className="font-semibold text-cocoa">{item.title}</p>
                  <p className="mt-1 text-sm text-cocoa/70">
                    {item.type} · {item.visibility}
                  </p>
                </div>
              ))}
              {!contentSnapshot.error && contentSnapshot.items.length === 0 ? (
                <div className="rounded-[20px] bg-sand p-4 text-sm text-cocoa/70">
                  No content published yet.
                </div>
              ) : null}
            </div>
          </div>
          <div className="grid gap-6">
            <AdminContentForm enabled={canPublish} />
            <div className="rounded-[28px] border border-dune bg-shell p-6">
              <h3 className="font-display text-3xl text-cocoa">Office Hours</h3>
              <div className="mt-4 space-y-4">
                {officeHourSessions.map((session) => (
                  <div key={session.id} className="rounded-[20px] bg-sand p-4">
                    <p className="font-semibold text-cocoa">{session.title}</p>
                    <p className="mt-1 text-sm text-cocoa/70">{session.startsAt}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </SectionShell>
    </main>
  );
}
