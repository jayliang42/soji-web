export const BILLING_PROCESSING_LEASE_MS = 120_000;

export function getBillingRetryDescription(eventType: string) {
  return eventType === "admin.billing.reconcile"
    ? "Retry uses the stored Stripe identifier and refreshes the current subscription state."
    : "Retry loads the original event from Stripe and runs the same idempotent processor.";
}

export function isBillingProcessingLeaseActive(
  status: string,
  processingStartedAt: string | null,
  now = Date.now()
) {
  if (status !== "processing" || !processingStartedAt) {
    return false;
  }

  const startedAt = Date.parse(processingStartedAt);
  return Number.isFinite(startedAt) && now - startedAt < BILLING_PROCESSING_LEASE_MS;
}
