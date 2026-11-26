"use client";

import { useState } from "react";
import { landingCopy, type LandingLang } from "./landing-copy";

/** Interactive illustration: one printed code, a destination you can switch. No network, no real data. */
export default function DestinationDemo({ lang }: { lang: LandingLang }) {
  const c = landingCopy[lang].demo;
  const [selected, setSelected] = useState(c.options[0].id);
  const [opened, setOpened] = useState<string | null>(null);
  const [pulse, setPulse] = useState(0);
  const current = c.options.find((o) => o.id === selected) ?? c.options[0];
  const shown = opened ? c.options.find((o) => o.id === opened) : null;

  return (
    <div className="lp-demo" aria-label={c.note}>
      <div className="lp-demo-controls" role="radiogroup" aria-label={c.label}>
        {c.options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={selected === o.id}
            className={"lp-chip" + (selected === o.id ? " is-active" : "")}
            onClick={() => { setSelected(o.id); setOpened(null); }}
          >{o.t}</button>
        ))}
      </div>

      <div className="lp-demo-stage">
        <button
          type="button"
          className="lp-tapcard"
          onClick={() => { setOpened(selected); setPulse((n) => n + 1); }}
          aria-label={c.tap}
        >
          <span className="lp-tapcard-top"><span>{c.code}</span><span className="lp-dot" /></span>
          <span className="lp-tapcard-code" dir="ltr">rabto / a7k2m9</span>
          <span className="lp-tapcard-cta">{c.tap}</span>
          <span key={pulse} className={"lp-ripple" + (pulse ? " go" : "")} aria-hidden="true" />
        </button>

        <div className="lp-demo-arrow" aria-hidden="true"><i /></div>

        <div className={"lp-phone" + (shown ? " is-open" : "")} role="status" aria-live="polite">
          <div className="lp-phone-bar"><span>{c.current}</span><b dir="ltr">{shown ? shown.host : current.host}</b></div>
          <div key={shown?.id ?? "idle"} className="lp-phone-body">
            {shown ? (
              <>
                <span className="lp-phone-badge">{c.tapped}</span>
                <strong>{shown.t}</strong>
                <small>{shown.line}</small>
              </>
            ) : (
              <>
                <span className="lp-phone-badge muted">{c.label}</span>
                <strong>{current.t}</strong>
                <small>{c.tap}</small>
              </>
            )}
          </div>
        </div>
      </div>
      <p className="lp-demo-note">{c.note}</p>
    </div>
  );
}
