"use client";

import { useCallback, useEffect, useState } from "react";

type Lang = "ar" | "en";
type PType = { id: string; name: string; skuPrefix: string };
type Order = { id: string; orderNumber: string; customerName: string; customerEmail: string | null; currency: string; status: string; fulfillmentType: string; depositStatus: string; subtotalMinor: number; depositMinor: number | null; notes: string | null; createdAt: string };
type Line = { productTypeId: string; quantity: string; price: string };

const T = {
  ar: {
    heading: "الطلبات", intro: "سجّل الطلبات يدويًا وتابع حالتها. العربون مجرد تسجيل، لا يوجد دفع أونلاين.", newOrder: "طلب جديد", none: "لا توجد طلبات.", loading: "جارٍ التحميل...",
    customer: "اسم العميل", email: "إيميل العميل (اختياري)", currency: "العملة", fulfillment: "نوع التجهيز", in_stock: "متوفر", pre_order: "طلب مسبق", backorder: "تحت التوريد",
    product: "نوع المنتج", qty: "الكمية", price: "سعر الوحدة", addLine: "إضافة بند", remove: "حذف", deposit: "عربون (اختياري)", notes: "ملاحظات (اختياري)", create: "إنشاء الطلب", cancel: "إلغاء",
    status: { pending: "قيد الانتظار", confirmed: "مؤكد", cancelled: "ملغي", fulfilled: "تم التسليم" }, confirm: "تأكيد", doCancel: "إلغاء الطلب", fulfill: "تم التسليم",
    depositStatus: { none: "بدون عربون", requested: "العربون مطلوب", received: "العربون مستلم" }, markReceived: "تسجيل استلام العربون", total: "الإجمالي", badNumber: "رقم غير صالح", noTypes: "لا توجد أنواع منتجات في مساحة العمل بعد.", err: "حدث خطأ.", created: "تم إنشاء الطلب",
  },
  en: {
    heading: "Orders", intro: "Record orders by hand and track their status. A deposit is only a record, there is no online payment.", newOrder: "New order", none: "No orders yet.", loading: "Loading...",
    customer: "Customer name", email: "Customer email (optional)", currency: "Currency", fulfillment: "Fulfillment", in_stock: "In stock", pre_order: "Pre-order", backorder: "Backorder",
    product: "Product type", qty: "Quantity", price: "Unit price", addLine: "Add line", remove: "Remove", deposit: "Deposit (optional)", notes: "Notes (optional)", create: "Create order", cancel: "Cancel",
    status: { pending: "Pending", confirmed: "Confirmed", cancelled: "Cancelled", fulfilled: "Fulfilled" }, confirm: "Confirm", doCancel: "Cancel order", fulfill: "Mark fulfilled",
    depositStatus: { none: "No deposit", requested: "Deposit requested", received: "Deposit received" }, markReceived: "Record deposit received", total: "Total", badNumber: "Invalid number", noTypes: "This workspace has no product types yet.", err: "Something went wrong.", created: "Order created",
  },
} as const;

export function toMinor(value: string): number | null {
  const v = value.trim().replace(",", ".");
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(v)) return null;
  const [w, f = ""] = v.split(".");
  return Number(w) * 100 + Number((f + "00").slice(0, 2));
}
const fmt = (m: number) => (m / 100).toFixed(2);

