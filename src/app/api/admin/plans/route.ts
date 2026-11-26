import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, plans } from "@/db/schema";
import { readSessionCookie } from "@/lib/auth";
import { requirePlatformAdmin } from "@/lib/access-control";
import { validatePlan } from "@/lib/plan-rules.mjs";

export const runtime = "nodejs";

async function guard(request: Request) {
  const userId = await readSessionCookie(request.headers.get("cookie"));
  if (!userId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  try { await requirePlatformAdmin(userId); } catch { return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }; }
  return { userId };
}

export async function GET(request: Request) {
  const g = await guard(request); if (g.error) return g.error;
  try {
    const rows = await getDb().select().from(plans).orderBy(asc(plans.createdAt)).limit(200);
    return NextResponse.json({ plans: rows });
  } catch { return NextResponse.json({ error: "Unable to load plans." }, { status: 500 }); }
}

export async function POST(request: Request) {
  const g = await guard(request); if (g.error) return g.error;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const parsed = validatePlan(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const db = getDb();
    const id = await db.transaction(async (tx) => {
      const [row] = await tx.insert(plans).values(parsed.value).returning({ id: plans.id });
      await tx.insert(auditLogs).values({ actorUserId: g.userId!, action: "plan.created", entityType: "plan", entityId: row.id, details: { name: parsed.value.name } });
      return row.id;
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    if (String((error as { message?: string; cause?: { code?: string } })?.cause?.code) === "23505") return NextResponse.json({ error: "A plan with this name already exists." }, { status: 409 });
    console.error("RABTO plan create failed", error);
    return NextResponse.json({ error: "Unable to create plan." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const g = await guard(request); if (g.error) return g.error;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const id = typeof body?.id === "string" ? body.id : "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "id is required." }, { status: 400 });
  const parsed = validatePlan(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const db = getDb();
    const updated = await db.transaction(async (tx) => {
      const rows = await tx.update(plans).set({ ...parsed.value, updatedAt: new Date() }).where(eq(plans.id, id)).returning({ id: plans.id });
      if (rows.length) await tx.insert(auditLogs).values({ actorUserId: g.userId!, action: "plan.updated", entityType: "plan", entityId: id, details: { name: parsed.value.name, isActive: parsed.value.isActive } });
      return rows.length;
    });
    if (!updated) return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (String((error as { cause?: { code?: string } })?.cause?.code) === "23505") return NextResponse.json({ error: "A plan with this name already exists." }, { status: 409 });
    return NextResponse.json({ error: "Unable to update plan." }, { status: 500 });
  }
}
