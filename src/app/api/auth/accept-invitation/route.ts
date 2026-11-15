import { and, eq, gt, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { auditLogs, customerInvitations, users } from "@/db/schema";
import { hashCustomerInvitationToken } from "@/lib/customer-invitations";
import { createSessionToken, hashPassword, sessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { token?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (typeof body.token !== "string" || body.token.length < 32 || body.token.length > 256 ||
      typeof body.password !== "string" || body.password.length < 12 || body.password.length > 128) {
    return NextResponse.json({ error: "A valid invitation token and a 12–128 character password are required." }, { status: 400 });
  }

  const tokenHash = hashCustomerInvitationToken(body.token);
  const db = getDb();

  // Reject invalid tokens before performing the deliberately expensive password hash.
  // The invitation is revalidated inside the transaction to prevent replay/race conditions.
  const [candidate] = await db.select({ id: customerInvitations.id })
    .from(customerInvitations)
    .where(and(
      eq(customerInvitations.tokenHash, tokenHash),
      isNull(customerInvitations.usedAt),
      isNull(customerInvitations.revokedAt),
      gt(customerInvitations.expiresAt, new Date()),
    ))
    .limit(1);
  if (!candidate) {
    return NextResponse.json({ error: "This invitation is invalid, expired, revoked, or already used." }, { status: 400 });
  }

  const passwordHash = await hashPassword(body.password);
  try {
    const userId = await db.transaction(async (tx) => {
      const now = new Date();
      const [invitation] = await tx.select({
        id: customerInvitations.id,
        userId: customerInvitations.userId,
      }).from(customerInvitations).where(and(
        eq(customerInvitations.tokenHash, tokenHash),
        isNull(customerInvitations.usedAt),
        isNull(customerInvitations.revokedAt),
        gt(customerInvitations.expiresAt, now),
      )).limit(1);
      if (!invitation) return null;

      const [updatedUser] = await tx.update(users).set({
        passwordHash,
        updatedAt: now,
      }).where(and(eq(users.id, invitation.userId), isNull(users.passwordHash)))
        .returning({ id: users.id });
      if (!updatedUser) return null;

      const [usedInvitation] = await tx.update(customerInvitations).set({ usedAt: now })
        .where(and(
          eq(customerInvitations.id, invitation.id),
          isNull(customerInvitations.usedAt),
          isNull(customerInvitations.revokedAt),
          gt(customerInvitations.expiresAt, now),
        )).returning({ id: customerInvitations.id });
      if (!usedInvitation) throw new Error("Invitation was already consumed.");

      await tx.insert(auditLogs).values({
        actorUserId: invitation.userId,
        action: "customer.invitation_accepted",
        entityType: "customer_invitation",
        entityId: invitation.id,
        details: {},
      });
      return invitation.userId;
    });

    if (!userId) return NextResponse.json({ error: "This invitation is invalid, expired, revoked, or already used." }, { status: 400 });
    const response = NextResponse.json({ success: true });
    response.headers.append("Set-Cookie", sessionCookie(createSessionToken(userId)));
    return response;
  } catch {
    return NextResponse.json({ error: "Unable to complete account setup. Please try again." }, { status: 500 });
  }
}
