import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { plans } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public list of active plans exactly as an admin configured them. Only display fields; no ids, no credits. */
export async function GET() {
  try {
    const rows = await getDb().select({ name: plans.name, description: plans.description, priceNote: plans.priceNote, maxActivatedProducts: plans.maxActivatedProducts, maxPages: plans.maxPages, analyticsEnabled: plans.analyticsEnabled })
      .from(plans).where(eq(plans.isActive, true)).orderBy(asc(plans.name)).limit(50);
    return NextResponse.json({ plans: rows }, { headers: { "Cache-Control": "public, max-age=60" } });
  } catch { return NextResponse.json({ error: "Unable to load plans." }, { status: 500 }); }
}
