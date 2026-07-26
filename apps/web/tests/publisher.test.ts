import { AuthSessionMissingError, type SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const publisherMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  reportOperationalError: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: publisherMocks.createSupabaseServerClient
}));
vi.mock("@/lib/observability", () => ({
  reportOperationalError: publisherMocks.reportOperationalError
}));

import { getAdminContext, getPublisherContext } from "@/lib/publisher";

function clientWithRoles(
  roles: string[],
  options: { authError?: unknown; rolesError?: unknown } = {}
) {
  const eq = vi.fn().mockResolvedValue({
    data: roles.map((role) => ({ role })),
    error: options.rolesError ?? null
  });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: options.authError ? null : { id: "publisher-user" } },
        error: options.authError ?? null
      })
    },
    from
  } as unknown as SupabaseClient;

  return { client, from };
}

describe("publisher authorization context", () => {
  beforeEach(() => {
    publisherMocks.createSupabaseServerClient.mockReset();
    publisherMocks.reportOperationalError.mockReset();
  });

  it("allows an editor publisher while keeping admin access forbidden", async () => {
    const { client, from } = clientWithRoles(["member", "editor"]);
    publisherMocks.createSupabaseServerClient.mockResolvedValue(client);

    const publisherContext = await getPublisherContext();
    expect("error" in publisherContext).toBe(false);

    const adminContext = await getAdminContext();
    expect("error" in adminContext).toBe(true);
    if ("error" in adminContext) {
      expect(adminContext.error.status).toBe(403);
    }

    expect(from).toHaveBeenCalledTimes(2);
  });

  it("checks an admin role set only once per admin request", async () => {
    const { client, from } = clientWithRoles(["member", "admin"]);
    publisherMocks.createSupabaseServerClient.mockResolvedValue(client);

    const context = await getAdminContext();

    expect("error" in context).toBe(false);
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("distinguishes an auth service failure from an unauthenticated user", async () => {
    const authError = { message: "sensitive auth transport detail" };
    const { client, from } = clientWithRoles([], { authError });
    publisherMocks.createSupabaseServerClient.mockResolvedValue(client);

    const context = await getPublisherContext();

    expect("error" in context).toBe(true);
    if ("error" in context) {
      expect(context.error.status).toBe(503);
      expect(await context.error.json()).toEqual({
        ok: false,
        reason: "authentication_unavailable"
      });
    }
    expect(from).not.toHaveBeenCalled();
    expect(publisherMocks.reportOperationalError).toHaveBeenCalledWith(
      "publisher.auth_lookup_failed",
      authError
    );
  });

  it("returns 401 without alerting when the request has no session", async () => {
    const { client, from } = clientWithRoles([], {
      authError: new AuthSessionMissingError()
    });
    publisherMocks.createSupabaseServerClient.mockResolvedValue(client);

    const context = await getPublisherContext();

    expect("error" in context).toBe(true);
    if ("error" in context) {
      expect(context.error.status).toBe(401);
      expect(await context.error.json()).toEqual({
        ok: false,
        reason: "not_authenticated"
      });
    }
    expect(from).not.toHaveBeenCalled();
    expect(publisherMocks.reportOperationalError).not.toHaveBeenCalled();
  });

  it("logs role query details but exposes only a stable authorization error", async () => {
    const rolesError = { message: "sensitive role database detail" };
    const { client } = clientWithRoles([], { rolesError });
    publisherMocks.createSupabaseServerClient.mockResolvedValue(client);

    const context = await getPublisherContext();

    expect("error" in context).toBe(true);
    if ("error" in context) {
      expect(context.error.status).toBe(500);
      expect(await context.error.json()).toEqual({
        ok: false,
        reason: "roles_query_failed"
      });
    }
    expect(publisherMocks.reportOperationalError).toHaveBeenCalledWith(
      "publisher.roles_query_failed",
      expect.any(Error),
      { userId: "publisher-user" }
    );
  });
});
