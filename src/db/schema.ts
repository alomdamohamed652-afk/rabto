import {
  pgTable, pgEnum, uuid, varchar, text, boolean, integer, bigint, jsonb,
  timestamp, uniqueIndex, index, check
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const platformRole = pgEnum("platform_role", ["admin", "customer"]);
export const workspaceRole = pgEnum("workspace_role", ["owner", "admin", "member"]);
export const productStatus = pgEnum("product_status", ["draft", "produced", "claimed", "archived"]);
export const channelType = pgEnum("channel_type", ["nfc", "qr"]);
export const orderStatus = pgEnum("order_status", ["pending", "confirmed", "cancelled", "fulfilled"]);
export const ledgerEntryType = pgEnum("ledger_entry_type", ["credit", "debit", "adjustment", "reset"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  passwordHash: text("password_hash"),
  platformRole: platformRole("platform_role").notNull().default("customer"),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (t) => [uniqueIndex("users_email_unique").on(sql`lower(${t.email})`)]);

export const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  createdAt: createdAt(),
  updatedAt: updatedAt()
});

export const workspaceMembers = pgTable("workspace_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: workspaceRole("role").notNull().default("member"),
  createdAt: createdAt()
}, (t) => [
  uniqueIndex("workspace_members_workspace_user_unique").on(t.workspaceId, t.userId),
  index("workspace_members_user_idx").on(t.userId)
]);

export const productTypes = pgTable("product_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  skuPrefix: varchar("sku_prefix", { length: 24 }).notNull(),
  attributes: jsonb("attributes").$type<Record<string, unknown>>().notNull().default({}),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (t) => [index("product_types_workspace_idx").on(t.workspaceId)]);

export const productBatches = pgTable("product_batches", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  productTypeId: uuid("product_type_id").notNull().references(() => productTypes.id),
  code: varchar("code", { length: 64 }).notNull(),
  quantity: integer("quantity").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (t) => [
  uniqueIndex("product_batches_workspace_code_unique").on(t.workspaceId, t.code),
  check("product_batches_quantity_positive", sql`${t.quantity} > 0`)
]);

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  productTypeId: uuid("product_type_id").notNull().references(() => productTypes.id),
  batchId: uuid("batch_id").references(() => productBatches.id),
  sku: varchar("sku", { length: 100 }).notNull(),
  serialNumber: varchar("serial_number", { length: 120 }).notNull(),
  status: productStatus("status").notNull().default("draft"),
  productionStage: varchar("production_stage", { length: 60 }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (t) => [
  uniqueIndex("products_workspace_sku_unique").on(t.workspaceId, t.sku),
  uniqueIndex("products_serial_unique").on(t.serialNumber),
  index("products_workspace_status_idx").on(t.workspaceId, t.status),
  index("products_batch_idx").on(t.batchId)
]);

