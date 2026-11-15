import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  auditLogs, creditAccounts, linkDestinations, linkVersions, productBatches,
  productCodes, productTypes, products, users, workspaces,
} from "@/db/schema";
import { generateActivationSecret, generatePublicCode, hashActivationSecret } from "@/lib/codes";
import { parseResolverDestination } from "@/lib/resolver";

export type ProvisionProductBatchInput = {
  actorUserId: string;
  workspaceId: string;
  productTypeId: string;
  batchCode: string;
  quantity: number;
  initialDestinationUrl: string;
  changeReason?: string;
};

export type ProvisionedCode = {
  productId: string;
  channel: "qr" | "nfc";
  publicCode: string;
  activationSecret: string;
};

/**
 * Admin-only provisioning primitive. Call only from a server action/API that
 * has authenticated the session; this function independently verifies the
 * actor role and all tenant relationships inside the transaction.
 * Raw activation secrets are returned once and must never be logged.
 */
export async function provisionProductBatch(input: ProvisionProductBatchInput) {
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 5000) {
    throw new Error("Quantity must be an integer between 1 and 5000.");
  }
  if (!/^[A-Za-z0-9_-]{2,64}$/.test(input.batchCode)) {
    throw new Error("Batch code must be 2–64 letters, numbers, underscores, or hyphens.");
  }
  const destination = parseResolverDestination(input.initialDestinationUrl);
  if (!destination) throw new Error("Initial destination must be a valid HTTP or HTTPS URL.");

  const db = getDb();
  return db.transaction(async (tx) => {
    const [actor] = await tx.select({ id: users.id, role: users.platformRole })
      .from(users).where(eq(users.id, input.actorUserId)).limit(1);
    if (!actor || actor.role !== "admin") throw new Error("Platform administrator access required.");

    const [workspace] = await tx.select({ id: workspaces.id })
      .from(workspaces).where(eq(workspaces.id, input.workspaceId)).limit(1);
    if (!workspace) throw new Error("Customer workspace not found.");

    const [type] = await tx.select({ id: productTypes.id, prefix: productTypes.skuPrefix })
      .from(productTypes).where(and(
        eq(productTypes.id, input.productTypeId),
        eq(productTypes.workspaceId, input.workspaceId),
        eq(productTypes.isActive, true),
      )).limit(1);
    if (!type) throw new Error("Active product type does not belong to this customer workspace.");

    const [batch] = await tx.insert(productBatches).values({
      workspaceId: input.workspaceId,
      productTypeId: input.productTypeId,
      code: input.batchCode,
      quantity: input.quantity,
    }).returning({ id: productBatches.id });

    const issuedCodes: ProvisionedCode[] = [];
    for (let index = 0; index < input.quantity; index += 1) {
      const serial = randomUUID();
      const suffix = serial.replaceAll("-", "").slice(0, 12).toUpperCase();
      const [product] = await tx.insert(products).values({
        workspaceId: input.workspaceId,
        productTypeId: input.productTypeId,
        batchId: batch.id,
        sku: `${type.prefix}-${suffix}`,
        serialNumber: serial,
        status: "produced",
      }).returning({ id: products.id });

      for (const channel of ["qr", "nfc"] as const) {
        const publicCode = generatePublicCode();
        const activationSecret = generateActivationSecret();
        const [code] = await tx.insert(productCodes).values({
          productId: product.id,
          channel,
          publicCode,
          activationSecretHash: hashActivationSecret(activationSecret),
        }).returning({ id: productCodes.id });
        const [link] = await tx.insert(linkDestinations).values({
          productCodeId: code.id,
          currentUrl: destination.toString(),
          version: 1,
        }).returning({ id: linkDestinations.id });
        await tx.insert(linkVersions).values({
          linkDestinationId: link.id,
          version: 1,
          destinationUrl: destination.toString(),
          changedByUserId: input.actorUserId,
          changeReason: input.changeReason ?? "Initial destination during product provisioning",
        });
        await tx.insert(creditAccounts).values({ productId: product.id, channel, balance: 0 });
        issuedCodes.push({ productId: product.id, channel, publicCode, activationSecret });
      }
    }

    await tx.insert(auditLogs).values({
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      action: "products.batch_provisioned",
      entityType: "product_batch",
      entityId: batch.id,
      details: { quantity: input.quantity, productTypeId: input.productTypeId, channels: ["qr", "nfc"] },
    });

    return { batchId: batch.id, quantity: input.quantity, codes: issuedCodes };
  });
}
