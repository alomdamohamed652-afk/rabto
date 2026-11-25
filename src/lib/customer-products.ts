import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { creditAccounts, productCodes, products, productTypes, workspaceMembers } from "@/db/schema";

export type CustomerProductCode = {
  channel: "nfc" | "qr";
  publicCode: string;
  activatedAt: string | null;
  creditBalance: number | null;
};

/**
 * Customer dashboard read model. Returns one row per product, with its
 * one-to-many QR/NFC codes nested under `codes`. Membership is checked in
 * the same query; caller identity must come from the signed-in session.
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
    codes: sql<CustomerProductCode[]>`jsonb_agg(
      jsonb_build_object(
        'channel', ${productCodes.channel},
        'publicCode', ${productCodes.publicCode},
        'activatedAt', ${productCodes.activatedAt},
        'creditBalance', ${creditAccounts.balance}
      ) ORDER BY ${productCodes.channel}
    )`,
  })
    .from(workspaceMembers)
    .innerJoin(products, eq(products.workspaceId, workspaceMembers.workspaceId))
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
    .groupBy(
      products.id,
      products.sku,
      products.serialNumber,
      products.status,
      products.productionStage,
      productTypes.name,
    )
    .orderBy(asc(products.createdAt))
    .limit(5000);
}
