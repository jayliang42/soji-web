import { createHmac, randomUUID } from "node:crypto";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const guestCheckoutBrowserCookieName = "soji_guest_checkout_browser";

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
  purpose: "browser" | "email";
  secret: string | null | undefined;
  value: string;
}) {
  if (!secret) {
    return null;
  }

  return createHmac("sha256", secret)
    .update(`soji:guest-checkout:${purpose}:v1\0${value}`, "utf8")
    .digest("hex");
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
