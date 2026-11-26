// Pure validation for plan records and workspace subscriptions. No prices or tiers are invented here.
const isUuid = (v) => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export function validatePlan(body) {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid request." };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 2 || name.length > 80) return { ok: false, error: "Plan name must be 2-80 characters." };
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (description.length > 1000) return { ok: false, error: "Description is too long." };
  let priceNote = null;
  if (body.priceNote !== undefined && body.priceNote !== null && body.priceNote !== "") {
    if (typeof body.priceNote !== "string" || body.priceNote.trim().length > 160) return { ok: false, error: "Price note is too long." };
    priceNote = body.priceNote.trim();
  }
  const includedCredits = body.includedCredits === undefined ? 0 : body.includedCredits;
  if (!Number.isInteger(includedCredits) || includedCredits < 0 || includedCredits > 1000000) return { ok: false, error: "Included credits must be a whole number from 0 to 1000000." };
  const limit = (v, label) => {
    if (v === undefined || v === null || v === "") return { ok: true, value: null };
    if (!Number.isInteger(v) || v < 0 || v > 1000000) return { ok: false, error: label + " must be a whole number from 0 to 1000000, or empty for no limit." };
    return { ok: true, value: v };
  };
  const mp = limit(body.maxActivatedProducts, "Activated products limit"); if (!mp.ok) return mp;
  const mg = limit(body.maxPages, "Pages limit"); if (!mg.ok) return mg;
  const analyticsEnabled = body.analyticsEnabled === undefined ? true : body.analyticsEnabled;
  if (typeof analyticsEnabled !== "boolean") return { ok: false, error: "analyticsEnabled must be true or false." };
  const isActive = body.isActive === undefined ? true : body.isActive;
  if (typeof isActive !== "boolean") return { ok: false, error: "isActive must be true or false." };
  return { ok: true, value: { name, description, priceNote, includedCredits, maxActivatedProducts: mp.value, maxPages: mg.value, analyticsEnabled, isActive } };
}

export function validateSubscription(body) {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid request." };
  if (!isUuid(body.workspaceId)) return { ok: false, error: "workspaceId is required." };
  if (!isUuid(body.planId)) return { ok: false, error: "planId is required." };
  const status = body.status === undefined ? "active" : body.status;
  if (!["active", "expired", "cancelled"].includes(status)) return { ok: false, error: "Invalid status." };
  let endsAt = null;
  if (body.endsAt !== undefined && body.endsAt !== null && body.endsAt !== "") {
    const d = new Date(body.endsAt);
    if (typeof body.endsAt !== "string" || Number.isNaN(d.getTime())) return { ok: false, error: "endsAt must be a valid date." };
    endsAt = d;
  }
  return { ok: true, value: { workspaceId: body.workspaceId, planId: body.planId, status, endsAt } };
}

/** Effective state: an active record past its end date reads as expired. Products keep working either way. */
export function effectiveStatus(sub, now = new Date()) {
  if (!sub) return "none";
  if (sub.status === "active" && sub.endsAt && new Date(sub.endsAt).getTime() <= now.getTime()) return "expired";
  return sub.status;
}

/**
 * Entitlement decision for creating one MORE of something. Pure.
 * No plan, or no limit set, means allowed. Existing items are never removed or disabled by a limit,
 * so a downgrade or an expired plan only stops growth; products and pages keep working.
 */
export function canAddMore(limit, currentCount) {
  if (limit === null || limit === undefined) return true;
  return currentCount < limit;
}
