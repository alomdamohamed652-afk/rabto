export function runBounded(job: () => Promise<unknown>, ms: number): Promise<"ok" | "timeout" | "error">;
export function recordWithRetry(job: () => Promise<unknown>, opts?: { attempts?: number; ms?: number }): Promise<"ok" | "timeout" | "error">;
export function isAuthorizedConsumer(authorizationHeader: string | null | undefined, secret: string | undefined): boolean;
export function clampDays(value: unknown, fallback?: number): number;
