ALTER TABLE "orders" ADD COLUMN "fulfillment_type" varchar(20) DEFAULT 'in_stock' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "deposit_status" varchar(20) DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_fulfillment_type_valid" CHECK ("orders"."fulfillment_type" IN ('in_stock','pre_order','backorder'));--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_deposit_status_valid" CHECK ("orders"."deposit_status" IN ('none','requested','received'));--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_amounts_valid" CHECK ("orders"."subtotal_minor" >= 0 AND ("orders"."deposit_minor" IS NULL OR ("orders"."deposit_minor" >= 0 AND "orders"."deposit_minor" <= "orders"."subtotal_minor")));--> statement-breakpoint
CREATE TABLE "order_counters" (
	"workspace_id" uuid PRIMARY KEY NOT NULL,
	"last_number" integer DEFAULT 0 NOT NULL
);--> statement-breakpoint
ALTER TABLE "order_counters" ADD CONSTRAINT "order_counters_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
