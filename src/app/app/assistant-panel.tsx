"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import "./assistant.css";

type Lang = "ar" | "en";
type Contact = { kind: string; labelAr: string; labelEn: string; url: string };
type Topic = { id: string; ar: string; en: string; items: { id: string; ar: string; en: string }[] };
type Turn = { q: string; a: string; section: string | null; matched: boolean; contacts: Contact[] };
const ANCHORS: Record<string, string> = { menus: "#menus", plan: "#plan", products: "#products", insights: "#insights", support: "#support", verify: "#email-verify", phone: "#phone-panel", workspace: "#workspace" };
const T = {
  ar: { kicker: "المساعد", heading: "اسأل الدليل", intro: "إجابات جاهزة عن استخدام لوحة التحكم، من دليل مدمج في النظام (مش ذكاء اصطناعي، ومبيشوفش بياناتك).",
    faq: "الأسئلة الأكثر شيوعًا", ph: "اكتب سؤالك، مثلًا: ازاي انشر المنيو؟", ask: "اسأل", go: "اذهب للقسم", err: "تعذر الرد دلوقتي.", limited: "عدد الأسئلة كتير. جرّب بعد شوية.",
    source: "المصدر: الدليل المدمج", needHelp: "محتاج مساعدة من فريق الدعم؟", ticket: "ابعت طلب دعم", loadErr: "تعذر تحميل الأسئلة الشائعة.", wa: "واتساب", mail: "بريد إلكتروني" },
  en: { kicker: "ASSISTANT", heading: "Ask the guide", intro: "Ready answers about using the dashboard, from a guide built into the system (not an AI model, and it cannot see your data).",
    faq: "Frequently asked questions", ph: "Type a question, for example: how do I publish the menu?", ask: "Ask", go: "Go to section", err: "Could not answer right now.", limited: "Too many questions. Try again later.",
    source: "Source: built-in guide", needHelp: "Need help from the support team?", ticket: "Send a support request", loadErr: "Could not load the common questions.", wa: "WhatsApp", mail: "Email" },
} as const;

export default function AssistantPanel({ lang = "ar" }: { lang?: Lang }) {
  const t = T[lang];
  const [q, setQ] = useState("");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [topic, setTopic] = useState("");
  useEffect(() => {
    let live = true;
    fetch("/api/customer/assistant").then((r) => (r.ok ? r.json() : Promise.reject())).then((j) => { if (live) { setTopics(j.topics || []); setContacts(j.contacts || []); } }).catch(() => { if (live) setError(T[lang].loadErr); });
    return () => { live = false; };
  }, [lang]);
  async function ask(question: string, faqId?: string) {
    const text = question.trim(); if (!text || busy) return;
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/customer/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: text, lang, faqId }) });
      if (r.status === 429) { setError(t.limited); return; }
      if (!r.ok) throw new Error();
      const j = (await r.json()) as { text: string; section: string | null; matched: boolean; contacts?: Contact[] };
      setTurns((cur) => [...cur.slice(-5), { q: text, a: j.text, section: j.section, matched: j.matched, contacts: j.contacts || [] }]);
      if (!faqId) setQ("");
    } catch { setError(t.err); } finally { setBusy(false); }
  }
  function submit(e: FormEvent) { e.preventDefault(); void ask(q); }
  const label = (c: Contact) => (lang === "ar" ? c.labelAr : c.labelEn) || (c.kind === "whatsapp" ? t.wa : t.mail);
  return <section className="admin-panel menu-editor assistant-panel" id="assistant" dir={lang === "ar" ? "rtl" : "ltr"}>
    <div className="panel-heading"><div><span className="panel-kicker">{t.kicker}</span><h2>{t.heading}</h2><p>{t.intro}</p></div></div>
    {topics.length > 0 && (() => { const cur = topics.find((x) => x.id === topic) || topics[0]; return <div className="assistant-faq"><h3>{t.faq}</h3>
      <div className="assistant-tabs" role="tablist" aria-label={t.faq}>{topics.map((tp) => <button type="button" role="tab" key={tp.id} id={"faq-tab-" + tp.id} aria-selected={tp.id === cur.id} aria-controls="faq-panel" className={"menu-btn" + (tp.id === cur.id ? " solid" : "")} onClick={() => setTopic(tp.id)}>{lang === "ar" ? tp.ar : tp.en}</button>)}</div>
      <div className="assistant-chips" role="tabpanel" id="faq-panel" aria-labelledby={"faq-tab-" + cur.id}>{cur.items.map((i) => { const text = lang === "ar" ? i.ar : i.en; return <button type="button" key={i.id} className="menu-btn assistant-q-btn" disabled={busy} onClick={() => void ask(text, i.id)}>{text}</button>; })}</div></div>; })()}
    <div className="assistant-log" aria-live="polite">{turns.map((x, i) => <div key={i} className="assistant-turn"><p className="assistant-q">{x.q}</p><p className="assistant-a">{x.a}</p>
      {x.matched && x.section && ANCHORS[x.section] && <a className="assistant-go" href={ANCHORS[x.section]}>{t.go}</a>}
      {x.matched ? <small>{t.source}</small> : <div className="assistant-support"><b>{t.needHelp}</b><div className="assistant-actions"><a className="menu-btn solid" href="#support">{t.ticket}</a>{x.contacts.map((c) => <a key={c.url} className="menu-btn" href={c.url} target="_blank" rel="noopener noreferrer">{label(c)}</a>)}</div></div>}
    </div>)}</div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <form className="assistant-form admin-form" onSubmit={submit}><input value={q} onChange={(e) => setQ(e.target.value)} maxLength={300} placeholder={t.ph} aria-label={t.ph} /><button className="menu-btn solid" type="submit" disabled={busy || !q.trim()}>{t.ask}</button></form>
    {contacts.length > 0 && <div className="assistant-actions assistant-contacts">{contacts.map((c) => <a key={c.url} className="menu-btn" href={c.url} target="_blank" rel="noopener noreferrer">{label(c)}</a>)}</div>}
  </section>;
}
