// Validation for admin-edited guide content and support contacts. Pure, no network.
export const GUIDE_TOPICS = ["menus", "products", "account", "help"];
export const GUIDE_SECTIONS = ["menus", "plan", "products", "insights", "support", "verify", "phone", "workspace", "login", "language", "none"];
export const GUIDE_LIMITS = Object.freeze({ slug: 60, faq: 200, answer: 2000, keywords: 1000 });
const SLUG = /^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/;
const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const str = (v) => (typeof v === "string" ? v.replace(/\r\n/g, "\n").trim() : null);

/** Returns { ok:true, value } or { ok:false, error }. `partial` allows updates that omit fields. */
export function validateGuideEntry(body, { partial = false } = {}) {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid body." };
  const out = {};
  const has = (k) => body[k] !== undefined;
  if (!partial || has("slug")) { const v = str(body.slug); if (!v || !SLUG.test(v)) return { ok: false, error: "slug must be 3-60 lowercase letters, digits or hyphens." }; out.slug = v; }
  if (!partial || has("topic")) { if (!GUIDE_TOPICS.includes(body.topic)) return { ok: false, error: "Unknown topic." }; out.topic = body.topic; }
  if (!partial || has("section")) { const v = body.section ?? "none"; if (!GUIDE_SECTIONS.includes(v)) return { ok: false, error: "Unknown section." }; out.section = v; }
  for (const k of ["faqAr", "faqEn"]) if (!partial || has(k)) { const v = str(body[k] ?? ""); if (v === null || v.length > GUIDE_LIMITS.faq || CTRL.test(v)) return { ok: false, error: `${k} is invalid (max ${GUIDE_LIMITS.faq} characters).` }; out[k] = v; }
  for (const k of ["answerAr", "answerEn"]) if (!partial || has(k)) { const v = str(body[k]); if (!v || v.length > GUIDE_LIMITS.answer || CTRL.test(v)) return { ok: false, error: `${k} is required (max ${GUIDE_LIMITS.answer} characters).` }; out[k] = v; }
  if (!partial || has("keywords")) { const v = str(body.keywords ?? ""); if (v === null || v.length > GUIDE_LIMITS.keywords || CTRL.test(v.replace(/\n/g, ""))) return { ok: false, error: "keywords are invalid." }; out.keywords = v.split("\n").map((x) => x.trim()).filter(Boolean).join("\n"); }
  if (has("visible")) { if (typeof body.visible !== "boolean") return { ok: false, error: "visible must be true or false." }; out.visible = body.visible; }
  if (has("sortOrder")) { if (!Number.isInteger(body.sortOrder) || body.sortOrder < 0 || body.sortOrder > 9999) return { ok: false, error: "sortOrder must be 0-9999." }; out.sortOrder = body.sortOrder; }
  if (out.faqAr !== undefined && out.faqEn !== undefined && (out.faqAr === "") !== (out.faqEn === "")) return { ok: false, error: "Write the FAQ question in both languages, or leave both empty." };
  return { ok: true, value: out };
}

/** WhatsApp values become international digits with a leading +; emails are checked and lower-cased. */
export function normalizeContact(kind, raw) {
  const v = str(raw);
  if (!v || CTRL.test(v)) return null;
  if (kind === "whatsapp") {
    let d = v.replace(/[\s\-().]/g, "");
    if (d.startsWith("00")) d = "+" + d.slice(2);
    if (!/^\+?\d{8,15}$/.test(d)) return null;
    // A bare Egyptian mobile number written with the local leading zero (01XXXXXXXXX) gets the country code.
    if (!d.startsWith("+") && /^01\d{9}$/.test(d)) d = "+20" + d.slice(1);
    if (!d.startsWith("+")) return null;
    return d;
  }
  if (kind === "email") {
    const e = v.toLowerCase();
    return e.length <= 254 && /^[a-z0-9._%+-]{1,64}@[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(e) ? e : null;
  }
  return null;
}

export function validateContact(body, { partial = false } = {}) {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid body." };
  const out = {};
  if (!partial || body.kind !== undefined) { if (body.kind !== "whatsapp" && body.kind !== "email") return { ok: false, error: "kind must be whatsapp or email." }; out.kind = body.kind; }
  if (!partial || body.value !== undefined) {
    const kind = out.kind ?? body.kind;
    const v = normalizeContact(kind, body.value);
    if (!v) return { ok: false, error: kind === "email" ? "Enter a valid email address." : "Enter a valid WhatsApp number with country code." };
    out.value = v;
  }
  for (const k of ["labelAr", "labelEn"]) if (body[k] !== undefined) { const v = str(body[k]); if (v === null || v.length > 80 || CTRL.test(v)) return { ok: false, error: `${k} is invalid (max 80 characters).` }; out[k] = v; }
  if (body.visible !== undefined) { if (typeof body.visible !== "boolean") return { ok: false, error: "visible must be true or false." }; out.visible = body.visible; }
  return { ok: true, value: out };
}

/** Link shown to customers. WhatsApp uses wa.me with digits only; email uses mailto. */
export function contactUrl(kind, value) {
  return kind === "whatsapp" ? "https://wa.me/" + String(value).replace(/\D/g, "") : "mailto:" + value;
}
