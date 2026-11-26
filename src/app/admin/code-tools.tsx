"use client";

import { useEffect, useState } from "react";
import { QR_PRESETS, isUnsafeOrigin, presetIsScannable, renderQrSvg } from "@/lib/qr-style.mjs";

type Lang = "ar" | "en";
type Code = { productId: string; channel: "qr" | "nfc"; publicCode: string };

const T = {
  ar: {
    heading: "أكواد QR وروابط NFC", intro: "كل كود له رابط ثابت. QR يتحمّل كصورة SVG للطباعة. روابط NFC تتكتب على الشريحة من جهاز يدعم الكتابة.",
    qr: "كود QR", nfc: "رابط NFC", url: "الرابط", copy: "نسخ الرابط", copied: "اتنسخ", download: "تنزيل SVG", csv: "نسخ جدول الروابط",
    write: "كتابة على الشريحة", writing: "قرّب الشريحة من الجهاز.", written: "تمت الكتابة. راجع الشريحة بقراءتها من تطبيق آخر.", failed: "تعذّرت الكتابة",
    unsupported: "الكتابة من المتصفح متاحة على Chrome في أندرويد فقط. الآيفون يحتاج تطبيقًا للكتابة، وهذا غير مبني حاليًا. انسخ الرابط واكتبه بطريقة أخرى.",
    style: "شكل الـQR", wordmark: "اسم RABTO تحت الكود", verify: "التحقق من الشريحة", verifying: "قرّب الشريحة لقراءتها.", verifyOk: "القراءة طابقت الرابط المتوقع.", verifyBad: "الشريحة بتحتوي على رابط مختلف أو مفيش رابط.", verifyNote: "التحقق بالقراءة بيشتغل على Chrome أندرويد، ولم يُجرَّب على جهاز فعلي.",
    originWarn: "العنوان الحالي محلي أو غير مؤمّن (localhost أو http). لا تطبع أو تكتب هذه الروابط. اضبط عنوان الإنتاج HTTPS أولًا. التنزيل والنسخ متوقفان.",
    note: "لا يتم قفل الشريحة من هنا. القفل النهائي لا يُلغى، ولا يوجد قفل أو حماية بكلمة سر مفعّلة.", unverified: "الكتابة الفعلية على شريحة حقيقية لم تُجرَّب بعد.",
  },
  en: {
    heading: "QR codes and NFC links", intro: "Each code has a fixed link. QR downloads as an SVG for printing. NFC links are written to the tag from a device that can write.",
    qr: "QR code", nfc: "NFC link", url: "Link", copy: "Copy link", copied: "Copied", download: "Download SVG", csv: "Copy link table",
    write: "Write to tag", writing: "Hold the tag near the device.", written: "Written. Check it by reading the tag with another app.", failed: "Write failed",
    unsupported: "Writing from the browser works in Chrome on Android only. iPhone needs an app for writing, which is not built yet. Copy the link and write it another way.",
    style: "QR style", wordmark: "RABTO name under the code", verify: "Verify tag", verifying: "Hold the tag near the device to read it.", verifyOk: "The tag read back matches the expected link.", verifyBad: "The tag holds a different link, or no link.", verifyNote: "Read-back verification works in Chrome on Android and has not been tested on a real device.",
    originWarn: "The current address is local or not secure (localhost or http). Do not print or write these links. Set the production HTTPS address first. Download and copy are disabled.",
    note: "Tags are not locked from here. A permanent lock cannot be undone, and no lock or password protection is enabled.", unverified: "Writing to a real tag has not been tested yet.",
  },
} as const;

const base = (() => { let v = process.env.NEXT_PUBLIC_RESOLVER_BASE_URL?.trim() || ""; while (v.endsWith("/")) v = v.slice(0, -1); return v; })();
export function resolverUrl(code: string): string {
  const path = `/d/${encodeURIComponent(code)}`;
  if (/^https?:\/\//i.test(base)) return base + path;
  return (typeof window !== "undefined" ? window.location.origin : "") + path;
}

async function svgFor(text: string, preset: string, wordmark: boolean) {
  const m = await import("qrcode");
  const q = m.create(text, { errorCorrectionLevel: "M" });
  return renderQrSvg({ size: q.modules.size, get: (r: number, c: number) => !!q.modules.get(r, c) }, preset, { wordmark });
}

function QrImage({ text, label, preset, wordmark }: { text: string; label: string; preset: string; wordmark: boolean }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    let live = true;
    svgFor(text, preset, wordmark).then((x) => { if (live) setSvg(x); }).catch(() => { if (live) setSvg(""); });
    return () => { live = false; };
  }, [text, preset, wordmark]);
  if (!svg) return <span className="qr-box" aria-hidden="true" />;
  const href = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="qr-box" src={href} alt={label} width={132} height={wordmark ? 146 : 132} />;
}

