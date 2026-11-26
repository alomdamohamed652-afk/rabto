"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LanguageSwitcher, { useLanguage } from "@/lib/i18n/language-switcher";
import { t } from "@/lib/i18n/messages";

export default function AcceptInvitationForm({ token }: { token: string }) {
  const router = useRouter();
  const lang = useLanguage();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!token) { setError(t(lang, "invitationIncomplete")); return; }
    if (password !== confirm) { setError(t(lang, "passwordMismatch")); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/auth/accept-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || t(lang, "activateAccountError"));
      router.replace("/app");
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
        <p className="eyebrow">{t(lang, "customerAccountSetup")}</p>
        <h1>{t(lang, "welcomeToRabto")}</h1>
        <p className="auth-subtitle">{t(lang, "invitationDescription")}</p>
        <form className="auth-form" onSubmit={submit}>
          <label>{t(lang, "password")}<input type="password" minLength={12} maxLength={128} autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          <label>{t(lang, "confirmPassword")}<input type="password" minLength={12} maxLength={128} autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="admin-primary" disabled={busy || !token}>{busy ? t(lang, "activating") : t(lang, "activateAccount")} <span>←</span></button>
        </form>
        <p className="auth-footnote">{t(lang, "invitationExpiry")}</p>
      </section>
    </main>
  );
}
