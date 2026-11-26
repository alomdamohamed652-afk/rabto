import { NextResponse } from "next/server";
import { readSessionCookie } from "@/lib/auth";
import { requirePlatformAdmin } from "@/lib/access-control";
import { GuideError, adminList, saveEntry } from "@/lib/guide";
import { validateGuideEntry } from "@/lib/guide-admin-rules.mjs";

export const runtime = "nodejs";
async function guard(request: Request) {
  const userId = await readSessionCookie(request.headers.get("cookie"));
  if (!userId) return { res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  try { await requirePlatformAdmin(userId); } catch { return { res: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }; }
  return { userId };
}
export async function GET(request: Request) {
  const g = await guard(request); if (g.res) return g.res;
  try { return NextResponse.json(await adminList()); } catch { return NextResponse.json({ error: "Unable to load guide content." }, { status: 500 }); }
}
export async function POST(request: Request) {
  const g = await guard(request); if (g.res) return g.res;
  let body: unknown; try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const v = validateGuideEntry(body); if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  try { return NextResponse.json({ id: await saveEntry({ actorId: g.userId, values: v.value }) }, { status: 201 }); }
  catch (e) { return e instanceof GuideError ? NextResponse.json({ error: e.message }, { status: e.status }) : NextResponse.json({ error: "Unable to save." }, { status: 500 }); }
}
