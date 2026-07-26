const deliveredPurchaseStatuses = new Set([
  "paid",
  "no_payment_required",
  "partially_refunded"
]);

const accessBlockingDisputeStatuses = new Set([
  "warning_needs_response",
  "warning_under_review",
  "needs_response",
  "under_review",
  "lost"
]);

export function isDeliveredPurchaseStatus(status: string): boolean {
  return deliveredPurchaseStatuses.has(status);
}

export function isPurchaseDisputeBlockingAccess(
  status: string | null | undefined
): boolean {
  return Boolean(status && accessBlockingDisputeStatuses.has(status));
}

export function isPurchaseDownloadAllowed(
  purchaseStatus: string,
  disputeStatus: string | null | undefined
): boolean {
  return (
    isDeliveredPurchaseStatus(purchaseStatus) &&
    !isPurchaseDisputeBlockingAccess(disputeStatus)
  );
}
