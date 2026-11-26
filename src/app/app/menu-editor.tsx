"use client";

import { useCallback, useEffect, useState } from "react";

type Item = { name: string; description: string; price: string; available: boolean; imageUrl: string };
type Section = { name: string; items: Item[] };
type PageRow = { id: string; slug: string; title: string; draftContent: { blocks?: unknown[] }; publishedAt: string | null; updatedAt: string };
type Lang = "ar" | "en";

const T = {
  ar: {
    heading: "المنيو والصفحات الرقمية", intro: "عدّل المنيو كمسودة، وبعد ما تراجعه انشره. الزبون يشوف آخر نسخة منشورة فقط.",
    newMenu: "منيو جديد", title: "اسم الصفحة", slug: "رابط الصفحة (حروف إنجليزية صغيرة وأرقام)", currency: "العملة (3 حروف، مثل EGP)",
    section: "قسم", sectionName: "اسم القسم", addSection: "إضافة قسم", item: "صنف", itemName: "اسم الصنف", desc: "وصف (اختياري)",
    price: "السعر", photo: "رابط صورة https (اختياري)", available: "متاح", remove: "حذف", addItem: "إضافة صنف",
    save: "حفظ المسودة", publish: "نشر", saved: "تم حفظ المسودة.", published: "تم النشر. النسخة", draft: "مسودة", live: "منشور", unpublishedChanges: "فيه تعديلات لم تُنشر",
    openPublic: "فتح الصفحة المنشورة", loading: "جارٍ التحميل...", none: "لا توجد صفحات بعد.", edit: "تعديل", badPrice: "سعر غير صالح", err: "حدث خطأ.",
    note: "الصور بروابط https فقط حاليًا. لا يوجد طلب أو دفع أونلاين.",
  },
  en: {
    heading: "Menus and digital pages", intro: "Edit the menu as a draft, then publish it. Visitors only see the latest published version.",
    newMenu: "New menu", title: "Page name", slug: "Page link (lowercase letters and numbers)", currency: "Currency (3 letters, e.g. EGP)",
    section: "Section", sectionName: "Section name", addSection: "Add section", item: "Item", itemName: "Item name", desc: "Description (optional)",
    price: "Price", photo: "Photo link, https (optional)", available: "Available", remove: "Remove", addItem: "Add item",
    save: "Save draft", publish: "Publish", saved: "Draft saved.", published: "Published. Version", draft: "Draft", live: "Published", unpublishedChanges: "Has unpublished changes",
    openPublic: "Open published page", loading: "Loading...", none: "No pages yet.", edit: "Edit", badPrice: "Invalid price", err: "Something went wrong.",
    note: "Photos are https links only for now. No online ordering or payment.",
  },
} as const;

const emptyItem = (): Item => ({ name: "", description: "", price: "", available: true, imageUrl: "" });

/** Parse "12.5" or "12,50" to integer minor units. Returns null when invalid. */
export function toMinor(value: string): number | null {
  const v = value.trim().replace(",", ".");
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(v)) return null;
  const [w, f = ""] = v.split(".");
  return Number(w) * 100 + Number((f + "00").slice(0, 2));
}
const fromMinor = (m: number) => (m % 100 === 0 ? String(m / 100) : (m / 100).toFixed(2));

function fromContent(content: PageRow["draftContent"]): { currency: string; menuTitle: string; sections: Section[] } {
  const block = (content?.blocks || []).find((b) => (b as { type?: string }).type === "menu") as
    | { currency: string; title: string; sections: { name: string; items: { name: string; description?: string; priceMinor: number; available: boolean; imageUrl?: string }[] }[] } | undefined;
  if (!block) return { currency: "EGP", menuTitle: "", sections: [{ name: "", items: [emptyItem()] }] };
  return { currency: block.currency, menuTitle: block.title || "", sections: block.sections.map((s) => ({ name: s.name, items: s.items.map((i) => ({ name: i.name, description: i.description || "", price: fromMinor(i.priceMinor), available: i.available, imageUrl: i.imageUrl || "" })) })) };
}

