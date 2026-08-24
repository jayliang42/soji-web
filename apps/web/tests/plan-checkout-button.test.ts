import { describe, expect, it } from "vitest";
import {
  maskEmail,
  shouldRememberMembershipCheckoutSession
} from "@/components/plan-checkout-button";

describe("membership checkout presentation", () => {
  it("only stores the authenticated checkout return marker", () => {
    expect(shouldRememberMembershipCheckoutSession(null)).toBe(false);
    expect(
      shouldRememberMembershipCheckoutSession("member@example.com")
    ).toBe(true);
  });

  it("never displays the full signed-in email beside the CTA", () => {
    expect(maskEmail("member@example.com")).toBe("m***@example.com");
    expect(maskEmail("not-an-email")).toBe("当前登录账号");
  });
});
