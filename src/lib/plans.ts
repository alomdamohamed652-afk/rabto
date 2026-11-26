import "server-only";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, plans, workspaceSubscriptions, workspaces } from "@/db/schema";

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export type Entitlements = { maxActivatedProducts: number | null; maxPages: number | null; analyticsEnabled: boolean };
const UNRESTRICTED: Entitlements = { maxActivatedProducts: null, maxPages: null, analyticsEnabled: true };

/** Entitlements of a workspace. No assigned plan means unrestricted (existing workspaces are unchanged). */
export async function entitlementsFor(tx: Db | Tx, workspaceId: string): Promise<Entitlements> {
  const [row] = await tx.select({ maxActivatedProducts: plans.maxActivatedProducts, maxPages: plans.maxPages, analyticsEnabled: plans.analyticsEnabled })
    .from(workspaceSubscriptions).innerJoin(plans, eq(plans.id, workspaceSubscriptions.planId))
    .where(eq(workspaceSubscriptions.workspaceId, workspaceId)).limit(1);
  return row ?? UNRESTRICTED;
}

/** Serialises limit checks per workspace for the rest of the transaction. */
export async function lockWorkspace(tx: Tx, workspaceId: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${"ws:" + workspaceId}))`);
}

export type AssignResult = "ok" | "no-workspace" | "no-plan" | "inactive-plan";

/** Record-only plan assignment, audit-logged with the previous plan. No billing, credits or product changes. */
export async function assignPlan(tx: Tx, v: { workspaceId: string; planId: string; status: "active" | "expired" | "cancelled"; endsAt: Date | null; actorUserId: string }): Promise<AssignResult> {
  const [ws] = await tx.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.id, v.workspaceId)).limit(1);
  if (!ws) return "no-workspace";
  const [plan] = await tx.select({ id: plans.id, isActive: plans.isActive }).from(plans).where(eq(plans.id, v.planId)).limit(1);
  if (!plan) return "no-plan";
  if (!plan.isActive) return "inactive-plan";
  const [prev] = await tx.select({ planId: workspaceSubscriptions.planId, status: workspaceSubscriptions.status }).from(workspaceSubscriptions).where(eq(workspaceSubscriptions.workspaceId, v.workspaceId)).limit(1);
  await tx.insert(workspaceSubscriptions).values({ workspaceId: v.workspaceId, planId: v.planId, status: v.status, endsAt: v.endsAt, assignedBy: v.actorUserId })
    .onConflictDoUpdate({ target: workspaceSubscriptions.workspaceId, set: { planId: v.planId, status: v.status, endsAt: v.endsAt, assignedBy: v.actorUserId, updatedAt: new Date() } });
  await tx.insert(auditLogs).values({ workspaceId: v.workspaceId, actorUserId: v.actorUserId, action: prev ? "subscription.changed" : "subscription.assigned", entityType: "workspace_subscription", entityId: v.workspaceId,
    details: { planId: v.planId, status: v.status, endsAt: v.endsAt, previousPlanId: prev?.planId ?? null, previousStatus: prev?.status ?? null } });
  return "ok";
}
