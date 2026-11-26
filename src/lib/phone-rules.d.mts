export function normalizePhone(input: unknown): string | null;
export type LoginIdentifier = { kind: "email" | "phone"; value: string } | { kind: "invalid" };
export function parseLoginIdentifier(input: unknown): LoginIdentifier;
