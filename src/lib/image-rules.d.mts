export declare const IMAGE_LIMITS: { readonly maxBytes: number; readonly minBytes: number };
export declare function sniffImage(bytes: Uint8Array): "jpeg" | "png" | "webp" | null;
export declare function validateImageBytes(bytes: Uint8Array): { ok: true; kind: "jpeg" | "png" | "webp"; mime: string; ext: string } | { ok: false; code: "empty" | "too_large" | "bad_type" };
