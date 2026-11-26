import { NextResponse } from "next/server";
import { isAuthorizedConsumer } from "@/lib/analytics-rules.mjs";
import { drain } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Called by a scheduler (cron). Requires ANALYTICS_CONSUMER_SECRET as a bearer token. Safe to run concurrently. */
export async function POST(request: Request) {
  if (!isAuthorizedConsumer(request.headers.get("authorization"), process.env.ANALYTICS_CONSUMER_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "cache-control": "no-store" } });
  }
  try {
    const processed = await drain();
    return NextResponse.json({ processed }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Consumer failed." }, { status: 500, headers: { "cache-control": "no-store" } });
  }
}
