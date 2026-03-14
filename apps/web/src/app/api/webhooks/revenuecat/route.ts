import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();

  return NextResponse.json({
    received: true,
    source: "revenuecat",
    event: body.event?.type ?? "unknown",
    note: "Map IAP events to internal subscriptions and entitlements here."
  });
}
