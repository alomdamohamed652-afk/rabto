"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function AcceptInvitationPage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!token) { setError("رابط الدعوة غير مكتمل."); return; }
    if (password !== confirm) { setError("كلمتا المرور غير متطابقتين."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/auth/accept-invitation", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "تعذر تفعيل الحساب.");
      router.replace("/app"); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "حدث خطأ غير متوقع."); }
    finally { setBusy(false); }
  }

  return <main className="auth-shell" dir="rtl"><section className="auth-card">
    <Link className="auth-brand" href="/"><span className="brand-symbol"><span /></span><b>RABTO</b></Link>
    <p className="eyebrow">CUSTOMER ACCOUNT SETUP</p><h1>أهلاً بيك في RABTO.</h1>
    <p className="auth-subtitle">اختار كلمة مرور قوية علشان تفعّل حسابك وتدخل مساحة عملك.</p>
    <form className="auth-form" onSubmit={submit}>
      <label>كلمة المرور<input type="password" minLength={12} maxLength={128} autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      <label>تأكيد كلمة المرور<input type="password" minLength={12} maxLength={128} autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="admin-primary" disabled={busy || !token}>{busy ? "جارٍ تفعيل الحساب..." : "تفعيل الحساب"} <span>←</span></button>
    </form>
    <p className="auth-footnote">رابط الدعوة صالح لمرة واحدة ولمدة محدودة. لو انتهت صلاحيته، تواصل مع إدارة RABTO لإصدار رابط جديد.</p>
  </section></main>;
}
