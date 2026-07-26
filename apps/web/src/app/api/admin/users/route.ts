import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getManagedUserSnapshot,
  MANAGED_USERS_PAGE_SIZE
} from "@/lib/admin-users";
import { getAdminContext } from "@/lib/publisher";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

const userQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100_000).default(1),
    query: z.string().trim().max(100).default("")
  })
  .strict();

export async function GET(request: NextRequest) {
  const context = await getAdminContext();
  if ("error" in context) {
    context.error.headers.set("Cache-Control", "no-store");
    return context.error;
  }

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = userQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, reason: "invalid_user_query" },
      { headers: noStoreHeaders, status: 400 }
    );
  }

  const snapshot = await getManagedUserSnapshot({
    page: parsed.data.page,
    pageSize: MANAGED_USERS_PAGE_SIZE,
    query: parsed.data.query,
    supabase: context.supabase
  });

  if (snapshot.error) {
    return NextResponse.json(
      { ok: false, reason: "managed_users_query_failed" },
      { headers: noStoreHeaders, status: 500 }
    );
  }

  return NextResponse.json(
    { ok: true, snapshot },
    { headers: noStoreHeaders }
  );
}
