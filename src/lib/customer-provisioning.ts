import "server-only";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, users, workspaceMembers, workspaces } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/access-control";
import { assignPlan } from "@/lib/plans";

export type CreateCustomerInput = {
  actorUserId: string;
  email: string;
  workspaceName: string;
  workspaceSlug: string;
  /** Optional plan, assigned in the SAME transaction: if it fails, no customer is created. */
  planId?: string | null;
};

/**
 * Creates a customer login identity and its workspace atomically.
 * No password is generated or emailed here: the account remains unable to
 * sign in until a separately implemented, expiring invitation/reset flow
 * establishes a password.
 */
export async function createCustomerAccount(input: CreateCustomerInput) {
  await requirePlatformAdmin(input.actorUserId);
  const email = input.email.trim().toLowerCase();
  const workspaceName = input.workspaceName.trim();
  const workspaceSlug = input.workspaceSlug.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
    throw new Error("A valid customer email is required.");
  }
  if (workspaceName.length < 2 || workspaceName.length > 120) {
    throw new Error("Workspace name must be 2–120 characters.");
  }
  if (!/^[a-z0-9](?:[a-z0-9-]{1,78}[a-z0-9])?$/.test(workspaceSlug)) {
    throw new Error("Workspace slug must contain 3–80 lowercase letters, numbers, or hyphens.");
  }

  const db = getDb();
  return db.transaction(async (tx) => {
    const [existingUser] = await tx.select({ id: users.id })
      .from(users).where(sql`lower(${users.email}) = ${email}`).limit(1);
    if (existingUser) throw new Error("A user with this email already exists.");
    const [existingWorkspace] = await tx.select({ id: workspaces.id })
      .from(workspaces).where(eq(workspaces.slug, workspaceSlug)).limit(1);
    if (existingWorkspace) throw new Error("This workspace slug is already in use.");

    const [user] = await tx.insert(users).values({
      email,
      platformRole: "customer",
      passwordHash: null,
    }).returning({ id: users.id, email: users.email });
    const [workspace] = await tx.insert(workspaces).values({
      name: workspaceName,
      slug: workspaceSlug,
    }).returning({ id: workspaces.id, name: workspaces.name, slug: workspaces.slug });
    await tx.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: user.id,
      role: "owner",
    });
    await tx.insert(auditLogs).values({
      actorUserId: input.actorUserId,
      workspaceId: workspace.id,
      action: "customer.account_created",
      entityType: "workspace",
      entityId: workspace.id,
      details: { customerUserId: user.id, email: user.email },
    });
    if (input.planId) {
      const r = await assignPlan(tx, { workspaceId: workspace.id, planId: input.planId, status: "active", endsAt: null, actorUserId: input.actorUserId });
      if (r === "no-plan") throw new Error("Plan not found.");
      if (r === "inactive-plan") throw new Error("Plan must be active.");
      if (r !== "ok") throw new Error("Unable to assign plan.");
    }
    return { user, workspace, invitationRequired: true as const };
  });
}
