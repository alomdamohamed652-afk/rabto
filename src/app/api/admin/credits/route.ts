import { NextResponse } from "next/server";
import { readSessionCookie } from "@/lib/auth";
import { requirePlatformAdmin } from "@/lib/access-control";
import { postCreditEntry } from "@/lib/credits";
import { validateCreditEntry } from "@/lib/credit-rules.mjs";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const userId = readSessionCookie(request.headers.get("cookie"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await requirePlatformAdmin(userId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const parsed = validateCreditEntry(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const result = await postCreditEntry({ ...parsed.value, actorUserId: userId });
    if (result.kind === "account-not-found") return NextResponse.json({ error: "Credit account not found." }, { status: 404 });
    if (result.kind === "insufficient") return NextResponse.json({ error: "Balance cannot go below zero." }, { status: 409 });
    if (result.kind === "key-conflict") return NextResponse.json({ error: "Idempotency key was used with a different request." }, { status: 409 });
    return NextResponse.json({ entryId: result.entryId, balanceAfter: result.balanceAfter, replayed: result.kind === "replayed" }, { status: result.kind === "posted" ? 201 : 200 });
  } catch (error) {
    console.error("RABTO credit entry failed", error);
    return NextResponse.json({ error: "Unable to post credit entry." }, { status: 500 });
  }
}
