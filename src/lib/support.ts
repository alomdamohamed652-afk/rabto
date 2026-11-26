import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, supportMessages, supportTickets } from "@/db/schema";
import { SUPPORT_LIMITS, statusAfterMessage } from "@/lib/support-rules.mjs";

export class SupportError extends Error { constructor(public status: number, message: string) { super(message); } }

export async function createTicket(a: { workspaceId: string; userId: string; subject: string; body: string }) {
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${"support:" + a.workspaceId}))`);
    const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(supportTickets).where(and(eq(supportTickets.workspaceId, a.workspaceId), sql`${supportTickets.status} <> 'closed'`));
    if (n >= SUPPORT_LIMITS.openTicketsPerWorkspace) throw new SupportError(429, "Too many open tickets. Wait for support or close one.");
    // Idempotency: an identical ticket from the same user within 60 s is a retry, return the original.
    const [dup] = await tx.select({ t: supportTickets }).from(supportTickets).innerJoin(supportMessages, eq(supportMessages.ticketId, supportTickets.id)).where(and(eq(supportTickets.workspaceId, a.workspaceId), eq(supportTickets.createdByUserId, a.userId), eq(supportTickets.subject, a.subject), eq(supportMessages.body, a.body), sql`${supportTickets.createdAt} > now() - interval '60 seconds'`)).limit(1);
    if (dup) return dup.t;
    const [t] = await tx.insert(supportTickets).values({ workspaceId: a.workspaceId, createdByUserId: a.userId, subject: a.subject }).returning();
    await tx.insert(supportMessages).values({ ticketId: t.id, authorUserId: a.userId, fromStaff: false, body: a.body });
    await tx.insert(auditLogs).values({ workspaceId: a.workspaceId, actorUserId: a.userId, action: "support.ticket_created", entityType: "support_ticket", entityId: t.id, details: {} });
    return t;
  });
}

/** Adds a message under a ticket lock. Customer messages reopen a closed ticket; staff replies need not. */
export async function addMessage(a: { ticketId: string; userId: string; fromStaff: boolean; body: string }) {
  return getDb().transaction(async (tx) => {
    const [t] = await tx.select().from(supportTickets).where(eq(supportTickets.id, a.ticketId)).for("update");
    if (!t) throw new SupportError(404, "Ticket not found.");
    const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(supportMessages).where(eq(supportMessages.ticketId, t.id));
    if (n >= SUPPORT_LIMITS.messagesPerTicket) throw new SupportError(429, "This ticket reached its message limit.");
    // Idempotency: the same author sending the same text within 60 s is a retry, not a new message.
    const [dup] = await tx.select().from(supportMessages).where(and(eq(supportMessages.ticketId, t.id), eq(supportMessages.authorUserId, a.userId), eq(supportMessages.body, a.body), sql`${supportMessages.createdAt} > now() - interval '60 seconds'`)).limit(1);
    if (dup) return { message: dup, workspaceId: t.workspaceId };
    const [m] = await tx.insert(supportMessages).values({ ticketId: t.id, authorUserId: a.userId, fromStaff: a.fromStaff, body: a.body }).returning();
    await tx.update(supportTickets).set({ status: statusAfterMessage(a.fromStaff), lastMessageAt: new Date(), updatedAt: new Date() }).where(eq(supportTickets.id, t.id));
    await tx.insert(auditLogs).values({ workspaceId: t.workspaceId, actorUserId: a.userId, action: a.fromStaff ? "support.staff_replied" : "support.customer_replied", entityType: "support_ticket", entityId: t.id, details: {} });
    return { message: m, workspaceId: t.workspaceId };
  });
}

export async function setStatus(a: { ticketId: string; userId: string; status: "open" | "pending" | "closed" }) {
  return getDb().transaction(async (tx) => {
    const [t] = await tx.select().from(supportTickets).where(eq(supportTickets.id, a.ticketId)).for("update");
    if (!t) throw new SupportError(404, "Ticket not found.");
    await tx.update(supportTickets).set({ status: a.status, updatedAt: new Date() }).where(eq(supportTickets.id, t.id));
    await tx.insert(auditLogs).values({ workspaceId: t.workspaceId, actorUserId: a.userId, action: "support.status_changed", entityType: "support_ticket", entityId: t.id, details: { from: t.status, to: a.status } });
  });
}

export async function loadThread(ticketId: string) {
  const db = getDb();
  const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId)).limit(1);
  if (!ticket) return null;
  const messages = await db.select({ id: supportMessages.id, fromStaff: supportMessages.fromStaff, body: supportMessages.body, createdAt: supportMessages.createdAt }).from(supportMessages).where(eq(supportMessages.ticketId, ticketId)).orderBy(asc(supportMessages.createdAt)).limit(SUPPORT_LIMITS.messagesPerTicket);
  return { ticket, messages };
}
