import "server-only";
import { randomUUID } from "node:crypto";

/** A storage provider keeps the bytes and returns a public https URL. Providers are swappable. */
export interface ImageStorage {
  readonly name: string;
  put(args: { workspaceId: string; filename: string; mime: string; bytes: Uint8Array }): Promise<{ url: string }>;
}

/**
 * No provider is configured by default, so production reports "not configured" honestly.
 * "mock" exists for tests only and is ignored in production. A real provider (for example Supabase
 * Storage) is an adapter to add once an account and a decision exist; it is not wired here.
 */
export function getStorage(): ImageStorage | null {
  if (process.env.NODE_ENV !== "production" && process.env.RABTO_STORAGE_DRIVER === "mock") {
    const base = process.env.RABTO_STORAGE_MOCK_BASE || "https://storage.example.test";
    return { name: "mock", async put(a) { return { url: `${base}/${a.workspaceId}/${a.filename}` }; } };
  }
  return null;
}

/** Server-generated name, never derived from the client's file name. */
export function newObjectName(ext: string): string { return `${randomUUID()}.${ext}`; }
