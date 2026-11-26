import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { creditAccounts, creditLedger, products } from "@/db/schema";
import { readSessionCookie } from "@/lib/auth";
import { requireWorkspaceMember } from "@/lib/access-control";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const userId = readSessionCookie(request.headers.get("cookie"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!workspaceId) return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  try {
    await requireWorkspaceMember(userId, workspaceId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const db = getDb();
    const accounts = await db.select({
      accountId: creditAccounts.id, productId: creditAccounts.productId, channel: creditAccounts.channel, balance: creditAccounts.balance,
    }).from(creditAccounts).innerJoin(products, eq(products.id, creditAccounts.productId))
      .where(eq(products.workspaceId, workspaceId)).limit(500);
    const recent = await db.select({
      accountId: creditLedger.accountId, entryType: creditLedger.entryType, amount: creditLedger.amount,
      balanceAfter: creditLedger.balanceAfter, reason: creditLedger.reason, createdAt: creditLedger.createdAt,
    }).from(creditLedger).innerJoin(creditAccounts, eq(creditAccounts.id, creditLedger.accountId))
      .innerJoin(products, and(eq(products.id, creditAccounts.productId), eq(products.workspaceId, workspaceId)))
      .orderBy(desc(creditLedger.createdAt)).limit(50);
    return NextResponse.json({ accounts, recent });
  } catch {
    return NextResponse.json({ error: "Unable to load credits." }, { status: 500 });
  }
}
