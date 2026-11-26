"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import LanguageSwitcher, { useLanguage } from "@/lib/i18n/language-switcher";

const T = {
  ar: { space: "استعادة الحساب", h1: "نسيت كلمة المرور", sub: "اكتب بريدك الإلكتروني ونبعتلك كود من 6 أرقام صالح 10 دقائق.", email: "البريد الإلكتروني", send: "إرسال الكود",
    sent: "لو فيه حساب بهذا البريد، تم إرسال كود. راجع الـspam كمان.", code: "الكود (6 أرقام)", password: "كلمة المرور الجديدة (12 حرف على الأقل)", reset: "تغيير كلمة المرور",
    done: "تم تغيير كلمة المرور. سجّل الدخول بها.", back: "العودة لتسجيل الدخول", err: "تعذّر تنفيذ الطلب.", notActive: "استعادة كلمة المرور بالإيميل مش مفعّلة لسه. اتواصل مع الإدارة.", noMail: "ملحوظة: إرسال الإيميل مش مفعّل بعد في هذه النسخة التجريبية." },
  en: { space: "ACCOUNT RECOVERY", h1: "Forgot password", sub: "Enter your email and we send a 6-digit code valid for 10 minutes.", email: "Email", send: "Send code",
    sent: "If an account exists for this email, a code was sent. Check spam too.", code: "Code (6 digits)", password: "New password (12+ characters)", reset: "Change password",
    done: "Password changed. Log in with it.", back: "Back to login", err: "The request could not be completed.", notActive: "Password reset by email is not active yet. Contact the administrator.", noMail: "Note: email sending is not enabled yet in this test version." },
} as const;

export default function ForgotPasswordPage() {
  const lang = useLanguage();
  const t = T[lang === "en" ? "en" : "ar"];
  const [step, setStep] = useState<"email" | "code" | "done">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function post(url: string, body: unknown) {
    setBusy(true); setError(""); setMsg("");
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setError(j.code === "mail_unavailable" ? t.notActive : (j.error || t.err)); return false; }
      return true;
    } catch { setError(t.err); return false; } finally { setBusy(false); }
  }
  async function sendCode(e: FormEvent) { e.preventDefault(); if (await post("/api/auth/password-reset/request", { email })) { setMsg(t.sent); setStep("code"); } }
  async function confirm(e: FormEvent) { e.preventDefault(); if (await post("/api/auth/password-reset/confirm", { email, code, password })) { setStep("done"); setMsg(t.done); } }

  return (
    <main className="auth-shell">
      <section className="auth-card" dir={lang === "en" ? "ltr" : "rtl"}>
        <div className="auth-topline"><Link className="auth-brand" href="/"><span className="brand-symbol"><span /></span><b>RABTO</b></Link><LanguageSwitcher lang={lang} /></div>
        <p className="eyebrow">{t.space}</p>
        <h1>{t.h1}</h1>
        <p className="auth-subtitle">{t.sub}</p>
        {step === "email" && <form onSubmit={sendCode} className="auth-form">
          <label>{t.email}<input type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" required maxLength={320} value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="admin-primary" disabled={busy}>{t.send} <span>←</span></button>
        </form>}
        {step === "code" && <form onSubmit={confirm} className="auth-form">
          {msg && <p className="admin-notice" role="status">{msg}</p>}
          <label>{t.code}<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value)} /></label>
          <label>{t.password}<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="admin-primary" disabled={busy}>{t.reset} <span>←</span></button>
        </form>}
        {step === "done" && <p className="admin-notice" role="status">{msg}</p>}
        <p className="auth-footnote"><Link href="/login">{t.back}</Link></p>
        <p className="auth-footnote">{t.noMail}</p>
      </section>
    </main>
  );
}
