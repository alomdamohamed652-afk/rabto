"use client";

import { useCallback, useEffect, useState } from "react";

type Lang = "ar" | "en";
type Row = { id: string; status: string; phone: string; note: string | null; createdAt: string; email: string; decisionNote: string | null };
const T = {
  ar: { kicker: "استعادة الحساب", heading: "طلبات المساعدة اليدوية", hint: "الطلب مش بيغيّر أي كلمة مرور. كلّم العميل بنفسك وتأكد من هويته، وبعدين سجّل قرارك.", none: "مفيش طلبات مفتوحة.", contacted: "تم التواصل مع العميل", rejected: "مرفوض", err: "تعذّر تنفيذ الطلب.", note: "ملاحظة القرار (اختياري)", account: "الحساب", phone: "الموبايل" },
  en: { kicker: "ACCOUNT RECOVERY", heading: "Manual help requests", hint: "A request never changes a password. Contact the customer yourself and confirm who they are, then record your decision.", none: "No open requests.", contacted: "Customer contacted", rejected: "Reject", err: "The request could not be completed.", note: "Decision note (optional)", account: "Account", phone: "Mobile" },
} as const;

export default function RecoveryPanel({ lang = "ar" }: { lang?: Lang }) {
  const t = T[lang];
  const [rows, setRows] = useState<Row[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try { const r = await fetch("/api/admin/recovery-requests?status=open"); if (!r.ok) throw new Error(); setRows((await r.json()).requests); setError(""); } catch { setError(t.err); }
  }, [t.err]);
  useEffect(() => { const id = setTimeout(() => void load(), 0); return () => clearTimeout(id); }, [load]);
  async function decide(id: string, decision: "contacted" | "rejected") {
    const r = await fetch("/api/admin/recovery-requests", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, decision, note: notes[id] ?? "" }) });
    if (!r.ok) setError(t.err); else await load();
  }
  return (
    <section className="admin-panel provisioning-panel" id="recovery">
      <div className="panel-heading"><div><span className="panel-kicker">{t.kicker}</span><h2>{t.heading}</h2><p>{t.hint}</p></div></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {rows.length === 0 ? <p className="empty-state">{t.none}</p> : rows.map((r) => (
        <div key={r.id} className="nested-grid admin-form">
          <p><b>{t.account}:</b> <bdi dir="ltr">{r.email}</bdi> · <b>{t.phone}:</b> <bdi dir="ltr">{r.phone}</bdi></p>
          {r.note && <p className="auth-subtitle">{r.note}</p>}
          <label>{t.note}<input maxLength={500} value={notes[r.id] ?? ""} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} /></label>
          <div className="selected-customer">
            <button type="button" className="admin-primary" onClick={() => void decide(r.id, "contacted")}>{t.contacted}</button>
            <button type="button" className="admin-secondary" onClick={() => void decide(r.id, "rejected")}>{t.rejected}</button>
          </div>
        </div>
      ))}
    </section>
  );
}
