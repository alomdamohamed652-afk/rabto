import Link from "next/link";

const capabilities = [
  {
    number: "01",
    title: "رابط ثابت لكل قناة",
    description: "لكل منتج رابط NFC ورابط QR مستقلان. غيّر الوجهة وقت ما تحتاج من غير ما تغيّر الكود المطبوع.",
    tag: "NFC + QR"
  },
  {
    number: "02",
    title: "تجربة رقمية قابلة للتحديث",
    description: "قدّم صفحة رقمية مرتبطة بمنتجك، وحدّث محتواها من مكان واحد.",
    tag: "DIGITAL PAGE"
  },
  {
    number: "03",
    title: "إدارة أوضح لمنتجاتك",
    description: "تابع المنتجات والأكواد والوجهات والطلبات من مساحة عمل واحدة.",
    tag: "ONE WORKSPACE"
  }
];

const steps = [
  { number: "01", title: "جهّز منتجك", text: "يتم تخصيص أكواد NFC وQR مستقلة للمنتج." },
  { number: "02", title: "اربطه بوجهته", text: "حدد أين يصل كل كود، وعدّل الوجهة عند الحاجة." },
  { number: "03", title: "ابدأ الاتصال", text: "امسح الكود أو قرّب الهاتف لتصل إلى التجربة الرقمية." }
];

function BrandMark() {
  return <span className="brand-symbol" aria-hidden="true"><span /></span>;
}

export default function HomePage() {
  return (
    <main className="site-shell">
      <nav className="topbar" aria-label="التنقل الرئيسي">
        <Link className="brand" href="/" aria-label="RABTO الصفحة الرئيسية">
          <BrandMark />
          <span className="wordmark">RABTO</span>
        </Link>
        <div className="nav-links">
          <a href="#how">كيف يعمل</a>
          <a href="#features">المميزات</a>
          <a href="#connection">فكرة RABTO</a>
        </div>
        <a className="nav-action" href="mailto:hello@rabtolink.com">تواصل معنا <span aria-hidden="true">↗</span></a>
      </nav>

      <section className="hero" id="connection">
        <div className="hero-copy">
          <p className="eyebrow"><span className="status-dot" /> العالم المادي، متصل رقميًا</p>
          <h1>خلّي كل منتج<br />يفتح <em>عالمه الرقمي.</em></h1>
          <p className="hero-description">
            RABTO يربط منتجاتك بتجارب رقمية من خلال NFC وQR.
            أكواد ثابتة، وجهات قابلة للتحديث، وإدارة أبسط من مكان واحد.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="#how">اكتشف طريقة العمل <span aria-hidden="true">↙</span></a>
            <a className="text-action" href="#features">استكشف الإمكانيات <span aria-hidden="true">←</span></a>
          </div>
          <div className="hero-proof" aria-label="قنوات الربط المدعومة">
            <span>قناتان مستقلتان</span><i />
            <span>NFC</span><i />
            <span>QR</span>
          </div>
        </div>

        <div className="hero-visual" aria-label="تصور توضيحي لربط منتج بصفحته الرقمية">
          <div className="visual-grid" />
          <div className="visual-kicker">PHYSICAL <span>TO</span> DIGITAL</div>
          <div className="connection-line line-one" />
          <div className="connection-line line-two" />
          <div className="product-card">
            <div className="product-topline"><span>RABTO / OBJECT 001</span><span className="live-indicator">● CONNECTED</span></div>
            <div className="product-object"><BrandMark /></div>
            <div className="product-label"><strong>YOUR PRODUCT</strong><span>Tap or scan to connect</span></div>
          </div>
          <div className="signal signal-nfc"><span className="signal-icon">⌁</span><strong>NFC</strong><small>Tap</small></div>
          <div className="signal signal-qr"><span className="qr-pattern" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /></span><strong>QR</strong><small>Scan</small></div>
          <div className="digital-card">
            <div className="digital-header"><span className="mini-mark">R</span><span> DIGITAL EXPERIENCE</span><b>↗</b></div>
            <div className="digital-image"><div className="digital-orb" /></div>
            <div className="digital-copy"><span>CONNECTED PRODUCT</span><strong>More than an object.</strong><small>A digital story, one tap away.</small></div>
            <div className="digital-footer"><span>rabtolink.com</span><span className="footer-dot" /></div>
          </div>
          <div className="visual-caption">ONE PRODUCT. A CONNECTED EXPERIENCE.</div>
        </div>
      </section>

      <section className="intro-strip" aria-label="فكرة RABTO">
        <span className="strip-index">01 / THE CONNECTION</span>
        <p>الكود لا يتغير.<br /><strong>التجربة تقدر تتطور.</strong></p>
        <span className="strip-note">روابط مستقرة<br />ووجهات مرنة</span>
      </section>

      <section className="features section-block" id="features">
        <div className="section-heading">
          <p className="eyebrow">إمكانيات مترابطة</p>
          <h2>كل أدوات الاتصال،<br /><em>في مساحة واحدة.</em></h2>
          <p className="section-description">من الكود المادي إلى الوجهة الرقمية، خليك متحكم في التجربة من أولها لآخرها.</p>
        </div>
        <div className="feature-list">
          {capabilities.map((item) => (
            <article className="feature" key={item.number}>
              <span className="feature-number">{item.number}</span>
              <div className="feature-content">
                <span className="feature-tag">{item.tag}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
              <span className="feature-arrow" aria-hidden="true">↗</span>
            </article>
          ))}
        </div>
      </section>

      <section className="how-section section-block" id="how">
        <div className="how-heading">
          <p className="eyebrow">ببساطة، ثلاث خطوات</p>
          <h2>من منتجك<br /><em>إلى عالمه الرقمي.</em></h2>
        </div>
        <div className="steps">
          {steps.map((step, index) => (
            <article className="step" key={step.number}>
              <span className="step-number">{step.number}</span>
              <span className="step-connector" aria-hidden="true">{index < steps.length - 1 ? "⟵" : "↙"}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="closing-cta">
        <div className="cta-orbit cta-orbit-one" />
        <div className="cta-orbit cta-orbit-two" />
        <p className="eyebrow">LET&apos;s CONNECT</p>
        <h2>منتجك يستحق<br /><em>تجربة متصلة.</em></h2>
        <p>خلّينا نبدأ حوار عن الطريقة المناسبة لربط منتجاتك بالعالم الرقمي.</p>
        <a className="cta-button" href="mailto:hello@rabtolink.com">تواصل مع RABTO <span aria-hidden="true">↗</span></a>
      </section>

      <footer className="footer">
        <Link className="brand" href="/" aria-label="RABTO الصفحة الرئيسية"><BrandMark /><span className="wordmark">RABTO</span></Link>
        <p>اربط منتجك بتجربة تتطور معاه.</p>
        <small>© {new Date().getFullYear()} RABTO. جميع الحقوق محفوظة.</small>
      </footer>
    </main>
  );
}
