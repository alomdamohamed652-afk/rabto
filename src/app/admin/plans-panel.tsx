"use client";

import { useState } from "react";
import type { FormEvent } from "react";

export type PlanRow = { id: string; name: string; description: string; priceNote: string | null; includedCredits: number; maxActivatedProducts: number | null; maxPages: number | null; analyticsEnabled: boolean; isActive: boolean };
type CustomerRow = { workspaceId: string; workspaceName: string; email: string };
type Lang = "ar" | "en";

const T = {
  ar: {
    kicker: "الباقات", heading: "الباقات والصلاحيات", intro: "عرّف الباقات من هنا. الحدود بتتطبق على السيرفر، وخانة الحد الفاضية معناها بلا حد. الوصف والسعر نص للعرض فقط، ومفيش دفع أو خصم تلقائي.",
    empty: "لا توجد باقات بعد. أنشئ أول باقة.", name: "اسم الباقة", description: "وصف للعرض", priceNote: "نص السعر للعرض فقط", credits: "رصيد مذكور في الباقة (ملاحظة، مش بيُضاف للرصيد)",
    maxProducts: "حد المنتجات المفعّلة", maxPages: "حد صفحات المنيو", analytics: "التحليلات متاحة", active: "الباقة فعّالة", unlimited: "بلا حد",
    create: "إنشاء الباقة", save: "حفظ", edit: "تعديل", cancel: "إلغاء", assignHeading: "تعيين باقة لعميل", customer: "العميل", plan: "الباقة", status: "الحالة", endsAt: "تاريخ الانتهاء (اختياري)",
    assign: "تعيين الباقة", choose: "اختر", st: { active: "فعّالة", expired: "منتهية", cancelled: "ملغاة" } as Record<string, string>, saved: "تم الحفظ.", yes: "نعم", no: "لا",
    note: "سلوك الباقة بعد الانتهاء أو الإلغاء مقترح ولسه مش معتمد. الحالي: حدود الباقة تفضل سارية على الإضافة الجديدة، والمنتجات والصفحات الحالية مش بتتعطّل.",
  },
  en: {
    kicker: "PLANS", heading: "Plans and entitlements", intro: "Define plans here. Limits are enforced on the server; an empty limit means no limit. Description and price are display text only. There is no payment or automatic charging.",
    empty: "No plans yet. Create the first plan.", name: "Plan name", description: "Display description", priceNote: "Price text (display only)", credits: "Credits noted in plan (a note, not added to any balance)",
    maxProducts: "Activated products limit", maxPages: "Menu pages limit", analytics: "Analytics available", active: "Plan is active", unlimited: "No limit",
    create: "Create plan", save: "Save", edit: "Edit", cancel: "Cancel", assignHeading: "Assign a plan to a customer", customer: "Customer", plan: "Plan", status: "Status", endsAt: "End date (optional)",
    assign: "Assign plan", choose: "Choose", st: { active: "Active", expired: "Expired", cancelled: "Cancelled" } as Record<string, string>, saved: "Saved.", yes: "Yes", no: "No",
    note: "Behavior after expiry or cancellation is a proposal, not approved. Current default: plan limits keep applying to new items; existing products and pages are never disabled.",
  },
} as const;

const blank = { name: "", description: "", priceNote: "", includedCredits: "0", maxActivatedProducts: "", maxPages: "", analyticsEnabled: true, isActive: true };

