import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, enquiries } from "@/db/schema";
import { readSessionCookie } from "@/lib/auth";
import { requirePlatformAdmin } from "@/lib/access-control";

export const runtime = "nodejs";

async function admin(request: Request) {
  const userId = await readSessionCookie(request.headers.get("cookie"));
  if (!userId) return { res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  try { await requirePlatformAdmin(userId); } catch { return { res: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }; }
  return { userId };
}

export async function GET(request: Request) {
  const a = await admin(request); if (!a.userId) return a.res;
  const st = new URL(request.url).searchParams.get("status");
  try {
    const q = getDb().select().from(enquiries);
    const rows = await (st === "new" || st === "handled" ? q.where(eq(enquiries.status, st)) : q).orderBy(desc(enquiries.createdAt)).limit(200);
    return NextResponse.json({ enquiries: rows.map((r) => ({ id: r.id, name: r.name, contact: r.contact, message: r.message, status: r.status, createdAt: r.createdAt })) });
  } catch { return NextResponse.json({ error: "Unable to load enquiries." }, { status: 500 }); }
}

/** PUT {id}: mark an enquiry as handled (records that an admin dealt with it; sends nothing). */
export async function PUT(request: Request) {
  const a = await admin(request); if (!a.userId) return a.res;
  let b: { id?: unknown };
  try { b = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (typeof b.id !== "string" || !/^[0-9a-f-]{36}$/i.test(b.id)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  try {
    const out = await getDb().transaction(async (tx) => {
      const [r] = await tx.update(enquiries).set({ status: "handled", handledBy: a.userId, handledAt: new Date() }).where(eq(enquiries.id, b.id as string)).returning({ id: enquiries.id });
      if (!r) return null;
      await tx.insert(auditLogs).values({ actorUserId: a.userId, action: "enquiry.handled", entityType: "enquiry", entityId: r.id, details: {} });
      return r;
    });
    return out ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Enquiry not found." }, { status: 404 });
  } catch { return NextResponse.json({ error: "Unable to save." }, { status: 500 }); }
}
