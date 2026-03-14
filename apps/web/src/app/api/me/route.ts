import { NextResponse } from "next/server";
import { getCurrentEntitlements, getMockSession } from "@/lib/session";

export async function GET() {
  const user = await getMockSession();
  const entitlements = await getCurrentEntitlements();

  return NextResponse.json({ user, entitlements });
}
