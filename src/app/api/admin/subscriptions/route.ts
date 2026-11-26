import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { assignPlan } from "@/lib/plans";
import { readSessionCookie } from "@/lib/auth";
import { requirePlatformAdmin } from "@/lib/access-control";
import { validateSubscription } from "@/lib/plan-rules.mjs";

export const runtime = "nodejs";

/** Records which plan a workspace is on. Record only: no billing, no credit grant, no metering, no change to products. */
export async function PUT(request: Request) {
  const userId = readSessionCookie(request.headers.get("cookie"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { await requirePlatformAdmin(userId); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const parsed = validateSubscription(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const v = parsed.value;
  try {
    const db = getDb();
    const result = await db.transaction((tx) => assignPlan(tx, { ...v, actorUserId: userId }));
    if (result === "no-workspace") return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    if (result === "no-plan") return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    if (result === "inactive-plan") return NextResponse.json({ error: "Plan must be active." }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("RABTO subscription set failed", error);
    return NextResponse.json({ error: "Unable to save subscription." }, { status: 500 });
  }
}
