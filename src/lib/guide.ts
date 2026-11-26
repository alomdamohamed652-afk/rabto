import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, guideEntries, supportContacts } from "@/db/schema";
import { FAQ_TOPICS, GUIDE, TOPICS, type GuideEntry } from "@/lib/assistant-rules.mjs";
import { contactUrl } from "@/lib/guide-admin-rules.mjs";

export class GuideError extends Error { constructor(public status: number, message: string) { super(message); } }

// The first support contact is the number the owner gave for RABTO support (WhatsApp, 11:45 on 2026-11-26). Admins can edit or hide it.
const SEED_CONTACTS = [{ kind: "whatsapp", value: "+201064589298", labelAr: "واتساب الدعم", labelEn: "Support on WhatsApp" }];

function seedRows() {
  const faqOf = new Map<string, { topic: string; ar: string; en: string; order: number }>();
  let order = 0;
  for (const t of FAQ_TOPICS) for (const i of t.items) faqOf.set(i.id, { topic: t.id, ar: i.ar, en: i.en, order: order++ });
  return GUIDE.map((g, idx) => {
    const f = faqOf.get(g.id);
    return { slug: g.id, topic: f?.topic ?? "help", section: g.section, faqAr: f?.ar ?? "", faqEn: f?.en ?? "", answerAr: g.ar, answerEn: g.en, keywords: g.kw.join("\n"), visible: true, sortOrder: f?.order ?? 100 + idx };
  });
}

/** Seeds the defaults once, under a lock, so concurrent first reads cannot double-insert. */
export async function ensureSeeded() {
  const db = getDb();
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(guideEntries);
  const [{ c }] = await db.select({ c: sql<number>`count(*)::int` }).from(supportContacts);
  if (n > 0 && c > 0) return;
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('guide:seed'))`);
    const [{ n2 }] = await tx.select({ n2: sql<number>`count(*)::int` }).from(guideEntries);
    if (n2 === 0) await tx.insert(guideEntries).values(seedRows()).onConflictDoNothing();
    const [{ c2 }] = await tx.select({ c2: sql<number>`count(*)::int` }).from(supportContacts);
    if (c2 === 0 && n === 0) await tx.insert(supportContacts).values(SEED_CONTACTS);
  });
}

export async function loadVisibleEntries() {
  await ensureSeeded();
  return getDb().select().from(guideEntries).where(eq(guideEntries.visible, true)).orderBy(asc(guideEntries.sortOrder), asc(guideEntries.slug));
}
export function toIndexEntries(rows: Awaited<ReturnType<typeof loadVisibleEntries>>): GuideEntry[] {
  return rows.map((r) => ({ id: r.slug, section: r.section, kw: r.keywords.split("\n").filter(Boolean), ar: r.answerAr, en: r.answerEn }));
}
export function toFaq(rows: Awaited<ReturnType<typeof loadVisibleEntries>>) {
  return TOPICS.map((t) => ({ id: t.id, ar: t.ar, en: t.en, items: rows.filter((r) => r.topic === t.id && r.faqAr && r.faqEn).map((r) => ({ id: r.slug, ar: r.faqAr, en: r.faqEn })) })).filter((t) => t.items.length > 0);
}
export async function loadVisibleContacts() {
  await ensureSeeded();
  const rows = await getDb().select().from(supportContacts).where(eq(supportContacts.visible, true)).orderBy(asc(supportContacts.createdAt));
  return rows.map((r) => ({ kind: r.kind, labelAr: r.labelAr, labelEn: r.labelEn, url: contactUrl(r.kind, r.value) }));
}

export async function adminList() {
  await ensureSeeded();
  const db = getDb();
  return {
    entries: await db.select().from(guideEntries).orderBy(asc(guideEntries.sortOrder), asc(guideEntries.slug)),
    contacts: await db.select().from(supportContacts).orderBy(asc(supportContacts.createdAt)),
  };
}

type Patch = Record<string, unknown>;
export async function saveEntry(a: { actorId: string; id?: string; values: Patch }) {
  return getDb().transaction(async (tx) => {
    if (a.id) {
      const [cur] = await tx.select().from(guideEntries).where(eq(guideEntries.id, a.id)).for("update");
      if (!cur) throw new GuideError(404, "Entry not found.");
      try { await tx.update(guideEntries).set({ ...a.values, updatedAt: new Date() }).where(eq(guideEntries.id, a.id)); }
      catch { throw new GuideError(409, "That slug is already used."); }
      await tx.insert(auditLogs).values({ actorUserId: a.actorId, action: "guide.entry_updated", entityType: "guide_entry", entityId: a.id, details: { slug: cur.slug, fields: Object.keys(a.values) } });
      return a.id;
    }
    const [dupe] = await tx.select({ id: guideEntries.id }).from(guideEntries).where(eq(guideEntries.slug, String(a.values.slug))).limit(1);
    if (dupe) throw new GuideError(409, "That slug is already used.");
    // Two parallel creates can both pass the check above: let the unique index decide and answer 409, never 500.
    const [row] = await tx.insert(guideEntries).values(a.values as typeof guideEntries.$inferInsert).onConflictDoNothing({ target: guideEntries.slug }).returning({ id: guideEntries.id });
    if (!row) throw new GuideError(409, "That slug is already used.");
    await tx.insert(auditLogs).values({ actorUserId: a.actorId, action: "guide.entry_created", entityType: "guide_entry", entityId: row.id, details: { slug: a.values.slug } });
    return row.id;
  });
}

export async function saveContact(a: { actorId: string; id?: string; values: Patch }) {
  return getDb().transaction(async (tx) => {
    if (a.id) {
      const [cur] = await tx.select().from(supportContacts).where(eq(supportContacts.id, a.id)).for("update");
      if (!cur) throw new GuideError(404, "Contact not found.");
      await tx.update(supportContacts).set({ ...a.values, updatedAt: new Date() }).where(eq(supportContacts.id, a.id));
      await tx.insert(auditLogs).values({ actorUserId: a.actorId, action: "support_contact.updated", entityType: "support_contact", entityId: a.id, details: { kind: cur.kind, fields: Object.keys(a.values) } });
      return a.id;
    }
    const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(supportContacts);
    if (n >= 10) throw new GuideError(429, "Too many contacts. Hide or edit an existing one.");
    const [row] = await tx.insert(supportContacts).values(a.values as typeof supportContacts.$inferInsert).returning({ id: supportContacts.id });
    await tx.insert(auditLogs).values({ actorUserId: a.actorId, action: "support_contact.created", entityType: "support_contact", entityId: row.id, details: { kind: a.values.kind } });
    return row.id;
  });
}
