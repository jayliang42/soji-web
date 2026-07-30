"use client";

import { membershipPlans } from "@soji/domain";
import type { MembershipTier } from "@soji/types";
import { useState } from "react";

type PaidMembershipTier = Exclude<MembershipTier, "free">;

export interface PlanFinderOption {
  description: string;
  label: string;
  planId: PaidMembershipTier;
  rationale: string;
}

export const planFinderOptions: PlanFinderOption[] = [
  {
    description:
      "A focused monthly essay and practical prompts are enough for how you want to learn.",
    label: "Build a calmer monthly rhythm",
    planId: "tier_1",
    rationale:
      "Tier 1 keeps the experience focused: foundational essays and prompts without the larger working library."
  },
  {
    description:
      "You want case studies, templates, the complete archive, and new monthly working material.",
    label: "Use the full working library",
    planId: "tier_2",
    rationale:
      "Tier 2 is the strongest fit when you want to move from reading into repeatable tools, examples, and templates."
  },
  {
    description:
      "You want the full library plus Office Hours and closer support for higher-stakes decisions.",
    label: "Add live guided support",
    planId: "tier_3",
    rationale:
      "Tier 3 adds live Office Hours and direct-access benefits to everything included in the full library."
  }
];

export function getPlanFinderOption(planId: PaidMembershipTier) {
  return planFinderOptions.find((option) => option.planId === planId) ?? null;
}

export function PlanFinder() {
  const [selectedPlanId, setSelectedPlanId] =
    useState<PaidMembershipTier | null>(null);
  const selectedOption = selectedPlanId
    ? getPlanFinderOption(selectedPlanId)
    : null;
  const selectedPlan = selectedPlanId
    ? membershipPlans.find((plan) => plan.id === selectedPlanId) ?? null
    : null;

  return (
    <section
      aria-labelledby="plan-finder-heading"
      className="overflow-hidden rounded-xl bg-cocoa p-6 text-white sm:p-8 lg:p-10"
    >
      <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:gap-12">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/60">
            Plan finder
          </p>
          <h2
            className="mt-3 max-w-lg font-display text-3xl font-semibold leading-tight sm:text-4xl"
            id="plan-finder-heading"
          >
            Find your best starting point.
          </h2>
          <p className="mt-4 max-w-[48ch] text-sm leading-6 text-white/70 sm:text-base sm:leading-7">
            Choose the kind of support you expect to use most. The result is a
            guide—not a requirement—and never changes the listed price.
          </p>
        </div>

        <div>
          <div
            aria-label="Choose the support you need"
            className="grid gap-2"
            role="group"
          >
            {planFinderOptions.map((option) => {
              const selected = option.planId === selectedPlanId;

              return (
                <button
                  aria-pressed={selected}
                  className={`min-h-11 rounded-lg border px-4 py-4 text-left transition-colors sm:px-5 ${
                    selected
                      ? "border-white bg-white text-cocoa"
                      : "border-white/20 bg-white/5 text-white hover:bg-white/10"
                  }`}
                  key={option.planId}
                  onClick={() => setSelectedPlanId(option.planId)}
                  type="button"
                >
                  <span className="block text-sm font-bold">{option.label}</span>
                  <span
                    className={`mt-1 block text-sm leading-6 ${
                      selected ? "text-cocoa/70" : "text-white/60"
                    }`}
                  >
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            aria-live="polite"
            className="mt-4 min-h-40 rounded-lg bg-white p-5 text-cocoa sm:p-6"
          >
            {selectedOption && selectedPlan ? (
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-clay">
                  Your best starting point
                </p>
                <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="font-display text-3xl font-semibold">
                    {selectedPlan.name}
                  </h3>
                  <p className="text-sm font-bold text-cocoa/70">
                    ${selectedPlan.monthlyPrice} / month
                  </p>
                </div>
                <p className="mt-3 text-sm leading-6 text-cocoa/72">
                  {selectedOption.rationale}
                </p>
                <a
                  className="mt-5 inline-flex min-h-11 items-center rounded-md bg-cocoa px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-charcoal"
                  href={`#plan-${selectedPlan.id}`}
                >
                  Review {selectedPlan.name}
                </a>
              </div>
            ) : (
              <div className="flex min-h-28 items-center">
                <div>
                  <p className="font-display text-2xl font-semibold">
                    Choose the closest match above.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-cocoa/70">
                    You can still compare every plan below before creating an
                    account or starting checkout.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
