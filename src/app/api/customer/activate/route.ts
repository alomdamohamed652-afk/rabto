import { and, count, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { auditLogs, productClaims, productCodes, products, workspaceMembers } from "@/db/schema";
import { entitlementsFor, lockWorkspace } from "@/lib/plans";
import { canAddMore } from "@/lib/plan-rules.mjs";
import { readSessionCookie } from "@/lib/auth";
import { clientIpFromForwardedFor, rateLimitHash, constantTimeHexEqual } from "@/lib/security-primitives.mjs";
import { activeLock, clearRateLimitKey, readRateLimitRows, recordRateLimitFailure, type RateLimitKey } from "@/lib/persistent-rate-limit";

export const runtime = "nodejs";
const NOT_FOUND = { error: "Activation details are invalid." };
function tooManyAttempts(seconds: number) {
  return NextResponse.json({ error: "Too many failed attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(seconds) } });
}
export async function POST(request: Request) {
  const userId = await readSessionCookie(request.headers.get("cookie"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: { workspaceId?: unknown; publicCode?: unknown; activationSecret?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json(NOT_FOUND, { status: 404 }); }
  if (typeof body.workspaceId !== "string" || typeof body.publicCode !== "string" || typeof body.activationSecret !== "string" ||
      body.workspaceId.length > 64 || body.publicCode.length < 6 || body.publicCode.length > 32 ||
      body.activationSecret.length < 16 || body.activationSecret.length > 128) return NextResponse.json(NOT_FOUND, { status: 404 });

  const workspaceId = body.workspaceId;
  const publicCode = body.publicCode;
  const activationSecret = body.activationSecret;

  try {
    const db = getDb();
    const ip = clientIpFromForwardedFor(request.headers.get("x-forwarded-for"), process.env.TRUSTED_PROXY_HOPS);
    const key: RateLimitKey = ip
      ? { keyType: "activation_user_ip", keyHash: rateLimitHash("activation:" + userId + ":" + ip) }
      : { keyType: "activation_user_unknown_ip", keyHash: rateLimitHash("activation-unknown:" + userId) };
    const lock = activeLock(await readRateLimitRows(db, [key]));
    if (!lock.allowed) return tooManyAttempts(lock.retryAfterSeconds);

    const result = await db.transaction(async (tx) => {
      const [candidate] = await tx.select({ productId: products.id, activationSecretHash: productCodes.activationSecretHash, activatedAt: productCodes.activatedAt })
        .from(workspaceMembers).innerJoin(products, eq(products.workspaceId, workspaceMembers.workspaceId))
        .innerJoin(productCodes, eq(productCodes.productId, products.id))
        .where(and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, workspaceId), eq(productCodes.publicCode, publicCode))).limit(1);
      if (!candidate || !constantTimeHexEqual(candidate.activationSecretHash, activationSecret)) return { kind: "not-found" as const };
      if (candidate.activatedAt) return { kind: "conflict" as const };
      await lockWorkspace(tx, workspaceId);
      const ent = await entitlementsFor(tx, workspaceId);
      if (ent.maxActivatedProducts !== null) {
        const [{ n }] = await tx.select({ n: count() }).from(productClaims).where(eq(productClaims.workspaceId, workspaceId));
        if (!canAddMore(ent.maxActivatedProducts, n)) return { kind: "limit" as const };
      }
      const activated = await tx.update(productCodes).set({ activatedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(productCodes.productId, candidate.productId), isNull(productCodes.activatedAt))).returning({ id: productCodes.id });
      if (!activated.length) return { kind: "conflict" as const };
      await tx.insert(productClaims).values({ productId: candidate.productId, workspaceId, claimedByUserId: userId });
      await tx.update(products).set({ status: "claimed", updatedAt: new Date() }).where(eq(products.id, candidate.productId));
      await tx.insert(auditLogs).values({ workspaceId, actorUserId: userId, action: "product.activated", entityType: "product", entityId: candidate.productId, details: { activatedVia: publicCode, activatedCodeCount: activated.length } });
      return { kind: "activated" as const, productId: candidate.productId };
    });
    if (result.kind === "not-found") {
      await recordRateLimitFailure(db, key, 10, 900);
      return NextResponse.json(NOT_FOUND, { status: 404 });
    }
    if (result.kind === "limit") { await clearRateLimitKey(db, key); return NextResponse.json({ error: "Your plan's limit for activated products is reached.", code: "plan_limit" }, { status: 403 }); }
    if (result.kind === "conflict") return NextResponse.json({ error: "Product is already activated." }, { status: 409 });
    await clearRateLimitKey(db, key);
    return NextResponse.json({ success: true, productId: result.productId }, { status: 200 });
  } catch (error) {
    console.error("RABTO product activation failed", error);
    return NextResponse.json({ error: "Unable to activate product." }, { status: 500 });
  }
}
