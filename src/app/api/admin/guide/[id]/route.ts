import { NextResponse } from "next/server";
import { readSessionCookie } from "@/lib/auth";
import { requirePlatformAdmin } from "@/lib/access-control";
import { GuideError, saveEntry } from "@/lib/guide";
import { validateGuideEntry } from "@/lib/guide-admin-rules.mjs";

export const runtime = "nodejs";
const UUID = /^[0-9a-f-]{36}$/i;
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await readSessionCookie(request.headers.get("cookie"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { await requirePlatformAdmin(userId); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  const { id } = await ctx.params; if (!UUID.test(id)) return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  let body: unknown; try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const v = validateGuideEntry(body, { partial: true }); if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  if (Object.keys(v.value).length === 0) return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  try { await saveEntry({ actorId: userId, id, values: v.value }); return NextResponse.json({ ok: true }); }
  catch (e) { return e instanceof GuideError ? NextResponse.json({ error: e.message }, { status: e.status }) : NextResponse.json({ error: "Unable to save." }, { status: 500 }); }
}
