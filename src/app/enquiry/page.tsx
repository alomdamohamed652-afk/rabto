"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import LanguageSwitcher, { useLanguage } from "@/lib/i18n/language-switcher";

const T = {
  ar: { space: "تواصل", h1: "ابعت استفسارك", sub: "اكتب بياناتك وسؤالك. الرسالة بتتسجل عند فريق RABTO ويراجعها.", name: "الاسم", contact: "إيميل أو رقم موبايل", message: "رسالتك", send: "ابعت", done: "وصلت رسالتك وتم تسجيلها.", doneH: "تم", err: "تعذّر إرسال الرسالة. راجع البيانات وجرّب تاني.", many: "محاولات كتير. جرّب بعد شوية.", back: "العودة للرئيسية" },
  en: { space: "CONTACT", h1: "Send an enquiry", sub: "Enter your details and question. The message is recorded for the RABTO team to review.", name: "Name", contact: "Email or mobile number", message: "Your message", send: "Send", done: "Your message was received and recorded.", doneH: "Done", err: "The message could not be sent. Check the details and try again.", many: "Too many attempts. Try again later.", back: "Back to home" },
} as const;

export default function EnquiryPage() {
  const lang = useLanguage();
  const t = T[lang === "en" ? "en" : "ar"];
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const r = await fetch("/api/public/enquiry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, contact, message }) });
      if (r.ok) setDone(true); else setError(r.status === 429 ? t.many : t.err);
    } catch { setError(t.err); } finally { setBusy(false); }
  }
  return (
    <main className="auth-shell">
      <section className="auth-card" dir={lang === "en" ? "ltr" : "rtl"}>
        <div className="auth-topline"><Link className="auth-brand" href="/"><span className="brand-symbol"><span /></span><b>RABTO</b></Link><LanguageSwitcher lang={lang} /></div>
        <p className="eyebrow">{t.space}</p>
        <h1>{done ? t.doneH : t.h1}</h1>
        {done ? <p className="admin-notice" role="status">{t.done}</p> : <>
          <p className="auth-subtitle">{t.sub}</p>
          <form onSubmit={submit} className="auth-form">
            <label>{t.name}<input required maxLength={120} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label>{t.contact}<input required maxLength={320} dir="ltr" autoComplete="email" value={contact} onChange={(e) => setContact(e.target.value)} /></label>
            <label>{t.message}<textarea required maxLength={2000} rows={5} value={message} onChange={(e) => setMessage(e.target.value)} /></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="admin-primary" disabled={busy}>{t.send} <span>←</span></button>
          </form>
        </>}
        <p className="auth-footnote"><Link href="/">{t.back}</Link></p>
      </section>
    </main>
  );
}
