// Pure validation for digital page content. No I/O. Shared by routes and tests.
export const PAGE_LIMITS = { blocks: 50, text: 2000, heading: 160, label: 80, name: 80, bio: 240, url: 2000, alt: 160, title: 160, menuSections: 30, menuItems: 60, itemName: 120, itemDesc: 400, maxPriceMinor: 100000000 };
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

/** Social presets. Hosts are matched exactly or as a subdomain; WhatsApp takes a number, phone and email take their own values. */
export const SOCIAL_PLATFORMS = {
  facebook: { hosts: ["facebook.com", "fb.com", "fb.me"], ar: "فيسبوك", en: "Facebook" },
  instagram: { hosts: ["instagram.com"], ar: "إنستجرام", en: "Instagram" },
  tiktok: { hosts: ["tiktok.com"], ar: "تيك توك", en: "TikTok" },
  whatsapp: { hosts: [], ar: "واتساب", en: "WhatsApp" },
  youtube: { hosts: ["youtube.com", "youtu.be"], ar: "يوتيوب", en: "YouTube" },
  x: { hosts: ["x.com", "twitter.com"], ar: "إكس", en: "X" },
  snapchat: { hosts: ["snapchat.com"], ar: "سناب شات", en: "Snapchat" },
  telegram: { hosts: ["t.me", "telegram.me"], ar: "تيليجرام", en: "Telegram" },
  linkedin: { hosts: ["linkedin.com"], ar: "لينكدإن", en: "LinkedIn" },
  website: { hosts: null, ar: "الموقع", en: "Website" },
  phone: { hosts: [], ar: "اتصال", en: "Call" },
  email: { hosts: [], ar: "بريد", en: "Email" },
};
/** Returns the safe URL for a social value, or null. Accepts a link with or without https://. */
export function normalizeSocial(platform, raw) {
  const P = SOCIAL_PLATFORMS[platform];
  if (!P || typeof raw !== "string") return null;
  const v = raw.trim();
  if (!v || v.length > PAGE_LIMITS.url || /[\u0000-\u001f\u007f\s]/.test(v)) return null;
  if (platform === "whatsapp") {
    if (/^https:\/\/wa\.me\/\d{8,15}$/.test(v)) return v; // already normalized (re-validation of stored content)
    let d = v.replace(/[()\-.]/g, "");
    if (d.startsWith("00")) d = "+" + d.slice(2);
    if (!d.startsWith("+") && /^01\d{9}$/.test(d)) d = "+20" + d.slice(1);
    return /^\+\d{8,15}$/.test(d) ? "https://wa.me/" + d.slice(1) : null;
  }
  if (platform === "phone") { let d = v.replace(/^tel:/i, "").replace(/[()\-.]/g, ""); if (!d.startsWith("+") && /^01\d{9}$/.test(d)) d = "+20" + d.slice(1); return /^\+?\d{6,15}$/.test(d) ? "tel:" + d : null; }
  if (platform === "email") return safeUrl("mailto:" + v.replace(/^mailto:/i, ""));
  const full = /^https:\/\//i.test(v) ? v : /^[a-z][a-z0-9+.-]*:/i.test(v) ? null : "https://" + v;
  const url = full && safeUrl(full);
  if (!url) return null;
  const u = new URL(url);
  if (u.username || u.password) return null;
  if (P.hosts === null) return u.href;
  const h = u.hostname.toLowerCase();
  return P.hosts.some((x) => h === x || h.endsWith("." + x)) ? u.href : null;
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
  if (content.lang !== undefined && content.lang !== "ar" && content.lang !== "en") return { ok: false, error: "content.lang must be ar or en" };
  const out = [];
  let profiles = 0;
  for (const [i, b] of blocks.entries()) {
    const at = `blocks[${i}]`;
    if (!b || typeof b !== "object") return { ok: false, error: `${at} invalid` };
    switch (b.type) {
      case "heading": { const text = str(b.text, PAGE_LIMITS.heading); if (!text) return { ok: false, error: `${at}.text invalid` }; out.push({ type: "heading", text }); break; }
      case "text": { const text = str(b.text, PAGE_LIMITS.text); if (!text) return { ok: false, error: `${at}.text invalid` }; out.push({ type: "text", text }); break; }
      case "profile": {
        if (++profiles > 1) return { ok: false, error: `${at} only one profile block is allowed` };
        const name = str(b.name, PAGE_LIMITS.name); if (!name) return { ok: false, error: `${at}.name invalid` };
        const row = { type: "profile", name };
        if (b.bio !== undefined && b.bio !== "") { const bio = str(b.bio, PAGE_LIMITS.bio); if (!bio) return { ok: false, error: `${at}.bio invalid` }; row.bio = bio; }
        if (b.avatarUrl !== undefined && b.avatarUrl !== "") { const a = safeUrl(b.avatarUrl, { imageOnly: true }); if (!a) return { ok: false, error: `${at}.avatarUrl not allowed` }; row.avatarUrl = a; }
        out.push(row); break; }
      case "social": {
        const platform = typeof b.platform === "string" && Object.hasOwn(SOCIAL_PLATFORMS, b.platform) ? b.platform : null;
        if (!platform) return { ok: false, error: `${at}.platform unsupported` };
        const url = normalizeSocial(platform, b.url ?? b.value);
        if (!url) return { ok: false, error: `${at}.url not valid for ${platform}` };
        const row = { type: "social", platform, url };
        if (b.label !== undefined && b.label !== "") { const label = str(b.label, PAGE_LIMITS.label); if (!label) return { ok: false, error: `${at}.label invalid` }; row.label = label; }
        out.push(row); break; }
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
  return { ok: true, value: content.lang ? { blocks: out, lang: content.lang } : { blocks: out } };
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


const ICON = {
  facebook: '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/>',
  instagram: '<rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.6"/><circle cx="17" cy="7" r=".9" fill="currentColor" stroke="none"/>',
  tiktok: '<path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 4c.4 2.6 2 4 4.5 4.2"/>',
  whatsapp: '<path d="M4 20l1.3-4.2A8 8 0 1 1 8.3 19z"/><path d="M9 9c0 3 3 6 6 6l1-1.5-2-1-1 .7c-.8-.4-1.600-1.200-2-2l.7-1-1-2z" fill="currentColor" stroke="none"/>',
  youtube: '<rect x="3" y="6" width="18" height="12" rx="4"/><path d="M10.500 9.500v5l4.200-2.500z" fill="currentColor" stroke="none"/>',
  x: '<path d="M5 5l14 14M19 5L5 19"/>',
  snapchat: '<path d="M12 4c-3 0-4.500 2.200-4.500 4.800v2.200L5 12.500l2.500 1c-.4 1.800-1.800 2.800-2.500 3.200 1.500.4 2.700.4 3.500 1 .8.600 1.600 1.800 3.500 1.800s2.700-1.200 3.500-1.800c.8-.6 2-.6 3.500-1-.7-.4-2.100-1.400-2.500-3.200l2.500-1L16.500 11V8.800C16.500 6.200 15 4 12 4z"/>',
  telegram: '<path d="M20 5L4 11.500l5 2 2 5.500 3-4 4 3z"/><path d="M9 13.500L20 5"/>',
  linkedin: '<rect x="4" y="9" width="3.500" height="11"/><circle cx="5.700" cy="5.500" r="1.800"/><path d="M11 20V9h3.400v1.600C15 9.500 16.200 8.800 17.700 8.800 20 8.800 21 10.300 21 13v7h-3.500v-6c0-1.200-.5-1.900-1.500-1.900s-1.600.7-1.600 1.900v6z"/>',
  website: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.500 2.500 2.500 13.500 0 16M12 4c-2.500 2.500-2.500 13.500 0 16"/>',
  phone: '<path d="M6 4h3l1.500 4-2 1.200a10 10 0 0 0 5.300 5.300L15 12.500l4 1.500v3a2 2 0 0 1-2 2A13 13 0 0 1 4 6a2 2 0 0 1 2-2z"/>',
  email: '<rect x="3.500" y="6" width="17" height="12" rx="2.500"/><path d="M4 8l8 5.500L20 8"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1"/><path d="M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1"/>',
};
const icon = (k) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICON[k] || ICON.link}</svg>`;
const initial = (name) => esc([...String(name).trim()][0] || "R");
const linkBtn = (iconKey, label, url, tel) => `<a class="lk" href="${esc(url)}" ${tel ? "" : 'target="_blank" '}rel="noopener noreferrer nofollow"><span class="lk-i">${icon(iconKey)}</span><span class="lk-t">${esc(label)}</span><span class="lk-a" aria-hidden="true">${lang_arrow}</span></a>`;
let lang_arrow = "→";

/** Render a published snapshot to a self-contained, script-free HTML document. */
export function renderPageHtml({ title, content, lang: langArg = "ar" }) {
  const lang = content.lang === "en" || content.lang === "ar" ? content.lang : langArg;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const profile = (content.blocks || []).find((b) => b.type === "profile");
  lang_arrow = dir === "rtl" ? "←" : "→";
  let menuN = 0;
  const body = (content.blocks || []).map((b) => {
    if (b.type === "heading") return `<h2>${esc(b.text)}</h2>`;
    if (b.type === "text") return `<p>${esc(b.text)}</p>`;
    if (b.type === "profile") return `<header class="pf">${b.avatarUrl ? `<img class="av" src="${esc(b.avatarUrl)}" alt="" referrerpolicy="no-referrer">` : `<span class="av av-i" aria-hidden="true">${initial(b.name)}</span>`}<h1>${esc(b.name)}</h1>${b.bio ? `<p class="bio">${esc(b.bio)}</p>` : ""}</header>`;
    if (b.type === "social") { const P = SOCIAL_PLATFORMS[b.platform] || SOCIAL_PLATFORMS.website; return linkBtn(b.platform, b.label || P[lang], b.url, b.platform === "phone" || b.platform === "email"); }
    if (b.type === "link") return linkBtn("link", b.label, b.url, /^(tel|mailto):/.test(b.url));
    if (b.type === "image") return `<img src="${esc(b.url)}" alt="${esc(b.alt)}" loading="lazy" referrerpolicy="no-referrer">`;
    if (b.type === "menu") return renderMenu(b, menuN++);
    return "<hr>";
  }).join("\n");
  return `<!doctype html><html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title><style>
body{margin:0;min-height:100vh;background:radial-gradient(1200px 520px at 50% -140px,#dfe8d6 0,rgba(223,232,214,0) 70%),#f5f4ee;color:#20231f;font:16px/1.8 system-ui,"Segoe UI","Noto Sans Arabic",Tahoma,sans-serif;-webkit-text-size-adjust:100%}main{max-width:560px;margin:0 auto;padding:36px 20px 56px}
.pf{display:flex;flex-direction:column;align-items:center;text-align:center;margin:4px 0 26px}.av{width:104px;height:104px;border-radius:50%;object-fit:cover;margin:0 0 16px;border:4px solid #fffefa;box-shadow:0 10px 28px rgba(32,35,31,.16)}.av-i{display:grid;place-items:center;background:#20231f;color:#c5d4b9;font-size:42px;font-weight:700;line-height:1}
.pf h1{margin:0 0 6px;font-size:28px}.bio{margin:0;max-width:420px;color:#4d5247;font-size:16px;line-height:1.8}
.lk{display:flex;align-items:center;gap:14px;margin:12px 0;padding:10px 12px;min-height:60px;background:#fffefa;color:#20231f;text-decoration:none;border-radius:18px;box-shadow:0 8px 22px rgba(32,35,31,.08),0 1px 2px rgba(32,35,31,.06);transition:transform .2s ease,box-shadow .2s ease}.lk:hover,.lk:focus-visible{transform:translateY(-2px);box-shadow:0 14px 28px rgba(32,35,31,.13);outline:3px solid #91a786;outline-offset:2px}
.lk-i{flex:none;display:grid;place-items:center;width:42px;height:42px;border-radius:14px;background:#e7ece1;color:#20231f}.lk-t{flex:1;min-width:0;font-weight:700;font-size:17px;line-height:1.4;overflow-wrap:anywhere}.lk-a{flex:none;color:#526849;font-size:20px;padding-inline:8px}
.foot{margin:36px 0 0;text-align:center;font-size:13px;color:#6b6f63;letter-spacing:.14em}
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
</style></head><body><main>${profile ? "" : `<h1>${esc(title)}</h1>`}
${body}
<p class="foot" dir="ltr">RABTO</p>
</main></body></html>`;
}

export const PAGE_CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src https:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
