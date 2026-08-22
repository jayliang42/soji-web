export type CheckoutReturnAction = "cancel" | "clear" | "none";

export type CheckoutReturnMarker = {
  sessionId: string;
};

export const checkoutReturnStorageKey = "soji.checkout.return.v1";

const checkoutSessionIdPattern = /^cs_(?:test|live)_[A-Za-z0-9]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseCheckoutReturnMarker(
  value: string | null
): CheckoutReturnMarker | null {
  if (!value) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (
      !isRecord(parsed) ||
      Object.keys(parsed).length !== 1 ||
      typeof parsed.sessionId !== "string" ||
      !checkoutSessionIdPattern.test(parsed.sessionId)
    ) {
      return null;
    }

    return { sessionId: parsed.sessionId };
  } catch {
    return null;
  }
}

export function getCheckoutReturnAction({
  isHistoryNavigation,
  search
}: {
  isHistoryNavigation: boolean;
  search: string;
}): CheckoutReturnAction {
  const params = new URLSearchParams(search);
  const isSuccessfulReturn =
    params.get("checkout") === "success" || params.get("purchase") === "success";
  if (isSuccessfulReturn) {
    return "clear";
  }

  const isCancelledReturn =
    params.get("checkout") === "cancelled" ||
    params.get("purchase") === "cancelled";
  if (isCancelledReturn || isHistoryNavigation) {
    return "cancel";
  }

  return "none";
}

export function getCleanCancelledCheckoutHref(value: string) {
  const url = new URL(value);

  if (url.searchParams.get("checkout") === "cancelled") {
    url.searchParams.delete("checkout");
  }
  if (url.searchParams.get("purchase") === "cancelled") {
    url.searchParams.delete("purchase");
    url.searchParams.delete("product");
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
