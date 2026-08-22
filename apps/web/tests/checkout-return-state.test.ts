import { describe, expect, it } from "vitest";
import {
  getCheckoutReturnAction,
  getCleanCancelledCheckoutHref,
  parseCheckoutReturnMarker
} from "@/lib/checkout-return-state";

describe("checkout return state", () => {
  it("accepts only a valid Checkout Session marker", () => {
    expect(
      parseCheckoutReturnMarker(
        JSON.stringify({ sessionId: "cs_test_checkoutreturn001" })
      )
    ).toEqual({ sessionId: "cs_test_checkoutreturn001" });
    expect(parseCheckoutReturnMarker('{"sessionId":"cs_live_bad!"}')).toBeNull();
    expect(parseCheckoutReturnMarker('{"sessionId":"cs_test_checkout","extra":true}')).toBeNull();
  });

  it("cancels on either Stripe cancellation redirect or browser history return", () => {
    expect(
      getCheckoutReturnAction({
        isHistoryNavigation: false,
        search: "?checkout=cancelled"
      })
    ).toBe("cancel");
    expect(
      getCheckoutReturnAction({
        isHistoryNavigation: true,
        search: ""
      })
    ).toBe("cancel");
  });

  it("clears the marker after a successful Checkout return without cancelling it", () => {
    expect(
      getCheckoutReturnAction({
        isHistoryNavigation: false,
        search: "?checkout=success&session_id=cs_test_checkoutreturn001"
      })
    ).toBe("clear");
  });

  it("removes only cancellation query parameters before reloading the return page", () => {
    expect(
      getCleanCancelledCheckoutHref(
        "https://gr8tfuture.com/pricing?checkout=cancelled#case-study-offers"
      )
    ).toBe("/pricing#case-study-offers");
    expect(
      getCleanCancelledCheckoutHref(
        "https://gr8tfuture.com/products?purchase=cancelled&product=case-study-single&focus=track"
      )
    ).toBe("/products?focus=track");
  });
});