async function downloadSvg(text: string, name: string, preset: string, wordmark: boolean) {
  const svg = await svgFor(text, preset, wordmark);
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
  const [preset, setPreset] = useState("classic");
  const [wordmark, setWordmark] = useState(false);
  const set = (k: string, v: string) => setStatus((s) => ({ ...s, [k]: v }));

  async function write(key: string, url: string) {
    try {
      set(key, t.writing);
      const NDEF = (window as unknown as { NDEFReader: new () => { write: (m: unknown) => Promise<void> } }).NDEFReader;
      await new NDEF().write({ records: [{ recordType: "url", data: url }] });
      set(key, t.written);
    } catch (e) { set(key, t.failed + (e instanceof Error && e.name ? ": " + e.name : "")); }
  }
  async function verify(key: string, url: string) {
    const ac = new AbortController();
    try {
      set(key, t.verifying);
      const NDEF = (window as unknown as { NDEFReader: new () => { scan: (o: unknown) => Promise<void>; onreading: ((e: { message: { records: { recordType: string; data?: DataView }[] } }) => void) | null; onreadingerror: (() => void) | null } }).NDEFReader;
      const reader = new NDEF();
      const timer = setTimeout(() => { ac.abort(); set(key, t.failed); }, 30000);
      reader.onreading = (e) => {
        clearTimeout(timer); ac.abort();
        const urls = e.message.records.filter((r) => r.recordType === "url" && r.data).map((r) => new TextDecoder().decode(r.data));
        set(key, urls.length === 1 && urls[0] === url ? t.verifyOk : t.verifyBad);
      };
      reader.onreadingerror = () => { clearTimeout(timer); ac.abort(); set(key, t.failed); };
      await reader.scan({ signal: ac.signal });
    } catch (e) { set(key, t.failed + (e instanceof Error && e.name ? ": " + e.name : "")); }
  }
  async function copy(key: string, text: string) { try { await navigator.clipboard.writeText(text); set(key, t.copied); } catch { set(key, t.failed); } }

  if (codes.length === 0) return null;
  const unsafe = codes.some((c) => isUnsafeOrigin(resolverUrl(c.publicCode)));
  return <div className="admin-panel code-tools" dir={lang === "ar" ? "rtl" : "ltr"}>
    <div className="panel-heading"><div><span className="panel-kicker">NFC + QR</span><h2>{t.heading}</h2><p>{t.intro}</p></div></div>
    <p className="admin-notice">{t.note} {t.unverified}</p>
    {!canWrite ? <p className="admin-notice" role="note">{t.unsupported}</p> : <p className="admin-notice" role="note">{t.verifyNote}</p>}
    {unsafe && <p className="admin-error" role="alert">{t.originWarn}</p>}
    <div className="admin-form">
      <label>{t.style}<select value={preset} onChange={(e) => setPreset(e.target.value)}>{Object.entries(QR_PRESETS).filter(([, p]) => presetIsScannable(p)).map(([k, p]) => <option key={k} value={k}>{p.label[lang]}</option>)}</select></label>
      <label className="check"><input type="checkbox" checked={wordmark} onChange={(e) => setWordmark(e.target.checked)} /> {t.wordmark}</label>
    </div>
    
    <button type="button" className="admin-secondary" disabled={unsafe} onClick={() => void copy("all", ["channel,publicCode,url", ...codes.map((c) => [c.channel, c.publicCode, resolverUrl(c.publicCode)].join(","))].join("\n"))}>{t.csv}{status.all ? " · " + status.all : ""}</button>
    <div className="code-tool-list">{codes.map((c) => { const key = c.productId + c.channel; const url = resolverUrl(c.publicCode); return <article className="code-tool" key={key}>
      {c.channel === "qr" && <QrImage text={url} label={t.qr + " " + c.publicCode} preset={preset} wordmark={wordmark} />}
      <div className="code-tool-body"><strong>{c.channel === "qr" ? t.qr : t.nfc}</strong><code dir="ltr">{url}</code>
        <div className="menu-actions">
          <button type="button" className="admin-secondary" disabled={unsafe} onClick={() => void copy(key, url)}>{t.copy}</button>
          {c.channel === "qr" && <button type="button" className="admin-secondary" disabled={unsafe} onClick={() => void downloadSvg(url, "rabto-" + c.publicCode, preset, wordmark)}>{t.download}</button>}
          {c.channel === "nfc" && canWrite && <button type="button" className="admin-primary" disabled={unsafe} onClick={() => void write(key, url)}>{t.write}</button>}
          {c.channel === "nfc" && canWrite && <button type="button" className="admin-secondary" onClick={() => void verify(key, url)}>{t.verify}</button>}
        </div>
        {status[key] && <small role="status">{status[key]}</small>}</div>
    </article>; })}</div>
  </div>;
}
