import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { loginAttempts, users } from "@/db/schema";
import { sessionCookie, createSessionToken, verifyPassword } from "@/lib/auth";
import { clientIpFromForwardedFor, progressiveAccountDelayMs, rateLimitHash } from "@/lib/security-primitives.mjs";
import {
  activeLock, clearRateLimitKey, isTrustedLoginIp, recordAccountSoftFailure,
  recordRateLimitFailure, rememberSuccessfulLoginIp, type RateLimitKey,
} from "@/lib/persistent-rate-limit";

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
  const unknownKey: RateLimitKey | null = ip ? null : { keyType: "login_email_unknown_ip", keyHash: rateLimitHash("login-email-unknown:" + email) };
  const accountKey: RateLimitKey = { keyType: "login_account", keyHash: accountHash };
  const pairAndIpKeys = [pairKey, ipKey].filter((key): key is RateLimitKey => key !== null);
  const serializedKeys = [accountKey, ...pairAndIpKeys, ...(unknownKey ? [unknownKey] : [])]
    .sort((a, b) => a.keyType.localeCompare(b.keyType) || a.keyHash.localeCompare(b.keyHash));

  const result = await db.transaction(async (tx) => {
    // Create then lock each row in a deterministic order. This serializes concurrent
    // attempts for the same account/unknown-IP bucket across all app instances.
    const lockedRows = new Map<string, typeof loginAttempts.$inferSelect>();
    for (const key of serializedKeys) {
      await tx.insert(loginAttempts).values({
        keyType: key.keyType, keyHash: key.keyHash, failedCount: 0, windowStart: new Date(), lockedUntil: null,
      }).onConflictDoNothing();
      const [row] = await tx.select().from(loginAttempts).where(and(
        eq(loginAttempts.keyType, key.keyType), eq(loginAttempts.keyHash, key.keyHash),
      )).for("update");
      if (row) lockedRows.set(key.keyType, row);
    }

    const ipPairLock = activeLock(pairAndIpKeys.map((key) => lockedRows.get(key.keyType)).filter((row): row is NonNullable<typeof row> => Boolean(row)));
    if (!ipPairLock.allowed) return { kind: "limited" as const, retryAfterSeconds: ipPairLock.retryAfterSeconds };

    const trusted = Boolean(ipHash && await isTrustedLoginIp(tx, accountHash, ipHash));
    const accountRow = lockedRows.get(accountKey.keyType);
    if (!trusted && accountRow?.lockedUntil && accountRow.lockedUntil.getTime() > Date.now()) {
      return { kind: "limited" as const, retryAfterSeconds: Math.max(1, Math.ceil((accountRow.lockedUntil.getTime() - Date.now()) / 1000)) };
    }
    if (unknownKey) {
      const unknownLock = activeLock([lockedRows.get(unknownKey.keyType)].filter((row): row is NonNullable<typeof row> => Boolean(row)));
      if (!unknownLock.allowed) return { kind: "limited" as const, retryAfterSeconds: unknownLock.retryAfterSeconds };
    }

    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const [user] = validEmail ? await tx.select({
      id: users.id, passwordHash: users.passwordHash, platformRole: users.platformRole,
    }).from(users).where(sql`lower(${users.email}) = ${email}`).limit(1) : [];
    const valid = await verifyPassword(body.password, user?.passwordHash ?? null);

    if (!user || !valid) {
      if (pairKey) await recordRateLimitFailure(tx, pairKey, 10, WINDOW_15M);
      if (ipKey) await recordRateLimitFailure(tx, ipKey, 50, WINDOW_15M);
      if (unknownKey) await recordRateLimitFailure(tx, unknownKey, 30, WINDOW_15M);
      const expired = !accountRow || accountRow.windowStart.getTime() <= Date.now() - WINDOW_1H * 1000;
      const nextCount = expired ? 1 : accountRow.failedCount + 1;
      const delaySeconds = progressiveAccountDelayMs(nextCount, false) / 1000;
      await recordAccountSoftFailure(tx, accountKey, WINDOW_1H, delaySeconds);
      return { kind: "invalid" as const };
    }

    if (pairKey) await clearRateLimitKey(tx, pairKey);
    if (unknownKey) await clearRateLimitKey(tx, unknownKey);
    if (ipHash) await rememberSuccessfulLoginIp(tx, accountHash, ipHash);
    return { kind: "success" as const, user };
  });

  if (result.kind === "limited") return tooManyAttempts(result.retryAfterSeconds);
  if (result.kind === "invalid") return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  const response = NextResponse.json({ success: true, role: result.user.platformRole });
  response.headers.append("Set-Cookie", sessionCookie(createSessionToken(result.user.id)));
  return response;
}
