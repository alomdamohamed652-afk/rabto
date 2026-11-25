export function constantTimeHexEqual(expectedHex: string, suppliedValue: string): boolean;
export function httpStatusForError(error: unknown, fallback?: number): number;
export type RateLimitDecision = { allowed: boolean; retryAfterSeconds: number; remaining: number };
export function checkRateLimit(key: string, now?: number): RateLimitDecision;
export function recordRateLimitFailure(key: string, now?: number): RateLimitDecision;
export function clearRateLimit(key: string): void;
