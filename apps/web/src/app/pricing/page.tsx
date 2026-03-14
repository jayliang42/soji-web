import { membershipPlans } from "@soji/domain";
import { PlanCard } from "@/components/plan-card";
import { SectionShell } from "@/components/section-shell";

export default function PricingPage() {
  return (
    <main>
      <SectionShell
        eyebrow="Pricing"
        title="Subscriptions for every level of access"
        description="Stripe powers web subscriptions. App Store and Google Play subscriptions map back to the same internal plan IDs."
      >
        <div className="grid gap-6 md:grid-cols-3">
          {membershipPlans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      </SectionShell>
    </main>
  );
}
