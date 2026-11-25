import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  auditLogs,
  productClaims,
  productCodes,
  products,
  users,
  workspaceMembers,
} from "@/db/schema";
import { readSessionCookie } from "@/lib/auth";
import {
  checkRateLimit,
  clearRateLimit,
  constantTimeHexEqual,
  recordRateLimitFailure,
} from "@/lib/security-primitives.mjs";

export const runtime = "nodejs";

const NOT_FOUND = { error: "Activation details are invalid." };

function tooManyAttempts(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: "Too many failed attempts. Try again later." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}

export async function POST(request: Request) {
  const userId = readSessionCookie(request.headers.get("cookie"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { workspaceId?: unknown; publicCode?: unknown; activationSecret?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(NOT_FOUND, { status: 404 });
  }

  if (
    typeof body.workspaceId !== "string" ||
    typeof body.publicCode !== "string" ||
    typeof body.activationSecret !== "string" ||
    body.workspaceId.length > 64 ||
    body.publicCode.length < 6 ||
    body.publicCode.length > 32 ||
    body.activationSecret.length < 16 ||
    body.activationSecret.length > 128
  ) {
    return NextResponse.json(NOT_FOUND, { status: 404 });
  }

  // Preserve the validated string types across the transaction callback.
  const workspaceId = body.workspaceId;
  const publicCode = body.publicCode;
  const activationSecret = body.activationSecret;

  try {
    const db = getDb();
    const [actor] = await db.select({ email: users.email })
      .from(users).where(eq(users.id, userId)).limit(1);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Email-only key avoids spoofable forwarding headers; attempts share one bucket
    // for this account across client IPs on this server instance.
    const key = `activation:${actor.email.trim().toLowerCase()}`;
    const limit = checkRateLimit(key);
    if (!limit.allowed) return tooManyAttempts(limit.retryAfterSeconds);

    const result = await db.transaction(async (tx) => {
      // Membership is derived from the signed-in session subject, never from
      // a client-supplied user or role. It is checked in this transaction.
      const [candidate] = await tx
        .select({
          productId: products.id,
          activationSecretHash: productCodes.activationSecretHash,
          activatedAt: productCodes.activatedAt,
        })
        .from(workspaceMembers)
        .innerJoin(products, eq(products.workspaceId, workspaceMembers.workspaceId))
        .innerJoin(productCodes, eq(productCodes.productId, products.id))
        .where(and(
          eq(workspaceMembers.userId, userId),
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(productCodes.publicCode, publicCode),
        ))
        .limit(1);

      // Do not distinguish an unknown code, another tenant's code, or a bad
      // secret. This avoids disclosing code ownership across workspaces.
      if (!candidate || !constantTimeHexEqual(
        candidate.activationSecretHash,
        activationSecret,
      )) {
        return { kind: "not-found" as const };
      }

      if (candidate.activatedAt) return { kind: "conflict" as const };

      // QR and NFC codes share a product. Claiming either code activates all
      // of that product's codes in one atomic transaction.
      const activated = await tx
        .update(productCodes)
        .set({ activatedAt: new Date(), updatedAt: new Date() })
        .where(and(
          eq(productCodes.productId, candidate.productId),
          isNull(productCodes.activatedAt),
        ))
        .returning({ id: productCodes.id });

      if (activated.length === 0) return { kind: "conflict" as const };

      await tx.insert(productClaims).values({
        productId: candidate.productId,
        workspaceId,
        claimedByUserId: userId,
      });

      await tx.update(products)
        .set({ status: "claimed", updatedAt: new Date() })
        .where(eq(products.id, candidate.productId));

      await tx.insert(auditLogs).values({
        workspaceId,
        actorUserId: userId,
        action: "product.activated",
        entityType: "product",
        entityId: candidate.productId,
        details: {
          activatedVia: publicCode,
          activatedCodeCount: activated.length,
        },
      });

      return { kind: "activated" as const, productId: candidate.productId };
    });

    if (result.kind === "not-found") {
      recordRateLimitFailure(key);
      return NextResponse.json(NOT_FOUND, { status: 404 });
    }
    if (result.kind === "conflict") return NextResponse.json({ error: "Product is already activated." }, { status: 409 });
    clearRateLimit(key);
    return NextResponse.json({ success: true, productId: result.productId }, { status: 200 });
  } catch (error) {
    console.error("RABTO product activation failed", error);
    return NextResponse.json({ error: "Unable to activate product." }, { status: 500 });
  }
}
