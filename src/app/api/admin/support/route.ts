import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { supportTickets, workspaces } from "@/db/schema";
import { readSessionCookie } from "@/lib/auth";
import { requirePlatformAdmin } from "@/lib/access-control";
import { loadThread } from "@/lib/support";
import { validateStatus } from "@/lib/support-rules.mjs";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const userId = await readSessionCookie(request.headers.get("cookie"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { await requirePlatformAdmin(userId); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  const url = new URL(request.url);
  try {
    const ticketId = url.searchParams.get("ticketId");
    if (ticketId) {
      const thread = /^[0-9a-f-]{36}$/i.test(ticketId) ? await loadThread(ticketId) : null;
      return thread ? NextResponse.json(thread) : NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }
    const status = validateStatus(url.searchParams.get("status"));
    const q = getDb().select({ id: supportTickets.id, subject: supportTickets.subject, status: supportTickets.status, lastMessageAt: supportTickets.lastMessageAt, workspaceName: workspaces.name, workspaceSlug: workspaces.slug })
      .from(supportTickets).innerJoin(workspaces, eq(workspaces.id, supportTickets.workspaceId));
    const rows = await (status ? q.where(eq(supportTickets.status, status)) : q).orderBy(desc(supportTickets.lastMessageAt)).limit(200);
    return NextResponse.json({ tickets: rows });
  } catch { return NextResponse.json({ error: "Unable to load tickets." }, { status: 500 }); }
}
