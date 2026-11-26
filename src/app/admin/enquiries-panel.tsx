"use client";

import { useCallback, useEffect, useState } from "react";

type Lang = "ar" | "en";
type Row = { id: string; name: string; contact: string; message: string; status: string; createdAt: string };
const T = {
  ar: { kicker: "الاستفسارات", heading: "استفسارات الموقع", hint: "الاستفسارات بتتسجل هنا بس. مفيش رد بيتبعت تلقائيًا، تواصل مع صاحب الاستفسار بنفسك.", none: "مفيش استفسارات جديدة.", done: "تمت المراجعة", err: "تعذّر تنفيذ الطلب." },
  en: { kicker: "ENQUIRIES", heading: "Website enquiries", hint: "Enquiries are only recorded here. Nothing is sent automatically, contact the sender yourself.", none: "No new enquiries.", done: "Mark handled", err: "The request could not be completed." },
} as const;

export default function EnquiriesPanel({ lang = "ar" }: { lang?: Lang }) {
  const t = T[lang];
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try { const r = await fetch("/api/admin/enquiries?status=new"); if (!r.ok) throw new Error(); setRows((await r.json()).enquiries); setError(""); } catch { setError(t.err); }
  }, [t.err]);
  useEffect(() => { const id = setTimeout(() => void load(), 0); return () => clearTimeout(id); }, [load]);
  async function handle(id: string) {
    const r = await fetch("/api/admin/enquiries", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (!r.ok) setError(t.err); else await load();
  }
  return (
    <section className="admin-panel provisioning-panel" id="enquiries">
      <div className="panel-heading"><div><span className="panel-kicker">{t.kicker}</span><h2>{t.heading}</h2><p>{t.hint}</p></div></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {rows.length === 0 ? <p className="empty-state">{t.none}</p> : rows.map((r) => (
        <div key={r.id} className="nested-grid admin-form">
          <p><b>{r.name}</b> · <bdi dir="ltr">{r.contact}</bdi></p>
          <p className="auth-subtitle" style={{ whiteSpace: "pre-wrap" }}>{r.message}</p>
          <div className="selected-customer"><button type="button" className="admin-secondary" onClick={() => void handle(r.id)}>{t.done}</button></div>
        </div>
      ))}
    </section>
  );
}
