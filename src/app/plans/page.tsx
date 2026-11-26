"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LanguageSwitcher, { useLanguage } from "@/lib/i18n/language-switcher";

type Plan = { name: string; description: string; priceNote: string | null; maxActivatedProducts: number | null; maxPages: number | null; analyticsEnabled: boolean };
const T = {
  ar: { space: "الباقات", h1: "باقات RABTO", sub: "التفاصيل زي ما اتحددت من فريق RABTO.", none: "لسه مفيش باقات منشورة. هتظهر هنا أول ما تتحدد.", err: "تعذّر تحميل الباقات.", products: "منتجات مفعّلة", pages: "صفحات", unlimited: "بدون حد", analytics: "التحليلات", on: "متاحة", off: "غير متاحة", back: "العودة للرئيسية", loading: "جارٍ التحميل..." },
  en: { space: "PLANS", h1: "RABTO plans", sub: "Details exactly as set by the RABTO team.", none: "No plans are published yet. They will appear here once defined.", err: "Plans could not be loaded.", products: "Activated products", pages: "Pages", unlimited: "No limit", analytics: "Analytics", on: "Included", off: "Not included", back: "Back to home", loading: "Loading..." },
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
  return (
    <main className="auth-shell">
      <section className="auth-card" dir={lang === "en" ? "ltr" : "rtl"} style={{ width: "min(100%, 760px)" }}>
        <div className="auth-topline"><Link className="auth-brand" href="/"><span className="brand-symbol"><span /></span><b>RABTO</b></Link><LanguageSwitcher lang={lang} /></div>
        <p className="eyebrow">{t.space}</p>
        <h1>{t.h1}</h1>
        <p className="auth-subtitle">{t.sub}</p>
        {failed ? <p className="form-error" role="alert">{t.err}</p> : rows === null ? <p className="empty-state">{t.loading}</p> : rows.length === 0 ? <p className="admin-notice" role="status">{t.none}</p> : (
          <div className="admin-grid nested-grid">
            {rows.map((p) => (
              <article key={p.name} className="admin-panel">
                <h2 className="plan-title">{p.name}</h2>
                {p.priceNote && <p className="panel-kicker">{p.priceNote}</p>}
                {p.description && <p className="auth-subtitle">{p.description}</p>}
                <p className="auth-subtitle">{t.products}: {p.maxActivatedProducts ?? t.unlimited}</p>
                <p className="auth-subtitle">{t.pages}: {p.maxPages ?? t.unlimited}</p>
                <p className="auth-subtitle">{t.analytics}: {p.analyticsEnabled ? t.on : t.off}</p>
              </article>
            ))}
          </div>
        )}
        <p className="auth-footnote"><Link href="/">{t.back}</Link></p>
      </section>
    </main>
  );
}
