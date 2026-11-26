import { NextResponse } from "next/server";
import { readSessionCookie } from "@/lib/auth";
import { requireWorkspaceMember } from "@/lib/access-control";
import { publishPage } from "@/lib/pages";

export const runtime = "nodejs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const userId = await readSessionCookie(request.headers.get("cookie"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const { workspaceId, pageId } = body ?? {};
  if (typeof workspaceId !== "string" || !UUID.test(workspaceId) || typeof pageId !== "string" || !UUID.test(pageId)) return NextResponse.json({ error: "workspaceId and pageId are required." }, { status: 400 });
  try { await requireWorkspaceMember(userId, workspaceId); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  try {
    const r = await publishPage({ workspaceId, pageId, actorUserId: userId });
    if (r.kind === "not-found") return NextResponse.json({ error: "Page not found." }, { status: 404 });
    return NextResponse.json({ version: r.version });
  } catch { return NextResponse.json({ error: "Unable to publish." }, { status: 500 }); }
}
