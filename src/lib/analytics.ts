import { randomUUID } from "node:crypto";
import { and, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { dailyScanStats, products, scanEvents } from "@/db/schema";

export type ScanInput = { workspaceId: string; productId: string; channel: "nfc" | "qr" };

/** Durable handoff: one idempotent INSERT. The event id is generated once so a retry cannot double count. */
export function makeScanRecorder(input: ScanInput) {
  const id = randomUUID();
  return async () => {
    await getDb().insert(scanEvents).values({ id, ...input }).onConflictDoNothing();
  };
}

/**
 * Aggregate one batch in a single atomic statement. SKIP LOCKED means concurrent consumers take
 * disjoint batches; the stats upsert and the processed mark commit together, so each event is counted exactly once.
 */
export async function consumeBatch(limit = 1000): Promise<number> {
  const db = getDb();
  const rows = await db.execute(sql`
    WITH batch AS (
      SELECT id, workspace_id, product_id, channel, occurred_at FROM scan_events
      WHERE processed_at IS NULL ORDER BY seq LIMIT ${limit} FOR UPDATE SKIP LOCKED
    ), agg AS (
      SELECT workspace_id, product_id, channel, (occurred_at AT TIME ZONE 'UTC')::date AS day, count(*)::int AS c
      FROM batch GROUP BY 1, 2, 3, 4
    ), up AS (
      INSERT INTO daily_scan_stats (workspace_id, product_id, channel, day, scans)
      SELECT workspace_id, product_id, channel, day, c FROM agg
      ON CONFLICT ON CONSTRAINT daily_scan_stats_pk
      DO UPDATE SET scans = daily_scan_stats.scans + EXCLUDED.scans, updated_at = now()
      RETURNING 1
    ), mark AS (
      UPDATE scan_events SET processed_at = now() WHERE id IN (SELECT id FROM batch) RETURNING 1
    )
    SELECT (SELECT count(*) FROM mark)::int AS processed, (SELECT count(*) FROM up)::int AS upserts
  `);
  return Number((rows as unknown as Array<{ processed: number }>)[0]?.processed ?? 0);
}

/** Drain until the queue is empty or the budget is spent. Also prunes processed events older than 14 days. */
export async function drain(maxBatches = 20) {
  let total = 0;
  for (let i = 0; i < maxBatches; i++) {
    const n = await consumeBatch();
    total += n;
    if (n === 0) break;
  }
  await getDb().execute(sql`DELETE FROM scan_events WHERE processed_at IS NOT NULL AND processed_at < now() - interval '14 days'`);
  return total;
}

export async function workspaceStats(workspaceId: string, days: number) {
  const db = getDb();
  const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
  const daily = await db.select({
    day: dailyScanStats.day, channel: dailyScanStats.channel, scans: sql<number>`sum(${dailyScanStats.scans})::int`,
  }).from(dailyScanStats).where(and(eq(dailyScanStats.workspaceId, workspaceId), gte(dailyScanStats.day, since)))
    .groupBy(dailyScanStats.day, dailyScanStats.channel).orderBy(dailyScanStats.day).limit(2000);
  const byProduct = await db.select({
    productId: dailyScanStats.productId, sku: products.sku, scans: sql<number>`sum(${dailyScanStats.scans})::int`,
  }).from(dailyScanStats).innerJoin(products, eq(products.id, dailyScanStats.productId))
    .where(and(eq(dailyScanStats.workspaceId, workspaceId), gte(dailyScanStats.day, since)))
    .groupBy(dailyScanStats.productId, products.sku).orderBy(sql`sum(${dailyScanStats.scans}) desc`).limit(100);
  return { since, daily, byProduct };
}
