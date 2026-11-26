ALTER TABLE "credit_ledger" ADD COLUMN "idempotency_key" varchar(120) NOT NULL DEFAULT gen_random_uuid()::text;--> statement-breakpoint
ALTER TABLE "credit_ledger" ALTER COLUMN "idempotency_key" DROP DEFAULT;--> statement-breakpoint
CREATE UNIQUE INDEX "credit_ledger_account_idempotency_unique" ON "credit_ledger" USING btree ("account_id","idempotency_key");--> statement-breakpoint
CREATE OR REPLACE FUNCTION rabto_credit_ledger_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'credit_ledger is append-only';
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER credit_ledger_no_update_delete BEFORE UPDATE OR DELETE ON "credit_ledger" FOR EACH ROW EXECUTE FUNCTION rabto_credit_ledger_append_only();--> statement-breakpoint
CREATE TRIGGER credit_ledger_no_truncate BEFORE TRUNCATE ON "credit_ledger" FOR EACH STATEMENT EXECUTE FUNCTION rabto_credit_ledger_append_only();--> statement-breakpoint
CREATE OR REPLACE FUNCTION rabto_credit_balance_guard() RETURNS trigger AS $$
BEGIN
  IF NEW.balance IS DISTINCT FROM OLD.balance AND COALESCE(current_setting('rabto.ledger_tx', true), '') <> 'on' THEN
    RAISE EXCEPTION 'credit balance can only change through the credit ledger';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER credit_accounts_balance_guard BEFORE UPDATE ON "credit_accounts" FOR EACH ROW EXECUTE FUNCTION rabto_credit_balance_guard();
