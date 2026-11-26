import test from "node:test";
import assert from "node:assert/strict";
import { safeUrl, validatePageContent, validateSlug, renderPageHtml } from "../src/lib/page-rules.mjs";

test("url allowlist: https, tel, mailto, wa.me allowed", () => {
  for (const u of ["[https://example.com/a?b=1](https://example.com/a?b=1)", "[https://wa.me/201000000000](https://wa.me/201000000000)", "tel:+201000000000", "mailto:hi@example.com"]) assert.ok(safeUrl(u), u);
});
test("url allowlist rejects dangerous or non-https schemes", () => {
  for (const u of ["javascript:alert(1)", " javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,x", "[http://example.com](http://example.com)", "ftp://x.com", "//evil.com", "https://", "vbscript:x", "tel:abc", "mailto:notanemail", "[https://a.com/\nx](https://a.com/\nx)", ""]) assert.equal(safeUrl(u), null, u);
});
test("images must be https", () => { assert.equal(safeUrl("mailto:a@b.co", { imageOnly: true }), null); assert.ok(safeUrl("[https://x.com/a.png](https://x.com/a.png)", { imageOnly: true })); });
test("slug rules", () => { assert.ok(validateSlug("my-page1")); for (const s of ["-a", "A", "a_b", "", "a".repeat(70), "a b"]) assert.equal(validateSlug(s), false); });
test("content validation accepts known blocks and strips unknown fields", () => {
  const r = validatePageContent({ blocks: [{ type: "heading", text: "Hi", evil: "x" }, { type: "link", label: "Go", url: "[https://a.com](https://a.com)" }, { type: "divider" }] });
  assert.equal(r.ok, true); assert.deepEqual(r.value.blocks[0], { type: "heading", text: "Hi" });
});
test("content validation rejects bad link, missing alt, unknown type, too many", () => {
  assert.equal(validatePageContent({ blocks: [{ type: "link", label: "x", url: "javascript:1" }] }).ok, false);
  assert.equal(validatePageContent({ blocks: [{ type: "image", url: "[https://a.com/x.png](https://a.com/x.png)" }] }).ok, false);
  assert.equal(validatePageContent({ blocks: [{ type: "script", text: "x" }] }).ok, false);
  assert.equal(validatePageContent({ blocks: Array(51).fill({ type: "divider" }) }).ok, false);
  assert.equal(validatePageContent(null).ok, false);
});
test("render escapes HTML and emits no script", () => {
  const html = renderPageHtml({ title: "<b>t</b>", content: { blocks: [{ type: "text", text: "<script>alert(1)</script>" }, { type: "link", label: "\"><img>", url: "https://a.com/?q=\"x" }] } });
  assert.ok(!/<script/i.test(html)); assert.ok(!html.includes("<b>t</b>")); assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes('"><img>'));
});
