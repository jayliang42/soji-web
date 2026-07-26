import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchSupabase,
  SUPABASE_REQUEST_TIMEOUT_MS
} from "@/lib/supabase/fetch";

function abortableFetch() {
  return vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener(
        "abort",
        () => reject(init.signal?.reason),
        { once: true }
      );
    })
  );
}

describe("Supabase fetch timeout", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("aborts a stalled request after the configured timeout", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", abortableFetch());

    const request = fetchSupabase("https://supabase.test/rest/v1/profiles");
    const rejection = expect(request).rejects.toMatchObject({ name: "TimeoutError" });
    await vi.advanceTimersByTimeAsync(SUPABASE_REQUEST_TIMEOUT_MS);

    await rejection;
  });

  it("propagates a caller abort to the underlying request", async () => {
    const fetchMock = abortableFetch();
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    const reason = new Error("request cancelled");

    const request = fetchSupabase("https://supabase.test/auth/v1/user", {
      signal: controller.signal
    });
    controller.abort(reason);

    await expect(request).rejects.toBe(reason);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://supabase.test/auth/v1/user",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("clears its timeout after a completed request", async () => {
    vi.useFakeTimers();
    const response = new Response(null, { status: 204 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    await expect(fetchSupabase("https://supabase.test/rest/v1/plans")).resolves.toBe(
      response
    );
    expect(vi.getTimerCount()).toBe(0);
  });
});
