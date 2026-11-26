"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "./plans.css";
import LanguageSwitcher, { useLanguage } from "@/lib/i18n/language-switcher";

type Plan = { name: string; description: string; priceNote: string | null; maxActivatedProducts: number | null; maxPages: number | null; analyticsEnabled: boolean };
const T = {
  ar: { space: "الباقات", h1: "باقات RABTO", sub: "قارن بين الباقات بوضوح: كل رقم هنا زي ما اتحدد من فريق RABTO، من غير زيادة.", none: "الباقات لسه متنشرتش", noneSub: "أول ما الفريق يحدد الباقات هتظهر هنا بتفاصيلها.", err: "تعذّر تحميل الباقات.", products: "منتجات مفعّلة", pages: "صفحات", unlimited: "بدون حد", compare: "مقارنة سريعة", plan: "الباقة", analytics: "التحليلات", on: "متاحة", off: "غير متاحة", back: "العودة للرئيسية", loading: "جارٍ التحميل..." },
  en: { space: "PLANS", h1: "RABTO plans", sub: "Compare the plans side by side. Every figure is exactly as set by the RABTO team.", none: "Plans are not published yet", noneSub: "They will appear here, with full details, as soon as the team defines them.", err: "Plans could not be loaded.", products: "Activated products", pages: "Pages", unlimited: "No limit", compare: "Quick comparison", plan: "Plan", analytics: "Analytics", on: "Included", off: "Not included", back: "Back to home", loading: "Loading..." },
} as const;

export default function PlansPage() {
  const lang = useLanguage();
  const t = T[lang === "en" ? "en" : "ar"];
  const [rows, setRows] = useState<Plan[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    fetch("/api/public/plans").then((r) => (r.ok ? r.json() : Promise.reject())).then((j) => { if (live) setRows(j.plans); }).catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, []);
  const val = (n: number | null) => (n === null ? "∞" : String(n));
  return (
    <main className="pl-shell" dir={lang === "en" ? "ltr" : "rtl"}>
      <div className="pl-wrap">
        <div className="pl-top"><Link className="auth-brand" href="/"><span className="brand-symbol"><span /></span><b>RABTO</b></Link><LanguageSwitcher lang={lang} /></div>
        <header className="pl-hero">
          <p className="pl-kicker">{t.space}</p>
          <h1>{t.h1}</h1>
          <p>{t.sub}</p>
        </header>
        {failed ? <p className="form-error" role="alert">{t.err}</p> : rows === null ? <p className="empty-state">{t.loading}</p> : rows.length === 0 ? (
          <div className="pl-empty" role="status"><b>{t.none}</b><p>{t.noneSub}</p></div>
        ) : (
          <>
            <div className="pl-grid">
              {rows.map((p, i) => (
                <article key={p.name} className="pl-card">
                  <span className="pl-num">{String(i + 1).padStart(2, "0")}</span>
                  <h2 className="pl-name">{p.name}</h2>
                  {p.priceNote && <span className="pl-price">{p.priceNote}</span>}
                  {p.description && <p className="pl-desc">{p.description}</p>}
                  <div className="pl-metrics">
                    <div className="pl-metric"><b>{val(p.maxActivatedProducts)}</b><span>{t.products}</span></div>
                    <div className="pl-metric"><b>{val(p.maxPages)}</b><span>{t.pages}</span></div>
                  </div>
                  <div className="pl-an"><span className={"pl-dot" + (p.analyticsEnabled ? "" : " off")} aria-hidden="true">{p.analyticsEnabled ? "✓" : "–"}</span><span>{t.analytics}: {p.analyticsEnabled ? t.on : t.off}</span></div>
                </article>
              ))}
            </div>
            {rows.length > 1 && (
              <section className="pl-compare" aria-label={t.compare}>
                <h2>{t.compare}</h2>
                <div className="pl-tablewrap">
                  <table className="pl-table">
                    <thead><tr><th scope="col">{t.plan}</th>{rows.map((p) => <th key={p.name} scope="col">{p.name}</th>)}</tr></thead>
                    <tbody>
                      <tr><th scope="row">{t.products}</th>{rows.map((p) => <td key={p.name}>{p.maxActivatedProducts ?? t.unlimited}</td>)}</tr>
                      <tr><th scope="row">{t.pages}</th>{rows.map((p) => <td key={p.name}>{p.maxPages ?? t.unlimited}</td>)}</tr>
                      <tr><th scope="row">{t.analytics}</th>{rows.map((p) => <td key={p.name}>{p.analyticsEnabled ? t.on : t.off}</td>)}</tr>
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
        <Link className="pl-back" href="/">{t.back}</Link>
      </div>
    </main>
  );
}
