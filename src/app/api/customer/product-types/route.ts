import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { productTypes } from "@/db/schema";
import { readSessionCookie } from "@/lib/auth";
import { requireWorkspaceMember } from "@/lib/access-control";

export const runtime = "nodejs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Active product types of a workspace, for the order form. Members only. */
export async function GET(request: Request) {
  const userId = await readSessionCookie(request.headers.get("cookie"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!workspaceId || !UUID.test(workspaceId)) return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  try { await requireWorkspaceMember(userId, workspaceId); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  try {
    const rows = await getDb().select({ id: productTypes.id, name: productTypes.name, skuPrefix: productTypes.skuPrefix })
      .from(productTypes).where(and(eq(productTypes.workspaceId, workspaceId), eq(productTypes.isActive, true)))
      .orderBy(asc(productTypes.name)).limit(200);
    return NextResponse.json({ productTypes: rows });
  } catch { return NextResponse.json({ error: "Unable to load product types." }, { status: 500 }); }
}
