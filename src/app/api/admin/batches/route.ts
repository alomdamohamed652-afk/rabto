import { NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { productBatches, productTypes, products, productCodes, workspaces } from "@/db/schema";
import { readSessionCookie } from "@/lib/auth";
import { requirePlatformAdmin } from "@/lib/access-control";
import { provisionProductBatch } from "@/lib/provisioning";
import { httpStatusForError } from "@/lib/security-primitives.mjs";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const actorUserId = await readSessionCookie(request.headers.get("cookie"));
    if (!actorUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await requirePlatformAdmin(actorUserId);
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.workspaceId !== "string" || typeof body.productTypeId !== "string" ||
        typeof body.batchCode !== "string" || typeof body.quantity !== "number" ||
        typeof body.initialDestinationUrl !== "string") {
      return NextResponse.json({ error: "All batch fields are required." }, { status: 400 });
    }
    const result = await provisionProductBatch({
      actorUserId,
      workspaceId: body.workspaceId,
      productTypeId: body.productTypeId,
      batchCode: body.batchCode,
      quantity: body.quantity,
      initialDestinationUrl: body.initialDestinationUrl,
      changeReason: typeof body.changeReason === "string" ? body.changeReason : undefined,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const status = httpStatusForError(error);
    if (status >= 500) console.error("RABTO admin route failed", error);
    const message = status < 500 && error instanceof Error ? error.message : "Unable to provision batch.";
    return NextResponse.json({ error: message }, { status });
  }
}

/** Batch history: newest first, optionally for one workspace. Counts only, no secrets. */
export async function GET(request: Request) {
  try {
    const actorUserId = await readSessionCookie(request.headers.get("cookie"));
    if (!actorUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await requirePlatformAdmin(actorUserId);
    const ws = new URL(request.url).searchParams.get("workspaceId");
    if (ws && !/^[0-9a-f-]{36}$/i.test(ws)) return NextResponse.json({ error: "Invalid workspace." }, { status: 400 });
    const q = getDb().select({
      id: productBatches.id, code: productBatches.code, quantity: productBatches.quantity, createdAt: productBatches.createdAt,
      workspaceName: workspaces.name, productType: productTypes.name,
      activated: sql<number>`(select count(*)::int from ${productCodes} pc join ${products} p on p.id = pc.product_id where p.batch_id = ${productBatches.id} and pc.channel = 'qr' and pc.activated_at is not null)`,
    }).from(productBatches).innerJoin(workspaces, eq(workspaces.id, productBatches.workspaceId)).innerJoin(productTypes, eq(productTypes.id, productBatches.productTypeId));
    const rows = await (ws ? q.where(eq(productBatches.workspaceId, ws)) : q).orderBy(desc(productBatches.createdAt)).limit(200);
    return NextResponse.json({ batches: rows });
  } catch (error) {
    const status = httpStatusForError(error);
    return NextResponse.json({ error: status === 500 ? "Unable to load batches." : (error instanceof Error && status < 500 ? error.message : "Error") }, { status });
  }
}
