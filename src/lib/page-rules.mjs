// Pure validation for digital page content. No I/O. Shared by routes and tests.
export const PAGE_LIMITS = { blocks: 50, text: 2000, heading: 160, label: 80, url: 2000, alt: 160, title: 160, menuSections: 30, menuItems: 60, itemName: 120, itemDesc: 400, maxPriceMinor: 100000000 };
const CURRENCY = /^[A-Z]{3}$/;
const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

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
    const at = `blocks[${i}]`;
    if (!b || typeof b !== "object") return { ok: false, error: `${at} invalid` };
    switch (b.type) {
      case "heading": { const text = str(b.text, PAGE_LIMITS.heading); if (!text) return { ok: false, error: `${at}.text invalid` }; out.push({ type: "heading", text }); break; }
      case "text": { const text = str(b.text, PAGE_LIMITS.text); if (!text) return { ok: false, error: `${at}.text invalid` }; out.push({ type: "text", text }); break; }
      case "link": {
        const label = str(b.label, PAGE_LIMITS.label); const url = safeUrl(b.url);
        if (!label) return { ok: false, error: `${at}.label invalid` };
        if (!url) return { ok: false, error: `${at}.url not allowed` };
        out.push({ type: "link", label, url }); break; }
      case "image": {
        const url = safeUrl(b.url, { imageOnly: true }); const alt = str(b.alt, PAGE_LIMITS.alt);
        if (!url) return { ok: false, error: `${at}.url not allowed` };
        if (!alt) return { ok: false, error: `${at}.alt required` };
        out.push({ type: "image", url, alt }); break; }
      case "menu": {
        const title = b.title === undefined || b.title === "" ? "" : str(b.title, PAGE_LIMITS.heading);
        if (title === null) return { ok: false, error: `${at}.title invalid` };
        const currency = typeof b.currency === "string" && CURRENCY.test(b.currency) ? b.currency : null;
        if (!currency) return { ok: false, error: `${at}.currency invalid` };
        if (!Array.isArray(b.sections) || b.sections.length > PAGE_LIMITS.menuSections) return { ok: false, error: `${at}.sections invalid` };
        let total = 0; const sections = [];
        for (const [si, sec] of b.sections.entries()) {
          const sat = `${at}.sections[${si}]`;
          if (!sec || typeof sec !== "object" || !Array.isArray(sec.items)) return { ok: false, error: `${sat} invalid` };
          const name = str(sec.name, PAGE_LIMITS.heading); if (!name) return { ok: false, error: `${sat}.name invalid` };
          const items = [];
          for (const [ii, it] of sec.items.entries()) {
            const iat = `${sat}.items[${ii}]`; total += 1;
            if (total > PAGE_LIMITS.menuItems) return { ok: false, error: "too many menu items" };
            if (!it || typeof it !== "object") return { ok: false, error: `${iat} invalid` };
            const iname = str(it.name, PAGE_LIMITS.itemName); if (!iname) return { ok: false, error: `${iat}.name invalid` };
            if (!Number.isSafeInteger(it.priceMinor) || it.priceMinor < 0 || it.priceMinor > PAGE_LIMITS.maxPriceMinor) return { ok: false, error: `${iat}.priceMinor invalid` };
            let description = "";
            if (it.description !== undefined && it.description !== "") { description = str(it.description, PAGE_LIMITS.itemDesc); if (description === null) return { ok: false, error: `${iat}.description invalid` }; }
            if (typeof it.available !== "boolean") return { ok: false, error: `${iat}.available must be boolean` };
            const row = { name: iname, description, priceMinor: it.priceMinor, available: it.available };
            if (it.imageUrl !== undefined && it.imageUrl !== "") { const u = safeUrl(it.imageUrl, { imageOnly: true }); if (!u) return { ok: false, error: `${iat}.imageUrl not allowed` }; row.imageUrl = u; }
            items.push(row);
          }
          sections.push({ name, items });
        }
        out.push({ type: "menu", title, currency, sections }); break; }
      case "divider": out.push({ type: "divider" }); break;
      default: return { ok: false, error: `${at}.type unsupported` };
    }
  }
  return { ok: true, value: { blocks: out } };
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");


