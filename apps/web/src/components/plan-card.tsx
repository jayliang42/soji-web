import Link from "next/link";
import type { MembershipPlan } from "@soji/types";
import { PlanCheckoutButton } from "@/components/plan-checkout-button";
import { getEntitlementLabel } from "@/lib/entitlements";
import { cn } from "@/lib/utils";

const planGuidance: Partial<Record<
  MembershipPlan["id"],
  {
    bestFor: string;
    outcome: string;
  }
>> = {
  free: {
    bestFor: "想在购买前先浏览公开预览的读者。",
    outcome: "了解内容风格和理财理念。"
  },
  tier_1: {
    bestFor: "希望一次解锁 GS学院全部资源的读者。",
    outcome: "获得完整资料库、全部电子产品、线上支持和后续会员内容。"
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
  const guidance = planGuidance[plan.id] ?? planGuidance.tier_1!;

  return (
    <article
      aria-labelledby={`plan-${plan.id}-name`}
      id={`plan-${plan.id}`}
      className={cn(
        "flex h-full scroll-mt-28 flex-col rounded-lg border border-dune bg-shell p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl motion-reduce:transform-none sm:p-8",
        plan.featured && "border-cocoa bg-white ring-2 ring-clay/25"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3
            className="text-xs font-bold uppercase text-cocoa/70"
            id={`plan-${plan.id}-name`}
          >
            {plan.name}
          </h3>
          <p className="mt-4 font-display text-5xl font-bold leading-none text-cocoa">
            ${plan.price}
            <span className="ml-3 text-base font-medium text-cocoa/58">
              一次性付款
            </span>
          </p>
        </div>
        {plan.featured ? (
          <span className="rounded-full bg-cocoa px-4 py-2 text-xs font-bold uppercase text-white">
            最受欢迎
          </span>
        ) : null}
      </div>
      <p className="mt-6 text-lg font-medium leading-relaxed text-cocoa/78">
        {plan.description}
      </p>
      <div className="mt-7 grid gap-3 border-l-4 border-dune pl-5 text-sm leading-6 text-cocoa/76">
        <p>
          <span className="font-bold text-cocoa">适合： </span>
          {guidance.bestFor}
        </p>
        <p>
          <span className="font-bold text-cocoa">你将获得： </span>
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
            管理现有会员
          </Link>
        ) : checkoutEnabled || customerEmail ? (
          <PlanCheckoutButton
            checkoutEnabled={checkoutEnabled}
            customerEmail={customerEmail}
            label="解锁全部内容"
            lookupKey={plan.stripePriceLookupKey ?? null}
            planId={plan.id}
          />
        ) : (
          <Link
            href="/login?next=/pricing"
            className="block w-full rounded-md bg-cocoa px-6 py-4 text-center text-sm font-bold text-white transition-colors hover:bg-charcoal"
          >
            创建账号并解锁 {plan.name}
          </Link>
        )}
        <p
          aria-label={`${plan.name} 付款说明`}
          className="mt-4 text-center text-xs font-medium leading-5 text-cocoa/70"
        >
          <strong className="font-bold text-cocoa">
            一次性付款 ${plan.price} 美元。
          </strong>{" "}
          Full Access 不会自动续费。
        </p>
      </div>
    </article>
  );
}
