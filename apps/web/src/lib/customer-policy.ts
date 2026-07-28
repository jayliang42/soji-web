export const customerPolicyRoutes = {
  disclaimer: "/financial-disclaimer",
  privacy: "/privacy",
  refund: "/refund-policy",
  support: "/support",
  terms: "/terms"
} as const;

export type CustomerPolicyReadinessReason =
  | "policies_not_approved"
  | "stripe_terms_acceptance_not_ready"
  | "support_destination_invalid"
  | "support_destination_placeholder"
  | "support_destination_required"
  | "support_destination_unsafe";

export type CustomerPolicyConfiguration = {
  policiesApproved?: string;
  stripeTermsAcceptanceReady?: string;
  supportUrl?: string;
};

export type CustomerPolicyReadiness = {
  ready: boolean;
  reasons: CustomerPolicyReadinessReason[];
  supportUrl: string | null;
};

type SupportDestinationValidation =
  | { ok: true; value: string }
  | { ok: false; reason: CustomerPolicyReadinessReason };

const placeholderDomains = ["example.com", "example.org", "example.net"];

function isPlaceholderDomain(hostname: string) {
  return placeholderDomains.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  );
}

function isLocalOrPrivateHost(hostname: string) {
  const normalized = hostname.replace(/^\[|\]$/gu, "").toLowerCase();
  if (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/u.test(normalized)
  ) {
    return true;
  }

  const octets = normalized.split(".").map(Number);
  if (
    octets.length !== 4 ||
    octets.some(
      (octet, index) =>
        !Number.isInteger(octet) ||
        octet < 0 ||
        octet > 255 ||
        !/^\d{1,3}$/u.test(normalized.split(".")[index] ?? "")
    )
  ) {
    return false;
  }

  const [first, second] = octets;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second! >= 64 && second! <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second! >= 16 && second! <= 31) ||
    (first === 192 && second === 168)
  );
}

export function validateSupportDestination(
  configuredValue: string | undefined
): SupportDestinationValidation {
  const value = configuredValue?.trim() ?? "";
  if (!value) {
    return { ok: false, reason: "support_destination_required" };
  }

  if (value.length > 2_048) {
    return { ok: false, reason: "support_destination_invalid" };
  }

  let destination: URL;
  try {
    destination = new URL(value);
  } catch {
    return { ok: false, reason: "support_destination_invalid" };
  }

  if (destination.protocol === "mailto:") {
    const address = destination.pathname.toLowerCase();
    const [, domain] = address.match(/^[^@\s]+@([^@\s]+)$/u) ?? [];
    if (!domain || destination.search || destination.hash) {
      return { ok: false, reason: "support_destination_invalid" };
    }
    if (isPlaceholderDomain(domain)) {
      return { ok: false, reason: "support_destination_placeholder" };
    }
    return { ok: true, value: `mailto:${address}` };
  }

  if (
    destination.protocol !== "https:" ||
    destination.username ||
    destination.password
  ) {
    return { ok: false, reason: "support_destination_unsafe" };
  }

  const hostname = destination.hostname.toLowerCase();
  if (!hostname) {
    return { ok: false, reason: "support_destination_invalid" };
  }
  if (isPlaceholderDomain(hostname)) {
    return { ok: false, reason: "support_destination_placeholder" };
  }
  if (isLocalOrPrivateHost(hostname)) {
    return { ok: false, reason: "support_destination_unsafe" };
  }

  return { ok: true, value: destination.toString() };
}

function isApproved(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

export function getCustomerPolicyReadiness(
  configuration: CustomerPolicyConfiguration = {
    policiesApproved: process.env.SOJI_POLICIES_APPROVED,
    stripeTermsAcceptanceReady:
      process.env.STRIPE_TERMS_ACCEPTANCE_READY,
    supportUrl: process.env.NEXT_PUBLIC_SUPPORT_URL
  }
): CustomerPolicyReadiness {
  const support = validateSupportDestination(configuration.supportUrl);
  const reasons: CustomerPolicyReadinessReason[] = [];

  if (!support.ok) {
    reasons.push(support.reason);
  }
  if (!isApproved(configuration.policiesApproved)) {
    reasons.push("policies_not_approved");
  }
  if (!isApproved(configuration.stripeTermsAcceptanceReady)) {
    reasons.push("stripe_terms_acceptance_not_ready");
  }

  return {
    ready: reasons.length === 0,
    reasons,
    supportUrl: support.ok ? support.value : null
  };
}

export function getPublicSupportDestination() {
  return validateSupportDestination(process.env.NEXT_PUBLIC_SUPPORT_URL);
}
