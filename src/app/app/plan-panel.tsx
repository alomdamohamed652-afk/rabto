"use client";

import { useEffect, useState } from "react";

type Lang = "ar" | "en";
type PlanInfo = { name: string; description: string; priceNote: string | null; includedCredits: number; maxActivatedProducts: number | null; maxPages: number | null; analyticsEnabled: boolean; endsAt: string | null };
const T = {
  ar: { kicker: "الباقة", heading: "باقتك", none: "لا توجد باقة معيّنة لحسابك حاليًا. الباقة بتتحدد من فريق RABTO.", status: "الحالة", st: { active: "فعّالة", expired: "منتهية", cancelled: "ملغاة" } as Record<string, string>,
    products: "المنتجات المفعّلة", pages: "صفحات المنيو", analytics: "التحليلات", unlimited: "بلا حد", included: "متاحة", excluded: "غير متاحة", ends: "تنتهي في", credits: "الرصيد المضمّن (سجل فقط)",
    note: "لو انتهت الباقة أو اتلغت، المنتجات والصفحات الحالية بتفضل شغالة، والحدود بتمنع الإضافة الجديدة بس.", error: "تعذّر التحميل." },
  en: { kicker: "PLAN", heading: "Your plan", none: "No plan is assigned to your account yet. Plans are set by the RABTO team.", status: "Status", st: { active: "Active", expired: "Expired", cancelled: "Cancelled" } as Record<string, string>,
    products: "Activated products", pages: "Menu pages", analytics: "Analytics", unlimited: "No limit", included: "Included", excluded: "Not included", ends: "Ends", credits: "Included credits (record only)",
    note: "If a plan expires or is cancelled, your existing products and pages keep working. Limits only stop adding new ones.", error: "Could not load." },
} as const;

export default function PlanPanel({ workspaceId, lang = "ar" }: { workspaceId: string; lang?: Lang }) {
  const t = T[lang];
  const [data, setData] = useState<{ plan: PlanInfo | null; status: string } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    fetch(`/api/customer/plan?workspaceId=${encodeURIComponent(workspaceId)}`).then(async (r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((j) => { if (live) setData(j); }).catch(() => { if (live) setError(t.error); });
    return () => { live = false; };
  }, [workspaceId, t.error]);
  const lim = (v: number | null) => (v === null ? t.unlimited : String(v));
  return (
    <section className="admin-panel menu-editor" id="plan" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="panel-heading"><div><span className="panel-kicker">{t.kicker}</span><h2>{t.heading}</h2></div></div>
      {error ? <p className="form-error" role="alert">{error}</p> : !data ? null : !data.plan ? <p className="empty-state">{t.none}</p> : (
        <div className="menu-list">
          <div className="menu-row"><div><strong>{data.plan.name}</strong>{data.plan.description && <small>{data.plan.description}</small>}{data.plan.priceNote && <small>{data.plan.priceNote}</small>}</div><span className="menu-badge">{t.st[data.status] || data.status}</span></div>
          <div className="menu-row"><div><strong>{t.products}</strong></div><span className="menu-badge">{lim(data.plan.maxActivatedProducts)}</span></div>
          <div className="menu-row"><div><strong>{t.pages}</strong></div><span className="menu-badge">{lim(data.plan.maxPages)}</span></div>
          <div className="menu-row"><div><strong>{t.analytics}</strong></div><span className="menu-badge">{data.plan.analyticsEnabled ? t.included : t.excluded}</span></div>
          <div className="menu-row"><div><strong>{t.credits}</strong></div><span className="menu-badge">{data.plan.includedCredits}</span></div>
          {data.plan.endsAt && <div className="menu-row"><div><strong>{t.ends}</strong></div><span className="menu-badge" dir="ltr">{data.plan.endsAt.slice(0, 10)}</span></div>}
          <p className="empty-state">{t.note}</p>
        </div>)}
    </section>
  );
}
