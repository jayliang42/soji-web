import { NextResponse } from "next/server";
import { getCurrentEntitlements, getCurrentUser, getSessionSnapshot } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  const entitlements = await getCurrentEntitlements();
  const snapshot = await getSessionSnapshot();

  return NextResponse.json({ user, entitlements, source: snapshot.source });
}