export default function OrdersPanel({ workspaceId, lang = "ar" }: { workspaceId: string; lang?: Lang }) {
  const t = T[lang];
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [types, setTypes] = useState<PType[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [customer, setCustomer] = useState("");
  const [email, setEmail] = useState("");
  const [currency, setCurrency] = useState("EGP");
  const [fulfillment, setFulfillment] = useState("in_stock");
  const [deposit, setDeposit] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([]);

  const load = useCallback(async () => {
    const [o, p] = await Promise.all([
      fetch("/api/customer/orders?workspaceId=" + encodeURIComponent(workspaceId), { cache: "no-store" }),
      fetch("/api/customer/product-types?workspaceId=" + encodeURIComponent(workspaceId), { cache: "no-store" }),
    ]);
    const od = (await o.json()) as { orders?: Order[]; error?: string };
    const pd = (await p.json()) as { productTypes?: PType[]; error?: string };
    if (!o.ok) throw new Error(od.error || t.err);
    if (!p.ok) throw new Error(pd.error || t.err);
    setOrders(od.orders || []); setTypes(pd.productTypes || []);
  }, [workspaceId, t.err]);

  // Parent remounts per workspace (key), so no state reset is needed here.
  useEffect(() => { Promise.resolve().then(load).catch((e) => setError(e instanceof Error ? e.message : t.err)); }, [load, t.err]);

  function startNew() {
    setCustomer(""); setEmail(""); setCurrency("EGP"); setFulfillment("in_stock"); setDeposit(""); setNotes("");
    setLines([{ productTypeId: types[0]?.id || "", quantity: "1", price: "" }]); setError(""); setMsg(""); setCreating(true);
  }

  async function create() {
    setBusy(true); setError(""); setMsg("");
    try {
      const items = lines.map((l) => {
        const unit = toMinor(l.price); const q = Number(l.quantity);
        if (unit === null || !Number.isInteger(q) || q < 1 || !l.productTypeId) throw new Error(t.badNumber);
        return { productTypeId: l.productTypeId, quantity: q, unitPriceMinor: unit };
      });
      const body: Record<string, unknown> = { workspaceId, customerName: customer, currency: currency.toUpperCase(), fulfillmentType: fulfillment, items };
      if (email.trim()) body.customerEmail = email.trim();
      if (notes.trim()) body.notes = notes;
      if (deposit.trim()) { const d = toMinor(deposit); if (d === null) throw new Error(t.badNumber); body.depositMinor = d; }
      const r = await fetch("/api/customer/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const d = (await r.json()) as { orderNumber?: string; error?: string };
      if (!r.ok) throw new Error(d.error || t.err);
      setMsg(t.created + " " + d.orderNumber); setCreating(false); await load();
    } catch (e) { setError(e instanceof Error ? e.message : t.err); } finally { setBusy(false); }
  }

  async function patch(id: string, change: Record<string, unknown>) {
    setBusy(true); setError(""); setMsg("");
    try {
      const r = await fetch("/api/customer/orders/" + id, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ workspaceId, ...change }) });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(d.error || t.err);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : t.err); } finally { setBusy(false); }
  }

  const setLine = (i: number, p: Partial<Line>) => setLines((c) => c.map((l, a) => a === i ? { ...l, ...p } : l));

  return <section className="admin-panel menu-editor orders-panel" id="orders" dir={lang === "ar" ? "rtl" : "ltr"}>
    <div className="panel-heading"><div><span className="panel-kicker">{lang === "ar" ? "الطلبات" : "ORDERS"}</span><h2>{t.heading}</h2><p>{t.intro}</p></div>
      {!creating && <button type="button" className="menu-btn solid" onClick={startNew}>{t.newOrder}</button>}</div>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {msg && <p className="menu-msg" role="status">{msg}</p>}
    {creating ? <form className="menu-form" onSubmit={(e) => { e.preventDefault(); void create(); }}>
      {types.length === 0 && <p className="empty-state">{t.noTypes}</p>}
      <div className="menu-grid">
        <label>{t.customer}<input required maxLength={160} autoComplete="off" value={customer} onChange={(e) => setCustomer(e.target.value)} /></label>
        <label>{t.email}<input type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="off" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>{t.currency}<input required minLength={3} maxLength={3} pattern="[A-Za-z]{3}" dir="ltr" inputMode="text" autoCapitalize="characters" autoCorrect="off" autoComplete="off" spellCheck={false} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} /></label>
        <label>{t.fulfillment}<select value={fulfillment} onChange={(e) => setFulfillment(e.target.value)}>{(["in_stock", "pre_order", "backorder"] as const).map((k) => <option key={k} value={k}>{t[k]}</option>)}</select></label>
      </div>
      {lines.map((l, i) => <div className="menu-item" key={i}>
        <label>{t.product}<select required value={l.productTypeId} onChange={(e) => setLine(i, { productTypeId: e.target.value })}>{types.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label>{t.qty}<input required inputMode="numeric" pattern="[0-9]*" dir="ltr" autoComplete="off" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} /></label>
        <label>{t.price}<input required inputMode="decimal" dir="ltr" autoComplete="off" placeholder="0.00" value={l.price} onChange={(e) => setLine(i, { price: e.target.value })} /></label>
        {lines.length > 1 && <button type="button" className="menu-btn" onClick={() => setLines((c) => c.filter((_, a) => a !== i))}>{t.remove}</button>}
      </div>)}
      <button type="button" className="menu-btn" onClick={() => setLines((c) => [...c, { productTypeId: types[0]?.id || "", quantity: "1", price: "" }])}>{t.addLine}</button>
      <div className="menu-grid">
        <label>{t.deposit}<input inputMode="decimal" dir="ltr" autoComplete="off" placeholder="0.00" value={deposit} onChange={(e) => setDeposit(e.target.value)} /></label>
        <label className="wide">{t.notes}<input maxLength={2000} autoComplete="off" value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
      </div>
      <div className="menu-actions sticky">
        <button type="submit" className="menu-btn solid" disabled={busy || types.length === 0}>{t.create}</button>
        <button type="button" className="menu-btn" onClick={() => setCreating(false)}>{t.cancel}</button>
      </div>
    </form> : orders === null ? <p className="empty-state">{t.loading}</p> : orders.length === 0 ? <p className="empty-state">{t.none}</p> :
      <div className="menu-list">{orders.map((o) => <article className="menu-row order-row" key={o.id}>
        <div><strong dir="ltr">{o.orderNumber}</strong><small>{o.customerName}</small><small>{t.total}: {fmt(o.subtotalMinor)} {o.currency}{o.depositMinor ? " · " + t.depositStatus[o.depositStatus as keyof typeof t.depositStatus] + " " + fmt(o.depositMinor) : ""}</small></div>
        <span className="menu-badge">{t.status[o.status as keyof typeof t.status] || o.status}</span>
        <span className="menu-badge">{t[o.fulfillmentType as "in_stock"] || o.fulfillmentType}</span>
        {o.status === "pending" && <button type="button" className="menu-btn solid" disabled={busy} onClick={() => void patch(o.id, { status: "confirmed" })}>{t.confirm}</button>}
        {o.status === "confirmed" && <button type="button" className="menu-btn solid" disabled={busy} onClick={() => void patch(o.id, { status: "fulfilled" })}>{t.fulfill}</button>}
        {(o.status === "pending" || o.status === "confirmed") && <button type="button" className="menu-btn" disabled={busy} onClick={() => void patch(o.id, { status: "cancelled" })}>{t.doCancel}</button>}
        {o.depositStatus === "requested" && <button type="button" className="menu-btn" disabled={busy} onClick={() => void patch(o.id, { depositStatus: "received" })}>{t.markReceived}</button>}
      </article>)}</div>}
  </section>;
}
