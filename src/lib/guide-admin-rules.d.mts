export declare const GUIDE_TOPICS: string[];
export declare const GUIDE_SECTIONS: string[];
export declare const GUIDE_LIMITS: { readonly slug: number; readonly faq: number; readonly answer: number; readonly keywords: number };
export type GuideEntryInput = { slug?: string; topic?: string; section?: string; faqAr?: string; faqEn?: string; answerAr?: string; answerEn?: string; keywords?: string; visible?: boolean; sortOrder?: number };
export type ContactInput = { kind?: "whatsapp" | "email"; value?: string; labelAr?: string; labelEn?: string; visible?: boolean };
export declare function validateGuideEntry(body: unknown, opts?: { partial?: boolean }): { ok: true; value: GuideEntryInput } | { ok: false; error: string };
export declare function normalizeContact(kind: string, raw: unknown): string | null;
export declare function validateContact(body: unknown, opts?: { partial?: boolean }): { ok: true; value: ContactInput } | { ok: false; error: string };
export declare function contactUrl(kind: string, value: string): string;
