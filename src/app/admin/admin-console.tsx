"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import LanguageSwitcher, { useLanguage } from "@/lib/i18n/language-switcher";
import { t } from "@/lib/i18n/messages";
import CodeTools from "./code-tools";
import PlansPanel from "./plans-panel";
import type { PlanRow } from "./plans-panel";

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
  const [plansList, setPlansList] = useState<PlanRow[]>([]);
  const [newPlanId, setNewPlanId] = useState("");
  const loadPlans = useCallback(async () => { const r = await fetch("/api/admin/plans", { cache: "no-store" }); if (r.ok) setPlansList((await r.json()).plans); }, []);
  useEffect(() => { let live = true; fetch("/api/admin/plans", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((j) => { if (live && j) setPlansList(j.plans); }).catch(() => {}); return () => { live = false; }; }, []);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [typeName, setTypeName] = useState("");
  const [skuPrefix, setSkuPrefix] = useState("");
  const [productTypeId, setProductTypeId] = useState("");
  const [batchCode, setBatchCode] = useState("");
  const [quantity, setQuantity] = useState("10");
  const [destination, setDestination] = useState("https://example.com");

  const loadCustomers = useCallback(async () => {
    const response = await fetch("/api/admin/customers?limit=25&offset=0", { cache: "no-store" });
    const data = await response.json() as { customers?: Customer[]; hasMore?: boolean; error?: string };
    if (!response.ok) throw new Error(data.error || t(lang, "loadCustomersError"));
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
      if (!response.ok) throw new Error(data.error || t(lang, "loadMoreCustomersError"));
      setCustomers((current) => [...current, ...(data.customers || [])]);
      setCustomersHasMore(Boolean(data.hasMore));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t(lang, "loadMoreCustomersError"));
    } finally {
      setCustomersLoadingMore(false);
    }
  }, [customers.length, customersHasMore, customersLoadingMore]);

  const loadTypes = useCallback(async () => {
    if (!selectedWorkspace) { setTypes([]); return; }
    const response = await fetch(`/api/admin/product-types?workspaceId=${encodeURIComponent(selectedWorkspace)}`, { cache: "no-store" });
    const data = await response.json() as { productTypes?: ProductType[]; error?: string };
    if (!response.ok) throw new Error(data.error || t(lang, "loadProductTypesError"));
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
        if (active) setError(cause instanceof Error ? cause.message : t(lang, "genericError"));
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
        if (active) setError(cause instanceof Error ? cause.message : t(lang, "loadProductTypesError"));
      }
    }
    void initializeTypes();
    return () => { active = false; };
  }, [loadTypes]);

  async function submitCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice(""); setInviteUrl("");
    try {
      const response = await fetch("/api/admin/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, workspaceName, workspaceSlug, planId: newPlanId || undefined, phone: phone || undefined }) });
      const data = await response.json() as InvitationResult & { error?: string };
      if (!response.ok) throw new Error(data.error || t(lang, "createCustomerError"));
      setInviteUrl(data.invitation.url);
      setNotice(t(lang, "invitationCreated"));
      setEmail(""); setPhone(""); setWorkspaceName(""); setWorkspaceSlug("");
      await loadCustomers();
    } catch (cause) { setError(cause instanceof Error ? cause.message : t(lang, "genericError")); }
    finally { setBusy(false); }
  }

  async function submitType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/product-types", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: selectedWorkspace, name: typeName, skuPrefix }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || t(lang, "createProductTypeError"));
      setTypeName(""); setSkuPrefix(""); setNotice(t(lang, "productTypeCreated")); await loadTypes();
    } catch (cause) { setError(cause instanceof Error ? cause.message : t(lang, "genericError")); }
    finally { setBusy(false); }
  }

  async function submitBatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice(""); setIssuedCodes([]);
    try {
      const response = await fetch("/api/admin/batches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: selectedWorkspace, productTypeId, batchCode, quantity: Number(quantity), initialDestinationUrl: destination }) });
      const data = await response.json() as ProvisionResult & { error?: string };
      if (!response.ok) throw new Error(data.error || t(lang, "batchError"));
      setIssuedCodes(data.codes); setNotice(t(lang, "batchCreated", { quantity: data.quantity }));
      setBatchCode("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : t(lang, "genericError")); }
    finally { setBusy(false); }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  function copy(value: string) {
    void navigator.clipboard.writeText(value).then(() => setNotice(t(lang, "copySuccess")));
  }

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="auth-brand" href="/"><span className="brand-symbol"><span /></span><b>RABTO</b></Link>
        <p className="sidebar-label">{t(lang, "platformManagement")}</p>
        <a className="sidebar-link active" href="#overview">{t(lang, "overview")}</a>
        <a className="sidebar-link" href="#customers">{t(lang, "customersWorkspaces")}</a>
        <a className="sidebar-link" href="#provisioning">{t(lang, "productSetup")}</a>
        <div className="sidebar-bottom"><span className="status-dot" /> {t(lang, "platformReady")}</div>
      </aside>
      <section className="admin-main">
        <header className="admin-header"><div><p className="eyebrow">{t(lang, "controlCenter")}</p><h1>{t(lang, "adminTitle")}</h1><p>{t(lang, "adminDescription")}</p></div><div className="admin-header-actions"><LanguageSwitcher lang={lang} /><button className="admin-logout" type="button" onClick={logout}>{t(lang, "logout")} ↗</button></div></header>
        <section className="admin-stats" id="overview">
          <article><span>{t(lang, "workspaces")}</span><strong>{customers.length}</strong><small>{t(lang, "registeredWorkspaces")}</small></article>
          <article><span>{t(lang, "productTypes")}</span><strong>{types.length}</strong><small>{t(lang, "selectedCustomer")}</small></article>
          <article><span>{t(lang, "codeChannels")}</span><strong>NFC + QR</strong><small>{t(lang, "twoIndependentChannels")}</small></article>
        </section>
        {notice && <div className="admin-notice" role="status">{notice}</div>}
        {error && <div className="admin-error" role="alert">{error}</div>}
        {inviteUrl && <div className="secret-panel"><div><strong>{t(lang, "customerInvitation")}</strong><p>{t(lang, "invitationShare")}</p></div><button type="button" onClick={() => copy(inviteUrl)}>{t(lang, "copyInvitation")}</button><code>{inviteUrl}</code></div>}
        <div className="admin-grid" id="customers">
          <section className="admin-panel">
            <div className="panel-heading"><div><span className="panel-kicker">{t(lang, "customerOnboardingLabel")}</span><h2>{t(lang, "addCustomer")}</h2></div><span className="panel-index">01</span></div>
            <form className="admin-form" onSubmit={submitCustomer}>
              <label>{t(lang, "email")}<input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} required maxLength={320} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@example.com" /></label>
              <label>{t(lang, "phoneOptional")}<input type="tel" inputMode="tel" autoComplete="off" maxLength={40} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01012345678" dir="ltr" /></label>
              <label>{t(lang, "workspaceName")}<input required minLength={2} maxLength={120} value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} placeholder={t(lang, "customerNamePlaceholder")} /></label>
              <label>{t(lang, "workspaceSlug")}<input required minLength={3} maxLength={80} inputMode="text" autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={workspaceSlug} onChange={(e) => setWorkspaceSlug(e.target.value)} placeholder="business-name" dir="ltr" /></label>
              <label>{lang === "en" ? "Plan (optional)" : "الباقة (اختياري)"}<select value={newPlanId} onChange={(e) => setNewPlanId(e.target.value)}><option value="">{lang === "en" ? "No plan yet" : "بدون باقة حاليًا"}</option>{plansList.filter((p) => p.isActive).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
              <button className="admin-primary" disabled={busy}>{t(lang, "createAccountInvite")} <span>←</span></button>
            </form>
          </section>
          <section className="admin-panel">
            <div className="panel-heading"><div><span className="panel-kicker">{t(lang, "customerDirectory")}</span><h2>{t(lang, "currentCustomers")}</h2></div><span className="panel-index">02</span></div>
            {loading ? <p className="empty-state">{t(lang, "loadingCustomers")}</p> : customers.length === 0 ? <p className="empty-state">{t(lang, "noCustomers")}</p> : <div className="customer-list">{customers.map((customer) => <button type="button" className={selectedWorkspace === customer.workspaceId ? "customer-row selected" : "customer-row"} key={customer.workspaceId} onClick={() => setSelectedWorkspace(customer.workspaceId)}><span className="customer-avatar">{customer.workspaceName.slice(0,1)}</span><span className="customer-details"><strong>{customer.workspaceName}</strong><small>{customer.email} · {customer.workspaceSlug}</small></span><span className="row-arrow">←</span></button>)}</div>}
            {customersHasMore && <button type="button" className="list-more" onClick={() => void loadMoreCustomers()} disabled={customersLoadingMore}>{customersLoadingMore ? t(lang, "loadingMore") : t(lang, "showMoreCustomers")}</button>}
          </section>
        </div>
        <PlansPanel plans={plansList} customers={customers} lang={lang === "en" ? "en" : "ar"} onChanged={() => void loadPlans()} />
        <section className="admin-panel provisioning-panel" id="provisioning">
          <div className="panel-heading"><div><span className="panel-kicker">{t(lang, "productOperations")}</span><h2>{t(lang, "productOperationsLabel")}</h2><p>{t(lang, "productOperationsDescription")}</p></div><span className="panel-index">03</span></div>
          <div className="selected-customer"><label>{t(lang, "workspaceSection")}<select value={selectedWorkspace} onChange={(e) => setSelectedWorkspace(e.target.value)}><option value="">{t(lang, "chooseCustomer")}</option>{customers.map((c) => <option key={c.workspaceId} value={c.workspaceId}>{c.workspaceName}</option>)}</select></label><span>{customers.find((c) => c.workspaceId === selectedWorkspace)?.email || t(lang, "noCustomerSelected")}</span></div>
          <div className="admin-grid nested-grid">
            <form className="admin-form" onSubmit={submitType}>
              <h3>{t(lang, "newProductType")}</h3>
              <label>{t(lang, "typeName")}<input required minLength={2} maxLength={120} value={typeName} onChange={(e) => setTypeName(e.target.value)} placeholder={t(lang, "skuExample")} /></label>
              <label>{t(lang, "skuPrefix")}<input required minLength={2} maxLength={24} inputMode="text" autoCapitalize="characters" autoCorrect="off" autoComplete="off" spellCheck={false} value={skuPrefix} onChange={(e) => setSkuPrefix(e.target.value.toUpperCase())} placeholder={t(lang, "tagExample")} dir="ltr" /></label>
              <button className="admin-secondary" disabled={busy || !selectedWorkspace}>{t(lang, "addProductType")}</button>
            </form>
            <form className="admin-form" onSubmit={submitBatch}>
              <h3>{t(lang, "createBatch")}</h3>
              <label>{t(lang, "productType")}<select required value={productTypeId} onChange={(e) => setProductTypeId(e.target.value)} disabled={!selectedWorkspace}><option value="">{t(lang, "chooseType")}</option>{types.filter((t) => t.isActive).map((t) => <option key={t.id} value={t.id}>{t.name} ({t.skuPrefix})</option>)}</select></label>
              <label>{t(lang, "batchCode")}<input required minLength={2} maxLength={64} inputMode="text" autoCapitalize="characters" autoCorrect="off" autoComplete="off" spellCheck={false} pattern="[A-Za-z0-9_\-]+" value={batchCode} onChange={(e) => setBatchCode(e.target.value)} placeholder="BATCH-001" dir="ltr" /></label>
              <label>{t(lang, "quantity")}<input required type="number" inputMode="numeric" autoComplete="off" min={1} max={5000} value={quantity} onChange={(e) => setQuantity(e.target.value)} /></label>
              <label>{t(lang, "initialDestination")}<input required type="url" inputMode="url" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={destination} onChange={(e) => setDestination(e.target.value)} dir="ltr" /></label>
              <button className="admin-primary" disabled={busy || !selectedWorkspace || !productTypeId}>{t(lang, "createBatchCodes")} <span>←</span></button>
            </form>
          </div>
          {issuedCodes.length > 0 && <div className="secret-panel codes-panel"><div><strong>{t(lang, "secretCodes")}</strong><p>{t(lang, "secretCodesDescription")}</p></div><button type="button" onClick={() => copy(["productId,channel,publicCode,activationSecret", ...issuedCodes.map((c) => [c.productId,c.channel,c.publicCode,c.activationSecret].join(","))].join("\n"))}>{t(lang, "copyCsv")}</button><div className="codes-table">{issuedCodes.map((code, index) => <div className="code-row" key={`${code.productId}-${code.channel}`}><span>{index + 1}</span><strong>{code.channel.toUpperCase()}</strong><code>{code.publicCode}</code><code>{code.activationSecret}</code></div>)}</div></div>}
          <CodeTools codes={issuedCodes} lang={lang === "en" ? "en" : "ar"} />
        </section>
        <footer className="admin-footer">{t(lang, "adminFooter")}</footer>
      </section>
    </main>
  );
}
