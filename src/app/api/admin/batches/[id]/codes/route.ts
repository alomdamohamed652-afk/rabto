import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { productCodes, products } from "@/db/schema";
import { readSessionCookie } from "@/lib/auth";
import { requirePlatformAdmin } from "@/lib/access-control";

export const runtime = "nodejs";

/**
 * Reprint source for a batch: the PUBLIC codes only (they are the resolver links). Activation secrets are stored
 * hashed and are shown once at creation, so they can never be reprinted from here.
 */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await readSessionCookie(request.headers.get("cookie"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { await requirePlatformAdmin(userId); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid batch." }, { status: 400 });
  try {
    const rows = await getDb().select({ productId: products.id, serialNumber: products.serialNumber, channel: productCodes.channel, publicCode: productCodes.publicCode, activatedAt: productCodes.activatedAt })
      .from(productCodes).innerJoin(products, eq(products.id, productCodes.productId)).where(eq(products.batchId, id)).orderBy(asc(products.serialNumber), asc(productCodes.channel)).limit(20000);
    return rows.length ? NextResponse.json({ codes: rows }) : NextResponse.json({ error: "Batch not found." }, { status: 404 });
  } catch { return NextResponse.json({ error: "Unable to load codes." }, { status: 500 }); }
}
