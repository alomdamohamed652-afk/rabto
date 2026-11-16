import { redirect } from "next/navigation";
import { getCurrentActor } from "@/lib/session";
import AdminConsole from "./admin-console";

export const runtime = "nodejs";

export default async function AdminPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  if (actor.platformRole !== "admin") redirect("/app");
  return <AdminConsole />;
}
