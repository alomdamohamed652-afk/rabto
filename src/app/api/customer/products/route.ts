import { NextResponse } from "next/server";
import { readSessionCookie } from "@/lib/auth";
import { listWorkspaceProductsForMember } from "@/lib/customer-products";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const userId = readSessionCookie(request.headers.get("cookie"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const workspaceId = params.get("workspaceId");
  if (!workspaceId) return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  const limit = Math.min(100, Math.max(1, Number.parseInt(params.get("limit") || "24", 10) || 24));
  const offset = Math.max(0, Number.parseInt(params.get("offset") || "0", 10) || 0);
  try {
    const rows = await listWorkspaceProductsForMember(userId, workspaceId, { limit: limit + 1, offset });
    return NextResponse.json({ products: rows.slice(0, limit), hasMore: rows.length > limit });
  } catch {
    return NextResponse.json({ error: "Unable to load workspace products." }, { status: 500 });
  }
}
