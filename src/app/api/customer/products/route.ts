import { NextResponse } from "next/server";
import { readSessionCookie } from "@/lib/auth";
import { listWorkspaceProductsForMember } from "@/lib/customer-products";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const userId = readSessionCookie(request.headers.get("cookie"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!workspaceId) return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  try {
    const products = await listWorkspaceProductsForMember(userId, workspaceId);
    return NextResponse.json({ products });
  } catch {
    return NextResponse.json({ error: "Unable to load workspace products." }, { status: 500 });
  }
}
