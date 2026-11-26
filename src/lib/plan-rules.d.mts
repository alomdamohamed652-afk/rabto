export type PlanInput = { name: string; description: string; priceNote: string | null; includedCredits: number; maxActivatedProducts: number | null; maxPages: number | null; analyticsEnabled: boolean; isActive: boolean };
export type SubscriptionInput = { workspaceId: string; planId: string; status: "active" | "expired" | "cancelled"; endsAt: Date | null };
export function validatePlan(body: unknown): { ok: true; value: PlanInput } | { ok: false; error: string };
export function validateSubscription(body: unknown): { ok: true; value: SubscriptionInput } | { ok: false; error: string };
export function effectiveStatus(sub: { status: string; endsAt: string | Date | null } | null, now?: Date): "none" | "active" | "expired" | "cancelled";
export function canAddMore(limit: number | null | undefined, currentCount: number): boolean;