export default function MenuEditor({ workspaceId, workspaceSlug, lang = "ar" }: { workspaceId: string; workspaceSlug: string; lang?: Lang }) {
  const t = T[lang];
  const [pages, setPages] = useState<PageRow[] | null>(null);
  const [pageId, setPageId] = useState<string | undefined>();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [currency, setCurrency] = useState("EGP");
  const [sections, setSections] = useState<Section[]>([]);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/customer/pages?workspaceId=" + encodeURIComponent(workspaceId), { cache: "no-store" });
    const d = (await r.json()) as { pages?: PageRow[]; error?: string };
    if (!r.ok) throw new Error(d.error || t.err);
    setPages(d.pages || []);
  }, [workspaceId, t.err]);

  // Parent remounts this component per workspace (key), so no state reset is needed here.
  useEffect(() => { Promise.resolve().then(load).catch((e) => setError(e instanceof Error ? e.message : t.err)); }, [load, t.err]);

  function startNew() { setPageId(undefined); setTitle(""); setSlug(""); setCurrency("EGP"); setSections([{ name: "", items: [emptyItem()] }]); setMsg(""); setError(""); setEditing(true); }
  function startEdit(p: PageRow) { const c = fromContent(p.draftContent); setPageId(p.id); setTitle(p.title); setSlug(p.slug); setCurrency(c.currency); setSections(c.sections); setMsg(""); setError(""); setEditing(true); }

  function build() {
    const out = [];
    for (const s of sections) {
      const items = [];
      for (const i of s.items) {
        const minor = toMinor(i.price);
        if (minor === null) throw new Error(t.badPrice + ": " + (i.name || "?"));
        const row: Record<string, unknown> = { name: i.name, priceMinor: minor, available: i.available };
        if (i.description.trim()) row.description = i.description;
        if (i.imageUrl.trim()) row.imageUrl = i.imageUrl.trim();
        items.push(row);
      }
      out.push({ name: s.name, items });
    }
    return { blocks: [{ type: "menu", title, currency: currency.toUpperCase(), sections: out }] };
  }

  async function save(): Promise<string | undefined> {
    setBusy(true); setError(""); setMsg("");
    try {
      const r = await fetch("/api/customer/pages", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workspaceId, pageId, slug, title, content: build() }) });
      const d = (await r.json()) as { pageId?: string; error?: string };
      if (!r.ok) throw new Error(d.error || t.err);
      setPageId(d.pageId); setMsg(t.saved); await load();
      return d.pageId;
    } catch (e) { setError(e instanceof Error ? e.message : t.err); return undefined; } finally { setBusy(false); }
  }

  async function publish() {
    const id = await save();
    if (!id) return;
    setBusy(true);
    try {
      const r = await fetch("/api/customer/pages/publish", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workspaceId, pageId: id }) });
      const d = (await r.json()) as { version?: number; error?: string };
      if (!r.ok) throw new Error(d.error || t.err);
      setMsg(t.published + " " + d.version); await load();
    } catch (e) { setError(e instanceof Error ? e.message : t.err); } finally { setBusy(false); }
  }

  const setItem = (si: number, ii: number, patch: Partial<Item>) => setSections((cur) => cur.map((s, a) => a !== si ? s : { ...s, items: s.items.map((it, b) => b === ii ? { ...it, ...patch } : it) }));

  return <section className="admin-panel menu-editor" id="menus" dir={lang === "ar" ? "rtl" : "ltr"}>
    <div className="panel-heading"><div><span className="panel-kicker">MENUS</span><h2>{t.heading}</h2><p>{t.intro}</p></div>
      {!editing && <button type="button" className="menu-btn solid" onClick={startNew}>{t.newMenu}</button>}</div>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {!editing && (pages === null ? <p className="empty-state">{t.loading}</p> : pages.length === 0 ? <p className="empty-state">{t.none}</p> :
      <div className="menu-list">{pages.map((p) => <article className="menu-row" key={p.id}>
        <div><strong>{p.title}</strong><small dir="ltr">/p/{workspaceSlug}/{p.slug}</small></div>
        <span className="menu-badge">{p.publishedAt ? (new Date(p.updatedAt) > new Date(p.publishedAt) ? t.unpublishedChanges : t.live) : t.draft}</span>
        {p.publishedAt && <a className="menu-btn" href={"/p/" + workspaceSlug + "/" + p.slug} target="_blank" rel="noopener noreferrer">{t.openPublic}</a>}
        <button type="button" className="menu-btn" onClick={() => startEdit(p)}>{t.edit}</button></article>)}</div>)}
    {editing && <form className="menu-form" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <div className="menu-grid">
        <label>{t.title}<input required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} autoComplete="off" /></label>
        <label>{t.slug}<input required minLength={1} maxLength={64} pattern="[a-z0-9]([a-z0-9\-]*[a-z0-9])?" dir="ltr" inputMode="text" autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} /></label>
        <label>{t.currency}<input required maxLength={3} minLength={3} pattern="[A-Za-z]{3}" dir="ltr" inputMode="text" autoCapitalize="characters" autoCorrect="off" autoComplete="off" spellCheck={false} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} /></label>
      </div>
      {sections.map((s, si) => <fieldset className="menu-section" key={si}>
        <legend>{t.section} {si + 1}</legend>
        <label>{t.sectionName}<input required maxLength={160} value={s.name} onChange={(e) => setSections((c) => c.map((x, a) => a === si ? { ...x, name: e.target.value } : x))} autoComplete="off" /></label>
        {s.items.map((it, ii) => <div className="menu-item" key={ii}>
          <label>{t.itemName}<input required maxLength={120} value={it.name} onChange={(e) => setItem(si, ii, { name: e.target.value })} autoComplete="off" /></label>
          <label>{t.price}<input required inputMode="decimal" dir="ltr" autoComplete="off" placeholder="0.00" value={it.price} onChange={(e) => setItem(si, ii, { price: e.target.value })} /></label>
          <label className="wide">{t.desc}<input maxLength={400} value={it.description} onChange={(e) => setItem(si, ii, { description: e.target.value })} autoComplete="off" /></label>
          <label className="wide">{t.photo}<input type="url" inputMode="url" dir="ltr" autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} value={it.imageUrl} onChange={(e) => setItem(si, ii, { imageUrl: e.target.value })} /></label>
          <label className="check"><input type="checkbox" checked={it.available} onChange={(e) => setItem(si, ii, { available: e.target.checked })} />{t.available}</label>
          <button type="button" className="menu-btn" onClick={() => setSections((c) => c.map((x, a) => a === si ? { ...x, items: x.items.filter((_, b) => b !== ii) } : x))}>{t.remove}</button>
        </div>)}
        <div className="menu-actions"><button type="button" className="menu-btn" onClick={() => setSections((c) => c.map((x, a) => a === si ? { ...x, items: [...x.items, emptyItem()] } : x))}>{t.addItem}</button>
          <button type="button" className="menu-btn" onClick={() => setSections((c) => c.filter((_, a) => a !== si))}>{t.remove}</button></div>
      </fieldset>)}
      <button type="button" className="menu-btn" onClick={() => setSections((c) => [...c, { name: "", items: [emptyItem()] }])}>{t.addSection}</button>
      <div className="menu-actions sticky">
        <button type="submit" className="menu-btn" disabled={busy}>{t.save}</button>
        <button type="button" className="menu-btn solid" disabled={busy} onClick={() => void publish()}>{t.publish}</button>
        <button type="button" className="menu-btn" onClick={() => setEditing(false)}>×</button>
      </div>
      {msg && <p className="menu-msg" role="status">{msg}</p>}<p className="menu-note">{t.note}</p>
    </form>}
  </section>;
}
