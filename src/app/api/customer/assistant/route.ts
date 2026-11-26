import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { readSessionCookie } from "@/lib/auth";
import { recordRateLimitFailure, type RateLimitKey } from "@/lib/persistent-rate-limit";
import { rateLimitHash } from "@/lib/security-primitives.mjs";
import { FALLBACK, answer, buildIndex, validateQuestion } from "@/lib/assistant-rules.mjs";
import { loadVisibleContacts, loadVisibleEntries, toFaq, toIndexEntries } from "@/lib/guide";

export const runtime = "nodejs";

/** FAQ list (by topic) and support contacts, both edited by platform admins. */
export async function GET(request: Request) {
  const userId = await readSessionCookie(request.headers.get("cookie"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await loadVisibleEntries();
    return NextResponse.json({ topics: toFaq(rows), contacts: await loadVisibleContacts() });
  } catch { return NextResponse.json({ error: "Unable to load the guide." }, { status: 500 }); }
}

/** Built-in help guide. Signed-in customers only. Nothing is stored and nothing leaves the server. */
export async function POST(request: Request) {
  const userId = await readSessionCookie(request.headers.get("cookie"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const v = validateQuestion(body);
  if (!v.ok) return NextResponse.json({ error: "Write a question of up to 300 characters." }, { status: 400 });
  try {
    // Count first, decide on the returned count (atomic), 60 questions per hour per user.
    const key: RateLimitKey = { keyType: "assistant_user", keyHash: rateLimitHash("assistant-user:" + userId) };
    const counted = await recordRateLimitFailure(getDb(), key, 60, 3600, false);
    if (counted.failedCount > 60) return NextResponse.json({ error: "Too many questions. Try again later." }, { status: 429 });
  } catch { return NextResponse.json({ error: "Unable to answer right now." }, { status: 500 }); }
  try {
    const rows = await loadVisibleEntries();
    const bySlug = (body as { faqId?: unknown })?.faqId;
    const row = typeof bySlug === "string" ? rows.find((x) => x.slug === bySlug) : undefined;
    const r = row ? { matched: true, section: row.section, text: v.lang === "en" ? row.answerEn : row.answerAr } : answer(v.question, v.lang, buildIndex(toIndexEntries(rows)));
    // No match: offer the support actions (existing ticket flow plus any visible contact channel).
    const contacts = r.matched ? [] : await loadVisibleContacts();
    return NextResponse.json({ matched: r.matched, section: r.matched ? r.section : "support", text: r.matched ? r.text : FALLBACK[v.lang], contacts, source: "built-in guide" });
  } catch { return NextResponse.json({ error: "Unable to answer right now." }, { status: 500 }); }
}
