import { adminMetrics, officeHourSessions, sampleLibrary } from "@soji/domain";
import { AdminMetrics } from "@/components/admin-metrics";
import { SectionShell } from "@/components/section-shell";

export default function AdminPage() {
  return (
    <main>
      <SectionShell
        eyebrow="Admin"
        title="Lightweight editorial and membership operations"
        description="This scaffold is where content CRUD, upload flows, plan mappings, and event management should live."
      >
        <AdminMetrics metrics={adminMetrics} />
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[28px] border border-dune bg-shell p-6">
            <h3 className="font-display text-3xl text-cocoa">Content Queue</h3>
            <div className="mt-4 space-y-4">
              {sampleLibrary.map((item) => (
                <div key={item.id} className="rounded-[20px] bg-sand p-4">
                  <p className="font-semibold text-cocoa">{item.title}</p>
                  <p className="mt-1 text-sm text-cocoa/70">
                    {item.type} · {item.visibility}
                  </p>
                </div>
              ))}
            </div>
          </div>
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
      </SectionShell>
    </main>
  );
}
