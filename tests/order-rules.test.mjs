import test from "node:test";
import assert from "node:assert/strict";
import { canTransition, validateNewOrder, validateOrderUpdate } from "../src/lib/order-rules.mjs";
const pt = "123e4567-e89b-42d3-a456-426614174000";
const base = { customerName: " Mona ", items: [{ productTypeId: pt, quantity: 2, unitPriceMinor: 15000 }] };

test("valid order: totals computed server-side, defaults applied", () => {
  const r = validateNewOrder({ ...base, subtotalMinor: 1 });
  assert.equal(r.ok, true); assert.equal(r.value.subtotalMinor, 30000); assert.equal(r.value.customerName, "Mona");
  assert.equal(r.value.fulfillmentType, "in_stock"); assert.equal(r.value.currency, "EGP"); assert.equal(r.value.depositStatus, "none");
});
test("pre-order with deposit records a requested deposit, never above total", () => {
  const r = validateNewOrder({ ...base, fulfillmentType: "pre_order", depositMinor: 10000 });
  assert.equal(r.ok, true); assert.equal(r.value.depositStatus, "requested");
  assert.equal(validateNewOrder({ ...base, depositMinor: 30001 }).ok, false);
  assert.equal(validateNewOrder({ ...base, depositMinor: -1 }).ok, false);
});
test("rejects bad input", () => {
  for (const b of [null, {}, { ...base, customerName: " " }, { ...base, items: [] }, { ...base, fulfillmentType: "x" }, { ...base, currency: "egp" },
    { ...base, customerEmail: "nope" }, { ...base, items: [{ productTypeId: "x", quantity: 1, unitPriceMinor: 1 }] },
    { ...base, items: [{ productTypeId: pt, quantity: 0, unitPriceMinor: 1 }] }, { ...base, items: [{ productTypeId: pt, quantity: 1.5, unitPriceMinor: 1 }] },
    { ...base, items: [{ productTypeId: pt, quantity: 1, unitPriceMinor: -5 }] }, { ...base, items: [{ productTypeId: pt, quantity: 100000, unitPriceMinor: 1e12 }] }])
    assert.equal(validateNewOrder(b).ok, false);
});
test("status machine: only forward moves, terminal states stay terminal", () => {
  assert.ok(canTransition("pending", "confirmed")); assert.ok(canTransition("pending", "cancelled")); assert.ok(canTransition("confirmed", "fulfilled")); assert.ok(canTransition("confirmed", "cancelled"));
  for (const [a, b] of [["pending", "fulfilled"], ["fulfilled", "cancelled"], ["cancelled", "confirmed"], ["fulfilled", "pending"], ["confirmed", "pending"], ["pending", "pending"]]) assert.equal(canTransition(a, b), false, a + b);
});
test("update validation", () => {
  assert.equal(validateOrderUpdate({}).ok, false); assert.equal(validateOrderUpdate({ status: "paid" }).ok, false);
  assert.equal(validateOrderUpdate({ depositStatus: "received", notes: null }).ok, true);
});
