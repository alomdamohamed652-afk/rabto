"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

type Lang = "ar" | "en";
type Row = { id: string; subject: string; status: "open" | "pending" | "closed"; lastMessageAt: string; workspaceName?: string };
type Msg = { id: string; fromStaff: boolean; body: string; createdAt: string };
const T = {
  ar: { kicker: "الدعم", heading: "تذاكر الدعم", none: "مفيش تذاكر لسه.", subject: "الموضوع", message: "الرسالة", open: "فتح تذكرة", send: "إرسال", reply: "الرد", back: "رجوع للتذاكر",
    st: { open: "مفتوحة", pending: "في انتظار العميل", closed: "مغلقة" } as Record<string, string>, staff: "الدعم", you: "العميل", admin: "الدعم", err: "تعذّر تنفيذ الطلب.", close: "إغلاق", reopen: "إعادة فتح", youMe: "أنت", note: "الرد من الدعم بيظهر هنا. مفيش إشعارات بالإيميل أو SMS." },
  en: { kicker: "SUPPORT", heading: "Support tickets", none: "No tickets yet.", subject: "Subject", message: "Message", open: "Open a ticket", send: "Send", reply: "Reply", back: "Back to tickets",
    st: { open: "Open", pending: "Waiting for customer", closed: "Closed" } as Record<string, string>, staff: "Support", you: "Customer", admin: "Support", err: "The request could not be completed.", close: "Close", reopen: "Reopen", youMe: "You", note: "Support replies appear here. No email or SMS notifications are sent." },
} as const;

export default function SupportPanel({ mode, workspaceId, lang = "ar" }: { mode: "customer" | "admin"; workspaceId?: string; lang?: Lang }) {
  const t = T[lang];
  const base = mode === "admin" ? "/api/admin/support" : "/api/customer/support";
  const q = mode === "customer" ? `workspaceId=${encodeURIComponent(workspaceId ?? "")}` : "";
  const [rows, setRows] = useState<Row[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [thread, setThread] = useState<{ ticket: Row; messages: Msg[] } | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${base}?${q}`); if (!r.ok) throw new Error();
      setRows((await r.json()).tickets);
      if (sel) { const tr = await fetch(`${base}?${q}${q ? "&" : ""}ticketId=${sel}`); if (tr.ok) setThread(await tr.json()); }
    } catch { setError(t.err); }
  }, [base, q, sel, t.err]);
  useEffect(() => { const id = setTimeout(() => void load(), 0); return () => clearTimeout(id); }, [load]);

  async function call(url: string, method: string, payload: unknown) {
    setBusy(true); setError("");
    try {
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setError(j.error || t.err); return false; }
      return true;
    } catch { setError(t.err); return false; } finally { setBusy(false); }
  }
  async function create(e: FormEvent) { e.preventDefault(); if (await call(base, "POST", { workspaceId, subject, body })) { setSubject(""); setBody(""); await load(); } }
  async function reply(e: FormEvent) { e.preventDefault(); if (sel && await call(`${base}/${sel}`, "POST", { body })) { setBody(""); await load(); } }
  async function setStatus(status: string) { if (sel && await call(`${base}/${sel}`, "PATCH", { status })) await load(); }

  return (
    <section className="admin-panel menu-editor" id="support" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="panel-heading"><div><span className="panel-kicker">{t.kicker}</span><h2>{t.heading}</h2></div></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {!sel ? <>
        {mode === "customer" && <form className="admin-form" onSubmit={create}>
          <label>{t.subject}<input required minLength={3} maxLength={150} value={subject} onChange={(e) => setSubject(e.target.value)} /></label>
          <label>{t.message}<textarea required maxLength={4000} rows={3} value={body} onChange={(e) => setBody(e.target.value)} /></label>
          <button className="admin-primary" type="submit" disabled={busy}>{t.open}</button>
        </form>}
        {rows.length === 0 ? <p className="empty-state">{t.none}</p> : <div className="menu-list">{rows.map((r) => (
          <button type="button" className="menu-row support-row" key={r.id} onClick={() => { setSel(r.id); setBody(""); }}>
            <div><strong>{r.subject}</strong>{r.workspaceName && <small>{r.workspaceName}</small>}</div><span className="menu-badge">{t.st[r.status]}</span>
          </button>))}</div>}
        {mode === "customer" && <p className="auth-subtitle">{t.note}</p>}
      </> : <>
        <button type="button" className="admin-secondary" onClick={() => { setSel(null); setThread(null); setBody(""); }}>{t.back}</button>
        {thread && <>
          <div className="menu-row"><div><strong>{thread.ticket.subject}</strong></div><span className="menu-badge">{t.st[thread.ticket.status]}</span></div>
          <div className="menu-list">{thread.messages.map((m) => (
            <div className="menu-row" key={m.id}><div><small>{m.fromStaff ? t.staff : (mode === "admin" ? t.you : t.youMe)} · <span className="support-stamp">{new Date(m.createdAt).toISOString().slice(0, 16).replace("T", " ")} UTC</span></small><p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{m.body}</p></div></div>))}</div>
          <form className="admin-form" onSubmit={reply}>
            <label>{t.reply}<textarea required maxLength={4000} rows={3} value={body} onChange={(e) => setBody(e.target.value)} /></label>
            <button className="admin-primary" type="submit" disabled={busy}>{t.send}</button>
          </form>
          {mode === "admin" && <button type="button" className="admin-secondary" disabled={busy} onClick={() => void setStatus(thread.ticket.status === "closed" ? "open" : "closed")}>{thread.ticket.status === "closed" ? t.reopen : t.close}</button>}
        </>}
      </>}
    </section>
  );
}
