"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import LanguageSwitcher, { useLanguage } from "@/lib/i18n/language-switcher";

const T = {
  ar: { helpHeading: "طلب مساعدة من الفريق", h1Done: "تم",  helpLink: "مش قادر توصل لإيميلك؟ ابعت طلب مساعدة للفريق", helpSub: "اكتب رقم موبايلك المسجل. الفريق هيراجع الطلب ويكلمك ويتأكد منك. مفيش تغيير تلقائي لكلمة المرور.", helpNote: "ملاحظة (اختياري)", helpSend: "ابعت الطلب", helpDone: "لو الرقم مسجل، الطلب وصل للفريق وهيتواصلوا معاك.", space: "استعادة الحساب", h1: "نسيت كلمة المرور", sub: "اكتب بريدك الإلكتروني ونبعتلك كود من 6 أرقام صالح 10 دقائق.", email: "البريد الإلكتروني", send: "إرسال الكود",
    sent: "لو فيه حساب بهذا البريد، تم إرسال كود. راجع الـspam كمان.", code: "الكود (6 أرقام)", password: "كلمة المرور الجديدة (12 حرف على الأقل)", reset: "تغيير كلمة المرور",
    done: "تم تغيير كلمة المرور. سجّل الدخول بها.", back: "العودة لتسجيل الدخول", err: "تعذّر تنفيذ الطلب.", viaPhone: "نسيت الإيميل؟ استخدم رقم الموبايل", phoneLabel: "رقم الموبايل", next: "متابعة", maskedHint: "الإيميل المسجّل على الرقم ده شكله:", typeFull: "اكتب الإيميل كامل للتأكيد", tooMany: "محاولات كتير. جرّب بعد ساعة.", badPhone: "اكتب رقم موبايل صحيح.", notActive: "استعادة كلمة المرور بالإيميل مش مفعّلة لسه. اتواصل مع الإدارة.", noMail: "ملحوظة: إرسال الإيميل مش مفعّل بعد في هذه النسخة التجريبية." },
  en: { helpHeading: "Ask the team for help", h1Done: "Done", helpLink: "Cannot reach your email? Send a help request to the team", helpSub: "Enter your registered mobile number. The team reviews the request, contacts you and checks who you are. Nothing is reset automatically.", helpNote: "Note (optional)", helpSend: "Send request", helpDone: "If the number is registered, the request reached the team and they will contact you.", space: "ACCOUNT RECOVERY", h1: "Forgot password", sub: "Enter your email and we send a 6-digit code valid for 10 minutes.", email: "Email", send: "Send code",
    sent: "If an account exists for this email, a code was sent. Check spam too.", code: "Code (6 digits)", password: "New password (12+ characters)", reset: "Change password",
    done: "Password changed. Log in with it.", back: "Back to login", err: "The request could not be completed.", viaPhone: "Forgot your email? Use your mobile number", phoneLabel: "Mobile number", next: "Continue", maskedHint: "The email on that number looks like:", typeFull: "Type the full email to confirm", tooMany: "Too many attempts. Try again in an hour.", badPhone: "Enter a valid mobile number.", notActive: "Password reset by email is not active yet. Contact the administrator.", noMail: "Note: email sending is not enabled yet in this test version." },
} as const;

export default function ForgotPasswordPage() {
  const lang = useLanguage();
  const t = T[lang === "en" ? "en" : "ar"];
  const [step, setStep] = useState<"phone" | "email" | "code" | "done" | "help">("email");
  const [phone, setPhone] = useState("");
  const [masked, setMasked] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function lookup(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const r = await fetch("/api/auth/password-reset/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setError(r.status === 429 ? t.tooMany : (r.status === 400 ? t.badPhone : t.err)); return; }
      setMasked(j.maskedEmail); setStep("email");
    } catch { setError(t.err); } finally { setBusy(false); }
  }
  async function post(url: string, body: unknown) {
    setBusy(true); setError(""); setMsg("");
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setError(j.code === "mail_unavailable" ? t.notActive : (j.error || t.err)); return false; }
      return true;
    } catch { setError(t.err); return false; } finally { setBusy(false); }
  }
  const [helpNote, setHelpNote] = useState("");
  async function sendHelp(e: FormEvent) { e.preventDefault(); if (await post("/api/auth/recovery-request", { phone, note: helpNote })) { setStep("done"); setMsg(t.helpDone); } }
  async function sendCode(e: FormEvent) { e.preventDefault(); if (await post("/api/auth/password-reset/request", masked ? { email, phone } : { email })) { setMsg(t.sent); setStep("code"); } }
  async function confirm(e: FormEvent) { e.preventDefault(); if (await post("/api/auth/password-reset/confirm", { email, code, password })) { setStep("done"); setMsg(t.done); } }

  return (
    <main className="auth-shell">
      <section className="auth-card" dir={lang === "en" ? "ltr" : "rtl"}>
        <div className="auth-topline"><Link className="auth-brand" href="/"><span className="brand-symbol"><span /></span><b>RABTO</b></Link><LanguageSwitcher lang={lang} /></div>
        <p className="eyebrow">{t.space}</p>
        <h1>{step === "help" ? t.helpHeading : step === "done" ? t.h1Done : t.h1}</h1>
        {step !== "help" && step !== "done" && <p className="auth-subtitle">{t.sub}</p>}
        {step === "phone" && <form onSubmit={lookup} className="auth-form">
          <label>{t.phoneLabel}<input type="tel" inputMode="tel" autoComplete="tel" required maxLength={40} dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01012345678" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="admin-primary" disabled={busy}>{t.next} <span>←</span></button>
        </form>}
        {step === "email" && <form onSubmit={sendCode} className="auth-form">
          {masked && <p className="admin-notice" role="status">{t.maskedHint} <bdi dir="ltr">{masked}</bdi></p>}
          <label>{masked ? t.typeFull : t.email}<input type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" required maxLength={320} value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="admin-primary" disabled={busy}>{t.send} <span>←</span></button>
          {!masked && <button type="button" className="admin-secondary" onClick={() => { setError(""); setStep("phone"); }}>{t.viaPhone}</button>}
        </form>}
        {step === "code" && <form onSubmit={confirm} className="auth-form">
          {msg && <p className="admin-notice" role="status">{msg}</p>}
          <label>{t.code}<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value)} /></label>
          <label>{t.password}<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="admin-primary" disabled={busy}>{t.reset} <span>←</span></button>
        </form>}
        {step === "help" && <form onSubmit={sendHelp} className="auth-form">
          <p className="auth-subtitle">{t.helpSub}</p>
          <label>{t.phoneLabel}<input type="tel" inputMode="tel" autoComplete="tel" required maxLength={40} dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01012345678" /></label>
          <label>{t.helpNote}<input maxLength={500} value={helpNote} onChange={(e) => setHelpNote(e.target.value)} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="admin-primary" disabled={busy}>{t.helpSend} <span>←</span></button>
        </form>}
        {step === "done" && <p className="admin-notice" role="status">{msg}</p>}
        {step !== "help" && step !== "done" && <p className="auth-footnote"><button type="button" className="admin-secondary" onClick={() => { setError(""); setStep("help"); }}>{t.helpLink}</button></p>}
        <p className="auth-footnote"><Link href="/login">{t.back}</Link></p>
        <p className="auth-footnote">{t.noMail}</p>
      </section>
    </main>
  );
}
