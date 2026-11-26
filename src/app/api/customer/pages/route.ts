import { NextResponse } from "next/server";
import { readSessionCookie } from "@/lib/auth";
import { requireWorkspaceMember } from "@/lib/access-control";
import { listPages, saveDraft } from "@/lib/pages";
import { PAGE_LIMITS, validatePageContent, validateSlug } from "@/lib/page-rules.mjs";

export const runtime = "nodejs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function authorize(request: Request, workspaceId: unknown) {
  const userId = readSessionCookie(request.headers.get("cookie"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (typeof workspaceId !== "string" || !UUID.test(workspaceId)) return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  try { await requireWorkspaceMember(userId, workspaceId); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  return userId;
}

export async function GET(request: Request) {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  const auth = await authorize(request, workspaceId);
  if (typeof auth !== "string") return auth;
  try { return NextResponse.json({ pages: await listPages(workspaceId as string) }); }
  catch { return NextResponse.json({ error: "Unable to load pages." }, { status: 500 }); }
}

/** Create (no pageId) or update a draft. Drafts never affect the public page until published. */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  const auth = await authorize(request, body.workspaceId);
  if (typeof auth !== "string") return auth;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title || title.length > PAGE_LIMITS.title) return NextResponse.json({ error: "Invalid title." }, { status: 400 });
  if (!validateSlug(body.slug)) return NextResponse.json({ error: "Invalid slug." }, { status: 400 });
  if (body.pageId !== undefined && (typeof body.pageId !== "string" || !UUID.test(body.pageId))) return NextResponse.json({ error: "Invalid pageId." }, { status: 400 });
  const content = validatePageContent(body.content);
  if (!content.ok) return NextResponse.json({ error: content.error }, { status: 400 });
  try {
    const r = await saveDraft({ workspaceId: body.workspaceId as string, pageId: body.pageId as string | undefined, slug: body.slug as string, title, content: content.value });
    if (r.kind === "slug-taken") return NextResponse.json({ error: "Slug already used in this workspace." }, { status: 409 });
    if (r.kind === "plan-limit") return NextResponse.json({ error: "Your plan's limit for menu pages is reached.", code: "plan_limit" }, { status: 403 });
    if (r.kind === "not-found") return NextResponse.json({ error: "Page not found." }, { status: 404 });
    return NextResponse.json({ pageId: r.pageId }, { status: body.pageId ? 200 : 201 });
  } catch { return NextResponse.json({ error: "Unable to save page." }, { status: 500 }); }
}
