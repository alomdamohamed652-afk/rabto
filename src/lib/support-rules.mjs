export const TICKET_STATUSES = ["open", "pending", "closed"];
export const SUPPORT_LIMITS = { subjectMax: 150, bodyMax: 4000, openTicketsPerWorkspace: 20, messagesPerTicket: 100 };

const clean = (v) => (typeof v === "string" ? v.replace(/\r\n/g, "\n").trim() : "");

export function validateTicket(input) {
  const subject = clean(input?.subject).replace(/\s+/g, " ");
  const body = clean(input?.body);
  if (subject.length < 3 || subject.length > SUPPORT_LIMITS.subjectMax) return { ok: false, error: "Subject must be 3 to 150 characters." };
  if (body.length < 1 || body.length > SUPPORT_LIMITS.bodyMax) return { ok: false, error: "Message must be 1 to 4000 characters." };
  return { ok: true, subject, body };
}
export function validateReply(input) {
  const body = clean(input?.body);
  if (body.length < 1 || body.length > SUPPORT_LIMITS.bodyMax) return { ok: false, error: "Message must be 1 to 4000 characters." };
  return { ok: true, body };
}
/** Status after a new message: the customer waits on staff (open), staff wait on the customer (pending). */
export function statusAfterMessage(fromStaff) { return fromStaff ? "pending" : "open"; }
export function validateStatus(v) { return TICKET_STATUSES.includes(v) ? v : null; }
