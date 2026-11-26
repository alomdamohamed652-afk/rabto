import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { plans, workspaceSubscriptions } from "@/db/schema";
import { readSessionCookie } from "@/lib/auth";
import { requireWorkspaceMember } from "@/lib/access-control";
import { effectiveStatus } from "@/lib/plan-rules.mjs";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const userId = readSessionCookie(request.headers.get("cookie"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!workspaceId) return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  try { await requireWorkspaceMember(userId, workspaceId); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  try {
    const [row] = await getDb().select({
      status: workspaceSubscriptions.status, startsAt: workspaceSubscriptions.startsAt, endsAt: workspaceSubscriptions.endsAt,
      name: plans.name, description: plans.description, priceNote: plans.priceNote, includedCredits: plans.includedCredits, maxActivatedProducts: plans.maxActivatedProducts, maxPages: plans.maxPages, analyticsEnabled: plans.analyticsEnabled,
    }).from(workspaceSubscriptions).innerJoin(plans, eq(plans.id, workspaceSubscriptions.planId)).where(eq(workspaceSubscriptions.workspaceId, workspaceId)).limit(1);
    if (!row) return NextResponse.json({ plan: null, status: "none" });
    return NextResponse.json({ plan: row, status: effectiveStatus(row) });
  } catch { return NextResponse.json({ error: "Unable to load plan." }, { status: 500 }); }
}
