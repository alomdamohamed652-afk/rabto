import { NextResponse } from "next/server";
import { readSessionCookie } from "@/lib/auth";
import { requirePlatformAdmin } from "@/lib/access-control";
import { GuideError, saveContact } from "@/lib/guide";
import { validateContact } from "@/lib/guide-admin-rules.mjs";
import { getDb } from "@/db";
import { supportContacts } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
const UUID = /^[0-9a-f-]{36}$/i;
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await readSessionCookie(request.headers.get("cookie"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { await requirePlatformAdmin(userId); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  const { id } = await ctx.params; if (!UUID.test(id)) return NextResponse.json({ error: "Contact not found." }, { status: 404 });
  let body: Record<string, unknown>; try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  try {
    // The value is validated against the stored kind; the kind itself cannot change.
    const [cur] = await getDb().select({ kind: supportContacts.kind }).from(supportContacts).where(eq(supportContacts.id, id)).limit(1);
    if (!cur) return NextResponse.json({ error: "Contact not found." }, { status: 404 });
    const v = validateContact({ ...body, kind: cur.kind }, { partial: true }); if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    const { kind: _kind, ...values } = v.value; void _kind;
    if (Object.keys(values).length === 0) return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
    await saveContact({ actorId: userId, id, values }); return NextResponse.json({ ok: true });
  } catch (e) { return e instanceof GuideError ? NextResponse.json({ error: e.message }, { status: e.status }) : NextResponse.json({ error: "Unable to save." }, { status: 500 }); }
}
