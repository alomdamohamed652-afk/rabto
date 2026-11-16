import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { productTypes, workspaces } from "@/db/schema";
import { readSessionCookie } from "@/lib/auth";
import { requirePlatformAdmin } from "@/lib/access-control";

export const runtime = "nodejs";

async function getAdminId(request: Request) {
  const id = readSessionCookie(request.headers.get("cookie"));
  if (!id) return null;
  await requirePlatformAdmin(id);
  return id;
}

export async function GET(request: Request) {
  try {
    if (!await getAdminId(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const workspaceId = new URL(request.url).searchParams.get("workspaceId");
    if (!workspaceId) return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
    const db = getDb();
    const rows = await db.select({
      id: productTypes.id,
      name: productTypes.name,
      skuPrefix: productTypes.skuPrefix,
      isActive: productTypes.isActive,
    }).from(productTypes)
      .innerJoin(workspaces, eq(workspaces.id, productTypes.workspaceId))
      .where(eq(productTypes.workspaceId, workspaceId))
      .orderBy(asc(productTypes.name));
    return NextResponse.json({ productTypes: rows });
  } catch {
    return NextResponse.json({ error: "Unable to load product types." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const actorId = await getAdminId(request);
    if (!actorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.workspaceId !== "string" || typeof body.name !== "string" || typeof body.skuPrefix !== "string") {
      return NextResponse.json({ error: "Workspace, name, and SKU prefix are required." }, { status: 400 });
    }
    const name = body.name.trim();
    const skuPrefix = body.skuPrefix.trim().toUpperCase();
    if (name.length < 2 || name.length > 120 || !/^[A-Z0-9_-]{2,24}$/.test(skuPrefix)) {
      return NextResponse.json({ error: "Check the product type name and SKU prefix." }, { status: 400 });
    }
    const db = getDb();
    const [workspace] = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.id, body.workspaceId)).limit(1);
    if (!workspace) return NextResponse.json({ error: "Customer workspace not found." }, { status: 404 });
    const [created] = await db.insert(productTypes).values({
      workspaceId: body.workspaceId,
      name,
      skuPrefix,
      attributes: {},
    }).returning({ id: productTypes.id, name: productTypes.name, skuPrefix: productTypes.skuPrefix });
    return NextResponse.json({ productType: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create product type." }, { status: 500 });
  }
}
