import Link from "next/link";
import type { Route } from "next";

interface AdminWorkspaceGuideProps {
  canInspectBilling: boolean;
  canPublish: boolean;
  contentCount: number;
  officeHourCount: number;
  productCount: number;
}

interface Workspace {
  action: string;
  description: string;
  href: Route;
  id: string;
  label: string;
  meta: string;
  permitted: boolean;
}

function countLabel(count: number, singular: string) {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

export function AdminWorkspaceGuide({
  canInspectBilling,
  canPublish,
  contentCount,
  officeHourCount,
  productCount
}: AdminWorkspaceGuideProps) {
  const workspaces: Workspace[] = [
    {
      action: "Open content workspace",
      description:
        "Draft, revise, publish, and verify the access level of every guide.",
      href: "/admin?view=content",
      id: "01",
      label: "Content",
      meta: countLabel(contentCount, "item"),
      permitted: canPublish
    },
    {
      action: "Open product workspace",
      description:
        "Maintain one-time offers, prices, delivery files, and active status.",
      href: "/admin?view=products",
      id: "02",
      label: "Products",
      meta: countLabel(productCount, "product"),
      permitted: canPublish
    },
    {
      action: "Open Office Hours",
      description:
        "Keep session dates, member destinations, and replay availability current.",
      href: "/admin?view=office-hours",
      id: "03",
      label: "Office hours",
      meta: countLabel(officeHourCount, "session"),
      permitted: canPublish
    },
    {
      action: "Open user workspace",
      description:
        "Find customer accounts and manage audited membership or staff roles.",
      href: "/admin?view=users",
      id: "04",
      label: "Users",
      meta: "Admin only",
      permitted: canInspectBilling
    },
    {
      action: "Open billing workspace",
      description:
        "Review received events, processing outcomes, and supported recovery actions.",
      href: "/admin?view=billing",
      id: "05",
      label: "Billing",
      meta: "Admin only",
      permitted: canInspectBilling
    }
  ];

  return (
    <section
      aria-labelledby="admin-workspaces-heading"
      className="overflow-hidden rounded-xl border border-dune bg-white"
    >
      <div className="grid gap-4 border-b border-dune bg-cream px-5 py-6 sm:px-7 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-clay">
            Workspaces
          </p>
          <h2
            className="mt-3 font-display text-3xl font-semibold leading-tight text-cocoa"
            id="admin-workspaces-heading"
          >
            Move from status to the next operation.
          </h2>
        </div>
        <p className="max-w-2xl text-sm font-medium leading-6 text-cocoa/70">
          Start with the workspace that owns the change. Counts reflect the
          current catalog snapshot; role-restricted operations remain visibly
          unavailable.
        </p>
      </div>

      <nav aria-label="Admin workspaces">
        <ul className="grid list-none divide-y divide-dune p-0 lg:grid-cols-2 lg:divide-y-0">
          {workspaces.map((workspace, index) => (
            <li
              className={`min-w-0 ${
                index > 1 ? "lg:border-t lg:border-dune" : ""
              } ${index % 2 === 1 ? "lg:border-l lg:border-dune" : ""}`}
              key={workspace.href}
            >
              {workspace.permitted ? (
                <Link
                  className="group flex min-h-52 h-full flex-col p-5 transition-colors hover:bg-shell sm:p-7"
                  href={workspace.href}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs font-bold text-clay">
                      {workspace.id}
                    </span>
                    <span className="rounded-full bg-sand px-3 py-1 text-xs font-bold text-cocoa/68">
                      {workspace.meta}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-2xl font-semibold text-cocoa">
                    {workspace.label}
                  </h3>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-cocoa/70">
                    {workspace.description}
                  </p>
                  <span className="mt-auto inline-flex min-h-11 items-end pt-5 text-sm font-bold text-clay underline decoration-clay/30 underline-offset-4 group-hover:decoration-clay">
                    {workspace.action}
                    <span aria-hidden="true" className="ml-2">
                      →
                    </span>
                  </span>
                </Link>
              ) : (
                <article className="flex min-h-52 h-full flex-col bg-cream/55 p-5 sm:p-7">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs font-bold text-cocoa/45">
                      {workspace.id}
                    </span>
                    <span className="rounded-full border border-dune px-3 py-1 text-xs font-bold text-cocoa/58">
                      {workspace.meta}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-2xl font-semibold text-cocoa/72">
                    {workspace.label}
                  </h3>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-cocoa/60">
                    {workspace.description}
                  </p>
                  <p className="mt-auto pt-6 text-sm font-bold text-cocoa/58">
                    Admin role required
                  </p>
                </article>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
