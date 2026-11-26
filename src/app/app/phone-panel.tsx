"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

type Lang = "ar" | "en";
const T = {
  ar: { kicker: "الأمان", heading: "رقم الموبايل", why: "الرقم بيُستخدم لتسجيل الدخول وفي طلبات استعادة الحساب. لتغييره لازم كلمة المرور الحالية.", current: "الرقم الحالي", none: "مفيش رقم مسجل", phone: "رقم الموبايل الجديد", password: "كلمة المرور الحالية", save: "احفظ الرقم", saved: "تم حفظ الرقم.", wrong: "كلمة المرور غلط.", used: "الرقم ده مينفعش يتستخدم.", bad: "اكتب رقم صحيح (01XXXXXXXXX أو بالصيغة الدولية).", many: "محاولات كتير. جرّب بعد شوية.", fail: "تعذّر تنفيذ الطلب." },
  en: { kicker: "SECURITY", heading: "Mobile number", why: "Used for login and account recovery requests. Changing it needs your current password.", current: "Current number", none: "No number saved", phone: "New mobile number", password: "Current password", save: "Save number", saved: "Number saved.", wrong: "The password is incorrect.", used: "This number cannot be used.", bad: "Enter a valid number (01XXXXXXXXX or international format).", many: "Too many attempts. Try again later.", fail: "The request could not be completed." },
} as const;

export default function PhonePanel({ lang = "ar" }: { lang?: Lang }) {
  const t = T[lang];
  const [tail, setTail] = useState<string | null | undefined>(undefined);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { const r = await fetch("/api/customer/phone"); if (r.ok) setTail((await r.json()).phoneTail); } catch { /* keep unknown */ }
  }, []);
  useEffect(() => { const id = setTimeout(() => void load(), 0); return () => clearTimeout(id); }, [load]);
  async function save(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setMsg("");
    try {
      const r = await fetch("/api/customer/phone", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, password }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok) { setTail(j.phoneTail); setMsg(t.saved); setPassword(""); setPhone(""); }
      else setError(r.status === 403 ? t.wrong : r.status === 409 ? t.used : r.status === 400 ? t.bad : r.status === 429 ? t.many : t.fail);
    } catch { setError(t.fail); } finally { setBusy(false); }
  }
  if (tail === undefined) return null;
  return (
    <section className="admin-panel provisioning-panel" id="phone-panel">
      <div className="panel-heading"><div><span className="panel-kicker">{t.kicker}</span><h2>{t.heading}</h2><p>{t.why}</p></div></div>
      <p className="auth-subtitle">{t.current}: <bdi dir="ltr">{tail ?? t.none}</bdi></p>
      <form onSubmit={save} className="auth-form">
        <label>{t.phone}<input type="tel" inputMode="tel" autoComplete="tel" required maxLength={40} dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01012345678" /></label>
        <label>{t.password}<input type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {msg && <p className="admin-notice" role="status">{msg}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="admin-primary" disabled={busy}>{t.save} <span>←</span></button>
      </form>
    </section>
  );
}
