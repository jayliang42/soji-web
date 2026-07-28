export type OfficeHourDestinationReason =
  | "office_hour_url_credentials_forbidden"
  | "office_hour_url_https_required"
  | "office_hour_url_invalid"
  | "office_hour_url_local_host"
  | "office_hour_url_placeholder_host"
  | "office_hour_url_private_host"
  | "office_hour_url_required"
  | "office_hour_url_too_long";

export type OfficeHourDestinationValidation =
  | { ok: true; value: string }
  | { ok: false; reason: OfficeHourDestinationReason };

const placeholderHosts = ["example.com", "example.org", "example.net"] as const;

function isPlaceholderHost(hostname: string) {
  return placeholderHosts.some(
    (host) => hostname === host || hostname.endsWith(`.${host}`)
  );
}

function parseIpv4(hostname: string) {
  const parts = hostname.split(".");
  if (
    parts.length !== 4 ||
    parts.some((part) => !/^\d{1,3}$/u.test(part))
  ) {
    return null;
  }

  const octets = parts.map(Number);
  return octets.every((octet) => octet >= 0 && octet <= 255)
    ? octets
    : null;
}

function isPrivateIpv4(hostname: string) {
  const octets = parseIpv4(hostname);
  if (!octets) {
    return false;
  }

  const [first, second] = octets;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function isPrivateIpv6(hostname: string) {
  const normalized = hostname.replace(/^\[|\]$/gu, "").toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/u.test(normalized) ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:169.254.") ||
    normalized.startsWith("::ffff:192.168.")
  );
}

export function validateOfficeHourDestination(
  submittedValue: string
): OfficeHourDestinationValidation {
  const value = submittedValue.trim();
  if (!value) {
    return { ok: false, reason: "office_hour_url_required" };
  }

  if (value.length > 2_048) {
    return { ok: false, reason: "office_hour_url_too_long" };
  }

  let destination: URL;
  try {
    destination = new URL(value);
  } catch {
    return { ok: false, reason: "office_hour_url_invalid" };
  }

  if (destination.protocol !== "https:") {
    return { ok: false, reason: "office_hour_url_https_required" };
  }

  if (destination.username || destination.password) {
    return { ok: false, reason: "office_hour_url_credentials_forbidden" };
  }

  const hostname = destination.hostname.toLowerCase();
  if (!hostname) {
    return { ok: false, reason: "office_hour_url_invalid" };
  }

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  ) {
    return { ok: false, reason: "office_hour_url_local_host" };
  }

  if (isPlaceholderHost(hostname)) {
    return { ok: false, reason: "office_hour_url_placeholder_host" };
  }

  if (isPrivateIpv4(hostname) || isPrivateIpv6(hostname)) {
    return { ok: false, reason: "office_hour_url_private_host" };
  }

  return { ok: true, value: destination.toString() };
}
