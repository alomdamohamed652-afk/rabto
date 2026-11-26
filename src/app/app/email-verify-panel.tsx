"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

type Lang = "ar" | "en";
const T = {
  ar: { kicker: "الأمان", heading: "تأكيد البريد الإلكتروني", why: "تأكيد بريدك بكود بيوصلك على الإيميل هو اللي بيسمح لك تستعيد كلمة المرور بنفسك.", verified: "بريدك مؤكد.", send: "ابعت كود التأكيد", code: "الكود (6 أرقام)", confirm: "أكّد", sent: "اتبعت كود صالح 10 دقائق. راجع الـspam كمان.", notActive: "إرسال الإيميل لسه مش مفعّل في هذه النسخة، فمش هينفع تأكيد البريد دلوقتي.", err: "الكود غلط أو منتهي.", fail: "تعذّر تنفيذ الطلب." },
  en: { kicker: "SECURITY", heading: "Confirm your email", why: "Confirming your email with a code sent to it is what lets you reset your own password.", verified: "Your email is confirmed.", send: "Send confirmation code", code: "Code (6 digits)", confirm: "Confirm", sent: "A code valid for 10 minutes was sent. Check spam too.", notActive: "Email sending is not active in this build yet, so confirmation is not available right now.", err: "The code is wrong or expired.", fail: "The request could not be completed." },
} as const;

export default function EmailVerifyPanel({ lang = "ar" }: { lang?: Lang }) {
  const t = T[lang];
  const [verified, setVerified] = useState<boolean | null>(null);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { const r = await fetch("/api/customer/email-verification"); if (r.ok) setVerified(Boolean((await r.json()).verified)); } catch { /* keep unknown */ }
  }, []);
  useEffect(() => { const id = setTimeout(() => void load(), 0); return () => clearTimeout(id); }, [load]);
  async function send() {
    setBusy(true); setError(""); setMsg("");
    try {
      const r = await fetch("/api/customer/email-verification", { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setError(j.code === "mail_unavailable" ? t.notActive : t.fail); else if (j.alreadyVerified) setVerified(true); else { setSent(true); setMsg(t.sent); }
    } catch { setError(t.fail); } finally { setBusy(false); }
  }
  async function confirm(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const r = await fetch("/api/customer/email-verification", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      if (r.ok) { setVerified(true); setSent(false); } else setError(t.err);
    } catch { setError(t.fail); } finally { setBusy(false); }
  }
  if (verified === null) return null;
  return (
    <section className="admin-panel provisioning-panel" id="email-verify">
      <div className="panel-heading"><div><span className="panel-kicker">{t.kicker}</span><h2>{t.heading}</h2><p>{t.why}</p></div></div>
      {verified ? <p className="admin-notice" role="status">{t.verified}</p> : <div className="admin-form">
        {msg && <p className="admin-notice" role="status">{msg}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        {!sent ? <button type="button" className="admin-primary" disabled={busy} onClick={() => void send()}>{t.send} <span>←</span></button> : <form onSubmit={confirm} className="auth-form">
          <label>{t.code}<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value)} /></label>
          <button className="admin-primary" disabled={busy}>{t.confirm} <span>←</span></button>
        </form>}
      </div>}
    </section>
  );
}
