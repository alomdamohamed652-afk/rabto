import { NextResponse } from "next/server";
import { readSessionCookie } from "@/lib/auth";
import { requirePlatformAdmin } from "@/lib/access-control";
import { GuideError, saveContact } from "@/lib/guide";
import { validateContact } from "@/lib/guide-admin-rules.mjs";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const userId = await readSessionCookie(request.headers.get("cookie"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { await requirePlatformAdmin(userId); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  let body: unknown; try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const v = validateContact(body); if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  try { return NextResponse.json({ id: await saveContact({ actorId: userId, values: v.value }) }, { status: 201 }); }
  catch (e) { return e instanceof GuideError ? NextResponse.json({ error: e.message }, { status: e.status }) : NextResponse.json({ error: "Unable to save." }, { status: 500 }); }
}
