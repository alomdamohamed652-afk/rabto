import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { orderCounters, orderItems, orders, productTypes } from "@/db/schema";
import { canTransition, type NewOrder } from "@/lib/order-rules.mjs";

export type CreateOrderResult = { kind: "created"; id: string; orderNumber: string } | { kind: "bad-product-type" };

/** Order numbers are sequential per workspace (RB-000001), allocated atomically by an upsert on the counter row. */
export async function createOrder(workspaceId: string, input: NewOrder): Promise<CreateOrderResult> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const typeIds = [...new Set(input.items.map((i) => i.productTypeId))];
    const found = await tx.select({ id: productTypes.id }).from(productTypes)
      .where(and(eq(productTypes.workspaceId, workspaceId), inArray(productTypes.id, typeIds)));
    if (found.length !== typeIds.length) return { kind: "bad-product-type" as const };
    const [counter] = await tx.insert(orderCounters).values({ workspaceId, lastNumber: 1 })
      .onConflictDoUpdate({ target: orderCounters.workspaceId, set: { lastNumber: sql`${orderCounters.lastNumber} + 1` } })
      .returning({ n: orderCounters.lastNumber });
    const orderNumber = `RB-${String(counter.n).padStart(6, "0")}`;
    const [order] = await tx.insert(orders).values({
      workspaceId, orderNumber, customerName: input.customerName, customerEmail: input.customerEmail, currency: input.currency,
      subtotalMinor: input.subtotalMinor, depositMinor: input.depositMinor, depositStatus: input.depositStatus,
      fulfillmentType: input.fulfillmentType, notes: input.notes,
    }).returning({ id: orders.id });
    await tx.insert(orderItems).values(input.items.map((i) => ({ orderId: order.id, productTypeId: i.productTypeId, quantity: i.quantity, unitPriceMinor: i.unitPriceMinor })));
    return { kind: "created" as const, id: order.id, orderNumber };
  });
}

export async function listOrders(workspaceId: string, status?: string) {
  const db = getDb();
  const where = status ? and(eq(orders.workspaceId, workspaceId), eq(orders.status, status as "pending")) : eq(orders.workspaceId, workspaceId);
  return db.select().from(orders).where(where).orderBy(desc(orders.createdAt)).limit(200);
}

export async function getOrder(workspaceId: string, id: string) {
  const db = getDb();
  const [order] = await db.select().from(orders).where(and(eq(orders.id, id), eq(orders.workspaceId, workspaceId))).limit(1);
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
  return { ...order, items };
}

export type UpdateOrderResult = { kind: "ok" } | { kind: "not-found" } | { kind: "bad-transition"; from: string };

export async function updateOrder(workspaceId: string, id: string, patch: { status?: "pending" | "confirmed" | "cancelled" | "fulfilled"; depositStatus?: string; notes?: string | null }): Promise<UpdateOrderResult> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(and(eq(orders.id, id), eq(orders.workspaceId, workspaceId))).for("update").limit(1);
    if (!order) return { kind: "not-found" as const };
    if (patch.status !== undefined && patch.status !== order.status && !canTransition(order.status, patch.status)) return { kind: "bad-transition" as const, from: order.status };
    if (patch.status !== undefined && patch.status === order.status) return { kind: "bad-transition" as const, from: order.status };
    await tx.update(orders).set({
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.depositStatus !== undefined ? { depositStatus: patch.depositStatus } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      updatedAt: new Date(),
    }).where(eq(orders.id, id));
    return { kind: "ok" as const };
  });
}
