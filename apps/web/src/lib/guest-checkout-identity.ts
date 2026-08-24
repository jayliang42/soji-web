import { createHmac, randomUUID } from "node:crypto";
import { isIP } from "node:net";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const guestCheckoutBrowserCookieName = "soji_guest_checkout_browser";
export const guestCheckoutRequestCookieName = "soji_guest_checkout_request";

export function normalizeGuestCheckoutEmail(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  const separator = normalized.lastIndexOf("@");
  if (
    normalized.length > 320 ||
    separator <= 0 ||
    separator === normalized.length - 1
  ) {
    return null;
  }

  return normalized;
}

export function createGuestCheckoutHmac({
  purpose,
  secret,
  value
}: {
  purpose: "browser" | "email" | "network";
  secret: string | null | undefined;
  value: string;
}) {
  if (!secret || secret !== secret.trim() || secret.length < 32) {
    return null;
  }

  return createHmac("sha256", secret)
    .update(`soji:guest-checkout:${purpose}:v1\0${value}`, "utf8")
    .digest("hex");
}

export function getGuestCheckoutNetworkHmac(
  address: string | null | undefined,
  secret: string | null | undefined
) {
  const normalizedAddress = address?.trim().toLowerCase();
  const addressFamily = normalizedAddress ? isIP(normalizedAddress) : 0;
  if (!normalizedAddress || addressFamily === 0 || normalizedAddress.includes("%")) {
    return null;
  }

  let networkIdentity = normalizedAddress;
  if (addressFamily === 6) {
    const hostname = new URL(`http://[${normalizedAddress}]/`).hostname.slice(1, -1);
    const [head = "", tail = ""] = hostname.split("::");
    const headParts = head ? head.split(":") : [];
    const tailParts = tail ? tail.split(":") : [];
    const missingParts = 8 - headParts.length - tailParts.length;
    if (missingParts < 0) {
      return null;
    }
    const parts = [
      ...headParts,
      ...Array.from({ length: missingParts }, () => "0"),
      ...tailParts
    ];
    if (parts.length !== 8) {
      return null;
    }
    networkIdentity = `${parts
      .slice(0, 4)
      .map((part) => part.padStart(4, "0"))
      .join(":")}::/64`;
  }

  return createGuestCheckoutHmac({
    purpose: "network",
    secret,
    value: networkIdentity
  });
}

export function getGuestCheckoutEmailHmac(
  email: string | null | undefined,
  secret: string | null | undefined
) {
  const normalizedEmail = normalizeGuestCheckoutEmail(email);
  return normalizedEmail
    ? createGuestCheckoutHmac({
        purpose: "email",
        secret,
        value: normalizedEmail
      })
    : null;
}

export function resolveGuestCheckoutBrowserId(value: string | undefined) {
  if (value && uuidPattern.test(value)) {
    return { browserId: value, isNew: false } as const;
  }

  return { browserId: randomUUID(), isNew: true } as const;
}

export function getGuestCheckoutBrowserHmac(
  browserId: string,
  secret: string | null | undefined
) {
  if (!uuidPattern.test(browserId)) {
    return null;
  }

  return createGuestCheckoutHmac({
    purpose: "browser",
    secret,
    value: browserId
  });
}
