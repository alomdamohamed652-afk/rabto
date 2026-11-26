"use client";

import { useEffect, useState } from "react";

type Lang = "ar" | "en";
type Code = { productId: string; channel: "qr" | "nfc"; publicCode: string };

const T = {
  ar: {
    heading: "أكواد QR وروابط NFC", intro: "كل كود له رابط ثابت. QR يتحمّل كصورة SVG للطباعة. روابط NFC تتكتب على الشريحة من جهاز يدعم الكتابة.",
    qr: "كود QR", nfc: "رابط NFC", url: "الرابط", copy: "نسخ الرابط", copied: "اتنسخ", download: "تنزيل SVG", csv: "نسخ جدول الروابط",
    write: "كتابة على الشريحة", writing: "قرّب الشريحة من الجهاز.", written: "تمت الكتابة. راجع الشريحة بقراءتها من تطبيق آخر.", failed: "تعذّرت الكتابة",
    unsupported: "الكتابة من المتصفح متاحة على Chrome في أندرويد فقط. الآيفون يحتاج تطبيقًا للكتابة، وهذا غير مبني حاليًا. انسخ الرابط واكتبه بطريقة أخرى.",
    note: "لا يتم قفل الشريحة من هنا. القفل النهائي لا يُلغى، ولا يوجد قفل أو حماية بكلمة سر مفعّلة.", unverified: "الكتابة الفعلية على شريحة حقيقية لم تُجرَّب بعد.",
  },
  en: {
    heading: "QR codes and NFC links", intro: "Each code has a fixed link. QR downloads as an SVG for printing. NFC links are written to the tag from a device that can write.",
    qr: "QR code", nfc: "NFC link", url: "Link", copy: "Copy link", copied: "Copied", download: "Download SVG", csv: "Copy link table",
    write: "Write to tag", writing: "Hold the tag near the device.", written: "Written. Check it by reading the tag with another app.", failed: "Write failed",
    unsupported: "Writing from the browser works in Chrome on Android only. iPhone needs an app for writing, which is not built yet. Copy the link and write it another way.",
    note: "Tags are not locked from here. A permanent lock cannot be undone, and no lock or password protection is enabled.", unverified: "Writing to a real tag has not been tested yet.",
  },
} as const;

const base = (() => { let v = process.env.NEXT_PUBLIC_RESOLVER_BASE_URL?.trim() || ""; while (v.endsWith("/")) v = v.slice(0, -1); return v; })();
export function resolverUrl(code: string): string {
  const path = `/d/${encodeURIComponent(code)}`;
  if (/^https?:\/\//i.test(base)) return base + path;
  return (typeof window !== "undefined" ? window.location.origin : "") + path;
}

function QrImage({ text, label }: { text: string; label: string }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    let live = true;
    import("qrcode").then((m) => m.toString(text, { type: "svg", margin: 2, errorCorrectionLevel: "M" })).then((s) => { if (live) setSvg(s); }).catch(() => { if (live) setSvg(""); });
    return () => { live = false; };
  }, [text]);
  if (!svg) return <span className="qr-box" aria-hidden="true" />;
  const href = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="qr-box" src={href} alt={label} width={132} height={132} />;
}

async function downloadSvg(text: string, name: string) {
  const m = await import("qrcode");
  const svg = await m.toString(text, { type: "svg", margin: 4, errorCorrectionLevel: "M" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  a.download = `${name}.svg`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export default function CodeTools({ codes, lang = "ar" }: { codes: Code[]; lang?: Lang }) {
  const t = T[lang];
  const [status, setStatus] = useState<Record<string, string>>({});
  // Rendered only after codes are created in the browser, never during server render.
  const [canWrite] = useState(() => typeof window !== "undefined" && "NDEFReader" in window && window.isSecureContext);
  const set = (k: string, v: string) => setStatus((s) => ({ ...s, [k]: v }));

  async function write(key: string, url: string) {
    try {
      set(key, t.writing);
      const NDEF = (window as unknown as { NDEFReader: new () => { write: (m: unknown) => Promise<void> } }).NDEFReader;
      await new NDEF().write({ records: [{ recordType: "url", data: url }] });
      set(key, t.written);
    } catch (e) { set(key, t.failed + (e instanceof Error && e.name ? ": " + e.name : "")); }
  }
  async function copy(key: string, text: string) { try { await navigator.clipboard.writeText(text); set(key, t.copied); } catch { set(key, t.failed); } }

  if (codes.length === 0) return null;
  return <div className="admin-panel code-tools" dir={lang === "ar" ? "rtl" : "ltr"}>
    <div className="panel-heading"><div><span className="panel-kicker">NFC + QR</span><h2>{t.heading}</h2><p>{t.intro}</p></div></div>
    <p className="admin-notice">{t.note} {t.unverified}</p>
    {!canWrite && <p className="admin-notice" role="note">{t.unsupported}</p>}
    <button type="button" className="admin-secondary" onClick={() => void copy("all", ["channel,publicCode,url", ...codes.map((c) => [c.channel, c.publicCode, resolverUrl(c.publicCode)].join(","))].join("\n"))}>{t.csv}{status.all ? " · " + status.all : ""}</button>
    <div className="code-tool-list">{codes.map((c) => { const key = c.productId + c.channel; const url = resolverUrl(c.publicCode); return <article className="code-tool" key={key}>
      {c.channel === "qr" && <QrImage text={url} label={t.qr + " " + c.publicCode} />}
      <div className="code-tool-body"><strong>{c.channel === "qr" ? t.qr : t.nfc}</strong><code dir="ltr">{url}</code>
        <div className="menu-actions">
          <button type="button" className="admin-secondary" onClick={() => void copy(key, url)}>{t.copy}</button>
          {c.channel === "qr" && <button type="button" className="admin-secondary" onClick={() => void downloadSvg(url, "rabto-" + c.publicCode)}>{t.download}</button>}
          {c.channel === "nfc" && canWrite && <button type="button" className="admin-primary" onClick={() => void write(key, url)}>{t.write}</button>}
        </div>
        {status[key] && <small role="status">{status[key]}</small>}</div>
    </article>; })}</div>
  </div>;
}
