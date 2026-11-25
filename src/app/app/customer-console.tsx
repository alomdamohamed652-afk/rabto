"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Workspace = { workspaceId: string; workspaceName: string; workspaceSlug: string; role: "owner" | "admin" | "member" };
type ProductCode = {
  channel: "nfc" | "qr"; publicCode: string;
  activatedAt: string | null; creditBalance: number | null;
};
type Product = {
  productId: string; sku: string; serialNumber: string; status: string;
  productionStage: string | null; productTypeName: string; codes: ProductCode[];
};

export default function CustomerConsole({ email, workspaces }: { email: string; workspaces: Workspace[] }) {
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.workspaceId || "");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadProducts() {
      await Promise.resolve();
      if (!workspaceId) { if (active) setProducts([]); return; }
      if (active) { setLoading(true); setError(""); }
      try {
        const response = await fetch(`/api/customer/products?workspaceId=${encodeURIComponent(workspaceId)}`, { cache: "no-store" });
        const data = await response.json() as { products?: Product[]; error?: string };
        if (!response.ok) throw new Error(data.error || "تعذر تحميل المنتجات.");
        if (active) setProducts(data.products || []);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "حدث خطأ.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadProducts();
    return () => { active = false; };
  }, [workspaceId]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return <main className="admin-shell customer-shell" dir="rtl">
    <aside className="admin-sidebar">
      <Link className="auth-brand" href="/"><span className="brand-symbol"><span /></span><b>RABTO</b></Link>
      <p className="sidebar-label">مساحة العميل</p>
      <a className="sidebar-link active" href="#products">منتجاتي</a>
      <a className="sidebar-link" href="#workspace">مساحة العمل</a>
      <div className="sidebar-bottom">مساحة عمل آمنة ومخصصة لحسابك</div>
    </aside>
    <section className="admin-main">
      <header className="admin-header"><div><p className="eyebrow">YOUR CONNECTED PRODUCTS</p><h1>مساحة عملك</h1><p>{email}</p></div><button className="admin-logout" onClick={logout}>تسجيل الخروج ↗</button></header>
      {workspaces.length === 0 ? <section className="admin-panel"><h2>لسه مفيش مساحة عمل مرتبطة بحسابك</h2><p className="auth-subtitle">تواصل مع إدارة RABTO لمساعدتك في الوصول لمساحة العمل.</p></section> : <>
        <section className="admin-panel workspace-panel" id="workspace">
          <label>مساحة العمل<select value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)}>{workspaces.map((workspace) => <option key={workspace.workspaceId} value={workspace.workspaceId}>{workspace.workspaceName}</option>)}</select></label>
          <span className="workspace-role">{workspaces.find((w) => w.workspaceId === workspaceId)?.role}</span>
        </section>
        <section className="admin-panel customer-products" id="products">
          <div className="panel-heading"><div><span className="panel-kicker">YOUR PRODUCTS</span><h2>المنتجات والأكواد</h2><p>تابع حالة كل منتج وروابط NFC وQR الخاصة به.</p></div><strong className="products-count">{products.length}</strong></div>
          {loading ? <p className="empty-state">جارٍ تحميل المنتجات...</p> : error ? <p className="admin-error">{error}</p> : products.length === 0 ? <p className="empty-state">لا توجد منتجات في مساحة العمل دي حتى الآن.</p> : <div className="customer-product-list">{products.map((product) => {
            return <article className="customer-product" key={product.productId}>
              <div className="product-summary"><span className="customer-avatar">R</span><div><strong>{product.productTypeName}</strong><small>{product.sku} · {product.serialNumber.slice(0,8)}</small></div><span className={product.status === "claimed" ? "product-status claimed" : "product-status"}>{product.status}</span></div>
              <div className="channel-list">{product.codes.map((channel) => <div className="channel-row" key={channel.channel}><strong>{channel.channel.toUpperCase()}</strong><code>rabtolink.com/d/{channel.publicCode}</code><span>{channel.activatedAt ? "مفعّل" : "بانتظار التفعيل"}</span><small>{channel.creditBalance ?? 0} رصيد</small></div>)}</div>
            </article>;
          })}</div>}
        </section>
      </>}
      <footer className="admin-footer">RABTO · Your products, connected.</footer>
    </section>
  </main>;
}
