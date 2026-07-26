import { membershipPlans } from "@soji/domain";
import { PlanCard } from "@/components/plan-card";

export function MembershipPlanGrid({
  checkoutEnabled = false,
  customerEmail = null,
  hasExistingMembership = false
}: {
  checkoutEnabled?: boolean;
  customerEmail?: string | null;
  hasExistingMembership?: boolean;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {membershipPlans.map((plan) => (
        <PlanCard
          key={plan.id}
          checkoutEnabled={checkoutEnabled}
          customerEmail={customerEmail}
          hasExistingMembership={hasExistingMembership}
          plan={plan}
        />
      ))}
    </div>
  );
}
