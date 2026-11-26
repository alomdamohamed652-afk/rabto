export const TICKET_STATUSES: readonly ["open", "pending", "closed"];
export const SUPPORT_LIMITS: { subjectMax: number; bodyMax: number; openTicketsPerWorkspace: number; messagesPerTicket: number };
export function validateTicket(input: unknown): { ok: true; subject: string; body: string } | { ok: false; error: string };
export function validateReply(input: unknown): { ok: true; body: string } | { ok: false; error: string };
export function statusAfterMessage(fromStaff: boolean): "open" | "pending";
export function validateStatus(v: unknown): "open" | "pending" | "closed" | null;
