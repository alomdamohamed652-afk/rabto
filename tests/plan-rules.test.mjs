import test from "node:test";
import assert from "node:assert/strict";
import { validatePlan, validateSubscription, effectiveStatus, canAddMore, limitsForState } from "../src/lib/plan-rules.mjs";

const U = "123e4567-e89b-42d3-a456-426614174000";
test("plan needs a real name and whole non-negative credits", () => {
  assert.equal(validatePlan({ name: "x" }).ok, false);
  assert.equal(validatePlan({ name: "Plan A", includedCredits: -1 }).ok, false);
  assert.equal(validatePlan({ name: "Plan A", includedCredits: 1.5 }).ok, false);
  const ok = validatePlan({ name: " Plan A " });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.value, { name: "Plan A", description: "", priceNote: null, includedCredits: 0, maxActivatedProducts: null, maxPages: null, analyticsEnabled: true, isActive: true });
});
test("plan rejects bad features and long text", () => {
  assert.equal(validatePlan({ name: "Plan A", maxPages: -1 }).ok, false);
  assert.equal(validatePlan({ name: "Plan A", maxActivatedProducts: 2.5 }).ok, false);
  assert.equal(validatePlan({ name: "Plan A", analyticsEnabled: "yes" }).ok, false);
  assert.equal(validatePlan({ name: "Plan A", maxPages: 3, maxActivatedProducts: 0 }).value.maxPages, 3);
  assert.equal(validatePlan({ name: "Plan A", description: "a".repeat(1001) }).ok, false);
  assert.equal(validatePlan(null).ok, false);
});
test("subscription validates ids, status, date", () => {
  assert.equal(validateSubscription({ workspaceId: "x", planId: U }).ok, false);
  assert.equal(validateSubscription({ workspaceId: U, planId: U, status: "paid" }).ok, false);
  assert.equal(validateSubscription({ workspaceId: U, planId: U, endsAt: "nope" }).ok, false);
  assert.equal(validateSubscription({ workspaceId: U, planId: U }).value.status, "active");
});
test("expiry is computed, never invented", () => {
  assert.equal(effectiveStatus(null), "none");
  assert.equal(effectiveStatus({ status: "active", endsAt: null }), "active");
  assert.equal(effectiveStatus({ status: "active", endsAt: "2000-01-01T00:00:00Z" }), "expired");
  assert.equal(effectiveStatus({ status: "cancelled", endsAt: null }), "cancelled");
});
test("limits only stop growth; null means no limit", () => {
  assert.equal(canAddMore(null, 999), true);
  assert.equal(canAddMore(undefined, 5), true);
  assert.equal(canAddMore(3, 2), true);
  assert.equal(canAddMore(3, 3), false);
  assert.equal(canAddMore(3, 10), false);
  assert.equal(canAddMore(0, 0), false);
});
test("lapsed policy options (proposal) never touch an active plan", () => {
  const plan = { maxActivatedProducts: 3, maxPages: 2, analyticsEnabled: false };
  for (const policy of ["keep-plan-limits", "unrestricted", "block-new"]) assert.deepEqual(limitsForState(plan, "active", policy), plan);
  assert.deepEqual(limitsForState(plan, "expired"), plan);
  assert.deepEqual(limitsForState(plan, "cancelled", "unrestricted"), { maxActivatedProducts: null, maxPages: null, analyticsEnabled: true });
  assert.deepEqual(limitsForState(plan, "expired", "block-new"), { maxActivatedProducts: 0, maxPages: 0, analyticsEnabled: false });
});
