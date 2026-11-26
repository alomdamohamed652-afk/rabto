import test from "node:test";
import assert from "node:assert/strict";
import { QR_PRESETS, contrastRatio, presetIsScannable, renderQrSvg } from "../src/lib/qr-style.mjs";
const m = { size: 21, get: (r, c) => (r + c) % 3 === 0 };
test("all shipped presets pass the contrast rule", () => { for (const [k, p] of Object.entries(QR_PRESETS)) assert.ok(presetIsScannable(p), k); });
test("low contrast or inverted colors are rejected", () => {
  assert.equal(presetIsScannable({ dark: "#91a786", light: "#fffefa" }), false);
  assert.equal(presetIsScannable({ dark: "#fffefa", light: "#20231f" }), false);
  assert.ok(contrastRatio("#000000", "#ffffff") > 20);
});
test("render keeps a 4 module quiet zone and rejects unknown presets", () => {
  const svg = renderQrSvg(m, "classic");
  assert.match(svg, /viewBox="0 0 29 29"/);
  assert.throws(() => renderQrSvg(m, "nope"));
  assert.match(renderQrSvg(m, "classic", { wordmark: true }), /RABTO/);
});
import { isUnsafeOrigin } from "../src/lib/qr-style.mjs";
test("local, private and non-https origins are unsafe for printing", () => {
  for (const u of ["http://localhost:3000/d/x", "https://localhost/d/x", "http://example.com/d/x", "https://127.0.0.1/d/x", "https://192.168.1.5/d/x", "https://10.0.0.2/d/x", "https://172.20.1.1/d/x", "not a url", "https://foo.localhost/d/x"]) assert.equal(isUnsafeOrigin(u), true, u);
  for (const u of ["https://rabtolink.example/d/x", "https://app.example.org/d/x", "https://172.32.0.1/d/x"]) assert.equal(isUnsafeOrigin(u), false, u);
});
