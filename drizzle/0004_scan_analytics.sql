CREATE TABLE "scan_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"seq" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"channel" "channel_type" NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);--> statement-breakpoint
CREATE TABLE "daily_scan_stats" (
	"workspace_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"channel" "channel_type" NOT NULL,
	"day" date NOT NULL,
	"scans" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_scan_stats_pk" PRIMARY KEY("workspace_id","product_id","channel","day")
);--> statement-breakpoint
ALTER TABLE "scan_events" ADD CONSTRAINT "scan_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE "scan_events" ADD CONSTRAINT "scan_events_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE "daily_scan_stats" ADD CONSTRAINT "daily_scan_stats_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE "daily_scan_stats" ADD CONSTRAINT "daily_scan_stats_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;--> statement-breakpoint
CREATE INDEX "scan_events_unprocessed_idx" ON "scan_events" USING btree ("seq") WHERE "scan_events"."processed_at" IS NULL;--> statement-breakpoint
CREATE INDEX "scan_events_processed_idx" ON "scan_events" USING btree ("processed_at") WHERE "scan_events"."processed_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "daily_scan_stats_workspace_day_idx" ON "daily_scan_stats" USING btree ("workspace_id","day");
