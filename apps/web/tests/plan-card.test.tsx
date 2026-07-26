import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { membershipPlans } from "@soji/domain";
import { PlanCard } from "@/components/plan-card";

describe("membership plan card", () => {
  it("routes an existing member to account management instead of checkout", () => {
    const html = renderToStaticMarkup(
      <PlanCard
        checkoutEnabled
        customerEmail="member@example.com"
        hasExistingMembership
        plan={membershipPlans[0]!}
      />
    );

    expect(html).toContain('href="/account"');
    expect(html).toContain("Manage existing membership");
    expect(html).not.toContain("Join Tier");
  });
});
