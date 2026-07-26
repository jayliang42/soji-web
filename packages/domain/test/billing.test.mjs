import assert from "node:assert/strict";
import test from "node:test";
import {
  getEffectiveMembershipTier,
  isActiveSubscriptionStatus
} from "../src/billing.ts";

test("recognizes only access-granting Stripe subscription statuses", () => {
  assert.equal(isActiveSubscriptionStatus("active"), true);
  assert.equal(isActiveSubscriptionStatus("trialing"), true);
  assert.equal(isActiveSubscriptionStatus("past_due"), false);
  assert.equal(isActiveSubscriptionStatus("canceled"), false);
});

test("returns free when no active subscription remains", () => {
  assert.equal(
    getEffectiveMembershipTier([
      { planId: "tier_3", status: "canceled" },
      { planId: "tier_1", status: "past_due" }
    ]),
    "free"
  );
});

test("keeps the highest tier when another subscription is canceled", () => {
  assert.equal(
    getEffectiveMembershipTier([
      { planId: "tier_1", status: "canceled" },
      { planId: "tier_2", status: "active" },
      { planId: "tier_3", status: "trialing" }
    ]),
    "tier_3"
  );
});
