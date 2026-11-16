"use client";

import { useState } from "react";\nimport type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "تعذر تسجيل الدخول.");
      router.replace("/admin");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "حدث خطأ غير متوقع.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell" dir="rtl">
      <section className="auth-card">
        <Link className="auth-brand" href="/"><span className="brand-symbol"><span /></span><b>RABTO</b></Link>
        <p className="eyebrow">مساحة RABTO</p>
        <h1>أهلاً بعودتك.</h1>
        <p className="auth-subtitle">سجّل الدخول لمتابعة المنتجات والأكواد ومساحات العمل.</p>
        <form onSubmit={submit} className="auth-form">
          <label>البريد الإلكتروني<input type="email" autoComplete="username" required maxLength={320} value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>كلمة المرور<input type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="admin-primary" type="submit" disabled={busy}>{busy ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"} <span>←</span></button>
        </form>
        <p className="auth-footnote">لو دي أول مرة، افتح رابط الدعوة اللي وصلك من إدارة RABTO.</p>
      </section>
    </main>
  );
}
