import { getPublishedSnapshot } from "@/lib/pages";
import { PAGE_CSP, renderPageHtml, validatePageContent, validateSlug } from "@/lib/page-rules.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = {
  "content-type": "text/html; charset=utf-8",
  "content-security-policy": PAGE_CSP,
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "cache-control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
};

/**
 * Public page. Only the immutable published snapshot is served, re-validated on render,
 * as script-free HTML under a locked-down CSP. No cookies are read or set.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ workspace: string; slug: string }> }) {
  const { workspace, slug } = await ctx.params;
  const notFound = () => new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  if (!validateSlug(slug) || !/^[a-z0-9-]{1,80}$/.test(workspace)) return notFound();
  const snap = await getPublishedSnapshot(workspace, slug).catch(() => null);
  if (!snap) return notFound();
  const content = validatePageContent(snap.content);
  if (!content.ok) return notFound();
  return new Response(renderPageHtml({ title: snap.title, content: content.value }), { status: 200, headers });
}
