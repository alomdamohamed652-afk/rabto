import { timingSafeEqual, createHash } from "node:crypto";

/** Run an async job but give up after `ms`. Never throws; returns "ok" | "timeout" | "error". */
export async function runBounded(job, ms) {
  let timer;
  const guard = new Promise((resolve) => { timer = setTimeout(() => resolve("timeout"), ms); });
  try {
    return await Promise.race([Promise.resolve().then(job).then(() => "ok", () => "error"), guard]);
  } finally { clearTimeout(timer); }
}

/** Retry once on failure (the insert is idempotent by event id), each attempt bounded. */
export async function recordWithRetry(job, { attempts = 2, ms = 2000 } = {}) {
  let last = "error";
  for (let i = 0; i < attempts; i++) {
    last = await runBounded(job, ms);
    if (last === "ok") return "ok";
  }
  return last;
}

/** Constant-time bearer check. Fails closed when the secret is unset or short. */
export function isAuthorizedConsumer(authorizationHeader, secret) {
  if (typeof secret !== "string" || secret.length < 24) return false;
  if (typeof authorizationHeader !== "string" || !authorizationHeader.startsWith("Bearer ")) return false;
  const a = createHash("sha256").update(authorizationHeader.slice(7)).digest();
  const b = createHash("sha256").update(secret).digest();
  return timingSafeEqual(a, b);
}

export function clampDays(value, fallback = 30) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return fallback;
  return Math.min(n, 366);
}
