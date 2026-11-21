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
import { chunkRows } from "@/lib/provisioning-batches.mjs";

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

    // Prepare all related rows with explicit IDs so bulk inserts can preserve
    // the exact product -> channel -> destination/version/account relationships.
    // The generated activation secret is returned once; only its hash is stored.
    const productRows = [];
    const codeRows = [];
    const destinationRows = [];
    const versionRows = [];
    const creditAccountRows = [];
    const issuedCodes: ProvisionedCode[] = [];
    const initialDestinationUrl = destination.toString();
    const changeReason = input.changeReason ?? "Initial destination during product provisioning";

    for (let index = 0; index < input.quantity; index += 1) {
      const serial = randomUUID();
      const suffix = serial.replaceAll("-", "").slice(0, 12).toUpperCase();
      const productId = randomUUID();

      productRows.push({
        id: productId,
        workspaceId: input.workspaceId,
        productTypeId: input.productTypeId,
        batchId: batch.id,
        sku: `${type.prefix}-${suffix}`,
        serialNumber: serial,
        status: "produced" as const,
      });

      for (const channel of ["qr", "nfc"] as const) {
        const productCodeId = randomUUID();
        const linkDestinationId = randomUUID();
        const publicCode = generatePublicCode();
        const activationSecret = generateActivationSecret();

        codeRows.push({
          id: productCodeId,
          productId,
          channel,
          publicCode,
          activationSecretHash: hashActivationSecret(activationSecret),
        });
        destinationRows.push({
          id: linkDestinationId,
          productCodeId,
          currentUrl: initialDestinationUrl,
          version: 1,
        });
        versionRows.push({
          linkDestinationId,
          version: 1,
          destinationUrl: initialDestinationUrl,
          changedByUserId: input.actorUserId,
          changeReason,
        });
        creditAccountRows.push({ productId, channel, balance: 0 });
        issuedCodes.push({ productId, channel, publicCode, activationSecret });
      }
    }

    // Keep every write in the existing transaction. Chunking bounds SQL
    // statement size while reducing round trips from one insert per row.
    for (const rows of chunkRows(productRows)) {
      await tx.insert(products).values(rows);
    }
    for (const rows of chunkRows(codeRows)) {
      await tx.insert(productCodes).values(rows);
    }
    for (const rows of chunkRows(destinationRows)) {
      await tx.insert(linkDestinations).values(rows);
    }
    for (const rows of chunkRows(versionRows)) {
      await tx.insert(linkVersions).values(rows);
    }
    for (const rows of chunkRows(creditAccountRows)) {
      await tx.insert(creditAccounts).values(rows);
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
