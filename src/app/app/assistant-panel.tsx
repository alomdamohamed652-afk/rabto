"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import "./assistant.css";

type Lang = "ar" | "en";
type Turn = { q: string; a: string; section: string | null; matched: boolean };
const ANCHORS: Record<string, string> = { menus: "#menus", plan: "#plan", products: "#products", insights: "#insights", support: "#support", verify: "#email-verify", phone: "#phone-panel" };
const T = {
  ar: { kicker: "المساعد", heading: "اسأل الدليل", intro: "إجابات جاهزة عن استخدام لوحة التحكم، من دليل مدمج في النظام (مش ذكاء اصطناعي، ومبيشوفش بياناتك).", ph: "اكتب سؤالك، مثلًا: ازاي انشر المنيو؟", ask: "اسأل", go: "اذهب للقسم", err: "تعذر الرد دلوقتي.", limited: "عدد الأسئلة كتير. جرّب بعد شوية.",
    chips: ["ازاي انشر المنيو؟", "ازاي اخفي صنف؟", "هل أقدر أرفع صورة؟", "نسيت كلمة السر", "فين التحليلات؟"], source: "المصدر: الدليل المدمج" },
  en: { kicker: "ASSISTANT", heading: "Ask the guide", intro: "Ready answers about using the dashboard, from a guide built into the system (not an AI model, and it cannot see your data).", ph: "Type a question, for example: how do I publish the menu?", ask: "Ask", go: "Go to section", err: "Could not answer right now.", limited: "Too many questions. Try again later.",
    chips: ["How do I publish the menu?", "How do I hide an item?", "Can I upload a photo?", "I forgot my password", "Where are the analytics?"], source: "Source: built-in guide" },
} as const;

export default function AssistantPanel({ lang = "ar" }: { lang?: Lang }) {
  const t = T[lang];
  const [q, setQ] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function ask(question: string) {
    const text = question.trim(); if (!text || busy) return;
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/customer/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: text, lang }) });
      if (r.status === 429) { setError(t.limited); return; }
      if (!r.ok) throw new Error();
      const j = (await r.json()) as { text: string; section: string | null; matched: boolean };
      setTurns((cur) => [...cur.slice(-5), { q: text, a: j.text, section: j.section, matched: j.matched }]);
      setQ("");
    } catch { setError(t.err); } finally { setBusy(false); }
  }
  function submit(e: FormEvent) { e.preventDefault(); void ask(q); }
  return <section className="admin-panel menu-editor assistant-panel" id="assistant" dir={lang === "ar" ? "rtl" : "ltr"}>
    <div className="panel-heading"><div><span className="panel-kicker">{t.kicker}</span><h2>{t.heading}</h2><p>{t.intro}</p></div></div>
    <div className="assistant-chips">{t.chips.map((c) => <button type="button" key={c} className="list-more" disabled={busy} onClick={() => void ask(c)}>{c}</button>)}</div>
    <div className="assistant-log" aria-live="polite">{turns.map((x, i) => <div key={i} className="assistant-turn"><p className="assistant-q">{x.q}</p><p className="assistant-a">{x.a}</p>{x.matched && x.section && ANCHORS[x.section] && <a className="assistant-go" href={ANCHORS[x.section]}>{t.go}</a>}{x.matched && <small>{t.source}</small>}</div>)}</div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <form className="assistant-form" onSubmit={submit}><input value={q} onChange={(e) => setQ(e.target.value)} maxLength={300} placeholder={t.ph} aria-label={t.ph} /><button className="primary-action" type="submit" disabled={busy || !q.trim()}>{t.ask}</button></form>
  </section>;
}
