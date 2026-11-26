"use client";

import { useEffect, useState } from "react";

type Lang = "ar" | "en";
type Daily = { day: string; channel: string; scans: number };
type ByProduct = { productId: string; sku: string; scans: number };
type Stats = { since: string; daily: Daily[]; byProduct: ByProduct[] };
type Account = { accountId: string; productId: string; channel: string; balance: number };
type Entry = { accountId: string; entryType: string; amount: number; balanceAfter: number; reason: string | null; createdAt: string };
type Credits = { accounts: Account[]; recent: Entry[] };

const T = {
  ar: {
    kicker: "التحليلات", heading: "التحليلات والرصيد", intro: "عدد مرات فتح الصفحات عبر NFC وQR، وسجل الرصيد. للقراءة فقط.",
    days: "الفترة", d7: "٧ أيام", d30: "٣٠ يومًا", d90: "٩٠ يومًا", total: "إجمالي الفتحات", channels: "حسب القناة", byProduct: "حسب المنتج",
    noScans: "لا توجد فتحات في هذه الفترة.", daily: "آخر الأيام", ledger: "سجل الرصيد", accounts: "حسابات الرصيد", noAccounts: "لا توجد حسابات رصيد بعد.",
    recent: "آخر الحركات", noEntries: "لا توجد حركات بعد.", balance: "الرصيد", loading: "جارٍ التحميل.", error: "تعذّر التحميل.", nfc: "NFC", qr: "QR", after: "بعد الحركة",
  },
  en: {
    kicker: "ANALYTICS", heading: "Analytics and balance", intro: "How often pages are opened through NFC and QR, and the balance history. Read only.",
    days: "Period", d7: "7 days", d30: "30 days", d90: "90 days", total: "Total opens", channels: "By channel", byProduct: "By product",
    noScans: "No opens in this period.", daily: "Recent days", ledger: "Balance ledger", accounts: "Balance accounts", noAccounts: "No balance accounts yet.",
    recent: "Recent entries", noEntries: "No entries yet.", balance: "Balance", loading: "Loading.", error: "Could not load.", nfc: "NFC", qr: "QR", after: "after",
  },
} as const;

export default function InsightsPanel({ workspaceId, lang = "ar" }: { workspaceId: string; lang?: Lang }) {
  const t = T[lang];
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<Stats | null>(null);
  const [credits, setCredits] = useState<Credits | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    fetch(`/api/customer/analytics?workspaceId=${encodeURIComponent(workspaceId)}&days=${days}`)
      .then(async (r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((j) => { if (live) { setStats(j); setError(""); } })
      .catch(() => { if (live) setError(t.error); });
    return () => { live = false; };
  }, [workspaceId, days, t.error]);

  useEffect(() => {
    let live = true;
    fetch(`/api/customer/credits?workspaceId=${encodeURIComponent(workspaceId)}`)
      .then(async (r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((j) => { if (live) setCredits(j); })
      .catch(() => { if (live) setError(t.error); });
    return () => { live = false; };
  }, [workspaceId, t.error]);

  const total = stats ? stats.daily.reduce((s, d) => s + d.scans, 0) : 0;
  const byChannel = (c: string) => stats ? stats.daily.filter((d) => d.channel === c).reduce((s, d) => s + d.scans, 0) : 0;
  const perDay = stats ? Object.entries(stats.daily.reduce<Record<string, number>>((m, d) => { m[d.day] = (m[d.day] || 0) + d.scans; return m; }, {})).slice(-7).reverse() : [];
  const max = Math.max(1, ...perDay.map(([, n]) => n));
  const sku = (id: string) => stats?.byProduct.find((p) => p.productId === id)?.sku || id.slice(0, 8);

  return <section className="admin-panel menu-editor insights-panel" id="insights" dir={lang === "ar" ? "rtl" : "ltr"}>
    <div className="panel-heading"><div><span className="panel-kicker">{t.kicker}</span><h2>{t.heading}</h2><p>{t.intro}</p></div></div>
    {error && <p className="admin-error" role="alert">{error}</p>}
    <div className="menu-actions" role="group" aria-label={t.days}>
      {([[7, t.d7], [30, t.d30], [90, t.d90]] as const).map(([n, label]) => <button key={n} type="button" className={"menu-btn" + (days === n ? " solid" : "")} aria-pressed={days === n} onClick={() => setDays(n)}>{label}</button>)}
    </div>
    {stats === null ? <p className="empty-state">{t.loading}</p> : <>
      <div className="menu-grid">
        <div className="menu-row"><div><small>{t.total}</small><strong dir="ltr">{total}</strong></div></div>
        <div className="menu-row"><div><small>{t.channels}</small><strong dir="ltr">{t.nfc} {byChannel("nfc")} · {t.qr} {byChannel("qr")}</strong></div></div>
      </div>
      {total === 0 ? <p className="empty-state">{t.noScans}</p> : <>
        <h3>{t.daily}</h3>
        <div className="menu-list">{perDay.map(([day, n]) => <div className="menu-row" key={day}><div><small dir="ltr">{day}</small><div className="bar" style={{ height: 8, borderRadius: 4, background: "#7d9a7e", width: `${Math.max(4, Math.round((n / max) * 100))}%` }} /></div><strong dir="ltr">{n}</strong></div>)}</div>
        <h3>{t.byProduct}</h3>
        <div className="menu-list">{stats.byProduct.slice(0, 10).map((p) => <div className="menu-row" key={p.productId}><div><strong dir="ltr">{p.sku}</strong></div><span className="menu-badge" dir="ltr">{p.scans}</span></div>)}</div>
      </>}
    </>}
    <h3>{t.ledger}</h3>
    {credits === null ? <p className="empty-state">{t.loading}</p> : <>
      <h4>{t.accounts}</h4>
      {credits.accounts.length === 0 ? <p className="empty-state">{t.noAccounts}</p> : <div className="menu-list">{credits.accounts.map((a) => <div className="menu-row" key={a.accountId}><div><strong dir="ltr">{sku(a.productId)}</strong><small dir="ltr">{a.channel.toUpperCase()}</small></div><span className="menu-badge" dir="ltr">{t.balance} {a.balance}</span></div>)}</div>}
      <h4>{t.recent}</h4>
      {credits.recent.length === 0 ? <p className="empty-state">{t.noEntries}</p> : <div className="menu-list">{credits.recent.map((e, i) => <div className="menu-row" key={i}><div><strong dir="ltr">{e.amount > 0 ? "+" : ""}{e.amount}</strong><small>{e.entryType}{e.reason ? " · " + e.reason : ""}</small><small dir="ltr">{new Date(e.createdAt).toISOString().slice(0, 16).replace("T", " ")} · {t.after} {e.balanceAfter}</small></div></div>)}</div>}
    </>}
  </section>;
}
