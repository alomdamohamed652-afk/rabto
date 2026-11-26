"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import "./guide-panel.css";

type Lang = "ar" | "en";
type Entry = { id: string; slug: string; topic: string; section: string; faqAr: string; faqEn: string; answerAr: string; answerEn: string; keywords: string; visible: boolean; sortOrder: number };
type Contact = { id: string; kind: "whatsapp" | "email"; value: string; labelAr: string; labelEn: string; visible: boolean };
const TOPICS = ["menus", "products", "account", "help"];
const SECTIONS = ["none", "menus", "plan", "products", "insights", "support", "verify", "phone", "workspace", "login", "language"];
const T = {
  ar: { kicker: "المساعد والدعم", heading: "محتوى الدليل وجهات الدعم", hint: "عدّل الإجابات والأسئلة الشائعة وجهات التواصل من هنا من غير تغيير كود. أي تغيير بيتسجل في سجل المراجعة، والإخفاء بيشيل العنصر من العملاء من غير ما يمسحه.",
    contacts: "جهات التواصل", kind: "النوع", wa: "واتساب", mail: "بريد إلكتروني", value: "الرقم أو البريد", labelAr: "الاسم بالعربي", labelEn: "الاسم بالإنجليزي", add: "إضافة", save: "حفظ", hide: "إخفاء", show: "إظهار", visible: "ظاهر", hidden: "مخفي",
    entries: "إجابات الدليل والأسئلة الشائعة", slug: "المعرّف (إنجليزي)", topic: "الموضوع", section: "القسم المرتبط", faqAr: "السؤال الشائع بالعربي", faqEn: "السؤال الشائع بالإنجليزي", ansAr: "الإجابة بالعربي", ansEn: "الإجابة بالإنجليزي", kw: "كلمات البحث (كلمة في كل سطر، ! قبل الكلمة القوية)", sort: "الترتيب",
    newEntry: "إضافة إجابة جديدة", edit: "تعديل", cancel: "إلغاء", saved: "تم الحفظ.", err: "تعذر تنفيذ الطلب.", faqHint: "اترك السؤالين فاضيين لو الإجابة مش ضمن الأسئلة الشائعة.", topics: { menus: "المنيو والصفحات", products: "المنتجات والأكواد", account: "الحساب والباقة", help: "المساعدة" } },
  en: { kicker: "ASSISTANT AND SUPPORT", heading: "Guide content and support contacts", hint: "Edit answers, FAQ entries and contact channels here with no code change. Every change is written to the audit log. Hiding removes an item from customers without deleting it.",
    contacts: "Support contacts", kind: "Type", wa: "WhatsApp", mail: "Email", value: "Number or email", labelAr: "Arabic label", labelEn: "English label", add: "Add", save: "Save", hide: "Hide", show: "Show", visible: "Visible", hidden: "Hidden",
    entries: "Guide answers and FAQ", slug: "Identifier (latin)", topic: "Topic", section: "Linked section", faqAr: "FAQ question (Arabic)", faqEn: "FAQ question (English)", ansAr: "Answer (Arabic)", ansEn: "Answer (English)", kw: "Search words (one per line, ! before a strong word)", sort: "Order",
    newEntry: "Add a new answer", edit: "Edit", cancel: "Cancel", saved: "Saved.", err: "The request could not be completed.", faqHint: "Leave both questions empty if the answer is not part of the FAQ.", topics: { menus: "Menus and pages", products: "Products and codes", account: "Account and plan", help: "Help" } },
} as const;
const blank = { slug: "", topic: "menus", section: "none", faqAr: "", faqEn: "", answerAr: "", answerEn: "", keywords: "", sortOrder: 200 };

