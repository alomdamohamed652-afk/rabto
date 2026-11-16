"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Customer = {
  userId: string; email: string; createdAt: string;
  workspaceId: string; workspaceName: string; workspaceSlug: string;
};
type ProductType = { id: string; name: string; skuPrefix: string; isActive: boolean };
type InvitationResult = { invitation: { url: string; expiresAt: string } };
type ProvisionResult = { batchId: string; quantity: number; codes: { productId: string; channel: "qr" | "nfc"; publicCode: string; activationSecret: string }[] };

export default function AdminConsole() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState("");
  const [types, setTypes] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [issuedCodes, setIssuedCodes] = useState<ProvisionResult["codes"]>([]);

  const [email, setEmail] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [typeName, setTypeName] = useState("");
  const [skuPrefix, setSkuPrefix] = useState("");
  const [productTypeId, setProductTypeId] = useState("");
  const [batchCode, setBatchCode] = useState("");
  const [quantity, setQuantity] = useState("10");
  const [destination, setDestination] = useState("https://example.com");

  const loadCustomers = useCallback(async () => {
    const response = await fetch("/api/admin/customers", { cache: "no-store" });
    const data = await response.json() as { customers?: Customer[]; error?: string };
    if (!response.ok) throw new Error(data.error || "تعذر تحميل العملاء.");
    setCustomers(data.customers || []);
    if (!selectedWorkspace && data.customers?.[0]) setSelectedWorkspace(data.customers[0].workspaceId);
  }, [selectedWorkspace]);

  const loadTypes = useCallback(async () => {
    if (!selectedWorkspace) { setTypes([]); return; }
    const response = await fetch(`/api/admin/product-types?workspaceId=${encodeURIComponent(selectedWorkspace)}`, { cache: "no-store" });
    const data = await response.json() as { productTypes?: ProductType[]; error?: string };
    if (!response.ok) throw new Error(data.error || "تعذر تحميل أنواع المنتجات.");
    setTypes(data.productTypes || []);
    setProductTypeId(data.productTypes?.[0]?.id || "");
  }, [selectedWorkspace]);

  useEffect(() => {
    loadCustomers().catch((cause) => setError(cause instanceof Error ? cause.message : "تعذر تحميل البيانات."))
      .finally(() => setLoading(false));
  }, [loadCustomers]);

  useEffect(() => {
    loadTypes().catch((cause) => setError(cause instanceof Error ? cause.message : "تعذر تحميل أنواع المنتجات."));
  }, [loadTypes]);

  async function submitCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice(""); setInviteUrl("");
    try {
      const response = await fetch("/api/admin/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, workspaceName, workspaceSlug }) });
      const data = await response.json() as InvitationResult & { error?: string };
      if (!response.ok) throw new Error(data.error || "تعذر إنشاء العميل.");
      setInviteUrl(data.invitation.url);
      setNotice("تم إنشاء حساب العميل ومساحة العمل. انسخ رابط الدعوة وشاركه مع العميل؛ الرابط صالح لمدة 24 ساعة ويُستخدم مرة واحدة.");
      setEmail(""); setWorkspaceName(""); setWorkspaceSlug("");
      await loadCustomers();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "حدث خطأ."); }
    finally { setBusy(false); }
  }

  async function submitType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/product-types", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: selectedWorkspace, name: typeName, skuPrefix }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "تعذر إنشاء نوع المنتج.");
      setTypeName(""); setSkuPrefix(""); setNotice("تم إنشاء نوع المنتج."); await loadTypes();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "حدث خطأ."); }
    finally { setBusy(false); }
  }

  async function submitBatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice(""); setIssuedCodes([]);
    try {
      const response = await fetch("/api/admin/batches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: selectedWorkspace, productTypeId, batchCode, quantity: Number(quantity), initialDestinationUrl: destination }) });
      const data = await response.json() as ProvisionResult & { error?: string };
      if (!response.ok) throw new Error(data.error || "تعذر تجهيز الدفعة.");
      setIssuedCodes(data.codes); setNotice(`تم تجهيز دفعة ${data.quantity} منتج بنجاح. بيانات التفعيل تظهر هنا مرة واحدة؛ احفظها في مكان آمن.`);
      setBatchCode("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "حدث خطأ."); }
    finally { setBusy(false); }
  }

  async function logout() {\n    await fetch("/api/auth/logout", { method: "POST" });\n    window.location.assign("/login");\n  }\n\n  function copy(value: string) {
    void navigator.clipboard.writeText(value).then(() => setNotice("تم النسخ."));
  }

  return (
    <main className="admin-shell" dir="rtl">
      <aside className="admin-sidebar">
        <a className="auth-brand" href="/"><span className="brand-symbol"><span /></span><b>RABTO</b></a>
        <p className="sidebar-label">إدارة المنصة</p>
        <a className="sidebar-link active" href="#overview">نظرة عامة</a>
        <a className="sidebar-link" href="#customers">العملاء ومساحات العمل</a>
        <a className="sidebar-link" href="#provisioning">تجهيز المنتجات</a>
        <div className="sidebar-bottom"><span className="status-dot" /> المنصة جاهزة للإدارة</div>
      </aside>
      <section className="admin-main">
        <header className="admin-header"><div><p className="eyebrow">RABTO / CONTROL CENTER</p><h1>إدارة المنصة</h1><p>إدارة العملاء وتجهيز المنتجات والأكواد من مكان واحد.</p></div><button className="admin-logout" type="button" onClick={logout}>تسجيل الخروج ↗</button></header>
        <section className="admin-stats" id="overview">
          <article><span>مساحات العمل</span><strong>{customers.length}</strong><small>مساحات العملاء المسجلة</small></article>
          <article><span>أنواع المنتجات</span><strong>{types.length}</strong><small>للعميل المحدد</small></article>
          <article><span>نطاق الأكواد</span><strong>NFC + QR</strong><small>قناتان مستقلتان لكل منتج</small></article>
        </section>
        {notice && <div className="admin-notice" role="status">{notice}</div>}
        {error && <div className="admin-error" role="alert">{error}</div>}
        {inviteUrl && <div className="secret-panel"><div><strong>رابط دعوة العميل</strong><p>انسخه وشاركه يدويًا. لن نعرضه مرة أخرى بعد مغادرة هذه الشاشة.</p></div><button type="button" onClick={() => copy(inviteUrl)}>نسخ رابط الدعوة</button><code>{inviteUrl}</code></div>}
        <div className="admin-grid" id="customers">
          <section className="admin-panel">
            <div className="panel-heading"><div><span className="panel-kicker">CUSTOMER ONBOARDING</span><h2>إضافة عميل جديد</h2></div><span className="panel-index">01</span></div>
            <form className="admin-form" onSubmit={submitCustomer}>
              <label>البريد الإلكتروني<input type="email" required maxLength={320} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@example.com" /></label>
              <label>اسم مساحة العمل<input required minLength={2} maxLength={120} value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} placeholder="اسم النشاط التجاري" /></label>
              <label>معرّف مساحة العمل<input required minLength={3} maxLength={80} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={workspaceSlug} onChange={(e) => setWorkspaceSlug(e.target.value)} placeholder="business-name" dir="ltr" /></label>
              <button className="admin-primary" disabled={busy}>إنشاء الحساب وإصدار دعوة <span>←</span></button>
            </form>
          </section>
          <section className="admin-panel">
            <div className="panel-heading"><div><span className="panel-kicker">CUSTOMER DIRECTORY</span><h2>العملاء الحاليون</h2></div><span className="panel-index">02</span></div>
            {loading ? <p className="empty-state">جارٍ تحميل العملاء...</p> : customers.length === 0 ? <p className="empty-state">لسه مفيش عملاء. أضف أول عميل للبدء.</p> : <div className="customer-list">{customers.map((customer) => <button type="button" className={selectedWorkspace === customer.workspaceId ? "customer-row selected" : "customer-row"} key={customer.workspaceId} onClick={() => setSelectedWorkspace(customer.workspaceId)}><span className="customer-avatar">{customer.workspaceName.slice(0,1)}</span><span className="customer-details"><strong>{customer.workspaceName}</strong><small>{customer.email} · {customer.workspaceSlug}</small></span><span className="row-arrow">←</span></button>)}</div>}
          </section>
        </div>
        <section className="admin-panel provisioning-panel" id="provisioning">
          <div className="panel-heading"><div><span className="panel-kicker">PRODUCT OPERATIONS</span><h2>تجهيز المنتجات والأكواد</h2><p>اختار مساحة عمل، عرّف نوع المنتج، وبعدها جهّز دفعة بأكواد QR وNFC مستقلة.</p></div><span className="panel-index">03</span></div>
          <div className="selected-customer"><label>مساحة العمل<select value={selectedWorkspace} onChange={(e) => setSelectedWorkspace(e.target.value)}><option value="">اختار عميل</option>{customers.map((c) => <option key={c.workspaceId} value={c.workspaceId}>{c.workspaceName}</option>)}</select></label><span>{customers.find((c) => c.workspaceId === selectedWorkspace)?.email || "لم يتم اختيار عميل"}</span></div>
          <div className="admin-grid nested-grid">
            <form className="admin-form" onSubmit={submitType}>
              <h3>نوع منتج جديد</h3>
              <label>اسم النوع<input required minLength={2} maxLength={120} value={typeName} onChange={(e) => setTypeName(e.target.value)} placeholder="مثال: ميدالية NFC" /></label>
              <label>بادئة SKU<input required minLength={2} maxLength={24} value={skuPrefix} onChange={(e) => setSkuPrefix(e.target.value.toUpperCase())} placeholder="TAG" dir="ltr" /></label>
              <button className="admin-secondary" disabled={busy || !selectedWorkspace}>إضافة نوع المنتج</button>
            </form>
            <form className="admin-form" onSubmit={submitBatch}>
              <h3>إنشاء دفعة</h3>
              <label>نوع المنتج<select required value={productTypeId} onChange={(e) => setProductTypeId(e.target.value)} disabled={!selectedWorkspace}><option value="">اختار النوع</option>{types.filter((t) => t.isActive).map((t) => <option key={t.id} value={t.id}>{t.name} ({t.skuPrefix})</option>)}</select></label>
              <label>كود الدفعة<input required minLength={2} maxLength={64} pattern="[A-Za-z0-9_-]+" value={batchCode} onChange={(e) => setBatchCode(e.target.value)} placeholder="BATCH-001" dir="ltr" /></label>
              <label>الكمية<input required type="number" min={1} max={5000} value={quantity} onChange={(e) => setQuantity(e.target.value)} /></label>
              <label>الوجهة الأولية<input required type="url" value={destination} onChange={(e) => setDestination(e.target.value)} dir="ltr" /></label>
              <button className="admin-primary" disabled={busy || !selectedWorkspace || !productTypeId}>تجهيز الدفعة وإصدار الأكواد <span>←</span></button>
            </form>
          </div>
          {issuedCodes.length > 0 && <div className="secret-panel codes-panel"><div><strong>بيانات الأكواد السرية — تُعرض مرة واحدة</strong><p>كل منتج له كود QR وكود NFC، مع سر تفعيل مستقل لكل قناة. لا تشارك أسرار التفعيل علنًا.</p></div><button type="button" onClick={() => copy(["productId,channel,publicCode,activationSecret", ...issuedCodes.map((c) => [c.productId,c.channel,c.publicCode,c.activationSecret].join(","))].join("\n"))}>نسخ CSV</button><div className="codes-table">{issuedCodes.map((code, index) => <div className="code-row" key={`${code.productId}-${code.channel}`}><span>{index + 1}</span><strong>{code.channel.toUpperCase()}</strong><code>{code.publicCode}</code><code>{code.activationSecret}</code></div>)}</div></div>}
        </section>
        <footer className="admin-footer">RABTO · Physical to Digital · لوحة الإدارة الداخلية</footer>
      </section>
    </main>
  );
}
