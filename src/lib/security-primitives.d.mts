export function constantTimeHexEqual(expectedHex: string, suppliedValue: string): boolean;
export function httpStatusForError(error: unknown, fallback?: number): number;
export function clientIpFromForwardedFor(header: string | null, trustedProxyHops: string | undefined): string | null;
export function rateLimitHash(value: string, secret?: string): string;
export function progressiveAccountDelayMs(failedCount: number, trustedIp?: boolean): number;
export function isRateLimitLocked(lockedUntil: Date | null, now?: number): boolean;
export function isFixedWindowExpired(windowStart: number, now: number, windowMs: number): boolean;
export function successfulLoginResetTargets<T>(emailIpKey: T | null): T[];