export const productCodes = pgTable("product_codes", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  channel: channelType("channel").notNull(),
  publicCode: varchar("public_code", { length: 32 }).notNull().unique(),
  activationSecretHash: text("activation_secret_hash").notNull(),
  activatedAt: timestamp("activated_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (t) => [uniqueIndex("product_codes_product_channel_unique").on(t.productId, t.channel)]);

export const productClaims = pgTable("product_claims", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  claimedByUserId: uuid("claimed_by_user_id").notNull().references(() => users.id),
  claimedAt: timestamp("claimed_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [uniqueIndex("product_claims_product_unique").on(t.productId)]);

export const digitalPages = pgTable("digital_pages", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  slug: varchar("slug", { length: 100 }).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  draftContent: jsonb("draft_content").$type<Record<string, unknown>>().notNull().default({}),
  publishedSnapshot: jsonb("published_snapshot").$type<Record<string, unknown>>(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (t) => [uniqueIndex("digital_pages_workspace_slug_unique").on(t.workspaceId, t.slug)]);

export const productPageLinks = pgTable("product_page_links", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  pageId: uuid("page_id").notNull().references(() => digitalPages.id, { onDelete: "cascade" }),
  createdAt: createdAt()
}, (t) => [uniqueIndex("product_page_links_unique").on(t.productId, t.pageId)]);

export const linkDestinations = pgTable("link_destinations", {
  id: uuid("id").defaultRandom().primaryKey(),
  productCodeId: uuid("product_code_id").notNull().references(() => productCodes.id, { onDelete: "cascade" }),
  currentUrl: text("current_url").notNull(),
  version: integer("version").notNull().default(1),
  updatedAt: updatedAt()
}, (t) => [
  uniqueIndex("link_destinations_code_unique").on(t.productCodeId),
  check("link_destinations_version_positive", sql`${t.version} > 0`)
]);

export const linkVersions = pgTable("link_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  linkDestinationId: uuid("link_destination_id").notNull().references(() => linkDestinations.id),
  version: integer("version").notNull(),
  destinationUrl: text("destination_url").notNull(),
  changedByUserId: uuid("changed_by_user_id").references(() => users.id),
  changeReason: text("change_reason"),
  createdAt: createdAt()
}, (t) => [uniqueIndex("link_versions_destination_version_unique").on(t.linkDestinationId, t.version)]);

export const creditAccounts = pgTable("credit_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  channel: channelType("channel").notNull(),
  balance: integer("balance").notNull().default(0),
  updatedAt: updatedAt()
}, (t) => [
  uniqueIndex("credit_accounts_product_channel_unique").on(t.productId, t.channel),
  check("credit_accounts_balance_nonnegative", sql`${t.balance} >= 0`)
]);

export const creditLedger = pgTable("credit_ledger", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id").notNull().references(() => creditAccounts.id),
  entryType: ledgerEntryType("entry_type").notNull(),
  amount: integer("amount").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  reason: text("reason").notNull(),
  referenceId: uuid("reference_id"),
  idempotencyKey: varchar("idempotency_key", { length: 120 }).notNull(),
  actorUserId: uuid("actor_user_id").references(() => users.id),
  createdAt: createdAt()
}, (t) => [
  uniqueIndex("credit_ledger_account_idempotency_unique").on(t.accountId, t.idempotencyKey),
  index("credit_ledger_account_created_idx").on(t.accountId, t.createdAt),
  check("credit_ledger_amount_nonzero", sql`${t.amount} <> 0`)
]);

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  orderNumber: varchar("order_number", { length: 40 }).notNull(),
  status: orderStatus("status").notNull().default("pending"),
  customerName: varchar("customer_name", { length: 160 }).notNull(),
  customerEmail: varchar("customer_email", { length: 320 }),
  currency: varchar("currency", { length: 3 }).notNull().default("EGP"),
  subtotalMinor: bigint("subtotal_minor", { mode: "number" }).notNull().default(0),
  depositMinor: bigint("deposit_minor", { mode: "number" }),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (t) => [
  uniqueIndex("orders_workspace_number_unique").on(t.workspaceId, t.orderNumber),
  index("orders_workspace_status_created_idx").on(t.workspaceId, t.status, t.createdAt)
]);

export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productTypeId: uuid("product_type_id").notNull().references(() => productTypes.id),
  quantity: integer("quantity").notNull(),
  unitPriceMinor: bigint("unit_price_minor", { mode: "number" }).notNull(),
  productionStage: varchar("production_stage", { length: 60 }),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (t) => [check("order_items_quantity_positive", sql`${t.quantity} > 0`)]);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id),
  actorUserId: uuid("actor_user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 80 }).notNull(),
  entityId: uuid("entity_id"),
  details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: createdAt()
}, (t) => [index("audit_logs_workspace_created_idx").on(t.workspaceId, t.createdAt)]);

export const customerInvitations = pgTable("customer_invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdByUserId: uuid("created_by_user_id").notNull().references(() => users.id),
  createdAt: createdAt()
}, (t) => [
  index("customer_invitations_user_created_idx").on(t.userId, t.createdAt),
  index("customer_invitations_expiry_idx").on(t.expiresAt)
]);

export const loginAttempts = pgTable("login_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  keyType: varchar("key_type", { length: 40 }).notNull(),
  keyHash: varchar("key_hash", { length: 64 }).notNull(),
  failedCount: integer("failed_count").notNull().default(0),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  uniqueIndex("login_attempts_key_unique").on(t.keyType, t.keyHash),
  index("login_attempts_updated_idx").on(t.updatedAt),
  check("login_attempts_failed_count_nonnegative", sql`${t.failedCount} >= 0`),
]);
export const trustedLoginIps = pgTable("trusted_login_ips", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountHash: varchar("account_hash", { length: 64 }).notNull(),
  ipHash: varchar("ip_hash", { length: 64 }).notNull(),
  lastSuccessAt: timestamp("last_success_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("trusted_login_ips_account_ip_unique").on(t.accountHash, t.ipHash),
  index("trusted_login_ips_last_success_idx").on(t.lastSuccessAt),
  check("trusted_login_ips_hash_length", sql`length(${t.accountHash}) = 64 AND length(${t.ipHash}) = 64`),
]);
