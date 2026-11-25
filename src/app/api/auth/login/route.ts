import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { sessionCookie, createSessionToken, verifyPassword } from "@/lib/auth";
import { clientIpFromForwardedFor, progressiveAccountDelayMs, rateLimitHash, successfulLoginResetTargets } from "@/lib/security-primitives.mjs";
import { activeLock, clearRateLimitKey, isTrustedLoginIp, readRateLimitRows, recordRateLimitFailure, rememberSuccessfulLoginIp, type RateLimitKey } from "@/lib/persistent-rate-limit";

export const runtime = "nodejs";
const WINDOW_15M = 900;
const WINDOW_1H = 3600;
function tooManyAttempts(seconds: number) {
  return NextResponse.json({ error: "Too many failed attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(seconds) } });
}
export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid email or password." }, { status: 400 }); }
  if (typeof body.email !== "string" || typeof body.password !== "string" || body.email.length > 320 || body.password.length > 128) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });
  }
  const email = body.email.trim().toLowerCase();
  const ip = clientIpFromForwardedFor(request.headers.get("x-forwarded-for"), process.env.TRUSTED_PROXY_HOPS);
  const db = getDb();
  const accountHash = rateLimitHash("account:" + email);
  const ipHash = ip ? rateLimitHash("ip:" + ip) : null;
  const pairKey: RateLimitKey | null = ip ? { keyType: "login_email_ip", keyHash: rateLimitHash("login-email-ip:" + email + ":" + ip) } : null;
  const ipKey: RateLimitKey | null = ip ? { keyType: "login_ip", keyHash: rateLimitHash("login-ip:" + ip) } : null;
  const accountKey: RateLimitKey = { keyType: "login_account", keyHash: accountHash };
  const shortKeys = [pairKey, ipKey].filter((key): key is RateLimitKey => key !== null);
  const lock = activeLock(await readRateLimitRows(db, shortKeys));
  if (!lock.allowed) return tooManyAttempts(lock.retryAfterSeconds);
  const [accountCounter] = await readRateLimitRows(db, [accountKey]);
  const trusted = Boolean(ipHash && await isTrustedLoginIp(db, accountHash, ipHash));
  const delay = progressiveAccountDelayMs(accountCounter?.failedCount ?? 0, trusted);
  if (delay) await new Promise((resolve) => setTimeout(resolve, delay));

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const [user] = validEmail ? await db.select({ id: users.id, passwordHash: users.passwordHash, platformRole: users.platformRole })
    .from(users).where(sql`lower(${users.email}) = ${email}`).limit(1) : [];
  const valid = await verifyPassword(body.password, user?.passwordHash ?? null);
  if (!user || !valid) {
    await Promise.all([
      pairKey ? recordRateLimitFailure(db, pairKey, 10, WINDOW_15M) : Promise.resolve(),
      ipKey ? recordRateLimitFailure(db, ipKey, 50, WINDOW_15M) : Promise.resolve(),
      recordRateLimitFailure(db, accountKey, 100, WINDOW_1H, false),
    ]);
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
  for (const resetKey of successfulLoginResetTargets(pairKey)) await clearRateLimitKey(db, resetKey);
  if (ipHash) await rememberSuccessfulLoginIp(db, accountHash, ipHash);
  const response = NextResponse.json({ success: true, role: user.platformRole });
  response.headers.append("Set-Cookie", sessionCookie(createSessionToken(user.id)));
  return response;
}
