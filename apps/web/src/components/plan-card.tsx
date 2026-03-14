import type { MembershipPlan } from "@soji/types";
import { cn } from "@/lib/utils";

export function PlanCard({ plan }: { plan: MembershipPlan }) {
  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-[28px] border border-black/10 bg-[#f8f3eb] p-8 shadow-[0_18px_50px_rgba(17,17,17,0.08)]",
        plan.featured && "border-black bg-[#fff1c8]"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.72rem] uppercase tracking-[0.24em] text-cocoa/56">
            {plan.name}
          </p>
          <h3 className="mt-3 font-display text-5xl leading-none text-cocoa">
            ${plan.monthlyPrice}
            <span className="ml-2 text-base uppercase tracking-[0.18em] text-cocoa/56">
              / month
            </span>
          </h3>
        </div>
        {plan.featured ? (
          <span className="rounded-full border border-black/10 bg-black px-3 py-1 text-[0.7rem] uppercase tracking-[0.22em] text-white">
            Core
          </span>
        ) : null}
      </div>
      <p className="mt-5 text-base leading-7 text-cocoa/72">{plan.description}</p>
      <div className="mt-8 h-px bg-black/6" />
      <ul className="mt-8 space-y-4 text-sm text-cocoa/88">
        {plan.entitlements.map((entitlement) => (
          <li key={entitlement} className="flex items-start gap-3">
            <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-cocoa" />
            <span className="leading-6">{entitlement}</span>
          </li>
        ))}
      </ul>
      <div className="mt-8">
        <span className="inline-flex rounded-full border border-cocoa px-5 py-3 text-[0.72rem] uppercase tracking-[0.24em] text-cocoa">
          Join {plan.name}
        </span>
      </div>
    </div>
  );
}
