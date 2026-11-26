import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { supportTickets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { readSessionCookie } from "@/lib/auth";
import { requireWorkspaceMember } from "@/lib/access-control";
import { SupportError, addMessage } from "@/lib/support";
import { validateReply } from "@/lib/support-rules.mjs";

export const runtime = "nodejs";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await readSessionCookie(request.headers.get("cookie"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const v = validateReply(body); if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  try {
    const [t] = /^[0-9a-f-]{36}$/i.test(id) ? await getDb().select({ workspaceId: supportTickets.workspaceId }).from(supportTickets).where(eq(supportTickets.id, id)).limit(1) : [];
    // Same 404 for a missing ticket and for another tenant's ticket.
    if (!t) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    try { await requireWorkspaceMember(userId, t.workspaceId); } catch { return NextResponse.json({ error: "Ticket not found." }, { status: 404 }); }
    await addMessage({ ticketId: id, userId, fromStaff: false, body: v.body });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    if (e instanceof SupportError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Unable to send the message." }, { status: 500 });
  }
}
