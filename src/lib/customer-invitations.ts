import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull, gt } from "drizzle-orm";
import { getDb } from "@/db";
import { customerInvitations, users, auditLogs } from "@/db/schema";

export type CreateCustomerInvitationInput = {
  actorUserId: string;
  customerUserId: string;
  expiresInHours?: number;
};

/**
 * Creates a one-time customer setup credential. Only its SHA-256 hash is stored.
 * The raw token is returned once to a trusted server-side email/handoff layer.
 */
export async function createCustomerInvitation(input: CreateCustomerInvitationInput) {
  const hours = input.expiresInHours ?? 24;
  if (!Number.isInteger(hours) || hours < 1 || hours > 168) {
    throw new Error("Invitation expiry must be between 1 and 168 hours.");
  }

  const db = getDb();
  return db.transaction(async (tx) => {
    const [actor] = await tx.select({ id: users.id, role: users.platformRole })
      .from(users).where(eq(users.id, input.actorUserId)).limit(1);
    if (!actor || actor.role !== "admin") {
      throw new Error("Platform administrator access required.");
    }

    const [customer] = await tx.select({ id: users.id, role: users.platformRole })
      .from(users).where(eq(users.id, input.customerUserId)).limit(1);
    if (!customer || customer.role !== "customer") {
      throw new Error("Customer account not found.");
    }

    const now = new Date();
    await tx.update(customerInvitations).set({ revokedAt: now })
      .where(and(
        eq(customerInvitations.userId, input.customerUserId),
        isNull(customerInvitations.usedAt),
        isNull(customerInvitations.revokedAt),
        gt(customerInvitations.expiresAt, now),
      ));

    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token, "utf8").digest("hex");
    const expiresAt = new Date(now.getTime() + hours * 60 * 60 * 1000);
    const [invitation] = await tx.insert(customerInvitations).values({
      userId: input.customerUserId,
      tokenHash,
      expiresAt,
      createdByUserId: input.actorUserId,
    }).returning({ id: customerInvitations.id, expiresAt: customerInvitations.expiresAt });

    await tx.insert(auditLogs).values({
      actorUserId: input.actorUserId,
      action: "customer.invitation_created",
      entityType: "customer_invitation",
      entityId: invitation.id,
      details: { customerUserId: input.customerUserId, expiresAt: expiresAt.toISOString() },
    });

    return { invitationId: invitation.id, token, expiresAt: invitation.expiresAt };
  });
}

/** Hash a presented invitation token before looking it up; never persist the raw token. */
export function hashCustomerInvitationToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
