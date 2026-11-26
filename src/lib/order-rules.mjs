// Pure rules for the manual order workflow. No payment is ever taken: deposit fields are records only.
export const FULFILLMENT_TYPES = ["in_stock", "pre_order", "backorder"];
export const DEPOSIT_STATUSES = ["none", "requested", "received"];
export const ORDER_STATUSES = ["pending", "confirmed", "cancelled", "fulfilled"];
const TRANSITIONS = { pending: ["confirmed", "cancelled"], confirmed: ["fulfilled", "cancelled"], cancelled: [], fulfilled: [] };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_MINOR = 1_000_000_000_000;

export function canTransition(from, to) { return (TRANSITIONS[from] || []).includes(to); }

const int = (v, min, max) => Number.isSafeInteger(v) && v >= min && v <= max;

export function validateNewOrder(b) {
  if (!b || typeof b !== "object") return { ok: false, error: "Invalid body." };
  const customerName = typeof b.customerName === "string" ? b.customerName.trim() : "";
  if (!customerName || customerName.length > 160) return { ok: false, error: "customerName is required (max 160)." };
  let customerEmail = null;
  if (b.customerEmail != null && b.customerEmail !== "") {
    if (typeof b.customerEmail !== "string" || b.customerEmail.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.customerEmail)) return { ok: false, error: "customerEmail is invalid." };
    customerEmail = b.customerEmail.trim();
  }
  const currency = b.currency == null ? "EGP" : b.currency;
  if (typeof currency !== "string" || !/^[A-Z]{3}$/.test(currency)) return { ok: false, error: "currency must be a 3-letter code." };
  const fulfillmentType = b.fulfillmentType == null ? "in_stock" : b.fulfillmentType;
  if (!FULFILLMENT_TYPES.includes(fulfillmentType)) return { ok: false, error: "fulfillmentType invalid." };
  const notes = b.notes == null || b.notes === "" ? null : b.notes;
  if (notes !== null && (typeof notes !== "string" || notes.length > 2000)) return { ok: false, error: "notes too long." };
  if (!Array.isArray(b.items) || b.items.length < 1 || b.items.length > 100) return { ok: false, error: "items must have 1 to 100 entries." };
  const items = [];
  let subtotal = 0;
  for (const [i, it] of b.items.entries()) {
    if (!it || typeof it.productTypeId !== "string" || !UUID.test(it.productTypeId)) return { ok: false, error: `items[${i}].productTypeId invalid.` };
    if (!int(it.quantity, 1, 100000)) return { ok: false, error: `items[${i}].quantity invalid.` };
    if (!int(it.unitPriceMinor, 0, MAX_MINOR)) return { ok: false, error: `items[${i}].unitPriceMinor invalid.` };
    subtotal += it.quantity * it.unitPriceMinor;
    items.push({ productTypeId: it.productTypeId, quantity: it.quantity, unitPriceMinor: it.unitPriceMinor });
  }
  if (!Number.isSafeInteger(subtotal) || subtotal > MAX_MINOR) return { ok: false, error: "Order total too large." };
  let depositMinor = null;
  if (b.depositMinor != null) {
    if (!int(b.depositMinor, 0, subtotal)) return { ok: false, error: "depositMinor must be between 0 and the order total." };
    depositMinor = b.depositMinor;
  }
  const depositStatus = depositMinor ? "requested" : "none";
  return { ok: true, value: { customerName, customerEmail, currency, fulfillmentType, notes, items, subtotalMinor: subtotal, depositMinor, depositStatus } };
}

export function validateOrderUpdate(b) {
  if (!b || typeof b !== "object") return { ok: false, error: "Invalid body." };
  const v = {};
  if (b.status !== undefined) { if (!ORDER_STATUSES.includes(b.status)) return { ok: false, error: "status invalid." }; v.status = b.status; }
  if (b.depositStatus !== undefined) { if (!DEPOSIT_STATUSES.includes(b.depositStatus)) return { ok: false, error: "depositStatus invalid." }; v.depositStatus = b.depositStatus; }
  if (b.notes !== undefined) { if (b.notes !== null && (typeof b.notes !== "string" || b.notes.length > 2000)) return { ok: false, error: "notes invalid." }; v.notes = b.notes; }
  if (Object.keys(v).length === 0) return { ok: false, error: "Nothing to update." };
  return { ok: true, value: v };
}
