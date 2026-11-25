import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { sessionCookie, createSessionToken, verifyPassword } from "@/lib/auth";
import { checkRateLimit, clearRateLimit, recordRateLimitFailure } from "@/lib/security-primitives.mjs";

export const runtime = "nodejs";

function tooManyAttempts(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: "Too many failed attempts. Try again later." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });
  }

  if (typeof body.email !== "string" || typeof body.password !== "string" ||
      body.email.length > 320 || body.password.length > 128) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();
  // Email-only key: never trust client-supplied forwarding headers for IP identity.
  // The in-memory bucket is shared across IPs for this email on this instance.
  const key = `login:${email}`;
  const limit = checkRateLimit(key);
  if (!limit.allowed) return tooManyAttempts(limit.retryAfterSeconds);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    recordRateLimitFailure(key);
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const db = getDb();
  const [user] = await db.select({
    id: users.id,
    passwordHash: users.passwordHash,
    platformRole: users.platformRole,
  }).from(users).where(sql`lower(${users.email}) = ${email}`).limit(1);

  // Perform a password verification even when the account does not exist to
  // reduce the account-enumeration timing difference.
  const valid = await verifyPassword(body.password, user?.passwordHash ?? null);
  if (!user || !valid) {
    recordRateLimitFailure(key);
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  clearRateLimit(key);
  const response = NextResponse.json({ success: true, role: user.platformRole });
  response.headers.append("Set-Cookie", sessionCookie(createSessionToken(user.id)));
  return response;
}
