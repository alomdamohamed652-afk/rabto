import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { digitalPages, digitalPageVersions, workspaces } from "@/db/schema";
import type { PageContent } from "@/lib/page-rules.mjs";

export type SaveDraftResult = { kind: "ok"; pageId: string } | { kind: "slug-taken" } | { kind: "not-found" };

export async function saveDraft(input: { workspaceId: string; pageId?: string; slug: string; title: string; content: PageContent }): Promise<SaveDraftResult> {
  const db = getDb();
  try {
    if (input.pageId) {
      const rows = await db.update(digitalPages)
        .set({ title: input.title, slug: input.slug, draftContent: input.content, updatedAt: new Date() })
        .where(and(eq(digitalPages.id, input.pageId), eq(digitalPages.workspaceId, input.workspaceId)))
        .returning({ id: digitalPages.id });
      return rows[0] ? { kind: "ok", pageId: rows[0].id } : { kind: "not-found" };
    }
    const [row] = await db.insert(digitalPages).values({ workspaceId: input.workspaceId, slug: input.slug, title: input.title, draftContent: input.content })
      .returning({ id: digitalPages.id });
    return { kind: "ok", pageId: row.id };
  } catch (e) {
    if ((e as { code?: string; cause?: { code?: string } }).code === "23505" || (e as { cause?: { code?: string } }).cause?.code === "23505") return { kind: "slug-taken" };
    throw e;
  }
}

export async function listPages(workspaceId: string) {
  const db = getDb();
  return db.select({
    id: digitalPages.id, slug: digitalPages.slug, title: digitalPages.title, draftContent: digitalPages.draftContent,
    publishedAt: digitalPages.publishedAt, updatedAt: digitalPages.updatedAt,
  }).from(digitalPages).where(eq(digitalPages.workspaceId, workspaceId)).orderBy(desc(digitalPages.updatedAt)).limit(200);
}

export type PublishResult = { kind: "published"; version: number } | { kind: "not-found" };

/** Publishing copies the current draft into an immutable version row. Page edits never consume credits. */
export async function publishPage(input: { workspaceId: string; pageId: string; actorUserId: string }): Promise<PublishResult> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [page] = await tx.select().from(digitalPages)
      .where(and(eq(digitalPages.id, input.pageId), eq(digitalPages.workspaceId, input.workspaceId))).for("update").limit(1);
    if (!page) return { kind: "not-found" as const };
    const [{ next }] = await tx.select({ next: sql<number>`coalesce(max(${digitalPageVersions.version}), 0) + 1` })
      .from(digitalPageVersions).where(eq(digitalPageVersions.pageId, page.id));
    const version = Number(next);
    await tx.insert(digitalPageVersions).values({ pageId: page.id, version, title: page.title, content: page.draftContent, publishedBy: input.actorUserId });
    await tx.update(digitalPages).set({ publishedSnapshot: { version, title: page.title, content: page.draftContent }, publishedAt: new Date() })
      .where(eq(digitalPages.id, page.id));
    return { kind: "published" as const, version };
  });
}

export async function getPublishedSnapshot(workspaceSlug: string, pageSlug: string) {
  const db = getDb();
  const [row] = await db.select({ snapshot: digitalPages.publishedSnapshot }).from(digitalPages)
    .innerJoin(workspaces, eq(workspaces.id, digitalPages.workspaceId))
    .where(and(eq(workspaces.slug, workspaceSlug), eq(digitalPages.slug, pageSlug))).limit(1);
  return (row?.snapshot ?? null) as { version: number; title: string; content: PageContent } | null;
}