function fmtPrice(minor, currency) {
  try { return new Intl.NumberFormat("en", { style: "currency", currency }).format(minor / 100); } catch { return `${(minor / 100).toFixed(2)} ${currency}`; }
}
/** Percent-encode characters that could end a CSS url() string. Input is already a validated https URL. */
const cssUrl = (u) => String(u).replace(/['"()\\<>\s]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0"));
function renderMenu(b, n = 0) {
  const live = b.sections.map((sec) => ({ sec, items: sec.items.filter((i) => i.available) })).filter((x) => x.items.length > 0);
  const nav = live.length > 1 ? `<nav class="mnav" aria-label="${esc(b.title || "menu")}">${live.map((x, k) => `<a href="#m${n}s${k}">${esc(x.sec.name)}</a>`).join("")}</nav>` : "";
  const secs = live.map((x, k) => {
    const items = x.items.map((i) => `<li class="mi${i.imageUrl ? " has-img" : ""}">${i.imageUrl ? `<div class="mimg" aria-hidden="true" style="background-image:url(&quot;${esc(cssUrl(i.imageUrl))}&quot;)"></div>` : ""}<div class="mt"><b>${esc(i.name)}</b>${i.description ? `<span>${esc(i.description)}</span>` : ""}</div><em>${esc(fmtPrice(i.priceMinor, b.currency))}</em></li>`).join("");
    return `<section class="ms" id="m${n}s${k}"><h3>${esc(x.sec.name)}<small>${x.items.length}</small></h3><ul>${items}</ul></section>`;
  }).join("");
  return `<div class="menu">${b.title ? `<p class="mh">${esc(b.title)}</p>` : ""}${nav}${secs}</div>`;
}

/** Render a published snapshot to a self-contained, script-free HTML document. */
export function renderPageHtml({ title, content, lang = "ar" }) {
  const dir = lang === "ar" ? "rtl" : "ltr";
  let menuN = 0;
  const body = (content.blocks || []).map((b) => {
    if (b.type === "heading") return `<h2>${esc(b.text)}</h2>`;
    if (b.type === "text") return `<p>${esc(b.text)}</p>`;
    if (b.type === "link") return `<a class="btn" href="${esc(b.url)}" rel="noopener noreferrer nofollow" target="_blank">${esc(b.label)}</a>`;
    if (b.type === "image") return `<img src="${esc(b.url)}" alt="${esc(b.alt)}" loading="lazy" referrerpolicy="no-referrer">`;
    if (b.type === "menu") return renderMenu(b, menuN++);
    return "<hr>";
  }).join("\n");
  return `<!doctype html><html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title><style>
body{margin:0;background:#f5f4ee;color:#20231f;font:16px/1.8 system-ui,"Segoe UI",Tahoma,sans-serif}main{max-width:560px;margin:0 auto;padding:32px 20px 64px}
h1{font-size:28px;line-height:1.3;margin:0 0 20px}h2{font-size:20px;margin:28px 0 8px}p{margin:0 0 14px;white-space:pre-wrap}img{display:block;max-width:100%;height:auto;margin:16px 0;border-radius:6px}
hr{border:0;border-top:1px solid rgba(32,35,31,.14);margin:24px 0}.btn{display:block;margin:12px 0;padding:14px 18px;background:#20231f;color:#fff;text-decoration:none;text-align:center;border-radius:4px}.btn:focus-visible,.btn:hover{background:#91a786;color:#20231f}
.menu{margin-top:8px}.mh{margin:0 0 14px;color:#4d5247;font-size:14px;font-weight:600}html{scroll-behavior:smooth}
.mnav{position:sticky;top:0;z-index:2;display:flex;gap:8px;overflow-x:auto;margin:0 -20px 8px;padding:10px 20px;background:rgba(245,244,238,.94);backdrop-filter:blur(6px);scrollbar-width:none}.mnav::-webkit-scrollbar{display:none}
.mnav a{flex:none;padding:9px 16px;border-radius:14px;background:#e9e8df;color:#20231f;text-decoration:none;font-size:14px;font-weight:700;line-height:1.4;box-shadow:0 3px 8px rgba(32,35,31,.08),inset 0 1px 0 rgba(255,255,255,.7)}.mnav a:focus-visible,.mnav a:hover{background:#20231f;color:#f5f4ee}
.ms{scroll-margin-top:70px}.ms h3{display:flex;align-items:center;gap:10px;margin:26px 0 6px;font-size:20px;line-height:1.4}.ms h3 small{font-size:12px;font-weight:700;padding:2px 10px;border-radius:10px;background:#e7ece1;color:#42533c}
.ms ul{list-style:none;margin:0;padding:0}.mi{display:flex;align-items:flex-start;gap:14px;background:#fffefa;border-radius:18px;padding:14px 16px;margin:10px 0;box-shadow:0 8px 22px rgba(32,35,31,.07),0 1px 2px rgba(32,35,31,.05)}.mimg{width:76px;height:76px;margin:0;border-radius:14px;flex:none;background:#e7ece1 center/cover no-repeat}
.mt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.mt b{font-size:16px;line-height:1.5;overflow-wrap:anywhere}.mt span{font-size:13px;color:#4d5247;line-height:1.7;overflow-wrap:anywhere}
.mi em{flex:none;font-style:normal;font-weight:700;font-size:14px;white-space:nowrap;padding:5px 12px;border-radius:12px;background:#e7ece1;color:#20231f;direction:ltr;unicode-bidi:isolate}
@media(min-width:720px){main{max-width:760px}.ms ul{display:grid;grid-template-columns:1fr 1fr;gap:12px}.mi{margin:0}}
</style></head><body><main><h1>${esc(title)}</h1>
${body}
</main></body></html>`;
}

export const PAGE_CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src https:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
