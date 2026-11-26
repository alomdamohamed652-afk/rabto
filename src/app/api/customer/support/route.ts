import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { supportTickets } from "@/db/schema";
import { readSessionCookie } from "@/lib/auth";
import { requireWorkspaceMember } from "@/lib/access-control";
import { SupportError, createTicket, loadThread } from "@/lib/support";
import { activeLock, readRateLimitRows, recordRateLimitFailure, type RateLimitKey } from "@/lib/persistent-rate-limit";
import { rateLimitHash } from "@/lib/security-primitives.mjs";
import { validateTicket } from "@/lib/support-rules.mjs";

export const runtime = "nodejs";

/** Per-user abuse limit. Counts every call; returns false when the hourly allowance is used up. */
async function allowUser(keyType: string, userId: string, max: number): Promise<boolean> {
  const db = getDb();
  const key: RateLimitKey = { keyType, keyHash: rateLimitHash(keyType + ":" + userId) };
  if (!activeLock(await readRateLimitRows(db, [key])).allowed) return false;
  await recordRateLimitFailure(db, key, max, 3600);
  return true;
}
const UUID = /^[0-9a-f-]{36}$/i;

async function member(request: Request, workspaceId: unknown) {
  const userId = await readSessionCookie(request.headers.get("cookie"));
  if (!userId) return { res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (typeof workspaceId !== "string" || !UUID.test(workspaceId)) return { res: NextResponse.json({ error: "workspaceId is required." }, { status: 400 }) };
  try { await requireWorkspaceMember(userId, workspaceId); } catch { return { res: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }; }
  return { userId, workspaceId };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const m = await member(request, url.searchParams.get("workspaceId")); if (m.res) return m.res;
  try {
    const ticketId = url.searchParams.get("ticketId");
    if (ticketId) {
      const thread = UUID.test(ticketId) ? await loadThread(ticketId) : null;
      if (!thread || thread.ticket.workspaceId !== m.workspaceId) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
      return NextResponse.json(thread);
    }
    const rows = await getDb().select({ id: supportTickets.id, subject: supportTickets.subject, status: supportTickets.status, lastMessageAt: supportTickets.lastMessageAt }).from(supportTickets).where(eq(supportTickets.workspaceId, m.workspaceId)).orderBy(desc(supportTickets.lastMessageAt)).limit(100);
    return NextResponse.json({ tickets: rows });
  } catch { return NextResponse.json({ error: "Unable to load tickets." }, { status: 500 }); }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const m = await member(request, body.workspaceId); if (m.res) return m.res;
  const v = validateTicket(body); if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  if (!(await allowUser("support_ticket_user", m.userId, 10))) return NextResponse.json({ error: "Too many tickets. Try again later." }, { status: 429 });
  try {
    const t = await createTicket({ workspaceId: m.workspaceId, userId: m.userId, subject: v.subject, body: v.body });
    return NextResponse.json({ ticket: { id: t.id, subject: t.subject, status: t.status } }, { status: 201 });
  } catch (e) {
    if (e instanceof SupportError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Unable to create the ticket." }, { status: 500 });
  }
}
