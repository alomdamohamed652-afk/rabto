// QR style presets. Colors come from the RABTO identity. Every preset keeps dark modules on a light
// background with a quiet zone of 4 modules, and must pass the contrast check below. No logo is drawn
// inside the code (it would remove error-correction capacity).
export const QR_PRESETS = {
  classic: { label: { ar: "كلاسيكي", en: "Classic" }, dark: "#20231f", light: "#fffefa", shape: "square" },
  rounded: { label: { ar: "حواف مدوّرة", en: "Rounded" }, dark: "#20231f", light: "#fffefa", shape: "rounded" },
  dots: { label: { ar: "نقاط", en: "Dots" }, dark: "#20231f", light: "#fffefa", shape: "dots" },
  sage: { label: { ar: "أخضر داكن", en: "Deep sage" }, dark: "#2f3d2a", light: "#fffefa", shape: "rounded" },
};

function lum(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function contrastRatio(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
/** Dark modules must be darker than the background with at least 7:1 contrast. */
export function presetIsScannable(p) {
  return lum(p.dark) < lum(p.light) && contrastRatio(p.dark, p.light) >= 7;
}

/** matrix: { size, get(r,c) -> boolean }. Returns an SVG string. Finder patterns stay square in every preset. */
export function renderQrSvg(matrix, presetKey = "classic", { quiet = 4, wordmark = false } = {}) {
  const p = QR_PRESETS[presetKey];
  if (!p) throw new Error("Unknown QR preset.");
  if (!presetIsScannable(p)) throw new Error("Preset fails the contrast rule.");
  const n = matrix.size;
  const inFinder = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  const total = n + quiet * 2;
  const extra = wordmark ? 3 : 0;
  let body = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (!matrix.get(r, c)) continue;
    const x = c + quiet, y = r + quiet;
    if (p.shape === "square" || inFinder(r, c)) body += `<rect x="${x}" y="${y}" width="1.02" height="1.02"/>`;
    else if (p.shape === "rounded") body += `<rect x="${x}" y="${y}" width="1.02" height="1.02" rx="0.3"/>`;
    else body += `<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.52"/>`;
  }
  const label = wordmark ? `<text x="${total / 2}" y="${total + 2}" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-weight="800" font-size="2.2" letter-spacing="-0.08" fill="${p.dark}">RABTO</text>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total + extra}" shape-rendering="crispEdges"><rect width="${total}" height="${total + extra}" fill="${p.light}"/><g fill="${p.dark}">${body}</g>${label}</svg>`;
}

/** True when links would point at a local or non-HTTPS origin. Such links must not be printed or written. */
export function isUnsafeOrigin(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return true;
    const h = u.hostname.toLowerCase();
    return h === "localhost" || h.endsWith(".localhost") || h === "0.0.0.0" || /^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || h === "[::1]";
  } catch { return true; }
}

