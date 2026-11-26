"use client";

import { useCallback, useEffect, useState } from "react";
import { ICON, SOCIAL_PLATFORMS, normalizeSocial, safeUrl } from "@/lib/page-rules.mjs";

type Lang = "ar" | "en";
type Entry = { kind: "social" | "link"; platform: string; value: string; label: string };
type Block = { type?: string; name?: string; bio?: string; avatarUrl?: string; platform?: string; url?: string; label?: string };
type Content = { blocks?: Block[]; lang?: string };
type PageRow = { id: string; slug: string; title: string; draftContent: Content; publishedAt: string | null; updatedAt: string };

const T = {
  ar: {
    kicker: "صفحة الروابط", heading: "صفحة الروابط والسوشيال", intro: "دي الصفحة اللي بتفتح للزبون لما يلمس المنتج. حط فيها اسمك وصورتك وأزرار واتساب وفيسبوك وتيك توك وغيرهم، وبعد ما تراجعها انشرها.",
    newPage: "صفحة روابط جديدة", edit: "تعديل", none: "لا توجد صفحات روابط بعد.", loading: "جارٍ التحميل...", err: "حدث خطأ.",
    title: "اسم الصفحة (للإدارة)", slug: "رابط الصفحة (حروف إنجليزي وأرقام)", pageLang: "لغة الصفحة", ar: "عربي", en: "English",
    profile: "الملف الشخصي", name: "الاسم الظاهر", bio: "نبذة قصيرة (اختياري)", avatar: "رابط صورة https (اختياري)",
    links: "الأزرار", addSocial: "إضافة حساب", pick: "اختار المنصة", avatarPreview: "معاينة الصورة", avatarBad: "الرابط لازم يبدأ بـ https", addLink: "إضافة رابط مخصص", platform: "المنصة", value: "الرابط أو الرقم", labelOpt: "اسم الزر (اختياري)", customLabel: "اسم الزر", customUrl: "الرابط",
    up: "فوق", down: "تحت", remove: "حذف", save: "حفظ المسودة", publish: "نشر", saved: "تم حفظ المسودة.", published: "تم النشر. النسخة", openPublic: "فتح الصفحة المنشورة",
    draft: "مسودة", live: "منشور", unpublished: "فيه تعديلات لم تُنشر", bad: "قيمة غير صالحة", needName: "اكتب الاسم الظاهر", hintWa: "للواتساب اكتب الرقم مثل 01012345678 أو +201012345678.",
    empty: "لسه مفيش أزرار. أضف حساب أو رابط.", close: "إغلاق",
  },
  en: {
    kicker: "LINKS PAGE", heading: "Links and social page", intro: "This is the page a customer opens when they tap your product. Add your name, photo and buttons for WhatsApp, Facebook, TikTok and more, then publish it after you review it.",
    newPage: "New links page", edit: "Edit", none: "No links pages yet.", loading: "Loading...", err: "Something went wrong.",
    title: "Page name (for you)", slug: "Page address (latin letters and digits)", pageLang: "Page language", ar: "عربي", en: "English",
    profile: "Profile", name: "Display name", bio: "Short bio (optional)", avatar: "Photo link, https (optional)",
    links: "Buttons", addSocial: "Add account", pick: "Pick a platform", avatarPreview: "Photo preview", avatarBad: "The link must start with https", addLink: "Add custom link", platform: "Platform", value: "Link or number", labelOpt: "Button text (optional)", customLabel: "Button text", customUrl: "Link",
    up: "Up", down: "Down", remove: "Remove", save: "Save draft", publish: "Publish", saved: "Draft saved.", published: "Published. Version", openPublic: "Open published page",
    draft: "Draft", live: "Published", unpublished: "Has unpublished changes", bad: "Invalid value", needName: "Enter a display name", hintWa: "For WhatsApp enter a number like 01012345678 or +201012345678.",
    empty: "No buttons yet. Add an account or a link.", close: "Close",
  },
} as const;

function Ico({ k }: { k: string }) {
  // ICON values are static trusted constants from page-rules, never user input.
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: ICON[k] || ICON.link }} />;
}
const PRESETS = ["whatsapp", "instagram", "facebook", "tiktok", "youtube", "x", "snapchat", "telegram", "linkedin", "website", "phone", "email"];

const isLinksPage = (c: Content) => (c?.blocks || []).some((b) => b.type === "profile" || b.type === "social");

function parse(c: Content) {
  const blocks = c?.blocks || [];
  const p = blocks.find((b) => b.type === "profile");
  const entries: Entry[] = blocks.filter((b) => b.type === "social" || b.type === "link").map((b) =>
    b.type === "social" ? { kind: "social", platform: b.platform || "website", value: b.url || "", label: b.label || "" } : { kind: "link", platform: "website", value: b.url || "", label: b.label || "" });
  return { name: p?.name || "", bio: p?.bio || "", avatar: p?.avatarUrl || "", entries, lang: (c?.lang === "en" ? "en" : "ar") as Lang };
}

