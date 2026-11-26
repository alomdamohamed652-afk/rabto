"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LanguageSwitcher, { useLanguage } from "@/lib/i18n/language-switcher";
import { t } from "@/lib/i18n/messages";

export default function LoginPage() {
  const router = useRouter();
  const lang = useLanguage();
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
      const data = await response.json() as { error?: string; role?: string };
      if (!response.ok) throw new Error(data.error || t(lang, "loginError"));
      router.replace(data.role === "admin" ? "/admin" : "/app");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t(lang, "unexpectedError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-topline"><Link className="auth-brand" href="/"><span className="brand-symbol"><span /></span><b>RABTO</b></Link><LanguageSwitcher lang={lang} /></div>
        <p className="eyebrow">{t(lang, "loginSpace")}</p>
        <h1>{t(lang, "welcomeBack")}</h1>
        <p className="auth-subtitle">{t(lang, "loginDescription")}</p>
        <form onSubmit={submit} className="auth-form">
          <label>{t(lang, "emailOrPhone")}<input type="text" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" required maxLength={320} value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>{t(lang, "password")}<input type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="admin-primary" type="submit" disabled={busy}>{busy ? t(lang, "loggingIn") : t(lang, "login")} <span>←</span></button>
        </form>
        <p className="auth-footnote"><Link href="/forgot-password">{lang === "en" ? "Forgot password?" : "نسيت كلمة المرور؟"}</Link></p>
        <p className="auth-footnote">{t(lang, "firstTime")}</p>
      </section>
    </main>
  );
}
