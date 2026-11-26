"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import MenuEditor from "./menu-editor";
import InsightsPanel from "./insights-panel";
import PlanPanel from "./plan-panel";
import SupportPanel from "./support-panel";
import EmailVerifyPanel from "./email-verify-panel";
import LanguageSwitcher, { useLanguage } from "@/lib/i18n/language-switcher";
import { t, type MessageKey } from "@/lib/i18n/messages";

type Workspace = { workspaceId: string; workspaceName: string; workspaceSlug: string; role: "owner" | "admin" | "member" };
type ProductCode = {
  channel: "nfc" | "qr"; publicCode: string;
  activatedAt: string | null; creditBalance: number | null;
};
type Product = {
  productId: string; sku: string; serialNumber: string; status: string;
  productionStage: string | null; productTypeName: string; codes: ProductCode[];
};

const PRODUCT_STATUS_KEYS: Record<string, MessageKey> = {
  draft: "statusDraft",
  produced: "statusProduced",
  claimed: "statusClaimed",
  archived: "statusArchived",
};
const WORKSPACE_ROLE_KEYS: Record<Workspace["role"], MessageKey> = {
  owner: "roleOwner",
  admin: "roleAdmin",
  member: "roleMember",
};
const PRODUCT_PAGE_SIZE = 24;
const resolverBaseUrl = (() => {
  let value = process.env.NEXT_PUBLIC_RESOLVER_BASE_URL?.trim() || "";
  while (value.endsWith("/")) value = value.slice(0, -1);
  return value;
})();

