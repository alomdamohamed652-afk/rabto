import { NextResponse } from "next/server";
import { readSessionCookie } from "@/lib/auth";
import { requireWorkspaceMember } from "@/lib/access-control";
import { getOrder, updateOrder } from "@/lib/orders";
import { validateOrderUpdate } from "@/lib/order-rules.mjs";

export const runtime = "nodejs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function authorize(request: Request, workspaceId: unknown, id: string) {
  const userId = await readSessionCookie(request.headers.get("cookie"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (typeof workspaceId !== "string" || !UUID.test(workspaceId) || !UUID.test(id)) return NextResponse.json({ error: "workspaceId and a valid order id are required." }, { status: 400 });
  try { await requireWorkspaceMember(userId, workspaceId); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  return userId;
}

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  const auth = await authorize(request, workspaceId, id);
  if (typeof auth !== "string") return auth;
  try {
    const order = await getOrder(workspaceId as string, id);
    return order ? NextResponse.json({ order }) : NextResponse.json({ error: "Order not found." }, { status: 404 });
  } catch { return NextResponse.json({ error: "Unable to load order." }, { status: 500 }); }
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const auth = await authorize(request, body?.workspaceId, id);
  if (typeof auth !== "string") return auth;
  const v = validateOrderUpdate(body);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  try {
    const r = await updateOrder(body.workspaceId as string, id, v.value);
    if (r.kind === "not-found") return NextResponse.json({ error: "Order not found." }, { status: 404 });
    if (r.kind === "bad-transition") return NextResponse.json({ error: `Status change not allowed from ${r.from}.` }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Unable to update order." }, { status: 500 }); }
}
