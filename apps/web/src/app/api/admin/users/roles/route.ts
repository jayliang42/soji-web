import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { reportOperationalError } from "@/lib/observability";
import { getAdminContext } from "@/lib/publisher";
import type { Database } from "@/lib/supabase/database.types";

const roleUpdateSchema = z
  .object({
    accessRole: z.enum(["member", "editor", "admin"]),
    userId: z.string().uuid()
  })
  .strict();

type RoleUpdateRow =
  Database["public"]["Functions"]["set_user_access_role"]["Returns"][number];

function expectedErrorStatus(message: string) {
  if (message.includes("last_admin_required")) {
    return { reason: "last_admin_required", status: 409 };
  }

  if (message.includes("user_not_found")) {
    return { reason: "user_not_found", status: 404 };
  }

  if (message.includes("admin_role_required")) {
    return { reason: "forbidden", status: 403 };
  }

  return null;
}

export async function PATCH(request: NextRequest) {
  const context = await getAdminContext();
  if ("error" in context) {
    return context.error;
  }

  const body = await request.json().catch(() => null);
  const parsed = roleUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, reason: "invalid_role_update" },
      { status: 400 }
    );
  }

  const { data, error } = await context.supabase.rpc("set_user_access_role", {
    p_access_role: parsed.data.accessRole,
    p_target_user_id: parsed.data.userId
  });

  if (error) {
    const expected = expectedErrorStatus(error.message);
    if (expected) {
      return NextResponse.json(
        { ok: false, reason: expected.reason },
        { status: expected.status }
      );
    }

    await reportOperationalError("admin.user_role.update_failed", error, {
      actorUserId: context.user.id,
      requestedRole: parsed.data.accessRole,
      targetUserId: parsed.data.userId
    });

    return NextResponse.json(
      { ok: false, reason: "role_update_failed" },
      { status: 500 }
    );
  }

  const result: RoleUpdateRow | null = data?.[0] ?? null;
  if (!result) {
    await reportOperationalError(
      "admin.user_role.update_failed",
      new Error("role_update_result_missing"),
      {
        actorUserId: context.user.id,
        requestedRole: parsed.data.accessRole,
        targetUserId: parsed.data.userId
      }
    );
    return NextResponse.json(
      { ok: false, reason: "role_update_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    item: {
      accessRole: result.assigned_role,
      changedAt: result.changed_at,
      previousRole: result.previous_role,
      userId: parsed.data.userId
    },
    ok: true
  });
}