function productResolverUrl(publicCode: string) {
  if (!resolverBaseUrl) return `/d/${encodeURIComponent(publicCode)}`;
  if (/^https?:\/\//i.test(resolverBaseUrl)) return `${resolverBaseUrl}/d/${encodeURIComponent(publicCode)}`;
  if (resolverBaseUrl.startsWith("/") && !resolverBaseUrl.startsWith("//")) return `${resolverBaseUrl}/${encodeURIComponent(publicCode)}`;
  return `/d/${encodeURIComponent(publicCode)}`;
}

export default function CustomerConsole({ email, workspaces }: { email: string; workspaces: Workspace[] }) {
  const router = useRouter();
  const lang = useLanguage();
  const langRef = useRef(lang);
  useEffect(() => { langRef.current = lang; }, [lang]);
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.workspaceId || "");
  const [products, setProducts] = useState<Product[]>([]);
  const [hasMoreProducts, setHasMoreProducts] = useState(false);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadProducts() {
      await Promise.resolve();
      if (!workspaceId) { if (active) { setProducts([]); setHasMoreProducts(false); } return; }
      if (active) { setLoading(true); setError(""); setProducts([]); setHasMoreProducts(false); setLoadingMoreProducts(false); }
      try {
        const response = await fetch(`/api/customer/products?workspaceId=${encodeURIComponent(workspaceId)}&limit=${PRODUCT_PAGE_SIZE}&offset=0`, { cache: "no-store" });
        const data = await response.json() as { products?: Product[]; hasMore?: boolean; error?: string };
        if (!response.ok) throw new Error(data.error || t(langRef.current, "loadProductsError"));
        if (active) { setProducts(data.products || []); setHasMoreProducts(Boolean(data.hasMore)); }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : t(langRef.current, "genericError"));
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadProducts();
    return () => { active = false; };
  }, [workspaceId]);

  async function loadMoreProducts() {
    if (!workspaceId || loadingMoreProducts || !hasMoreProducts) return;
    setLoadingMoreProducts(true);
    try {
      const response = await fetch(`/api/customer/products?workspaceId=${encodeURIComponent(workspaceId)}&limit=${PRODUCT_PAGE_SIZE}&offset=${products.length}`, { cache: "no-store" });
      const data = await response.json() as { products?: Product[]; hasMore?: boolean; error?: string };
      if (!response.ok) throw new Error(data.error || t(langRef.current, "loadMoreProductsError"));
      setProducts((current) => [...current, ...(data.products || [])]);
      setHasMoreProducts(Boolean(data.hasMore));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t(lang, "loadMoreProductsError"));
    } finally {
      setLoadingMoreProducts(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return <main className="admin-shell customer-shell">
    <aside className="admin-sidebar">
      <Link className="auth-brand" href="/"><span className="brand-symbol"><span /></span><b>RABTO</b></Link>
      <p className="sidebar-label">{t(lang, "workspace")}</p>
      <a className="sidebar-link active" href="#products">{t(lang, "myProducts")}</a>
      <a className="sidebar-link" href="#menus">{lang === "ar" ? "المنيو والصفحات" : "Menus and pages"}</a>
      <a className="sidebar-link" href="#insights">{lang === "ar" ? "التحليلات" : "Analytics"}</a>
      <a className="sidebar-link" href="#workspace">{t(lang, "workspaceSection")}</a>
      <div className="sidebar-bottom">{t(lang, "secureWorkspace")}</div>
    </aside>
    <section className="admin-main">
      <header className="admin-header"><div><p className="eyebrow">{t(lang, "yourConnectedProducts")}</p><h1>{t(lang, "yourWorkspace")}</h1><p>{email}</p></div><div className="admin-header-actions"><LanguageSwitcher lang={lang} /><button className="admin-logout" onClick={logout}>{t(lang, "logout")} ↗</button></div></header>
      {workspaces.length === 0 ? <section className="admin-panel"><h2>{t(lang, "noWorkspace")}</h2><p className="auth-subtitle">{t(lang, "contactAdmin")}</p></section> : <>
        <section className="admin-panel workspace-panel" id="workspace">
          <label>{t(lang, "workspaceSection")}<select value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)}>{workspaces.map((workspace) => <option key={workspace.workspaceId} value={workspace.workspaceId}>{workspace.workspaceName}</option>)}</select></label>
          <span className="workspace-role">{(() => { const role = workspaces.find((w) => w.workspaceId === workspaceId)?.role; return role ? t(lang, WORKSPACE_ROLE_KEYS[role]) : ""; })()}</span>
        </section>
        <MenuEditor key={workspaceId} workspaceId={workspaceId} workspaceSlug={workspaces.find((w) => w.workspaceId === workspaceId)?.workspaceSlug || ""} lang={lang === "en" ? "en" : "ar"} />
        <PlanPanel key={"p-" + workspaceId} workspaceId={workspaceId} lang={lang === "en" ? "en" : "ar"} />
        <EmailVerifyPanel lang={lang === "en" ? "en" : "ar"} />
        <SupportPanel key={"s-" + workspaceId} mode="customer" workspaceId={workspaceId} lang={lang === "en" ? "en" : "ar"} />
        <InsightsPanel key={"i-" + workspaceId} workspaceId={workspaceId} lang={lang === "en" ? "en" : "ar"} />
        <section className="admin-panel customer-products" id="products">
          <div className="panel-heading"><div><span className="panel-kicker">{t(lang, "yourProducts")}</span><h2>{t(lang, "productsAndCodes")}</h2><p>{t(lang, "productsDescription")}</p></div><strong className="products-count">{products.length}</strong></div>
          {loading ? <p className="empty-state">{t(lang, "loadingProducts")}</p> : error ? <p className="admin-error">{error}</p> : products.length === 0 ? <p className="empty-state">{t(lang, "noProducts")}</p> : <div className="customer-product-list">{products.map((product) => {
            return <article className="customer-product" key={product.productId}>
              <div className="product-summary"><span className="customer-avatar">R</span><div><strong>{product.productTypeName}</strong><small>{product.sku} · {product.serialNumber.slice(0,8)}</small></div><span className={product.status === "claimed" ? "product-status claimed" : "product-status"}>{t(lang, PRODUCT_STATUS_KEYS[product.status] || "statusUnknown")}</span></div>
              <div className="channel-list">{product.codes.map((channel) => <div className="channel-row" key={channel.channel}><strong>{channel.channel.toUpperCase()}</strong><code>{productResolverUrl(channel.publicCode)}</code><span>{channel.activatedAt ? t(lang, "activated") : t(lang, "awaitingActivation")}</span><small>{channel.creditBalance ?? 0} {t(lang, "balance")}</small></div>)}</div>
            </article>;
          })}</div>}
          {hasMoreProducts && <button type="button" className="list-more" onClick={() => void loadMoreProducts()} disabled={loadingMoreProducts}>{loadingMoreProducts ? t(lang, "loadingMore") : t(lang, "showMoreProducts")}</button>}
        </section>
      </>}
      <footer className="admin-footer">{t(lang, "customerFooter")}</footer>
    </section>
  </main>;
}
