import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { readSessionCookie } from "@/lib/auth";
import { requireWorkspaceMember } from "@/lib/access-control";
import { recordRateLimitFailure, type RateLimitKey } from "@/lib/persistent-rate-limit";
import { rateLimitHash } from "@/lib/security-primitives.mjs";
import { IMAGE_LIMITS, validateImageBytes } from "@/lib/image-rules.mjs";
import { getStorage, newObjectName } from "@/lib/storage";

export const runtime = "nodejs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HOURLY_UPLOADS = 30;

/** POST /api/customer/uploads?workspaceId=... with the raw image bytes as the body. */
export async function POST(request: Request) {
  const userId = await readSessionCookie(request.headers.get("cookie"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!workspaceId || !UUID.test(workspaceId)) return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  try { await requireWorkspaceMember(userId, workspaceId); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  const storage = getStorage();
  if (!storage) return NextResponse.json({ error: "Photo upload is not set up yet. Use an https photo link for now.", code: "storage_not_configured" }, { status: 503 });
  const declared = Number(request.headers.get("content-length") || "0");
  if (declared > IMAGE_LIMITS.maxBytes) return NextResponse.json({ error: "Photo is too large (2 MB maximum).", code: "too_large" }, { status: 413 });
  let bytes: Uint8Array;
  // Read the body as a stream and stop as soon as it passes the limit, even when Content-Length is missing or wrong.
  try {
    const reader = request.body?.getReader();
    if (!reader) return NextResponse.json({ error: "The file is empty.", code: "empty" }, { status: 400 });
    const chunks: Uint8Array[] = []; let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > IMAGE_LIMITS.maxBytes) { await reader.cancel().catch(() => undefined); return NextResponse.json({ error: "Photo is too large (2 MB maximum).", code: "too_large" }, { status: 413 }); }
      chunks.push(value);
    }
    bytes = new Uint8Array(total); let o = 0; for (const c of chunks) { bytes.set(c, o); o += c.length; }
  } catch { return NextResponse.json({ error: "Invalid upload." }, { status: 400 }); }
  const v = validateImageBytes(bytes);
  if (!v.ok) {
    const status = v.code === "too_large" ? 413 : 400;
    return NextResponse.json({ error: v.code === "bad_type" ? "Only JPEG, PNG or WebP photos are accepted." : v.code === "too_large" ? "Photo is too large (2 MB maximum)." : "The file is empty.", code: v.code }, { status });
  }
  try {
    const key: RateLimitKey = { keyType: "upload_user", keyHash: rateLimitHash("upload-user:" + userId) };
    const counted = await recordRateLimitFailure(getDb(), key, HOURLY_UPLOADS, 3600, false);
    if (counted.failedCount > HOURLY_UPLOADS) return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
    const { url } = await storage.put({ workspaceId, filename: newObjectName(v.ext), mime: v.mime, bytes });
    return NextResponse.json({ url }, { status: 201 });
  } catch { return NextResponse.json({ error: "Unable to store the photo." }, { status: 500 }); }
}
