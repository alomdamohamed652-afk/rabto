// Pure upload validation: the file type is decided from the bytes, never from the client's name or header.
export const IMAGE_LIMITS = Object.freeze({ maxBytes: 2 * 1024 * 1024, minBytes: 64 });
const TYPES = { jpeg: { mime: "image/jpeg", ext: "jpg" }, png: { mime: "image/png", ext: "png" }, webp: { mime: "image/webp", ext: "webp" } };

/** Returns "jpeg" | "png" | "webp" | null from the file signature. */
export function sniffImage(bytes) {
  const b = bytes;
  if (!b || b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "png";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "webp";
  return null;
}

/** { ok:true, kind, mime, ext } or { ok:false, code } where code is "empty" | "too_large" | "bad_type". */
export function validateImageBytes(bytes) {
  if (!bytes || bytes.length < IMAGE_LIMITS.minBytes) return { ok: false, code: "empty" };
  if (bytes.length > IMAGE_LIMITS.maxBytes) return { ok: false, code: "too_large" };
  const kind = sniffImage(bytes);
  if (!kind || !wellFormed(kind, bytes)) return { ok: false, code: "bad_type" };
  return { ok: true, kind, ...TYPES[kind] };
}

/** Cheap structure checks (not a full decode): a signature alone is not enough to accept a file. */
function wellFormed(kind, b) {
  const n = b.length;
  if (kind === "png") {
    const ihdr = b[12] === 0x49 && b[13] === 0x48 && b[14] === 0x44 && b[15] === 0x52 && b[11] === 0x0d; // IHDR chunk length is 13
    const iend = [0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82].every((v, i) => b[n - 8 + i] === v);
    return ihdr && iend;
  }
  if (kind === "jpeg") {
    let e = n; while (e > 0 && b[e - 1] === 0) e--; // tolerate zero padding
    return e >= 2 && b[e - 2] === 0xff && b[e - 1] === 0xd9;
  }
  // webp: RIFF size field must match the real length
  const size = b[4] | (b[5] << 8) | (b[6] << 16) | (b[7] * 16777216);
  return size + 8 === n || size + 9 === n; // RIFF pads to even length
}
