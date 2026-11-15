import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { creditAccounts, productCodes, products, productTypes, workspaceMembers } from "@/db/schema";

/**
 * Customer dashboard read model. The caller must pass the authenticated user
 * ID from the server session, never a user ID supplied by the browser.
 * Membership is checked in the same query as the product listing.
 */
export async function listWorkspaceProductsForMember(userId: string, workspaceId: string) {
  const db = getDb();
  return db.select({
    productId: products.id,
    sku: products.sku,
    serialNumber: products.serialNumber,
    status: products.status,
    productionStage: products.productionStage,
    productTypeName: productTypes.name,
    channel: productCodes.channel,
    publicCode: productCodes.publicCode,
    activatedAt: productCodes.activatedAt,
    creditBalance: creditAccounts.balance,
  })
    .from(workspaceMembers)
    .innerJoin(products, and(
      eq(products.workspaceId, workspaceMembers.workspaceId),
    ))
    .innerJoin(productTypes, and(
      eq(productTypes.id, products.productTypeId),
      eq(productTypes.workspaceId, workspaceMembers.workspaceId),
    ))
    .innerJoin(productCodes, eq(productCodes.productId, products.id))
    .leftJoin(creditAccounts, and(
      eq(creditAccounts.productId, products.id),
      eq(creditAccounts.channel, productCodes.channel),
    ))
    .where(and(
      eq(workspaceMembers.userId, userId),
      eq(workspaceMembers.workspaceId, workspaceId),
    ))
    .orderBy(asc(products.createdAt), asc(productCodes.channel))
    .limit(5000);
}
