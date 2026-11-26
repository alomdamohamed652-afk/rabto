import { NextResponse } from "next/server";
import { readSessionCookie } from "@/lib/auth";
import { requireWorkspaceMember } from "@/lib/access-control";
import { createOrder, listOrders } from "@/lib/orders";
import { ORDER_STATUSES, validateNewOrder } from "@/lib/order-rules.mjs";

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
  const params = new URL(request.url).searchParams;
  const workspaceId = params.get("workspaceId");
  const auth = await authorize(request, workspaceId);
  if (typeof auth !== "string") return auth;
  const status = params.get("status") ?? undefined;
  if (status && !ORDER_STATUSES.includes(status)) return NextResponse.json({ error: "status invalid." }, { status: 400 });
  try { return NextResponse.json({ orders: await listOrders(workspaceId as string, status) }); }
  catch { return NextResponse.json({ error: "Unable to load orders." }, { status: 500 }); }
}

/** Manual order entry. Totals are computed on the server. Deposit fields are records only; nothing is charged. */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const auth = await authorize(request, body?.workspaceId);
  if (typeof auth !== "string") return auth;
  const v = validateNewOrder(body);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  try {
    const r = await createOrder(body.workspaceId as string, v.value);
    if (r.kind === "bad-product-type") return NextResponse.json({ error: "Unknown product type for this workspace." }, { status: 400 });
    return NextResponse.json({ id: r.id, orderNumber: r.orderNumber }, { status: 201 });
  } catch { return NextResponse.json({ error: "Unable to create order." }, { status: 500 }); }
}
