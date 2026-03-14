import { NextResponse } from "next/server";
import { getCurrentEntitlements, getCurrentUser, getSessionSnapshot } from "@/lib/session";

export async function GET() {
  const snapshot = await getSessionSnapshot();
  const user = snapshot.user;
  const entitlements = snapshot.entitlements;

  return NextResponse.json({
    user,
    entitlements,
    source: snapshot.source,
    error: snapshot.error ?? null
  });
}
