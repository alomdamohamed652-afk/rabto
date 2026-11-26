CREATE TABLE "digital_page_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"title" varchar(160) NOT NULL,
	"content" jsonb NOT NULL,
	"published_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "digital_page_versions_version_positive" CHECK ("digital_page_versions"."version" > 0)
);--> statement-breakpoint
ALTER TABLE "digital_page_versions" ADD CONSTRAINT "digital_page_versions_page_id_digital_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."digital_pages"("id") ON DELETE CASCADE ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE "digital_page_versions" ADD CONSTRAINT "digital_page_versions_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;--> statement-breakpoint
CREATE UNIQUE INDEX "digital_page_versions_page_version_unique" ON "digital_page_versions" USING btree ("page_id","version");--> statement-breakpoint
CREATE OR REPLACE FUNCTION rabto_page_version_immutable() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'digital_page_versions are immutable';
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER digital_page_versions_no_update BEFORE UPDATE ON "digital_page_versions" FOR EACH ROW EXECUTE FUNCTION rabto_page_version_immutable();--> statement-breakpoint
CREATE TRIGGER digital_page_versions_no_delete BEFORE DELETE ON "digital_page_versions" FOR EACH ROW EXECUTE FUNCTION rabto_page_version_immutable();--> statement-breakpoint
CREATE TRIGGER digital_page_versions_no_truncate BEFORE TRUNCATE ON "digital_page_versions" FOR EACH STATEMENT EXECUTE FUNCTION rabto_page_version_immutable();