export default function GuidePanel({ lang = "ar" }: { lang?: Lang }) {
  const t = T[lang];
  const [entries, setEntries] = useState<Entry[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState({ ...blank });
  const [nc, setNc] = useState({ kind: "whatsapp", value: "", labelAr: "", labelEn: "" });
  const load = useCallback(async () => {
    try { const r = await fetch("/api/admin/guide"); if (!r.ok) throw new Error(); const j = await r.json(); setEntries(j.entries); setContacts(j.contacts); }
    catch { setError(T[lang].err); }
  }, [lang]);
  useEffect(() => { const id = setTimeout(() => void load(), 0); return () => clearTimeout(id); }, [load]);
  async function send(url: string, method: string, body: unknown) {
    setError(""); setMsg("");
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) { const j = await r.json().catch(() => ({})); setError(j.error || t.err); return false; }
    setMsg(t.saved); await load(); return true;
  }
  async function saveEntry(e: FormEvent) {
    e.preventDefault();
    const ok = editing === "new" ? await send("/api/admin/guide", "POST", form) : await send("/api/admin/guide/" + editing, "PATCH", { ...form, slug: undefined });
    if (ok) setEditing(null);
  }
  function startEdit(en: Entry) { setForm({ slug: en.slug, topic: en.topic, section: en.section, faqAr: en.faqAr, faqEn: en.faqEn, answerAr: en.answerAr, answerEn: en.answerEn, keywords: en.keywords, sortOrder: en.sortOrder }); setEditing(en.id); }
  async function addContact(e: FormEvent) { e.preventDefault(); if (await send("/api/admin/support-contacts", "POST", nc)) setNc({ kind: "whatsapp", value: "", labelAr: "", labelEn: "" }); }
  return <section className="admin-panel provisioning-panel guide-admin" id="guide-admin" dir={lang === "ar" ? "rtl" : "ltr"}>
    <div className="panel-heading"><div><span className="panel-kicker">{t.kicker}</span><h2>{t.heading}</h2><p>{t.hint}</p></div></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {msg && <p className="admin-notice" role="status">{msg}</p>}
    <h3>{t.contacts}</h3>
    {contacts.map((c) => <div key={c.id} className="guide-row"><span><b>{c.kind === "whatsapp" ? t.wa : t.mail}</b> <bdi dir="ltr">{c.value}</bdi><small>{c.visible ? t.visible : t.hidden}</small></span>
      <button type="button" className="admin-secondary" onClick={() => void send("/api/admin/support-contacts/" + c.id, "PATCH", { visible: !c.visible })}>{c.visible ? t.hide : t.show}</button></div>)}
    <form className="admin-form" onSubmit={addContact}>
      <label>{t.kind}<select value={nc.kind} onChange={(e) => setNc({ ...nc, kind: e.target.value })}><option value="whatsapp">{t.wa}</option><option value="email">{t.mail}</option></select></label>
      <label>{t.value}<input required dir="ltr" value={nc.value} maxLength={320} onChange={(e) => setNc({ ...nc, value: e.target.value })} autoComplete="off" /></label>
      <label>{t.labelAr}<input maxLength={80} value={nc.labelAr} onChange={(e) => setNc({ ...nc, labelAr: e.target.value })} /></label>
      <label>{t.labelEn}<input maxLength={80} dir="ltr" value={nc.labelEn} onChange={(e) => setNc({ ...nc, labelEn: e.target.value })} /></label>
      <button className="admin-primary" type="submit">{t.add}</button>
    </form>
    <h3>{t.entries}</h3>
    {entries.map((en) => <div key={en.id} className="guide-row"><span><b>{(lang === "ar" ? en.faqAr : en.faqEn) || (lang === "ar" ? en.answerAr : en.answerEn).slice(0, 60) + "…"}</b><small>{t.topics[en.topic as keyof typeof t.topics] || en.topic} · {en.visible ? t.visible : t.hidden}</small></span>
      <span className="guide-actions"><button type="button" className="admin-secondary" onClick={() => startEdit(en)}>{t.edit}</button>
      <button type="button" className="admin-secondary" onClick={() => void send("/api/admin/guide/" + en.id, "PATCH", { visible: !en.visible })}>{en.visible ? t.hide : t.show}</button></span></div>)}
    {editing === null ? <button type="button" className="admin-primary" onClick={() => { setForm({ ...blank }); setEditing("new"); }}>{t.newEntry}</button> :
      <form className="admin-form" onSubmit={saveEntry}>
        <label>{t.slug}<input required dir="ltr" pattern="[a-z0-9][a-z0-9\-]{1,58}[a-z0-9]" disabled={editing !== "new"} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></label>
        <label>{t.topic}<select value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}>{TOPICS.map((x) => <option key={x} value={x}>{t.topics[x as keyof typeof t.topics]}</option>)}</select></label>
        <label>{t.section}<select value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })}>{SECTIONS.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
        <label>{t.faqAr}<input maxLength={200} value={form.faqAr} onChange={(e) => setForm({ ...form, faqAr: e.target.value })} /></label>
        <label>{t.faqEn}<input maxLength={200} dir="ltr" value={form.faqEn} onChange={(e) => setForm({ ...form, faqEn: e.target.value })} /></label>
        <p className="auth-subtitle">{t.faqHint}</p>
        <label>{t.ansAr}<textarea required maxLength={2000} value={form.answerAr} onChange={(e) => setForm({ ...form, answerAr: e.target.value })} /></label>
        <label>{t.ansEn}<textarea required dir="ltr" maxLength={2000} value={form.answerEn} onChange={(e) => setForm({ ...form, answerEn: e.target.value })} /></label>
        <label>{t.kw}<textarea maxLength={1000} value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} /></label>
        <label>{t.sort}<input type="number" min={0} max={9999} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} /></label>
        <div className="guide-actions"><button className="admin-primary" type="submit">{t.save}</button><button type="button" className="admin-secondary" onClick={() => setEditing(null)}>{t.cancel}</button></div>
      </form>}
  </section>;
}
