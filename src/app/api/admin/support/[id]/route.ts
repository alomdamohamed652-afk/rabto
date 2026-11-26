import { NextResponse } from "next/server";
import { readSessionCookie } from "@/lib/auth";
import { requirePlatformAdmin } from "@/lib/access-control";
import { SupportError, addMessage, setStatus } from "@/lib/support";
import { validateReply, validateStatus } from "@/lib/support-rules.mjs";

export const runtime = "nodejs";
const UUID = /^[0-9a-f-]{36}$/i;

async function guard(request: Request) {
  const userId = await readSessionCookie(request.headers.get("cookie"));
  if (!userId) return { res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  try { await requirePlatformAdmin(userId); } catch { return { res: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }; }
  return { userId };
}
function fail(e: unknown, fallback: string) {
  if (e instanceof SupportError) return NextResponse.json({ error: e.message }, { status: e.status });
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guard(request); if (g.res) return g.res;
  const { id } = await ctx.params; if (!UUID.test(id)) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  let body: unknown; try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const v = validateReply(body); if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  try { await addMessage({ ticketId: id, userId: g.userId, fromStaff: true, body: v.body }); return NextResponse.json({ ok: true }, { status: 201 }); } catch (e) { return fail(e, "Unable to send the reply."); }
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guard(request); if (g.res) return g.res;
  const { id } = await ctx.params; if (!UUID.test(id)) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  let body: { status?: unknown }; try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const status = validateStatus(body.status); if (!status) return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  try { await setStatus({ ticketId: id, userId: g.userId, status }); return NextResponse.json({ ok: true }); } catch (e) { return fail(e, "Unable to change the status."); }
}
