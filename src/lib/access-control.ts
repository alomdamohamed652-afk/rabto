import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users, workspaceMembers, workspaces } from "@/db/schema";

export type AuthenticatedActor = { userId: string; platformRole: "admin" | "customer" };

/** Resolve a user from a trusted server-side session subject. */
export async function getActorByUserId(userId: string): Promise<AuthenticatedActor | null> {
  const db = getDb();
  const [user] = await db.select({ userId: users.id, platformRole: users.platformRole })
    .from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;
  return { userId: user.userId, platformRole: user.platformRole };
}

/** Check platform privilege in the database, not from client-supplied role data. */
export async function requirePlatformAdmin(sessionUserId: string): Promise<AuthenticatedActor> {
  const actor = await getActorByUserId(sessionUserId);
  if (!actor || actor.platformRole !== "admin") throw new Error("Forbidden: platform administrator access required.");
  return actor;
}

/** Check workspace membership using the authenticated session user ID. */
export async function requireWorkspaceMember(sessionUserId: string, workspaceId: string) {
  const db = getDb();
  const [membership] = await db.select({ userId: workspaceMembers.userId, workspaceId: workspaceMembers.workspaceId, role: workspaceMembers.role })
    .from(workspaceMembers).where(and(
      eq(workspaceMembers.userId, sessionUserId),
      eq(workspaceMembers.workspaceId, workspaceId),
    )).limit(1);
  if (!membership) throw new Error("Forbidden: workspace membership required.");
  return membership;
}

/** A workspace owner is created as the first member when provisioning a customer. */
export async function getWorkspaceOwner(workspaceId: string) {
  const db = getDb();
  const [owner] = await db.select({ userId: workspaceMembers.userId, email: users.email, workspaceName: workspaces.name })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.role, "owner")))
    .limit(1);
  return owner ?? null;
}
