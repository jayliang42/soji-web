import type { MembershipPlan } from "@soji/types";
import { cn } from "@/lib/utils";

export function PlanCard({ plan }: { plan: MembershipPlan }) {
  return (
    <div
      className={cn(
        "rounded-[32px] border border-dune bg-shell p-6 shadow-sm",
        plan.featured && "border-clay ring-2 ring-clay/20"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-cocoa/60">
            {plan.name}
          </p>
          <h3 className="mt-2 font-display text-3xl text-cocoa">
            ${plan.monthlyPrice}
            <span className="ml-2 text-base text-cocoa/60">/ month</span>
          </h3>
        </div>
        {plan.featured ? (
          <span className="rounded-full bg-clay px-3 py-1 text-sm text-white">
            Core
          </span>
        ) : null}
      </div>
      <p className="mt-4 text-cocoa/75">{plan.description}</p>
      <ul className="mt-6 space-y-3 text-sm text-cocoa/90">
        {plan.entitlements.map((entitlement) => (
          <li key={entitlement} className="rounded-full bg-sand px-4 py-2">
            {entitlement}
          </li>
        ))}
      </ul>
    </div>
  );
}
