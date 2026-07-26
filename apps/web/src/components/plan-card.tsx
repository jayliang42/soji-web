import Link from "next/link";
import type { MembershipPlan } from "@soji/types";
import { PlanCheckoutButton } from "@/components/plan-checkout-button";
import { getEntitlementLabel } from "@/lib/entitlements";
import { cn } from "@/lib/utils";

const planGuidance: Record<
  MembershipPlan["id"],
  {
    bestFor: string;
    outcome: string;
  }
> = {
  free: {
    bestFor: "Browsing public previews before committing.",
    outcome: "A clear read on the editorial voice and money philosophy."
  },
  tier_1: {
    bestFor: "Readers who want a calmer monthly money rhythm.",
    outcome: "Foundational essays and practical prompts you can use right away."
  },
  tier_2: {
    bestFor: "Members who want the full working library.",
    outcome: "Case studies, templates, and monthly drops in one core membership."
  },
  tier_3: {
    bestFor: "Families who want closer support and live access.",
    outcome: "Everything in Tier 2 plus office hours and private group access."
  }
};

export function PlanCard({
  checkoutEnabled = false,
  customerEmail = null,
  hasExistingMembership = false,
  plan
}: {
  checkoutEnabled?: boolean;
  customerEmail?: string | null;
  hasExistingMembership?: boolean;
  plan: MembershipPlan;
}) {
  const guidance = planGuidance[plan.id];

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-lg border border-dune bg-shell p-8 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl",
        plan.featured && "border-cocoa bg-white ring-2 ring-clay/25"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase text-cocoa/70">
            {plan.name}
          </p>
          <h3 className="mt-4 font-display text-5xl font-bold leading-none text-cocoa">
            ${plan.monthlyPrice}
            <span className="ml-3 text-base font-medium text-cocoa/58">
              / month
            </span>
          </h3>
        </div>
        {plan.featured ? (
          <span className="rounded-full bg-cocoa px-4 py-2 text-xs font-bold uppercase text-white">
            Core
          </span>
        ) : null}
      </div>
      <p className="mt-6 text-lg font-medium leading-relaxed text-cocoa/78">
        {plan.description}
      </p>
      <div className="mt-7 grid gap-3 border-l-4 border-dune pl-5 text-sm leading-6 text-cocoa/76">
        <p>
          <span className="font-bold text-cocoa">Best for: </span>
          {guidance.bestFor}
        </p>
        <p>
          <span className="font-bold text-cocoa">Outcome: </span>
          {guidance.outcome}
        </p>
      </div>
      <div className="mt-8 h-px bg-dune" />
      <ul className="mt-8 space-y-5 text-base text-cocoa/82">
        {plan.entitlements.map((entitlement) => (
          <li key={entitlement} className="flex items-start gap-4">
            <div
              aria-hidden="true"
              className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-checkgreen"
            >
              <span className="text-white text-xs font-bold">
                ✓
              </span>
            </div>
            <span className="leading-relaxed font-medium">
              {getEntitlementLabel(entitlement)}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-10">
        {hasExistingMembership ? (
          <Link
            href="/account"
            className="block w-full rounded-md bg-cocoa px-6 py-4 text-center text-sm font-bold text-white transition-colors hover:bg-charcoal"
          >
            Manage existing membership
          </Link>
        ) : checkoutEnabled || customerEmail ? (
          <PlanCheckoutButton
            accountLabel={`Create account to join ${plan.name}`}
            checkoutEnabled={checkoutEnabled}
            customerEmail={customerEmail}
            label={`Join ${plan.name}`}
            lookupKey={plan.stripePriceLookupKey ?? null}
            planId={plan.id}
          />
        ) : (
          <Link
            href="/login?next=/pricing"
            className="block w-full rounded-md bg-cocoa px-6 py-4 text-center text-sm font-bold text-white transition-colors hover:bg-charcoal"
          >
            Create account to join {plan.name}
          </Link>
        )}
        <p className="mt-4 text-center text-xs font-medium text-cocoa/70">
          {hasExistingMembership
            ? "View billing status or manage your subscription from your account."
            : "Billed monthly. Manage or cancel from your account."}
        </p>
      </div>
    </div>
  );
}
