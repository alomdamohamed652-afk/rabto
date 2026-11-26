export type QrPreset = { label: { ar: string; en: string }; dark: string; light: string; shape: "square" | "rounded" | "dots" };
export const QR_PRESETS: Record<string, QrPreset>;
export function contrastRatio(a: string, b: string): number;
export function presetIsScannable(p: { dark: string; light: string }): boolean;
export function renderQrSvg(matrix: { size: number; get: (r: number, c: number) => boolean | number }, presetKey?: string, opts?: { quiet?: number; wordmark?: boolean }): string;
export function isUnsafeOrigin(url: string): boolean;
