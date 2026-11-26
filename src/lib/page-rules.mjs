// Pure validation for digital page content. No I/O. Shared by routes and tests.
export const PAGE_LIMITS = { blocks: 50, text: 2000, heading: 160, label: 80, url: 2000, alt: 160, title: 160 };
const SLUG = /^[a-z0-9]\(?:[a-z0-9-]{0,62}[a-z0-9])?$/;

/** Allow only https, tel, mailto and wa.me links. Everything else (javascript:, data:, http:, ...) is rejected. */
export function safeUrl(value, { imageOnly = false } = {}) {
  if (typeof value !== "string" || value.length === 0 || value.length > PAGE_LIMITS.url) return null;
  if (/[\u0000-\u001f\u007f\s]/.test(value)) return null;
  let u;
  try { u = new URL(value); } catch { return null; }
  if (imageOnly) return u.protocol === "https:" && u.hostname ? u.href : null;
  if (u.protocol === "https:") return u.hostname ? u.href : null;
  if (u.protocol === "tel:") return /^tel:\+?[0-9()\-.]{3,30}$/.test(value) ? value : null;
  if (u.protocol === "mailto:") return /^mailto:[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+(\?[^\s]*)?$/.test(value) ? value : null;
  return null;
}

export function validateSlug(slug) {
  return typeof slug === "string" && SLUG.test(slug);
}

const str = (v, max) => typeof v === "string" && v.trim().length > 0 && v.trim().length <= max ? v.trim() : null;

export function validatePageContent(content) {
  if (!content || typeof content !== "object" || Array.isArray(content)) return { ok: false, error: "content must be an object" };
  const blocks = content.blocks;
  if (!Array.isArray(blocks)) return { ok: false, error: "content.blocks must be an array" };
  if (blocks.length > PAGE_LIMITS.blocks) return { ok: false, error: "too many blocks" };
  const out = [];
  for (const [i, b] of blocks.entries()) {
    const at = \`blocks[\${i}]\`;
    if (!b || typeof b !== "object") return { ok: false, error: \`\${at} invalid\` };
    switch (b.type) {
      case "heading": { const text = str(b.text, PAGE_LIMITS.heading); if (!text) return { ok: false, error: \`\${at}.text invalid\` }; out.push({ type: "heading", text }); break; }
      case "text": { const text = str(b.text, PAGE_LIMITS.text); if (!text) return { ok: false, error: \`\${at}.text invalid\` }; out.push({ type: "text", text }); break; }
      case "link": {
        const label = str(b.label, PAGE_LIMITS.label); const url = safeUrl(b.url);
        if (!label) return { ok: false, error: \`\${at}.label invalid\` };
        if (!url) return { ok: false, error: \`\${at}.url not allowed\` };
        out.push({ type: "link", label, url }); break; }
      case "image": {
        const url = safeUrl(b.url, { imageOnly: true }); const alt = str(b.alt, PAGE_LIMITS.alt);
        if (!url) return { ok: false, error: \`\${at}.url not allowed\` };
        if (!alt) return { ok: false, error: \`\${at}.alt required\` };
        out.push({ type: "image", url, alt }); break; }
      case "divider": out.push({ type: "divider" }); break;
      default: return { ok: false, error: \`\${at}.type unsupported\` };
    }
  }
  return { ok: true, value: { blocks: out } };
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Render a published snapshot to a self-contained, script-free HTML document. */
export function renderPageHtml({ title, content, lang = "ar" }) {
  const dir = lang === "ar" ? "rtl" : "ltr";
  const body = (content.blocks || []).map((b) => {
    if (b.type === "heading") return \`<h2>\${esc(b.text)}</h2>\`;
    if (b.type === "text") return \`<p>\${esc(b.text)}</p>\`;
    if (b.type === "link") return \`<a class="btn" href="\${esc(b.url)}" rel="noopener noreferrer nofollow" target="_blank">\${esc(b.label)}</a>\`;
    if (b.type === "image") return \`<img src="\${esc(b.url)}" alt="\${esc(b.alt)}" loading="lazy" referrerpolicy="no-referrer">\`;
    return "<hr>";
  }).join("\n");
  return \`<!doctype html><html lang="\${lang}" dir="\${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>\${esc(title)}</title><style>
body{margin:0;background:#f5f4ee;color:#20231f;font:16px/1.8 system-ui,"Segoe UI",Tahoma,sans-serif}main{max-width:560px;margin:0 auto;padding:32px 20px 64px}
h1{font-size:28px;line-height:1.3;margin:0 0 20px}h2{font-size:20px;margin:28px 0 8px}p{margin:0 0 14px;white-space:pre-wrap}img{display:block;max-width:100%;height:auto;margin:16px 0;border-radius:6px}
hr{border:0;border-top:1px solid rgba(32,35,31,.14);margin:24px 0}.btn{display:block;margin:12px 0;padding:14px 18px;background:#20231f;color:#fff;text-decoration:none;text-align:center;border-radius:4px}.btn:focus-visible,.btn:hover{background:#91a786;color:#20231f}
</style></head><body><main><h1>\${esc(title)}</h1>
\${body}
</main></body></html>\`;
}

export const PAGE_CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src https:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
