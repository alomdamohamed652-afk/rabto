import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { SESSION_COOKIE, expiredSessionCookie, verifySessionClaims } from "@/lib/auth";

// Logging out also bumps the account's session epoch, so a copied token stops working on the server.
// This signs the account out on every device. Failure to reach the database never blocks the logout.
export async function POST(request: Request) {
  try {
    const prefix = `${SESSION_COOKIE}=`;
    const item = (request.headers.get("cookie") || "").split(";").map((p) => p.trim()).find((p) => p.startsWith(prefix));
    const claims = item ? verifySessionClaims(item.slice(prefix.length)) : null;
    if (claims) {
      await getDb().update(users).set({ sessionEpoch: sql`${users.sessionEpoch} + 1` }).where(eq(users.id, claims.sub));
    }
  } catch (error) {
    console.error("RABTO logout epoch bump failed", error);
  }
  const response = NextResponse.json({ success: true });
  response.headers.append("Set-Cookie", expiredSessionCookie());
  return response;
}
