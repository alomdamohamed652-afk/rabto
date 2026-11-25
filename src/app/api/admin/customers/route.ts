import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users, workspaces, workspaceMembers } from "@/db/schema";
import { readSessionCookie } from "@/lib/auth";
import { requirePlatformAdmin } from "@/lib/access-control";
import { createCustomerAccount } from "@/lib/customer-provisioning";
import { createCustomerInvitation } from "@/lib/customer-invitations";
import { httpStatusForError } from "@/lib/security-primitives.mjs";

export const runtime = "nodejs";

async function adminId(request: Request) {
  const userId = readSessionCookie(request.headers.get("cookie"));
  if (!userId) return null;
  await requirePlatformAdmin(userId);
  return userId;
}

export async function GET(request: Request) {
  try {
    if (!await adminId(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const params = new URL(request.url).searchParams;
    const limit = Math.min(100, Math.max(1, Number.parseInt(params.get("limit") || "25", 10) || 25));
    const offset = Math.max(0, Number.parseInt(params.get("offset") || "0", 10) || 0);
    const db = getDb();
    const rows = await db.select({
      userId: users.id,
      email: users.email,
      createdAt: users.createdAt,
      workspaceId: workspaces.id,
      workspaceName: workspaces.name,
      workspaceSlug: workspaces.slug,
    }).from(workspaceMembers)
      .innerJoin(users, eq(users.id, workspaceMembers.userId))
      .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(eq(users.platformRole, "customer"))
      .orderBy(asc(workspaces.name), asc(users.email), asc(workspaces.id), asc(users.id))
      .limit(limit + 1)
      .offset(offset);
    return NextResponse.json({ customers: rows.slice(0, limit), hasMore: rows.length > limit });
  } catch (error) {
    return NextResponse.json({ error: "Unable to load customers." }, { status: httpStatusForError(error) });
  }
}

export async function POST(request: Request) {
  try {
    const actorUserId = await adminId(request);
    if (!actorUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.email !== "string" || typeof body.workspaceName !== "string" || typeof body.workspaceSlug !== "string") {
      return NextResponse.json({ error: "Email, workspace name, and workspace slug are required." }, { status: 400 });
    }
    const created = await createCustomerAccount({
      actorUserId,
      email: body.email,
      workspaceName: body.workspaceName,
      workspaceSlug: body.workspaceSlug,
    });
    const invitation = await createCustomerInvitation({
      actorUserId,
      customerUserId: created.user.id,
      expiresInHours: 24,
    });
    const origin = new URL(request.url).origin;
    return NextResponse.json({
      customer: { ...created, user: { email: created.user.email }, workspace: created.workspace },
      invitation: {
        url: `${origin}/accept-invitation?token=${encodeURIComponent(invitation.token)}`,
        expiresAt: invitation.expiresAt,
      },
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create customer.";
    const status = httpStatusForError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
