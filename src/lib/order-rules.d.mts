export const FULFILLMENT_TYPES: string[];
export const DEPOSIT_STATUSES: string[];
export const ORDER_STATUSES: string[];
export function canTransition(from: string, to: string): boolean;
export type NewOrder = { customerName: string; customerEmail: string | null; currency: string; fulfillmentType: string; notes: string | null; items: { productTypeId: string; quantity: number; unitPriceMinor: number }[]; subtotalMinor: number; depositMinor: number | null; depositStatus: string };
export function validateNewOrder(b: unknown): { ok: true; value: NewOrder } | { ok: false; error: string };
export function validateOrderUpdate(b: unknown): { ok: true; value: { status?: "pending" | "confirmed" | "cancelled" | "fulfilled"; depositStatus?: string; notes?: string | null } } | { ok: false; error: string };
