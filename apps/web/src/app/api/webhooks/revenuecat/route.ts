import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function POST(request: NextRequest) {
  if (!env.REVENUECAT_WEBHOOK_AUTHORIZATION) {
    return NextResponse.json(
      { received: false, error: "RevenueCat webhook is not configured." },
      { status: 501 }
    );
  }

  if (request.headers.get("authorization") !== env.REVENUECAT_WEBHOOK_AUTHORIZATION) {
    return NextResponse.json(
      { received: false, error: "Invalid webhook authorization." },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);

  if (!body?.event?.type) {
    return NextResponse.json(
      { received: false, error: "Invalid RevenueCat event payload." },
      { status: 400 }
    );
  }

  return NextResponse.json(
    {
      received: false,
      source: "revenuecat",
      event: body.event.type,
      error: "RevenueCat entitlement processing is not implemented yet."
    },
    { status: 501 }
  );
}
