import Link from "next/link";
import LanguageSwitcher from "@/lib/i18n/language-switcher";
import { landingCopy, type LandingLang } from "./landing-copy";
import RevealRoot from "./reveal-root";
import DestinationDemo from "./destination-demo";
import "./landing.css";

function Arrow() { return <span className="lp-arrow" aria-hidden="true">→</span>; }

export default function Landing({ lang }: { lang: LandingLang }) {
  const c = landingCopy[lang];
  return (
    <RevealRoot>
      <a className="lp-skip" href="#lp-main">{c.nav.skip}</a>
      <header className="lp-nav">
        <Link href="/" className="lp-brand" aria-label="RABTO"><span className="lp-wordmark">RABTO</span></Link>
        <nav className="lp-links" aria-label="RABTO">
          <a href="#how">{c.nav.how}</a>
          <a href="#uses">{c.nav.uses}</a>
          <a href="#platform">{c.nav.platform}</a>
        </nav>
        <div className="lp-nav-end">
          <LanguageSwitcher lang={lang} />
          <Link className="lp-btn lp-btn-ghost" href="/login">{c.nav.login}</Link>
        </div>
      </header>

      <main id="lp-main">
        <section className="lp-hero">
          <div className="lp-hero-copy">
            <p className="lp-eyebrow"><span className="lp-dot" />{c.hero.eyebrow}</p>
            <h1>{c.hero.title}<br /><em>{c.hero.accent}</em></h1>
            <p className="lp-lead">{c.hero.body}</p>
            <div className="lp-actions">
              <a className="lp-btn lp-btn-solid" href="#how">{c.hero.primary}<Arrow /></a>
              <a className="lp-btn lp-btn-text" href="#uses">{c.hero.secondary}</a>
            </div>
            <ul className="lp-chips" aria-hidden="true">{c.hero.chips.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>

          <div className="lp-scene" role="img" aria-label={`${c.scene.code} → ${c.scene.page}`}>
            <div className="lp-scene-grid" />
            <div className="lp-obj">
              <span className="lp-obj-tag">{c.scene.code}</span>
              <span className="lp-obj-mark" aria-hidden="true"><i /></span>
              <span className="lp-obj-sub" dir="ltr">rabto / a7k2m9</span>
            </div>
            <div className="lp-sig lp-sig-nfc"><span className="lp-wave" aria-hidden="true"><i /><i /><i /></span><b>NFC</b><small>{c.scene.tap}</small></div>
            <div className="lp-sig lp-sig-qr"><span className="lp-qr" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <i key={i} />)}</span><b>QR</b><small>{c.scene.scan}</small></div>
            <div className="lp-link" aria-hidden="true"><i /></div>
            <div className="lp-page">
              <span className="lp-page-bar"><b>R</b><span>{c.scene.page}</span></span>
              <span className="lp-page-img"><i /></span>
              <span className="lp-page-line w80" /><span className="lp-page-line w55" />
              <span className="lp-page-btn" />
            </div>
            <p className="lp-scene-cap">{c.scene.caption}</p>
          </div>
        </section>

        <section className="lp-section" id="uses">
          <div className="lp-head" data-reveal>
            <p className="lp-eyebrow">{c.uses.eyebrow}</p>
            <h2>{c.uses.title}<br /><em>{c.uses.accent}</em></h2>
          </div>
          <div className="lp-grid4">
            {c.uses.items.map((it, i) => (
              <article className="lp-card" key={it.k} data-reveal style={{ ["--d" as string]: `${i * 70}ms` }}>
                <span className="lp-num">{it.k}</span>
                <h3>{it.t}</h3>
                <p>{it.d}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="lp-section lp-demo-section" id="demo">
          <div className="lp-head" data-reveal>
            <p className="lp-eyebrow">{c.demo.eyebrow}</p>
            <h2>{c.demo.title}<br /><em>{c.demo.accent}</em></h2>
            <p className="lp-sub">{c.demo.body}</p>
          </div>
          <div data-reveal><DestinationDemo lang={lang} /></div>
        </section>

        <section className="lp-section" id="how">
          <div className="lp-head" data-reveal>
            <p className="lp-eyebrow">{c.how.eyebrow}</p>
            <h2>{c.how.title}<br /><em>{c.how.accent}</em></h2>
          </div>
          <ol className="lp-steps">
            {c.how.steps.map((s, i) => (
              <li className="lp-step" key={s.t} data-reveal style={{ ["--d" as string]: `${i * 90}ms` }}>
                <span className="lp-step-n">0{i + 1}</span>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="lp-section" id="platform">
          <div className="lp-head" data-reveal>
            <p className="lp-eyebrow">{c.platform.eyebrow}</p>
            <h2>{c.platform.title}<br /><em>{c.platform.accent}</em></h2>
          </div>
          <ul className="lp-grid3">
            {c.platform.items.map((it, i) => (
              <li className="lp-card lp-card-plain" key={it.t} data-reveal style={{ ["--d" as string]: `${(i % 3) * 70}ms` }}>
                <h3>{it.t}</h3>
                <p>{it.d}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="lp-cta" data-reveal>
          <span className="lp-orbit lp-orbit-a" aria-hidden="true" /><span className="lp-orbit lp-orbit-b" aria-hidden="true" />
          <p className="lp-eyebrow">{c.cta.eyebrow}</p>
          <h2>{c.cta.title}<br /><em>{c.cta.accent}</em></h2>
          <p className="lp-cta-body">{c.cta.body}</p>
          <div className="lp-actions lp-actions-center">
            <Link className="lp-btn lp-btn-light" href="/login">{c.cta.login}<Arrow /></Link>
            <a className="lp-btn lp-btn-line" href="#how">{c.cta.how}</a>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <span className="lp-wordmark">RABTO</span>
        <p>{c.footer.line}</p>
        <small>© {new Date().getFullYear()} RABTO. {c.footer.rights}</small>
      </footer>
    </RevealRoot>
  );
}
