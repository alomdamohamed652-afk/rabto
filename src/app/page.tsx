import Link from "next/link";
import { cookies } from "next/headers";
import LanguageSwitcher from "@/lib/i18n/language-switcher";
import { getLang, t } from "@/lib/i18n/messages";

function BrandMark() {
  return <span className="brand-symbol" aria-hidden="true"><span /></span>;
}

export default async function HomePage() {
  const cookieStore = await cookies();
  const lang = getLang(cookieStore.get("rabto_lang")?.value);
  const capabilities = [
    { number: "01", title: t(lang, "feature1Title"), description: t(lang, "feature1Description"), tag: "NFC + QR" },
    { number: "02", title: t(lang, "feature2Title"), description: t(lang, "feature2Description"), tag: "DIGITAL PAGE" },
    { number: "03", title: t(lang, "feature3Title"), description: t(lang, "feature3Description"), tag: "ONE WORKSPACE" }
  ];
  const steps = [
    { number: "01", title: t(lang, "step1Title"), text: t(lang, "step1Text") },
    { number: "02", title: t(lang, "step2Title"), text: t(lang, "step2Text") },
    { number: "03", title: t(lang, "step3Title"), text: t(lang, "step3Text") }
  ];

  return (
    <main className="site-shell">
      <nav className="topbar" aria-label={t(lang, "home")}>
        <Link className="brand" href="/" aria-label={`RABTO — ${t(lang, "home")}`}>
          <BrandMark /><span className="wordmark">RABTO</span>
        </Link>
        <div className="nav-links">
          <a href="#how">{t(lang, "navHow")}</a>
          <a href="#features">{t(lang, "navFeatures")}</a>
          <a href="#connection">{t(lang, "navConnection")}</a>
        </div>
        <div className="nav-actions">
          <LanguageSwitcher lang={lang} />
          <a className="nav-action" href="mailto:hello@rabtolink.com">{t(lang, "contactUs")} <span aria-hidden="true">↗</span></a>
        </div>
      </nav>

      <section className="hero" id="connection">
        <div className="hero-copy">
          <p className="eyebrow"><span className="status-dot" /> {t(lang, "physicalDigital")}</p>
          <h1>{t(lang, "heroTitle")}<br /><em>{t(lang, "heroTitleAccent")}</em></h1>
          <p className="hero-description">{t(lang, "heroDescription")}</p>
          <div className="hero-actions">
            <a className="primary-action" href="#how">{t(lang, "discoverHow")} <span aria-hidden="true">↙</span></a>
            <a className="text-action" href="#features">{t(lang, "exploreFeatures")} <span aria-hidden="true">←</span></a>
          </div>
          <div className="hero-proof" aria-label={t(lang, "supportedChannels")}>
            <span>{t(lang, "twoChannels")}</span><i /><span>NFC</span><i /><span>QR</span>
          </div>
        </div>

        <div className="hero-visual" aria-label={t(lang, "oneProduct")}>
          <div className="visual-grid" />
          <div className="visual-kicker">{t(lang, "physicalToDigital")}</div>
          <div className="connection-line line-one" />
          <div className="connection-line line-two" />
          <div className="product-card">
            <div className="product-topline"><span>RABTO / OBJECT 001</span><span className="live-indicator">● {t(lang, "connected")}</span></div>
            <div className="product-object"><BrandMark /></div>
            <div className="product-label"><strong>{t(lang, "yourProduct")}</strong><span>{t(lang, "tapOrScan")}</span></div>
          </div>
          <div className="signal signal-nfc"><span className="signal-icon">⌁</span><strong>NFC</strong><small>Tap</small></div>
          <div className="signal signal-qr"><span className="qr-pattern" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /></span><strong>QR</strong><small>Scan</small></div>
          <div className="digital-card">
            <div className="digital-header"><span className="mini-mark">R</span><span>{t(lang, "digitalExperience")}</span><b>↗</b></div>
            <div className="digital-image"><div className="digital-orb" /></div>
            <div className="digital-copy"><span>{t(lang, "connectedProduct")}</span><strong>{t(lang, "moreThanObject")}</strong><small>{t(lang, "digitalStory")}</small></div>
            <div className="digital-footer"><span>rabtolink.com</span><span className="footer-dot" /></div>
          </div>
          <div className="visual-caption">{t(lang, "oneProduct")}</div>
        </div>
      </section>

      <section className="intro-strip" aria-label={t(lang, "connection")}>
        <span className="strip-index">01 / {t(lang, "connection")}</span>
        <p>{t(lang, "codeNeverChanges")}<br /><strong>{t(lang, "experienceEvolves")}</strong></p>
        <span className="strip-note">{t(lang, "stableLinks")}<br />{t(lang, "flexibleDestinations")}</span>
      </section>

      <section className="features section-block" id="features">
        <div className="section-heading">
          <p className="eyebrow">{t(lang, "connectedCapabilities")}</p>
          <h2>{t(lang, "allTools")}<br /><em>{t(lang, "oneWorkspace")}</em></h2>
          <p className="section-description">{t(lang, "featureDescription")}</p>
        </div>
        <div className="feature-list">
          {capabilities.map((item) => (
            <article className="feature" key={item.number}>
              <span className="feature-number">{item.number}</span>
              <div className="feature-content"><span className="feature-tag">{item.tag}</span><h3>{item.title}</h3><p>{item.description}</p></div>
              <span className="feature-arrow" aria-hidden="true">↗</span>
            </article>
          ))}
        </div>
      </section>

      <section className="how-section section-block" id="how">
        <div className="how-heading">
          <p className="eyebrow">{t(lang, "howSimple")}</p>
          <h2>{t(lang, "fromProduct")}<br /><em>{t(lang, "toDigital")}</em></h2>
        </div>
        <div className="steps">
          {steps.map((step, index) => (
            <article className="step" key={step.number}>
              <span className="step-number">{step.number}</span>
              <span className="step-connector" aria-hidden="true">{index < steps.length - 1 ? "⟵" : "↙"}</span>
              <h3>{step.title}</h3><p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="closing-cta">
        <div className="cta-orbit cta-orbit-one" /><div className="cta-orbit cta-orbit-two" />
        <p className="eyebrow">{t(lang, "letsConnect")}</p>
        <h2>{t(lang, "productDeserves")}<br /><em>{t(lang, "connectedExperience")}</em></h2>
        <p>{t(lang, "closingDescription")}</p>
        <a className="cta-button" href="mailto:hello@rabtolink.com">{t(lang, "contactRabto")} <span aria-hidden="true">↗</span></a>
      </section>

      <footer className="footer">
        <Link className="brand" href="/" aria-label={`RABTO — ${t(lang, "home")}`}><BrandMark /><span className="wordmark">RABTO</span></Link>
        <p>{t(lang, "footerTagline")}</p>
        <small>© {new Date().getFullYear()} RABTO. {t(lang, "allRights")}</small>
      </footer>
    </main>
  );
}
