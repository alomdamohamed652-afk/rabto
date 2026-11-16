import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { getCurrentActor } from "@/lib/session";
import { users, workspaceMembers, workspaces } from "@/db/schema";
import CustomerConsole from "./customer-console";

export const runtime = "nodejs";

export default async function CustomerPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  if (actor.platformRole === "admin") redirect("/admin");
  const db = getDb();
  const [user] = await db.select({ email: users.email })
    .from(users).where(eq(users.id, actor.userId)).limit(1);
  const memberships = await db.select({
    workspaceId: workspaces.id,
    workspaceName: workspaces.name,
    workspaceSlug: workspaces.slug,
    role: workspaceMembers.role,
  }).from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(workspaceMembers.userId, actor.userId))
    .orderBy(asc(workspaces.name));
  return <CustomerConsole email={user?.email ?? ""} workspaces={memberships} />;
}
