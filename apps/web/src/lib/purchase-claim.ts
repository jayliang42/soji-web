export type PurchaseClaimStatus =
  | "claimed"
  | "email_mismatch"
  | "error"
  | "invalid"
  | "processing";

type PurchaseClaimResponse = Pick<Response, "ok" | "status"> & {
  json: () => Promise<unknown>;
};

export type PurchaseClaimFetcher = (
  input: string,
  init: RequestInit
) => Promise<PurchaseClaimResponse>;

export type PurchaseClaimRequestResult =
  | { kind: "redirect"; href: typeof purchaseClaimLoginHref }
  | { kind: "status"; status: PurchaseClaimStatus };

export const purchaseClaimLoginHref = "/login?next=/checkout/claim" as const;

const claimStatuses = new Set<PurchaseClaimStatus>([
  "claimed",
  "email_mismatch",
  "invalid",
  "processing"
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parsePurchaseClaimStatus(
  value: unknown
): Exclude<PurchaseClaimStatus, "error"> | null {
  if (!isRecord(value) || typeof value.status !== "string") {
    return null;
  }

  return claimStatuses.has(value.status as PurchaseClaimStatus)
    ? (value.status as Exclude<PurchaseClaimStatus, "error">)
    : null;
}

export async function requestPendingPurchaseClaim(
  fetcher: PurchaseClaimFetcher = fetch
): Promise<PurchaseClaimRequestResult> {
  let response: PurchaseClaimResponse;
  try {
    response = await fetcher("/api/account/purchases/claim", {
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      method: "POST"
    });
  } catch {
    return { kind: "status", status: "error" };
  }

  if (response.status === 401) {
    return { href: purchaseClaimLoginHref, kind: "redirect" };
  }

  if (!response.ok) {
    return { kind: "status", status: "error" };
  }

  const payload = await response.json().catch(() => null);
  const status = parsePurchaseClaimStatus(payload);
  return {
    kind: "status",
    status: status ?? "error"
  };
}
