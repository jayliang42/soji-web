import Link from "next/link";
import type { MembershipPlan } from "@soji/types";
import { cn } from "@/lib/utils";

export function PlanCard({ plan }: { plan: MembershipPlan }) {
  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-3xl border border-darktext/15 bg-white p-8 shadow-xl transition-all duration-200 hover:shadow-2xl",
        plan.featured && "border-darktext bg-white ring-2 ring-darktext/20"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-darktext/60">
            {plan.name}
          </p>
          <h3 className="mt-4 font-display text-5xl leading-none text-darktext font-bold">
            ${plan.monthlyPrice}
            <span className="ml-3 text-base font-medium tracking-wide text-darktext/60">
              / month
            </span>
          </h3>
        </div>
        {plan.featured ? (
          <span className="rounded-full bg-darktext px-4 py-2 text-xs font-bold uppercase tracking-wider text-brightwhite shadow-lg">
            Core
          </span>
        ) : null}
      </div>
      <p className="mt-6 text-lg leading-relaxed text-darktext/80 font-medium">{plan.description}</p>
      <div className="mt-10 h-px bg-darktext/10" />
      <ul className="mt-10 space-y-5 text-base text-darktext/85">
        {plan.entitlements.map((entitlement) => (
          <li key={entitlement} className="flex items-start gap-4">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-checkgreen flex items-center justify-center mt-0.5">
              <span className="text-white text-xs font-bold">✓</span>
            </div>
            <span className="leading-relaxed font-medium">{entitlement}</span>
          </li>
        ))}
      </ul>
      <div className="mt-10">
        <Link
          href="/login"
          className="block w-full rounded-full bg-black px-6 py-4 text-center text-sm font-bold tracking-wide text-white hover:bg-gray-800 transition-all duration-200 shadow-lg"
        >
          Join {plan.name}
        </Link>
      </div>
    </div>
  );
}
