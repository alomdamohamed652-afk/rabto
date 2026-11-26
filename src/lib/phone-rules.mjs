// Phone identity normalization. One canonical form (E.164, "+" and digits) so the same number can
// never be stored twice in different formats. Only unambiguous input is accepted: a full international
// number, or an Egyptian mobile written locally (01XXXXXXXXX). Other national formats are rejected
// because their country is unknown (never guessed).
const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
const EASTERN = "۰۱۲۳۴۵۶۷۸۹";

export function normalizePhone(input) {
  if (typeof input !== "string" || input.length > 40) return null;
  let s = input.trim().replace(/[٠-٩]/g, (c) => String(ARABIC_INDIC.indexOf(c))).replace(/[۰-۹]/g, (c) => String(EASTERN.indexOf(c)));
  s = s.replace(/[\s\-.()]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (/^01[0125]\d{8}$/.test(s)) s = "+20" + s.slice(1);
  if (!/^\+[1-9]\d{7,14}$/.test(s)) return null;
  return s;
}

/** A login identifier is an email when it has "@", otherwise a phone number. */
export function parseLoginIdentifier(input) {
  if (typeof input !== "string") return { kind: "invalid" };
  const t = input.trim();
  if (t.includes("@")) {
    const email = t.toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 320 ? { kind: "email", value: email } : { kind: "invalid" };
  }
  const phone = normalizePhone(t);
  return phone ? { kind: "phone", value: phone } : { kind: "invalid" };
}
