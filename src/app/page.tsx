const capabilities = [
  { number: "01", title: "روابط ذكية ثابتة", description: "رابط مستقل لكل قناة NFC وQR، مع إمكانية تغيير الوجهة من لوحة التحكم." },
  { number: "02", title: "صفحات رقمية", description: "حوّل كل منتج إلى تجربة رقمية قابلة للتحديث من مكان واحد." },
  { number: "03", title: "إدارة مركزية", description: "تابع المنتجات والأكواد والطلبات والأرصدة من لوحة واحدة." }
];

export default function HomePage() {
  return (
    <main className="site-shell">
      <nav className="topbar" aria-label="التنقل الرئيسي">
        <a className="wordmark" href="/" aria-label="RABTO الصفحة الرئيسية">RABTO<span>.</span></a>
        <div className="nav-links">
          <a href="#how">كيف يعمل</a>
          <a href="#features">المميزات</a>
        </div>
        <a className="nav-action" href="mailto:hello@rabtolink.com">تواصل معنا</a>
      </nav>

      <section className="hero" id="how">
        <div className="hero-copy">
          <p className="eyebrow"><span /> العالم المادي، متصل رقميًا</p>
          <h1>كل منتج له<br /><em>حكاية رقمية.</em></h1>
          <p className="hero-description">
            RABTO يربط منتجاتك بالعالم الرقمي من خلال NFC وQR.
            أنشئ تجربة متصلة، وتحكّم في روابطك وصفحاتك من مكان واحد.
          </p>
          <a className="primary-action" href="#features">اكتشف RABTO <span aria-hidden="true">↙</span></a>
        </div>
        <div className="hero-art" aria-label="تصور تجريدي لربط المنتج بالعالم الرقمي">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="core"><span>R</span></div>
          <div className="node node-top">NFC</div>
          <div className="node node-side">QR</div>
          <div className="node node-bottom">WEB</div>
          <div className="art-caption">ONE PRODUCT. MANY CONNECTIONS.</div>
        </div>
      </section>

      <section className="features" id="features">
        <div className="section-heading">
          <p className="eyebrow">من المنتج إلى التجربة</p>
          <h2>اتصال أبسط.<br /><em>إمكانيات أوسع.</em></h2>
        </div>
        <div className="feature-list">
          {capabilities.map((item) => (
            <article className="feature" key={item.number}>
              <span className="feature-number">{item.number}</span>
              <div><h3>{item.title}</h3><p>{item.description}</p></div>
              <span className="feature-arrow" aria-hidden="true">↗</span>
            </article>
          ))}
        </div>
      </section>

      <footer className="footer">
        <a className="wordmark" href="/">RABTO<span>.</span></a>
        <p>اربط منتجك بتجربة تتطور معاه.</p>
        <small>© {new Date().getFullYear()} RABTO</small>
      </footer>
    </main>
  );
}