export default function PlansPanel({ plans, customers, lang, onChanged }: { plans: PlanRow[]; customers: CustomerRow[]; lang: Lang; onChanged: () => void }) {
  const t = T[lang];
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [as, setAs] = useState({ workspaceId: "", planId: "", status: "active", endsAt: "" });

  const num = (v: string) => (v.trim() === "" ? null : Number(v));
  async function submitPlan(e: FormEvent) {
    e.preventDefault(); setErr(""); setMsg("");
    const body = { id: editId || undefined, name: form.name, description: form.description, priceNote: form.priceNote || null, includedCredits: Number(form.includedCredits), maxActivatedProducts: num(form.maxActivatedProducts), maxPages: num(form.maxPages), analyticsEnabled: form.analyticsEnabled, isActive: form.isActive };
    const r = await fetch("/api/admin/plans", { method: editId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error || "Error"); return; }
    setMsg(t.saved); setForm(blank); setEditId(""); onChanged();
  }
  function startEdit(p: PlanRow) {
    setEditId(p.id); setMsg(""); setErr("");
    setForm({ name: p.name, description: p.description, priceNote: p.priceNote || "", includedCredits: String(p.includedCredits), maxActivatedProducts: p.maxActivatedProducts === null ? "" : String(p.maxActivatedProducts), maxPages: p.maxPages === null ? "" : String(p.maxPages), analyticsEnabled: p.analyticsEnabled, isActive: p.isActive });
  }
  async function submitAssign(e: FormEvent) {
    e.preventDefault(); setErr(""); setMsg("");
    const r = await fetch("/api/admin/subscriptions", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: as.workspaceId, planId: as.planId, status: as.status, endsAt: as.endsAt ? new Date(as.endsAt).toISOString() : null }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error || "Error"); return; }
    setMsg(t.saved);
  }
  const lim = (v: number | null) => (v === null ? t.unlimited : String(v));

  return (
    <section className="admin-panel" id="plans">
      <div className="panel-heading"><div><span className="panel-kicker">{t.kicker}</span><h2>{t.heading}</h2><p>{t.intro}</p></div></div>
      {plans.length === 0 ? <p className="empty-state">{t.empty}</p> : <div className="customer-list">{plans.map((p) => (
        <div className="customer-row" key={p.id}>
          <div><strong>{p.name}{p.isActive ? "" : " · off"}</strong>
            <small>{t.maxProducts}: {lim(p.maxActivatedProducts)}</small><small>{t.maxPages}: {lim(p.maxPages)}</small><small>{t.analytics}: {p.analyticsEnabled ? t.yes : t.no}</small>
            {p.priceNote && <small>{p.priceNote}</small>}</div>
          <button type="button" className="admin-secondary" onClick={() => startEdit(p)}>{t.edit}</button>
        </div>))}</div>}
      <form className="admin-form" onSubmit={submitPlan}>
        <label>{t.name}<input required minLength={2} maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>{t.description}<textarea maxLength={1000} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <label>{t.priceNote}<input maxLength={160} value={form.priceNote} onChange={(e) => setForm({ ...form, priceNote: e.target.value })} /></label>
        <label>{t.credits}<input type="number" min={0} inputMode="numeric" value={form.includedCredits} onChange={(e) => setForm({ ...form, includedCredits: e.target.value })} /></label>
        <label>{t.maxProducts}<input type="number" min={0} inputMode="numeric" placeholder={t.unlimited} value={form.maxActivatedProducts} onChange={(e) => setForm({ ...form, maxActivatedProducts: e.target.value })} /></label>
        <label>{t.maxPages}<input type="number" min={0} inputMode="numeric" placeholder={t.unlimited} value={form.maxPages} onChange={(e) => setForm({ ...form, maxPages: e.target.value })} /></label>
        <label className="check"><input type="checkbox" checked={form.analyticsEnabled} onChange={(e) => setForm({ ...form, analyticsEnabled: e.target.checked })} /> {t.analytics}</label>
        <label className="check"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> {t.active}</label>
        <button className="admin-primary">{editId ? t.save : t.create} <span>←</span></button>
        {editId && <button type="button" className="list-more" onClick={() => { setEditId(""); setForm(blank); }}>{t.cancel}</button>}
      </form>
      <h3>{t.assignHeading}</h3>
      <form className="admin-form" onSubmit={submitAssign}>
        <label>{t.customer}<select required value={as.workspaceId} onChange={(e) => setAs({ ...as, workspaceId: e.target.value })}><option value="">{t.choose}</option>{customers.map((c) => <option key={c.workspaceId} value={c.workspaceId}>{c.workspaceName} · {c.email}</option>)}</select></label>
        <label>{t.plan}<select required value={as.planId} onChange={(e) => setAs({ ...as, planId: e.target.value })}><option value="">{t.choose}</option>{plans.filter((p) => p.isActive).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label>{t.status}<select value={as.status} onChange={(e) => setAs({ ...as, status: e.target.value })}>{Object.entries(t.st).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label>{t.endsAt}<input type="date" value={as.endsAt} onChange={(e) => setAs({ ...as, endsAt: e.target.value })} /></label>
        <button className="admin-primary">{t.assign} <span>←</span></button>
      </form>
      <p className="empty-state">{t.note}</p>
      {msg && <p className="form-notice" role="status">{msg}</p>}
      {err && <p className="form-error" role="alert">{err}</p>}
    </section>
  );
}
