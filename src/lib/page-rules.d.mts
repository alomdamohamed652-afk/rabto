export type PageBlock =
  | { type: "heading"; text: string }
  | { type: "text"; text: string }
  | { type: "link"; label: string; url: string }
  | { type: "image"; url: string; alt: string }
  | { type: "profile"; name: string; bio?: string; avatarUrl?: string }
  | { type: "social"; platform: string; url: string; label?: string }
  | { type: "divider" }
  | { type: "menu"; title: string; currency: string; sections: { name: string; items: { name: string; description: string; priceMinor: number; available: boolean; imageUrl?: string }[] }[] };
export type PageContent = { blocks: PageBlock[]; lang?: "ar" | "en" };
export const SOCIAL_PLATFORMS: Record<string, { hosts: string[] | null; ar: string; en: string }>;
export function normalizeSocial(platform: string, raw: unknown): string | null;
export const PAGE_LIMITS: Record<string, number>;
export const PAGE_CSP: string;
export function safeUrl(value: unknown, opts?: { imageOnly?: boolean }): string | null;
export function validateSlug(slug: unknown): boolean;
export function validatePageContent(content: unknown): { ok: true; value: PageContent } | { ok: false; error: string };
export function renderPageHtml(input: { title: string; content: PageContent; lang?: "ar" | "en" }): string;
