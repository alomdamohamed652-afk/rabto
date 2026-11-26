import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, recoveryRequests, users } from "@/db/schema";
import { readSessionCookie } from "@/lib/auth";
import { requirePlatformAdmin } from "@/lib/access-control";

export const runtime = "nodejs";

async function admin(request: Request) {
  const userId = await readSessionCookie(request.headers.get("cookie"));
  if (!userId) return { res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  try { await requirePlatformAdmin(userId); } catch { return { res: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }; }
  return { userId };
}

/** Queue for admins: who asked, which account, when. Contact the customer yourself, nothing is reset by this queue. */
export async function GET(request: Request) {
  const a = await admin(request); if (!a.userId) return a.res;
  const status = new URL(request.url).searchParams.get("status");
  try {
    const q = getDb().select({ id: recoveryRequests.id, status: recoveryRequests.status, phone: recoveryRequests.phone, note: recoveryRequests.note, createdAt: recoveryRequests.createdAt, decidedAt: recoveryRequests.decidedAt, decisionNote: recoveryRequests.decisionNote, email: users.email })
      .from(recoveryRequests).innerJoin(users, eq(users.id, recoveryRequests.userId));
    const rows = await (status === "open" || status === "resolved" || status === "rejected" ? q.where(eq(recoveryRequests.status, status)) : q).orderBy(desc(recoveryRequests.createdAt)).limit(200);
    return NextResponse.json({ requests: rows });
  } catch { return NextResponse.json({ error: "Unable to load requests." }, { status: 500 }); }
}

/** PUT {id, decision: "resolved"|"rejected", note?}: records the admin's manual decision only. */
export async function PUT(request: Request) {
  const a = await admin(request); if (!a.userId) return a.res;
  let body: { id?: unknown; decision?: unknown; note?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id) || (body.decision !== "resolved" && body.decision !== "rejected")) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
  try {
    const db = getDb();
    const out = await db.transaction(async (tx) => {
      const [r] = await tx.update(recoveryRequests).set({ status: body.decision as string, decisionNote: note || null, decidedBy: a.userId, decidedAt: new Date() }).where(eq(recoveryRequests.id, body.id as string)).returning({ id: recoveryRequests.id, status: recoveryRequests.status });
      if (!r) return null;
      await tx.insert(auditLogs).values({ actorUserId: a.userId, action: "recovery_request." + body.decision, entityType: "recovery_request", entityId: r.id, details: {} });
      return r;
    });
    return out ? NextResponse.json(out) : NextResponse.json({ error: "Request not found." }, { status: 404 });
  } catch { return NextResponse.json({ error: "Unable to save the decision." }, { status: 500 }); }
}
