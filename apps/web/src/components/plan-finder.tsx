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
      "获得完整内容库、全部电子产品、线上支持和后续会员内容。",
    label: "解锁全部内容",
    planId: "tier_1",
    rationale:
      "一次性支付 99 美元即可获得完整 GS学院体验，不会自动续费。"
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
            方案选择助手
          </p>
          <h2
            className="mt-3 max-w-lg font-display text-3xl font-semibold leading-tight sm:text-4xl"
            id="plan-finder-heading"
          >
            找到最适合你的起点
          </h2>
          <p className="mt-4 max-w-[48ch] text-sm leading-6 text-white/70 sm:text-base sm:leading-7">
            选择你最常用的支持方式。结果仅供参考，不是购买要求，也不会改变标价。
          </p>
        </div>

        <div>
          <div
            aria-label="选择你需要的支持"
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
                  推荐方案
                </p>
                <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="font-display text-3xl font-semibold">
                    {selectedPlan.name}
                  </h3>
                  <p className="text-sm font-bold text-cocoa/70">
                    一次性付款 ${selectedPlan.price} 美元
                  </p>
                </div>
                <p className="mt-3 text-sm leading-6 text-cocoa/72">
                  {selectedOption.rationale}
                </p>
                <a
                  className="mt-5 inline-flex min-h-11 items-center rounded-md bg-cocoa px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-charcoal"
                  href={`#plan-${selectedPlan.id}`}
                >
                  查看 {selectedPlan.name}
                </a>
              </div>
            ) : (
              <div className="flex min-h-28 items-center">
                <div>
                  <p className="font-display text-2xl font-semibold">
                    请选择上方最接近的选项
                  </p>
                  <p className="mt-2 text-sm leading-6 text-cocoa/70">
                    创建账号或开始结账前，你仍可以在下方比较所有方案。
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