export default function LinksEditor({ workspaceId, workspaceSlug, lang = "ar" }: { workspaceId: string; workspaceSlug: string; lang?: Lang }) {
  const t = T[lang];
  const [pages, setPages] = useState<PageRow[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [pageId, setPageId] = useState<string | undefined>();
  const [base, setBase] = useState<Content | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [pLang, setPLang] = useState<Lang>("ar");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/customer/pages?workspaceId=" + encodeURIComponent(workspaceId), { cache: "no-store" });
    const d = (await r.json()) as { pages?: PageRow[]; error?: string };
    if (!r.ok) throw new Error(d.error || t.err);
    setPages((d.pages || []).filter((p) => isLinksPage(p.draftContent)));
  }, [workspaceId, t.err]);
  useEffect(() => { Promise.resolve().then(load).catch((e) => setError(e instanceof Error ? e.message : t.err)); }, [load, t.err]);

  function startNew() { setBase(null); setPageId(undefined); setTitle(""); setSlug("links"); setPLang(lang); setName(""); setBio(""); setAvatar(""); setEntries([]); setMsg(""); setError(""); setEditing(true); }
  function startEdit(p: PageRow) { const c = parse(p.draftContent); setBase(p.draftContent); setPageId(p.id); setTitle(p.title); setSlug(p.slug); setPLang(c.lang); setName(c.name); setBio(c.bio); setAvatar(c.avatar); setEntries(c.entries); setMsg(""); setError(""); setEditing(true); }

  const patch = (i: number, v: Partial<Entry>) => setEntries((c) => c.map((e, k) => (k === i ? { ...e, ...v } : e)));
  const move = (i: number, d: number) => setEntries((c) => { const j = i + d; if (j < 0 || j >= c.length) return c; const n = [...c]; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const entryOk = (e: Entry) => (e.kind === "social" ? normalizeSocial(e.platform, e.value) !== null : safeUrl(e.value.trim()) !== null && e.label.trim() !== "");

  function build() {
    if (!name.trim()) throw new Error(t.needName);
    const blocks: unknown[] = [{ type: "profile", name: name.trim(), ...(bio.trim() ? { bio: bio.trim() } : {}), ...(avatar.trim() ? { avatarUrl: avatar.trim() } : {}) }];
    entries.forEach((e, i) => {
      if (!entryOk(e)) throw new Error(t.bad + " (" + (i + 1) + ")");
      blocks.push(e.kind === "social" ? { type: "social", platform: e.platform, url: e.value.trim(), ...(e.label.trim() ? { label: e.label.trim() } : {}) } : { type: "link", label: e.label.trim(), url: e.value.trim() });
    });
    // Keep every block this editor does not own (menu, text, images), in their original order, after the buttons.
    for (const b of (base?.blocks || [])) if (!["profile", "social", "link"].includes(b.type || "")) blocks.push(b);
    return { lang: pLang, blocks };
  }

  async function save(): Promise<string | undefined> {
    setBusy(true); setError(""); setMsg("");
    try {
      const r = await fetch("/api/customer/pages", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workspaceId, pageId, slug, title: title.trim() || name.trim(), content: build() }) });
      const d = (await r.json()) as { pageId?: string; error?: string };
      if (!r.ok) throw new Error(d.error || t.err);
      setPageId(d.pageId); setMsg(t.saved); await load(); return d.pageId;
    } catch (e) { setError(e instanceof Error ? e.message : t.err); return undefined; } finally { setBusy(false); }
  }
  async function publish() {
    const id = await save(); if (!id) return;
    setBusy(true);
    try {
      const r = await fetch("/api/customer/pages/publish", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workspaceId, pageId: id }) });
      const d = (await r.json()) as { version?: number; error?: string };
      if (!r.ok) throw new Error(d.error || t.err);
      setMsg(t.published + " " + d.version); await load();
    } catch (e) { setError(e instanceof Error ? e.message : t.err); } finally { setBusy(false); }
  }

  return <section className="admin-panel links-editor menu-editor" id="links" dir={lang === "ar" ? "rtl" : "ltr"}>
    <div className="panel-heading"><div><span className="panel-kicker">{t.kicker}</span><h2>{t.heading}</h2><p>{t.intro}</p></div>
      {!editing && <button type="button" className="menu-btn solid" onClick={startNew}>{t.newPage}</button>}</div>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {!editing && (pages === null ? <p className="empty-state">{t.loading}</p> : pages.length === 0 ? <p className="empty-state">{t.none}</p> :
      <div className="menu-list">{pages.map((p) => <article className="menu-row" key={p.id}>
        <div><strong>{p.title}</strong><small dir="ltr">/p/{workspaceSlug}/{p.slug}</small></div>
        <span className="menu-badge">{p.publishedAt ? (new Date(p.updatedAt) > new Date(p.publishedAt) ? t.unpublished : t.live) : t.draft}</span>
        {p.publishedAt && <a className="menu-btn" href={"/p/" + workspaceSlug + "/" + p.slug} target="_blank" rel="noopener noreferrer">{t.openPublic}</a>}
        <button type="button" className="menu-btn" onClick={() => startEdit(p)}>{t.edit}</button></article>)}</div>)}
    {editing && <form className="menu-form" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <fieldset className="menu-section"><h3 className="lk-h">{t.profile}</h3>
        <div className="menu-grid">
          <label>{t.name}<input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" /></label>
          <label>{t.pageLang}<select value={pLang} onChange={(e) => setPLang(e.target.value === "en" ? "en" : "ar")}><option value="ar">{t.ar}</option><option value="en">{t.en}</option></select></label>
          <label className="wide">{t.bio}<textarea rows={2} maxLength={240} value={bio} onChange={(e) => setBio(e.target.value)} autoComplete="off" /></label>
          <div className="wide lk-avatar-row"><span className="lk-avatar" aria-label={t.avatarPreview}>{safeUrl(avatar.trim(), { imageOnly: true }) ? <span className="lk-avatar-img" style={{ backgroundImage: `url("${encodeURI(safeUrl(avatar.trim(), { imageOnly: true }) as string).replace(/["()\\]/g, (c) => "%" + c.charCodeAt(0).toString(16))}")` }} /> : <b>{[...(name.trim() || "R")][0]}</b>}</span>
            <small>{avatar.trim() && !safeUrl(avatar.trim(), { imageOnly: true }) ? t.avatarBad : t.avatarPreview}</small></div>
          <label className="wide">{t.avatar}<input type="url" inputMode="url" dir="ltr" autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} value={avatar} onChange={(e) => setAvatar(e.target.value)} /></label>
          <label>{t.title}<input maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} autoComplete="off" /></label>
          <label>{t.slug}<input required maxLength={64} pattern="[a-z0-9]([a-z0-9\-]*[a-z0-9])?" dir="ltr" autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} /></label>
        </div>
      </fieldset>
      <fieldset className="menu-section"><h3 className="lk-h">{t.links}</h3>
        {entries.length === 0 && <p className="empty-state">{t.empty}</p>}
        {entries.map((e, i) => { const ok = e.value.trim() === "" || entryOk(e); return <div className="item-block open" key={i}><div className="menu-item">
          <div className="wide lk-head"><span className="lk-ico"><Ico k={e.kind === "social" ? e.platform : "link"} /></span><strong>{e.kind === "social" ? (lang === "ar" ? SOCIAL_PLATFORMS[e.platform].ar : SOCIAL_PLATFORMS[e.platform].en) : t.addLink}</strong></div>
          {e.kind === "social" ? null
            : <label>{t.customLabel}<input maxLength={80} value={e.label} onChange={(ev) => patch(i, { label: ev.target.value })} autoComplete="off" /></label>}
          <label>{e.kind === "social" ? t.value : t.customUrl}<input dir="ltr" inputMode={e.platform === "whatsapp" || e.platform === "phone" ? "tel" : "url"} autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} aria-invalid={!ok} value={e.value} onChange={(ev) => patch(i, { value: ev.target.value })} /></label>
          {e.kind === "social" && <label className="wide">{t.labelOpt}<input maxLength={80} value={e.label} onChange={(ev) => patch(i, { label: ev.target.value })} autoComplete="off" /></label>}
          {!ok && <p className="wide admin-error" role="alert">{t.bad}{e.platform === "whatsapp" && e.kind === "social" ? ". " + t.hintWa : ""}</p>}
          <div className="wide menu-actions">
            <button type="button" className="menu-btn small" disabled={i === 0} onClick={() => move(i, -1)}>{t.up}</button>
            <button type="button" className="menu-btn small" disabled={i === entries.length - 1} onClick={() => move(i, 1)}>{t.down}</button>
            <button type="button" className="menu-btn small" onClick={() => setEntries((c) => c.filter((_, k) => k !== i))}>{t.remove}</button>
          </div></div></div>; })}
        <div className="menu-actions">
          <button type="button" className="menu-btn" aria-expanded={picker} onClick={() => setPicker((v) => !v)}>{t.addSocial}</button>
          <button type="button" className="menu-btn" onClick={() => setEntries((c) => [...c, { kind: "link", platform: "website", value: "", label: "" }])}>{t.addLink}</button>
        </div>
        {picker && <div className="lk-picker" role="group" aria-label={t.pick}>{PRESETS.map((k) => <button type="button" className="lk-chip" key={k} data-platform={k} onClick={() => { setEntries((c) => [...c, { kind: "social", platform: k, value: "", label: "" }]); setPicker(false); }}><Ico k={k} /><span>{lang === "ar" ? SOCIAL_PLATFORMS[k].ar : SOCIAL_PLATFORMS[k].en}</span></button>)}</div>}
      </fieldset>
      <div className="menu-actions lk-actions">
        <button type="submit" className="menu-btn" disabled={busy}>{t.save}</button>
        <button type="button" className="menu-btn solid" disabled={busy} onClick={() => void publish()}>{t.publish}</button>
        <button type="button" className="menu-btn" onClick={() => setEditing(false)}>{t.close}</button>
      </div>
      {msg && <p className="menu-msg" role="status">{msg}</p>}
    </form>}
  </section>;
}
