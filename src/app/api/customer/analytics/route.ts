import { NextResponse } from "next/server";
import { readSessionCookie } from "@/lib/auth";
import { requireWorkspaceMember } from "@/lib/access-control";
import { clampDays } from "@/lib/analytics-rules.mjs";
import { getDb } from "@/db";
import { entitlementsFor } from "@/lib/plans";
import { workspaceStats } from "@/lib/analytics";

export const runtime = "nodejs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const userId = await readSessionCookie(request.headers.get("cookie"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId");
  if (!workspaceId || !UUID.test(workspaceId)) return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  try { await requireWorkspaceMember(userId, workspaceId); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  try { if (!(await entitlementsFor(getDb(), workspaceId)).analyticsEnabled) return NextResponse.json({ error: "Analytics is not included in your plan.", code: "plan_feature" }, { status: 403 }); } catch { return NextResponse.json({ error: "Unable to load analytics." }, { status: 500 }); }
  try { return NextResponse.json(await workspaceStats(workspaceId, clampDays(url.searchParams.get("days")))); }
  catch { return NextResponse.json({ error: "Unable to load analytics." }, { status: 500 }); }
}
