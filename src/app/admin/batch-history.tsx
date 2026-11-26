"use client";

import { useCallback, useEffect, useState } from "react";
import CodeTools from "./code-tools";

type Lang = "ar" | "en";
type Batch = { id: string; code: string; quantity: number; createdAt: string; workspaceName: string; productType: string; activated: number };
type Code = { productId: string; channel: "qr" | "nfc"; publicCode: string };
const T = {
  ar: { kicker: "سجل الدفعات", heading: "الدفعات السابقة وإعادة الطباعة", hint: "إعادة الطباعة بتعرض الأكواد العامة والروابط بس. أسرار التفعيل بتتعرض مرة واحدة وقت إنشاء الدفعة ومينفعش تتعرض تاني.", none: "مفيش دفعات لسه.", code: "الدفعة", ws: "مساحة العمل", type: "النوع", qty: "الكمية", act: "مفعّل", open: "عرض الأكواد للطباعة", err: "تعذّر تنفيذ الطلب." },
  en: { kicker: "BATCH HISTORY", heading: "Past batches and reprint", hint: "Reprint shows public codes and links only. Activation secrets are shown once when a batch is created and can never be shown again.", none: "No batches yet.", code: "Batch", ws: "Workspace", type: "Type", qty: "Quantity", act: "Activated", open: "Show codes to print", err: "The request could not be completed." },
} as const;

export default function BatchHistory({ lang = "ar", refreshKey = 0 }: { lang?: Lang; refreshKey?: number }) {
  const t = T[lang];
  const [rows, setRows] = useState<Batch[]>([]);
  const [codes, setCodes] = useState<Code[]>([]);
  const [sel, setSel] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try { const r = await fetch("/api/admin/batches"); if (!r.ok) throw new Error(); setRows((await r.json()).batches); setError(""); } catch { setError(t.err); }
  }, [t.err]);
  useEffect(() => { const id = setTimeout(() => void load(), 0); return () => clearTimeout(id); }, [load, refreshKey]);
  async function show(id: string) {
    setError("");
    try { const r = await fetch(`/api/admin/batches/${id}/codes`); if (!r.ok) throw new Error(); setCodes((await r.json()).codes); setSel(id); } catch { setError(t.err); }
  }
  return (
    <section className="admin-panel provisioning-panel" id="batch-history">
      <div className="panel-heading"><div><span className="panel-kicker">{t.kicker}</span><h2>{t.heading}</h2><p>{t.hint}</p></div></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {rows.length === 0 ? <p className="empty-state">{t.none}</p> : <div className="codes-table">
        {rows.map((b) => (
          <div key={b.id} className="code-row" style={{ gridTemplateColumns: "minmax(80px,1fr) minmax(80px,1fr) minmax(60px,1fr) auto" }}>
            <strong>{b.code}</strong>
            <span>{b.workspaceName} · {b.productType}</span>
            <span>{t.qty}: {b.quantity} · {t.act}: {b.activated}</span>
            <button type="button" className="admin-secondary" onClick={() => void show(b.id)} aria-pressed={sel === b.id}>{t.open}</button>
          </div>
        ))}
      </div>}
      {sel && codes.length > 0 && <CodeTools codes={codes} lang={lang} />}
    </section>
  );
}
