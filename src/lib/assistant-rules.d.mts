export function normalize(text: unknown): string;
export function answer(question: string, lang?: "ar" | "en"): { matched: boolean; id: string | null; section: string | null; text: string };
export function validateQuestion(body: unknown): { ok: false } | { ok: true; question: string; lang: "ar" | "en" };
export const GUIDE: Array<{ id: string; section: string; kw: string[]; ar: string; en: string }>;
export const FALLBACK: { ar: string; en: string };
