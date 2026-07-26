import { describe, expect, it, vi } from "vitest";
import { persistSupabaseCookies } from "@/lib/supabase/server";

const cookies = [
  {
    name: "sb-access-token",
    options: { httpOnly: true, path: "/" },
    value: "access"
  },
  {
    name: "sb-refresh-token",
    options: { httpOnly: true, path: "/" },
    value: "refresh"
  }
];

describe("Supabase server cookie persistence", () => {
  it("writes refreshed cookies when the current Next.js context allows it", () => {
    const set = vi.fn();

    persistSupabaseCookies({ set }, cookies);

    expect(set).toHaveBeenCalledTimes(2);
    expect(set).toHaveBeenNthCalledWith(
      1,
      "sb-access-token",
      "access",
      cookies[0].options
    );
  });

  it("ignores the expected Server Component cookie-write restriction", () => {
    const set = vi.fn(() => {
      throw new Error(
        "Cookies can only be modified in a Server Action or Route Handler."
      );
    });

    expect(() => persistSupabaseCookies({ set }, cookies)).not.toThrow();
  });

  it("does not hide unexpected cookie persistence failures", () => {
    const set = vi.fn(() => {
      throw new Error("cookie_store_unavailable");
    });

    expect(() => persistSupabaseCookies({ set }, cookies)).toThrow(
      "cookie_store_unavailable"
    );
  });
});
