import test from "node:test";
import assert from "node:assert/strict";
import { runBounded, recordWithRetry, isAuthorizedConsumer, clampDays } from "../src/lib/analytics-rules.mjs";

test("runBounded reports ok, error and timeout without throwing", async () => {
  assert.equal(await runBounded(async () => {}, 100), "ok");
  assert.equal(await runBounded(async () => { throw new Error("db down"); }, 100), "error");
  const t0 = Date.now();
  assert.equal(await runBounded(() => new Promise(() => {}), 50), "timeout");
  assert.ok(Date.now() - t0 < 500);
});
test("recordWithRetry retries once then succeeds, and gives up after attempts", async () => {
  let n = 0;
  assert.equal(await recordWithRetry(async () => { if (++n < 2) throw new Error("x"); }, { attempts: 2, ms: 100 }), "ok");
  assert.equal(n, 2);
  n = 0;
  assert.equal(await recordWithRetry(async () => { n++; throw new Error("x"); }, { attempts: 2, ms: 100 }), "error");
  assert.equal(n, 2);
});
test("consumer auth fails closed", () => {
  const s = "a-long-enough-secret-value-123456";
  assert.equal(isAuthorizedConsumer(`Bearer ${s}`, s), true);
  for (const h of [undefined, null, "", "Bearer ", `Bearer ${s}x`, `Basic ${s}`, s]) assert.equal(isAuthorizedConsumer(h, s), false);
  assert.equal(isAuthorizedConsumer("Bearer short", "short"), false);
  assert.equal(isAuthorizedConsumer("Bearer undefined", undefined), false);
});
test("clampDays", () => { assert.equal(clampDays("7"), 7); assert.equal(clampDays("0"), 30); assert.equal(clampDays("abc"), 30); assert.equal(clampDays("9999"), 366); assert.equal(clampDays(null), 30); });
