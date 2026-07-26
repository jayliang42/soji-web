import type {
  LaunchChecklistItem,
  LaunchChecklistStatus
} from "@/lib/admin-launch-checklist";

const statusLabels: Record<LaunchChecklistStatus, string> = {
  manual: "Confirm",
  missing: "Missing",
  ready: "Ready"
};

function statusClassName(status: LaunchChecklistStatus) {
  if (status === "ready") {
    return "bg-success-muted text-success";
  }

  if (status === "missing") {
    return "bg-accent-muted text-clay";
  }

  return "bg-sand text-cocoa/65";
}

export function AdminLaunchChecklist({
  items
}: {
  items: LaunchChecklistItem[];
}) {
  const readyCount = items.filter((item) => item.status === "ready").length;
  const missingCount = items.filter((item) => item.status === "missing").length;
  const manualCount = items.filter((item) => item.status === "manual").length;

  return (
    <section aria-labelledby="launch-checklist-heading" className="border-y border-dune py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 id="launch-checklist-heading" className="font-display text-2xl text-cocoa">
            Launch Checklist
          </h3>
          <p className="mt-2 text-sm text-cocoa/70">
            Environment and operations items to confirm before taking real payments.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold" aria-label="Launch status summary">
          <span className="rounded-md bg-success-muted px-2.5 py-1 text-success">
            {readyCount} ready
          </span>
          <span className="rounded-md bg-accent-muted px-2.5 py-1 text-clay">
            {missingCount} missing
          </span>
          <span className="rounded-md bg-sand px-2.5 py-1 text-cocoa/65">
            {manualCount} confirm
          </span>
        </div>
      </div>

      {missingCount > 0 ? (
        <div className="mt-5 border-l-4 border-clay bg-accent-muted px-4 py-3 text-sm text-cocoa">
          {missingCount} required configuration item{missingCount === 1 ? "" : "s"} still missing.
        </div>
      ) : null}

      <ul className="mt-5 grid gap-3 lg:grid-cols-2">
        {items.map((item) => (
          <li key={item.label} className="rounded-md border border-dune bg-white px-4 py-3.5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-cocoa">{item.label}</p>
                <p className="mt-1 text-sm text-cocoa/65">{item.detail}</p>
              </div>
              <span className={`rounded-md px-3 py-1 text-xs font-semibold ${statusClassName(item.status)}`}>
                {statusLabels[item.status]}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
