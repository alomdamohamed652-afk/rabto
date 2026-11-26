"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import LanguageSwitcher, { useLanguage } from "@/lib/i18n/language-switcher";
import { t } from "@/lib/i18n/messages";

type Customer = {
  userId: string; email: string; createdAt: string;
  workspaceId: string; workspaceName: string; workspaceSlug: string;
};
type ProductType = { id: string; name: string; skuPrefix: string; isActive: boolean };
type InvitationResult = { invitation: { url: string; expiresAt: string } };
type ProvisionResult = { batchId: string; quantity: number; codes: { productId: string; channel: "qr" | "nfc"; publicCode: string; activationSecret: string }[] };

export default function AdminConsole() {
  const router = useRouter();
  const lang = useLanguage();
  const langRef = useRef(lang);
  langRef.current = lang;
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersHasMore, setCustomersHasMore] = useState(false);
  const [customersLoadingMore, setCustomersLoadingMore] = useState(false);
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
    const response = await fetch("/api/admin/customers?limit=25&offset=0", { cache: "no-store" });
    const data = await response.json() as { customers?: Customer[]; hasMore?: boolean; error?: string };
    if (!response.ok) throw new Error(data.error || t(langRef.current, "loadCustomersError"));
    setCustomers(data.customers || []);
    setCustomersHasMore(Boolean(data.hasMore));
    if (data.customers?.[0]) setSelectedWorkspace((current) => current || data.customers![0].workspaceId);
  }, []);

  const loadMoreCustomers = useCallback(async () => {
    if (customersLoadingMore || !customersHasMore) return;
    setCustomersLoadingMore(true);
    try {
      const response = await fetch(`/api/admin/customers?limit=25&offset=${customers.length}`, { cache: "no-store" });
      const data = await response.json() as { customers?: Customer[]; hasMore?: boolean; error?: string };
      if (!response.ok) throw new Error(data.error || t(langRef.current, "loadMoreCustomersError"));
      setCustomers((current) => [...current, ...(data.customers || [])]);
      setCustomersHasMore(Boolean(data.hasMore));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t(langRef.current, "loadMoreCustomersError"));
    } finally {
      setCustomersLoadingMore(false);
    }
  }, [customers.length, customersHasMore, customersLoadingMore]);

  const loadTypes = useCallback(async () => {
    if (!selectedWorkspace) { setTypes([]); return; }
    const response = await fetch(`/api/admin/product-types?workspaceId=${encodeURIComponent(selectedWorkspace)}`, { cache: "no-store" });
    const data = await response.json() as { productTypes?: ProductType[]; error?: string };
    if (!response.ok) throw new Error(data.error || t(langRef.current, "loadProductTypesError"));
    setTypes(data.productTypes || []);
    setProductTypeId(data.productTypes?.[0]?.id || "");
  }, [selectedWorkspace]);

  useEffect(() => {
    let active = true;
    async function initializeCustomers() {
      await Promise.resolve();
      try {
        await loadCustomers();
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : t(langRef.current, "genericError"));
      } finally {
        if (active) setLoading(false);
      }
    }
    void initializeCustomers();
    return () => { active = false; };
  }, [loadCustomers]);

  useEffect(() => {
    let active = true;
    async function initializeTypes() {
      await Promise.resolve();
      try {
        await loadTypes();
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : t(langRef.current, "createProductTypeError"));
      }
    }
    void initializeTypes();
    return () => { active = false; };
  }, [loadTypes]);

  async function submitCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice(""); setInviteUrl("");
    try {
      const response = await fetch("/api/admin/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, workspaceName, workspaceSlug }) });
      const data = await response.json() as InvitationResult & { error?: string };
      if (!response.ok) throw new Error(data.error || t(langRef.current, "createCustomerError"));
      setInviteUrl(data.invitation.url);
      setNotice(t(langRef.current, "invitationCreated"));
      setEmail(""); setWorkspaceName(""); setWorkspaceSlug("");
      await loadCustomers();
    } catch (cause) { setError(cause instanceof Error ? cause.message : t(langRef.current, "genericError")); }
    finally { setBusy(false); }
  }

  async function submitType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/product-types", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: selectedWorkspace, name: typeName, skuPrefix }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || t(langRef.current, "createProductTypeError"));
      setTypeName(""); setSkuPrefix(""); setNotice(t(langRef.current, "productTypeCreated")); await loadTypes();
    } catch (cause) { setError(cause instanceof Error ? cause.message : t(langRef.current, "genericError")); }
    finally { setBusy(false); }
  }

  async function submitBatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice(""); setIssuedCodes([]);
    try {
      const response = await fetch("/api/admin/batches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: selectedWorkspace, productTypeId, batchCode, quantity: Number(quantity), initialDestinationUrl: destination }) });
      const data = await response.json() as ProvisionResult & { error?: string };
      if (!response.ok) throw new Error(data.error || t(langRef.current, "batchError"));
      setIssuedCodes(data.codes); setNotice(t(langRef.current, "batchCreated", { quantity: data.quantity }));
      setBatchCode("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : t(langRef.current, "genericError")); }
    finally { setBusy(false); }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  function copy(value: string) {
    void navigator.clipboard.writeText(value).then(() => setNotice(t(langRef.current, "copySuccess")));
  }

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand-row"><Link className="auth-brand" href="/"><span className="brand-symbol"><span /></span><b>RABTO</b></Link><LanguageSwitcher lang={lang} /></div>
        <p className="sidebar-label">{t(langRef.current, "platformManagement")}</p>
        <a className="sidebar-link active" href="#overview">{t(langRef.current, "overview")}</a>
        <a className="sidebar-link" href="#customers">{t(langRef.current, "customersWorkspaces")}</a>
        <a className="sidebar-link" href="#provisioning">{t(langRef.current, "productSetup")}</a>
        <div className="sidebar-bottom"><span className="status-dot" /> {t(langRef.current, "platformReady")}</div>
      </aside>
      <section className="admin-main">
        <header className="admin-header"><div><p className="eyebrow">{t(langRef.current, "controlCenter")}</p><h1>{t(langRef.current, "adminTitle")}</h1><p>{t(langRef.current, "adminDescription")}</p></div><button className="admin-logout" type="button" onClick={logout}>{t(langRef.current, "logout")} ↗</button></header>
        <section className="admin-stats" id="overview">
          <article><span>{t(langRef.current, "workspaces")}</span><strong>{customers.length}</strong><small>{t(langRef.current, "registeredWorkspaces")}</small></article>
          <article><span>{t(langRef.current, "productTypes")}</span><strong>{types.length}</strong><small>{t(langRef.current, "selectedCustomer")}</small></article>
          <article><span>{t(langRef.current, "codeChannels")}</span><strong>NFC + QR</strong><small>{t(langRef.current, "twoIndependentChannels")}</small></article>
        </section>
        {notice && <div className="admin-notice" role="status">{notice}</div>}
        {error && <div className="admin-error" role="alert">{error}</div>}
        {inviteUrl && <div className="secret-panel"><div><strong>{t(langRef.current, "customerInvitation")}</strong><p>{t(langRef.current, "invitationShare")}</p></div><button type="button" onClick={() => copy(inviteUrl)}>{t(langRef.current, "copyInvitation")}</button><code>{inviteUrl}</code></div>}
        <div className="admin-grid" id="customers">
          <section className="admin-panel">
            <div className="panel-heading"><div><span className="panel-kicker">{t(langRef.current, "customerOnboardingLabel")}</span><h2>{t(langRef.current, "addCustomer")}</h2></div><span className="panel-index">01</span></div>
            <form className="admin-form" onSubmit={submitCustomer}>
              <label>{t(langRef.current, "email")}<input type="email" required maxLength={320} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@example.com" /></label>
              <label>{t(langRef.current, "workspaceName")}<input required minLength={2} maxLength={120} value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} placeholder={t(langRef.current, "customerNamePlaceholder")} /></label>
              <label>{t(langRef.current, "workspaceSlug")}<input required minLength={3} maxLength={80} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={workspaceSlug} onChange={(e) => setWorkspaceSlug(e.target.value)} placeholder="business-name" dir="ltr" /></label>
              <button className="admin-primary" disabled={busy}>{t(langRef.current, "createAccountInvite")} <span>←</span></button>
            </form>
          </section>
          <section className="admin-panel">
            <div className="panel-heading"><div><span className="panel-kicker">{t(langRef.current, "customerDirectory")}</span><h2>{t(langRef.current, "currentCustomers")}</h2></div><span className="panel-index">02</span></div>
            {loading ? <p className="empty-state">{t(langRef.current, "loadingCustomers")}</p> : customers.length === 0 ? <p className="empty-state">{t(langRef.current, "noCustomers")}</p> : <div className="customer-list">{customers.map((customer) => <button type="button" className={selectedWorkspace === customer.workspaceId ? "customer-row selected" : "customer-row"} key={customer.workspaceId} onClick={() => setSelectedWorkspace(customer.workspaceId)}><span className="customer-avatar">{customer.workspaceName.slice(0,1)}</span><span className="customer-details"><strong>{customer.workspaceName}</strong><small>{customer.email} · {customer.workspaceSlug}</small></span><span className="row-arrow">←</span></button>)}</div>}
            {customersHasMore && <button type="button" className="list-more" onClick={() => void loadMoreCustomers()} disabled={customersLoadingMore}>{customersLoadingMore ? t(langRef.current, "loadingMore") : t(langRef.current, "showMoreCustomers")}</button>}
          </section>
        </div>
        <section className="admin-panel provisioning-panel" id="provisioning">
          <div className="panel-heading"><div><span className="panel-kicker">{t(langRef.current, "productOperations")}</span><h2>{t(langRef.current, "productOperationsLabel")}</h2><p>{t(langRef.current, "productOperationsDescription")}</p></div><span className="panel-index">03</span></div>
          <div className="selected-customer"><label>{t(langRef.current, "workspaceSection")}<select value={selectedWorkspace} onChange={(e) => setSelectedWorkspace(e.target.value)}><option value="">{t(langRef.current, "chooseCustomer")}</option>{customers.map((c) => <option key={c.workspaceId} value={c.workspaceId}>{c.workspaceName}</option>)}</select></label><span>{customers.find((c) => c.workspaceId === selectedWorkspace)?.email || t(langRef.current, "noCustomerSelected")}</span></div>
          <div className="admin-grid nested-grid">
            <form className="admin-form" onSubmit={submitType}>
              <h3>{t(langRef.current, "newProductType")}</h3>
              <label>{t(langRef.current, "typeName")}<input required minLength={2} maxLength={120} value={typeName} onChange={(e) => setTypeName(e.target.value)} placeholder={t(langRef.current, "skuExample")} /></label>
              <label>{t(langRef.current, "skuPrefix")}<input required minLength={2} maxLength={24} value={skuPrefix} onChange={(e) => setSkuPrefix(e.target.value.toUpperCase())} placeholder={t(langRef.current, "tagExample")} dir="ltr" /></label>
              <button className="admin-secondary" disabled={busy || !selectedWorkspace}>{t(langRef.current, "addProductType")}</button>
            </form>
            <form className="admin-form" onSubmit={submitBatch}>
              <h3>{t(langRef.current, "createBatch")}</h3>
              <label>{t(langRef.current, "productType")}<select required value={productTypeId} onChange={(e) => setProductTypeId(e.target.value)} disabled={!selectedWorkspace}><option value="">{t(langRef.current, "chooseType")}</option>{types.filter((t) => t.isActive).map((t) => <option key={t.id} value={t.id}>{t.name} ({t.skuPrefix})</option>)}</select></label>
              <label>{t(langRef.current, "batchCode")}<input required minLength={2} maxLength={64} pattern="[A-Za-z0-9_-]+" value={batchCode} onChange={(e) => setBatchCode(e.target.value)} placeholder="BATCH-001" dir="ltr" /></label>
              <label>{t(langRef.current, "quantity")}<input required type="number" min={1} max={5000} value={quantity} onChange={(e) => setQuantity(e.target.value)} /></label>
              <label>{t(langRef.current, "initialDestination")}<input required type="url" value={destination} onChange={(e) => setDestination(e.target.value)} dir="ltr" /></label>
              <button className="admin-primary" disabled={busy || !selectedWorkspace || !productTypeId}>{t(langRef.current, "createBatchCodes")} <span>←</span></button>
            </form>
          </div>
          {issuedCodes.length > 0 && <div className="secret-panel codes-panel"><div><strong>{t(langRef.current, "secretCodes")}</strong><p>{t(langRef.current, "secretCodesDescription")}</p></div><button type="button" onClick={() => copy(["productId,channel,publicCode,activationSecret", ...issuedCodes.map((c) => [c.productId,c.channel,c.publicCode,c.activationSecret].join(","))].join("\n"))}>{t(langRef.current, "copyCsv")}</button><div className="codes-table">{issuedCodes.map((code, index) => <div className="code-row" key={`${code.productId}-${code.channel}`}><span>{index + 1}</span><strong>{code.channel.toUpperCase()}</strong><code>{code.publicCode}</code><code>{code.activationSecret}</code></div>)}</div></div>}
        </section>
        <footer className="admin-footer">{t(langRef.current, "adminFooter")}</footer>
      </section>
    </main>
  );
}
