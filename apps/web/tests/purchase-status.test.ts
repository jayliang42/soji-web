import { describe, expect, it } from "vitest";
import {
  isPurchaseDisputeBlockingAccess,
  isPurchaseDownloadAllowed
} from "@/lib/purchase-status";

describe("purchase dispute access", () => {
  it.each([
    "warning_needs_response",
    "warning_under_review",
    "needs_response",
    "under_review",
    "lost"
  ])("blocks digital delivery for %s", (status) => {
    expect(isPurchaseDisputeBlockingAccess(status)).toBe(true);
    expect(isPurchaseDownloadAllowed("paid", status)).toBe(false);
  });

  it.each([null, "warning_closed", "won", "prevented"])(
    "allows an otherwise delivered purchase for %s",
    (status) => {
      expect(isPurchaseDisputeBlockingAccess(status)).toBe(false);
      expect(isPurchaseDownloadAllowed("paid", status)).toBe(true);
    }
  );

  it("never restores a refunded purchase after a dispute resolution", () => {
    expect(isPurchaseDownloadAllowed("refunded", "won")).toBe(false);
  });
});
