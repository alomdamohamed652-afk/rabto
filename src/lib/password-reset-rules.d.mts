export const RESET_POLICY: { codeDigits: number; ttlSeconds: number; maxAttempts: number; requestsPerHour: number };
export function generateCode(): string;
export function hashCode(userId: string, code: string, secret?: string): string;
export function validateResetRequest(body: unknown): { ok: true; email: string } | { ok: false };
export function validateResetConfirm(body: unknown): { ok: true; email: string; code: string; password: string } | { ok: false; passwordRule?: boolean };
export function codeUsable(row: { usedAt: Date | string | null; expiresAt: Date | string; attempts: number } | null | undefined, now?: number): boolean;
export function digestsEqual(a: string, b: string): boolean;
