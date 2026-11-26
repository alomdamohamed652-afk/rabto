import "server-only";
import { cookies } from "next/headers";
import { getActorByUserId, type AuthenticatedActor } from "@/lib/access-control";
import { verifySessionLive } from "@/lib/auth";

const SESSION_COOKIE = "rabto_session";

/** Resolve the signed, HTTP-only session and re-check the account role in PostgreSQL. */
export async function getCurrentActor(): Promise<AuthenticatedActor | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const userId = await verifySessionLive(token);
  if (!userId) return null;
  return getActorByUserId(userId);
}

/** Use in protected server pages/actions; never trust a role supplied by the browser. */
export async function requireCurrentActor(): Promise<AuthenticatedActor> {
  const actor = await getCurrentActor();
  if (!actor) throw new Error("Unauthenticated");
  return actor;
}
