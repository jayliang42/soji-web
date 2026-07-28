import { describe, expect, it } from "vitest";
import { validateOfficeHourDestination } from "@/lib/launch-inputs";

describe("Office Hours launch destinations", () => {
  it("accepts a real HTTPS destination with path, query, and fragment", () => {
    expect(
      validateOfficeHourDestination(
        "https://cal.com/soji/office-hours?month=2026-08#booking"
      )
    ).toEqual({
      ok: true,
      value: "https://cal.com/soji/office-hours?month=2026-08#booking"
    });
  });

  it.each([
    ["empty", "", "office_hour_url_required"],
    ["HTTP", "http://cal.com/soji", "office_hour_url_https_required"],
    [
      "credentials",
      "https://operator:secret@cal.com/soji",
      "office_hour_url_credentials_forbidden"
    ],
    ["example.com", "https://example.com/soji", "office_hour_url_placeholder_host"],
    [
      "example.org subdomain",
      "https://events.example.org/soji",
      "office_hour_url_placeholder_host"
    ],
    ["example.net", "https://example.net/soji", "office_hour_url_placeholder_host"],
    ["localhost", "https://localhost/soji", "office_hour_url_local_host"],
    ["loopback IPv4", "https://127.0.0.1/soji", "office_hour_url_private_host"],
    ["loopback IPv6", "https://[::1]/soji", "office_hour_url_private_host"],
    ["private 10/8", "https://10.4.2.1/soji", "office_hour_url_private_host"],
    ["private 172/12", "https://172.20.2.1/soji", "office_hour_url_private_host"],
    ["private 192/16", "https://192.168.1.4/soji", "office_hour_url_private_host"],
    ["local hostname", "https://booking.soji.local/soji", "office_hour_url_local_host"],
    ["malformed", "not a destination", "office_hour_url_invalid"],
    [
      "overlong",
      `https://cal.com/${"a".repeat(2_050)}`,
      "office_hour_url_too_long"
    ]
  ])("rejects %s without echoing the input", (_label, value, reason) => {
    const result = validateOfficeHourDestination(value);

    expect(result).toEqual({ ok: false, reason });
    expect(JSON.stringify(result)).not.toContain(value);
  });
});
